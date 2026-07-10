// HTTP 远程入口（多租户 / 无状态）
// 与 index.mjs 的 stdio 模式并存，互不影响。
//
// 访问端点：
//   POST /racorecdn/mcp     —— MCP 协议入口（所有工具调用）
//   GET  /racorecdn/health  —— 健康检查
//
// 凭证模型：每个请求通过 header 携带租户自己的密钥
//   X-Racore-Access-Key / X-Racore-Secret-Key
// 服务端不存储任何凭证，凭证即身份（方案 A）。

import express from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import rateLimit from 'express-rate-limit';
import { buildServer } from './server-factory.mjs';
import { getCachedAuthManager } from './auth-cache.mjs';

const app = express();
app.use(express.json({ limit: '1mb' }));

const PORT = process.env.PORT || 3000;

// 健康检查（不需要凭证）
app.get('/racorecdn/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// 基础限流：防止认证接口被刷（纯内存，无外部依赖）
app.use(
  '/racorecdn/mcp',
  rateLimit({
    windowMs: 60 * 1000,
    max: 60, // 每 IP 每分钟 60 次
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.post('/racorecdn/mcp', async (req, res) => {
  const accessKey = req.header('X-Racore-Access-Key');
  const secretKey = req.header('X-Racore-Secret-Key');

  // 缺失凭证 → 401
  if (!accessKey || !secretKey) {
    return res.status(401).json({
      jsonrpc: '2.0',
      error: {
        code: -32001,
        message:
          '缺少租户凭证：请在 header 提供 X-Racore-Access-Key 和 X-Racore-Secret-Key',
      },
      id: null,
    });
  }

  // 复用缓存的 authManager（内部 token 缓存跨请求生效）
  const authManager = getCachedAuthManager(accessKey, secretKey);

  // 入口预验证：凭证有效时命中缓存不会触发网络请求
  try {
    await authManager.getValidToken();
  } catch {
    return res.status(401).json({
      jsonrpc: '2.0',
      error: { code: -32001, message: '凭证无效：无法通过 Racore 认证' },
      id: null,
    });
  }

  // 无状态模式：每请求独立 server + transport，请求结束即销毁
  const server = buildServer({ authManager });
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // undefined = 无状态
  });

  res.on('close', () => {
    transport.close();
    server.close();
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch {
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: '内部错误' },
        id: null,
      });
    }
  }
});

app.listen(PORT, () => {
  process.stderr.write(`racore-cdn-mcp HTTP server 监听端口 ${PORT}\n`);
});

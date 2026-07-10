import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { buildServer } from './server-factory.mjs';

// Read environment variables
const accessKey = process.env.RACORE_ACCESS_KEY;
const secretKey = process.env.RACORE_SECRET_KEY;

// Validate environment variables
if (!accessKey) {
  process.stderr.write('错误: 环境变量 RACORE_ACCESS_KEY 未设置或为空\n');
  process.exit(1);
}
if (!secretKey) {
  process.stderr.write('错误: 环境变量 RACORE_SECRET_KEY 未设置或为空\n');
  process.exit(1);
}

// Build server with credentials (stdio 单例模式，行为与原来一致)
const server = buildServer({ accessKey, secretKey });

// Create transport and start server
const transport = new StdioServerTransport();
await server.connect(transport);

process.stderr.write('racore-cdn-mcp-server 启动成功\n');

// MCP Server 工厂模块
// 抽出工具注册逻辑，供 stdio 入口（index.mjs）与 HTTP 入口（http-server.mjs）共用

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createAuthManager } from './auth.mjs';
import { createApiClient } from './api-client.mjs';
import { registerCdnTrafficTool } from './tools/cdn-traffic.mjs';
import { registerRegionTrafficTool } from './tools/region-traffic.mjs';
import { registerRequestCountTool } from './tools/request-count.mjs';
import { registerDomainOperationTools } from './tools/domain-operations.mjs';
import { registerDomainConfigTools } from './tools/domain-config.mjs';
import { registerCertificateTools } from './tools/certificate.mjs';
import { registerContentManagementTools } from './tools/content-management.mjs';
import { registerStatisticsTools } from './tools/statistics.mjs';
import { registerLogManagementTools } from './tools/log-management.mjs';
import { registerWorkorderTools } from './tools/workorder.mjs';

/**
 * 用指定凭证（或现成的 authManager）组装一个完整的 MCP Server 实例
 * @param {object} opts
 * @param {string} [opts.accessKey] - 公开密钥标识符（未传 authManager 时必填）
 * @param {string} [opts.secretKey] - 私密密钥（未传 authManager 时必填）
 * @param {{ getValidToken: () => Promise<string>, clearTokenCache: () => void }} [opts.authManager]
 *        - 传入现成的 authManager 以复用其 token 缓存（HTTP 多租户场景）
 * @returns {McpServer}
 */
export function buildServer({ accessKey, secretKey, authManager } = {}) {
  const server = new McpServer({
    name: 'racore-cdn-mcp-server',
    version: '1.0.0',
  });

  // 优先复用传入的 authManager，否则用凭证新建（兼容 stdio 单例模式）
  const auth = authManager || createAuthManager(accessKey, secretKey);
  const apiClient = createApiClient(auth);

  registerCdnTrafficTool(server, apiClient);
  registerRegionTrafficTool(server, apiClient);
  registerRequestCountTool(server, apiClient);
  registerDomainOperationTools(server, apiClient);
  registerDomainConfigTools(server, apiClient);
  registerCertificateTools(server, apiClient);
  registerContentManagementTools(server, apiClient);
  registerStatisticsTools(server, apiClient);
  registerLogManagementTools(server, apiClient);
  registerWorkorderTools(server, apiClient);

  return server;
}

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createAuthManager } from './auth.mjs';
import { createApiClient } from './api-client.mjs';
import { registerCdnTrafficTool } from './tools/cdn-traffic.mjs';
import { registerRegionTrafficTool } from './tools/region-traffic.mjs';
import { registerRequestCountTool } from './tools/request-count.mjs';

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

// Create MCP Server instance
const server = new McpServer({
  name: 'racore-cdn-mcp-server',
  version: '1.0.0',
});

// Create infrastructure instances
const authManager = createAuthManager(accessKey, secretKey);
const apiClient = createApiClient(authManager);

// Register tools
registerCdnTrafficTool(server, apiClient);
registerRegionTrafficTool(server, apiClient);
registerRequestCountTool(server, apiClient);

// Create transport and start server
const transport = new StdioServerTransport();
await server.connect(transport);

process.stderr.write('racore-cdn-mcp-server 启动成功\n');

// Log management tool module
import { z } from 'zod';

/**
 * Register log management tools to MCP Server
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server
 * @param {{ post: Function, get: Function }} apiClient
 */
export function registerLogManagementTools(server, apiClient) {
  // 69. get_log_download_list
  server.tool("get_log_download_list", "获取 CDN 日志下载列表", {
    domain: z.string().describe("域名"),
    start_time: z.string().optional().describe("开始时间，格式 yyyy-mm-dd hh:mm"),
    end_time: z.string().optional().describe("结束时间，格式 yyyy-mm-dd hh:mm"),
  }, async (params) => {
    try {
      const body = { domain: params.domain };
      if (params.start_time) body.start_time = params.start_time;
      if (params.end_time) body.end_time = params.end_time;
      const response = await apiClient.post('/API/cdn/log/download', body);
      return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  });
}

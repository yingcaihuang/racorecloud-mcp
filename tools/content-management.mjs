// Content management tool module (prefetch/purge)
import { z } from 'zod';

/**
 * Register content management tools to MCP Server
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server
 * @param {{ post: Function, get: Function }} apiClient
 */
export function registerContentManagementTools(server, apiClient) {
  // 55. get_prewarm_regions
  server.tool("get_prewarm_regions", "获取 URL 可用的预热区域", {
    url: z.string().describe("要查询预热区域的 URL"),
  }, async (params) => {
    try {
      const response = await apiClient.post('/API/aws/prewarm/get/region', params);
      return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  });

  // 56. get_prewarm_pop_points
  server.tool("get_prewarm_pop_points", "获取预热区域的 POP 节点列表", {
    region: z.string().describe("区域标识"),
  }, async (params) => {
    try {
      const response = await apiClient.post('/API/aws/prewarm/pop', params);
      return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  });

  // 57. prefetch_content
  server.tool("prefetch_content", "预热内容到 CDN 边缘节点", {
    url: z.string().describe("要预热的 URL"),
    region: z.string().describe("目标区域"),
    country: z.string().describe("目标国家"),
  }, async (params) => {
    try {
      const response = await apiClient.post('/API/cdn/prewarm', params);
      return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  });

  // 58. query_prefetch_status
  server.tool("query_prefetch_status", "查询预热任务状态", {
    id: z.string().describe("预热任务 ID"),
  }, async (params) => {
    try {
      const response = await apiClient.post('/API/cdn/prewarm/status', params);
      return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  });

  // 59. purge_content
  server.tool("purge_content", "刷新 CDN 缓存内容", {
    url: z.string().describe("要刷新的 URL，多个 URL 用换行符分隔"),
    type: z.number().describe("刷新类型：1=文件，2=目录"),
  }, async (params) => {
    try {
      const response = await apiClient.post('/API/cdn/purge', params);
      return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  });

  // 60. query_purge_status
  server.tool("query_purge_status", "查询刷新任务状态", {
    id: z.string().describe("刷新任务 ID"),
  }, async (params) => {
    try {
      const response = await apiClient.post('/API/cdn/purge/status', params);
      return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  });
}

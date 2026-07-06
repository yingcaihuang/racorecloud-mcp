// 请求数查询工具模块
// 实现 query_request_count 工具注册与处理逻辑

import { z } from 'zod';
import { validateTimeParams } from '../validators.mjs';

/**
 * 注册 query_request_count 工具到 MCP Server
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server - MCP Server 实例
 * @param {{ post: (endpoint: string, body: object) => Promise<any> }} apiClient - API 客户端
 */
export function registerRequestCountTool(server, apiClient) {
  const schema = {
    domain: z.string().optional().describe("域名"),
    start_time: z.string().optional().describe("开始时间，格式 yyyy-mm-dd hh:mm"),
    end_time: z.string().optional().describe("结束时间，格式 yyyy-mm-dd hh:mm"),
    scope: z.enum(["today", "yesterday", "week", "month", "last_month"]).optional().describe("预定义时间范围"),
  };

  server.tool(
    "query_request_count",
    "查询 CDN 请求数量时间序列数据",
    schema,
    async (params) => {
      // 校验时间参数
      const validation = validateTimeParams(params);
      if (!validation.valid) {
        return {
          content: [{ type: "text", text: validation.error }],
          isError: true,
        };
      }

      try {
        // 调用 API
        const response = await apiClient.post('/API/cdn/statistics/request', validation.query);

        // 格式化成功响应，保留所有时间戳和请求计数值
        return {
          content: [{ type: "text", text: JSON.stringify(response.data) }],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: error.message }],
          isError: true,
        };
      }
    }
  );
}

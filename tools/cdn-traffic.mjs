// CDN 流量查询工具模块
import { z } from 'zod';
import { validateTimeParams, validateTimeRange } from '../validators.mjs';

/**
 * 注册 query_cdn_traffic 工具到 MCP Server
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server - MCP Server 实例
 * @param {{ post: (endpoint: string, body: object) => Promise<any> }} apiClient - API 客户端
 */
export function registerCdnTrafficTool(server, apiClient) {
  const schema = {
    domain: z.string().optional().describe("域名，多个以逗号分隔"),
    start_time: z.string().optional().describe("开始时间，格式 yyyy-mm-dd hh:mm"),
    end_time: z.string().optional().describe("结束时间，格式 yyyy-mm-dd hh:mm"),
    scope: z.enum(["today", "yesterday", "week", "month", "last_month"]).optional().describe("预定义时间范围"),
  };

  server.tool("query_cdn_traffic", "查询 CDN 流量消耗详情，返回时间序列流量数据", schema, async (params) => {
    // 参数校验
    const validation = validateTimeParams(params);
    if (!validation.valid) {
      return {
        content: [{ type: "text", text: validation.error }],
        isError: true,
      };
    }

    // 90 天时间跨度校验
    if (params.start_time && params.end_time) {
      if (!validateTimeRange(params.start_time, params.end_time)) {
        return {
          content: [{ type: "text", text: "参数校验错误: 查询时间范围不能超过 90 天" }],
          isError: true,
        };
      }
    }

    // 调用 API
    try {
      const response = await apiClient.post('/API/cdn/statistics/flow', validation.query);
      return {
        content: [{ type: "text", text: JSON.stringify(response.data) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: error.message }],
        isError: true,
      };
    }
  });
}

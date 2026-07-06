// Additional statistics tool module
import { z } from 'zod';
import { validateTimeParams, validateTimeRange } from '../validators.mjs';

/**
 * Register additional statistics tools to MCP Server
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server
 * @param {{ post: Function, get: Function }} apiClient
 */
export function registerStatisticsTools(server, apiClient) {
  const timeSchema = {
    domain: z.string().optional().describe("域名，多个以逗号分隔"),
    start_time: z.string().optional().describe("开始时间，格式 yyyy-mm-dd hh:mm"),
    end_time: z.string().optional().describe("结束时间，格式 yyyy-mm-dd hh:mm"),
    scope: z.enum(["today", "yesterday", "week", "month", "last_month"]).optional().describe("预定义时间范围"),
  };

  function registerStatTool(name, description, endpoint) {
    server.tool(name, description, timeSchema, async (params) => {
      const validation = validateTimeParams(params);
      if (!validation.valid) {
        return { content: [{ type: "text", text: validation.error }], isError: true };
      }
      if (params.start_time && params.end_time) {
        if (!validateTimeRange(params.start_time, params.end_time)) {
          return {
            content: [{ type: "text", text: "参数校验错误: 查询时间范围不能超过 90 天" }],
            isError: true,
          };
        }
      }
      try {
        const response = await apiClient.post(endpoint, validation.query);
        return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
      } catch (error) {
        return { content: [{ type: "text", text: error.message }], isError: true };
      }
    });
  }

  // 61. query_http_status_summary
  registerStatTool("query_http_status_summary", "查询 HTTP 状态码汇总统计", "/API/cdn/statistics/http/code/summary");

  // 62. query_top_domains
  server.tool("query_top_domains", "查询流量 Top 域名排行", {
    start_time: z.string().optional().describe("开始时间，格式 yyyy-mm-dd hh:mm"),
    end_time: z.string().optional().describe("结束时间，格式 yyyy-mm-dd hh:mm"),
    scope: z.enum(["today", "yesterday", "week", "month", "last_month"]).optional().describe("预定义时间范围"),
  }, async (params) => {
    const validation = validateTimeParams(params);
    if (!validation.valid) {
      return { content: [{ type: "text", text: validation.error }], isError: true };
    }
    if (params.start_time && params.end_time) {
      if (!validateTimeRange(params.start_time, params.end_time)) {
        return {
          content: [{ type: "text", text: "参数校验错误: 查询时间范围不能超过 90 天" }],
          isError: true,
        };
      }
    }
    try {
      const response = await apiClient.post('/API/cdn/statistics/top/domain', validation.query);
      return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  });

  // 63. query_top_url
  registerStatTool("query_top_url", "查询流量 Top URL 排行", "/API/cdn/statistics/top/url");

  // 64. query_top_referer
  registerStatTool("query_top_referer", "查询流量 Top Referer 排行", "/API/cdn/statistics/top/referer");

  // 65. query_top_ua
  registerStatTool("query_top_ua", "查询流量 Top UA 排行", "/API/cdn/statistics/top/ua");

  // 66. query_hit_traffic
  registerStatTool("query_hit_traffic", "查询缓存命中流量统计", "/API/cdn/statistics/hit/flow");

  // 67. query_hit_request_count
  registerStatTool("query_hit_request_count", "查询缓存命中请求数统计", "/API/cdn/statistics/hit/request");

  // 68. query_http_status_detail
  registerStatTool("query_http_status_detail", "查询 HTTP 状态码详细统计", "/API/cdn/statistics/http/code/detail");
}

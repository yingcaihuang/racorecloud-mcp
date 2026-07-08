// Additional statistics tool module
import { z } from 'zod';
import { validateTimeParams, validateTimeRange } from '../validators.mjs';

/**
 * Register additional statistics tools to MCP Server
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server
 * @param {{ post: Function, get: Function, put: Function, del: Function }} apiClient
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

  // 一键查询域名全部统计数据
  server.tool("query_all_statistics", "一键查询域名的全部统计数据（流量、请求数、命中率、状态码、Top URL/Referer/UA）", {
    domain: z.string().optional().describe("域名，不提供则查询全部域名"),
    scope: z.enum(["today", "yesterday", "week", "month", "last_month"]).optional().describe("时间范围，默认 today"),
  }, async (params) => {
    const query = { scope: params.scope || 'today' };
    if (params.domain) query.domain = params.domain;

    const endpoints = [
      { key: 'CDN流量', endpoint: '/API/cdn/statistics/flow' },
      { key: '请求数', endpoint: '/API/cdn/statistics/request' },
      { key: '地区流量分布', endpoint: '/API/cdn/statistics/district' },
      { key: '缓存命中流量', endpoint: '/API/cdn/statistics/hit/flow' },
      { key: '缓存命中请求数', endpoint: '/API/cdn/statistics/hit/request' },
      { key: 'HTTP状态码汇总', endpoint: '/API/cdn/statistics/http/code' },
      { key: 'HTTP状态码详情', endpoint: '/API/cdn/statistics/http/code/detail' },
      { key: 'Top域名', endpoint: '/API/cdn/statistics/top/domain' },
      { key: 'Top URL', endpoint: '/API/cdn/domain/top/url' },
      { key: 'Top Referer', endpoint: '/API/cdn/domain/top/referer' },
      { key: 'Top UA', endpoint: '/API/cdn/domain/top/ua' },
    ];

    const results = await Promise.allSettled(
      endpoints.map(async (ep) => {
        try {
          const response = await apiClient.post(ep.endpoint, query);
          return { key: ep.key, data: response.data };
        } catch (error) {
          return { key: ep.key, error: error.message };
        }
      })
    );

    const lines = [`📊 统计数据概览 (${params.domain || '全部域名'}, ${query.scope})`, ''];

    for (const result of results) {
      if (result.status === 'fulfilled') {
        const { key, data, error } = result.value;
        if (error) {
          lines.push(`【${key}】查询失败: ${error}`);
        } else if (data && ((Array.isArray(data) && data.length > 0) || (!Array.isArray(data) && data))) {
          lines.push(`【${key}】`);
          lines.push(JSON.stringify(data, null, 2));
        } else {
          lines.push(`【${key}】无数据`);
        }
        lines.push('');
      }
    }

    return { content: [{ type: "text", text: lines.join('\n') }] };
  });

  // 61. query_http_status_summary
  registerStatTool("query_http_status_summary", "查询 HTTP 状态码汇总统计", "/API/cdn/statistics/http/code");

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
  registerStatTool("query_top_url", "查询流量 Top URL 排行", "/API/cdn/domain/top/url");

  // 64. query_top_referer
  registerStatTool("query_top_referer", "查询流量 Top Referer 排行", "/API/cdn/domain/top/referer");

  // 65. query_top_ua
  registerStatTool("query_top_ua", "查询流量 Top UA 排行", "/API/cdn/domain/top/ua");

  // 66. query_hit_traffic
  registerStatTool("query_hit_traffic", "查询缓存命中流量统计", "/API/cdn/statistics/hit/flow");

  // 67. query_hit_request_count
  registerStatTool("query_hit_request_count", "查询缓存命中请求数统计", "/API/cdn/statistics/hit/request");

  // 68. query_http_status_detail
  registerStatTool("query_http_status_detail", "查询 HTTP 状态码详细统计", "/API/cdn/statistics/http/code/detail");
}

// 地区流量查询工具模块
import { z } from 'zod';
import { validateTimeParams } from '../validators.mjs';

/**
 * 注册 query_region_traffic 工具
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server - MCP Server 实例
 * @param {{ post: (endpoint: string, body: object) => Promise<any> }} apiClient - API 客户端
 */
export function registerRegionTrafficTool(server, apiClient) {
  const schema = {
    domain: z.string().optional().describe("域名"),
    start_time: z.string().optional().describe("开始时间，格式 yyyy-mm-dd hh:mm"),
    end_time: z.string().optional().describe("结束时间，格式 yyyy-mm-dd hh:mm"),
    scope: z.enum(["today", "yesterday", "week", "month", "last_month"]).optional().describe("预定义时间范围"),
  };

  server.tool(
    "query_region_traffic",
    "查询 CDN 国家/地区流量和请求分布数据",
    schema,
    async (params) => {
      // 参数校验
      const validation = validateTimeParams(params);
      if (!validation.valid) {
        return {
          content: [{ type: "text", text: validation.error }],
          isError: true,
        };
      }

      try {
        const response = await apiClient.post('/API/cdn/statistics/district', validation.query);

        // 处理 data 数组为空的情况
        if (!response.data || (Array.isArray(response.data) && response.data.length === 0)) {
          return {
            content: [{ type: "text", text: "所查询时间范围内无地区流量数据" }],
          };
        }

        // 构建结果对象
        const result = { data: response.data };

        // 处理 country_codes 数组：若非空则附加国家代码映射到输出
        if (response.country_codes && Array.isArray(response.country_codes) && response.country_codes.length > 0) {
          result.country_codes = response.country_codes;
        }

        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
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

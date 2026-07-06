// Domain operations tool module
import { z } from 'zod';

/**
 * Register domain operation tools to MCP Server
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server
 * @param {{ post: Function, get: Function }} apiClient
 */
export function registerDomainOperationTools(server, apiClient) {
  // 1. create_domain
  server.tool("create_domain", "创建 CDN 加速域名", {
    domain: z.string().describe("要创建的域名"),
    type: z.enum(["oversea", "live", "video", "dynamic", "static", "download", "CDN"]).describe("加速类型"),
    source_type: z.enum(["1", "2"]).describe("源站类型：1=IP，2=域名"),
    source_conf: z.string().describe("源站配置 JSON 数组，如 [{\"source\":\"1.2.3.4\",\"type\":\"1\"}]"),
    is_ssl: z.enum(["0", "1"]).describe("是否开启 SSL：0=否，1=是"),
    cert_id: z.string().optional().describe("证书 ID（开启 SSL 时必填）"),
    cache_type: z.string().optional().describe("缓存策略，默认 1"),
    note: z.string().optional().describe("备注"),
    share_did: z.string().optional().describe("共享缓存域名 ID"),
  }, async (params) => {
    try {
      const response = await apiClient.post('/API/cdn/domain', params);
      return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  });

  // 2. enable_domain
  server.tool("enable_domain", "启用已关闭的 CDN 域名", {
    domain: z.string().describe("要启用的域名（仅关闭状态的域名可启用）"),
  }, async (params) => {
    try {
      const response = await apiClient.post('/API/cdn/domain/enable', params);
      return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  });

  // 3. disable_domain
  server.tool("disable_domain", "停用已启用的 CDN 域名", {
    domain: z.string().describe("要停用的域名（仅启用状态的域名可停用）"),
  }, async (params) => {
    try {
      const response = await apiClient.post('/API/cdn/domain/disable', params);
      return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  });

  // 4. delete_domain
  server.tool("delete_domain", "删除已关闭的 CDN 域名", {
    domain: z.string().describe("要删除的域名（仅关闭状态的域名可删除）"),
  }, async (params) => {
    try {
      const response = await apiClient.post('/API/cdn/domain/delete', params);
      return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  });

  // 5. get_domain_list
  server.tool("get_domain_list", "获取 CDN 域名列表", {
    domain: z.string().optional().describe("域名筛选，不提供则返回全部域名"),
  }, async (params) => {
    try {
      const queryParams = {};
      if (params.domain) queryParams.domain = params.domain;
      const response = await apiClient.get('/API/cdn/domain', queryParams);
      return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  });
}

// Domain configuration tool module
import { z } from 'zod';

/**
 * Register domain configuration tools to MCP Server
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server
 * @param {{ post: Function, get: Function }} apiClient
 */
export function registerDomainConfigTools(server, apiClient) {
  // Helper for simple domain-only query tools
  function registerDomainQuery(name, description, endpoint) {
    server.tool(name, description, {
      domain: z.string().describe("域名"),
    }, async (params) => {
      try {
        const response = await apiClient.post(endpoint, params);
        return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
      } catch (error) {
        return { content: [{ type: "text", text: error.message }], isError: true };
      }
    });
  }

  // 6. query_domain_origin
  registerDomainQuery("query_domain_origin", "查询域名源站配置", "/API/cdn/domain/origin/get");

  // 7. set_domain_origin
  server.tool("set_domain_origin", "设置域名源站配置", {
    domain: z.string().describe("域名"),
    source_type: z.string().describe("源站类型：1=IP，2=域名"),
    source_conf: z.string().describe("源站配置 JSON 数组"),
  }, async (params) => {
    try {
      const response = await apiClient.post('/API/cdn/domain/origin/set', params);
      return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  });

  // 8. query_domain_origin_host
  registerDomainQuery("query_domain_origin_host", "查询域名回源 Host", "/API/cdn/domain/origin/host/get");

  // 9. set_domain_origin_host
  server.tool("set_domain_origin_host", "设置域名回源 Host", {
    domain: z.string().describe("域名"),
    origin_host: z.string().describe("回源 Host 值"),
  }, async (params) => {
    try {
      const response = await apiClient.post('/API/cdn/domain/origin/host/set', params);
      return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  });

  // 10. query_domain_https
  registerDomainQuery("query_domain_https", "查询域名 HTTPS 配置", "/API/cdn/domain/https/get");

  // 11. set_domain_https
  server.tool("set_domain_https", "设置域名 HTTPS 配置", {
    domain: z.string().describe("域名"),
    is_ssl: z.string().describe("启用 SSL：0=否，1=是"),
    cert_id: z.string().optional().describe("证书 ID"),
  }, async (params) => {
    try {
      const response = await apiClient.post('/API/cdn/domain/https/set', params);
      return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  });

  // 12. query_domain_force_https
  registerDomainQuery("query_domain_force_https", "查询域名强制 HTTPS 跳转设置", "/API/cdn/domain/https/redirect/get");

  // 13. set_domain_force_https
  server.tool("set_domain_force_https", "设置域名强制 HTTPS 跳转", {
    domain: z.string().describe("域名"),
    redirect: z.enum(["0", "1"]).describe("强制跳转：0=关闭，1=开启"),
  }, async (params) => {
    try {
      const response = await apiClient.post('/API/cdn/domain/https/redirect/set', params);
      return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  });

  // 14. query_domain_smart_compression
  registerDomainQuery("query_domain_smart_compression", "查询域名智能压缩设置", "/API/cdn/domain/compression/get");

  // 15. set_domain_smart_compression
  server.tool("set_domain_smart_compression", "设置域名智能压缩", {
    domain: z.string().describe("域名"),
    compress: z.enum(["0", "1"]).describe("智能压缩：0=关闭，1=开启"),
  }, async (params) => {
    try {
      const response = await apiClient.post('/API/cdn/domain/compression/set', params);
      return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  });

  // 16. query_domain_ipv6
  registerDomainQuery("query_domain_ipv6", "查询域名 IPv6 设置", "/API/cdn/domain/ipv6/get");

  // 17. set_domain_ipv6
  server.tool("set_domain_ipv6", "设置域名 IPv6", {
    domain: z.string().describe("域名"),
    ipv6: z.enum(["0", "1"]).describe("IPv6 支持：0=关闭，1=开启"),
  }, async (params) => {
    try {
      const response = await apiClient.post('/API/cdn/domain/ipv6/set', params);
      return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  });

  // 18. query_domain_http_response_headers
  registerDomainQuery("query_domain_http_response_headers", "查询域名 HTTP 响应头", "/API/cdn/domain/response/header/get");

  // 19. set_domain_http_response_headers
  server.tool("set_domain_http_response_headers", "设置域名 HTTP 响应头", {
    domain: z.string().describe("域名"),
    headers: z.string().describe("响应头 JSON 数组"),
  }, async (params) => {
    try {
      const response = await apiClient.post('/API/cdn/domain/response/header/set', params);
      return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  });

  // 20. query_domain_ip_blackwhitelist
  registerDomainQuery("query_domain_ip_blackwhitelist", "查询域名 IP 黑白名单", "/API/cdn/domain/ip/acl/get");

  // 21. set_domain_ip_blackwhitelist
  server.tool("set_domain_ip_blackwhitelist", "设置域名 IP 黑白名单", {
    domain: z.string().describe("域名"),
    type: z.enum(["black", "white"]).describe("名单类型：black=黑名单，white=白名单"),
    ips: z.string().describe("IP 地址，换行分隔"),
  }, async (params) => {
    try {
      const response = await apiClient.post('/API/cdn/domain/ip/acl/set', params);
      return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  });

  // 22. query_domain_referer_blackwhitelist
  registerDomainQuery("query_domain_referer_blackwhitelist", "查询域名 Referer 黑白名单", "/API/cdn/domain/referer/acl/get");

  // 23. set_domain_referer_blackwhitelist
  server.tool("set_domain_referer_blackwhitelist", "设置域名 Referer 黑白名单", {
    domain: z.string().describe("域名"),
    type: z.enum(["black", "white"]).describe("名单类型：black=黑名单，white=白名单"),
    referers: z.string().describe("Referer 列表"),
  }, async (params) => {
    try {
      const response = await apiClient.post('/API/cdn/domain/referer/acl/set', params);
      return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  });

  // 24. query_domain_ua_blackwhitelist
  registerDomainQuery("query_domain_ua_blackwhitelist", "查询域名 UA 黑白名单", "/API/cdn/domain/ua/acl/get");

  // 25. set_domain_ua_blackwhitelist
  server.tool("set_domain_ua_blackwhitelist", "设置域名 UA 黑白名单", {
    domain: z.string().describe("域名"),
    type: z.enum(["black", "white"]).describe("名单类型：black=黑名单，white=白名单"),
    ua_list: z.string().describe("UA 列表"),
  }, async (params) => {
    try {
      const response = await apiClient.post('/API/cdn/domain/ua/acl/set', params);
      return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  });

  // 26. query_domain_origin_protocol
  registerDomainQuery("query_domain_origin_protocol", "查询域名回源协议", "/API/cdn/domain/origin/protocol/get");

  // 27. set_domain_origin_protocol
  server.tool("set_domain_origin_protocol", "设置域名回源协议", {
    domain: z.string().describe("域名"),
    protocol: z.enum(["http", "https", "follow"]).describe("回源协议：http、https 或 follow"),
  }, async (params) => {
    try {
      const response = await apiClient.post('/API/cdn/domain/origin/protocol/set', params);
      return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  });

  // 28. query_domain_origin_headers
  registerDomainQuery("query_domain_origin_headers", "查询域名回源请求头", "/API/cdn/domain/origin/header/get");

  // 29. set_domain_origin_headers
  server.tool("set_domain_origin_headers", "设置域名回源请求头", {
    domain: z.string().describe("域名"),
    headers: z.string().describe("回源请求头 JSON 数组"),
  }, async (params) => {
    try {
      const response = await apiClient.post('/API/cdn/domain/origin/header/set', params);
      return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  });

  // 30. query_domain_http2
  registerDomainQuery("query_domain_http2", "查询域名 HTTP/2 设置", "/API/cdn/domain/http2/get");

  // 31. set_domain_http2
  server.tool("set_domain_http2", "设置域名 HTTP/2", {
    domain: z.string().describe("域名"),
    http2: z.enum(["0", "1"]).describe("HTTP/2 支持：0=关闭，1=开启"),
  }, async (params) => {
    try {
      const response = await apiClient.post('/API/cdn/domain/http2/set', params);
      return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  });

  // 32. query_domain_http3
  registerDomainQuery("query_domain_http3", "查询域名 HTTP/3 设置", "/API/cdn/domain/http3/get");

  // 33. set_domain_http3
  server.tool("set_domain_http3", "设置域名 HTTP/3", {
    domain: z.string().describe("域名"),
    http3: z.enum(["0", "1"]).describe("HTTP/3 支持：0=关闭，1=开启"),
  }, async (params) => {
    try {
      const response = await apiClient.post('/API/cdn/domain/http3/set', params);
      return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  });

  // 34. query_domain_min_tls
  registerDomainQuery("query_domain_min_tls", "查询域名最低 TLS 版本", "/API/cdn/domain/tls/version/get");

  // 35. set_domain_min_tls
  server.tool("set_domain_min_tls", "设置域名最低 TLS 版本", {
    domain: z.string().describe("域名"),
    tls_version: z.enum(["TLSv1.0", "TLSv1.1", "TLSv1.2"]).describe("最低 TLS 版本"),
  }, async (params) => {
    try {
      const response = await apiClient.post('/API/cdn/domain/tls/version/set', params);
      return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  });

  // 36. query_domain_origin_timeout (AWS Only)
  registerDomainQuery("query_domain_origin_timeout", "查询域名回源超时时间（仅 AWS）", "/API/cdn/domain/origin/timeout/get");

  // 37. set_domain_origin_timeout (AWS Only)
  server.tool("set_domain_origin_timeout", "设置域名回源超时时间（仅 AWS）", {
    domain: z.string().describe("域名"),
    timeout: z.number().describe("超时时间（秒）"),
  }, async (params) => {
    try {
      const response = await apiClient.post('/API/cdn/domain/origin/timeout/set', params);
      return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  });

  // 38. query_domain_geo_restriction (AWS Only)
  registerDomainQuery("query_domain_geo_restriction", "查询域名地理访问控制（仅 AWS）", "/API/cdn/domain/geo/restriction/get");

  // 39. set_domain_geo_restriction (AWS Only)
  server.tool("set_domain_geo_restriction", "设置域名地理访问控制（仅 AWS）", {
    domain: z.string().describe("域名"),
    type: z.enum(["none", "whitelist", "blacklist"]).describe("限制类型"),
    countries: z.string().optional().describe("国家代码"),
  }, async (params) => {
    try {
      const response = await apiClient.post('/API/cdn/domain/geo/restriction/set', params);
      return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  });

  // 40. query_country_region_data
  server.tool("query_country_region_data", "查询国家/地区数据（用于地理访问控制）", {}, async () => {
    try {
      const response = await apiClient.post('/API/cdn/domain/geo/countries', {});
      return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  });

  // 41. query_domain_cache_policy
  registerDomainQuery("query_domain_cache_policy", "查询域名缓存策略", "/API/cdn/domain/cache/get");

  // 42. set_domain_cache_policy
  server.tool("set_domain_cache_policy", "设置域名缓存策略", {
    domain: z.string().describe("域名"),
    cache_type: z.string().describe("缓存策略类型"),
  }, async (params) => {
    try {
      const response = await apiClient.post('/API/cdn/domain/cache/set', params);
      return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  });

  // 43. get_aws_cache_policy_list
  registerDomainQuery("get_aws_cache_policy_list", "获取 AWS 缓存策略列表", "/API/cdn/domain/aws/cache/policy/list");

  // 44. get_aws_origin_request_policy_list
  registerDomainQuery("get_aws_origin_request_policy_list", "获取 AWS 回源请求头策略列表", "/API/cdn/domain/aws/origin/request/policy/list");

  // 45. get_aws_origin_request_policy
  registerDomainQuery("get_aws_origin_request_policy", "查询当前 AWS 回源请求头策略", "/API/cdn/domain/aws/origin/request/policy/get");

  // 46. set_aws_origin_request_policy
  server.tool("set_aws_origin_request_policy", "设置 AWS 回源请求头策略", {
    domain: z.string().describe("域名"),
    policy_id: z.string().optional().describe("策略 ID"),
  }, async (params) => {
    try {
      const response = await apiClient.post('/API/cdn/domain/aws/origin/request/policy/set', params);
      return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  });

  // 47. get_aws_response_policy_list
  registerDomainQuery("get_aws_response_policy_list", "获取 AWS 响应头策略列表", "/API/cdn/domain/aws/response/policy/list");

  // 48. get_aws_response_policy
  registerDomainQuery("get_aws_response_policy", "查询当前 AWS 响应头策略", "/API/cdn/domain/aws/response/policy/get");

  // 49. set_aws_response_policy
  server.tool("set_aws_response_policy", "设置 AWS 响应头策略", {
    domain: z.string().describe("域名"),
    policy_id: z.string().optional().describe("策略 ID"),
  }, async (params) => {
    try {
      const response = await apiClient.post('/API/cdn/domain/aws/response/policy/set', params);
      return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  });
}

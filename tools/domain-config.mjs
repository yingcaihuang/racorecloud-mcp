// Domain configuration tool module
import { z } from 'zod';

/**
 * Register domain configuration tools to MCP Server
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server
 * @param {{ post: Function, get: Function, put: Function, del: Function }} apiClient
 */
export function registerDomainConfigTools(server, apiClient) {
  // Helper for simple domain-only GET query tools
  function registerDomainGetQuery(name, description, endpoint) {
    server.tool(name, description, {
      domain: z.string().describe("域名"),
    }, async (params) => {
      try {
        const response = await apiClient.get(endpoint, { domain: params.domain });
        return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
      } catch (error) {
        return { content: [{ type: "text", text: error.message }], isError: true };
      }
    });
  }

  /**
   * 检查域名状态是否允许修改（只有 state=1 启用状态才能提交变更）
   * @param {string} domain - 域名
   * @returns {Promise<{ok: boolean, error?: string}>}
   */
  async function checkDomainState(domain) {
    try {
      const response = await apiClient.get('/API/cdn/domain', { domain });
      if (response.data && response.data.length > 0) {
        const state = response.data[0].state;
        if (state !== '1') {
          const stateMap = {
            '2': '部署失败', '4': '已停用', '5': '欠费',
            '6': '配置中（部署变更中）', '8': '已封禁',
            '14': '已锁定', '15': '待激活', '16': '已删除'
          };
          const stateDesc = stateMap[state] || `未知状态(${state})`;
          return { ok: false, error: `域名 ${domain} 当前状态为「${stateDesc}」(state=${state})，只有启用状态(state=1)才能提交配置变更，请稍后再试` };
        }
      }
      return { ok: true };
    } catch {
      // 如果查询失败，不阻塞操作，让后续 API 自己报错
      return { ok: true };
    }
  }

  // 6. query_domain_origin
  registerDomainGetQuery("query_domain_origin", "查询域名源站配置", "/API/cdn/domain/source");

  // 7. set_domain_origin
  server.tool("set_domain_origin", "设置域名源站配置", {
    domain: z.string().describe("域名"),
    source_type: z.enum(["1", "2"]).describe("源站类型：1=IP，2=域名"),
    source_conf: z.string().describe("源站配置 JSON 数组，如 [{\"source\":\"origin.example.com\"}]"),
  }, async (params) => {
    // 检查域名状态
    const stateCheck = await checkDomainState(params.domain);
    if (!stateCheck.ok) {
      return { content: [{ type: "text", text: stateCheck.error }], isError: true };
    }
    try {
      const body = { domain: params.domain, source_type: params.source_type };
      body.source_conf = JSON.parse(params.source_conf);
      const response = await apiClient.put('/API/cdn/domain/source', body);
      return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  });

  // 8. query_domain_origin_host
  registerDomainGetQuery("query_domain_origin_host", "查询域名回源 Host", "/API/cdn/domain/origin/host");

  // 9. set_domain_origin_host
  server.tool("set_domain_origin_host", "设置域名回源 Host", {
    domain: z.string().describe("域名"),
    origin_host_type: z.enum(["1", "2", "3"]).describe("回源 Host 类型：1=源站域名，2=加速域名，3=自定义域名"),
    origin_host: z.string().optional().describe("自定义回源 Host（origin_host_type=3 时必填）"),
  }, async (params) => {
    // 检查域名状态
    const stateCheck = await checkDomainState(params.domain);
    if (!stateCheck.ok) {
      return { content: [{ type: "text", text: stateCheck.error }], isError: true };
    }
    try {
      const response = await apiClient.put('/API/cdn/domain/origin/host', params);
      return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  });

  // 10. query_domain_https
  registerDomainGetQuery("query_domain_https", "查询域名 HTTPS 配置", "/API/cdn/domain/ssl");

  // 11. set_domain_https
  server.tool("set_domain_https", "设置域名 HTTPS 配置", {
    domain: z.string().describe("域名"),
    is_ssl: z.string().describe("启用 SSL：0=否，1=是"),
    cert_id: z.string().optional().describe("证书 ID"),
  }, async (params) => {
    // 检查域名状态
    const stateCheck = await checkDomainState(params.domain);
    if (!stateCheck.ok) {
      return { content: [{ type: "text", text: stateCheck.error }], isError: true };
    }
    try {
      const response = await apiClient.put('/API/cdn/domain/ssl', params);
      return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  });

  // 12. query_domain_force_https
  registerDomainGetQuery("query_domain_force_https", "查询域名强制 HTTPS 跳转设置", "/API/cdn/domain/enforce/https");

  // 13. set_domain_force_https
  server.tool("set_domain_force_https", "设置域名强制 HTTPS 跳转", {
    domain: z.string().describe("域名"),
    https_redirect: z.enum(["on", "off"]).describe("强制 HTTPS 跳转：on=开启，off=关闭"),
  }, async (params) => {
    // 检查域名状态
    const stateCheck = await checkDomainState(params.domain);
    if (!stateCheck.ok) {
      return { content: [{ type: "text", text: stateCheck.error }], isError: true };
    }
    try {
      const response = await apiClient.put('/API/cdn/domain/enforce/https', params);
      return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  });

  // 14. query_domain_smart_compression
  registerDomainGetQuery("query_domain_smart_compression", "查询域名智能压缩设置", "/API/cdn/domain/page/compress");

  // 15. set_domain_smart_compression
  server.tool("set_domain_smart_compression", "设置域名智能压缩", {
    domain: z.string().describe("域名"),
    enable: z.enum(["on", "off"]).describe("智能压缩：on=开启，off=关闭"),
  }, async (params) => {
    // 检查域名状态
    const stateCheck = await checkDomainState(params.domain);
    if (!stateCheck.ok) {
      return { content: [{ type: "text", text: stateCheck.error }], isError: true };
    }
    try {
      const response = await apiClient.put('/API/cdn/domain/page/compress', params);
      return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  });

  // 16. query_domain_ipv6
  registerDomainGetQuery("query_domain_ipv6", "查询域名 IPv6 设置", "/API/cdn/domain/ipv6");

  // 17. set_domain_ipv6
  server.tool("set_domain_ipv6", "设置域名 IPv6", {
    domain: z.string().describe("域名"),
    enable: z.enum(["0", "1"]).describe("IPv6：0=关闭，1=开启"),
  }, async (params) => {
    // 检查域名状态
    const stateCheck = await checkDomainState(params.domain);
    if (!stateCheck.ok) {
      return { content: [{ type: "text", text: stateCheck.error }], isError: true };
    }
    try {
      const response = await apiClient.put('/API/cdn/domain/ipv6', params);
      return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  });

  // 18. query_domain_http_response_headers
  registerDomainGetQuery("query_domain_http_response_headers", "查询域名 HTTP 响应头", "/API/cdn/domain/http/response/headers");

  // 19. set_domain_http_response_headers
  server.tool("set_domain_http_response_headers", "设置域名 HTTP 响应头", {
    domain: z.string().describe("域名"),
    headers: z.string().describe("响应头配置 JSON 数组"),
  }, async (params) => {
    // 检查域名状态
    const stateCheck = await checkDomainState(params.domain);
    if (!stateCheck.ok) {
      return { content: [{ type: "text", text: stateCheck.error }], isError: true };
    }
    try {
      const body = { domain: params.domain };
      body.headers = JSON.parse(params.headers);
      const response = await apiClient.post('/API/cdn/domain/http/response/headers', body);
      return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  });

  // 20. query_domain_ip_blackwhitelist
  registerDomainGetQuery("query_domain_ip_blackwhitelist", "查询域名 IP 黑白名单", "/API/cdn/domain/ip/filter");

  // 21. set_domain_ip_blackwhitelist
  server.tool("set_domain_ip_blackwhitelist", "设置域名 IP 黑白名单", {
    domain: z.string().describe("域名"),
    type: z.enum(["off", "black", "white"]).describe("名单类型：off=关闭，black=黑名单，white=白名单"),
    value: z.string().optional().describe("IP 地址 JSON 数组，如 [\"1.1.1.1\",\"2.2.2.2\"]"),
  }, async (params) => {
    // 检查域名状态
    const stateCheck = await checkDomainState(params.domain);
    if (!stateCheck.ok) {
      return { content: [{ type: "text", text: stateCheck.error }], isError: true };
    }
    try {
      const body = { domain: params.domain, type: params.type };
      body.value = params.value ? JSON.parse(params.value) : [];
      const response = await apiClient.post('/API/cdn/domain/ip/filter', body);
      return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  });

  // 22. query_domain_referer_blackwhitelist
  registerDomainGetQuery("query_domain_referer_blackwhitelist", "查询域名 Referer 黑白名单", "/API/cdn/domain/referer/filter");

  // 23. set_domain_referer_blackwhitelist
  server.tool("set_domain_referer_blackwhitelist", "设置域名 Referer 黑白名单", {
    domain: z.string().describe("域名"),
    type: z.enum(["off", "black", "white"]).describe("名单类型：off=关闭，black=黑名单，white=白名单"),
    value: z.string().optional().describe("Referer 列表 JSON 数组，如 [\"example.com\",\"*.test.com\"]"),
    allow_empty: z.enum(["on", "off"]).optional().describe("允许空 Referer：on=允许，off=不允许"),
  }, async (params) => {
    // 检查域名状态
    const stateCheck = await checkDomainState(params.domain);
    if (!stateCheck.ok) {
      return { content: [{ type: "text", text: stateCheck.error }], isError: true };
    }
    try {
      const body = { domain: params.domain, type: params.type };
      body.value = params.value ? JSON.parse(params.value) : [];
      body.allow_empty = params.allow_empty || "on";
      const response = await apiClient.post('/API/cdn/domain/referer/filter', body);
      return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  });

  // 24. query_domain_ua_blackwhitelist
  registerDomainGetQuery("query_domain_ua_blackwhitelist", "查询域名 UA 黑白名单", "/API/cdn/domain/user/agent/filter");

  // 25. set_domain_ua_blackwhitelist
  server.tool("set_domain_ua_blackwhitelist", "设置域名 UA 黑白名单", {
    domain: z.string().describe("域名"),
    type: z.enum(["off", "black", "white"]).describe("名单类型：off=关闭，black=黑名单，white=白名单"),
    value: z.string().optional().describe("UA 列表 JSON 数组，如 [\"curl/*\",\"Python-urllib/*\"]"),
  }, async (params) => {
    // 检查域名状态
    const stateCheck = await checkDomainState(params.domain);
    if (!stateCheck.ok) {
      return { content: [{ type: "text", text: stateCheck.error }], isError: true };
    }
    try {
      const body = { domain: params.domain, type: params.type };
      body.value = params.value ? JSON.parse(params.value) : [];
      const response = await apiClient.post('/API/cdn/domain/user/agent/filter', body);
      return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  });

  // 26. query_domain_origin_protocol
  registerDomainGetQuery("query_domain_origin_protocol", "查询域名回源协议", "/API/cdn/domain/origin/protocol/policy");

  // 27. set_domain_origin_protocol
  server.tool("set_domain_origin_protocol", "设置域名回源协议", {
    domain: z.string().describe("域名"),
    origin_protocol_policy: z.enum(["match-viewer", "http-only", "https-only"]).describe("回源协议：match-viewer=跟随，http-only=仅HTTP，https-only=仅HTTPS"),
    origin_protocol_http_port: z.string().optional().describe("HTTP 回源端口，默认 80"),
    origin_protocol_https_port: z.string().optional().describe("HTTPS 回源端口，默认 443"),
  }, async (params) => {
    // 检查域名状态
    const stateCheck = await checkDomainState(params.domain);
    if (!stateCheck.ok) {
      return { content: [{ type: "text", text: stateCheck.error }], isError: true };
    }
    try {
      const body = { domain: params.domain, origin_protocol_policy: params.origin_protocol_policy };
      body.origin_protocol_http_port = params.origin_protocol_http_port || "80";
      body.origin_protocol_https_port = params.origin_protocol_https_port || "443";
      const response = await apiClient.put('/API/cdn/domain/origin/protocol/policy', body);
      return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  });

  // 28. query_domain_origin_headers
  registerDomainGetQuery("query_domain_origin_headers", "查询域名回源请求头", "/API/cdn/domain/http/request/headers");

  // 29. set_domain_origin_headers
  server.tool("set_domain_origin_headers", "设置域名回源请求头", {
    domain: z.string().describe("域名"),
    headers: z.string().describe("回源请求头配置 JSON 数组"),
  }, async (params) => {
    // 检查域名状态
    const stateCheck = await checkDomainState(params.domain);
    if (!stateCheck.ok) {
      return { content: [{ type: "text", text: stateCheck.error }], isError: true };
    }
    try {
      const body = { domain: params.domain };
      body.headers = JSON.parse(params.headers);
      const response = await apiClient.post('/API/cdn/domain/http/request/headers', body);
      return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  });

  // 30. query_domain_http2
  registerDomainGetQuery("query_domain_http2", "查询域名 HTTP/2 设置", "/API/cdn/domain/http2");

  // 31. set_domain_http2
  server.tool("set_domain_http2", "设置域名 HTTP/2", {
    domain: z.string().describe("域名"),
    enable: z.enum(["on", "off"]).describe("HTTP/2：on=开启，off=关闭"),
  }, async (params) => {
    // 检查域名状态
    const stateCheck = await checkDomainState(params.domain);
    if (!stateCheck.ok) {
      return { content: [{ type: "text", text: stateCheck.error }], isError: true };
    }
    try {
      const response = await apiClient.put('/API/cdn/domain/http2', params);
      return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  });

  // 32. query_domain_http3
  registerDomainGetQuery("query_domain_http3", "查询域名 HTTP/3 设置", "/API/cdn/domain/http3");

  // 33. set_domain_http3
  server.tool("set_domain_http3", "设置域名 HTTP/3", {
    domain: z.string().describe("域名"),
    enable: z.enum(["on", "off"]).describe("HTTP/3：on=开启，off=关闭"),
  }, async (params) => {
    // 检查域名状态
    const stateCheck = await checkDomainState(params.domain);
    if (!stateCheck.ok) {
      return { content: [{ type: "text", text: stateCheck.error }], isError: true };
    }
    try {
      const response = await apiClient.put('/API/cdn/domain/http3', params);
      return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  });

  // 34. query_domain_min_tls
  registerDomainGetQuery("query_domain_min_tls", "查询域名最低 TLS 版本", "/API/cdn/domain/min/tls/version");

  // 35. set_domain_min_tls
  server.tool("set_domain_min_tls", "设置域名最低 TLS 版本", {
    domain: z.string().describe("域名"),
    min_tls_version: z.enum(["SSLv3", "TLSv1", "TLSv1_2016", "TLSv1.1_2016", "TLSv1.2_2018", "TLSv1.2_2019", "TLSv1.2_2021"]).describe("最低 TLS 版本"),
  }, async (params) => {
    // 检查域名状态
    const stateCheck = await checkDomainState(params.domain);
    if (!stateCheck.ok) {
      return { content: [{ type: "text", text: stateCheck.error }], isError: true };
    }
    try {
      const response = await apiClient.put('/API/cdn/domain/min/tls/version', params);
      return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  });

  // 36. query_domain_origin_timeout (AWS Only)
  registerDomainGetQuery("query_domain_origin_timeout", "查询域名回源超时时间（仅 AWS）", "/API/cdn/domain/origin/connection/policy");

  // 37. set_domain_origin_timeout (AWS Only)
  server.tool("set_domain_origin_timeout", "设置域名回源超时时间（仅 AWS）", {
    domain: z.string().describe("域名"),
    connection_attempts: z.number().optional().describe("连接尝试次数，1-3，默认 3"),
    connection_timeout: z.number().optional().describe("连接超时秒数，1-10，默认 10"),
    response_timeout: z.number().optional().describe("响应超时秒数，1-60，默认 30"),
    keepalive_timeout: z.number().optional().describe("保活超时秒数，1-60，默认 5"),
  }, async (params) => {
    // 检查域名状态
    const stateCheck = await checkDomainState(params.domain);
    if (!stateCheck.ok) {
      return { content: [{ type: "text", text: stateCheck.error }], isError: true };
    }
    try {
      const response = await apiClient.put('/API/cdn/domain/origin/connection/policy', params);
      return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  });

  // 38. query_domain_geo_restriction (AWS Only)
  registerDomainGetQuery("query_domain_geo_restriction", "查询域名地理访问控制（仅 AWS）", "/API/cdn/domain/geo/restriction");

  // 39. set_domain_geo_restriction (AWS Only)
  server.tool("set_domain_geo_restriction", "设置域名地理访问控制（仅 AWS）", {
    domain: z.string().describe("域名"),
    restriction_type: z.enum(["none", "whitelist", "blacklist"]).describe("限制类型：none=无限制，whitelist=白名单，blacklist=黑名单"),
    restriction_item: z.string().optional().describe("国家代码 JSON 数组，如 [\"CN\",\"US\"]"),
  }, async (params) => {
    // 检查域名状态
    const stateCheck = await checkDomainState(params.domain);
    if (!stateCheck.ok) {
      return { content: [{ type: "text", text: stateCheck.error }], isError: true };
    }
    try {
      const body = { domain: params.domain, restriction_type: params.restriction_type };
      if (params.restriction_item) {
        body.restriction_item = JSON.parse(params.restriction_item);
      } else {
        body.restriction_item = [];
      }
      const response = await apiClient.put('/API/cdn/domain/geo/restriction', body);
      return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  });

  // 40. query_country_region_data
  server.tool("query_country_region_data", "查询国家/地区数据（用于地理访问控制）", {}, async () => {
    try {
      const response = await apiClient.get('/API/cdn/statistics/iso/country', {});
      return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  });

  // 41. query_domain_cache_policy
  registerDomainGetQuery("query_domain_cache_policy", "查询域名缓存策略", "/API/cdn/domain/cache/conf");

  // 42. set_domain_cache_policy
  server.tool("set_domain_cache_policy", "设置域名缓存策略", {
    domain: z.string().describe("域名"),
    cache_conf: z.string().describe("缓存配置 JSON 数组，如 [{\"path\":\"/img/*\",\"type\":1,\"policy_id\":\"xxx\"}]，设为 [] 表示删除自定义策略"),
  }, async (params) => {
    // 检查域名状态
    const stateCheck = await checkDomainState(params.domain);
    if (!stateCheck.ok) {
      return { content: [{ type: "text", text: stateCheck.error }], isError: true };
    }
    try {
      const body = { domain: params.domain };
      body.cache_conf = JSON.parse(params.cache_conf);
      const response = await apiClient.put('/API/cdn/domain/cache/conf', body);
      return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  });

  // 43. get_aws_cache_policy_list
  server.tool("get_aws_cache_policy_list", "获取 AWS 缓存策略列表", {
    domain: z.string().describe("域名"),
    type: z.enum(["managed", "custom"]).describe("策略类型：managed=系统默认，custom=自定义"),
  }, async (params) => {
    try {
      const response = await apiClient.get('/API/cdn/list/cache/policies', { domain: params.domain, type: params.type });
      return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  });

  // 44. get_aws_origin_request_policy_list
  server.tool("get_aws_origin_request_policy_list", "获取 AWS 回源请求头策略列表", {
    domain: z.string().describe("域名"),
    type: z.enum(["managed", "custom"]).describe("策略类型：managed=系统默认，custom=自定义"),
  }, async (params) => {
    try {
      const response = await apiClient.get('/API/cdn/aws/origin/request/policies', { domain: params.domain, type: params.type });
      return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  });

  // 45. get_aws_origin_request_policy
  registerDomainGetQuery("get_aws_origin_request_policy", "查询当前 AWS 回源请求头策略", "/API/cdn/domain/request/header/policy");

  // 46. set_aws_origin_request_policy
  server.tool("set_aws_origin_request_policy", "设置 AWS 回源请求头策略", {
    domain: z.string().describe("域名"),
    policy_id: z.string().optional().describe("策略 ID"),
  }, async (params) => {
    // 检查域名状态
    const stateCheck = await checkDomainState(params.domain);
    if (!stateCheck.ok) {
      return { content: [{ type: "text", text: stateCheck.error }], isError: true };
    }
    try {
      const response = await apiClient.put('/API/cdn/domain/request/header/policy', params);
      return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  });

  // 47. get_aws_response_policy_list
  server.tool("get_aws_response_policy_list", "获取 AWS 响应头策略列表", {
    domain: z.string().describe("域名"),
    type: z.enum(["managed", "custom"]).describe("策略类型：managed=系统默认，custom=自定义"),
  }, async (params) => {
    try {
      const response = await apiClient.get('/API/cdn/aws/response/headers/policies', { domain: params.domain, type: params.type });
      return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  });

  // 48. get_aws_response_policy
  registerDomainGetQuery("get_aws_response_policy", "查询当前 AWS 响应头策略", "/API/cdn/domain/response/header/policy");

  // 49. set_aws_response_policy
  server.tool("set_aws_response_policy", "设置 AWS 响应头策略", {
    domain: z.string().describe("域名"),
    policy_id: z.string().optional().describe("策略 ID"),
  }, async (params) => {
    // 检查域名状态
    const stateCheck = await checkDomainState(params.domain);
    if (!stateCheck.ok) {
      return { content: [{ type: "text", text: stateCheck.error }], isError: true };
    }
    try {
      const response = await apiClient.put('/API/cdn/domain/response/header/policy', params);
      return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  });
}

// Domain operations tool module
import { z } from 'zod';

/**
 * Register domain operation tools to MCP Server
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server
 * @param {{ post: Function, get: Function, put: Function, del: Function }} apiClient
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
      const response = await apiClient.put('/API/cdn/domain/state/open', { domain: params.domain });
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
      const response = await apiClient.put('/API/cdn/domain/state/close', { domain: params.domain });
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
      const response = await apiClient.del('/API/cdn/domain', { domain: params.domain });
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

  // 6. quick_create_domain - 一键快速创建加速域名
  server.tool("quick_create_domain", "一键快速创建 CDN 加速域名（只需域名和源站，自动匹配/申请证书并开启 SSL）", {
    domain: z.string().describe("加速域名，如 v2.bbv.cfai.work"),
    origin: z.string().describe("源站地址（域名或 IP），如 www2.myccdn.info 或 1.2.3.4"),
    type: z.enum(["oversea", "live", "video", "dynamic", "static", "download"]).optional().describe("加速类型，默认 oversea（海外加速）"),
    note: z.string().optional().describe("备注"),
  }, async (params) => {
    try {
      // 1. 判断源站类型
      const isIp = /^\d+\.\d+\.\d+\.\d+$/.test(params.origin);
      const source_type = isIp ? "1" : "2";

      // 2. 自动查找匹配的证书（通配符或精确匹配）
      let cert_id = null;
      let cert_name = null;
      try {
        const certResponse = await apiClient.get('/API/cdn/sslcert', {});
        if (certResponse.data && Array.isArray(certResponse.data)) {
          const domain = params.domain;
          const parts = domain.split('.');
          const wildcardPatterns = [];
          for (let i = 1; i < parts.length; i++) {
            wildcardPatterns.push('*.' + parts.slice(i).join('.'));
          }
          const matchPatterns = [domain, ...wildcardPatterns];

          for (const pattern of matchPatterns) {
            const cert = certResponse.data.find(c =>
              c.state === 'ISSUED' && (
                c.common_name === pattern ||
                (c.subject_altname && c.subject_altname.includes(pattern))
              )
            );
            if (cert) {
              cert_id = cert.id;
              cert_name = cert.name || cert.common_name;
              break;
            }
          }
        }
      } catch {
        // 证书查询失败
      }

      // 3. 如果没有匹配证书，自动申请泛域名证书
      if (!cert_id) {
        const domain = params.domain;
        const parts = domain.split('.');
        // 取最近一级的泛域名，如 v2.bbv.cfai.work → *.bbv.cfai.work
        const wildcardDomain = '*.' + parts.slice(1).join('.');

        try {
          // 申请证书
          const applyResponse = await apiClient.post('/API/cdn/sslcert/apply', {
            domain: wildcardDomain,
            validation_method: 'DNS',
            key_algorithm: 'EC_secp384r1',
          });

          const newCertId = applyResponse.data.id;

          // 获取验证信息
          const validationResponse = await apiClient.get('/API/cdn/sslcert/validation/options', { id: newCertId });
          const validations = validationResponse.data.validations || [];

          // 构建返回信息
          const lines = [
            `⚠️ 未找到匹配的 SSL 证书，已自动申请泛域名证书`,
            ``,
            `证书 ID: ${newCertId}`,
            `申请域名: ${wildcardDomain}`,
            `验证方式: DNS (CNAME)`,
            ``,
            `📋 请添加以下 DNS CNAME 记录完成验证：`,
            ``,
          ];

          for (const v of validations) {
            lines.push(`域名: ${v.domain}`);
            lines.push(`  记录类型: CNAME`);
            lines.push(`  主机记录: ${v.cname_name}`);
            lines.push(`  记录值: ${v.cname_value}`);
            lines.push(`  状态: ${v.status}`);
            lines.push(``);
          }

          lines.push(`⏳ 完成 DNS 验证后证书将自动签发（通常需要几分钟到几小时）`);
          lines.push(`✅ 证书签发后，请再次调用 quick_create_domain 即可自动完成域名创建`);

          return { content: [{ type: "text", text: lines.join('\n') }] };
        } catch (certError) {
          return {
            content: [{ type: "text", text: `未找到匹配的 SSL 证书，且自动申请证书失败: ${certError.message}\n\n请手动通过 apply_aws_certificate 申请证书后再试` }],
            isError: true,
          };
        }
      }

      // 4. 有证书，构建请求体创建域名
      const body = {
        domain: params.domain,
        type: params.type || "oversea",
        source_type,
        source_conf: [{ source: params.origin, type: "1" }],
        is_ssl: "1",
        cert_id,
        cache_type: "1",
      };

      if (params.note) body.note = params.note;

      // 5. 创建域名
      const response = await apiClient.post('/API/cdn/domain', body);

      // 6. 格式化返回信息
      const data = response.data;
      const lines = [
        `✅ 域名创建成功`,
        ``,
        `域名: ${data.name}`,
        `CNAME: ${data.cname}`,
        `域名 ID: ${data.id}`,
        `加速类型: ${data.type}`,
        `源站: ${params.origin} (${isIp ? 'IP' : '域名'})`,
        `SSL: 已开启`,
        `证书: ${cert_name} (ID: ${cert_id})`,
        ``,
        `⚠️ 请将域名 CNAME 解析到: ${data.cname}`,
      ];

      return { content: [{ type: "text", text: lines.join('\n') }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  });
}

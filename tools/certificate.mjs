// Certificate management tool module
import { z } from 'zod';

/**
 * Register certificate tools to MCP Server
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server
 * @param {{ post: Function, get: Function, put: Function, del: Function }} apiClient
 */
export function registerCertificateTools(server, apiClient) {
  // 50. apply_aws_certificate
  server.tool("apply_aws_certificate", "申请 AWS 证书", {
    domain: z.string().describe("要申请证书的域名，支持泛域名如 *.example.com，多个用 \\n 分隔"),
    validation_method: z.enum(["DNS", "EMAIL"]).optional().describe("验证方式，默认 DNS"),
    key_algorithm: z.enum(["RSA_2048", "EC_prime256v1", "EC_secp384r1"]).optional().describe("密钥算法，默认 EC_secp384r1"),
  }, async (params) => {
    try {
      const body = {
        domain: params.domain,
        validation_method: params.validation_method || 'DNS',
        key_algorithm: params.key_algorithm || 'EC_secp384r1',
      };
      const response = await apiClient.post('/API/cdn/sslcert/apply', body);
      return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  });

  // 51. get_aws_cert_validation
  server.tool("get_aws_cert_validation", "获取 AWS 证书的 DNS 验证信息（CNAME 记录）", {
    id: z.string().describe("证书 ID"),
  }, async (params) => {
    try {
      const response = await apiClient.get('/API/cdn/sslcert/validation/options', { id: params.id });
      return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  });

  // 52. upload_certificate
  server.tool("upload_certificate", "上传 SSL 证书", {
    name: z.string().describe("证书名称"),
    public_key: z.string().describe("证书公钥 PEM 内容"),
    private_key: z.string().describe("证书私钥 PEM 内容"),
    ca_key: z.string().optional().describe("证书链 PEM 内容"),
  }, async (params) => {
    try {
      const response = await apiClient.post('/API/cdn/sslcert', params);
      return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  });

  // 53. update_certificate
  server.tool("update_certificate", "更新 SSL 证书", {
    id: z.string().describe("要更新的证书 ID"),
    public_key: z.string().describe("新证书公钥 PEM 内容"),
    private_key: z.string().describe("新证书私钥 PEM 内容"),
    ca_key: z.string().optional().describe("新证书链 PEM 内容"),
  }, async (params) => {
    try {
      const response = await apiClient.put('/API/cdn/sslcert', params);
      return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  });

  // 54. get_certificate_list
  server.tool("get_certificate_list", "获取证书列表", {
    id: z.string().optional().describe("按证书 ID 筛选"),
    name: z.string().optional().describe("按证书名称筛选（支持模糊搜索）"),
  }, async (params) => {
    try {
      const queryParams = {};
      if (params.id) queryParams.id = params.id;
      if (params.name) queryParams.name = params.name;
      const response = await apiClient.get('/API/cdn/sslcert', queryParams);
      return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  });
}

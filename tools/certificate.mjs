// Certificate management tool module
import { z } from 'zod';

/**
 * Register certificate tools to MCP Server
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server
 * @param {{ post: Function, get: Function }} apiClient
 */
export function registerCertificateTools(server, apiClient) {
  // 50. apply_aws_certificate
  server.tool("apply_aws_certificate", "申请 AWS 证书", {
    domain: z.string().describe("要申请证书的域名"),
  }, async (params) => {
    try {
      const response = await apiClient.post('/API/cdn/cert/aws/apply', params);
      return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  });

  // 51. get_aws_cert_validation
  server.tool("get_aws_cert_validation", "获取 AWS 证书验证信息", {
    cert_id: z.string().describe("证书 ID"),
  }, async (params) => {
    try {
      const response = await apiClient.post('/API/cdn/cert/aws/validation', params);
      return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  });

  // 52. upload_certificate
  server.tool("upload_certificate", "上传 SSL 证书", {
    name: z.string().describe("证书名称"),
    cert: z.string().describe("证书 PEM 内容"),
    key: z.string().describe("私钥 PEM 内容"),
  }, async (params) => {
    try {
      const response = await apiClient.post('/API/cdn/cert/upload', params);
      return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  });

  // 53. update_certificate
  server.tool("update_certificate", "更新 SSL 证书", {
    cert_id: z.string().describe("要更新的证书 ID"),
    cert: z.string().describe("新证书 PEM 内容"),
    key: z.string().describe("新私钥 PEM 内容"),
  }, async (params) => {
    try {
      const response = await apiClient.post('/API/cdn/cert/update', params);
      return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  });

  // 54. get_certificate_list
  server.tool("get_certificate_list", "获取证书列表", {
    cert_id: z.string().optional().describe("按证书 ID 筛选"),
    name: z.string().optional().describe("按证书名称筛选"),
  }, async (params) => {
    try {
      const queryParams = {};
      if (params.cert_id) queryParams.cert_id = params.cert_id;
      if (params.name) queryParams.name = params.name;
      const response = await apiClient.get('/API/cdn/cert', queryParams);
      return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  });
}

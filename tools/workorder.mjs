// Work order management tool module
import { z } from 'zod';

/**
 * Register work order tools to MCP Server
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server
 * @param {{ post: Function, get: Function, put: Function, del: Function }} apiClient
 */
export function registerWorkorderTools(server, apiClient) {
  // 70. get_workorder_types
  server.tool("get_workorder_types", "获取工单类型列表", {}, async () => {
    try {
      const response = await apiClient.get('/API/user/workorder/category', {});
      return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  });

  // 71. create_workorder
  server.tool("create_workorder", "创建工单", {
    title: z.string().describe("工单标题"),
    telephone: z.string().describe("联系电话"),
    email: z.string().describe("联系邮箱"),
    category_id: z.string().describe("工单类型 ID"),
    priority: z.enum(["1", "2", "3"]).describe("优先级：1=普通，2=中等，3=紧急"),
    content: z.string().describe("工单内容"),
    contact: z.string().optional().describe("联系人姓名"),
    urgent_reason: z.string().optional().describe("紧急原因"),
    operator_role: z.string().optional().describe("操作角色，默认 noc"),
    type: z.string().optional().describe("工单类型，默认 2"),
  }, async (params) => {
    try {
      const body = { ...params };
      if (!body.operator_role) body.operator_role = 'noc';
      if (!body.type) body.type = '2';
      const response = await apiClient.post('/API/user/workorder', body);
      return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  });

  // 72. get_workorder_list
  server.tool("get_workorder_list", "获取工单列表", {
    status: z.string().optional().describe("按状态筛选"),
    page: z.string().optional().describe("页码"),
    limit: z.string().optional().describe("每页数量"),
  }, async (params) => {
    try {
      const queryParams = {};
      if (params.status) queryParams.status = params.status;
      if (params.page) queryParams.page = params.page;
      if (params.limit) queryParams.limit = params.limit;
      const response = await apiClient.get('/API/user/workorder', queryParams);
      return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  });

  // 73. cancel_workorder
  server.tool("cancel_workorder", "取消工单", {
    id: z.string().describe("工单 ID"),
  }, async (params) => {
    try {
      const response = await apiClient.put('/API/user/workorder/cancel', params);
      return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  });

  // 74. close_workorder
  server.tool("close_workorder", "关闭工单", {
    id: z.string().describe("工单 ID"),
  }, async (params) => {
    try {
      const response = await apiClient.put('/API/user/workorder/close', params);
      return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  });

  // 75. reopen_workorder
  server.tool("reopen_workorder", "重新打开工单", {
    id: z.string().describe("工单 ID"),
  }, async (params) => {
    try {
      const response = await apiClient.put('/API/user/workorder', params);
      return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  });

  // 76. delete_workorder
  server.tool("delete_workorder", "删除工单", {
    ids: z.string().describe("工单 ID，多个以逗号分隔"),
  }, async (params) => {
    try {
      const response = await apiClient.del('/API/user/workorder', { ids: params.ids });
      return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  });

  // 77. get_workorder_messages
  server.tool("get_workorder_messages", "获取工单沟通记录", {
    id: z.string().describe("工单 ID"),
  }, async (params) => {
    try {
      const response = await apiClient.get('/API/user/workorder/log', { id: params.id });
      return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  });

  // 78. send_workorder_message
  server.tool("send_workorder_message", "发送工单沟通消息", {
    id: z.string().describe("工单 ID"),
    content: z.string().describe("消息内容"),
  }, async (params) => {
    try {
      const response = await apiClient.post('/API/user/workorder/log', params);
      return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  });
}

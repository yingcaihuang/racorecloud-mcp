// API 客户端模块
// 封装 Racore API 的 HTTP 调用逻辑，处理超时、重试与错误

const API_BASE_URL = 'https://portal.racorecloud.com';
const REQUEST_TIMEOUT = 30000; // 30 秒超时

/**
 * 创建 API 客户端
 * @param {{ getValidToken: () => Promise<string>, clearTokenCache: () => void }} authManager
 * @returns {{ post: (endpoint: string, body: object) => Promise<any> }}
 */
export function createApiClient(authManager) {
  /**
   * 发送 POST 请求到指定端点
   * @param {string} endpoint - API 端点路径
   * @param {object} body - 请求体
   * @returns {Promise<any>} - 解析后的响应数据
   */
  async function post(endpoint, body) {
    const token = await authManager.getValidToken();
    const response = await sendRequest(endpoint, body, token);

    // 如果 HTTP 401，执行重试逻辑
    if (response.status === 401) {
      authManager.clearTokenCache();
      const newToken = await authManager.getValidToken();
      const retryResponse = await sendRequest(endpoint, body, newToken);

      if (retryResponse.status === 401) {
        throw new Error(`认证失败: 重试后仍返回 401，请检查 Access Key 和 Secret Key 是否正确`);
      }

      return await parseResponse(retryResponse, endpoint);
    }

    return await parseResponse(response, endpoint);
  }

  /**
   * 发送 HTTP 请求（含超时控制）
   * @param {string} endpoint - API 端点路径
   * @param {object} body - 请求体
   * @param {string} token - Bearer Token
   * @returns {Promise<Response>}
   */
  async function sendRequest(endpoint, body, token) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      return response;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error(`请求超时: ${endpoint} 在 30 秒内未响应`);
      }
      throw new Error(`网络连接失败: ${endpoint} - ${error.message}`);
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * 解析 HTTP 响应
   * @param {Response} response - fetch 响应对象
   * @param {string} endpoint - 端点路径（用于错误信息）
   * @returns {Promise<any>}
   */
  async function parseResponse(response, endpoint) {
    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error(`响应解析失败: ${endpoint} 返回非 JSON 格式 (HTTP ${response.status})`);
    }

    if (data.code !== 1) {
      throw new Error(`API 错误: ${data.message || '未知错误'}`);
    }

    return data;
  }

  /**
   * 发送 GET 请求到指定端点
   * @param {string} endpoint - API 端点路径
   * @param {object} [queryParams] - 查询参数对象
   * @returns {Promise<any>} - 解析后的响应数据
   */
  async function get(endpoint, queryParams) {
    const token = await authManager.getValidToken();
    const response = await sendGetRequest(endpoint, queryParams, token);

    if (response.status === 401) {
      authManager.clearTokenCache();
      const newToken = await authManager.getValidToken();
      const retryResponse = await sendGetRequest(endpoint, queryParams, newToken);

      if (retryResponse.status === 401) {
        throw new Error(`认证失败: 重试后仍返回 401，请检查 Access Key 和 Secret Key 是否正确`);
      }

      return await parseResponse(retryResponse, endpoint);
    }

    return await parseResponse(response, endpoint);
  }

  /**
   * 发送 GET HTTP 请求（含超时控制）
   * @param {string} endpoint - API 端点路径
   * @param {object} [queryParams] - 查询参数
   * @param {string} token - Bearer Token
   * @returns {Promise<Response>}
   */
  async function sendGetRequest(endpoint, queryParams, token) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      let url = `${API_BASE_URL}${endpoint}`;
      if (queryParams) {
        const searchParams = new URLSearchParams();
        for (const [key, value] of Object.entries(queryParams)) {
          if (value !== undefined && value !== null) {
            searchParams.append(key, String(value));
          }
        }
        const qs = searchParams.toString();
        if (qs) {
          url += `?${qs}`;
        }
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        signal: controller.signal,
      });

      return response;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error(`请求超时: ${endpoint} 在 30 秒内未响应`);
      }
      throw new Error(`网络连接失败: ${endpoint} - ${error.message}`);
    } finally {
      clearTimeout(timeout);
    }
  }

  return { post, get };
}

// 认证管理器模块
// 实现 HMAC-SHA512 签名计算与 Token 缓存管理

import crypto from 'node:crypto';

const AUTH_BASE_URL = 'https://portal.racorecloud.com';
const AUTH_ENDPOINT = '/API/OAuth/token';
const TOKEN_REFRESH_THRESHOLD = 300; // 距过期不足 300 秒时提前刷新
const REQUEST_TIMEOUT = 30000; // 30 秒超时

/**
 * 计算 HMAC-SHA512 签名
 * @param {string} accessKey - 公开密钥标识符
 * @param {string} secretKey - 私密密钥
 * @param {string} dateStr - RFC1123 格式时间戳
 * @returns {string} 小写十六进制签名字符串
 */
export function computeSignature(accessKey, secretKey, dateStr) {
  const message = dateStr + accessKey + secretKey;
  return crypto.createHmac('sha512', secretKey).update(message).digest('hex');
}

/**
 * 创建认证管理器
 * @param {string} accessKey - 公开密钥标识符
 * @param {string} secretKey - 私密密钥
 * @returns {{ getValidToken: () => Promise<string> }}
 */
export function createAuthManager(accessKey, secretKey) {
  // Token 缓存：{ token: string, expire: number }
  let tokenCache = null;

  /**
   * 判断缓存的 Token 是否仍然有效（距过期超过 300 秒）
   */
  function isTokenValid() {
    if (!tokenCache) return false;
    const now = Math.floor(Date.now() / 1000);
    return (tokenCache.expire - now) >= TOKEN_REFRESH_THRESHOLD;
  }

  /**
   * 执行认证流程，获取新的 Token
   */
  async function authenticate() {
    const dateStr = new Date().toUTCString();
    const signature = computeSignature(accessKey, secretKey, dateStr);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      const response = await fetch(`${AUTH_BASE_URL}${AUTH_ENDPOINT}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-request-date': dateStr,
        },
        body: JSON.stringify({
          access_key: accessKey,
          signature,
        }),
        signal: controller.signal,
      });

      const data = await response.json();

      if (data.code !== 1) {
        throw new Error(`认证失败: ${data.message || '未知错误'}`);
      }

      tokenCache = {
        token: data.data.token,
        expire: data.data.expire,
      };

      return tokenCache.token;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('认证请求超时: 30 秒内未收到响应');
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * 获取有效的 Token，自动处理缓存与刷新
   * @returns {Promise<string>}
   */
  async function getValidToken() {
    if (isTokenValid()) {
      return tokenCache.token;
    }
    return authenticate();
  }

  /**
   * 清除 Token 缓存（用于 401 重试时强制重新认证）
   */
  function clearTokenCache() {
    tokenCache = null;
  }

  return { getValidToken, clearTokenCache };
}

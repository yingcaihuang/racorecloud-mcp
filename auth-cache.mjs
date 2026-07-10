// authManager 进程内存缓存
// 让同一租户的多个 HTTP 请求复用同一个 authManager 实例，
// 从而复用 auth.mjs 内部的 token 缓存，避免每个请求都重新认证。
//
// 安全要点：缓存 key 使用 hash(accessKey + secretKey)，
// 绝不能只用 accessKey——否则携带错误 secretKey 的请求可能命中
// 已有的有效 token 缓存而绕过密钥验证。

import crypto from 'node:crypto';
import { createAuthManager } from './auth.mjs';

// 条目 TTL：超过这个时间未被使用则清理，防止内存无限增长
const ENTRY_TTL_MS = 60 * 60 * 1000; // 1 小时
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000; // 每 10 分钟清理一次

// key: hash(accessKey+secretKey) -> { manager, lastUsed }
const cache = new Map();

/**
 * 用凭证的 hash 作为缓存 key（绝不用明文 accessKey，避免错误密钥蹭缓存）
 * @param {string} accessKey
 * @param {string} secretKey
 * @returns {string}
 */
function cacheKey(accessKey, secretKey) {
  return crypto
    .createHash('sha256')
    .update(`${accessKey}:${secretKey}`)
    .digest('hex');
}

/**
 * 获取（或创建）指定租户的 authManager，复用其内部 token 缓存
 * @param {string} accessKey
 * @param {string} secretKey
 * @returns {{ getValidToken: () => Promise<string>, clearTokenCache: () => void }}
 */
export function getCachedAuthManager(accessKey, secretKey) {
  const key = cacheKey(accessKey, secretKey);
  let entry = cache.get(key);

  if (!entry) {
    entry = { manager: createAuthManager(accessKey, secretKey), lastUsed: 0 };
    cache.set(key, entry);
  }

  entry.lastUsed = Date.now();
  return entry.manager;
}

// 定期清理长时间未使用的条目（纯内存维护，无外部依赖）
const timer = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (now - entry.lastUsed > ENTRY_TTL_MS) {
      cache.delete(key);
    }
  }
}, CLEANUP_INTERVAL_MS);

// 不阻止进程退出
timer.unref?.();

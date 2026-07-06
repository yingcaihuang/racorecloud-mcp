// 参数校验器模块

/**
 * 校验时间字符串是否符合 yyyy-mm-dd hh:mm 格式
 * 包含月份(01-12)、日期(基于月份的有效天数)、小时(00-23)、分钟(00-59) 的有效性检查
 * @param {string} timeStr - 待校验的时间字符串
 * @returns {boolean} 是否符合格式要求
 */
export function validateTimeFormat(timeStr) {
  if (typeof timeStr !== 'string') return false;

  const regex = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/;
  const match = timeStr.match(regex);
  if (!match) return false;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);
  const hour = parseInt(match[4], 10);
  const minute = parseInt(match[5], 10);

  // 月份校验: 01-12
  if (month < 1 || month > 12) return false;

  // 小时校验: 00-23
  if (hour < 0 || hour > 23) return false;

  // 分钟校验: 00-59
  if (minute < 0 || minute > 59) return false;

  // 日期校验: 基于年月计算最大天数
  const daysInMonth = new Date(year, month, 0).getDate();
  if (day < 1 || day > daysInMonth) return false;

  return true;
}

/**
 * 校验时间跨度是否不超过 90 天
 * @param {string} startTime - 开始时间，格式 yyyy-mm-dd hh:mm
 * @param {string} endTime - 结束时间，格式 yyyy-mm-dd hh:mm
 * @returns {boolean} 时间跨度是否在 90 天以内
 */
export function validateTimeRange(startTime, endTime) {
  const start = new Date(startTime.replace(' ', 'T'));
  const end = new Date(endTime.replace(' ', 'T'));

  const diffMs = end.getTime() - start.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  return diffDays <= 90;
}

/**
 * 处理时间参数的完整校验逻辑
 * - 互斥校验: start_time/end_time 与 scope 不能同时存在
 * - 成对校验: start_time 和 end_time 必须同时提供
 * - 格式校验: 时间字符串必须符合 yyyy-mm-dd hh:mm 格式
 * - 默认值: 均未提供时，默认 scope = "today"
 * @param {object} params - 输入参数对象
 * @param {string} [params.start_time] - 开始时间
 * @param {string} [params.end_time] - 结束时间
 * @param {string} [params.scope] - 预定义时间范围
 * @param {string} [params.domain] - 域名（透传）
 * @returns {{ valid: true, query: object } | { valid: false, error: string }}
 */
export function validateTimeParams(params) {
  const { start_time, end_time, scope, domain } = params || {};

  const hasStartTime = start_time !== undefined && start_time !== null && start_time !== '';
  const hasEndTime = end_time !== undefined && end_time !== null && end_time !== '';
  const hasScope = scope !== undefined && scope !== null && scope !== '';

  // 互斥校验: start_time/end_time 与 scope 不能同时存在
  if ((hasStartTime || hasEndTime) && hasScope) {
    return {
      valid: false,
      error: '参数冲突: start_time/end_time 与 scope 不能同时使用，请选择其中一种时间范围指定方式'
    };
  }

  // 成对校验: start_time 和 end_time 必须同时提供
  if (hasStartTime && !hasEndTime) {
    return {
      valid: false,
      error: '参数错误: start_time 和 end_time 必须同时提供，缺少 end_time'
    };
  }
  if (!hasStartTime && hasEndTime) {
    return {
      valid: false,
      error: '参数错误: start_time 和 end_time 必须同时提供，缺少 start_time'
    };
  }

  // 时间格式校验
  if (hasStartTime) {
    if (!validateTimeFormat(start_time)) {
      return {
        valid: false,
        error: '参数校验错误: start_time 格式无效，期望格式为 yyyy-mm-dd hh:mm'
      };
    }
  }
  if (hasEndTime) {
    if (!validateTimeFormat(end_time)) {
      return {
        valid: false,
        error: '参数校验错误: end_time 格式无效，期望格式为 yyyy-mm-dd hh:mm'
      };
    }
  }

  // 构建查询参数
  const query = {};

  if (domain) {
    query.domain = domain;
  }

  if (hasStartTime && hasEndTime) {
    query.start_time = start_time;
    query.end_time = end_time;
  } else if (hasScope) {
    query.scope = scope;
  } else {
    // 默认 scope 为 today
    query.scope = 'today';
  }

  return { valid: true, query };
}

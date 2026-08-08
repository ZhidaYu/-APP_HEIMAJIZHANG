/**
 * 通用工具函数
 *
 * 本项目中多处需要使用日期相关的辅助函数，
 * 统一放在这里，避免每个文件各自写一份（DRY 原则：Don't Repeat Yourself）。
 */

/**
 * 获取今天的日期字符串（YYYY-MM-DD 格式）
 *
 * 用于：
 * - 新建记账记录时，日期输入框的默认值
 * - 日期选择器的最大可选日期（不能记未来的账）
 * - 列表页判断某条记录是否属于"今天"
 *
 * @returns 当前日期的字符串，如 "2026-08-08"
 */
export function getTodayStr(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

/**
 * 获取昨天的日期字符串（YYYY-MM-DD 格式）
 *
 * 用于列表页显示"昨天"标签。
 * 计算方式：当前时间减去 86400000 毫秒（24 小时 = 24×60×60×1000）。
 *
 * 注意：这个方法不处理跨月/跨年的边界情况——JavaScript 的 Date 对象
 * 会自动处理（如 2026-01-01 减一天自动变成 2025-12-31）。
 *
 * @returns 昨天日期的字符串，如 "2026-08-07"
 */
export function getYesterdayStr(): string {
  const yesterday = new Date(Date.now() - 86400000)
  return `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`
}

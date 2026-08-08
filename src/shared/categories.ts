/**
 * 分类查询与操作函数
 *
 * 本文件包含所有与分类相关的「逻辑函数」——查找、转换、合并等。
 * 分类的「纯数据」（数组、颜色映射、支付方式）在 category-data.ts 中。
 *
 * 本文件从 category-data.ts 导入数据并重新导出，确保所有旧的 import 语句不受影响。
 */
import type { PrimaryCategory, SubCategory, RecordType, UserCategory } from './types'
import {
  PRIMARY_CATEGORIES,
  INCOME_CATEGORIES,
  INCOME_COLORS,
  CATEGORY_COLORS,
  PAYMENT_METHODS,
} from './category-data'

// 重新导出数据，让外部模块只需 `import { ... } from './categories'`
export {
  PRIMARY_CATEGORIES,
  INCOME_CATEGORIES,
  INCOME_COLORS,
  CATEGORY_COLORS,
  PAYMENT_METHODS,
}

// ============================================================================
// 查询函数
// ============================================================================

/**
 * 根据记账类型（支出/收入）获取对应的分类列表
 *
 * 这是前端表单和筛选组件最常调用的函数之一。
 * 用户切到"支出"就返回 10 大支出分类，切到"收入"就返回 5 大收入分类。
 *
 * @param type - 'expense'（支出）或 'income'（收入）
 * @returns 对应的分类列表
 */
export function getCategoriesByType(type: RecordType): PrimaryCategory[] {
  return type === 'expense' ? PRIMARY_CATEGORIES : INCOME_CATEGORIES
}

/**
 * 根据类型和一级分类 key，获取该分类的颜色
 *
 * 支出分类用 CATEGORY_COLORS（10 种颜色），收入分类用 INCOME_COLORS（5 种颜色）。
 * 找不到时返回默认灰色 #6B7280，确保界面不会因为缺颜色而崩溃。
 *
 * @param type - 'expense' 或 'income'
 * @param primaryKey - 一级分类的 key
 * @returns CSS 颜色值（如 "#F97316"）
 */
export function getCategoryColorByType(type: RecordType, primaryKey: string): string {
  if (type === 'expense') return getCategoryColor(primaryKey)
  return INCOME_COLORS[primaryKey] || '#6B7280'
}

/**
 * 获取支出分类的颜色
 *
 * 已知的分类返回对应颜色，未知的返回默认灰色。
 * 这样的设计确保即使用户的分类数据异常，界面也不会报错崩溃。
 *
 * @param primaryKey - 一级分类 key
 * @returns CSS 颜色值
 */
export function getCategoryColor(primaryKey: string): string {
  return CATEGORY_COLORS[primaryKey] || '#6B7280'
}

// ---------- 分类查找函数 ----------

/**
 * 根据 key 查找一级分类（在支出和收入中都会找）
 *
 * 先在支出分类（10 大类）中查找，找不到再去收入分类（5 大类）中找。
 *
 * @param key - 一级分类的 key（如 "food"）
 * @returns 找到的分类对象（含 label、icon、children），找不到返回 undefined
 */
export function getPrimaryCategory(key: string): PrimaryCategory | undefined {
  return PRIMARY_CATEGORIES.find(c => c.key === key) || INCOME_CATEGORIES.find(c => c.key === key)
}

/**
 * 根据一级和二级分类 key，查找完整的分类信息
 *
 * 这是表单提交时用来验证"用户选的分类是否合法"的函数。
 * 不仅返回二级分类，还附带它所属的一级分类信息。
 *
 * @param primaryKey - 一级分类 key
 * @param subKey - 二级分类 key
 * @returns { primary: 一级分类对象, sub: 二级分类对象 }，找不到返回 undefined
 */
export function getSubCategory(
  primaryKey: string,
  subKey: string
): { primary: PrimaryCategory; sub: SubCategory } | undefined {
  // 在支出和收入分类中都要找（因为用户可能记支出也可能记收入）
  for (const cats of [PRIMARY_CATEGORIES, INCOME_CATEGORIES]) {
    const primary = cats.find(c => c.key === primaryKey)
    if (primary) {
      const sub = primary.children.find(s => s.key === subKey)
      if (sub) return { primary, sub }
    }
  }
  return undefined
}

/**
 * 获取分类的完整显示文字
 *
 * 如 "food" + "takeout" → "餐饮饮食 > 外卖外送"
 * 用于记录列表、统计明细等需要展示分类的地方。
 *
 * 查找顺序：
 * 1. 先在预设的 10 大支出分类中找
 * 2. 找不到再在预设的 5 大收入分类中找
 * 3. 还找不到就查用户自己创建的分类（通过 userCategories 参数传入）
 * 4. 都找不到返回 "未知分类"
 *
 * @param primaryKey - 一级分类 key
 * @param subKey - 二级分类 key
 * @param userCategories - 可选，用户自定义分类列表（需要调用者从数据库获取后传入）
 * @returns 格式如 "餐饮饮食 > 外卖外送" 的显示文字
 */
export function getCategoryDisplay(primaryKey: string, subKey: string, userCategories?: UserCategory[]): string {
  // 第 1 步：查预设支出分类
  for (const cat of PRIMARY_CATEGORIES) {
    if (cat.key === primaryKey) {
      const sub = cat.children.find(s => s.key === subKey)
      return sub ? `${cat.label} > ${sub.label}` : cat.label
    }
  }
  // 第 2 步：查预设收入分类
  for (const cat of INCOME_CATEGORIES) {
    if (cat.key === primaryKey) {
      const sub = cat.children.find(s => s.key === subKey)
      return sub ? `${cat.label} > ${sub.label}` : cat.label
    }
  }
  // 第 3 步：查用户自定义分类
  if (userCategories && userCategories.length > 0) {
    // 找一级分类（parentKey 为 null 的是一级分类）
    const userPrimary = userCategories.find(c => c.key === primaryKey && c.parentKey === null)
    if (userPrimary) {
      // 找二级分类（parentKey 指向一级分类的是二级分类）
      const userSub = userCategories.find(c => c.key === subKey && c.parentKey === primaryKey)
      return userSub ? `${userPrimary.label} > ${userSub.label}` : userPrimary.label
    }
  }
  // 第 4 步：都找不到 — 这是异常情况，打印警告方便排查
  console.warn('[categories] 未找到分类:', primaryKey, subKey)
  return '未知分类'
}

// ============================================================================
// 第六部分：用户自定义分类合并
// ============================================================================

/**
 * 将预设分类和用户自定义分类合并为完整列表
 *
 * 为什么需要合并？
 * 预设分类和用户分类存在不同地方——预设的在 categories.ts（代码中），
 * 用户的在 SQLite 数据库的 user_categories 表中。
 * 前端需要的是一个"完整列表"，包含预设+用户自建的，这样用户选分类时能看到所有选项。
 *
 * 合并规则：
 * 1. 预设分类保持不变（深拷贝，防止修改原始数据）
 * 2. 用户创建的一级分类（parentKey = null）追加到列表末尾
 * 3. 用户创建的二级分类（parentKey 有值）追加到对应一级分类的 children 中
 * 4. 如果用户创建了预设分类下的二级分类，直接加到该预设分类的 children 里
 *
 * @param presets - 预设分类列表（PRIMARY_CATEGORIES 或 INCOME_CATEGORIES）
 * @param userCategories - 用户自定义分类列表（从数据库读取）
 * @returns 合并后的完整分类列表
 */
export function mergeCategories(
  presets: PrimaryCategory[],
  userCategories: UserCategory[]
): PrimaryCategory[] {
  // 深拷贝预设分类——不能直接修改原始数组，否则会影响其他引用它的地方
  const merged: PrimaryCategory[] = presets.map(p => ({
    ...p,
    children: [...p.children]
  }))

  // 步骤 1：处理用户创建的一级分类（parentKey 为 null 的）
  // 这类分类是用户自创的大类，不在预置列表中，需要作为新条目追加
  const primaryUserCats = userCategories.filter(c => c.parentKey === null)
  for (const uc of primaryUserCats) {
    merged.push({
      key: uc.key,
      label: uc.label,
      icon: uc.icon,
      children: []  // 新创建的大类暂时没有小类，后续步骤会填充
    })
  }

  // 步骤 2：处理用户创建的二级分类（parentKey 不为 null 的）
  // 这类分类是"挂在某个大类下面的小类"，需要找到对应的大类并插入
  const secondaryUserCats = userCategories.filter(c => c.parentKey !== null)
  for (const uc of secondaryUserCats) {
    // 在已合并的列表中找对应的一级分类（可能是预设的，也可能是步骤 1 刚加的）
    const primary = merged.find(p => p.key === uc.parentKey)
    if (primary) {
      primary.children.push({
        key: uc.key,
        label: uc.label,
        description: `自定义：${uc.label}`  // 标记为自定义，区别于预设分类
      })
    }
    // 如果找不到对应的一级分类（理论上不应该出现），就跳过错位的子分类
  }

  return merged
}

/**
 * 判断一个分类 key 是否属于用户自定义的
 *
 * 规则很简单：以 "user_" 开头的就是用户自定义的，否则是预设的。
 * 这个约定在 database.ts 的 addUserCategory 中生成 key 时确立，
 * 在 ipc-handlers.ts 的 category:update/delete 中用来做权限保护。
 *
 * @param key - 分类 key
 * @returns true = 用户创建的，false = 系统预设的
 */
export function isUserCategoryKey(key: string): boolean {
  return key.startsWith('user_')
}

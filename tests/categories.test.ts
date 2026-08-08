/**
 * 分类查询函数 单元测试
 * 测试 src/shared/categories.ts 中的所有工具函数
 */
import { describe, it, expect } from 'vitest'
import {
  getCategoriesByType,
  getPrimaryCategory,
  getSubCategory,
  getCategoryColor,
  getCategoryColorByType,
  getCategoryDisplay,
  mergeCategories,
  isUserCategoryKey,
  PRIMARY_CATEGORIES,
  INCOME_CATEGORIES,
  PAYMENT_METHODS,
} from '../src/shared/categories'

// ============ getCategoriesByType ============

describe('getCategoriesByType', () => {
  it('传入 expense 应该返回支出 10 大类', () => {
    const result = getCategoriesByType('expense')
    expect(result).toHaveLength(10)
    expect(result[0].label).toBe('餐饮饮食')
  })

  it('传入 income 应该返回收入 5 大类', () => {
    const result = getCategoriesByType('income')
    expect(result).toHaveLength(5)
    expect(result[0].label).toBe('工资薪金')
  })

  it('支出和收入是两组不同的数据', () => {
    const expenseResult = getCategoriesByType('expense')
    const incomeResult = getCategoriesByType('income')
    expect(expenseResult[0].key).not.toBe(incomeResult[0].key)
  })
})

// ============ getPrimaryCategory ============

describe('getPrimaryCategory', () => {
  it('查找支出分类 food → 返回"餐饮饮食"', () => {
    const result = getPrimaryCategory('food')
    expect(result).toBeDefined()
    expect(result!.label).toBe('餐饮饮食')
    expect(result!.icon).toBe('🍽️')
  })

  it('查找支出分类 housing → 返回"住房物业"', () => {
    const result = getPrimaryCategory('housing')
    expect(result).toBeDefined()
    expect(result!.label).toBe('住房物业')
  })

  it('查找收入分类 salary → 返回"工资薪金"', () => {
    const result = getPrimaryCategory('salary')
    expect(result).toBeDefined()
    expect(result!.label).toBe('工资薪金')
  })

  it('查找不存在的分类 → 返回 undefined', () => {
    const result = getPrimaryCategory('nonexistent_key')
    expect(result).toBeUndefined()
  })

  it('空字符串 → 返回 undefined', () => {
    const result = getPrimaryCategory('')
    expect(result).toBeUndefined()
  })
})

// ============ getSubCategory ============

describe('getSubCategory', () => {
  it('查找 food > takeout → 返回"外卖外送"', () => {
    const result = getSubCategory('food', 'takeout')
    expect(result).toBeDefined()
    expect(result!.primary.label).toBe('餐饮饮食')
    expect(result!.sub.label).toBe('外卖外送')
  })

  it('查找 healthcare > medicine → 返回"药品购买"', () => {
    const result = getSubCategory('healthcare', 'medicine')
    expect(result).toBeDefined()
    expect(result!.sub.label).toBe('药品购买')
  })

  it('二级分类不存在 → 返回 undefined', () => {
    const result = getSubCategory('food', 'nonexistent_sub')
    expect(result).toBeUndefined()
  })

  it('一级分类不存在 → 返回 undefined', () => {
    const result = getSubCategory('nonexistent', 'takeout')
    expect(result).toBeUndefined()
  })

  it('查找收入分类 salary > monthly_salary → 返回"月薪"', () => {
    const result = getSubCategory('salary', 'monthly_salary')
    expect(result).toBeDefined()
    expect(result!.sub.label).toBe('月薪')
  })
})

// ============ getCategoryColor ============

describe('getCategoryColor', () => {
  it('food 返回橙色 #F97316', () => {
    expect(getCategoryColor('food')).toBe('#F97316')
  })

  it('transport 返回蓝色 #3B82F6', () => {
    expect(getCategoryColor('transport')).toBe('#3B82F6')
  })

  it('healthcare 返回红色 #EF4444', () => {
    expect(getCategoryColor('healthcare')).toBe('#EF4444')
  })

  it('不存在的分类 → 返回默认灰色 #6B7280', () => {
    expect(getCategoryColor('unknown_key')).toBe('#6B7280')
  })

  it('所有 10 个支出分类都有颜色', () => {
    for (const cat of PRIMARY_CATEGORIES) {
      const color = getCategoryColor(cat.key)
      expect(color).toBeDefined()
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/)
    }
  })
})

// ============ getCategoryColorByType ============

describe('getCategoryColorByType', () => {
  it('支出分类 food → 和 getCategoryColor 返回一样', () => {
    expect(getCategoryColorByType('expense', 'food')).toBe(getCategoryColor('food'))
  })

  it('收入分类 salary → 返回绿色 #059669', () => {
    expect(getCategoryColorByType('income', 'salary')).toBe('#059669')
  })

  it('收入分类 transfer_in → 返回紫色 #7C3AED', () => {
    expect(getCategoryColorByType('income', 'transfer_in')).toBe('#7C3AED')
  })

  it('未知收入分类 → 返回默认灰色', () => {
    expect(getCategoryColorByType('income', 'unknown')).toBe('#6B7280')
  })
})

// ============ getCategoryDisplay ============

describe('getCategoryDisplay', () => {
  it('food > takeout → 显示"餐饮饮食 > 外卖外送"', () => {
    const result = getCategoryDisplay('food', 'takeout')
    expect(result).toBe('餐饮饮食 > 外卖外送')
  })

  it('transport > public_transit → 显示"交通出行 > 公共交通"', () => {
    const result = getCategoryDisplay('transport', 'public_transit')
    expect(result).toBe('交通出行 > 公共交通')
  })

  it('不存在的分类 → 显示"未知分类"', () => {
    const result = getCategoryDisplay('xxx', 'yyy')
    expect(result).toBe('未知分类')
  })

  it('传入用户自定义分类 → 正确显示', () => {
    const userCats = [
      {
        id: '1', type: 'expense' as const,
        parentKey: null, key: 'user_abc', label: '我的自定义', icon: '⭐',
        createdAt: '2026-01-01'
      },
      {
        id: '2', type: 'expense' as const,
        parentKey: 'user_abc', key: 'user_abc_sub', label: '子分类', icon: '📋',
        createdAt: '2026-01-01'
      }
    ]
    const result = getCategoryDisplay('user_abc', 'user_abc_sub', userCats)
    expect(result).toBe('我的自定义 > 子分类')
  })
})

// ============ mergeCategories ============

describe('mergeCategories', () => {
  it('没有用户分类时 → 返回完整预设（不丢失数据）', () => {
    const result = mergeCategories(PRIMARY_CATEGORIES, [])
    expect(result).toHaveLength(10)
  })

  it('合并一个新的一级分类', () => {
    const userCats = [
      {
        id: '1', type: 'expense' as const,
        parentKey: null, key: 'user_hobby', label: '兴趣爱好', icon: '🎨',
        createdAt: '2026-01-01'
      }
    ]
    const result = mergeCategories(PRIMARY_CATEGORIES, userCats)
    // 10 个预设 + 1 个用户自定义 = 11 个
    expect(result).toHaveLength(11)
    const hobby = result.find(c => c.key === 'user_hobby')
    expect(hobby).toBeDefined()
    expect(hobby!.label).toBe('兴趣爱好')
    expect(hobby!.children).toEqual([])
  })

  it('在已有预设分类下添加二级分类', () => {
    const userCats = [
      {
        id: '1', type: 'expense' as const,
        parentKey: 'food', key: 'user_coffee', label: '精品咖啡', icon: '☕',
        createdAt: '2026-01-01'
      }
    ]
    const result = mergeCategories(PRIMARY_CATEGORIES, userCats)
    const food = result.find(c => c.key === 'food')
    expect(food).toBeDefined()
    // 原来 4 个 + 1 个用户自定义 = 5 个
    expect(food!.children.length).toBeGreaterThanOrEqual(5)
    const coffee = food!.children.find(s => s.key === 'user_coffee')
    expect(coffee).toBeDefined()
    expect(coffee!.label).toBe('精品咖啡')
  })

  it('在用户自定义一级分类下添加二级分类', () => {
    const userCats = [
      {
        id: '1', type: 'expense' as const,
        parentKey: null, key: 'user_hobby', label: '兴趣爱好', icon: '🎨',
        createdAt: '2026-01-01'
      },
      {
        id: '2', type: 'expense' as const,
        parentKey: 'user_hobby', key: 'user_painting', label: '绘画', icon: '🖌️',
        createdAt: '2026-01-02'
      }
    ]
    const result = mergeCategories(PRIMARY_CATEGORIES, userCats)
    const hobby = result.find(c => c.key === 'user_hobby')
    expect(hobby).toBeDefined()
    expect(hobby!.children).toHaveLength(1)
    expect(hobby!.children[0].label).toBe('绘画')
  })

  it('合并收入分类', () => {
    const userCats = [
      {
        id: '1', type: 'income' as const,
        parentKey: null, key: 'user_lucky', label: '意外之财', icon: '🍀',
        createdAt: '2026-01-01'
      }
    ]
    const result = mergeCategories(INCOME_CATEGORIES, userCats)
    expect(result).toHaveLength(6) // 5 预设 + 1 用户 = 6
  })
})

// ============ isUserCategoryKey ============

describe('isUserCategoryKey', () => {
  it('user_ 开头的 key → true', () => {
    expect(isUserCategoryKey('user_abc123')).toBe(true)
  })

  it('普通 key → false', () => {
    expect(isUserCategoryKey('food')).toBe(false)
    expect(isUserCategoryKey('transport')).toBe(false)
  })

  it('空字符串 → false', () => {
    expect(isUserCategoryKey('')).toBe(false)
  })

  it('包含 user_ 但不以它开头 → false', () => {
    expect(isUserCategoryKey('my_user_key')).toBe(false)
  })
})

// ============ 数据完整性检查 ============

describe('数据完整性', () => {
  it('支出共有 10 个一级分类', () => {
    expect(PRIMARY_CATEGORIES).toHaveLength(10)
  })

  it('每个支出一级分类至少有 3 个二级分类', () => {
    for (const cat of PRIMARY_CATEGORIES) {
      expect(cat.children.length).toBeGreaterThanOrEqual(3)
    }
  })

  it('收入共有 5 个一级分类', () => {
    expect(INCOME_CATEGORIES).toHaveLength(5)
  })

  it('共有 5 种支付方式', () => {
    expect(PAYMENT_METHODS).toHaveLength(5)
  })

  it('所有支付方式都有 key、label、icon', () => {
    for (const pm of PAYMENT_METHODS) {
      expect(pm.key).toBeDefined()
      expect(pm.label).toBeDefined()
      expect(pm.icon).toBeDefined()
    }
  })

  it('所有二级分类 key 不重复', () => {
    const allKeys: string[] = []
    for (const cat of [...PRIMARY_CATEGORIES, ...INCOME_CATEGORIES]) {
      for (const sub of cat.children) {
        allKeys.push(sub.key)
      }
    }
    const uniqueKeys = new Set(allKeys)
    expect(uniqueKeys.size).toBe(allKeys.length)
  })
})

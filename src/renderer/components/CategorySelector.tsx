import React from 'react'
import { getCategoriesByType, getCategoryColorByType } from '../../shared/categories'
import type { PrimaryCategory, RecordType } from '../../shared/types'

interface CategorySelectorProps {
  recordType: RecordType
  primaryKey: string
  secondaryKey: string
  onPrimaryChange: (key: string) => void
  onSecondaryChange: (key: string) => void
  /** 可选：获取合并后分类列表的函数，不传则只用预设 */
  getCategories?: (type: RecordType) => PrimaryCategory[]
}

/**
 * 两级分类选择器
 * 根据 recordType（支出/收入）显示不同的分类列表
 */
const CategorySelector: React.FC<CategorySelectorProps> = ({
  recordType,
  primaryKey,
  secondaryKey,
  onPrimaryChange,
  onSecondaryChange,
  getCategories
}) => {
  const categories = getCategories ? getCategories(recordType) : getCategoriesByType(recordType)
  const selectedPrimary = categories.find(c => c.key === primaryKey)

  const handlePrimaryClick = (category: PrimaryCategory) => {
    onPrimaryChange(category.key)
    // 有子分类时自动选第一个，没有则传空字符串（用户需手动选小类）
    onSecondaryChange(category.children[0]?.key || '')
  }

  return (
    <div className="category-selector">
      <div className="category-section">
        <label className="section-label">选择分类</label>
        <div className="primary-grid">
          {categories.map(cat => (
            <button
              key={cat.key}
              className={`category-chip ${primaryKey === cat.key ? 'active' : ''}`}
              onClick={() => handlePrimaryClick(cat)}
              title={cat.label}
              style={{ '--cat-color': getCategoryColorByType(recordType, cat.key) } as React.CSSProperties}
            >
              <span className="chip-icon">{cat.icon}</span>
              <span className="chip-label">{cat.label}</span>
              <span className="chip-dot" style={{ backgroundColor: getCategoryColorByType(recordType, cat.key) }} />
            </button>
          ))}
        </div>
      </div>

      {selectedPrimary && (
        <div className="category-section">
          <label className="section-label">
            {selectedPrimary.icon} {selectedPrimary.label} 小类
          </label>
          <div className="secondary-row">
            {selectedPrimary.children.map(sub => (
              <button
                key={sub.key}
                className={`sub-chip ${secondaryKey === sub.key ? 'active' : ''}`}
                onClick={() => onSecondaryChange(sub.key)}
              >
                {sub.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {primaryKey && secondaryKey && (
        <div className="selected-category-display">
          已选：<strong>{selectedPrimary?.label} &gt; {selectedPrimary?.children.find(s => s.key === secondaryKey)?.label}</strong>
        </div>
      )}
    </div>
  )
}

export default CategorySelector

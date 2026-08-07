import React, { useState, useMemo } from 'react'
import type { ExpenseRecord, UserCategory } from '../../shared/types'
import { getCategoryColorByType, PRIMARY_CATEGORIES, INCOME_CATEGORIES, mergeCategories } from '../../shared/categories'
import ConfirmDialog from './ConfirmDialog'

interface ExpenseListProps {
  records: ExpenseRecord[]
  formatAmount: (cents: number) => string
  onEdit: (record: ExpenseRecord) => void
  onDelete: (id: string) => void
  onRefresh: () => void
  userCategories?: UserCategory[]
}

const ExpenseList: React.FC<ExpenseListProps> = ({ records, formatAmount, onEdit, onDelete, onRefresh, userCategories = [] }) => {
  // 筛选：null=全部, 'expense'=仅支出, 'income'=仅收入, string=一级分类key
  const [filterType, setFilterType] = useState<string | null>(null)
  const [filterPrimary, setFilterPrimary] = useState<string | null>(null)
  const [filterSecondary, setFilterSecondary] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  // 筛选
  const filteredRecords = useMemo(() => {
    let result = records
    if (filterType) result = result.filter(r => r.type === filterType)
    if (filterPrimary) {
      result = result.filter(r => r.primaryCategory === filterPrimary)
      if (filterSecondary) result = result.filter(r => r.secondaryCategory === filterSecondary)
    }
    return result
  }, [records, filterType, filterPrimary, filterSecondary])

  const groupedByDate = groupByDate(filteredRecords)
  const filteredTotal = useMemo(() => filteredRecords.reduce((sum, r) => sum + r.amount, 0), [filteredRecords])

  // 合并后的分类（按类型分开）
  const mergedExpenseCats = useMemo(
    () => mergeCategories(PRIMARY_CATEGORIES, userCategories.filter(c => c.type === 'expense')),
    [userCategories]
  )
  const mergedIncomeCats = useMemo(
    () => mergeCategories(INCOME_CATEGORIES, userCategories.filter(c => c.type === 'income')),
    [userCategories]
  )

  // 第二行分类筛选：根据 filterType 显示对应的分类
  const visibleCategories = useMemo(() => {
    if (filterType === 'expense') return mergedExpenseCats
    if (filterType === 'income') return mergedIncomeCats
    return [...mergedExpenseCats, ...mergedIncomeCats]
  }, [filterType, mergedExpenseCats, mergedIncomeCats])

  const selectedPrimary = filterPrimary ? visibleCategories.find(c => c.key === filterPrimary) : null

  const handlePrimaryFilter = (key: string | null) => { setFilterPrimary(key); setFilterSecondary(null) }

  const handleTypeFilter = (type: string | null) => {
    setFilterType(type)
    // 切换类型时，如果当前选中的一级分类不在新类型中，重置
    if (filterPrimary) {
      const cats = type === 'expense' ? mergedExpenseCats : type === 'income' ? mergedIncomeCats : [...mergedExpenseCats, ...mergedIncomeCats]
      if (!cats.find(c => c.key === filterPrimary)) {
        setFilterPrimary(null)
        setFilterSecondary(null)
      }
    }
  }

  const handleDeleteClick = (id: string) => setDeleteTarget(id)
  const handleDeleteConfirm = () => { if (deleteTarget) { onDelete(deleteTarget) } setDeleteTarget(null) }

  // 收支汇总
  const expenseTotal = filteredRecords.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0)
  const incomeTotal = filteredRecords.filter(r => r.type === 'income').reduce((s, r) => s + r.amount, 0)

  // 合并所有分类（仅用于显示查找）
  const allMergedForDisplay = useMemo(
    () => [...mergedExpenseCats, ...mergedIncomeCats],
    [mergedExpenseCats, mergedIncomeCats]
  )

  // 分类显示：搜索合并后的分类列表
  const getDisplaySafe = (primaryKey: string, subKey: string): string => {
    const primary = allMergedForDisplay.find(c => c.key === primaryKey)
    if (primary) {
      const sub = primary.children.find(s => s.key === subKey)
      // 有二级分类就显示 "一级 > 二级"，没有就只显示一级名称
      return sub ? `${primary.label} > ${sub.label}` : primary.label
    }
    // 兜底：直接搜用户分类
    const userPri = userCategories.find(c => c.parentKey === null && c.key === primaryKey)
    if (userPri) {
      const userSub = userCategories.find(c => c.parentKey === primaryKey && c.key === subKey)
      return userSub ? `${userPri.label} > ${userSub.label}` : userPri.label
    }
    return '未知分类'
  }

  return (
    <div className="expense-list">
      {/* 收支类型筛选 */}
      <div className="filter-bar">
        <div className="filter-scroll">
          <button className={`filter-chip ${!filterType ? 'active' : ''}`} onClick={() => handleTypeFilter(null)}>全部</button>
          <button className={`filter-chip expense-filter ${filterType === 'expense' ? 'active' : ''}`} onClick={() => handleTypeFilter('expense')}>💸 支出</button>
          <button className={`filter-chip income-filter ${filterType === 'income' ? 'active' : ''}`} onClick={() => handleTypeFilter('income')}>💰 收入</button>
        </div>
      </div>

      {/* 分类筛选 */}
      <div className="filter-bar">
        <div className="filter-scroll">
          <button className={`filter-chip ${!filterPrimary ? 'active' : ''}`} onClick={() => handlePrimaryFilter(null)}>全部分类</button>
          {visibleCategories.map(cat => (
            <button key={cat.key} className={`filter-chip ${filterPrimary === cat.key ? 'active' : ''}`} onClick={() => handlePrimaryFilter(cat.key)}>
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>
        {selectedPrimary && (
          <div className="filter-scroll sub-filter">
            <button className={`filter-chip-sm ${!filterSecondary ? 'active' : ''}`} onClick={() => setFilterSecondary(null)}>全部{selectedPrimary.label}</button>
            {selectedPrimary.children.map(sub => (
              <button key={sub.key} className={`filter-chip-sm ${filterSecondary === sub.key ? 'active' : ''}`} onClick={() => setFilterSecondary(sub.key)}>{sub.label}</button>
            ))}
          </div>
        )}
      </div>

      {/* 筛选汇总 */}
      {(filterType || filterPrimary) && (
        <div className="filter-summary">
          筛选：<strong>{filteredRecords.length}</strong> 笔
          {filterType !== 'income' && <> · 支出 <strong>{formatAmount(expenseTotal)}</strong></>}
          {filterType !== 'expense' && <> · 收入 <strong style={{color:'#059669'}}>{formatAmount(incomeTotal)}</strong></>}
        </div>
      )}

      {/* 列表 */}
      {filteredRecords.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">{filterPrimary || filterType ? '🔍' : '📭'}</div>
          <p className="empty-title">{filterPrimary || filterType ? '没有符合条件的记录' : '还没有记账记录'}</p>
          <p className="empty-hint">{filterPrimary || filterType ? '换个条件试试' : '去首页记一笔吧！'}</p>
        </div>
      ) : (
        Object.entries(groupedByDate).map(([date, items]) => (
          <div key={date} className="date-group">
            <div className="date-header">
              <span className="date-text">{formatDateHeader(date)}</span>
              <span className="date-total">共 {items.length} 笔</span>
            </div>
            {items.map(record => {
              const isIncome = record.type === 'income'
              return (
                <div key={record.id} className={`expense-item ${isIncome ? 'income-item' : ''}`} onClick={() => onEdit(record)}>
                  <div className="item-dot" style={{ backgroundColor: getCategoryColorByType(record.type, record.primaryCategory) }} />
                  <div className="item-left">
                    <span className="item-category">
                      {getDisplaySafe(record.primaryCategory, record.secondaryCategory)}
                    </span>
                    {record.note && <span className="item-note">{record.note}</span>}
                  </div>
                  <div className="item-right">
                    <span className={`item-amount ${isIncome ? 'income-amount' : ''}`}>
                      {isIncome ? '+' : '-'}{formatAmount(record.amount)}
                    </span>
                    <button className="item-delete" onClick={(e) => { e.stopPropagation(); handleDeleteClick(record.id) }} title="删除">🗑️</button>
                  </div>
                </div>
              )
            })}
          </div>
        ))
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="确认删除"
          message="删除后无法恢复，确定要删除这笔记录吗？"
          confirmText="删除" cancelText="保留"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
          danger
        />
      )}
    </div>
  )
}

function groupByDate(records: ExpenseRecord[]): Record<string, ExpenseRecord[]> {
  const groups: Record<string, ExpenseRecord[]> = {}
  for (const r of records) {
    if (!groups[r.date]) groups[r.date] = []
    groups[r.date].push(r)
  }
  return groups
}

function formatDateHeader(dateStr: string): string {
  const today = getTodayStr()
  const yesterday = getYesterdayStr()
  if (dateStr === today) return '今天'
  if (dateStr === yesterday) return '昨天'
  const [y, m, d] = dateStr.split('-')
  return `${y}年${parseInt(m)}月${parseInt(d)}日`
}
function getTodayStr(): string { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}` }
function getYesterdayStr(): string { const y = new Date(Date.now()-86400000); return `${y.getFullYear()}-${String(y.getMonth()+1).padStart(2,'0')}-${String(y.getDate()).padStart(2,'0')}` }

export default ExpenseList

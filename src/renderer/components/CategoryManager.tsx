import React, { useState } from 'react'
import { Plus, Pencil, Trash2, Lock, X, Check, ListPlus } from 'lucide-react'
import { PRIMARY_CATEGORIES, INCOME_CATEGORIES } from '../../shared/categories'
import ConfirmDialog from './ConfirmDialog'
import type { UserCategory, CreateUserCategoryInput, RecordType, PrimaryCategory } from '../../shared/types'

// 常用 emoji 供用户选择
const EMOJI_OPTIONS = ['🍽️', '🚗', '🛒', '🏠', '🎮', '💊', '📚', '🎁', '💰', '📦',
  '🐱', '🐶', '🌱', '☕', '🍰', '✈️', '📱', '💄', '🎓', '⚽',
  '🎵', '🎬', '🧘', '💻', '🔧', '👶', '💍', '🎉', '📷', '🏥']

interface CategoryManagerProps {
  expenseUserCats: UserCategory[]
  incomeUserCats: UserCategory[]
  onAdd: (input: CreateUserCategoryInput) => Promise<UserCategory | null>
  onUpdate: (id: string, input: { label?: string; icon?: string }) => Promise<UserCategory | null>
  onDelete: (id: string) => Promise<boolean>
  onClose: () => void
}

type FormMode = 'closed'
  | { mode: 'add'; presetType: RecordType; presetLevel: 'primary' | 'secondary'; presetParentKey: string }
  | { mode: 'edit'; cat: UserCategory }

const CategoryManager: React.FC<CategoryManagerProps> = ({
  expenseUserCats, incomeUserCats, onAdd, onUpdate, onDelete, onClose
}) => {
  const [form, setForm] = useState<FormMode>('closed')
  const [deleteTarget, setDeleteTarget] = useState<UserCategory | null>(null)

  // 表单字段
  const [formType, setFormType] = useState<RecordType>('expense')
  const [formLevel, setFormLevel] = useState<'primary' | 'secondary'>('primary')
  const [formParentKey, setFormParentKey] = useState('')
  const [formLabel, setFormLabel] = useState('')
  const [formIcon, setFormIcon] = useState('📋')
  const [formError, setFormError] = useState('')

  // 打开新增一级分类表单
  const handleOpenAddPrimary = () => {
    setFormType('expense')
    setFormLevel('primary')
    setFormParentKey('')
    setFormLabel('')
    setFormIcon('📋')
    setFormError('')
    setForm({ mode: 'add', presetType: 'expense', presetLevel: 'primary', presetParentKey: '' })
  }

  // 打开新增二级分类表单（预填父分类）
  const handleOpenAddSecondary = (type: RecordType, parentKey: string) => {
    setFormType(type)
    setFormLevel('secondary')
    setFormParentKey(parentKey)
    setFormLabel('')
    setFormIcon('📋')
    setFormError('')
    setForm({ mode: 'add', presetType: type, presetLevel: 'secondary', presetParentKey: parentKey })
  }

  // 打开编辑表单
  const handleOpenEdit = (cat: UserCategory) => {
    setFormType(cat.type)
    setFormLevel(cat.parentKey ? 'secondary' : 'primary')
    setFormParentKey(cat.parentKey || '')
    setFormLabel(cat.label)
    setFormIcon(cat.icon)
    setFormError('')
    setForm({ mode: 'edit', cat })
  }

  const handleSubmit = async () => {
    if (!formLabel.trim()) { setFormError('请输入分类名称'); return }
    if (formLevel === 'secondary' && !formParentKey) { setFormError('请选择所属一级分类'); return }

    if (form.mode === 'add' || form.mode === 'edit') {
      if (form.mode === 'add') {
        const input: CreateUserCategoryInput = {
          type: formType,
          label: formLabel.trim(),
          icon: formIcon
        }
        if (formLevel === 'secondary') {
          input.parentKey = formParentKey
        }
        const result = await onAdd(input)
        if (result) setForm('closed')
      } else if (form.mode === 'edit') {
        const result = await onUpdate(form.cat.id, { label: formLabel.trim(), icon: formIcon })
        if (result) setForm('closed')
      }
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    await onDelete(deleteTarget.id)
    setDeleteTarget(null)
  }

  // 渲染一个一级分类卡片（包含其下所有二级分类）
  const renderPrimaryCard = (
    primary: PrimaryCategory | { key: string; label: string; icon: string; children: { key: string; label: string }[] },
    isPreset: boolean,
    type: RecordType,
    userSubCats: UserCategory[]
  ) => {
    const isUserPrimary = 'id' in primary
    return (
      <div key={primary.key} className="cm-card">
        {/* 一级分类头部 */}
        <div className={`cm-card-header ${isPreset ? 'preset' : 'user'}`}>
          <span className="cm-card-icon">{primary.icon}</span>
          <span className="cm-card-label">{primary.label}</span>
          {isPreset ? (
            <Lock size={12} className="cm-lock-icon" title="预置分类，不可修改" />
          ) : (
            <div className="cm-card-actions">
              <button className="cm-action-btn edit" onClick={() => handleOpenEdit(primary as any)} title="编辑"><Pencil size={14} /></button>
              <button className="cm-action-btn delete" onClick={() => setDeleteTarget(primary as any)} title="删除"><Trash2 size={14} /></button>
            </div>
          )}
        </div>

        {/* 二级分类列表 */}
        <div className="cm-sub-list">
          {/* 预置的二级分类（仅预设一级分类下才有） */}
          {'children' in primary && primary.children.map(sub => {
            // 检查是否已被用户自定义覆盖（暂不处理）
            return (
              <div key={sub.key} className="cm-sub-row preset">
                <span className="cm-sub-label">{sub.label}</span>
                <Lock size={10} className="cm-lock-icon" title="预置分类，不可修改" />
              </div>
            )
          })}

          {/* 用户创建的二级分类（属于此一级分类） */}
          {userSubCats.filter(s => s.parentKey === primary.key).map(sub => (
            <div key={sub.id} className="cm-sub-row user">
              <span className="cm-sub-icon">{sub.icon}</span>
              <span className="cm-sub-label">{sub.label}</span>
              <button className="cm-action-btn edit" onClick={() => handleOpenEdit(sub)} title="编辑"><Pencil size={14} /></button>
              <button className="cm-action-btn delete" onClick={() => setDeleteTarget(sub)} title="删除"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>

        {/* 添加二级分类按钮 */}
        <button
          className="cm-add-sub-btn"
          onClick={() => handleOpenAddSecondary(type, primary.key)}
        >
          <ListPlus size={14} /> 添加小类
        </button>
      </div>
    )
  }

  // 渲染一个收支类型下的所有分类
  const renderCategorySection = (title: string, type: RecordType, userCats: UserCategory[]) => {
    const presets = type === 'expense' ? PRIMARY_CATEGORIES : INCOME_CATEGORIES
    const userPrimaries = userCats.filter(c => c.parentKey === null)

    return (
      <div className="cm-section">
        <h5 className="cm-section-title">{title}</h5>

        {/* 预置一级分类（含其下二级） */}
        {presets.map(cat => {
          const subCats = userCats.filter(c => c.parentKey === cat.key)
          return renderPrimaryCard(cat, true, type, subCats)
        })}

        {/* 用户创建的一级分类（含其下二级） */}
        {userPrimaries.map(cat => {
          const subCats = userCats.filter(c => c.parentKey === cat.key)
          return renderPrimaryCard(
            { key: cat.key, label: cat.label, icon: cat.icon, children: [] } as any,
            false, type, subCats
          )
        })}
      </div>
    )
  }

  return (
    <div className="category-manager">
      <div className="cm-header">
        <h3 className="cm-title">📂 分类管理</h3>
        <button className="cm-close-btn" onClick={onClose}><X size={18} /></button>
      </div>

      <div className="cm-body">
        {renderCategorySection('💰 支出分类', 'expense', expenseUserCats)}
        {renderCategorySection('📈 收入分类', 'income', incomeUserCats)}
      </div>

      <div className="cm-footer">
        <button className="cm-add-btn" onClick={handleOpenAddPrimary}>
          <Plus size={16} /> 新增一级分类
        </button>
      </div>

      {/* 新增/编辑表单 */}
      {form !== 'closed' && (
        <div className="cm-form-overlay" onClick={() => setForm('closed')}>
          <div className="cm-form" onClick={e => e.stopPropagation()}>
            <h4 className="cm-form-title">
              {form.mode === 'add'
                ? (formLevel === 'secondary' ? '添加二级分类' : '新增一级分类')
                : '编辑分类'}
            </h4>

            {/* 类型选择（仅新增一级分类时可选） */}
            {form.mode === 'add' && formLevel === 'primary' && (
              <div className="cm-form-row">
                <label className="cm-form-label">类型</label>
                <div className="cm-type-toggle">
                  <button
                    className={`cm-type-btn expense ${formType === 'expense' ? 'active' : ''}`}
                    onClick={() => setFormType('expense')}
                  >💰 支出</button>
                  <button
                    className={`cm-type-btn income ${formType === 'income' ? 'active' : ''}`}
                    onClick={() => setFormType('income')}
                  >📈 收入</button>
                </div>
              </div>
            )}

            {/* 所属一级分类（新增二级时显示，不可改；编辑时显示但不改） */}
            {formLevel === 'secondary' && formParentKey && (
              <div className="cm-form-row">
                <label className="cm-form-label">所属一级分类</label>
                <div className="cm-parent-display">
                  {getParentName(formType, formParentKey)}
                </div>
              </div>
            )}

            {/* 名称输入 */}
            <div className="cm-form-row">
              <label className="cm-form-label">分类名称</label>
              <input
                type="text"
                className="cm-form-input"
                placeholder={formLevel === 'primary' ? '例如：宠物、美妆' : '例如：烘焙甜点、猫咪用品'}
                value={formLabel}
                onChange={e => setFormLabel(e.target.value)}
                maxLength={10}
                autoFocus
              />
            </div>

            {/* 图标选择 */}
            <div className="cm-form-row">
              <label className="cm-form-label">图标</label>
              <div className="cm-emoji-grid">
                {EMOJI_OPTIONS.map(emoji => (
                  <button
                    key={emoji}
                    className={`cm-emoji-btn ${formIcon === emoji ? 'active' : ''}`}
                    onClick={() => setFormIcon(emoji)}
                  >{emoji}</button>
                ))}
              </div>
            </div>

            {/* 错误信息 */}
            {formError && <div className="cm-form-error">{formError}</div>}

            {/* 操作按钮 */}
            <div className="cm-form-actions">
              <button className="cm-form-btn cancel" onClick={() => setForm('closed')}>取消</button>
              <button className="cm-form-btn save" onClick={handleSubmit}>
                {form.mode === 'add' ? <Plus size={14} /> : <Check size={14} />}
                {form.mode === 'add' ? '添加' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认 */}
      {deleteTarget && (
        <ConfirmDialog
          title="删除分类"
          message={`确定要删除「${deleteTarget.label}」吗？使用该分类的已有记录不受影响，但以后将无法再选择此分类。${!deleteTarget.parentKey ? '\n\n⚠️ 注意：删除一级分类会同时删除其下所有二级分类。' : ''}`}
          confirmText="确认删除"
          cancelText="取消"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          danger
        />
      )}
    </div>
  )
}

/** 根据类型和 key 查找父分类名称 */
function getParentName(type: RecordType, parentKey: string): string {
  const allPresets = type === 'expense' ? PRIMARY_CATEGORIES : INCOME_CATEGORIES
  const found = allPresets.find(c => c.key === parentKey)
  if (found) return `${found.icon} ${found.label}`
  return parentKey // fallback: 显示 key（用户自建一级分类）
}

export default CategoryManager

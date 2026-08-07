import React, { useState } from 'react'
import { Download, Upload, Trash2, Info, FolderCog, Gamepad2 } from 'lucide-react'
import ConfirmDialog from './ConfirmDialog'
import CategoryManager from './CategoryManager'
import SnakeGame from './SnakeGame'
import type { UserCategory, CreateUserCategoryInput, UpdateUserCategoryInput } from '../../shared/types'

interface SettingsPageProps {
  recordCount: number
  onRefresh: () => void
  userCategories: UserCategory[]
  onAddCategory: (input: CreateUserCategoryInput) => Promise<UserCategory | null>
  onUpdateCategory: (id: string, input: UpdateUserCategoryInput) => Promise<UserCategory | null>
  onDeleteCategory: (id: string) => Promise<boolean>
  onRefreshCategories: () => void
}

const SettingsPage: React.FC<SettingsPageProps> = ({ recordCount, onRefresh, userCategories, onAddCategory, onUpdateCategory, onDeleteCategory, onRefreshCategories }) => {
  const [msg, setMsg] = useState<string | null>(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [showCategoryManager, setShowCategoryManager] = useState(false)
  const [showSnakeGame, setShowSnakeGame] = useState(false)

  const showMsg = (text: string) => { setMsg(text); setTimeout(() => setMsg(null), 4000) }

  const handleExport = async () => {
    const result = await window.electronAPI.exportCsv()
    showMsg(result.success ? `✅ ${result.message}` : `❌ ${result.message}`)
  }

  const handleImport = async () => {
    const result = await window.electronAPI.importCsv()
    showMsg(result.success ? `✅ ${result.message}` : `❌ ${result.message}`)
    if (result.success) onRefresh()
  }

  const handleClearConfirm = async () => {
    setShowClearConfirm(false)
    const count = await window.electronAPI.clearAll()
    showMsg(`✅ 已清空 ${count} 条记录`)
    onRefresh()
  }

  return (
    <div className="settings-page">
      <div className="settings-section">
        <h4 className="section-title-sm">📱 关于</h4>
        <div className="settings-card">
          <div className="setting-row"><span>应用名称</span><span className="setting-value">黑马记账</span></div>
          <div className="setting-row"><span>版本</span><span className="setting-value">1.0.0</span></div>
          <div className="setting-row"><span>记录总数</span><span className="setting-value">{recordCount} 笔</span></div>
        </div>
      </div>

      <div className="settings-section">
        <h4 className="section-title-sm">💾 数据管理</h4>
        <div className="settings-card">
          <button className="setting-action" onClick={handleExport}>
            <span className="action-icon export"><Download size={20} strokeWidth={1.5} /></span>
            <div className="action-text"><span className="action-title">导出数据</span><span className="action-desc">导出所有记录为 CSV 文件</span></div>
            <span className="action-arrow">›</span>
          </button>
          <div className="setting-divider" />
          <button className="setting-action" onClick={handleImport}>
            <span className="action-icon import"><Upload size={20} strokeWidth={1.5} /></span>
            <div className="action-text"><span className="action-title">导入数据</span><span className="action-desc">从 CSV 文件导入记录</span></div>
            <span className="action-arrow">›</span>
          </button>
        </div>
      </div>

      <div className="settings-section">
        <h4 className="section-title-sm">📂 分类管理</h4>
        <div className="settings-card">
          <button className="setting-action" onClick={() => setShowCategoryManager(true)}>
            <span className="action-icon" style={{ backgroundColor: '#EEF2FF' }}><FolderCog size={20} strokeWidth={1.5} /></span>
            <div className="action-text"><span className="action-title">管理分类</span><span className="action-desc">新增、编辑或删除自定义分类（预置分类不可修改）</span></div>
            <span className="action-arrow">›</span>
          </button>
        </div>
      </div>

      <div className="settings-section">
        <h4 className="section-title-sm">🎮 休闲娱乐</h4>
        <div className="settings-card">
          <button className="setting-action" onClick={() => setShowSnakeGame(true)}>
            <span className="action-icon" style={{ backgroundColor: '#ECFDF5' }}><Gamepad2 size={20} strokeWidth={1.5} /></span>
            <div className="action-text"><span className="action-title">贪吃蛇</span><span className="action-desc">经典小游戏，工作累了来一局</span></div>
            <span className="action-arrow">›</span>
          </button>
        </div>
      </div>

      <div className="settings-section">
        <h4 className="section-title-sm">⚠️ 危险操作</h4>
        <div className="settings-card">
          <button className="setting-action danger" onClick={() => setShowClearConfirm(true)}>
            <span className="action-icon danger-icon"><Trash2 size={20} strokeWidth={1.5} /></span>
            <div className="action-text"><span className="action-title" style={{ color: '#EF4444' }}>清空所有数据</span><span className="action-desc">删除全部记账记录，不可恢复</span></div>
            <span className="action-arrow">›</span>
          </button>
        </div>
      </div>

      {msg && <div className={`settings-msg ${msg.startsWith('✅') ? 'success' : 'error'}`}>{msg}</div>}

      {showClearConfirm && (
        <ConfirmDialog title="⚠️ 清空所有数据" message={`确定要删除全部 ${recordCount} 条记账记录吗？此操作不可恢复！`} confirmText="确认清空" cancelText="取消" onConfirm={handleClearConfirm} onCancel={() => setShowClearConfirm(false)} danger />
      )}

      {showCategoryManager && (
        <div className="cm-backdrop" onClick={() => setShowCategoryManager(false)}>
          <div className="cm-wrapper" onClick={e => e.stopPropagation()}>
            <CategoryManager
              expenseUserCats={userCategories.filter(c => c.type === 'expense')}
              incomeUserCats={userCategories.filter(c => c.type === 'income')}
              onAdd={onAddCategory}
              onUpdate={onUpdateCategory}
              onDelete={onDeleteCategory}
              onClose={() => { setShowCategoryManager(false); onRefreshCategories() }}
            />
          </div>
        </div>
      )}

      {showSnakeGame && (
        <SnakeGame onClose={() => setShowSnakeGame(false)} />
      )}
    </div>
  )
}

export default SettingsPage

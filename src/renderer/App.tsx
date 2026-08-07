import React, { useState, useEffect } from 'react'
import { PiggyBank, PenLine, ListFilter, ChartPie, Settings } from 'lucide-react'
import ExpenseForm from './components/ExpenseForm'
import ExpenseList from './components/ExpenseList'
import EditModal from './components/EditModal'
import StatsPage from './components/StatsPage'
import SettingsPage from './components/SettingsPage'
import { useExpenses } from './stores/useExpenses'
import type { CreateExpenseInput, ExpenseRecord } from '../shared/types'

type Tab = 'home' | 'records' | 'stats' | 'settings'

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('home')
  const [editingRecord, setEditingRecord] = useState<ExpenseRecord | null>(null)
  const [monthTotal, setMonthTotal] = useState(0)

  const { records, loading, addExpense, updateExpense, deleteExpense, refreshRecords, formatAmount, getMonthTotal } = useExpenses()

  useEffect(() => {
    const now = new Date()
    getMonthTotal(now.getFullYear(), now.getMonth() + 1).then(setMonthTotal)
  }, [records, getMonthTotal])

  const handleAddExpense = async (data: CreateExpenseInput) => {
    await addExpense(data)
    setActiveTab('records')
  }

  const handleEditSave = (id: string, data: Partial<CreateExpenseInput>) => {
    updateExpense(id, data)
  }

  const now = new Date()
  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1>
            <PiggyBank size={24} strokeWidth={2} />
            黑马记账
          </h1>
          <div className="header-month-total">
            本月支出 <strong>{formatAmount(monthTotal)}</strong>
          </div>
        </div>
      </header>

      <main className="app-main">
        {loading ? (
          <div className="empty-state">
            <div className="empty-icon">⏳</div>
            <p className="empty-title">加载中...</p>
          </div>
        ) : (
          <div className="page-container" key={activeTab}>
            <div className="page-slide-in">
              {activeTab === 'home' && <ExpenseForm onSubmit={handleAddExpense} />}
              {activeTab === 'records' && <ExpenseList records={records} formatAmount={formatAmount} onEdit={setEditingRecord} onDelete={deleteExpense} onRefresh={refreshRecords} />}
              {activeTab === 'stats' && <StatsPage records={records} formatAmount={formatAmount} />}
              {activeTab === 'settings' && <SettingsPage recordCount={records.length} onRefresh={refreshRecords} />}
            </div>
          </div>
        )}
      </main>

      <nav className="app-nav nav-four">
        <button className={`nav-btn ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')}>
          <span className="nav-icon"><PenLine size={20} strokeWidth={activeTab === 'home' ? 2.5 : 2} /></span>
          <span className="nav-label">记账</span>
        </button>
        <button className={`nav-btn ${activeTab === 'records' ? 'active' : ''}`} onClick={() => setActiveTab('records')}>
          <span className="nav-icon"><ListFilter size={20} strokeWidth={activeTab === 'records' ? 2.5 : 2} /></span>
          <span className="nav-label">账单</span>
          {records.length > 0 && <span className="nav-badge">{records.length}</span>}
        </button>
        <button className={`nav-btn ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => setActiveTab('stats')}>
          <span className="nav-icon"><ChartPie size={20} strokeWidth={activeTab === 'stats' ? 2.5 : 2} /></span>
          <span className="nav-label">统计</span>
        </button>
        <button className={`nav-btn ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
          <span className="nav-icon"><Settings size={20} strokeWidth={activeTab === 'settings' ? 2.5 : 2} /></span>
          <span className="nav-label">设置</span>
        </button>
      </nav>

      {editingRecord && (
        <EditModal record={editingRecord} onClose={() => setEditingRecord(null)} onSave={handleEditSave} formatAmount={formatAmount} />
      )}
    </div>
  )
}

export default App

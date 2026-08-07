import React, { useState, useEffect } from 'react'
import { Pencil, ArrowDownCircle, ArrowUpCircle, X } from 'lucide-react'
import CategorySelector from './CategorySelector'
import { PAYMENT_METHODS, getCategoriesByType } from '../../shared/categories'
import type { ExpenseRecord, PaymentMethod, UpdateExpenseInput, RecordType } from '../../shared/types'

interface EditModalProps {
  record: ExpenseRecord
  onClose: () => void
  onSave: (id: string, data: UpdateExpenseInput) => void
  formatAmount: (cents: number) => string
  /** 可选：获取合并后分类列表的函数 */
  getCategories?: (type: import('../../shared/types').RecordType) => import('../../shared/types').PrimaryCategory[]
}

const EditModal: React.FC<EditModalProps> = ({ record, onClose, onSave, formatAmount, getCategories }) => {
  const [recordType, setRecordType] = useState<RecordType>(record.type || 'expense')
  const [amountText, setAmountText] = useState('')
  const [primaryCategory, setPrimaryCategory] = useState(record.primaryCategory)
  const [secondaryCategory, setSecondaryCategory] = useState(record.secondaryCategory)
  const [date, setDate] = useState(record.date)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(record.paymentMethod)
  const [note, setNote] = useState(record.note)

  useEffect(() => { setAmountText((record.amount / 100).toFixed(2)) }, [record])

  const handleTypeChange = (newType: RecordType) => {
    setRecordType(newType)
    const cats = getCategories ? getCategories(newType) : getCategoriesByType(newType)
    setPrimaryCategory(cats[0].key)
    setSecondaryCategory(cats[0].children[0].key)
  }

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value; const cleaned = raw.replace(/[^0-9.]/g, '')
    const parts = cleaned.split('.'); if (parts.length > 2 || (parts[1] && parts[1].length > 2) || parts[0].length > 9) return
    setAmountText(cleaned)
  }

  const handleSave = () => {
    const n = parseFloat(amountText); if (isNaN(n) || n <= 0) return
    onSave(record.id, { type: recordType, amount: Math.round(n * 100), primaryCategory, secondaryCategory, date, paymentMethod, note: note.trim() })
    onClose()
  }

  const handleBackdrop = (e: React.MouseEvent) => { if (e.target === e.currentTarget) onClose() }
  const isAmountValid = amountText !== '' && parseFloat(amountText) > 0

  return (
    <div className="modal-backdrop" onClick={handleBackdrop}>
      <div className="modal-content">
        <div className="modal-header">
          <h3><Pencil size={20} /> 编辑记录</h3>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div className="type-toggle" style={{ marginBottom: 12 }}>
            <button className={`type-btn expense ${recordType === 'expense' ? 'active' : ''}`} onClick={() => handleTypeChange('expense')}>
              <ArrowDownCircle size={18} /> 支出
            </button>
            <button className={`type-btn income ${recordType === 'income' ? 'active' : ''}`} onClick={() => handleTypeChange('income')}>
              <ArrowUpCircle size={18} /> 收入
            </button>
          </div>
          <div className="amount-section">
            <div className="amount-input-wrapper">
              <span className="currency-symbol">{recordType === 'expense' ? '-' : '+'}¥</span>
              <input type="text" inputMode="decimal" className="amount-input" placeholder="0.00" value={amountText} onChange={handleAmountChange} autoFocus />
            </div>
          </div>
          <CategorySelector recordType={recordType} primaryKey={primaryCategory} secondaryKey={secondaryCategory} onPrimaryChange={setPrimaryCategory} onSecondaryChange={setSecondaryCategory} getCategories={getCategories} />
          <div className="form-row"><label className="form-label">📅 日期</label><input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} max={getTodayStr()} /></div>
          <div className="form-row"><label className="form-label">💳 支付方式</label>
            <div className="payment-options">{PAYMENT_METHODS.map(pm => (
              <button key={pm.key} className={`payment-chip ${paymentMethod === pm.key ? 'active' : ''}`} onClick={() => setPaymentMethod(pm.key)}><span className="chip-icon">{pm.icon}</span><span>{pm.label}</span></button>
            ))}</div>
          </div>
          <div className="form-row"><label className="form-label">📝 备注</label><input type="text" className="form-input" placeholder="例如：午饭黄焖鸡" value={note} onChange={e => setNote(e.target.value)} maxLength={200} /></div>
        </div>
        <div className="modal-footer">
          <button className="modal-btn cancel" onClick={onClose}>取消</button>
          <button className={`modal-btn save ${isAmountValid ? 'ready' : ''}`} onClick={handleSave} disabled={!isAmountValid}>保存修改</button>
        </div>
      </div>
    </div>
  )
}

function getTodayStr(): string { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}` }

export default EditModal

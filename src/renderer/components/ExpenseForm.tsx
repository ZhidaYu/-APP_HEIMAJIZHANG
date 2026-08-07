import React, { useState, useCallback } from 'react'
import { ArrowDownCircle, ArrowUpCircle, PlusCircle } from 'lucide-react'
import CategorySelector from './CategorySelector'
import { PAYMENT_METHODS, getCategoriesByType } from '../../shared/categories'
import type { PaymentMethod, CreateExpenseInput, RecordType } from '../../shared/types'

interface ExpenseFormProps {
  onSubmit: (data: CreateExpenseInput) => void
}

const ExpenseForm: React.FC<ExpenseFormProps> = ({ onSubmit }) => {
  const [recordType, setRecordType] = useState<RecordType>('expense')
  const [amountText, setAmountText] = useState('')
  const [primaryCategory, setPrimaryCategory] = useState(getCategoriesByType('expense')[0].key)
  const [secondaryCategory, setSecondaryCategory] = useState(getCategoriesByType('expense')[0].children[0].key)
  const [date, setDate] = useState(getTodayStr())
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('wechat')
  const [note, setNote] = useState('')

  const handleTypeChange = (newType: RecordType) => {
    setRecordType(newType)
    const cats = getCategoriesByType(newType)
    setPrimaryCategory(cats[0].key)
    setSecondaryCategory(cats[0].children[0].key)
  }

  const handleAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    const cleaned = raw.replace(/[^0-9.]/g, '')
    const parts = cleaned.split('.')
    if (parts.length > 2) return
    if (parts[1] && parts[1].length > 2) return
    if (parts[0].length > 9) return
    setAmountText(cleaned)
  }, [])

  const handleSubmit = useCallback(() => {
    const amountNum = parseFloat(amountText)
    if (isNaN(amountNum) || amountNum <= 0) return
    onSubmit({ type: recordType, amount: Math.round(amountNum * 100), primaryCategory, secondaryCategory, date, paymentMethod, note: note.trim() })
    setAmountText('')
    setNote('')
  }, [amountText, recordType, primaryCategory, secondaryCategory, date, paymentMethod, note, onSubmit])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit()
  }, [handleSubmit])

  const isAmountValid = amountText !== '' && parseFloat(amountText) > 0

  return (
    <div className="expense-form" onKeyDown={handleKeyDown}>
      <div className="type-toggle">
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
        <div className="amount-hint">
          {amountText && !isNaN(parseFloat(amountText))
            ? `${recordType === 'expense' ? '支出' : '收入'} ￥${parseFloat(amountText).toFixed(2)}`
            : `请输入${recordType === 'expense' ? '支出' : '收入'}金额`}
        </div>
      </div>

      <CategorySelector recordType={recordType} primaryKey={primaryCategory} secondaryKey={secondaryCategory} onPrimaryChange={setPrimaryCategory} onSecondaryChange={setSecondaryCategory} />

      <div className="form-row">
        <label className="form-label">📅 日期</label>
        <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} max={getTodayStr()} />
      </div>

      <div className="form-row">
        <label className="form-label">💳 支付方式</label>
        <div className="payment-options">
          {PAYMENT_METHODS.map(pm => (
            <button key={pm.key} className={`payment-chip ${paymentMethod === pm.key ? 'active' : ''}`} onClick={() => setPaymentMethod(pm.key)}>
              <span className="chip-icon">{pm.icon}</span><span>{pm.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="form-row">
        <label className="form-label">📝 备注（选填）</label>
        <input type="text" className="form-input" placeholder="例如：午饭黄焖鸡" value={note} onChange={e => setNote(e.target.value)} maxLength={200} />
      </div>

      <button className={`submit-btn ${isAmountValid ? 'ready' : ''} ${recordType === 'income' ? 'income-mode' : ''}`} onClick={handleSubmit} disabled={!isAmountValid}>
        <PlusCircle size={20} /> {recordType === 'expense' ? '记一笔支出' : '记一笔收入'}
      </button>
    </div>
  )
}

function getTodayStr(): string { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}` }

export default ExpenseForm

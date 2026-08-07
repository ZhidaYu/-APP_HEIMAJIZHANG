import React from 'react'
import { AlertTriangle, InfoIcon } from 'lucide-react'

interface ConfirmDialogProps {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
  danger?: boolean
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ title, message, confirmText = '确认', cancelText = '取消', onConfirm, onCancel, danger = false }) => {
  const handleBackdrop = (e: React.MouseEvent) => { if (e.target === e.currentTarget) onCancel() }

  return (
    <div className="modal-backdrop" onClick={handleBackdrop}>
      <div className="confirm-dialog">
        <div className="confirm-icon">
          {danger ? <AlertTriangle size={40} color="#EF4444" strokeWidth={1.5} /> : <InfoIcon size={40} color="#6366F1" strokeWidth={1.5} />}
        </div>
        <h4 className="confirm-title">{title}</h4>
        <p className="confirm-message">{message}</p>
        <div className="confirm-actions">
          <button className="confirm-btn cancel" onClick={onCancel}>{cancelText}</button>
          <button className={`confirm-btn ok ${danger ? 'danger' : ''}`} onClick={onConfirm}>{confirmText}</button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog

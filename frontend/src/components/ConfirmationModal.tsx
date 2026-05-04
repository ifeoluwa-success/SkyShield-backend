// src/components/ConfirmationModal.tsx
import React from 'react';
import { X, AlertTriangle } from 'lucide-react';
import '../assets/css/ConfirmationModal.css';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="cm-overlay" onClick={onCancel}>
      <div className="cm-card" onClick={e => e.stopPropagation()}>
        <div className="cm-header">
          <div className="cm-icon">
            <AlertTriangle size={24} />
          </div>
          <button className="cm-close" onClick={onCancel}>
            <X size={18} />
          </button>
        </div>
        <h3 className="cm-title">{title}</h3>
        <p className="cm-message">{message}</p>
        <div className="cm-actions">
          <button className="cm-btn cm-btn-cancel" onClick={onCancel}>
            {cancelText}
          </button>
          <button className="cm-btn cm-btn-confirm" onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
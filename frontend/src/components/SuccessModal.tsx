// src/components/SuccessModal.tsx
import React, { useEffect } from 'react';
import { CheckCircle, X } from 'lucide-react';
import '../assets/css/SuccessModal.css';

interface SuccessModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onClose: () => void;
  autoClose?: boolean;
  autoCloseDelay?: number;
}

const SuccessModal: React.FC<SuccessModalProps> = ({
  isOpen,
  title,
  message,
  onClose,
  autoClose = true,
  autoCloseDelay = 3000,
}) => {
  useEffect(() => {
    if (isOpen && autoClose) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseDelay);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoClose, autoCloseDelay, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <X size={20} />
        </button>
        <div className="modal-content">
          <div className="modal-icon">
            <CheckCircle size={64} strokeWidth={1.5} />
          </div>
          <h2 className="modal-title">{title}</h2>
          <p className="modal-message">{message}</p>
          <button className="modal-button" onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuccessModal;
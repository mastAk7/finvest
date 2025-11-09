import React, { useState, useEffect } from 'react';

const ToastContext = React.createContext();

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'info', duration = 3000) => {
    const id = Date.now() + Math.random();
    const toast = { id, message, type, duration };
    setToasts(prev => [...prev, toast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const success = (message, duration) => showToast(message, 'success', duration);
  const error = (message, duration) => showToast(message, 'error', duration);
  const info = (message, duration) => showToast(message, 'info', duration);
  const warning = (message, duration) => showToast(message, 'warning', duration);

  return (
    <ToastContext.Provider value={{ success, error, info, warning }}>
      {children}
      <div className="toast-container">
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function Toast({ message, type, onClose }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger animation
    setTimeout(() => setIsVisible(true), 10);
  }, []);

  const typeStyles = {
    success: {
      backgroundColor: '#10b981',
      borderColor: '#059669',
      icon: '✓'
    },
    error: {
      backgroundColor: '#ef4444',
      borderColor: '#dc2626',
      icon: '✕'
    },
    info: {
      backgroundColor: '#3b82f6',
      borderColor: '#2563eb',
      icon: 'ℹ'
    },
    warning: {
      backgroundColor: '#f59e0b',
      borderColor: '#d97706',
      icon: '⚠'
    }
  };

  const style = typeStyles[type] || typeStyles.info;

  return (
    <div
      className={`toast ${isVisible ? 'toast-visible' : ''}`}
      style={{
        backgroundColor: style.backgroundColor,
        borderColor: style.borderColor
      }}
      onClick={onClose}
    >
      <span className="toast-icon">{style.icon}</span>
      <span className="toast-message">{message}</span>
      <button className="toast-close" onClick={onClose}>×</button>
    </div>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}





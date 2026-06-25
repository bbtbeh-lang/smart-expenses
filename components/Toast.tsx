'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

export default function Toast({ toasts, onRemove }: ToastProps) {
  return (
    <div className="fixed top-16 right-4 left-4 z-[100] flex flex-col gap-2 pointer-events-none max-w-sm mx-auto">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onRemove }: { toast: ToastMessage; onRemove: (id: string) => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onRemove(toast.id), 300);
    }, 3500);
    return () => clearTimeout(timer);
  }, []);

  const styles = {
    success: 'bg-emerald-900 text-emerald-50 shadow-emerald-900/20',
    error: 'bg-rose-900 text-rose-50 shadow-rose-900/20',
    info: 'bg-slate-900 text-slate-50 shadow-slate-900/20',
  };

  const icons = {
    success: <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />,
    error: <XCircle className="w-4 h-4 text-rose-400 shrink-0" />,
    info: <div className="w-4 h-4 rounded-full border-2 border-slate-400 shrink-0" />,
  };

  return (
    <div
      className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl text-sm font-medium transition-all duration-300 ${styles[toast.type]} ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}
    >
      {icons[toast.type]}
      <span className="flex-1">{toast.message}</span>
      <button onClick={() => { setVisible(false); setTimeout(() => onRemove(toast.id), 300); }} className="ml-1 opacity-60 hover:opacity-100">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

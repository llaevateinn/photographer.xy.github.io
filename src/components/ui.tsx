import { useEffect, useRef, type ReactNode } from 'react';

export function Badge({ tone = 'blue', children }: { tone?: 'blue' | 'green' | 'orange' | 'red' | 'gray'; children: ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function ProgressBar({ value, max, tone = 'blue', label }: { value: number; max: number; tone?: 'blue' | 'orange' | 'red'; label?: string }) {
  const percent = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return <div className="progress-wrap" aria-label={label ?? `${value} / ${max}`}><div className={`progress-track progress-${tone}`}><span style={{ width: `${percent}%` }}/></div><small>{label ?? `${value} / ${max}`}</small></div>;
}

export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <div className="empty-state"><span>✦</span><strong>{title}</strong><p>{detail}</p></div>;
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <section ref={ref} className="modal" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}>
      <header className="modal-header"><h2>{title}</h2><button className="icon-button" aria-label="关闭" onClick={onClose}>×</button></header>{children}
    </section>
  </div>;
}

export function ConfirmDialog({ title, message, confirmLabel = '确认', onCancel, onConfirm }: { title: string; message: string; confirmLabel?: string; onCancel: () => void; onConfirm: () => void }) {
  return <Modal title={title} onClose={onCancel}><p className="modal-copy">{message}</p><div className="modal-actions"><button className="button button-secondary" onClick={onCancel}>取消</button><button className="button button-danger" onClick={onConfirm}>{confirmLabel}</button></div></Modal>;
}

export function Toast({ message, onDone }: { message: string | null; onDone: () => void }) {
  useEffect(() => { if (!message) return; const timer = window.setTimeout(onDone, 3000); return () => window.clearTimeout(timer); }, [message, onDone]);
  return message ? <div className="toast" role="status">{message}</div> : null;
}

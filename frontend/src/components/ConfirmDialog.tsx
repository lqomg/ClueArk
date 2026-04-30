interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmText = '确认',
  cancelText = '取消',
  danger,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-ark-bg/85 backdrop-blur-sm"
        aria-hidden
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      />
      <div
        role="dialog"
        aria-modal
        className="relative z-10 w-full max-w-md rounded-2xl border border-ark-border bg-ark-surface p-6 shadow-2xl shadow-black/40"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-ark-text">{title}</h2>
        <p className="mt-2 text-sm text-ark-muted">{description}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            className="rounded-lg border border-white/10 px-5 py-2 text-sm text-slate-400 hover:bg-white/5 hover:text-ark-text"
            onClick={onCancel}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={`rounded-lg px-5 py-2 text-sm font-semibold transition active:scale-[0.98] ${
              danger
                ? 'bg-ark-danger text-white hover:bg-red-600'
                : 'bg-ark-accent text-black shadow-lg shadow-ark-accent/15 hover:opacity-95'
            }`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

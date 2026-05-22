interface ToastProps {
  message: string;
  variant?: 'info' | 'success' | 'warning' | 'error';
}

const variantClasses: Record<NonNullable<ToastProps['variant']>, string> = {
  info: 'border-border',
  success: 'border-success/50',
  warning: 'border-warning/50',
  error: 'border-error/50',
};

/**
 * Notification toast — top-center, slide-down, auto-dismiss after 3s.
 * A toast manager/queue is added in the polish phase.
 */
export default function Toast({ message, variant = 'info' }: ToastProps) {
  return (
    <div
      className={`animate-slide-down rounded-lg border bg-bg-elevated px-4 py-3 text-sm shadow-glow ${variantClasses[variant]}`}
    >
      {message}
    </div>
  );
}

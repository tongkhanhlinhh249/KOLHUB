import { AlertTriangle, CheckCircle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'success' | 'warning' | 'danger';
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  type = 'success',
}: ConfirmDialogProps) {
  const typeConfig = {
    success: {
      icon: CheckCircle,
      iconColor: 'text-green-600',
      iconBg: 'bg-green-100',
      buttonColor: 'bg-green-600 hover:bg-green-700',
    },
    warning: {
      icon: AlertTriangle,
      iconColor: 'text-primary',
      iconBg: 'bg-primary/15',
      buttonColor: 'bg-primary hover:bg-primary/90',
    },
    danger: {
      icon: AlertTriangle,
      iconColor: 'text-destructive',
      iconBg: 'bg-destructive/10',
      buttonColor: 'bg-destructive hover:bg-destructive/90',
    },
  };

  const config = typeConfig[type];
  const Icon = config.icon;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-start gap-4 p-6">
          <div className={`p-3 rounded-full ${config.iconBg} flex-shrink-0`}>
            <Icon className={`w-6 h-6 ${config.iconColor}`} />
          </div>
          
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold text-foreground mb-2">{title}</h2>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full transition-all flex-shrink-0"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-border bg-muted/50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-6 py-2.5 border border-border text-foreground/80 rounded-full hover:bg-card transition-all font-medium"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className={`px-6 py-2.5 text-white rounded-full transition-all font-medium ${config.buttonColor}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

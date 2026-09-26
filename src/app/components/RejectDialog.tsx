import { X } from 'lucide-react';
import { useState } from 'react';

interface RejectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  violationName: string;
}

export function RejectDialog({ isOpen, onClose, onConfirm, violationName }: RejectDialogProps) {
  const [reason, setReason] = useState('');
  const [selectedReason, setSelectedReason] = useState('');

  const predefinedReasons = [
    'Không đủ bằng chứng',
    'Nội dung không vi phạm',
    'Báo cáo sai sự thật',
    'Không thuộc phạm vi quản lý',
    'Vi phạm đã được xử lý',
    'Khác',
  ];

  const handleConfirm = () => {
    const finalReason = selectedReason === 'Khác' ? reason : selectedReason;
    if (!finalReason.trim()) return;
    onConfirm(finalReason);
    handleClose();
  };

  const handleClose = () => {
    setReason('');
    setSelectedReason('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Dialog */}
      <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">Từ chối vi phạm</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-muted rounded-full transition-all"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-4">
              Bạn đang từ chối vi phạm: <span className="font-semibold text-foreground">{violationName}</span>
            </p>

            {/* Predefined Reasons */}
            <div className="space-y-3 mb-4">
              <label className="text-sm font-medium text-foreground/80">Lý do từ chối:</label>
              <div className="space-y-3">
                {predefinedReasons.map((preReason) => (
                  <button
                    key={preReason}
                    type="button"
                    onClick={() => setSelectedReason(preReason)}
                    className={`flex items-center gap-3 px-4 py-3 text-sm rounded-lg border transition-all w-full text-left ${
                      selectedReason === preReason
                        ? 'bg-primary/10 border-primary'
                        : 'bg-card border-border hover:border-primary hover:bg-primary/10'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      selectedReason === preReason
                        ? 'border-primary'
                        : 'border-border'
                    }`}>
                      {selectedReason === preReason && (
                        <div className="w-2 h-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <span className="text-foreground">{preReason}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Reason Input */}
            {selectedReason === 'Khác' && (
              <div>
                <label className="text-sm font-medium text-foreground/80 mb-2 block">
                  Nhập lý do cụ thể:
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Nhập lý do từ chối..."
                  className="w-full px-4 py-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                  rows={4}
                  autoFocus
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-border bg-muted/50 rounded-b-2xl">
          <button
            onClick={handleClose}
            className="px-6 py-2.5 border border-border text-foreground/80 rounded-full hover:bg-card transition-all font-medium"
          >
            Hủy
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedReason || (selectedReason === 'Khác' && !reason.trim())}
            className="px-6 py-2.5 bg-destructive text-white rounded-full hover:bg-destructive/90 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Xác nhận từ chối
          </button>
        </div>
      </div>
    </div>
  );
}
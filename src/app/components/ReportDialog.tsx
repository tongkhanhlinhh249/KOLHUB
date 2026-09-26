import { X, AlertTriangle, FileText, Image as ImageIcon, CheckCircle } from 'lucide-react';
import { useState } from 'react';

interface ReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: 'influencer' | 'channel';
  targetName: string;
  onSubmit?: (reason: string, description: string) => void;
}

const reportReasons = {
  influencer: [
    { id: 'spam', label: 'Spam hoặc gây hiểu nhầm' },
    { id: 'harassment', label: 'Quấy rối hoặc bắt nạt' },
    { id: 'hate_speech', label: 'Phát ngôn thù ghét' },
    { id: 'violence', label: 'Bạo lực hoặc tổ chức nguy hiểm' },
    { id: 'fake_account', label: 'Tài khoản giả mạo' },
    { id: 'scam', label: 'Lừa đảo hoặc gian lận' },
    { id: 'inappropriate_content', label: 'Nội dung không phù hợp' },
    { id: 'copyright', label: 'Vi phạm bản quyền' },
    { id: 'other', label: 'Khác' },
  ],
  channel: [
    { id: 'spam', label: 'Spam hoặc gây hiểu nhầm' },
    { id: 'harassment', label: 'Quấy rối hoặc bắt nạt' },
    { id: 'hate_speech', label: 'Phát ngôn thù ghét' },
    { id: 'violence', label: 'Bạo lực hoặc tổ chức nguy hiểm' },
    { id: 'fake_channel', label: 'Kênh giả mạo' },
    { id: 'scam', label: 'Lừa đảo hoặc gian lận' },
    { id: 'inappropriate_content', label: 'Nội dung không phù hợp' },
    { id: 'copyright', label: 'Vi phạm bản quyền' },
    { id: 'other', label: 'Khác' },
  ],
};

export function ReportDialog({ isOpen, onClose, targetType, targetName, onSubmit }: ReportDialogProps) {
  const [step, setStep] = useState<'reason' | 'details' | 'success'>('reason');
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const reasons = reportReasons[targetType] || [];

  const handleReasonSelect = (reasonId: string) => {
    setSelectedReason(reasonId);
  };

  const handleContinue = () => {
    if (selectedReason) {
      setStep('details');
    }
  };

  const handleBack = () => {
    if (step === 'details') {
      setStep('reason');
    } else if (step === 'success') {
      handleClose();
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (onSubmit) {
      const reasonLabel = reasons.find(r => r.id === selectedReason)?.label || '';
      onSubmit(reasonLabel, description);
    }
    
    setIsSubmitting(false);
    setStep('success');
  };

  const handleClose = () => {
    setStep('reason');
    setSelectedReason('');
    setDescription('');
    setIsSubmitting(false);
    onClose();
  };

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[65] transition-opacity"
        onClick={handleClose}
      />

      {/* Mobile Bottom Sheet */}
      <div className="md:hidden fixed inset-x-0 bottom-0 z-[70] bg-card rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col animate-slide-up">
        {/* Drag Handle */}
        <div className="flex items-center justify-center pt-3 pb-2">
          <div className="w-12 h-1 bg-muted-foreground/30 rounded-full"></div>
        </div>

        {/* Mobile Header */}
        <div className="border-b border-border px-4 pb-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              {step === 'reason' && 'Báo cáo'}
              {step === 'details' && 'Chi tiết báo cáo'}
              {step === 'success' && 'Báo cáo thành công'}
            </h2>
            <button onClick={handleClose} className="p-2 hover:bg-muted rounded-full transition-colors">
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
          {step !== 'success' && (
            <p className="text-xs text-muted-foreground mt-1">
              {targetType === 'influencer' ? 'Influencer' : 'Kênh'}: <span className="font-medium">{targetName}</span>
            </p>
          )}
        </div>

        {/* Mobile Content - Scrollable */}
        <div className="flex-1 overflow-auto p-4">
          {step === 'reason' && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground mb-3">Vui lòng chọn lý do báo cáo:</p>
              {reasons.map((reason) => (
                <button
                  key={reason.id}
                  onClick={() => handleReasonSelect(reason.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
                    selectedReason === reason.id
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-border text-foreground/80'
                  }`}
                >
                  <span className="text-sm font-medium">{reason.label}</span>
                </button>
              ))}
            </div>
          )}

          {step === 'details' && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Lý do đã chọn:</p>
                <div className="px-3 py-2 bg-primary/10 border border-primary rounded-lg">
                  <span className="text-sm font-medium text-primary">
                    {reasons.find(r => r.id === selectedReason)?.label}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-2">
                  Mô tả chi tiết (không bắt buộc)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Vui lòng mô tả chi tiết về vi phạm..."
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm resize-none"
                  rows={5}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {description.length}/500 ký tự
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex gap-2">
                  <AlertTriangle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-blue-800">
                    <p className="font-medium mb-1">Lưu ý:</p>
                    <p>Báo cáo của bạn sẽ được xem xét trong vòng 24-48 giờ. Chúng tôi sẽ thông báo kết quả qua email.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Báo cáo đã được gửi!
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Cảm ơn bạn đã giúp chúng tôi duy trì cộng đồng an toàn và lành mạnh.
              </p>
              <div className="bg-muted/50 rounded-lg p-3 text-left">
                <p className="text-xs text-muted-foreground mb-1">Đối tượng:</p>
                <p className="text-sm font-medium text-foreground mb-3">{targetName}</p>
                <p className="text-xs text-muted-foreground mb-1">Lý do:</p>
                <p className="text-sm font-medium text-foreground">
                  {reasons.find(r => r.id === selectedReason)?.label}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Footer */}
        {step !== 'success' && (
          <div className="border-t border-border p-4 bg-card">
            <div className="flex gap-3">
              {step === 'details' && (
                <button
                  onClick={handleBack}
                  className="flex-1 px-6 py-2.5 bg-card border border-border text-foreground/80 rounded-full hover:bg-muted/50 transition-all font-medium text-sm"
                >
                  Quay lại
                </button>
              )}
              <button
                onClick={step === 'reason' ? handleContinue : handleSubmit}
                disabled={!selectedReason || isSubmitting}
                className={`flex-1 px-6 py-2.5 rounded-full font-medium text-sm transition-all ${
                  !selectedReason || isSubmitting
                    ? 'bg-muted-foreground/30 text-muted-foreground cursor-not-allowed'
                    : 'bg-primary text-white hover:bg-primary/90'
                }`}
              >
                {isSubmitting ? 'Đang gửi...' : step === 'reason' ? 'Tiếp tục' : 'Gửi báo cáo'}
              </button>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="border-t border-border p-4 bg-card">
            <button
              onClick={handleClose}
              className="w-full px-6 py-2.5 bg-primary text-white rounded-full hover:bg-primary/90 transition-all font-medium text-sm"
            >
              Đóng
            </button>
          </div>
        )}
      </div>

      {/* Desktop Dialog - Hidden on mobile */}
      <div className="hidden md:flex fixed inset-0 z-[70] items-center justify-center">
        <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md mx-4">
          {/* Desktop Header */}
          <div className="border-b border-border px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">
                {step === 'reason' && 'Báo cáo'}
                {step === 'details' && 'Chi tiết báo cáo'}
                {step === 'success' && 'Báo cáo thành công'}
              </h2>
              <button onClick={handleClose} className="p-2 hover:bg-muted rounded-full transition-colors">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            {step !== 'success' && (
              <p className="text-sm text-muted-foreground mt-1">
                {targetType === 'influencer' ? 'Influencer' : 'Kênh'}: <span className="font-medium">{targetName}</span>
              </p>
            )}
          </div>

          {/* Desktop Content */}
          <div className="px-6 py-5 max-h-[60vh] overflow-auto">
            {step === 'reason' && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground mb-4">Vui lòng chọn lý do báo cáo:</p>
                {reasons.map((reason) => (
                  <button
                    key={reason.id}
                    onClick={() => handleReasonSelect(reason.id)}
                    className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
                      selectedReason === reason.id
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-border text-foreground/80'
                    }`}
                  >
                    <span className="text-sm font-medium">{reason.label}</span>
                  </button>
                ))}
              </div>
            )}

            {step === 'details' && (
              <div className="space-y-5">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Lý do đã chọn:</p>
                  <div className="px-4 py-2.5 bg-primary/10 border border-primary rounded-lg">
                    <span className="text-sm font-medium text-primary">
                      {reasons.find(r => r.id === selectedReason)?.label}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-2">
                    Mô tả chi tiết (không bắt buộc)
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Vui lòng mô tả chi tiết về vi phạm..."
                    className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm resize-none"
                    rows={6}
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {description.length}/500 ký tự
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex gap-3">
                    <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">Lưu ý:</p>
                      <p>Báo cáo của bạn sẽ được xem xét trong vòng 24-48 giờ. Chúng tôi sẽ thông báo kết quả qua email.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 'success' && (
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Báo cáo đã được gửi!
                </h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Cảm ơn bạn đã giúp chúng tôi duy trì cộng đồng an toàn và lành mạnh.
                </p>
                <div className="bg-muted/50 rounded-lg p-4 text-left">
                  <p className="text-xs text-muted-foreground mb-1">Đối tượng:</p>
                  <p className="text-sm font-medium text-foreground mb-3">{targetName}</p>
                  <p className="text-xs text-muted-foreground mb-1">Lý do:</p>
                  <p className="text-sm font-medium text-foreground">
                    {reasons.find(r => r.id === selectedReason)?.label}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Desktop Footer */}
          {step !== 'success' && (
            <div className="border-t border-border px-6 py-4 bg-muted/50">
              <div className="flex gap-3 justify-end">
                {step === 'details' && (
                  <button
                    onClick={handleBack}
                    className="px-6 py-2.5 bg-card border border-border text-foreground/80 rounded-full hover:bg-muted/50 transition-all font-medium"
                  >
                    Quay lại
                  </button>
                )}
                <button
                  onClick={step === 'reason' ? handleContinue : handleSubmit}
                  disabled={!selectedReason || isSubmitting}
                  className={`px-6 py-2.5 rounded-full font-medium transition-all ${
                    !selectedReason || isSubmitting
                      ? 'bg-muted-foreground/30 text-muted-foreground cursor-not-allowed'
                      : 'bg-primary text-white hover:bg-primary/90'
                  }`}
                >
                  {isSubmitting ? 'Đang gửi...' : step === 'reason' ? 'Tiếp tục' : 'Gửi báo cáo'}
                </button>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="border-t border-border px-6 py-4 bg-muted/50">
              <button
                onClick={handleClose}
                className="w-full px-6 py-2.5 bg-primary text-white rounded-full hover:bg-primary/90 transition-all font-medium"
              >
                Đóng
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
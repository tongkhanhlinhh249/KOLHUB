import { X, ExternalLink, Calendar, User, AlertTriangle, CheckCircle2, Clock, XCircle, TriangleAlert } from 'lucide-react';

interface Violation {
  id: number;
  channelName: string;
  violationType: string;
  reportType: 'ai' | 'user' | 'brand';
  date: string;
  status: 'pending' | 'resolved' | 'investigating' | 'rejected';
  description: string;
  platform: 'Facebook' | 'TikTok' | 'YouTube' | 'Instagram';
  postTitle: string;
  postUrl: string;
  postThumbnail: string;
  rejectionReason?: string;
  resolvedDate?: string;
}

interface ViolationDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  violation: Violation | null;
}

const reportTypeConfig = {
  ai: { label: 'AI Report', color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive/30' },
  user: { label: 'User Report', color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive/30' },
  brand: { label: 'Brand Report', color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive/30' },
};

const statusConfig = {
  pending: { label: 'Chờ xử lý', icon: Clock, color: 'text-muted-foreground', bg: 'bg-muted/50' },
  investigating: { label: 'Đang xử lý', icon: AlertTriangle, color: 'text-primary', bg: 'bg-primary/10' },
  resolved: { label: 'Đã xử lý', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
  rejected: { label: 'Đã từ chối', icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10' },
};

export function ViolationDetailDialog({ isOpen, onClose, violation }: ViolationDetailDialogProps) {
  if (!isOpen || !violation) return null;

  const reportTypeStyle = reportTypeConfig[violation.reportType];
  const statusStyle = statusConfig[violation.status];
  const StatusIcon = statusStyle.icon;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Mobile Bottom Sheet */}
      <div className="md:hidden fixed inset-x-0 bottom-0 z-50 bg-card rounded-t-3xl shadow-2xl max-h-[90vh] flex flex-col animate-slide-up">
        {/* Drag Handle */}
        <div className="flex items-center justify-center pt-3 pb-2">
          <div className="w-12 h-1 bg-muted-foreground/30 rounded-full"></div>
        </div>

        {/* Mobile Header */}
        <div className="border-b border-border px-4 pb-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Chi tiết vi phạm</h2>
            <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Mobile Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Badges - Đưa lên đầu */}
          <div className="flex flex-wrap gap-2 mb-4">
            {/* Status Badge */}
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full ${statusStyle.bg}`}>
              <StatusIcon className={`w-4 h-4 ${statusStyle.color}`} />
              <span className={`text-sm font-medium ${statusStyle.color}`}>{statusStyle.label}</span>
            </div>

            {/* Report Type Badge */}
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full ${reportTypeStyle.bg}`}>
              <TriangleAlert className={`w-4 h-4 ${reportTypeStyle.color}`} />
              <span className={`text-sm font-medium ${reportTypeStyle.color}`}>{reportTypeStyle.label}</span>
            </div>
          </div>

          {/* Post Thumbnail - Tăng kích thước h-48 → h-64 */}
          <div className="mb-5">
            <img 
              src={violation.postThumbnail} 
              alt={violation.postTitle}
              className="w-full h-64 rounded-xl object-cover border border-border shadow-sm"
            />
          </div>

          {/* Separator */}
          <div className="border-t border-border my-5"></div>

          {/* Violation Info */}
          <div className="space-y-5">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{violation.violationType}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{violation.description}</p>
            </div>

            {/* Separator */}
            <div className="border-t border-border"></div>

            {/* Post Link */}
            <div className="bg-muted/50 rounded-xl p-4">
              <div className="text-xs font-medium text-muted-foreground mb-2">Bài viết vi phạm:</div>
              <a 
                href={violation.postUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline flex items-center gap-1.5 font-medium"
              >
                <span className="line-clamp-2">{violation.postTitle}</span>
                <ExternalLink className="w-4 h-4 flex-shrink-0" />
              </a>
            </div>

            {/* Separator */}
            <div className="border-t border-border"></div>

            {/* Details Grid - Cải thiện spacing */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/50 rounded-xl p-4">
                <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-2">
                  <User className="w-4 h-4" />
                  <span className="font-medium">Kênh</span>
                </div>
                <p className="font-semibold text-foreground text-sm">{violation.channelName}</p>
              </div>

              <div className="bg-muted/50 rounded-xl p-4">
                <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-2">
                  <Calendar className="w-4 h-4" />
                  <span className="font-medium">Ngày báo cáo</span>
                </div>
                <p className="font-semibold text-foreground text-sm">{violation.date}</p>
              </div>

              <div className="bg-muted/50 rounded-xl p-4 col-span-2">
                <div className="text-muted-foreground text-xs mb-2 font-medium">Nền tảng</div>
                <p className="font-semibold text-foreground text-sm">{violation.platform}</p>
              </div>
            </div>

            {/* Rejection Reason */}
            {violation.status === 'rejected' && violation.rejectionReason && (
              <>
                <div className="border-t border-border"></div>
                <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4">
                  <div className="text-destructive text-sm font-semibold mb-2">Lý do từ chối:</div>
                  <p className="text-sm text-foreground leading-relaxed">{violation.rejectionReason}</p>
                </div>
              </>
            )}

            {/* Resolved Date */}
            {violation.status === 'resolved' && violation.resolvedDate && (
              <>
                <div className="border-t border-border"></div>
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="text-green-600 text-sm font-semibold mb-2">Ngày xử lý:</div>
                  <p className="text-sm text-foreground">{violation.resolvedDate}</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Mobile Footer */}
        <div className="border-t border-border p-4 bg-card">
          <button
            onClick={onClose}
            className="w-full px-6 py-2.5 bg-card border border-border text-foreground/80 rounded-full hover:bg-muted/50 transition-all font-medium text-sm"
          >
            Đóng
          </button>
        </div>
      </div>

      {/* Desktop Drawer - Hidden on mobile */}
      <div className="hidden md:flex fixed inset-0 z-50" onClick={onClose}>
        <div 
          className={`ml-auto relative bg-card w-full max-w-2xl h-full shadow-2xl flex flex-col transition-transform ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border bg-card px-[24px] py-[12px]">
            <h2 className="font-semibold text-foreground text-[16px] font-bold">Chi tiết vi phạm</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-full transition-all"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto p-6 space-y-6 flex-1">
            {/* Badges - Đưa lên đầu */}
            <div className="flex flex-wrap gap-2">
              {/* Status Badge */}
              <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full ${statusStyle.bg}`}>
                <StatusIcon className={`w-4 h-4 ${statusStyle.color}`} />
                <span className={`text-sm font-medium ${statusStyle.color}`}>{statusStyle.label}</span>
              </div>

              {/* Report Type Badge */}
              <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full ${reportTypeStyle.bg}`}>
                <TriangleAlert className={`w-4 h-4 ${reportTypeStyle.color}`} />
                <span className={`text-sm font-medium ${reportTypeStyle.color}`}>{reportTypeStyle.label}</span>
              </div>
            </div>

            {/* Post Thumbnail - Tăng kích thước h-64 → h-80 */}
            <div>
              <img 
                src={violation.postThumbnail} 
                alt={violation.postTitle}
                className="w-full h-80 rounded-xl object-cover border border-border shadow-sm"
              />
            </div>

            {/* Separator */}
            

            {/* Violation Info */}
            <div className="space-y-5">
              <div>
                <h3 className="font-semibold text-foreground mb-3 text-[16px]">{violation.violationType}</h3>
                <p className="text-muted-foreground leading-relaxed text-[15px]">{violation.description}</p>
              </div>

              {/* Separator */}
              

              {/* Post Link */}
              <div className="bg-muted/50 rounded-xl p-[16px]">
                <div className="text-sm font-medium text-muted-foreground mb-2">Bài viết vi phạm:</div>
                <a 
                  href={violation.postUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline flex items-center gap-2 font-medium text-[14px]"
                >
                  {violation.postTitle}
                  <ExternalLink className="w-4 h-4 flex-shrink-0" />
                </a>
              </div>

              {/* Separator */}
              

              {/* Details Grid - Cải thiện layout */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted/50 rounded-xl p-[16px]">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                    <User className="w-5 h-5" />
                    <span className="font-medium text-[12px]">Kênh</span>
                  </div>
                  <p className="font-semibold text-foreground text-[14px]">{violation.channelName}</p>
                </div>

                <div className="bg-muted/50 rounded-xl p-5">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                    <Calendar className="w-5 h-5" />
                    <span className="font-medium text-[12px]">Ngày báo cáo</span>
                  </div>
                  <p className="font-semibold text-foreground text-[14px]">{violation.date}</p>
                </div>

                <div className="bg-muted/50 rounded-xl col-span-2 p-[16px]">
                  <div className="text-muted-foreground mb-2 font-medium text-[12px]">Nền tảng</div>
                  <p className="font-semibold text-foreground text-[14px]">{violation.platform}</p>
                </div>
              </div>

              {/* Rejection Reason */}
              {violation.status === 'rejected' && violation.rejectionReason && (
                <>
                  <div className="border-t border-border"></div>
                  <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-5">
                    <div className="text-destructive text-sm font-semibold mb-3">Lý do từ chối:</div>
                    <p className="text-foreground leading-relaxed">{violation.rejectionReason}</p>
                  </div>
                </>
              )}

              {/* Resolved Date */}
              {violation.status === 'resolved' && violation.resolvedDate && (
                <>
                  <div className="border-t border-border"></div>
                  <div className="bg-green-50 border border-green-200 rounded-xl p-5">
                    <div className="text-green-600 text-sm font-semibold mb-3">Ngày xử lý:</div>
                    <p className="text-foreground">{violation.resolvedDate}</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-border bg-muted/50 px-[24px] py-[12px]">
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-card border border-border text-foreground/80 rounded-full hover:bg-muted/50 transition-all font-medium"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
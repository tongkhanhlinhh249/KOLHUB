import { useState, useCallback } from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle2, Clock, XCircle, ExternalLink, ChevronLeft, ChevronRight, TriangleAlert, Check, X as XIcon, Eye, Loader2 } from 'lucide-react';
import { FilterBar } from '../components/FilterBar';
import { RejectDialog } from '../components/RejectDialog';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ViolationDetailDialog } from '../components/ViolationDetailDialog';
import { toast, Toaster } from 'sonner';

interface Violation {
  id: number;
  channelName: string;
  violationType: string;
  reportType: 'ai' | 'user' | 'brand';
  date: string;
  status: 'pending' | 'resolved' | 'rejected';
  description: string;
  platform: 'Facebook' | 'TikTok' | 'YouTube' | 'Instagram';
  postTitle: string;
  postUrl: string;
  postThumbnail: string;
  rejectionReason?: string;
  resolvedDate?: string;
}

const reportTypeConfig = {
  ai: { label: 'AI Report', color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive/30' },
  user: { label: 'User Report', color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive/30' },
  brand: { label: 'Brand Report', color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive/30' },
};

const statusConfig = {
  pending: { label: 'Chờ xử lý', icon: Clock, color: 'text-muted-foreground', bg: 'bg-muted/50' },
  resolved: { label: 'Đã xử lý', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
  rejected: { label: 'Đã từ chối', icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10' },
};

const initialViolations: Violation[] = [
  {
    id: 1,
    channelName: 'Khoa Pug',
    violationType: 'Nội dung sai sự thật',
    reportType: 'ai',
    date: '08/03/2026',
    status: 'pending',
    description: 'Video chứa thông tin không chính xác về địa điểm du lịch',
    platform: 'YouTube',
    postTitle: 'Du lịch Mỹ 2026 - Khám phá Los Angeles với 100 triệu đồng',
    postUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    postThumbnail: 'https://images.unsplash.com/photo-1694878982141-cc798b98f926?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0cmF2ZWwlMjB2bG9nJTIweW91dHViZSUyMHRodW1ibmFpbHxlbnwxfHx8fDE3NzMxMzMxODV8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
  },
  {
    id: 2,
    channelName: 'Shopee Vietnam',
    violationType: 'Quảng cáo gây hiểu lầm',
    reportType: 'user',
    date: '07/03/2026',
    status: 'resolved',
    description: 'Khuyến mãi không rõ ràng về điều khoản áp dụng',
    platform: 'TikTok',
    postTitle: 'Sale 3.3 - Giảm đến 90% Toàn Bộ Sản Phẩm',
    postUrl: 'https://www.tiktok.com/@shopeevietnam/video/7028056350840513794',
    postThumbnail: 'https://images.unsplash.com/photo-1768839721557-2a676b10dd49?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzaG9wcGluZyUyMHNhbGUlMjBwcm9tb3Rpb258ZW58MXx8fHwxNzczMDM5NzYwfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    resolvedDate: '07/03/2026'
  },
  {
    id: 3,
    channelName: 'Trấn Thành Official',
    violationType: 'Vi phạm bản quyền',
    reportType: 'brand',
    date: '05/03/2026',
    status: 'pending',
    description: 'Sử dụng nhạc nền chưa được cấp phép',
    platform: 'Facebook',
    postTitle: 'Đêm nhạc từ thiện "Trái tim cho em" - Full show',
    postUrl: 'https://www.facebook.com/tranthanhofficial/posts/1234567890',
    postThumbnail: 'https://images.unsplash.com/photo-1767969457898-51d5e9cf81d2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtdXNpYyUyMGNvbmNlcnQlMjBwZXJmb3JtYW5jZXxlbnwxfHx8fDE3NzMwNTg2MDZ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
  },
  {
    id: 4,
    channelName: 'Quỳnh Trần JP',
    violationType: 'Nội dung không phù hợp',
    reportType: 'user',
    date: '04/03/2026',
    status: 'rejected',
    description: 'Báo cáo không đúng sự thật từ người dùng',
    platform: 'YouTube',
    postTitle: 'Làm món ăn truyền thống Việt Nam tại Nhật Bản',
    postUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    postThumbnail: 'https://images.unsplash.com/photo-1635661988046-306631057df3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb29raW5nJTIwZm9vZCUyMHJlY2lwZXxlbnwxfHx8fDE3NzMxMjk4MTB8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    rejectionReason: 'Không đủ bằng chứng'
  },
  {
    id: 5,
    channelName: 'Viettel Official',
    violationType: 'Spam/Scam',
    reportType: 'ai',
    date: '03/03/2026',
    status: 'pending',
    description: 'Phát hiện tài khoản giả mạo thương hiệu',
    platform: 'Facebook',
    postTitle: 'Khuyến mãi đặc biệt - Trúng thưởng iPhone 15 Pro Max',
    postUrl: 'https://www.facebook.com/viettelofficial/posts/1234567890',
    postThumbnail: 'https://images.unsplash.com/photo-1699026687712-5221e5d7b98b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidXNpbmVzcyUyMGNvcnBvcmF0ZSUyMG9mZmljZXxlbnwxfHx8fDE3NzMxMzMxODZ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
  },
  {
    id: 6,
    channelName: 'Shopee Vietnam',
    violationType: 'Vi phạm quyền riêng tư',
    reportType: 'brand',
    date: '02/03/2026',
    status: 'resolved',
    description: 'Sử dụng hình ảnh khách hàng chưa được đồng ý',
    platform: 'TikTok',
    postTitle: 'Review sản phẩm từ khách hàng thực tế',
    postUrl: 'https://www.tiktok.com/@shopeevietnam/video/7028056350840513794',
    postThumbnail: 'https://images.unsplash.com/photo-1658297063569-162817482fb6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlY29tbWVyY2UlMjBvbmxpbmUlMjBzaG9wcGluZ3xlbnwxfHx8fDE3NzMwMTk2Mzh8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    resolvedDate: '02/03/2026'
  },
  {
    id: 7,
    channelName: 'Sơn Tùng M-TP',
    violationType: 'Nội dung vi phạm cộng đồng',
    reportType: 'ai',
    date: '01/03/2026',
    status: 'pending',
    description: 'Nội dung có yếu tố bạo lực không phù hợp',
    platform: 'YouTube',
    postTitle: 'Making The Sky - Official Music Video',
    postUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    postThumbnail: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtdXNpYyUyMHZpZGVvJTIwcHJvZHVjdGlvbnxlbnwxfHx8fDE3NzMxMzMxODZ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
  },
  {
    id: 8,
    channelName: 'Grab Vietnam',
    violationType: 'Thông tin sai lệch',
    reportType: 'user',
    date: '28/02/2026',
    status: 'pending',
    description: 'Quảng cáo chương trình khuyến mãi đã hết hạn',
    platform: 'Facebook',
    postTitle: 'Grab Food - Freeship 0Đ cho tất cả đơn hàng',
    postUrl: 'https://www.facebook.com/grabvietnam/posts/1234567890',
    postThumbnail: 'https://images.unsplash.com/photo-1526367790999-0150786686a2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmb29kJTIwZGVsaXZlcnklMjBhcHB8ZW58MXx8fHwxNzczMTMzMTg3fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
  },
  {
    id: 9,
    channelName: 'Ngọc Trinh Official',
    violationType: 'Nội dung phản cảm',
    reportType: 'brand',
    date: '27/02/2026',
    status: 'resolved',
    description: 'Hình ảnh không phù hợp với chuẩn mực cộng đồng',
    platform: 'Instagram',
    postTitle: 'Street style xuống phố - Hot trend 2026',
    postUrl: 'https://www.instagram.com/p/ABC123',
    postThumbnail: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmYXNoaW9uJTIwc3RyZWV0JTIwc3R5bGV8ZW58MXx8fHwxNzczMTMzMTg3fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    resolvedDate: '27/02/2026'
  },
  {
    id: 10,
    channelName: 'Lazada Vietnam',
    violationType: 'Quảng cáo sản phẩm giả',
    reportType: 'brand',
    date: '24/02/2026',
    status: 'pending',
    description: 'Phát hiện quảng cáo sản phẩm hàng nhái',
    platform: 'TikTok',
    postTitle: 'Flash Sale 2.2 - iPhone 15 Pro Max chỉ 5 triệu',
    postUrl: 'https://www.tiktok.com/@lazadavietnam/video/7028056350840513794',
    postThumbnail: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzbWFydHBob25lJTIwc2hvcHBpbmd8ZW58MXx8fHwxNzczMTMzMTg4fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
  },
];

export function ViolationList() {
  const [violations, setViolations] = useState<Violation[]>(initialViolations);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'resolved' | 'rejected'>('all');
  const [loadingAction, setLoadingAction] = useState<number | null>(null);
  const itemsPerPage = 12;

  // Dialog states
  const [selectedViolation, setSelectedViolation] = useState<Violation | null>(null);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [confirmDialogType, setConfirmDialogType] = useState<'resolve' | 'complete'>('resolve');

  const stats = {
    total: violations.length,
    pending: violations.filter(v => v.status === 'pending').length,
    resolved: violations.filter(v => v.status === 'resolved').length,
    rejected: violations.filter(v => v.status === 'rejected').length,
  };

  // Filter violations by active tab
  const filteredViolations = violations.filter(violation => {
    if (activeTab === 'all') return true;
    return violation.status === activeTab;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredViolations.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentViolations = filteredViolations.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTabChange = (tab: 'all' | 'pending' | 'resolved' | 'rejected') => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  // Action handlers
  const handleResolve = useCallback((violation: Violation) => {
    setSelectedViolation(violation);
    setIsConfirmDialogOpen(true);
  }, []);

  const handleReject = useCallback((violation: Violation) => {
    setSelectedViolation(violation);
    setIsRejectDialogOpen(true);
  }, []);

  const handleViewDetail = useCallback((violation: Violation) => {
    setSelectedViolation(violation);
    setIsDetailDialogOpen(true);
  }, []);

  const confirmResolve = useCallback(() => {
    if (!selectedViolation) return;

    setLoadingAction(selectedViolation.id);
    
    // Simulate API call
    setTimeout(() => {
      setViolations(prev => prev.map(v => 
        v.id === selectedViolation.id 
          ? { ...v, status: 'resolved' as const, resolvedDate: new Date().toLocaleDateString('vi-VN') }
          : v
      ));
      
      toast.success('Đã xử lý vi phạm thành công!', {
        description: `"${selectedViolation.violationType}" đã được đánh dấu là đã xử lý.`
      });
      
      setLoadingAction(null);
      setIsConfirmDialogOpen(false);
      setSelectedViolation(null);
    }, 800);
  }, [selectedViolation]);

  const confirmReject = useCallback((reason: string) => {
    if (!selectedViolation) return;

    setLoadingAction(selectedViolation.id);
    
    // Simulate API call
    setTimeout(() => {
      setViolations(prev => prev.map(v => 
        v.id === selectedViolation.id 
          ? { ...v, status: 'rejected' as const, rejectionReason: reason, resolvedDate: new Date().toLocaleDateString('vi-VN') }
          : v
      ));
      
      toast.error('Đã từ chối vi phạm', {
        description: `"${selectedViolation.violationType}" đã bị từ chối.`
      });
      
      setLoadingAction(null);
      setIsRejectDialogOpen(false);
      setSelectedViolation(null);
    }, 800);
  }, [selectedViolation]);

  const tabs = [
    { id: 'all' as const, label: 'Tất cả', count: stats.total },
    { id: 'pending' as const, label: 'Chờ xử lý', count: stats.pending },
    { id: 'resolved' as const, label: 'Đã xử lý', count: stats.resolved },
    { id: 'rejected' as const, label: 'Đã từ chối', count: stats.rejected },
  ];

  return (
    <>
      <Toaster position="top-right" richColors />
      
      {/* Tabs */}
      <div className="bg-card border-b border-border px-6">
        <div className="flex items-center gap-6 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 py-3 border-b-2 transition-all text-sm flex-shrink-0 ${
                tab.id === activeTab
                  ? 'border-primary text-primary -mb-[1px]'
                  : 'border-transparent text-foreground/80 hover:text-foreground'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                tab.id === activeTab
                  ? 'bg-primary text-white'
                  : 'bg-muted text-foreground/80'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="p-[16px]">
        {/* Filters */}
        <FilterBar
          activeFilters={[]}
          onRemoveFilter={() => {}}
          totalCount={filteredViolations.length}
          countLabel="Vi phạm"
          pageType="violation"
        />

        {/* Violations List */}
        <div className="space-y-4 mt-4">
          {currentViolations.map((violation) => {
            const reportTypeStyle = reportTypeConfig[violation.reportType];
            const statusStyle = statusConfig[violation.status];
            const StatusIcon = statusStyle.icon;
            const isLoading = loadingAction === violation.id;

            return (
              <div 
                key={violation.id} 
                className="bg-card rounded-xl border border-border p-4 md:p-6 hover:shadow-lg transition-all cursor-pointer"
                onClick={() => handleViewDetail(violation)}
              >
                {/* MOBILE LAYOUT - Ảnh 1:1 với overlay */}
                <div className="md:hidden flex flex-col gap-4">
                  {/* Post Thumbnail with Badges - 1:1 on mobile */}
                  <div className="relative w-full aspect-square flex-shrink-0">
                    <img 
                      src={violation.postThumbnail} 
                      alt={violation.postTitle}
                      className="w-full h-full rounded-lg object-cover border border-border"
                    />
                    
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent rounded-lg"></div>
                    
                    {/* Badges - Positioned on top left of image */}
                    <div className="absolute top-2 left-2 flex flex-row gap-2">
                      {/* Report Type Badge */}
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${reportTypeStyle.bg} shadow-sm`}>
                        <TriangleAlert className={`w-3.5 h-3.5 ${reportTypeStyle.color}`} />
                        <span className={`text-xs font-medium ${reportTypeStyle.color}`}>{reportTypeStyle.label}</span>
                      </div>

                      {/* Status Badge */}
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${statusStyle.bg} shadow-sm`}>
                        <StatusIcon className={`w-4 h-4 ${statusStyle.color}`} />
                        <span className={`text-xs font-medium ${statusStyle.color}`}>{statusStyle.label}</span>
                      </div>
                    </div>

                    {/* Post Info - Bottom of image */}
                    <div className="absolute bottom-0 left-0 right-0 p-3 flex flex-col gap-1.5">
                      {/* Post Link */}
                      <div>
                        <span className="text-xs text-white/80">Bài viết vi phạm: </span>
                        <a 
                          href={violation.postUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs text-white hover:text-primary font-medium inline-flex items-center gap-1"
                        >
                          {violation.postTitle}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      
                      {/* Meta Info */}
                      <div className="flex items-center gap-2 text-xs text-white/90 flex-wrap">
                        <span className="font-medium">{violation.channelName}</span>
                        <span className="text-white/60">•</span>
                        <span>{violation.platform}</span>
                        <span className="text-white/60">•</span>
                        <span>{violation.date}</span>
                      </div>
                    </div>
                  </div>

                  {/* Title + Description + Actions */}
                  <div className="flex flex-col gap-3">
                    {/* Title + Description của Vi phạm */}
                    <div>
                      <h3 className="font-semibold text-foreground mb-1 text-[16px]">{violation.violationType}</h3>
                      <p className="text-sm text-muted-foreground">{violation.description}</p>
                    </div>

                    {/* Action Buttons */}
                    {violation.status === 'pending' && (
                      <div className="flex flex-row gap-3 pt-2">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleResolve(violation);
                          }}
                          disabled={isLoading}
                          className="flex-1 px-4 py-2 bg-primary text-white rounded-full hover:bg-primary/90 transition-all text-sm font-medium whitespace-nowrap flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          Xử lý
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReject(violation);
                          }}
                          disabled={isLoading}
                          className="flex-1 px-4 py-2 border border-border text-foreground/80 rounded-full hover:bg-muted/50 transition-all text-sm font-medium whitespace-nowrap flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          <XIcon className="w-4 h-4" />
                          Từ chối
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* DESKTOP LAYOUT - Layout cũ: Ảnh trái + Info phải */}
                <div className="hidden md:flex flex-row gap-4">
                  {/* Post Thumbnail - Desktop */}
                  <div className="relative w-32 h-32 flex-shrink-0">
                    <img 
                      src={violation.postThumbnail} 
                      alt={violation.postTitle}
                      className="w-full h-full rounded-lg object-cover border border-border"
                    />
                  </div>

                  {/* Info Column */}
                  <div className="flex-1 min-w-0 flex flex-col gap-3">
                    {/* Badges */}
                    <div className="flex flex-row gap-2">
                      {/* Report Type Badge */}
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${reportTypeStyle.bg}`}>
                        <TriangleAlert className={`w-3.5 h-3.5 ${reportTypeStyle.color}`} />
                        <span className={`text-xs font-medium ${reportTypeStyle.color}`}>{reportTypeStyle.label}</span>
                      </div>

                      {/* Status Badge */}
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${statusStyle.bg}`}>
                        <StatusIcon className={`w-4 h-4 ${statusStyle.color}`} />
                        <span className={`text-xs font-medium ${statusStyle.color}`}>{statusStyle.label}</span>
                      </div>
                    </div>

                    {/* Post Link */}
                    <div>
                      <span className="text-xs text-muted-foreground">Bài viết vi phạm: </span>
                      <a 
                        href={violation.postUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-sm text-primary hover:text-primary font-medium inline-flex items-center gap-1"
                      >
                        {violation.postTitle}
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                    
                    {/* Meta Info */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                      <span className="font-medium">{violation.channelName}</span>
                      <span className="text-muted-foreground/70">•</span>
                      <span>{violation.platform}</span>
                      <span className="text-muted-foreground/70">•</span>
                      <span>{violation.date}</span>
                    </div>

                    {/* Title + Description của Vi phạm */}
                    <div>
                      <h3 className="font-semibold text-foreground mb-1 text-base">{violation.violationType}</h3>
                      <p className="text-sm text-muted-foreground">{violation.description}</p>
                    </div>

                    {/* Action Buttons */}
                    {violation.status === 'pending' && (
                      null
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 rounded-full border border-border hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="w-5 h-5 text-muted-foreground" />
            </button>

            <div className="flex items-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => goToPage(page)}
                  className={`w-10 h-10 rounded-full font-medium transition-all ${
                    currentPage === page
                      ? 'bg-primary text-white'
                      : 'border border-border text-foreground/80 hover:bg-muted/50'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>

            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-2 rounded-full border border-border hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        )}

        {/* Empty State */}
        {currentViolations.length === 0 && (
          <div className="bg-card rounded-xl border border-border p-12 text-center">
            <ShieldAlert className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Không tìm thấy vi phạm</h3>
            <p className="text-muted-foreground">Thử thay đổi bộ lọc để xem kết quả khác</p>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <RejectDialog
        isOpen={isRejectDialogOpen}
        onClose={() => setIsRejectDialogOpen(false)}
        onConfirm={confirmReject}
        violationName={selectedViolation?.violationType || ''}
      />
      
      <ConfirmDialog
        isOpen={isConfirmDialogOpen}
        onClose={() => setIsConfirmDialogOpen(false)}
        onConfirm={confirmResolve}
        title="Xác nhận xử lý vi phạm"
        description={`Bạn có chắc chắn muốn xử lý vi phạm "${selectedViolation?.violationType}"?`}
        confirmText="Xác nhận xử lý"
        type="success"
      />
      
      <ViolationDetailDialog
        isOpen={isDetailDialogOpen}
        onClose={() => setIsDetailDialogOpen(false)}
        violation={selectedViolation}
      />
    </>
  );
}
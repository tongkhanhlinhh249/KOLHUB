import { X, ExternalLink, User, Building2, MapPin, Phone, Mail, Calendar, FileText, TrendingUp, Users, Heart, MessageCircle, Eye, Share2, ChevronLeft, ChevronRight, Facebook, Youtube, Tv, Instagram, Trophy, CheckCircle2, Award, Flag, MoreVertical } from 'lucide-react';
import { useState, useRef } from 'react';
import { ReportDialog } from './ReportDialog';

interface PersonalManager {
  type: 'personal';
  name: string;
  dob: string;
  idNumber: string;
  address: string;
  phone: string;
  email: string;
}

interface OrganizationManager {
  type: 'organization';
  organizationName: string;
  taxCode: string;
  address: string;
  phone: string;
  representative: string;
  position: string;
  representativePhone: string;
  email: string;
}

interface Channel {
  id: number;
  name: string;
  url: string;
  avatar: string;
  manager: PersonalManager | OrganizationManager;
  platform: 'Facebook' | 'TikTok' | 'YouTube' | 'Instagram';
  contentType: string;
  followers: number;
  lastUpdated: string;
}

interface ChannelDrawerProps {
  channel: Channel | null;
  isOpen: boolean;
  onClose: () => void;
}

const platformIcons: Record<string, { icon: any; color: string; bg: string }> = {
  Facebook: { icon: Facebook, color: 'text-blue-600', bg: 'bg-blue-50' },
  YouTube: { icon: Youtube, color: 'text-destructive', bg: 'bg-destructive/10' },
  TikTok: { icon: Tv, color: 'text-foreground', bg: 'bg-muted' },
  Instagram: { icon: Instagram, color: 'text-pink-600', bg: 'bg-pink-50' },
};

export function ChannelDrawer({ channel, isOpen, onClose }: ChannelDrawerProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'profile' | 'stats' | 'content'>('details');
  const [activePostIndex, setActivePostIndex] = useState(0);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !channel) return null;

  const platformConfig = platformIcons[channel.platform];
  const PlatformIcon = platformConfig.icon;

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  // Mock highlighted posts
  const highlightedPosts = [
    {
      image: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
      likes: 125000,
      comments: 3400,
      views: 2300000,
      shares: 8900,
      date: '05/03/2026',
      description: 'Video mới nhất về sự kiện ra mắt sản phẩm'
    },
    {
      image: 'https://images.unsplash.com/photo-1551818255-e6e10975bc17?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
      likes: 98000,
      comments: 2800,
      views: 1800000,
      shares: 6700,
      date: '02/03/2026',
      description: 'Behind the scenes quay TVC'
    },
    {
      image: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
      likes: 87000,
      comments: 2100,
      views: 1500000,
      shares: 5400,
      date: '28/02/2026',
      description: 'Live stream giao lưu với fans'
    },
  ];

  const nextPost = () => {
    const newIndex = (activePostIndex + 1) % highlightedPosts.length;
    setActivePostIndex(newIndex);
    if (carouselRef.current) {
      const cardWidth = 280 + 12;
      carouselRef.current.scrollTo({
        left: newIndex * cardWidth,
        behavior: 'smooth',
      });
    }
  };

  const prevPost = () => {
    const newIndex = (activePostIndex - 1 + highlightedPosts.length) % highlightedPosts.length;
    setActivePostIndex(newIndex);
    if (carouselRef.current) {
      const cardWidth = 280 + 12;
      carouselRef.current.scrollTo({
        left: newIndex * cardWidth,
        behavior: 'smooth',
      });
    }
  };

  const tabs = [
    { id: 'details' as const, label: 'Chi tiết', icon: FileText },
    { id: 'profile' as const, label: 'Hồ sơ', icon: User },
    { id: 'stats' as const, label: 'Thống kê', icon: TrendingUp },
    { id: 'content' as const, label: 'Nội dung', icon: MessageCircle },
  ];

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/30 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Mobile Bottom Sheet */}
      <div className="md:hidden fixed inset-x-0 bottom-0 z-50 bg-card rounded-t-3xl shadow-2xl max-h-[90vh] flex flex-col animate-slide-up">
        {/* Drag Handle */}
        <div className="flex items-center justify-center pt-3 pb-2">
          <div className="w-12 h-1 bg-muted-foreground/30 rounded-full"></div>
        </div>

        {/* Mobile Header - Compact */}
        <div className="border-b border-border px-4 pb-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3 flex-1">
              <img src={channel.avatar} alt={channel.name} className="w-12 h-12 rounded-xl object-cover" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h2 className="text-lg font-semibold text-foreground truncate">{channel.name}</h2>
                  <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <Award className="w-4 h-4 text-green-500 flex-shrink-0" />
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${platformConfig.bg}`}>
                    <PlatformIcon className={`w-3 h-3 ${platformConfig.color}`} />
                    <span className={`text-xs font-medium ${platformConfig.color}`}>{channel.platform}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Report Button - Mobile */}
              <button
                onClick={() => setIsReportDialogOpen(true)}
                className="flex-shrink-0 p-2 hover:bg-muted rounded-full transition-colors"
              >
                <Flag className="w-4 h-4 text-muted-foreground" />
              </button>
              <button onClick={onClose} className="flex-shrink-0 p-2 hover:bg-muted rounded-full transition-colors">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Mobile Tabs - Scrollable */}
          <div className="flex gap-4 overflow-x-auto scrollbar-hide -mx-4 px-4">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all flex-shrink-0 rounded-full ${
                    activeTab === tab.id
                      ? 'bg-primary text-white'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Mobile Content - Scrollable */}
        <div className="flex-1 overflow-auto p-4">
          {activeTab === 'details' && (
            <div className="space-y-5">
              {/* Basic Info */}
              <div>
                <h3 className="text-sm font-bold text-foreground mb-3">Thông tin cơ bản</h3>
                <div className="bg-card border border-border rounded-lg p-4 space-y-3">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Tên kênh</div>
                    <div className="text-sm font-semibold text-foreground">{channel.name}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Nền tảng</div>
                      <div className="text-sm font-medium text-foreground">{channel.platform}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Loại nội dung</div>
                      <div className="text-sm font-medium text-foreground">{channel.contentType}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Overview Stats */}
              <div>
                <h3 className="text-sm font-bold text-foreground mb-3">Thống kê tổng quan</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gradient-to-br from-primary/10 to-white border border-primary/20 rounded-xl p-3">
                    <div className="text-xs font-medium text-muted-foreground mb-1">Người theo dõi</div>
                    <div className="text-xl font-bold text-foreground">{formatNumber(channel.followers)}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Cập nhật: {channel.lastUpdated}</div>
                  </div>
                  
                  <div className="bg-card border border-border rounded-xl p-3">
                    <div className="text-xs font-medium text-muted-foreground mb-1">Tương tác</div>
                    <div className="text-xl font-bold text-primary">9.2%</div>
                    <div className="text-xs text-green-600 mt-0.5">+12.5%</div>
                  </div>

                  <div className="bg-card border border-border rounded-xl p-3">
                    <div className="text-xs font-medium text-muted-foreground mb-1">Lượt xem TB</div>
                    <div className="text-xl font-bold text-foreground">450K</div>
                    <div className="text-xs text-green-600 mt-0.5">+8.3%</div>
                  </div>

                  <div className="bg-card border border-border rounded-xl p-3">
                    <div className="text-xs font-medium text-muted-foreground mb-1">Chi phí/TT</div>
                    <div className="text-xl font-bold text-green-600">đ85K</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Mỗi tương tác</div>
                  </div>
                </div>
              </div>

              {/* URL */}
              <div>
                <h3 className="text-sm font-bold text-foreground mb-2">Link kênh</h3>
                <a 
                  href={channel.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{channel.url}</span>
                </a>
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="space-y-5">
              {/* Manager Info */}
              <div>
                <h3 className="text-sm font-bold text-foreground mb-3">
                  {channel.manager.type === 'personal' ? 'Quản lý - Cá nhân' : 'Quản lý - Tổ chức'}
                </h3>
                <div className="bg-card border border-border rounded-lg p-4">
                  {channel.manager.type === 'personal' ? (
                    <div className="space-y-3">
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Họ và tên</div>
                        <div className="text-sm font-semibold text-foreground">{channel.manager.name}</div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Ngày sinh</div>
                          <div className="text-sm font-medium text-foreground">{channel.manager.dob}</div>
                        </div>
                        
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">CCCD</div>
                          <div className="text-sm font-medium text-foreground">{channel.manager.idNumber}</div>
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Địa chỉ cư trú</div>
                        <div className="text-sm font-medium text-foreground">{channel.manager.address}</div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Số điện thoại</div>
                          <div className="text-sm font-medium text-foreground">{channel.manager.phone}</div>
                        </div>
                        
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Email</div>
                          <div className="text-sm font-medium text-foreground truncate">{channel.manager.email}</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Tên tổ chức</div>
                        <div className="text-sm font-semibold text-foreground">{channel.manager.organizationName}</div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Mã số thuế</div>
                          <div className="text-sm font-medium text-foreground">{channel.manager.taxCode}</div>
                        </div>
                        
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Số điện thoại</div>
                          <div className="text-sm font-medium text-foreground">{channel.manager.phone}</div>
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Địa chỉ</div>
                        <div className="text-sm font-medium text-foreground">{channel.manager.address}</div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Người đại diện</div>
                          <div className="text-sm font-medium text-foreground">{channel.manager.representative}</div>
                        </div>
                        
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Chức vụ</div>
                          <div className="text-sm font-medium text-foreground">{channel.manager.position}</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">SĐT người đại diện</div>
                          <div className="text-sm font-medium text-foreground">{channel.manager.representativePhone}</div>
                        </div>
                        
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Email</div>
                          <div className="text-sm font-medium text-foreground truncate">{channel.manager.email}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Bio Section */}
              <div>
                <h3 className="text-sm font-bold text-foreground mb-3">Giới thiệu</h3>
                <div className="bg-card border border-border rounded-lg p-4">
                  <p className="text-sm text-foreground/80 leading-relaxed">
                    Kênh chính thức của {channel.name} với {formatNumber(channel.followers)} followers. 
                    Chuyên về {channel.contentType.toLowerCase()}. Cập nhật nội dung thường xuyên với 
                    tỷ lệ tương tác cao và độ oхват rộng trên nền tảng {channel.platform}.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="space-y-5">
              {/* Engagement Stats */}
              <div>
                <h3 className="text-sm font-bold text-foreground mb-3">Chỉ số tương tác</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-card border border-border rounded-lg p-3">
                    <div className="text-xs text-muted-foreground mb-1">Lượt thích TB</div>
                    <div className="text-xl font-bold text-foreground">103.3K</div>
                    <div className="text-xs text-green-600 mt-0.5">+12.5%</div>
                  </div>
                  <div className="bg-card border border-border rounded-lg p-3">
                    <div className="text-xs text-muted-foreground mb-1">Bình luận TB</div>
                    <div className="text-xl font-bold text-foreground">2.8K</div>
                    <div className="text-xs text-green-600 mt-0.5">+8.3%</div>
                  </div>
                  <div className="bg-card border border-border rounded-lg p-3">
                    <div className="text-xs text-muted-foreground mb-1">Chia sẻ TB</div>
                    <div className="text-xl font-bold text-foreground">7.0K</div>
                    <div className="text-xs text-green-600 mt-0.5">+15.7%</div>
                  </div>
                  <div className="bg-card border border-border rounded-lg p-3">
                    <div className="text-xs text-muted-foreground mb-1">Lượt xem TB</div>
                    <div className="text-xl font-bold text-foreground">450K</div>
                    <div className="text-xs text-green-600 mt-0.5">+9.2%</div>
                  </div>
                </div>
              </div>

              {/* Gender Split */}
              <div>
                <h3 className="text-sm font-bold text-foreground mb-3">Giới tính</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">48%</div>
                    <div className="text-xs text-blue-700 mt-1">Nam</div>
                  </div>
                  <div className="bg-pink-50 border border-pink-100 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-pink-600">52%</div>
                    <div className="text-xs text-pink-700 mt-1">Nữ</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'content' && (
            <div className="space-y-5">
              {/* Highlighted Posts */}
              <div>
                <h3 className="text-sm font-bold text-foreground mb-3">Bài viết nổi bật</h3>
                
                <div className="space-y-3">
                  {highlightedPosts.map((post, index) => (
                    <div key={index} className="bg-card border border-border rounded-lg overflow-hidden">
                      <img src={post.image} alt="Post" className="w-full h-48 object-cover" />
                      <div className="p-3">
                        <p className="text-sm text-foreground/80 mb-2 line-clamp-2">{post.description}</p>
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Heart className="w-3.5 h-3.5 text-destructive" />
                            <span>{formatNumber(post.likes)}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MessageCircle className="w-3.5 h-3.5 text-blue-500" />
                            <span>{formatNumber(post.comments)}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Eye className="w-3.5 h-3.5 text-purple-500" />
                            <span>{formatNumber(post.views)}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Share2 className="w-3.5 h-3.5 text-green-500" />
                            <span>{formatNumber(post.shares)}</span>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground/70">{post.date}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Desktop Drawer - Hidden on mobile */}
      <div className="hidden md:block fixed right-0 top-0 h-full w-[800px] bg-card shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="border-b border-border bg-muted/50 px-[24px] pt-[24px] pb-[0px]">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start gap-4">
              <img
                src={channel.avatar}
                alt={channel.name}
                className="w-16 h-16 rounded-xl object-cover"
              />
              <div className="w-full">
                {/* Tên và Badges cùng dòng */}
                <div className="flex items-center gap-2 w-full">
                  <h2 className="text-xl font-semibold text-foreground">{channel.name}</h2>
                  
                  {/* Badge Xác thực - Icon only with tooltip */}
                  <div className="relative group">
                    <CheckCircle2 className="w-5 h-5 text-blue-500 cursor-pointer" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-foreground text-white text-xs rounded-lg whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all pointer-events-none z-50">
                      Xác thực
                      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
                    </div>
                  </div>
                  
                  {/* Badge Chứng chỉ - Icon only with tooltip */}
                  <div className="relative group">
                    <Award className="w-5 h-5 text-green-500 cursor-pointer" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-foreground text-white text-xs rounded-lg whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all pointer-events-none z-50">
                      Chứng chỉ
                      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
                    </div>
                  </div>
                </div>
                
                {/* Platform & Link */}
                <div className="flex items-center gap-2 mt-1 w-full">
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${platformConfig.bg}`}>
                    <PlatformIcon className={`w-3.5 h-3.5 ${platformConfig.color}`} />
                    <span className={`text-xs font-medium ${platformConfig.color}`}>{channel.platform}</span>
                  </div>
                  <span className="text-xs text-muted-foreground/70">•</span>
                  <span className="text-xs text-muted-foreground">{channel.contentType}</span>
                </div>

                {/* URL */}
                <a 
                  href={channel.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-primary hover:underline mt-2"
                >
                  <ExternalLink className="w-3 h-3" />
                  {channel.url}
                </a>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Report Button - Desktop */}
              <button
                onClick={() => setIsReportDialogOpen(true)}
                className="p-2 hover:bg-muted rounded-full transition-colors"
                title="Báo cáo kênh"
              >
                <Flag className="w-4 h-4 text-muted-foreground" />
              </button>
              <button
                onClick={onClose}
                className="text-muted-foreground/70 hover:text-muted-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-6 border-b border-border">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-1 pb-3 text-sm font-medium transition-all relative ${
                    activeTab === tab.id
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {activeTab === tab.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"></div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Overview Stats */}
              <div>
                <h3 className="text-base font-bold text-foreground mb-4">Thống kê</h3>
                <div className="grid grid-cols-4 gap-3">
                  {/* Followers */}
                  <div className="bg-gradient-to-br from-primary/10 to-white border border-primary/20 rounded-xl p-4">
                    <div className="text-xs font-medium text-muted-foreground mb-1">Người theo dõi</div>
                    <div className="text-2xl font-bold text-foreground">{formatNumber(channel.followers)}</div>
                    <div className="text-xs text-muted-foreground mt-1">Cập nhật: {channel.lastUpdated}</div>
                  </div>
                  
                  {/* Engagement */}
                  <div className="bg-card border border-border rounded-xl p-4">
                    <div className="text-xs font-medium text-muted-foreground mb-1">Tương tác</div>
                    <div className="text-2xl font-bold text-primary">9.2%</div>
                    <div className="text-xs text-green-600 mt-1">+12.5%</div>
                  </div>

                  {/* Avg Views */}
                  <div className="bg-card border border-border rounded-xl p-4">
                    <div className="text-xs font-medium text-muted-foreground mb-1">Lượt xem TB</div>
                    <div className="text-2xl font-bold text-foreground">450K</div>
                    <div className="text-xs text-green-600 mt-1">+8.3%</div>
                  </div>

                  {/* CPE */}
                  <div className="bg-card border border-border rounded-xl p-4">
                    <div className="text-xs font-medium text-muted-foreground mb-1">Chi phí/TT</div>
                    <div className="text-2xl font-bold text-green-600">đ85K</div>
                    <div className="text-xs text-muted-foreground mt-1">Mỗi tương tác</div>
                  </div>
                </div>
              </div>

              {/* Manager Info */}
              <div>
                <h3 className="text-base font-bold text-foreground mb-4">
                  {channel.manager.type === 'personal' ? 'Quản lý - Cá nhân' : 'Quản lý - Tổ chức'}
                </h3>
                <div className="bg-card border border-border rounded-xl p-5">
                  {channel.manager.type === 'personal' ? (
                    <div className="space-y-4">
                      <div className="flex items-start gap-3 pb-4 border-b border-border">
                        <User className="w-4 h-4 text-muted-foreground/70 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-muted-foreground mb-1">Họ và tên</div>
                          <div className="text-sm font-semibold text-foreground">{channel.manager.name}</div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-start gap-3">
                          <Calendar className="w-4 h-4 text-muted-foreground/70 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-muted-foreground mb-1">Ngày sinh</div>
                            <div className="text-sm font-medium text-foreground">{channel.manager.dob}</div>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-3">
                          <FileText className="w-4 h-4 text-muted-foreground/70 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-muted-foreground mb-1">CCCD</div>
                            <div className="text-sm font-medium text-foreground">{channel.manager.idNumber}</div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 pt-2 border-t border-border">
                        <MapPin className="w-4 h-4 text-muted-foreground/70 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-muted-foreground mb-1">Địa chỉ cư trú</div>
                          <div className="text-sm font-medium text-foreground">{channel.manager.address}</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
                        <div className="flex items-start gap-3">
                          <Phone className="w-4 h-4 text-muted-foreground/70 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-muted-foreground mb-1">Số điện thoại</div>
                            <div className="text-sm font-medium text-foreground">{channel.manager.phone}</div>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-3">
                          <Mail className="w-4 h-4 text-muted-foreground/70 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-muted-foreground mb-1">Email</div>
                            <div className="text-sm font-medium text-foreground truncate">{channel.manager.email}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-start gap-3 pb-4 border-b border-border">
                        <Building2 className="w-4 h-4 text-muted-foreground/70 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-muted-foreground mb-1">Tên tổ chức</div>
                          <div className="text-sm font-semibold text-foreground">{channel.manager.organizationName}</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-start gap-3">
                          <FileText className="w-4 h-4 text-muted-foreground/70 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-muted-foreground mb-1">Mã số thuế</div>
                            <div className="text-sm font-medium text-foreground">{channel.manager.taxCode}</div>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-3">
                          <Phone className="w-4 h-4 text-muted-foreground/70 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-muted-foreground mb-1">Số điện thoại</div>
                            <div className="text-sm font-medium text-foreground">{channel.manager.phone}</div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 pt-2 border-t border-border">
                        <MapPin className="w-4 h-4 text-muted-foreground/70 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-muted-foreground mb-1">Địa chỉ</div>
                          <div className="text-sm font-medium text-foreground">{channel.manager.address}</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
                        <div className="flex items-start gap-3">
                          <User className="w-4 h-4 text-muted-foreground/70 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-muted-foreground mb-1">Người đại diện</div>
                            <div className="text-sm font-medium text-foreground">{channel.manager.representative}</div>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-3">
                          <FileText className="w-4 h-4 text-muted-foreground/70 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-muted-foreground mb-1">Chức vụ</div>
                            <div className="text-sm font-medium text-foreground">{channel.manager.position}</div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
                        <div className="flex items-start gap-3">
                          <Phone className="w-4 h-4 text-muted-foreground/70 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-muted-foreground mb-1">SĐT người đại diện</div>
                            <div className="text-sm font-medium text-foreground">{channel.manager.representativePhone}</div>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-3">
                          <Mail className="w-4 h-4 text-muted-foreground/70 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-muted-foreground mb-1">Email</div>
                            <div className="text-sm font-medium text-foreground truncate">{channel.manager.email}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Bio Section */}
              <div>
                <h3 className="text-base font-bold text-foreground mb-4">Giới thiệu</h3>
                <div className="bg-card border border-border rounded-xl p-5">
                  <p className="text-sm text-foreground/80 leading-relaxed">
                    Kênh chính thức của {channel.name} với {formatNumber(channel.followers)} followers. 
                    Chuyên về {channel.contentType.toLowerCase()}. Cập nhật nội dung thường xuyên với 
                    tỷ lệ tương tác cao và độ oхват rộng trên nền tảng {channel.platform}.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="space-y-6">
              {/* Manager Info */}
              <div>
                <h3 className="text-base font-bold text-foreground mb-4">
                  {channel.manager.type === 'personal' ? 'Quản lý - Cá nhân' : 'Quản lý - Tổ chức'}
                </h3>
                <div className="bg-card border border-border rounded-xl p-5">
                  {channel.manager.type === 'personal' ? (
                    <div className="space-y-4">
                      <div className="flex items-start gap-3 pb-4 border-b border-border">
                        <User className="w-4 h-4 text-muted-foreground/70 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-muted-foreground mb-1">Họ và tên</div>
                          <div className="text-sm font-semibold text-foreground">{channel.manager.name}</div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-start gap-3">
                          <Calendar className="w-4 h-4 text-muted-foreground/70 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-muted-foreground mb-1">Ngày sinh</div>
                            <div className="text-sm font-medium text-foreground">{channel.manager.dob}</div>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-3">
                          <FileText className="w-4 h-4 text-muted-foreground/70 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-muted-foreground mb-1">CCCD</div>
                            <div className="text-sm font-medium text-foreground">{channel.manager.idNumber}</div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 pt-2 border-t border-border">
                        <MapPin className="w-4 h-4 text-muted-foreground/70 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-muted-foreground mb-1">Địa chỉ cư trú</div>
                          <div className="text-sm font-medium text-foreground">{channel.manager.address}</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
                        <div className="flex items-start gap-3">
                          <Phone className="w-4 h-4 text-muted-foreground/70 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-muted-foreground mb-1">Số điện thoại</div>
                            <div className="text-sm font-medium text-foreground">{channel.manager.phone}</div>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-3">
                          <Mail className="w-4 h-4 text-muted-foreground/70 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-muted-foreground mb-1">Email</div>
                            <div className="text-sm font-medium text-foreground truncate">{channel.manager.email}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-start gap-3 pb-4 border-b border-border">
                        <Building2 className="w-4 h-4 text-muted-foreground/70 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-muted-foreground mb-1">Tên tổ chức</div>
                          <div className="text-sm font-semibold text-foreground">{channel.manager.organizationName}</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-start gap-3">
                          <FileText className="w-4 h-4 text-muted-foreground/70 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-muted-foreground mb-1">Mã số thuế</div>
                            <div className="text-sm font-medium text-foreground">{channel.manager.taxCode}</div>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-3">
                          <Phone className="w-4 h-4 text-muted-foreground/70 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-muted-foreground mb-1">Số điện thoại</div>
                            <div className="text-sm font-medium text-foreground">{channel.manager.phone}</div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 pt-2 border-t border-border">
                        <MapPin className="w-4 h-4 text-muted-foreground/70 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-muted-foreground mb-1">Địa chỉ</div>
                          <div className="text-sm font-medium text-foreground">{channel.manager.address}</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
                        <div className="flex items-start gap-3">
                          <User className="w-4 h-4 text-muted-foreground/70 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-muted-foreground mb-1">Người đại diện</div>
                            <div className="text-sm font-medium text-foreground">{channel.manager.representative}</div>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-3">
                          <FileText className="w-4 h-4 text-muted-foreground/70 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-muted-foreground mb-1">Chức vụ</div>
                            <div className="text-sm font-medium text-foreground">{channel.manager.position}</div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
                        <div className="flex items-start gap-3">
                          <Phone className="w-4 h-4 text-muted-foreground/70 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-muted-foreground mb-1">SĐT người đại diện</div>
                            <div className="text-sm font-medium text-foreground">{channel.manager.representativePhone}</div>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-3">
                          <Mail className="w-4 h-4 text-muted-foreground/70 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-muted-foreground mb-1">Email</div>
                            <div className="text-sm font-medium text-foreground truncate">{channel.manager.email}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Bio Section */}
              <div>
                <h3 className="text-base font-bold text-foreground mb-4">Giới thiệu</h3>
                <div className="bg-card border border-border rounded-xl p-5">
                  <p className="text-sm text-foreground/80 leading-relaxed">
                    Kênh chính thức của {channel.name} với {formatNumber(channel.followers)} followers. 
                    Chuyên về {channel.contentType.toLowerCase()}. Cập nhật nội dung thường xuyên với 
                    tỷ lệ tương tác cao và độ oхват rộng trên nền tảng {channel.platform}.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="space-y-6">
              {/* Engagement Stats */}
              <div>
                <h3 className="text-base font-bold text-foreground mb-4">Chỉ số tương tác</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-card border border-border rounded-xl p-4">
                    <div className="text-xs text-muted-foreground mb-1">Lượt thích TB</div>
                    <div className="text-2xl font-bold text-foreground">103.3K</div>
                    <div className="text-xs text-green-600 mt-1">+12.5%</div>
                  </div>
                  <div className="bg-card border border-border rounded-xl p-4">
                    <div className="text-xs text-muted-foreground mb-1">Bình luận TB</div>
                    <div className="text-2xl font-bold text-foreground">2.8K</div>
                    <div className="text-xs text-green-600 mt-1">+8.3%</div>
                  </div>
                  <div className="bg-card border border-border rounded-xl p-4">
                    <div className="text-xs text-muted-foreground mb-1">Chia sẻ TB</div>
                    <div className="text-2xl font-bold text-foreground">7.0K</div>
                    <div className="text-xs text-green-600 mt-1">+15.7%</div>
                  </div>
                  <div className="bg-card border border-border rounded-xl p-4">
                    <div className="text-xs text-muted-foreground mb-1">Lượt xem TB</div>
                    <div className="text-2xl font-bold text-foreground">450K</div>
                    <div className="text-xs text-green-600 mt-1">+9.2%</div>
                  </div>
                </div>
              </div>

              {/* Gender Split */}
              <div>
                <h3 className="text-base font-bold text-foreground mb-4">Giới tính</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 text-center">
                    <div className="text-3xl font-bold text-blue-600">48%</div>
                    <div className="text-sm text-blue-700 mt-1">Nam</div>
                  </div>
                  <div className="bg-pink-50 border border-pink-100 rounded-xl p-5 text-center">
                    <div className="text-3xl font-bold text-pink-600">52%</div>
                    <div className="text-sm text-pink-700 mt-1">Nữ</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'content' && (
            <div className="space-y-6">
              {/* Highlighted Posts */}
              <div>
                <h3 className="text-base font-bold text-foreground mb-4">Bài viết nổi bật</h3>
                
                {/* Carousel */}
                <div className="relative">
                  <div 
                    ref={carouselRef}
                    className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  >
                    {highlightedPosts.map((post, index) => (
                      <div 
                        key={index}
                        className="flex-shrink-0 w-[280px] bg-card border border-border rounded-xl overflow-hidden snap-start"
                      >
                        <img 
                          src={post.image}
                          alt="Post"
                          className="w-full h-[280px] object-cover"
                        />
                        <div className="p-4">
                          <p className="text-sm text-foreground/80 mb-3 line-clamp-2">{post.description}</p>
                          <div className="grid grid-cols-2 gap-2 mb-3">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Heart className="w-3.5 h-3.5 text-destructive" />
                              <span>{formatNumber(post.likes)}</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <MessageCircle className="w-3.5 h-3.5 text-blue-500" />
                              <span>{formatNumber(post.comments)}</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Eye className="w-3.5 h-3.5 text-purple-500" />
                              <span>{formatNumber(post.views)}</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Share2 className="w-3.5 h-3.5 text-green-500" />
                              <span>{formatNumber(post.shares)}</span>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground/70">{post.date}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Navigation Buttons */}
                  {highlightedPosts.length > 1 && (
                    <>
                      <button
                        onClick={prevPost}
                        className="absolute left-0 top-1/3 -translate-y-1/2 -translate-x-3 w-10 h-10 bg-card rounded-full shadow-lg flex items-center justify-center hover:bg-muted/50 transition-all"
                      >
                        <ChevronLeft className="w-5 h-5 text-muted-foreground" />
                      </button>
                      <button
                        onClick={nextPost}
                        className="absolute right-0 top-1/3 -translate-y-1/2 translate-x-3 w-10 h-10 bg-card rounded-full shadow-lg flex items-center justify-center hover:bg-muted/50 transition-all"
                      >
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </button>
                    </>
                  )}
                </div>

                {/* Dots Indicator */}
                {highlightedPosts.length > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-4">
                    {highlightedPosts.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setActivePostIndex(index);
                          if (carouselRef.current) {
                            const cardWidth = 280 + 12;
                            carouselRef.current.scrollTo({
                              left: index * cardWidth,
                              behavior: 'smooth',
                            });
                          }
                        }}
                        className={`w-2 h-2 rounded-full transition-all ${
                          index === activePostIndex ? 'bg-primary w-6' : 'bg-muted-foreground/30'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Content Performance */}
              <div>
                <h3 className="text-base font-bold text-foreground mb-4">Hiệu suất nội dung</h3>
                <div className="bg-card border border-border rounded-xl p-5">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Tổng bài viết (30 ngày)</span>
                      <span className="text-sm font-medium text-foreground">24 posts</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Tần suất đăng bài</span>
                      <span className="text-sm font-medium text-foreground">5.6 posts/tuần</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Thời gian đăng tốt nhất</span>
                      <span className="text-sm font-medium text-foreground">19:00 - 21:00</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Ngày đăng tốt nhất</span>
                      <span className="text-sm font-medium text-foreground">Chủ nhật</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Report Dialog */}
      <ReportDialog
        isOpen={isReportDialogOpen}
        onClose={() => setIsReportDialogOpen(false)}
        targetType="channel"
        targetName={channel.name}
        onSubmit={(reason, description) => {
          console.log('Channel report submitted:', { reason, description, channelId: channel.id });
          // Handle report submission
        }}
      />
    </>
  );
}
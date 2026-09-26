import { X, Mail, FileText, User, TrendingUp, MapPin, Trophy, MessageCircle, Edit, Users, Phone, Calendar, Heart, Link2, Target, Image, DollarSign, Briefcase, AlertTriangle, GraduationCap, CheckCircle2, Copy, ChevronDown, ChevronLeft, ChevronRight, Award, Lock } from 'lucide-react';
import { useState, useRef } from 'react';

interface InfluencerDrawerProps {
  creator: {
    id: number;
    name: string;
    title: string;
    location: string;
    country: string;
    bio: string;
    profileImage: string;
    contentImages: string[];
    stats: {
      platform: 'youtube' | 'facebook' | 'twitter' | 'instagram' | 'tiktok';
      followers: string;
      engagement: string;
    }[];
    socialMedia: string[];
    categories: {
      name: string;
      medal: 'gold' | 'silver' | 'bronze';
    }[];
  } | null;
  isOpen: boolean;
  onClose: () => void;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export function InfluencerDrawer({ creator, isOpen, onClose, activeTab: propActiveTab = 'overview', onTabChange }: InfluencerDrawerProps) {
  const [localActiveTab, setLocalActiveTab] = useState<'details' | 'email' | 'notes' | 'personal' | 'violations'>('details');
  const [expandedPlatforms, setExpandedPlatforms] = useState<Set<string>>(new Set());
  const [activePostIndex, setActivePostIndex] = useState<Record<string, number>>({});
  const [selectedStatsPlatform, setSelectedStatsPlatform] = useState<string | null>(creator?.stats[0]?.platform || null);
  const carouselRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Use prop activeTab if provided, otherwise use local state
  const activeTab = propActiveTab as 'details' | 'email' | 'notes' | 'personal' | 'violations';

  const handleTabChange = (tab: 'details' | 'email' | 'notes' | 'personal' | 'violations') => {
    setLocalActiveTab(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  const togglePlatform = (platform: string) => {
    setExpandedPlatforms((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(platform)) {
        newSet.delete(platform);
      } else {
        newSet.add(platform);
      }
      return newSet;
    });
  };

  const nextPost = (platform: string, totalPosts: number) => {
    const newIndex = ((activePostIndex[platform] || 0) + 1) % totalPosts;
    setActivePostIndex((prev) => ({
      ...prev,
      [platform]: newIndex,
    }));
    
    // Scroll to the new card
    const carousel = carouselRefs.current[platform];
    if (carousel) {
      const cardWidth = 280 + 12; // width + gap
      carousel.scrollTo({
        left: newIndex * cardWidth,
        behavior: 'smooth',
      });
    }
  };

  const prevPost = (platform: string, totalPosts: number) => {
    const newIndex = ((activePostIndex[platform] || 0) - 1 + totalPosts) % totalPosts;
    setActivePostIndex((prev) => ({
      ...prev,
      [platform]: newIndex,
    }));
    
    // Scroll to the new card
    const carousel = carouselRefs.current[platform];
    if (carousel) {
      const cardWidth = 280 + 12; // width + gap
      carousel.scrollTo({
        left: newIndex * cardWidth,
        behavior: 'smooth',
      });
    }
  };

  // Mock highlighted posts data
  const platformPosts: Record<string, any[]> = {
    instagram: [
      {
        image: 'https://images.unsplash.com/photo-1758521540376-23c1b2f592d9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
        caption: 'Fashion week vibes 🔥 New collection launch with @brandname',
        date: '2 ngày trước',
        likes: '145K',
        comments: '2.8K',
        reach: '890K',
        impressions: '1.2M',
      },
      {
        image: 'https://images.unsplash.com/photo-1684247969270-87c01490a584?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
        caption: 'Behind the scenes 📸 Making magic happen!',
        date: '5 ngày trước',
        likes: '98K',
        comments: '1.9K',
        reach: '650K',
        impressions: '980K',
      },
      {
        image: 'https://images.unsplash.com/photo-1673533981698-a3d4fd4e5d64?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
        caption: 'Sunset moments ✨ Living my best life',
        date: '1 tuần trước',
        likes: '125K',
        comments: '2.3K',
        reach: '720K',
        impressions: '1.1M',
      },
    ],
    tiktok: [
      {
        image: 'https://images.unsplash.com/photo-1585049303349-6680e6179692?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
        caption: 'Viral trend challenge 🎵 #trending #viral',
        date: '1 ngày trước',
        likes: '280K',
        comments: '5.2K',
        reach: '2.1M',
        impressions: '3.5M',
      },
      {
        image: 'https://images.unsplash.com/photo-1618480066690-8457ab2b766e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
        caption: 'Day in my life 💫 Full routine',
        date: '3 ngày trước',
        likes: '195K',
        comments: '3.8K',
        reach: '1.8M',
        impressions: '2.9M',
      },
      {
        image: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
        caption: 'Dancing in the rain 🌧️ Feeling alive!',
        date: '6 ngày trước',
        likes: '220K',
        comments: '4.1K',
        reach: '1.9M',
        impressions: '3.2M',
      },
    ],
    youtube: [
      {
        image: 'https://images.unsplash.com/photo-1641851962761-43d3c1a34360?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
        caption: 'New vlog: Adventure time! 🌍 Exploring new places',
        date: '4 ngày trước',
        likes: '45K',
        comments: '1.2K',
        reach: '580K',
        impressions: '820K',
      },
      {
        image: 'https://images.unsplash.com/photo-1698521688714-dc482eb1c769?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
        caption: 'Tutorial: Master this skill in 10 minutes 🎯',
        date: '1 tuần trước',
        likes: '38K',
        comments: '890',
        reach: '420K',
        impressions: '680K',
      },
      {
        image: 'https://images.unsplash.com/photo-1626785774625-ddcddc3445e9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
        caption: 'Q&A Session: Answering your top questions! 💬',
        date: '2 tuần trước',
        likes: '52K',
        comments: '1.5K',
        reach: '510K',
        impressions: '750K',
      },
    ],
    facebook: [
      {
        image: 'https://images.unsplash.com/photo-1549733539-add955b1e47f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
        caption: 'Excited to share this amazing collaboration! 🎉',
        date: '3 ngày trước',
        likes: '68K',
        comments: '1.5K',
        reach: '450K',
        impressions: '720K',
      },
      {
        image: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
        caption: 'Throwback Thursday: Best moments from last year 📸',
        date: '5 ngày trước',
        likes: '55K',
        comments: '1.1K',
        reach: '380K',
        impressions: '650K',
      },
      {
        image: 'https://images.unsplash.com/photo-1487017159836-4e23ece2e4cf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
        caption: 'Weekend vibes with family and friends ❤️',
        date: '1 tuần trước',
        likes: '72K',
        comments: '1.8K',
        reach: '490K',
        impressions: '780K',
      },
    ],
  };

  if (!isOpen || !creator) return null;

  const tabs = [
    { id: 'details' as const, label: 'Chi tiết', icon: FileText },
    { id: 'personal' as const, label: 'Hồ sơ', icon: User },
    { id: 'email' as const, label: 'Nhắn tin', icon: MessageCircle },
    { id: 'notes' as const, label: 'Ghi chú', icon: Edit },
    { id: 'violations' as const, label: 'Vi phạm', icon: AlertTriangle },
  ];

  const getMedalStyle = (medal: 'gold' | 'silver' | 'bronze') => {
    switch (medal) {
      case 'gold':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-300',
          icon: 'text-yellow-500',
        };
      case 'silver':
        return {
          bg: 'bg-muted',
          border: 'border-border',
          icon: 'text-muted-foreground/70',
        };
      case 'bronze':
        return {
          bg: 'bg-primary/10',
          border: 'border-primary/40',
          icon: 'text-primary',
        };
    }
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-[55] transition-opacity"
        onClick={onClose}
      />

      {/* Mobile Bottom Sheet */}
      <div className="md:hidden fixed inset-x-0 bottom-0 z-[60] bg-card rounded-t-3xl shadow-2xl max-h-[90vh] flex flex-col animate-slide-up">
        {/* Drag Handle */}
        <div className="flex items-center justify-center pt-3 pb-2">
          <div className="w-12 h-1 bg-muted-foreground/30 rounded-full"></div>
        </div>

        {/* Mobile Header - Compact */}
        <div className="border-b border-border px-4 pb-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3 flex-1">
              <img
                src={creator.profileImage}
                alt={creator.name}
                className="w-12 h-12 rounded-xl object-cover"
              />
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-foreground truncate">{creator.name}</h2>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate">{creator.location}</span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 p-2 hover:bg-muted rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Mobile Tabs - Scrollable */}
          <div className="flex gap-4 overflow-x-auto scrollbar-hide -mx-4 px-4">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
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
        <div className={`flex-1 overflow-auto ${activeTab === 'email' ? 'flex flex-col' : 'p-4'}`}>
          {/* Account Locked Warning */}
          {(creator as any).accountStatus === 'locked' && (
            <div className="bg-destructive/10 border-l-4 border-destructive p-3 mb-4">
              <div className="flex items-start gap-2">
                <Lock className="w-5 h-5 text-destructive flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-destructive mb-1">Tài khoản đã bị khóa</h3>
                  <p className="text-xs text-destructive mb-2">
                    Creator này đã vi phạm chính sách và tài khoản đã bị khóa vĩnh viễn.
                  </p>
                  <button 
                    onClick={() => handleTabChange('violations')}
                    className="text-xs font-medium text-destructive hover:text-destructive underline"
                  >
                    Xem chi tiết →
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Details Tab Content */}
          {activeTab === 'details' && (
            <div className="space-y-5">
              {/* Overview Stats */}
              <div>
                <h3 className="text-sm font-bold text-foreground mb-3">Thống kê</h3>
                <div className="grid grid-cols-2 gap-2">
                  {/* Total Followers */}
                  <div className="bg-gradient-to-br from-primary/10 to-white border border-primary/20 rounded-xl p-3">
                    <div className="text-xs font-medium text-muted-foreground mb-1">Tổng người theo dõi</div>
                    <div className="text-xl font-bold text-foreground">
                      {(() => {
                        const total = creator.stats.reduce((sum, stat) => {
                          const num = parseFloat(stat.followers.replace(/[KM]/g, ''));
                          const multiplier = stat.followers.includes('M') ? 1000000 : 1000;
                          return sum + (num * multiplier);
                        }, 0);
                        return total >= 1000000 
                          ? `${(total / 1000000).toFixed(1)}M` 
                          : `${(total / 1000).toFixed(0)}K`;
                      })()}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">Trên {creator.stats.length} nền tảng</div>
                  </div>

                  {/* Average Engagement */}
                  <div className="bg-gradient-to-br from-primary/10 to-white border border-primary/20 rounded-xl p-3">
                    <div className="text-xs font-medium text-muted-foreground mb-1">Tương tác TB</div>
                    <div className="text-xl font-bold text-foreground">
                      {(() => {
                        const avg = creator.stats.reduce((sum, stat) => 
                          sum + parseFloat(stat.engagement), 0
                        ) / creator.stats.length;
                        return avg.toFixed(1) + '%';
                      })()}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">Tương tác cao</div>
                  </div>

                  {/* Total Posts */}
                  <div className="bg-gradient-to-br from-primary/10 to-white border border-primary/20 rounded-xl p-3">
                    <div className="text-xs font-medium text-muted-foreground mb-1">Tổng bài đăng</div>
                    <div className="text-xl font-bold text-foreground">{(creator as any).totalPosts}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Nội dung đa dạng</div>
                  </div>

                  {/* Real Followers */}
                  <div className="bg-gradient-to-br from-primary/10 to-white border border-primary/20 rounded-xl p-3">
                    <div className="text-xs font-medium text-muted-foreground mb-1">Người theo dõi thật</div>
                    <div className="text-xl font-bold text-green-600">87%</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Chất lượng tốt</div>
                  </div>
                </div>
              </div>

              {/* Platform Details */}
              <div>
                <h3 className="text-sm font-bold text-foreground mb-3">Chi tiết từng kênh</h3>
                <div className="space-y-3">
                  {creator.stats.map((stat) => {
                    const platformConfig = {
                      instagram: {
                        name: 'Instagram',
                        color: 'bg-gradient-to-br from-purple-600 via-pink-500 to-primary/70',
                        icon: (
                          <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                          </svg>
                        ),
                      },
                      tiktok: {
                        name: 'TikTok',
                        color: 'bg-black',
                        icon: (
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                            <path fill="#25F4EE" d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                          </svg>
                        ),
                      },
                      youtube: {
                        name: 'YouTube',
                        color: 'bg-destructive',
                        icon: (
                          <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                          </svg>
                        ),
                      },
                      facebook: {
                        name: 'Facebook',
                        color: 'bg-blue-600',
                        icon: (
                          <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                          </svg>
                        ),
                      }
                    };

                    const config = platformConfig[stat.platform] || platformConfig.instagram;

                    return (
                      <div key={stat.platform} className="bg-card border border-border rounded-lg overflow-hidden">
                        <div className="p-3">
                          {/* Platform Header */}
                          <div className="flex items-center gap-3 mb-3">
                            <div className={`w-10 h-10 ${config.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                              {config.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-foreground text-sm">{config.name}</div>
                              <div className="text-xs text-muted-foreground truncate">@{(creator as any).nickname}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-base font-bold text-foreground">{stat.followers}</div>
                              <div className="text-xs text-muted-foreground">Followers</div>
                            </div>
                          </div>

                          {/* Metrics Grid */}
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-muted/50 rounded-lg p-2">
                              <div className="text-xs text-muted-foreground mb-0.5">Tương tác</div>
                              <div className="text-sm font-bold text-primary">{stat.engagement}</div>
                            </div>
                            <div className="bg-muted/50 rounded-lg p-2">
                              <div className="text-xs text-muted-foreground mb-0.5">Bài đăng</div>
                              <div className="text-sm font-bold text-foreground">
                                {stat.platform === 'instagram' ? '420' : stat.platform === 'tiktok' ? '685' : stat.platform === 'youtube' ? '156' : '312'}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Personal Tab Content */}
          {activeTab === 'personal' && (
            <div className="space-y-4">
              {/* Verification Badges */}
              <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-lg p-3 border border-green-200">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-card rounded-lg p-2.5 shadow-sm">
                    <span className="text-xs text-muted-foreground block mb-1.5">Khóa học livestream</span>
                    <div className="flex items-center gap-1.5">
                      {(creator as any).livestreamCourse ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          <span className="text-xs font-semibold text-green-600">Đã tham gia</span>
                        </>
                      ) : (
                        <>
                          <X className="w-4 h-4 text-muted-foreground/70" />
                          <span className="text-xs font-medium text-muted-foreground">Chưa tham gia</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="bg-card rounded-lg p-2.5 shadow-sm">
                    <span className="text-xs text-muted-foreground block mb-1.5">Xác thực chính chủ</span>
                    <div className="flex items-center gap-1.5">
                      {(() => {
                        const nickname = (creator as any).nickname || '';
                        const isNotVerified = nickname === 'khoapug' || nickname === 'khoailangthang';
                        return isNotVerified ? (
                          <>
                            <X className="w-4 h-4 text-muted-foreground/70" />
                            <span className="text-xs font-medium text-muted-foreground">Chưa xác thực</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-blue-500" />
                            <span className="text-xs font-semibold text-blue-600">Đã xác thực</span>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Thông tin xác thực */}
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Thông tin xác thực</h3>
                </div>
                {(() => {
                  const nickname = (creator as any).nickname || '';
                  const isVerified = !(nickname === 'khoapug' || nickname === 'khoailangthang');
                  return isVerified ? (
                    <div className="space-y-2.5">
                      <div>
                        <span className="text-xs text-muted-foreground">Họ và tên</span>
                        <p className="text-sm font-medium text-foreground mt-0.5">{creator.name}</p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Giấy tờ (CMT/CCCD/Hộ chiếu)</span>
                        <p className="text-sm font-medium text-foreground mt-0.5">{(creator as any).idDocument || '079012345678'}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Chưa có thông tin xác thực</p>
                      <button className="w-full h-9 px-4 bg-primary text-white rounded-full text-sm font-medium hover:bg-primary/90 transition-colors">
                        Xác thực bằng VneID
                      </button>
                    </div>
                  );
                })()}
              </div>

              {/* Thông tin đăng ký */}
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-semibold text-foreground">Thông tin đăng ký</h3>
                  </div>
                </div>
                <div className="space-y-2.5">
                  <div>
                    <span className="text-xs text-muted-foreground">Biệt danh</span>
                    <p className="text-sm font-medium text-foreground mt-0.5">{(creator as any).nickname || '-'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Giới tính</span>
                    <p className="text-sm font-medium text-foreground mt-0.5">{(creator as any).gender || '-'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Ngày sinh</span>
                    <p className="text-sm font-medium text-foreground mt-0.5">{(creator as any).birthDate || '-'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Mô tả</span>
                    <p className="text-sm font-medium text-foreground mt-0.5 leading-relaxed">{creator.bio}</p>
                  </div>
                </div>
              </div>

              {/* Chi tiết liên hệ */}
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-3">
                  <Phone className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Chi tiết liên hệ</h3>
                </div>
                <div className="space-y-2.5">
                  <div>
                    <span className="text-xs text-muted-foreground">Số điện thoại</span>
                    <p className="text-sm font-medium text-foreground mt-0.5">-</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Email</span>
                    <p className="text-sm font-medium text-foreground mt-0.5">-</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Email Tab Content */}
          {activeTab === 'email' && (
            <>
              {/* Chat Messages (scrollable with padding) */}
              <div className="flex-1 overflow-y-auto p-4">
                {/* Chat Header */}
                <div className="bg-muted/50 rounded-lg p-2.5 mb-3 border border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-xs font-medium text-foreground">Đang hoạt động</span>
                    </div>
                    <span className="text-xs text-muted-foreground">Hôm nay</span>
                  </div>
                </div>

                {/* Chat Messages */}
                <div className="space-y-3">
                  {/* Brand Message */}
                  <div className="flex gap-2">
                    <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-semibold">B</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-baseline gap-1.5 mb-0.5">
                        <span className="text-xs font-semibold text-foreground">Brand XYZ</span>
                        <span className="text-xs text-muted-foreground">10:30</span>
                      </div>
                      <div className="bg-muted rounded-2xl rounded-tl-sm px-3 py-2 inline-block max-w-[85%]">
                        <p className="text-xs text-foreground">Xin chào! Chúng mình đang tìm kiếm KOL cho chiến dịch mới.</p>
                      </div>
                    </div>
                  </div>

                  {/* KOL Message */}
                  <div className="flex gap-2 flex-row-reverse">
                    <img src={creator.profileImage} alt={creator.name} className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                    <div className="flex-1 flex flex-col items-end">
                      <div className="flex items-baseline gap-1.5 mb-0.5 flex-row-reverse">
                        <span className="text-xs font-semibold text-foreground">{creator.name}</span>
                        <span className="text-xs text-muted-foreground">10:35</span>
                      </div>
                      <div className="bg-primary rounded-2xl rounded-tr-sm px-3 py-2 inline-block max-w-[85%]">
                        <p className="text-xs text-white">Chào bạn! Mình rất quan tâm đến dự án này 😊</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Message Input (fixed at bottom) */}
              <div className="border-t border-border p-3 bg-card">
                <div className="flex gap-2">
                  <textarea
                    rows={1}
                    placeholder="Nhập tin nhắn..."
                    className="flex-1 px-3 py-2 border border-border rounded-full focus:outline-none focus:ring-2 focus:ring-primary resize-none text-sm"
                  />
                  <button className="px-4 py-2 bg-primary text-white rounded-full hover:bg-primary/90 transition-all font-medium text-sm flex-shrink-0">
                    Gửi
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Notes Tab Content */}
          {activeTab === 'notes' && (
            <div className="space-y-3">
              <textarea
                rows={8}
                placeholder="Viết ghi chú..."
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm resize-none"
              />
              <button className="w-full px-4 py-2.5 bg-primary text-white rounded-full hover:bg-primary/90 transition-all font-medium text-sm">
                Lưu ghi chú
              </button>
            </div>
          )}

          {/* Violations Tab Content */}
          {activeTab === 'violations' && (
            <div className="space-y-3">
              {(creator as any).violationsList && (creator as any).violationsList.length > 0 ? (
                (creator as any).violationsList.map((violation: any, index: number) => (
                  <div key={index} className="bg-destructive/10 rounded-lg p-3 border border-destructive/30">
                    <div className="flex gap-2">
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-destructive/10 flex items-center justify-center">
                        <span className="text-xs font-semibold text-destructive">{index + 1}</span>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-foreground mb-1">{violation.title}</h4>
                        <p className="text-xs text-muted-foreground">{violation.description}</p>
                        <span className="text-xs text-muted-foreground mt-1 block">{violation.date}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-card rounded-lg p-4 text-center">
                  <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <p className="text-sm font-medium text-foreground">Không có vi phạm</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Desktop Drawer - Hidden on mobile */}
      <div className="hidden md:flex fixed right-0 top-0 h-full w-[800px] bg-card shadow-2xl z-[60] flex-col">
        {/* Header */}
        <div className="border-b border-border bg-muted/50 px-[24px] pt-[24px] pb-[0px]">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start gap-4">
              <img
                src={creator.profileImage}
                alt={creator.name}
                className="w-16 h-16 rounded-xl object-cover"
              />
              <div className="w-full">
                {/* Tên và Badges cùng dòng */}
                <div className="flex items-center gap-2 w-full">
                  <h2 className="text-xl font-semibold text-foreground">{creator.name}</h2>
                  
                  {/* Badge Xác thực - Icon only with tooltip - Hiển thị theo data */}
                  {(() => {
                    const nickname = (creator as any).nickname || '';
                    const isNotVerified = nickname === 'khoapug' || nickname === 'khoailangthang';
                    const isVerified = !isNotVerified;
                    
                    return isVerified ? (
                      <div className="relative group">
                        <CheckCircle2 className="w-5 h-5 text-blue-500 cursor-pointer" />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-foreground text-white text-xs rounded-lg whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all pointer-events-none z-50">
                          Xác thực
                          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
                        </div>
                      </div>
                    ) : null;
                  })()}
                  
                  {/* Badge Chứng chỉ - Icon only with tooltip - Hiển thị theo data */}
                  {(() => {
                    const hasLivestreamCourse = (creator as any).livestreamCourse || false;
                    
                    return hasLivestreamCourse ? (
                      <div className="relative group">
                        <Award className="w-5 h-5 text-green-500 cursor-pointer" />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-foreground text-white text-xs rounded-lg whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all pointer-events-none z-50">
                          Chứng chỉ
                          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
                        </div>
                      </div>
                    ) : null;
                  })()}
                </div>
                
                <div className="flex items-center gap-1.5 mt-1 w-full">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{creator.location}, {creator.country}</span>
                </div>
                {/* Categories */}
                <div className="flex flex-wrap gap-2 mt-3 w-full">
                  {creator.categories.map((category) => {
                    const style = getMedalStyle(category.medal);
                    return (
                      <div
                        key={category.name}
                        className={`flex items-center gap-1.5 px-3 py-1.5 ${style.bg} rounded-lg`}
                      >
                        <Trophy className={`w-3.5 h-3.5 ${style.icon}`} />
                        <span className="text-xs text-foreground font-medium">{category.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground/70 hover:text-muted-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-6 border-b border-border">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
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
        <div className={`flex-1 ${activeTab === 'email' ? 'flex flex-col overflow-hidden' : 'overflow-auto p-6'}`}>
          {/* Account Locked Warning - Shows at top of all tabs if account is locked */}
          {(creator as any).accountStatus === 'locked' && (
            <div className="bg-destructive/10 border-l-4 border-destructive p-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <Lock className="w-6 h-6 text-destructive" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-destructive mb-1">Tài khoản đã bị khóa</h3>
                  <p className="text-sm text-destructive mb-2">
                    Creator này đã vi phạm chính sách {(creator as any).violationsList?.length || 0} lần và tài khoản đã bị khóa vĩnh viễn. 
                    Không thể thực hiện hợp tác với creator này.
                  </p>
                  <button 
                    onClick={() => handleTabChange('violations')}
                    className="text-sm font-medium text-destructive hover:text-destructive underline"
                  >
                    Xem chi tiết vi phạm →
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Overview Stats */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-foreground">Thống kê</h3>
                  {/* Platform Filter Tabs */}
                  <div className="flex gap-2">
                    {creator.stats.slice(0, 2).map((stat) => {
                      const platformIcons = {
                        instagram: (
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                          </svg>
                        ),
                        tiktok: (
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                          </svg>
                        ),
                        youtube: (
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                          </svg>
                        ),
                        facebook: (
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                          </svg>
                        ),
                        twitter: (
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                          </svg>
                        ),
                      };
                      const platformNames: Record<string, string> = {
                        instagram: 'Instagram',
                        tiktok: 'Tiktok',
                        youtube: 'YouTube',
                        facebook: 'Facebook',
                        twitter: 'Twitter'
                      };
                      const platformColors: Record<string, string> = {
                        instagram: 'text-pink-600',
                        tiktok: 'text-foreground',
                        youtube: 'text-destructive',
                        facebook: 'text-blue-600',
                        twitter: 'text-blue-400',
                      };
                      const isActive = selectedStatsPlatform === stat.platform;
                      return (
                        <button
                          key={stat.platform}
                          onClick={() => setSelectedStatsPlatform(isActive ? null : stat.platform)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                            isActive
                              ? 'bg-card border-2 border-primary shadow-sm'
                              : 'bg-card border border-border hover:border-border hover:shadow-sm'
                          }`}
                        >
                          <span className={isActive ? 'text-primary' : (platformColors[stat.platform] || 'text-muted-foreground')}>
                            {platformIcons[stat.platform]}
                          </span>
                          <span className={isActive ? 'text-primary font-semibold' : 'text-foreground/80'}>{platformNames[stat.platform] || stat.platform}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {/* Total Followers */}
                  <div className="bg-gradient-to-br from-primary/10 to-white border border-primary/20 rounded-xl p-4">
                    <div className="text-xs font-medium text-muted-foreground mb-1">
                      {selectedStatsPlatform ? 'Người theo dõi' : 'Tổng người theo dõi'}
                    </div>
                    <div className="text-2xl font-bold text-foreground">
                      {(() => {
                        if (selectedStatsPlatform) {
                          const platformStat = creator.stats.find(s => s.platform === selectedStatsPlatform);
                          return platformStat?.followers || '0';
                        }
                        const total = creator.stats.reduce((sum, stat) => {
                          const num = parseFloat(stat.followers.replace(/[KM]/g, ''));
                          const multiplier = stat.followers.includes('M') ? 1000000 : 1000;
                          return sum + (num * multiplier);
                        }, 0);
                        return total >= 1000000 
                          ? `${(total / 1000000).toFixed(1)}M` 
                          : `${(total / 1000).toFixed(0)}K`;
                      })()}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {selectedStatsPlatform ? (
                        (() => {
                          const platformNames: Record<string, string> = {
                            instagram: 'Instagram',
                            tiktok: 'TikTok',
                            youtube: 'YouTube',
                            facebook: 'Facebook',
                            twitter: 'Twitter'
                          };
                          return `Trên ${platformNames[selectedStatsPlatform]}`;
                        })()
                      ) : (
                        `Trên ${creator.stats.length} nền tảng`
                      )}
                    </div>
                  </div>

                  {/* Average Engagement */}
                  <div className="bg-gradient-to-br from-primary/10 to-white border border-primary/20 rounded-xl p-4">
                    <div className="text-xs font-medium text-muted-foreground mb-1">
                      {selectedStatsPlatform ? 'Tương tác' : 'Tương tác TB'}
                    </div>
                    <div className="text-2xl font-bold text-foreground">
                      {(() => {
                        if (selectedStatsPlatform) {
                          const platformStat = creator.stats.find(s => s.platform === selectedStatsPlatform);
                          return platformStat?.engagement || '0%';
                        }
                        const avg = creator.stats.reduce((sum, stat) => 
                          sum + parseFloat(stat.engagement), 0
                        ) / creator.stats.length;
                        return avg.toFixed(1) + '%';
                      })()}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Tương tác cao</div>
                  </div>

                  {/* Total Posts */}
                  <div className="bg-gradient-to-br from-primary/10 to-white border border-primary/20 rounded-xl p-4">
                    <div className="text-xs font-medium text-muted-foreground mb-1">Tổng bài đăng</div>
                    <div className="text-2xl font-bold text-foreground">{(creator as any).totalPosts}</div>
                    <div className="text-xs text-muted-foreground mt-1">Nội dung đa dạng</div>
                  </div>

                  {/* Real Followers */}
                  <div className="bg-gradient-to-br from-primary/10 to-white border border-primary/20 rounded-xl p-4">
                    <div className="text-xs font-medium text-muted-foreground mb-1">Người theo dõi thật</div>
                    <div className="text-2xl font-bold text-green-600">87%</div>
                    <div className="text-xs text-muted-foreground mt-1">Chất lượng tốt</div>
                  </div>
                </div>

                {/* Engaged Audience Demographics */}
                <div className="mt-3 bg-card border-2 border-border rounded-xl p-4">
                  

                  <div className="grid grid-cols-4 gap-8">
                    {/* Cities */}
                    <div className="flex flex-col items-center">
                      <div className="flex items-center gap-1.5 mb-2.5">
                        <div className="w-2 h-2 rounded-full bg-primary"></div>
                        <span className="text-xs font-medium text-muted-foreground">Thành phố</span>
                      </div>
                      <div className="space-y-2 w-full">
                        {['Arlington Heig...', 'Hội An', 'Tp. Đà Lạt', 'Westminster', 'Hanoi'].map((city, idx) => (
                          <div key={city} className="flex items-center justify-between">
                            <span className="text-xs text-foreground/80">{city}</span>
                            <div className="flex items-center gap-1.5">
                              <div className="w-12 h-1 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-primary rounded-full" style={{ width: idx === 4 ? '60%' : '85%' }}></div>
                              </div>
                              <span className="text-xs font-medium text-foreground w-7 text-right">{idx === 4 ? '11' : '17'}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Countries */}
                    <div className="flex flex-col items-center">
                      <div className="flex items-center gap-1.5 mb-2.5">
                        <div className="w-2 h-2 rounded-full bg-primary"></div>
                        <span className="text-xs font-medium text-muted-foreground">Quốc gia</span>
                      </div>
                      <div className="space-y-2 w-full">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs">🇻🇳</span>
                            <span className="text-xs text-foreground/80">VN</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="w-12 h-1 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full" style={{ width: '68%' }}></div>
                            </div>
                            <span className="text-xs font-medium text-foreground w-7 text-right">68%</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs">🇺🇸</span>
                            <span className="text-xs text-foreground/80">US</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="w-12 h-1 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full" style={{ width: '26%' }}></div>
                            </div>
                            <span className="text-xs font-medium text-foreground w-7 text-right">26%</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs">🇩🇪</span>
                            <span className="text-xs text-foreground/80">DE</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="w-12 h-1 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full" style={{ width: '5%' }}></div>
                            </div>
                            <span className="text-xs font-medium text-foreground w-7 text-right">5%</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Age */}
                    <div className="flex flex-col items-center">
                      <div className="flex items-center gap-1.5 mb-2.5">
                        <div className="w-2 h-2 rounded-full bg-primary"></div>
                        <span className="text-xs font-medium text-muted-foreground">Độ tuổi</span>
                      </div>
                      <div className="space-y-2 w-full">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-foreground/80">0-17</span>
                          <div className="flex items-center gap-1.5">
                            <div className="w-12 h-1 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full" style={{ width: '57%' }}></div>
                            </div>
                            <span className="text-xs font-medium text-foreground w-7 text-right">57%</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-foreground/80">18-20</span>
                          <div className="flex items-center gap-1.5">
                            <div className="w-12 h-1 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full" style={{ width: '14%' }}></div>
                            </div>
                            <span className="text-xs font-medium text-foreground w-7 text-right">14%</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-foreground/80">21-24</span>
                          <div className="flex items-center gap-1.5">
                            <div className="w-12 h-1 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full" style={{ width: '29%' }}></div>
                            </div>
                            <span className="text-xs font-medium text-foreground w-7 text-right">29%</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Gender */}
                    <div className="flex flex-col items-center">
                      <div className="flex items-center gap-1.5 mb-2.5">
                        <div className="w-2 h-2 rounded-full bg-primary"></div>
                        <span className="text-xs font-medium text-muted-foreground">Giới tính</span>
                      </div>
                      <div className="space-y-3 w-full">
                        <div className="flex items-center justify-center gap-2">
                          <svg className="w-5 h-5 text-pink-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <circle cx="12" cy="8" r="4"/>
                            <line x1="12" y1="12" x2="12" y2="20"/>
                            <line x1="9" y1="17" x2="15" y2="17"/>
                          </svg>
                          <div className="font-bold text-foreground text-[16px]">47%</div>
                        </div>
                        <div className="flex items-center justify-center gap-2">
                          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <circle cx="12" cy="13" r="5"/>
                            <line x1="15.5" y1="9.5" x2="20" y2="5"/>
                            <line x1="17" y1="5" x2="20" y2="5"/>
                            <line x1="20" y1="5" x2="20" y2="8"/>
                          </svg>
                          <div className="font-bold text-foreground text-[16px]">53%</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Real Followers Badge */}
                  
                </div>
              </div>

              {/* Platform Details */}
              <div>
                <h3 className="text-base font-bold text-foreground mb-4">Chi tiết từng kênh</h3>
                <div className="space-y-3">
                  {creator.stats.map((stat) => {
                    const platformConfig = {
                      instagram: {
                        name: 'Instagram',
                        color: 'bg-gradient-to-br from-purple-600 via-pink-500 to-primary/70',
                        icon: (
                          <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                          </svg>
                        ),
                        avgMetric: 'Lượt thích TB',
                        avgValue: '285K',
                        cpe: '₫45,000'
                      },
                      tiktok: {
                        name: 'TikTok',
                        color: 'bg-black',
                        icon: (
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                            <path fill="#25F4EE" d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                          </svg>
                        ),
                        avgMetric: 'Lượt xem TB',
                        avgValue: '1.2M',
                        cpe: '₫38,000'
                      },
                      youtube: {
                        name: 'YouTube',
                        color: 'bg-destructive',
                        icon: (
                          <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                          </svg>
                        ),
                        avgMetric: 'Lượt xem TB',
                        avgValue: '450K',
                        cpe: '₫85,000'
                      },
                      facebook: {
                        name: 'Facebook',
                        color: 'bg-blue-600',
                        icon: (
                          <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                          </svg>
                        ),
                        avgMetric: 'Lượt thích TB',
                        avgValue: '180K',
                        cpe: '₫52,000'
                      }
                    };

                    const config = platformConfig[stat.platform] || platformConfig.instagram;
                    const posts = platformPosts[stat.platform] || [];
                    const isExpanded = expandedPlatforms.has(stat.platform);
                    const currentPostIndex = activePostIndex[stat.platform] || 0;
                    const currentPost = posts[currentPostIndex];

                    return (
                      <div key={stat.platform} className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                        <div 
                          className="p-4 cursor-pointer"
                          onClick={() => togglePlatform(stat.platform)}
                        >
                          {/* Platform Header */}
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 ${config.color} rounded-lg flex items-center justify-center`}>
                                {config.icon}
                              </div>
                              <div>
                                <div className="font-semibold text-foreground">{config.name}</div>
                                <div className="text-xs text-muted-foreground">@{(creator as any).nickname}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <div className="text-lg font-bold text-foreground">{stat.followers}</div>
                                <div className="text-xs text-muted-foreground">Người theo dõi</div>
                              </div>
                              <button
                                onClick={() => togglePlatform(stat.platform)}
                                className="p-2 hover:bg-muted rounded-lg transition-colors"
                              >
                                <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                              </button>
                            </div>
                          </div>

                          {/* Metrics Grid */}
                          <div className="grid grid-cols-4 gap-2">
                            <div className="bg-muted/50 rounded-lg p-2.5">
                              <div className="text-xs text-muted-foreground mb-1">Tương tác</div>
                              <div className="text-sm font-bold text-primary">{stat.engagement}</div>
                            </div>
                            <div className="bg-muted/50 rounded-lg p-2.5">
                              <div className="text-xs text-muted-foreground mb-1">{config.avgMetric}</div>
                              <div className="text-sm font-bold text-foreground">{config.avgValue}</div>
                            </div>
                            <div className="bg-muted/50 rounded-lg p-2.5">
                              <div className="text-xs text-muted-foreground mb-1">Bình luận TB</div>
                              <div className="text-sm font-bold text-foreground">
                                {stat.platform === 'instagram' ? '8.2K' : stat.platform === 'tiktok' ? '12.5K' : stat.platform === 'youtube' ? '5.1K' : '6.3K'}
                              </div>
                            </div>
                            <div className="bg-muted/50 rounded-lg p-2.5">
                              <div className="text-xs text-muted-foreground mb-1">Chi phí/TT</div>
                              <div className="text-sm font-bold text-green-600">{config.cpe}</div>
                            </div>
                          </div>

                          {/* Price Range */}
                          
                        </div>

                        {/* Expandable Posts Carousel */}
                        {isExpanded && posts.length > 0 && (
                          <div className="bg-muted/50 border-t border-border p-4">
                            <div className="mb-3 flex items-center justify-between">
                              <h4 className="text-sm font-semibold text-foreground">Bài viết nổi bật</h4>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => prevPost(stat.platform, posts.length)}
                                  className="p-1.5 hover:bg-card rounded-lg transition-colors"
                                >
                                  <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                                </button>
                                <span className="text-xs text-muted-foreground">
                                  {currentPostIndex + 1} / {posts.length}
                                </span>
                                <button
                                  onClick={() => nextPost(stat.platform, posts.length)}
                                  className="p-1.5 hover:bg-card rounded-lg transition-colors"
                                >
                                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                </button>
                              </div>
                            </div>

                            {/* Posts Carousel Container */}
                            <div 
                              ref={(el) => (carouselRefs.current[stat.platform] = el)}
                              className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {posts.map((post, idx) => (
                                <div key={idx} className="flex-shrink-0 w-[280px] snap-start">
                                  {/* Post Card */}
                                  <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                    {/* Engagement Badge */}
                                    <div className="px-4 pt-3 pb-2">
                                      <div className="text-sm">
                                        <span className="font-bold text-primary">{post.engagement || '0.8%'}</span>
                                        <span className="text-muted-foreground"> tương tác</span>
                                      </div>
                                    </div>

                                    {/* Post Image */}
                                    <div className="relative aspect-square w-full bg-muted">
                                      <img
                                        src={post.image}
                                        alt="Post"
                                        className="w-full h-full object-cover"
                                      />
                                    </div>

                                    {/* Post Info */}
                                    <div className="p-4">
                                      {/* Metrics Grid */}
                                      <div className="space-y-2 mb-3">
                                        {/* Row 1: Likes, Comments, Shares */}
                                        <div className="flex items-center gap-3 text-xs">
                                          <div className="flex items-center gap-1.5">
                                            <span className="font-bold text-foreground">1.2M</span>
                                            <span className="text-muted-foreground">lượt xem</span>
                                          </div>
                                          <div className="flex items-center gap-1.5">
                                            <Heart className="w-3.5 h-3.5 text-destructive" />
                                            <span className="font-bold text-foreground">{post.likes}</span>
                                            
                                          </div>
                                          <div className="flex items-center gap-1.5">
                                            <MessageCircle className="w-3.5 h-3.5 text-blue-500" />
                                            <span className="font-bold text-foreground">{post.comments}</span>
                                            
                                          </div>
                                          <div className="flex items-center gap-1.5">
                                            <TrendingUp className="w-3.5 h-3.5 text-green-500" />
                                            <span className="font-bold text-foreground">97</span>
                                            
                                          </div>
                                        </div>

                                        {/* Row 2: Impressions and Reach */}
                                        <div className="flex items-center gap-4 text-xs">
                                          <div>
                                            <span className="font-bold text-foreground">{post.impressions}</span>
                                            <span className="text-muted-foreground"> lượt hiển thị</span>
                                          </div>
                                          <div>
                                            <span className="font-bold text-foreground">{post.reach}</span>
                                            <span className="text-muted-foreground"> lượt tiếp cận</span>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Divider */}
                                      <div className="border-t border-border my-3"></div>

                                      {/* Caption */}
                                      <p className="text-sm text-foreground mb-2 line-clamp-2">
                                        <span className="font-bold">{creator.name.toLowerCase().replace(/\s+/g, '')}.official</span>{' '}
                                        {post.caption}
                                      </p>

                                      {/* Timestamp */}
                                      <div className="text-right">
                                        <span className="text-xs text-muted-foreground">{post.date}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Navigation Dots */}
                            {posts.length > 1 && (
                              <div className="flex justify-center gap-1.5 mt-3" onClick={(e) => e.stopPropagation()}>
                                {posts.map((_, idx) => (
                                  <button
                                    key={idx}
                                    onClick={() => setActivePostIndex((prev) => ({ ...prev, [stat.platform]: idx }))}
                                    className={`h-1.5 rounded-full transition-all ${
                                      idx === currentPostIndex
                                        ? 'w-6 bg-primary'
                                        : 'w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                                    }`}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bio */}
              {/* ... remove this code ... */}

              {/* Content Preview */}
              
            </div>
          )}

          {activeTab === 'email' && (
            <>
              {/* Chat Header + Messages (scrollable with padding) */}
              <div className="flex-1 overflow-y-auto p-6">
                {/* Chat Header */}
                <div className="bg-muted/50 rounded-lg p-3 mb-4 border border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium text-foreground">Đang hoạt động</span>
                    </div>
                    <span className="text-xs text-muted-foreground">Hôm nay</span>
                  </div>
                </div>

                {/* Chat Messages */}
                <div className="space-y-4">
                  {/* Brand Message 1 */}
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-semibold">B</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-sm font-semibold text-foreground">Brand XYZ</span>
                        <span className="text-xs text-muted-foreground">10:30</span>
                      </div>
                      <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-2.5 inline-block max-w-[85%]">
                        <p className="text-sm text-foreground">Xin chào! Chúng mình đang tìm kiếm KOL cho chiến dịch ra mắt sản phẩm mới vào tháng sau. Bạn có thể làm việc trong khoảng thời gian này không?</p>
                      </div>
                    </div>
                  </div>

                  {/* KOL Message 1 */}
                  <div className="flex gap-3 flex-row-reverse">
                    <img
                      src={creator.profileImage}
                      alt={creator.name}
                      className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                    />
                    <div className="flex-1 flex flex-col items-end">
                      <div className="flex items-baseline gap-2 mb-1 flex-row-reverse">
                        <span className="text-sm font-semibold text-foreground">{creator.name}</span>
                        <span className="text-xs text-muted-foreground">10:35</span>
                      </div>
                      <div className="bg-primary rounded-2xl rounded-tr-sm px-4 py-2.5 inline-block max-w-[85%]">
                        <p className="text-sm text-white">Chào bạn! Mình rất quan tâm đến dự án này. Bạn có thể chia sẻ thêm về sản phẩm và timeline cụ thể được không? 😊</p>
                      </div>
                    </div>
                  </div>

                  {/* Brand Message 2 */}
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-semibold">B</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-sm font-semibold text-foreground">Brand XYZ</span>
                        <span className="text-xs text-muted-foreground">10:38</span>
                      </div>
                      <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-2.5 inline-block max-w-[85%]">
                        <p className="text-sm text-foreground">Chúng mình sẽ ra mắt dòng sản phẩm skincare organic. Timeline dự kiến:</p>
                      </div>
                      <div className="bg-muted rounded-2xl px-4 py-2.5 inline-block max-w-[85%] mt-1">
                        <ul className="text-sm text-foreground space-y-1">
                          <li>• Tuần 1-2: Briefing & concept</li>
                          <li>• Tuần 3: Review content</li>
                          <li>• Tuần 4: Go live trên các platform</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* KOL Message 2 */}
                  <div className="flex gap-3 flex-row-reverse">
                    <img
                      src={creator.profileImage}
                      alt={creator.name}
                      className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                    />
                    <div className="flex-1 flex flex-col items-end">
                      <div className="flex items-baseline gap-2 mb-1 flex-row-reverse">
                        <span className="text-sm font-semibold text-foreground">{creator.name}</span>
                        <span className="text-xs text-muted-foreground">10:42</span>
                      </div>
                      <div className="bg-primary rounded-2xl rounded-tr-sm px-4 py-2.5 inline-block max-w-[85%]">
                        <p className="text-sm text-white">Hoàn hảo! Mình có kinh nghiệm làm campaign beauty & wellness. Về platforms, mình có thể đăng trên YouTube và Instagram với estimated reach 500K+ cho cả 2 nền tảng.</p>
                      </div>
                    </div>
                  </div>

                  {/* Brand Message 3 */}
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-semibold">B</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-sm font-semibold text-foreground">Brand XYZ</span>
                        <span className="text-xs text-muted-foreground">10:45</span>
                      </div>
                      <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-2.5 inline-block max-w-[85%]">
                        <p className="text-sm text-foreground">Tuyệt vời! Bạn có thể gửi rate card và portfolio những campaign gần đây nhất không? Mình sẽ schedule meeting để discuss chi tiết hơn.</p>
                      </div>
                    </div>
                  </div>

                  {/* KOL Message 3 */}
                  <div className="flex gap-3 flex-row-reverse">
                    <img
                      src={creator.profileImage}
                      alt={creator.name}
                      className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                    />
                    <div className="flex-1 flex flex-col items-end">
                      <div className="flex items-baseline gap-2 mb-1 flex-row-reverse">
                        <span className="text-sm font-semibold text-foreground">{creator.name}</span>
                        <span className="text-xs text-muted-foreground">10:48</span>
                      </div>
                      <div className="bg-primary rounded-2xl rounded-tr-sm px-4 py-2.5 inline-block max-w-[85%]">
                        <p className="text-sm text-white">Được ạ! Mình sẽ gửi rate card và case studies qua email trong 30 phút nữa. Bạn có sẵn lịch nào tuần sau để meeting không? 📧</p>
                      </div>
                    </div>
                  </div>

                  {/* Typing Indicator */}
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-semibold">B</span>
                    </div>
                    <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-2 inline-block">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Input Area - Fixed at bottom */}
              <div className="border-t border-border px-6 py-4 bg-card">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Nhập tin nhắn..."
                    className="flex-1 px-4 py-2.5 border border-border rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                  <button className="px-5 py-2.5 bg-primary text-white rounded-full hover:bg-primary/90 transition-all font-medium flex items-center gap-2">
                    <MessageCircle className="w-4 h-4" />
                    <span>Gửi</span>
                  </button>
                </div>
              </div>
            </>
          )}

          {activeTab === 'notes' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-2">
                  Ghi chú của bạn
                </label>
                <textarea
                  rows={12}
                  placeholder="Viết ghi chú về influencer này..."
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                />
              </div>
              <button className="w-full px-4 py-2.5 bg-primary text-white rounded-full hover:bg-primary/90 transition-all font-medium">
                Lưu ghi chú
              </button>
            </div>
          )}

          {activeTab === 'violations' && (
            <div className="space-y-4">
              <div className="bg-destructive/10 rounded-lg p-4 border border-destructive/30">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                    <h3 className="text-sm font-semibold text-foreground">Lịch sử vi phạm</h3>
                  </div>
                  
                </div>
                <div className="space-y-2">
                  {(creator as any).violationsList && (creator as any).violationsList.length > 0 ? (
                    (creator as any).violationsList.map((violation: any, index: number) => (
                      <div key={index} className="bg-card rounded-lg p-3 border border-destructive/30">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-destructive/10 flex items-center justify-center">
                            <span className="text-xs font-semibold text-destructive">{index + 1}</span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="text-sm font-semibold text-foreground">{violation.title}</h4>
                              <span className="text-xs text-muted-foreground">{violation.date}</span>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">{violation.description}</p>
                            {violation.status && (
                              <div className="mt-2">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                  violation.status === 'Đã xử lý' 
                                    ? 'bg-green-100 text-green-700' 
                                    : violation.status === 'Đang xử lý'
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : 'bg-destructive/10 text-destructive'
                                }`}>
                                  {violation.status}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="bg-card rounded-lg p-4 text-center">
                      <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
                      <p className="text-sm font-medium text-foreground">Không có vi phạm</p>
                      <p className="text-xs text-muted-foreground mt-1">Creator này có hồ sơ sạch</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'personal' && (
            <div className="space-y-5">
              {/* Verification Badges Section - Highlighted at Top */}
              <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-lg p-4 border border-green-200">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-card rounded-lg p-3 shadow-sm">
                    <span className="text-xs text-muted-foreground block mb-2">Khóa học livestream</span>
                    <div className="flex items-center gap-2">
                      {(creator as any).livestreamCourse ? (
                        <>
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                          <span className="text-sm font-semibold text-green-600">Đã tham gia</span>
                        </>
                      ) : (
                        <>
                          <X className="w-5 h-5 text-muted-foreground/70" />
                          <span className="text-sm font-medium text-muted-foreground">Chưa tham gia</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="bg-card rounded-lg p-3 shadow-sm">
                    <span className="text-xs text-muted-foreground block mb-2">Xác thực chính chủ</span>
                    <div className="flex items-center gap-2">
                      {(() => {
                        // Demo: Chỉ Khoa Pug và Khoai Lang Thang là chưa xác thực
                        const nickname = (creator as any).nickname || '';
                        const isNotVerified = nickname === 'khoapug' || nickname === 'khoailangthang';
                        
                        return isNotVerified ? (
                          <>
                            <X className="w-5 h-5 text-muted-foreground/70" />
                            <span className="text-sm font-medium text-muted-foreground">Chưa xác thực</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-5 h-5 text-blue-500" />
                            <span className="text-sm font-semibold text-blue-600">Đã xác thực</span>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Creator Information Section */}
              {/* Thông tin xác thực */}
              <div className="bg-muted/50 rounded-lg p-4">
                {(() => {
                  // Demo: Chỉ Khoa Pug và Khoai Lang Thang là chưa xác thực
                  const nickname = (creator as any).nickname || '';
                  const isNotVerified = nickname === 'khoapug' || nickname === 'khoailangthang';
                  const isVerified = !isNotVerified;
                  
                  return (
                    <>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-primary" />
                          <h3 className="text-sm font-semibold text-foreground">Thông tin xác thực</h3>
                        </div>
                        {isVerified && (
                          null
                        )}
                      </div>
                      
                      {isVerified ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                            <div>
                              <span className="text-xs text-muted-foreground">Họ và tên</span>
                              <p className="text-sm font-medium text-foreground mt-0.5">{creator.name}</p>
                            </div>
                            <div>
                              <span className="text-xs text-muted-foreground">Giấy tờ (CMT/CCCD/Hộ chiếu)</span>
                              <p className="text-sm font-medium text-foreground mt-0.5">{(creator as any).idDocument || '079012345678'}</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-sm text-muted-foreground">Chưa có thông tin xác thực</p>
                          <button className="h-10 px-4 bg-primary text-white rounded-full text-sm font-medium hover:bg-primary/90 transition-colors">
                            Xác thực bằng VneID
                          </button>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Thông tin đăng ký */}
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-semibold text-foreground">Thông tin đăng ký</h3>
                  </div>
                  
                </div>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                    {/* Dòng 1: Biệt danh | Giới tính */}
                    <div>
                      <span className="text-xs text-muted-foreground">Biệt danh</span>
                      <p className="text-sm font-medium text-foreground mt-0.5">{(creator as any).nickname || '-'}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Giới tính</span>
                      <p className="text-sm font-medium text-foreground mt-0.5">{(creator as any).gender || '-'}</p>
                    </div>
                    
                    {/* Dòng 2: Ngày sinh | Tình trạng hôn nhân */}
                    <div>
                      <span className="text-xs text-muted-foreground">Ngày sinh</span>
                      <p className="text-sm font-medium text-foreground mt-0.5">{(creator as any).birthDate || '-'}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Tình trạng hôn nhân</span>
                      <p className="text-sm font-medium text-foreground mt-0.5">{(creator as any).maritalStatus || '-'}</p>
                    </div>
                  </div>
                  
                  {/* Mô tả */}
                  <div>
                    <span className="text-xs text-muted-foreground">Mô tả</span>
                    <p className="text-sm font-medium text-foreground mt-0.5 leading-relaxed">{creator.bio}</p>
                  </div>
                </div>
              </div>

              {/* Contact Details Section */}
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-semibold text-foreground">Chi tiết liên hệ</h3>
                  </div>
                  
                </div>
                <div className="space-y-3">
                  <div>
                    <span className="text-xs text-muted-foreground">Số điện thoại</span>
                    <p className="text-sm font-medium text-foreground mt-0.5">-</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Email</span>
                    <p className="text-sm font-medium text-foreground mt-0.5">-</p>
                  </div>
                </div>
              </div>

              {/* Social Links Section */}
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-semibold text-foreground">Link mạng xã hội</h3>
                  </div>
                  
                </div>
                <div className="space-y-2.5">
                  {(creator as any).socialLinks && Object.entries((creator as any).socialLinks).map(([platform, link]: [string, any]) => (
                    <div key={platform} className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground capitalize">{platform}</span>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-foreground">{link || '-'}</p>
                        <button className="text-muted-foreground/70 hover:text-primary">
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {!(creator as any).socialLinks && <p className="text-sm text-muted-foreground">-</p>}
                </div>
              </div>

              {/* Professional Info Section */}
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-semibold text-foreground">Thông tin nghề nghiệp</h3>
                  </div>
                  
                </div>
                <div className="space-y-3">
                  <div>
                    <span className="text-xs text-muted-foreground">Lĩnh vực ảnh hưởng</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {(creator as any).influenceField?.map((field: string) => (
                        <span key={field} className="px-2 py-0.5 bg-card text-xs text-foreground/80 rounded-full border border-border">
                          {field}
                        </span>
                      )) || <p className="text-sm text-muted-foreground">-</p>}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                    <div>
                      <span className="text-xs text-muted-foreground">Lượng follower</span>
                      <p className="text-sm font-medium text-foreground mt-0.5">
                        {creator.stats.reduce((sum, stat) => {
                          const followers = parseFloat(stat.followers.replace(/[KM]/g, ''));
                          const multiplier = stat.followers.includes('M') ? 1000000 : stat.followers.includes('K') ? 1000 : 1;
                          return sum + (followers * multiplier);
                        }, 0).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Lượng bài viết</span>
                      <p className="text-sm font-medium text-foreground mt-0.5">{(creator as any).totalPosts || '-'}</p>
                    </div>
                  </div>
                  
                </div>
              </div>

              {/* Booking Services Section */}
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-semibold text-foreground">Dịch vụ booking</h3>
                  </div>
                  
                </div>
                <div className="flex flex-wrap gap-2">
                  {(creator as any).bookingServices?.map((service: string) => (
                    <span key={service} className="px-3 py-1.5 bg-card text-xs text-foreground/80 rounded-lg border border-border font-medium">
                      {service}
                    </span>
                  )) || <p className="text-sm text-muted-foreground">-</p>}
                </div>
              </div>

              {/* Additional Info Section */}
              
            </div>
          )}
        </div>
      </div>
    </>
  );
}
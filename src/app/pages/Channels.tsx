import { useState, useRef, useEffect } from 'react';
import { Plus, Tv, ExternalLink, User, Building2, Facebook, Youtube, ChevronDown, ChevronUp, Search, X, MoreVertical, Bookmark, Flag } from 'lucide-react';
import { FilterBar } from '../components/FilterBar';
import { ChannelDrawer } from '../components/ChannelDrawer';
import { ReportDialog } from '../components/ReportDialog';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { profileImages } from '../data/images';

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
  avatar: string | { default: string };
  manager: PersonalManager | OrganizationManager;
  platform: 'Facebook' | 'TikTok' | 'YouTube' | 'Instagram';
  contentType: string;
  followers: number;
  lastUpdated: string;
}

const platformIcons: Record<string, { icon: any; color: string; bg: string }> = {
  Facebook: { icon: Facebook, color: 'text-blue-600', bg: 'bg-blue-50' },
  YouTube: { icon: Youtube, color: 'text-destructive', bg: 'bg-destructive/10' },
  TikTok: { icon: Tv, color: 'text-foreground', bg: 'bg-muted' },
  Instagram: { icon: User, color: 'text-pink-600', bg: 'bg-pink-50' },
};

export function Channels() {
  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [selectedManagerType, setSelectedManagerType] = useState<string>('all');
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
  const dropdownRefs = useRef<{[key: number]: HTMLDivElement | null}>({});
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdownId !== null) {
        const dropdownElement = dropdownRefs.current[openDropdownId];
        if (dropdownElement && !dropdownElement.contains(event.target as Node)) {
          setOpenDropdownId(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdownId]);

  const handleChannelClick = (channel: Channel) => {
    setSelectedChannel(channel);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedChannel(null);
  };
  
  const channels: Channel[] = [
    {
      id: 1,
      name: 'Khánh Vy',
      url: 'https://youtube.com/@khanhvy',
      avatar: profileImages.img01,
      manager: {
        type: 'personal',
        name: 'Bùi Phương Khánh Vy',
        dob: '30/03/1999',
        idNumber: '079099001122',
        address: '123 Nguyễn Huệ, Quận 1, TP.HCM',
        phone: '0909123456',
        email: 'khanhvy.official@gmail.com'
      },
      platform: 'YouTube',
      contentType: 'Giáo dục, MC, Tiếng Anh',
      followers: 1200000,
      lastUpdated: '09/03/2026'
    },
    {
      id: 2,
      name: 'Giang Ơi',
      url: 'https://youtube.com/@giangoi',
      avatar: profileImages.img02,
      manager: {
        type: 'personal',
        name: 'Hà Hoàng Giang',
        dob: '15/08/1994',
        idNumber: '001094002233',
        address: '45 Hoàng Diệu, Ba Đình, Hà Nội',
        phone: '0904567890',
        email: 'giangoi.official@gmail.com'
      },
      platform: 'YouTube',
      contentType: 'Lifestyle, Phát triển bản thân, Podcast',
      followers: 890000,
      lastUpdated: '09/03/2026'
    },
    {
      id: 3,
      name: 'Khoai Lang Thang',
      url: 'https://youtube.com/@khoailangthang',
      avatar: profileImages.img03,
      manager: {
        type: 'personal',
        name: 'Đinh Võ Hoàng Yến',
        dob: '12/06/1993',
        idNumber: '001093003344',
        address: '78 Láng Hạ, Đống Đa, Hà Nội',
        phone: '0906789012',
        email: 'khoailangthang@gmail.com'
      },
      platform: 'YouTube',
      contentType: 'Du lịch, Văn hóa, Khám phá',
      followers: 2800000,
      lastUpdated: '09/03/2026'
    },
    {
      id: 4,
      name: 'Chan La Cà',
      url: 'https://youtube.com/@chanlaca',
      avatar: profileImages.img04,
      manager: {
        type: 'personal',
        name: 'Nguyễn Thị Lan',
        dob: '22/06/1995',
        idNumber: '079095004455',
        address: '234 Lê Lai, Quận 1, TP.HCM',
        phone: '0908901234',
        email: 'chanlaca.official@gmail.com'
      },
      platform: 'YouTube',
      contentType: 'Du lịch, Ẩm thực, Food Review',
      followers: 2800000,
      lastUpdated: '09/03/2026'
    },
    {
      id: 5,
      name: 'Ẩm Thực Mẹ Làm',
      url: 'https://youtube.com/@amthucmelam',
      avatar: profileImages.img05,
      manager: {
        type: 'personal',
        name: 'Nguyễn Thị Hương',
        dob: '10/04/1982',
        idNumber: '001082005566',
        address: '567 Hoàng Mai, Đống Đa, Hà Nội',
        phone: '0903456789',
        email: 'amthucmelam@gmail.com'
      },
      platform: 'YouTube',
      contentType: 'Nấu ăn, Ẩm thực, Gia đình',
      followers: 3500000,
      lastUpdated: '09/03/2026'
    },
    {
      id: 6,
      name: 'Châu Bùi',
      url: 'https://instagram.com/chaubui',
      avatar: profileImages.img06,
      manager: {
        type: 'personal',
        name: 'Bùi Thái Bảo Châu',
        dob: '25/09/1997',
        idNumber: '079097006677',
        address: '890 Nguyễn Đình Chiểu, Quận 3, TP.HCM',
        phone: '0909876543',
        email: 'chaubui.official@gmail.com'
      },
      platform: 'Instagram',
      contentType: 'Fashion, Lifestyle, Beauty',
      followers: 2900000,
      lastUpdated: '09/03/2026'
    },
    {
      id: 7,
      name: 'Cô Em Trendy',
      url: 'https://tiktok.com/@coemtrendy',
      avatar: profileImages.img07,
      manager: {
        type: 'personal',
        name: 'Lê Thị Thanh Trúc',
        dob: '18/12/1998',
        idNumber: '079098007788',
        address: '456 Phan Xích Long, Phú Nhuận, TP.HCM',
        phone: '0905432109',
        email: 'coemtrendy@gmail.com'
      },
      platform: 'TikTok',
      contentType: 'Fashion, Lifestyle, Shopping',
      followers: 6200000,
      lastUpdated: '09/03/2026'
    },
    {
      id: 8,
      name: 'Lê Hà Trúc',
      url: 'https://youtube.com/@lehatruc',
      avatar: profileImages.img08,
      manager: {
        type: 'personal',
        name: 'Lê Hà Trúc',
        dob: '05/11/1996',
        idNumber: '001096008899',
        address: '234 Tây Sơn, Đống Đa, Hà Nội',
        phone: '0907654321',
        email: 'lehatruc.beauty@gmail.com'
      },
      platform: 'YouTube',
      contentType: 'Beauty, Skincare, Tutorial',
      followers: 2300000,
      lastUpdated: '09/03/2026'
    },
    {
      id: 9,
      name: 'Thuỳ Trang (Suzy)',
      url: 'https://youtube.com/@suzythuytrang',
      avatar: profileImages.img09,
      manager: {
        type: 'personal',
        name: 'Nguyễn Thuỳ Trang',
        dob: '28/07/1997',
        idNumber: '079097009900',
        address: '678 Võ Văn Tần, Quận 3, TP.HCM',
        phone: '0902345678',
        email: 'suzythuytrang@gmail.com'
      },
      platform: 'YouTube',
      contentType: 'Lifestyle, Fashion, Beauty',
      followers: 1900000,
      lastUpdated: '09/03/2026'
    },
    {
      id: 10,
      name: 'Phạm Tố Uyên',
      url: 'https://instagram.com/phamtouyen',
      avatar: profileImages.img10,
      manager: {
        type: 'personal',
        name: 'Phạm Tố Uyên',
        dob: '18/11/1996',
        idNumber: '079096010011',
        address: '345 Lê Văn Sỹ, Quận 3, TP.HCM',
        phone: '0901234567',
        email: 'phamtouyen.official@gmail.com'
      },
      platform: 'Instagram',
      contentType: 'Beauty, Wellness, Lifestyle',
      followers: 2500000,
      lastUpdated: '09/03/2026'
    },
  ];

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const filteredChannels = channels.filter(channel => {
    const nameMatch = channel.name.toLowerCase().includes(searchQuery.toLowerCase());
    const platformMatch = selectedPlatform === 'all' || channel.platform === selectedPlatform;
    const managerTypeMatch = selectedManagerType === 'all' || channel.manager.type === selectedManagerType;
    return nameMatch && platformMatch && managerTypeMatch;
  });

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedPlatform('all');
    setSelectedManagerType('all');
  };

  const hasActiveFilters = searchQuery !== '' || selectedPlatform !== 'all' || selectedManagerType !== 'all';

  return (
    <div className="p-[16px]">
      {/* Filters */}
      <div className="mb-4">
        <FilterBar
          activeFilters={[]}
          onRemoveFilter={() => {}}
          className="flex-1"
          totalCount={channels.length}
          countLabel="Kênh"
        />
      </div>

      {/* Channels Grid View */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredChannels.map((channel) => {
          const platformConfig = platformIcons[channel.platform];
          const PlatformIcon = platformConfig.icon;

          return (
            <div key={channel.id} className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-lg transition-all cursor-pointer" onClick={() => handleChannelClick(channel)}>
              {/* Card Content */}
              <div className="p-6">
                {/* Avatar */}
                <div className="flex justify-center mb-4">
                  <ImageWithFallback
                    src={channel.avatar} 
                    alt={channel.name}
                    className="w-24 h-24 rounded-full object-cover border-4 border-border"
                    fallbackSrc={profileImages.default}
                  />
                </div>
                
                {/* Channel Name */}
                <h3 className="text-center font-semibold text-foreground text-lg mb-2 truncate">{channel.name}</h3>
                
                {/* Platform & Content Type */}
                <div className="flex flex-col items-center gap-2 mb-4">
                  <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${platformConfig.bg}`}>
                    <PlatformIcon className={`w-3.5 h-3.5 ${platformConfig.color}`} />
                    <span className={`text-xs ${platformConfig.color}`}>{channel.platform}</span>
                  </div>
                  <span className="text-sm text-muted-foreground text-center">{channel.contentType}</span>
                </div>
                
                {/* Stats */}
                <div className="bg-muted/50 rounded-lg p-4 mb-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Tương tác</div>
                      <div className="text-sm font-bold text-primary">9.2%</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Lượt xem TB</div>
                      <div className="text-sm font-bold text-foreground">450K</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Bình luận TB</div>
                      <div className="text-sm font-bold text-foreground">5.1K</div>
                    </div>
                    
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <a 
                    href={channel.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-full hover:bg-primary/90 transition-all text-sm font-medium"
                  >
                    Xem kênh
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  
                  {/* More Dropdown */}
                  <div className="relative" ref={(el) => dropdownRefs.current[channel.id] = el}>
                    <button 
                      className="p-2 border border-border rounded-full text-foreground/80 hover:border-primary hover:text-primary transition-colors flex items-center justify-center"
                      onClick={() => setOpenDropdownId(openDropdownId === channel.id ? null : channel.id)}
                      title="Thêm"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    
                    {openDropdownId === channel.id && (
                      <div className="absolute right-0 bottom-full mb-1 w-40 bg-card border border-border rounded-lg shadow-lg z-50 py-1">
                        <button
                          className="w-full px-4 py-2 text-left text-sm text-foreground/80 hover:bg-muted/50 flex items-center gap-2 transition-colors"
                          onClick={() => setOpenDropdownId(null)}
                        >
                          <Bookmark className="w-4 h-4" />
                          <span>Lưu</span>
                        </button>
                        <button
                          className="w-full px-4 py-2 text-left text-sm text-foreground/80 hover:bg-muted/50 flex items-center gap-2 transition-colors"
                          onClick={() => {
                            setOpenDropdownId(null);
                            handleChannelClick(channel);
                          }}
                        >
                          <User className="w-4 h-4" />
                          <span>Hồ sơ</span>
                        </button>
                        <div className="border-t border-border my-1"></div>
                        <button
                          className="w-full px-4 py-2 text-left text-sm text-destructive hover:bg-destructive/10 flex items-center gap-2 transition-colors"
                          onClick={() => {
                            setOpenDropdownId(null);
                            setSelectedChannel(channel);
                            setIsReportDialogOpen(true);
                          }}
                        >
                          <Flag className="w-4 h-4" />
                          <span>Báo cáo</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Last Updated */}
                <div className="text-xs text-muted-foreground/70 text-center mt-3">
                  Cập nhật: {channel.lastUpdated}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredChannels.length === 0 && (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Tv className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Chưa có kênh nào</h3>
          <p className="text-muted-foreground mb-6">Bắt đầu bằng cách thêm kênh đầu tiên của bạn</p>
          <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-full hover:bg-primary/90 transition-all font-medium">
            <Plus className="w-4 h-4" />
            Thêm kênh
          </button>
        </div>
      )}

      {/* Channel Drawer */}
      <ChannelDrawer
        channel={selectedChannel}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
      />

      {/* Report Dialog */}
      <ReportDialog
        isOpen={isReportDialogOpen}
        onClose={() => setIsReportDialogOpen(false)}
        targetType="channel"
        targetName={selectedChannel?.name || ''}
        onSubmit={(reason, description) => {
          console.log('Channel report submitted:', { reason, description, channelId: selectedChannel?.id });
          // Handle report submission
        }}
      />
    </div>
  );
}
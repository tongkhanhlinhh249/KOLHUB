import { TrendingUp, Users, Target, DollarSign, Trophy, Award, ChevronLeft, ChevronRight, UserCheck, ShieldAlert, CheckCircle, GraduationCap } from 'lucide-react';
import { creators } from '../data/creators';
import { profileImages } from '../data/images';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { useRef, useState } from 'react';

export function Dashboard() {
  const [timePeriod, setTimePeriod] = useState<'month' | 'quarter' | 'year'>('month');
  const [channelTimePeriod, setChannelTimePeriod] = useState<'month' | 'quarter' | 'year'>('month');
  
  const stats = [
    { label: 'KOL ĐỊNH DANH', value: '8,547', icon: UserCheck, change: '+23%', color: 'blue', isPositive: true },
    { label: 'VI PHẠT XỬ LÝ', value: '342', icon: ShieldAlert, change: '-15%', color: 'red', isPositive: true },
    { label: 'TỶ LỆ TUÂN THỦ', value: '94.2%', icon: CheckCircle, change: '+5.3%', color: 'green', isPositive: true },
    { label: 'HOÀN THÀNH KHÓA HỌC', value: '6,234', icon: GraduationCap, change: '+18%', color: 'purple', isPositive: true },
  ];

  // Tính tổng followers cho mỗi creator từ ID 1-10
  const topCreators = creators
    .filter(creator => creator.id >= 1 && creator.id <= 10)
    .map(creator => ({
      ...creator,
      totalFollowers: creator.stats.reduce((sum, stat) => {
        const followers = parseFloat(stat.followers.replace(/[KM]/g, ''));
        const multiplier = stat.followers.includes('M') ? 1000000 : stat.followers.includes('K') ? 1000 : 1;
        return sum + (followers * multiplier);
      }, 0)
    }))
    .sort((a, b) => b.totalFollowers - a.totalFollowers)
    .slice(0, 10);

  const topChannels = [
    { 
      name: 'Cô Em Trendy',
      fullName: 'Trần Như Ý',
      platform: 'TikTok', 
      followers: '6.2M', 
      avatar: profileImages.img07,
      contentType: 'Fashion, Lifestyle, Shopping',
      engagement: '14.8%',
      avgViews: '3.8M',
      avgCmt: '28K',
      cpe: '520đ',
      lastUpdated: '09/03/2026'
    },
    { 
      name: 'Ẩm Thực Mẹ Làm',
      fullName: 'Nguyễn Thị Hồng',
      platform: 'YouTube', 
      followers: '3.5M', 
      avatar: profileImages.img05,
      contentType: 'Nấu ăn, Ẩm thực, Gia đình',
      engagement: '10.5%',
      avgViews: '2.2M',
      avgCmt: '18K',
      cpe: '680đ',
      lastUpdated: '09/03/2026'
    },
    { 
      name: 'Châu Bùi',
      fullName: 'Châu Bùi',
      platform: 'Instagram', 
      followers: '2.9M', 
      avatar: profileImages.img06,
      contentType: 'Fashion, Lifestyle, Beauty',
      engagement: '13.5%',
      avgViews: '980K',
      avgCmt: '12K',
      cpe: '520đ',
      lastUpdated: '09/03/2026'
    },
    { 
      name: 'Chan La Cà',
      fullName: 'Lê Chân',
      platform: 'YouTube', 
      followers: '2.8M', 
      avatar: profileImages.img04,
      contentType: 'Du lịch, Ẩm thực, Food Review',
      engagement: '11.2%',
      avgViews: '1.8M',
      avgCmt: '15K',
      cpe: '720đ',
      lastUpdated: '09/03/2026'
    },
    { 
      name: 'Khoai Lang Thang',
      fullName: 'Đinh Võ Hoài Phương',
      platform: 'YouTube', 
      followers: '2.8M', 
      avatar: profileImages.img03,
      contentType: 'Du lịch, Văn hóa, Khám phá',
      engagement: '9.2%',
      avgViews: '2.1M',
      avgCmt: '16K',
      cpe: '780đ',
      lastUpdated: '09/03/2026'
    },
    { 
      name: 'Phạm Tố Uyên',
      fullName: 'Phạm Tố Uyên',
      platform: 'Instagram', 
      followers: '2.5M', 
      avatar: profileImages.img10,
      contentType: 'Beauty, Wellness, Lifestyle',
      engagement: '12.8%',
      avgViews: '850K',
      avgCmt: '10K',
      cpe: '590đ',
      lastUpdated: '09/03/2026'
    },
    { 
      name: 'Lê Hà Trúc',
      fullName: 'Lê Hà Trúc',
      platform: 'YouTube', 
      followers: '2.3M', 
      avatar: profileImages.img08,
      contentType: 'Beauty, Skincare, Tutorial',
      engagement: '11.5%',
      avgViews: '1.5M',
      avgCmt: '14K',
      cpe: '650đ',
      lastUpdated: '09/03/2026'
    },
    { 
      name: 'Thuỳ Trang (Suzy)',
      fullName: 'Nguyễn Thuỳ Trang',
      platform: 'YouTube', 
      followers: '1.9M', 
      avatar: profileImages.img09,
      contentType: 'Lifestyle, Fashion, Beauty',
      engagement: '10.8%',
      avgViews: '1.2M',
      avgCmt: '11K',
      cpe: '720đ',
      lastUpdated: '09/03/2026'
    },
    { 
      name: 'Khánh Vy',
      fullName: 'Bùi Phương Khánh Vy',
      platform: 'YouTube', 
      followers: '1.2M', 
      avatar: profileImages.img01,
      contentType: 'Giáo dục, MC, Tiếng Anh',
      engagement: '15.2%',
      avgViews: '980K',
      avgCmt: '13K',
      cpe: '480đ',
      lastUpdated: '09/03/2026'
    },
    { 
      name: 'Giang Ơi',
      fullName: 'Nguyễn Phương Giang',
      platform: 'YouTube', 
      followers: '890K', 
      avatar: profileImages.img02,
      contentType: 'Lifestyle, Phát triển bản thân',
      engagement: '16.5%',
      avgViews: '650K',
      avgCmt: '8.5K',
      cpe: '420đ',
      lastUpdated: '09/03/2026'
    },
  ];

  // Mock data for verified creators
  const topVerifiedCreators = [
    { rank: 1, name: 'Sơn Tùng M-TP', fullName: 'Nguyễn Thanh Tùng', platform: 'Facebook', followers: '6.8M', avatar: profileImages.img01 },
    { rank: 2, name: 'Trấn Thành', fullName: 'Trấn Thành', platform: 'Facebook', followers: '7.2M', avatar: profileImages.img02 },
    { rank: 3, name: 'Hương Giang', fullName: 'Nguyễn Hương Giang', platform: 'Instagram', followers: '3.5M', avatar: profileImages.img03 },
    { rank: 4, name: 'Ninh Dương Lan Ngọc', fullName: 'Ninh Dương Lan Ngọc', platform: 'Instagram', followers: '4.1M', avatar: profileImages.img04 },
    { rank: 5, name: 'Đông Nhi', fullName: 'Nguyễn Thị Đông Nhi', platform: 'Facebook', followers: '5.3M', avatar: profileImages.img05 },
    { rank: 6, name: 'Hari Won', fullName: 'Esther Supreeleela', platform: 'Facebook', followers: '3.9M', avatar: profileImages.img06 },
    { rank: 7, name: 'Nhã Phương', fullName: 'Trương Thị Nhã Phương', platform: 'Instagram', followers: '2.8M', avatar: profileImages.img07 },
    { rank: 8, name: 'Thu Trang', fullName: 'Lê Thị Thu Trang', platform: 'Facebook', followers: '4.5M', avatar: profileImages.img08 },
    { rank: 9, name: 'Tuấn Trần', fullName: 'Phạm Tuấn Trần', platform: 'Instagram', followers: '2.1M', avatar: profileImages.img09 },
    { rank: 10, name: 'Thúy Ngân', fullName: 'Bùi Thúy Ngân', platform: 'Instagram', followers: '1.8M', avatar: profileImages.img10 },
  ];

  // Mock data for certified creators
  const topCertifiedCreators = [
    { rank: 1, name: 'Khánh Vy', fullName: 'Bùi Phương Khánh Vy', platform: 'Instagram', followers: '2.8M', avatar: profileImages.img01 },
    { rank: 2, name: 'Giang Ơi', fullName: 'Nguyễn Phương Giang', platform: 'YouTube', followers: '1.5M', avatar: profileImages.img02 },
    { rank: 3, name: 'Khoai Lang Thang', fullName: 'Đinh Võ Hoài Phương', platform: 'YouTube', followers: '3.9M', avatar: profileImages.img03 },
    { rank: 4, name: 'Chan La Cà', fullName: 'Lê Chân', platform: 'YouTube', followers: '2.1M', avatar: profileImages.img04 },
    { rank: 5, name: 'Ẩm Thực Mẹ Làm', fullName: 'Nguyễn Thị Hồng', platform: 'YouTube', followers: '1.8M', avatar: profileImages.img05 },
    { rank: 6, name: 'Châu Bùi', fullName: 'Châu Bùi', platform: 'Instagram', followers: '2.5M', avatar: profileImages.img06 },
    { rank: 7, name: 'Cô Em Trendy', fullName: 'Trần Như Ý', platform: 'Instagram', followers: '1.2M', avatar: profileImages.img07 },
    { rank: 8, name: 'Lê Hà Trúc', fullName: 'Lê Hà Trúc', platform: 'Instagram', followers: '980K', avatar: profileImages.img08 },
    { rank: 9, name: 'Thuỳ Trang (Suzy)', fullName: 'Nguyễn Thuỳ Trang', platform: 'Instagram', followers: '1.4M', avatar: profileImages.img09 },
    { rank: 10, name: 'Phạm Tố Uyên', fullName: 'Phạm Tố Uyên', platform: 'TikTok', followers: '2.2M', avatar: profileImages.img10 },
  ];

  // Mock data for growth creators (using img11-20)
  const topGrowthCreators = [
    { rank: 1, name: 'Sơn Tùng M-TP', fullName: 'Nguyễn Thanh Tùng', platform: 'Facebook', followers: '6.8M', avatar: profileImages.img11 },
    { rank: 2, name: 'Trấn Thành', fullName: 'Trấn Thành', platform: 'Facebook', followers: '7.2M', avatar: profileImages.img12 },
    { rank: 3, name: 'Hương Giang', fullName: 'Nguyễn Hương Giang', platform: 'Instagram', followers: '3.5M', avatar: profileImages.img13 },
    { rank: 4, name: 'Ninh Dương Lan Ngọc', fullName: 'Ninh Dương Lan Ngọc', platform: 'Instagram', followers: '4.1M', avatar: profileImages.img14 },
    { rank: 5, name: 'Đông Nhi', fullName: 'Nguyễn Thị Đông Nhi', platform: 'Facebook', followers: '5.3M', avatar: profileImages.img15 },
    { rank: 6, name: 'Hari Won', fullName: 'Esther Supreeleela', platform: 'Facebook', followers: '3.9M', avatar: profileImages.img16 },
    { rank: 7, name: 'Nhã Phương', fullName: 'Trương Thị Nhã Phương', platform: 'Instagram', followers: '2.8M', avatar: profileImages.img17 },
    { rank: 8, name: 'Thu Trang', fullName: 'Lê Thị Thu Trang', platform: 'Facebook', followers: '4.5M', avatar: profileImages.img18 },
    { rank: 9, name: 'Tuấn Trần', fullName: 'Phạm Tuấn Trần', platform: 'Instagram', followers: '2.1M', avatar: profileImages.img19 },
    { rank: 10, name: 'Thúy Ngân', fullName: 'Bùi Thúy Ngân', platform: 'Instagram', followers: '1.8M', avatar: profileImages.img20 },
  ];

  const getMedalColor = (rank: number) => {
    if (rank === 1) return 'text-yellow-500';
    if (rank === 2) return 'text-muted-foreground/70';
    if (rank === 3) return 'text-amber-700';
    return 'text-muted-foreground';
  };

  const getMedalBg = (rank: number) => {
    if (rank === 1) return 'bg-yellow-50';
    if (rank === 2) return 'bg-muted/50';
    if (rank === 3) return 'bg-amber-50';
    return 'bg-card';
  };

  const formatFollowers = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const channelsScrollRef = useRef<HTMLDivElement>(null);

  const scrollChannels = (direction: 'left' | 'right') => {
    if (channelsScrollRef.current) {
      const scrollAmount = 350; // Width of one card + gap
      const currentScroll = channelsScrollRef.current.scrollLeft;
      const targetScroll = direction === 'left' 
        ? currentScroll - scrollAmount 
        : currentScroll + scrollAmount;
      
      channelsScrollRef.current.scrollTo({
        left: targetScroll,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="min-h-full p-4 md:p-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-card rounded-xl border border-border p-5 hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                stat.color === 'blue' ? 'bg-blue-50' :
                stat.color === 'red' ? 'bg-destructive/10' :
                stat.color === 'green' ? 'bg-green-50' :
                'bg-purple-50'
              }`}>
                <stat.icon className={`w-6 h-6 ${
                  stat.color === 'blue' ? 'text-blue-600' :
                  stat.color === 'red' ? 'text-destructive' :
                  stat.color === 'green' ? 'text-green-600' :
                  'text-purple-600'
                }`} />
              </div>
              <span className={`text-sm font-semibold px-2.5 py-1 rounded-full ${
                stat.change.startsWith('+') ? 'bg-green-50 text-green-600' : 'bg-destructive/10 text-destructive'
              }`}>
                {stat.change}
              </span>
            </div>
            <p className="font-bold text-foreground mb-1 text-[20px]">{stat.value}</p>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Danh sách KOL/KOC/Celeb nổi bật */}
      <div className="bg-card rounded-xl border border-border p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Danh sách KOL/KOC/Celeb nổi bật</h2>
              <p className="text-sm text-muted-foreground">Top 10 người sáng tạo nội dung hàng đầu</p>
            </div>
          </div>
          
          {/* Time Period Tabs */}
          <div className="flex gap-2 bg-muted p-1 rounded-full">
            <button
              onClick={() => setTimePeriod('month')}
              className={`px-4 py-2 text-sm font-medium rounded-full transition-all ${
                timePeriod === 'month'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Tháng
            </button>
            <button
              onClick={() => setTimePeriod('quarter')}
              className={`px-4 py-2 text-sm font-medium rounded-full transition-all ${
                timePeriod === 'quarter'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Quý
            </button>
            <button
              onClick={() => setTimePeriod('year')}
              className={`px-4 py-2 text-sm font-medium rounded-full transition-all ${
                timePeriod === 'year'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Năm
            </button>
          </div>
        </div>
        
        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Top 10 Verified */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-foreground">Top 10 kênh tăng trưởng nhanh</h3>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-600 text-xs font-medium rounded-full">
                <CheckCircle className="w-3.5 h-3.5" />
                Xác thực
              </span>
            </div>
            
            {/* Table Header */}
            <div className="grid grid-cols-[auto_1fr_auto_auto] gap-4 px-3 py-2 bg-muted/50 rounded-lg mb-2 text-xs font-medium text-muted-foreground">
              <div>Hạng</div>
              <div>Tên KOL/Kênh</div>
              <div>Nền tảng</div>
              <div className="text-right">Followers</div>
            </div>
            
            {/* Table Rows */}
            <div className="space-y-2">
              {topGrowthCreators.map((creator) => (
                <div
                  key={creator.rank}
                  className="grid grid-cols-[auto_1fr_auto_auto] gap-4 items-center p-3 rounded-lg border border-border hover:border-primary hover:shadow-sm transition-all"
                >
                  {/* Rank Badge */}
                  <div className={`w-8 h-8 ${getMedalBg(creator.rank)} rounded-full flex items-center justify-center flex-shrink-0`}>
                    {creator.rank <= 3 ? (
                      <Award className={`w-4 h-4 ${getMedalColor(creator.rank)}`} />
                    ) : (
                      <span className={`text-xs font-bold ${getMedalColor(creator.rank)}`}>{creator.rank}</span>
                    )}
                  </div>
                  
                  {/* Avatar & Name */}
                  <div className="flex items-center gap-3 min-w-0">
                    <ImageWithFallback
                      src={creator.avatar}
                      alt={creator.name}
                      className="w-10 h-10 rounded-full object-cover border-2 border-border flex-shrink-0"
                    />
                    <span className="font-medium text-foreground text-sm truncate">{creator.name}</span>
                  </div>
                  
                  {/* Platform */}
                  <div className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    creator.platform === 'Facebook' ? 'bg-blue-50 text-blue-600' :
                    creator.platform === 'Instagram' ? 'bg-pink-50 text-pink-600' :
                    'bg-destructive/10 text-destructive'
                  }`}>
                    {creator.platform}
                  </div>
                  
                  {/* Followers */}
                  <div className="text-right text-sm font-bold text-foreground">{creator.followers}</div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Right Column: Top 10 Certified */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-foreground">Đã có chứng nhận nghiệp vụ livestream</h3>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-600 text-xs font-medium rounded-full">
                <GraduationCap className="w-3.5 h-3.5" />
                Chứng nhận
              </span>
            </div>
            
            {/* Table Header */}
            <div className="grid grid-cols-[auto_1fr_auto_auto] gap-4 px-3 py-2 bg-muted/50 rounded-lg mb-2 text-xs font-medium text-muted-foreground">
              <div>Hạng</div>
              <div>Tên KOL/Kênh</div>
              <div>Nền tảng</div>
              <div className="text-right">Followers</div>
            </div>
            
            {/* Table Rows */}
            <div className="space-y-2">
              {topCertifiedCreators.map((creator) => (
                <div
                  key={creator.rank}
                  className="grid grid-cols-[auto_1fr_auto_auto] gap-4 items-center p-3 rounded-lg border border-border hover:border-primary hover:shadow-sm transition-all"
                >
                  {/* Rank Badge */}
                  <div className={`w-8 h-8 ${getMedalBg(creator.rank)} rounded-full flex items-center justify-center flex-shrink-0`}>
                    {creator.rank <= 3 ? (
                      <Award className={`w-4 h-4 ${getMedalColor(creator.rank)}`} />
                    ) : (
                      <span className={`text-xs font-bold ${getMedalColor(creator.rank)}`}>{creator.rank}</span>
                    )}
                  </div>
                  
                  {/* Avatar & Name */}
                  <div className="flex items-center gap-3 min-w-0">
                    <ImageWithFallback
                      src={creator.avatar}
                      alt={creator.name}
                      className="w-10 h-10 rounded-full object-cover border-2 border-border flex-shrink-0"
                    />
                    <span className="font-medium text-foreground text-sm truncate">{creator.name}</span>
                  </div>
                  
                  {/* Platform */}
                  <div className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    creator.platform === 'YouTube' ? 'bg-destructive/10 text-destructive' :
                    creator.platform === 'Instagram' ? 'bg-pink-50 text-pink-600' :
                    'bg-foreground text-white'
                  }`}>
                    {creator.platform}
                  </div>
                  
                  {/* Followers */}
                  <div className="text-right text-sm font-bold text-foreground">{creator.followers}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Danh sách kênh nổi bật */}
      <div className="bg-card rounded-xl border border-border p-6 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
          {/* Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center">
              <Award className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Danh sách kênh nổi bật</h2>
              <p className="text-sm text-muted-foreground">Top 10 kênh có lượng followers cao nhất</p>
            </div>
          </div>
          
          {/* Tabs & Navigation - Same Row */}
          <div className="flex items-center gap-4">
            {/* Time Period Tabs */}
            <div className="flex gap-2 bg-muted p-1 rounded-full">
              <button
                onClick={() => setChannelTimePeriod('month')}
                className={`px-4 py-2 text-sm font-medium rounded-full transition-all ${
                  channelTimePeriod === 'month'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Tháng
              </button>
              <button
                onClick={() => setChannelTimePeriod('quarter')}
                className={`px-4 py-2 text-sm font-medium rounded-full transition-all ${
                  channelTimePeriod === 'quarter'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Quý
              </button>
              <button
                onClick={() => setChannelTimePeriod('year')}
                className={`px-4 py-2 text-sm font-medium rounded-full transition-all ${
                  channelTimePeriod === 'year'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Năm
              </button>
            </div>
            
            {/* Navigation Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => scrollChannels('left')}
                className="w-10 h-10 rounded-full bg-muted hover:bg-muted flex items-center justify-center transition-all"
                aria-label="Previous"
              >
                <ChevronLeft className="w-5 h-5 text-foreground/80" />
              </button>
              <button
                onClick={() => scrollChannels('right')}
                className="w-10 h-10 rounded-full bg-primary hover:bg-primary/90 flex items-center justify-center transition-all"
                aria-label="Next"
              >
                <ChevronRight className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </div>
        
        {/* Horizontal Scroll Container */}
        <div className="relative">
          <div 
            ref={channelsScrollRef}
            className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-2"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {topChannels
              .sort((a, b) => {
                const getFollowerCount = (str: string) => {
                  const num = parseFloat(str.replace(/[KM]/g, ''));
                  const multiplier = str.includes('M') ? 1000000 : str.includes('K') ? 1000 : 1;
                  return num * multiplier;
                };
                return getFollowerCount(b.followers) - getFollowerCount(a.followers);
              })
              .map((channel, index) => (
              <div key={channel.name} className="flex-shrink-0 w-[320px]">
                <div className="relative bg-card rounded-xl border border-border hover:border-primary hover:shadow-lg transition-all h-full p-[16px]">
                  {/* Ranking Badge */}
                  <div className={`absolute -top-3 -left-1 w-10 h-10 ${getMedalBg(index + 1)} rounded-full flex items-center justify-center border-2 border-white shadow-md z-10`}>
                    {index < 3 ? (
                      <Award className={`w-5 h-5 ${getMedalColor(index + 1)}`} />
                    ) : (
                      <span className={`text-sm font-bold ${getMedalColor(index + 1)}`}>#{index + 1}</span>
                    )}
                  </div>
                  
                  {/* Avatar */}
                  <div className="flex justify-center mb-4">
                    <ImageWithFallback
                      src={channel.avatar}
                      alt={channel.name}
                      className="w-24 h-24 rounded-full object-cover border-4 border-border"
                    />
                  </div>
                  
                  {/* Channel Name */}
                  <h3 className="text-center font-semibold text-foreground text-lg mb-2 truncate">{channel.name}</h3>
                  
                  {/* Platform & Content Type */}
                  <div className="flex flex-col items-center gap-2 mb-4">
                    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${
                      channel.platform === 'YouTube' ? 'bg-destructive/10' :
                      channel.platform === 'TikTok' ? 'bg-foreground' :
                      channel.platform === 'Facebook' ? 'bg-blue-50' :
                      'bg-pink-50'
                    }`}>
                      <span className={`text-xs ${
                        channel.platform === 'YouTube' ? 'text-destructive' :
                        channel.platform === 'TikTok' ? 'text-white' :
                        channel.platform === 'Facebook' ? 'text-blue-600' :
                        'text-pink-600'
                      }`}>{channel.platform}</span>
                    </div>
                    <span className="text-sm text-muted-foreground text-center">{channel.contentType}</span>
                  </div>
                  
                  {/* Stats */}
                  <div className="bg-muted/50 rounded-lg mb-4 p-[12px]">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Tương tác</div>
                        <div className="text-sm font-bold text-primary">{channel.engagement}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Lượt xem TB</div>
                        <div className="text-sm font-bold text-foreground">{channel.avgViews}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Bình luận TB</div>
                        <div className="text-sm font-bold text-foreground">{channel.avgCmt}</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Action Button */}
                  <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white rounded-full hover:bg-primary/90 transition-all text-sm font-medium">
                    Xem kênh
                  </button>
                  
                  {/* Last Updated */}
                  <div className="text-xs text-muted-foreground/70 text-center mt-3">
                    Cập nhật: {channel.lastUpdated}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Hoạt động gần đây</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3 py-2">
            <div className="w-2 h-2 bg-primary rounded-full"></div>
            <span className="text-foreground/80">Đã thêm 3 influencers mới vào danh sách</span>
            <span className="text-sm text-muted-foreground ml-auto">2 giờ trước</span>
          </div>
          <div className="flex items-center gap-3 py-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-foreground/80">Chiến dịch "Summer Collection" đã bắt đầu</span>
            <span className="text-sm text-muted-foreground ml-auto">5 giờ trước</span>
          </div>
          <div className="flex items-center gap-3 py-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-foreground/80">Nhận được 12 đề xuất influencer mới</span>
            <span className="text-sm text-muted-foreground ml-auto">1 ngày trước</span>
          </div>
        </div>
      </div>
    </div>
  );
}
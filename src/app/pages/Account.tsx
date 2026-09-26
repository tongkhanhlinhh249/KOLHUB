import image_cf7f08cfdf58e20ba38f1e7e3750f5304a2ed0f5 from 'figma:asset/cf7f08cfdf58e20ba38f1e7e3750f5304a2ed0f5.png'
import { useNavigate } from 'react-router';
import { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  User, 
  Building2, 
  CreditCard, 
  DollarSign, 
  Users, 
  HelpCircle,
  ChevronRight,
  Plus,
  ExternalLink,
  Download,
  TrendingUp,
  Check,
  UserPlus,
  Mail,
  MoreVertical,
  Shield,
  Bell,
  Camera,
  Save
} from 'lucide-react';
import { useUser } from '../contexts/UserContext';

type TabType = 'preferences' | 'brands' | 'billing' | 'plans' | 'users';

export function Account() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('preferences');
  const { user, updateUser } = useUser();
  
  // Profile form state - sync with user context
  const [profileData, setProfileData] = useState({
    name: user.name,
    email: user.email,
    phone: user.phone || '',
    company: user.company || '',
    position: user.position || '',
    avatar: user.avatar
  });

  // Sync profileData with user context when user changes
  useEffect(() => {
    setProfileData({
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      company: user.company || '',
      position: user.position || '',
      avatar: user.avatar
    });
  }, [user]);
  
  // Email settings state
  const [emailSettings, setEmailSettings] = useState({
    weeklyReport: true,
    campaignUpdates: true,
    newMessages: true,
    productNews: false,
    partnerOffers: false
  });
  
  // Notification settings state
  const [notificationSettings, setNotificationSettings] = useState({
    pushNotifications: true,
    emailNotifications: true,
    smsNotifications: false,
    desktopNotifications: true
  });
  
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);

  const handleSaveProfile = () => {
    setIsSavingProfile(true);
    // Simulate API call
    setTimeout(() => {
      // Update user context with new data
      updateUser({
        name: profileData.name,
        email: profileData.email,
        phone: profileData.phone,
        company: profileData.company,
        position: profileData.position,
        avatar: profileData.avatar
      });
      setIsSavingProfile(false);
      alert('Thông tin cá nhân đã được cập nhật!');
    }, 1000);
  };

  const handleSaveEmailSettings = () => {
    setIsSavingEmail(true);
    setTimeout(() => {
      setIsSavingEmail(false);
      alert('Cài đặt email đã được cập nhật!');
    }, 1000);
  };

  const handleSaveNotifications = () => {
    setIsSavingNotifications(true);
    setTimeout(() => {
      setIsSavingNotifications(false);
      alert('Cài đặt thông báo đã được cập nhật!');
    }, 1000);
  };

  const tabs = [
    { id: 'preferences' as TabType, label: 'Tài khoản', icon: User },
    { id: 'brands' as TabType, label: 'Thương hiệu', icon: Building2 },
    { id: 'billing' as TabType, label: 'Thanh toán & Sử dụng', icon: CreditCard },
    { id: 'plans' as TabType, label: 'Bảng giá', icon: DollarSign },
    { id: 'users' as TabType, label: 'Người dùng & Nhóm', icon: Users },
  ];

  // Brands data
  const brands = [
    { id: 1, name: 'Nike', industry: 'Sports & Fashion', campaigns: 12, logo: '🏃' },
    { id: 2, name: 'Coca-Cola', industry: 'Food & Beverage', campaigns: 8, logo: '🥤' },
    { id: 3, name: 'Samsung', industry: 'Technology', campaigns: 15, logo: '📱' },
    { id: 4, name: 'Starbucks', industry: 'Food & Beverage', campaigns: 6, logo: '☕' },
  ];

  // Billing data
  const usageData = [
    { metric: 'API Calls', current: 8750, limit: 10000, unit: 'calls' },
    { metric: 'Storage', current: 45, limit: 100, unit: 'GB' },
    { metric: 'Team Members', current: 3, limit: 5, unit: 'users' },
  ];

  const invoices = [
    { id: 'INV-001', date: '01/03/2026', amount: '2,500,000 ₫', status: 'Đã thanh toán' },
    { id: 'INV-002', date: '01/02/2026', amount: '2,500,000 ₫', status: 'Đã thanh toán' },
    { id: 'INV-003', date: '01/01/2026', amount: '2,500,000 ₫', status: 'Đã thanh toán' },
  ];

  // Plans data
  const plans = [
    {
      name: 'Starter',
      price: '500,000',
      period: 'tháng',
      description: 'Phù hợp cho cá nhân và startup',
      features: [
        '1,000 API calls/tháng',
        '10 GB storage',
        '1 team member',
        'Email support',
        'Truy cập cơ bản',
      ],
      highlighted: false,
    },
    {
      name: 'Professional',
      price: '2,500,000',
      period: 'tháng',
      description: 'Cho doanh nghiệp đang phát triển',
      features: [
        '10,000 API calls/tháng',
        '100 GB storage',
        '5 team members',
        'Priority support',
        'Advanced analytics',
        'Custom integrations',
      ],
      highlighted: true,
    },
    {
      name: 'Enterprise',
      price: 'Liên hệ',
      period: '',
      description: 'Giải pháp cho doanh nghiệp lớn',
      features: [
        'Unlimited API calls',
        'Unlimited storage',
        'Unlimited team members',
        '24/7 dedicated support',
        'Advanced security',
        'Custom development',
        'SLA guarantee',
      ],
      highlighted: false,
    },
  ];

  // Users data
  const teamMembers = [
    { id: 1, name: 'Nguyễn Văn A', email: 'nguyen.vana@company.com', role: 'Admin', status: 'Active', avatar: '👨‍💼' },
    { id: 2, name: 'Trần Thị B', email: 'tran.thib@company.com', role: 'Member', status: 'Active', avatar: '👩‍💼' },
    { id: 3, name: 'Lê Văn C', email: 'le.vanc@company.com', role: 'Member', status: 'Active', avatar: '👨‍💻' },
    { id: 4, name: 'Phạm Thị D', email: 'pham.thid@company.com', role: 'Viewer', status: 'Pending', avatar: '👩‍🎨' },
  ];

  const preferencesItems = [
    { label: 'Profile details', path: '/profile', description: 'Quản lý thông tin cá nhân của bạn' },
    { label: 'Email settings', path: '/email-settings', description: 'Cài đặt email và thông báo qua email' },
    { label: 'Notifications', path: '/notifications', description: 'Quản lý các loại thông báo bạn nhận được' },
  ];

  const renderPreferences = () => (
    <div className="space-y-6">
      {/* Profile Details Section */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Thông tin cá nhân</h3>
            <p className="text-sm text-muted-foreground mt-1">Cập nhật thông tin và ảnh đại diện của bạn</p>
          </div>
        </div>

        {/* Avatar Upload */}
        <div className="flex items-center gap-6 mb-6 pb-6 border-b border-border">
          <div className="relative">
            <img
              src={image_cf7f08cfdf58e20ba38f1e7e3750f5304a2ed0f5}
              alt={profileData.name}
              className="w-24 h-24 rounded-full object-cover"
            />
            <button className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white hover:bg-primary/90 transition-all">
              <Camera className="w-4 h-4" />
            </button>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-1">{profileData.name}</h4>
            <p className="text-sm text-muted-foreground mb-2">{profileData.email}</p>
            <button className="text-sm text-primary hover:underline">Thay đổi ảnh đại diện</button>
          </div>
        </div>

        {/* Profile Form */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-2">Họ và tên</label>
              <input
                type="text"
                value={profileData.name}
                onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-2">Email</label>
              <input
                type="email"
                value={profileData.email}
                onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-2">Số điện thoại</label>
              <input
                type="tel"
                value={profileData.phone}
                onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-2">Công ty</label>
              <input
                type="text"
                value={profileData.company}
                onChange={(e) => setProfileData({ ...profileData, company: e.target.value })}
                className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-2">Vị trí</label>
            <input
              type="text"
              value={profileData.position}
              onChange={(e) => setProfileData({ ...profileData, position: e.target.value })}
              className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-6 pt-6 border-t border-border flex justify-end">
          <button
            onClick={handleSaveProfile}
            disabled={isSavingProfile}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-full hover:bg-primary/90 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {isSavingProfile ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      </div>

      {/* Email Settings Section */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-foreground">Cài đặt Email</h3>
          <p className="text-sm text-muted-foreground mt-1">Quản lý các email thông báo bạn muốn nhận</p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-border">
            <div>
              <h4 className="font-medium text-foreground">Báo cáo hàng tuần</h4>
              <p className="text-sm text-muted-foreground mt-1">Nhận báo cáo tổng quan về hoạt động hàng tuần</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={emailSettings.weeklyReport}
                onChange={(e) => setEmailSettings({ ...emailSettings, weeklyReport: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/40 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-card after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-border">
            <div>
              <h4 className="font-medium text-foreground">Cập nhật chiến dịch</h4>
              <p className="text-sm text-muted-foreground mt-1">Nhận thông báo khi có cập nhật về chiến dịch</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={emailSettings.campaignUpdates}
                onChange={(e) => setEmailSettings({ ...emailSettings, campaignUpdates: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/40 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-card after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-border">
            <div>
              <h4 className="font-medium text-foreground">Tin nhắn mới</h4>
              <p className="text-sm text-muted-foreground mt-1">Nhận email khi có tin nhắn mới từ influencer</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={emailSettings.newMessages}
                onChange={(e) => setEmailSettings({ ...emailSettings, newMessages: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/40 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-card after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-border">
            <div>
              <h4 className="font-medium text-foreground">Tin tức sản phẩm</h4>
              <p className="text-sm text-muted-foreground mt-1">Nhận thông tin về tính năng và cập nhật mới</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={emailSettings.productNews}
                onChange={(e) => setEmailSettings({ ...emailSettings, productNews: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/40 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-card after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <h4 className="font-medium text-foreground">Ưu đãi từ đối tác</h4>
              <p className="text-sm text-muted-foreground mt-1">Nhận thông tin về khuyến mãi và ưu đãi đặc biệt</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={emailSettings.partnerOffers}
                onChange={(e) => setEmailSettings({ ...emailSettings, partnerOffers: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/40 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-card after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-6 pt-6 border-t border-border flex justify-end">
          <button
            onClick={handleSaveEmailSettings}
            disabled={isSavingEmail}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-full hover:bg-primary/90 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {isSavingEmail ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      </div>

      {/* Notifications Section */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-foreground">Cài đặt Thông báo</h3>
          <p className="text-sm text-muted-foreground mt-1">Quản lý cách bạn nhận thông báo từ hệ thống</p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Bell className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h4 className="font-medium text-foreground">Push Notifications</h4>
                <p className="text-sm text-muted-foreground mt-1">Nhận thông báo đẩy trên thiết bị</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notificationSettings.pushNotifications}
                onChange={(e) => setNotificationSettings({ ...notificationSettings, pushNotifications: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/40 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-card after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <Mail className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h4 className="font-medium text-foreground">Email Notifications</h4>
                <p className="text-sm text-muted-foreground mt-1">Nhận thông báo qua email</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notificationSettings.emailNotifications}
                onChange={(e) => setNotificationSettings({ ...notificationSettings, emailNotifications: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/40 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-card after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 5a2 2 0 0 1 2-2h3.28a1 1 0 0 1 .948.684l1.498 4.493a1 1 0 0 1-.502 1.21l-2.257 1.13a11.042 11.042 0 0 0 5.516 5.516l1.13-2.257a1 1 0 0 1 1.21-.502l4.493 1.498a1 1 0 0 1 .684.949V19a2 2 0 0 1-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                </svg>
              </div>
              <div>
                <h4 className="font-medium text-foreground">SMS Notifications</h4>
                <p className="text-sm text-muted-foreground mt-1">Nhận thông báo qua tin nhắn SMS</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notificationSettings.smsNotifications}
                onChange={(e) => setNotificationSettings({ ...notificationSettings, smsNotifications: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/40 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-card after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                  <line x1="8" y1="21" x2="16" y2="21"/>
                  <line x1="12" y1="17" x2="12" y2="21"/>
                </svg>
              </div>
              <div>
                <h4 className="font-medium text-foreground">Desktop Notifications</h4>
                <p className="text-sm text-muted-foreground mt-1">Nhận thông báo trên desktop</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notificationSettings.desktopNotifications}
                onChange={(e) => setNotificationSettings({ ...notificationSettings, desktopNotifications: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/40 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-card after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-6 pt-6 border-t border-border flex justify-end">
          <button
            onClick={handleSaveNotifications}
            disabled={isSavingNotifications}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-full hover:bg-primary/90 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {isSavingNotifications ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      </div>
    </div>
  );

  const renderBrands = () => (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Danh sách Brands</h2>
          <p className="text-muted-foreground mt-1 text-sm">Quản lý các thương hiệu bạn đang làm việc cùng</p>
        </div>
        <button className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-full hover:bg-primary/90 transition-all font-medium">
          <Plus className="w-4 h-4" />
          Thêm Brand
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {brands.map((brand) => (
          <div key={brand.id} className="bg-card rounded-xl border border-border p-6 hover:shadow-lg transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center text-2xl">
                {brand.logo}
              </div>
              <button className="p-2 hover:bg-muted rounded-lg transition-all">
                <ExternalLink className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            
            <h3 className="font-semibold text-foreground text-lg mb-1">{brand.name}</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
              <Building2 className="w-4 h-4" />
              <span>{brand.industry}</span>
            </div>
            
            <div className="pt-3 border-t border-border">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Chiến dịch</span>
                <span className="font-semibold text-foreground">{brand.campaigns}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderBilling = () => (
    <div>
      {/* Current Plan */}
      <div className="bg-card rounded-xl border border-border p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Gói Professional</h2>
            <p className="text-muted-foreground mt-1">2,500,000 ₫/tháng</p>
          </div>
          <button className="px-5 py-2.5 bg-primary text-white rounded-full hover:bg-primary/90 transition-all font-medium">
            Nâng cấp gói
          </button>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CreditCard className="w-4 h-4" />
          <span>Thanh toán tiếp theo: 01/04/2026</span>
        </div>
      </div>

      {/* Usage Stats */}
      <div className="bg-card rounded-xl border border-border p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Mức sử dụng tháng này</h2>
        </div>

        <div className="space-y-4">
          {usageData.map((item) => (
            <div key={item.metric}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground/80">{item.metric}</span>
                <span className="text-sm text-muted-foreground">
                  {item.current.toLocaleString()} / {item.limit.toLocaleString()} {item.unit}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${(item.current / item.limit) * 100}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Invoices */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Lịch sử hóa đơn</h2>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-sm font-semibold text-foreground/80">Mã hóa đơn</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-foreground/80">Ngày</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-foreground/80">Số tiền</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-foreground/80">Trạng thái</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-foreground/80"></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="border-b border-border hover:bg-muted/50">
                  <td className="py-3 px-4 text-sm text-foreground">{invoice.id}</td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">{invoice.date}</td>
                  <td className="py-3 px-4 text-sm text-foreground font-medium">{invoice.amount}</td>
                  <td className="py-3 px-4">
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                      {invoice.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <button className="p-2 hover:bg-muted rounded-lg transition-all">
                      <Download className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderPlans = () => (
    <div>
      <div className="text-center mb-8">
        <h2 className="text-2xl font-semibold text-foreground mb-2">Bảng giá</h2>
        <p className="text-muted-foreground">Chọn gói phù hợp với nhu cầu của bạn</p>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`bg-card rounded-xl border-2 p-6 transition-all ${
              plan.highlighted
                ? 'border-primary shadow-xl scale-105'
                : 'border-border hover:border-border'
            }`}
          >
            {plan.highlighted && (
              <div className="bg-primary text-white text-xs font-semibold px-3 py-1 rounded-full inline-block mb-4">
                Phổ biến nhất
              </div>
            )}

            <h3 className="text-xl font-semibold text-foreground mb-2">{plan.name}</h3>
            <p className="text-muted-foreground text-sm mb-4">{plan.description}</p>

            <div className="mb-6">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                {plan.period && <span className="text-muted-foreground">₫/{plan.period}</span>}
              </div>
            </div>

            <button
              className={`w-full py-3 rounded-full font-medium transition-all mb-6 ${
                plan.highlighted
                  ? 'bg-primary text-white hover:bg-primary/90'
                  : 'bg-muted text-foreground hover:bg-muted'
              }`}
            >
              {plan.name === 'Enterprise' ? 'Liên hệ Sales' : 'Chọn gói'}
            </button>

            <div className="space-y-3">
              {plan.features.map((feature, index) => (
                <div key={index} className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-foreground/80">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* FAQ Section */}
      <div className="max-w-3xl mx-auto">
        <h3 className="text-xl font-semibold text-foreground mb-4">Câu hỏi thường gặp</h3>
        <div className="space-y-3">
          <div className="bg-card rounded-xl border border-border p-5">
            <h4 className="font-semibold text-foreground mb-2">Tôi có thể thay đổi gói bất cứ lúc nào không?</h4>
            <p className="text-muted-foreground text-sm">
              Có, bạn có thể nâng cấp hoặc hạ cấp gói bất cứ lúc nào. Thay đổi sẽ có hiệu lực ngay lập tức.
            </p>
          </div>
          <div className="bg-card rounded-xl border border-border p-5">
            <h4 className="font-semibold text-foreground mb-2">Có hỗ trợ thanh toán theo năm không?</h4>
            <p className="text-muted-foreground text-sm">
              Có, thanh toán theo năm sẽ được giảm giá 20%. Liên hệ với chúng tôi để biết thêm chi tiết.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderUsers = () => (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Users & Teams</h2>
          <p className="text-muted-foreground mt-1 text-sm">Quản lý thành viên trong team của bạn</p>
        </div>
        <button className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-full hover:bg-primary/90 transition-all font-medium">
          <UserPlus className="w-4 h-4" />
          Mời thành viên
        </button>
      </div>

      {/* Team Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm mb-1">Tổng thành viên</p>
              <p className="text-2xl font-semibold text-foreground">4</p>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
              <User className="w-6 h-6 text-blue-500" />
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm mb-1">Active</p>
              <p className="text-2xl font-semibold text-foreground">3</p>
            </div>
            <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-green-500" />
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm mb-1">Pending</p>
              <p className="text-2xl font-semibold text-foreground">1</p>
            </div>
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <Mail className="w-6 h-6 text-primary" />
            </div>
          </div>
        </div>
      </div>

      {/* Team Members Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left py-3 px-6 text-sm font-semibold text-foreground/80">Thành viên</th>
                <th className="text-left py-3 px-6 text-sm font-semibold text-foreground/80">Email</th>
                <th className="text-left py-3 px-6 text-sm font-semibold text-foreground/80">Vai trò</th>
                <th className="text-left py-3 px-6 text-sm font-semibold text-foreground/80">Trạng thái</th>
                <th className="text-left py-3 px-6 text-sm font-semibold text-foreground/80"></th>
              </tr>
            </thead>
            <tbody>
              {teamMembers.map((member) => (
                <tr key={member.id} className="border-b border-border hover:bg-muted/50">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center text-xl">
                        {member.avatar}
                      </div>
                      <span className="font-medium text-foreground">{member.name}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-sm text-muted-foreground">{member.email}</td>
                  <td className="py-4 px-6">
                    <select className="px-3 py-1 border border-border rounded-lg text-sm">
                      <option value="Admin">Admin</option>
                      <option value="Member">Member</option>
                      <option value="Viewer">Viewer</option>
                    </select>
                  </td>
                  <td className="py-4 px-6">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        member.status === 'Active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {member.status}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <button className="p-2 hover:bg-muted rounded-lg transition-all">
                      <MoreVertical className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'preferences':
        return renderPreferences();
      case 'brands':
        return renderBrands();
      case 'billing':
        return renderBilling();
      case 'plans':
        return renderPlans();
      case 'users':
        return renderUsers();
      default:
        return renderPreferences();
    }
  };

  return (
    <div className="min-h-screen bg-muted/50">
      {/* Header with Back Button */}
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="px-[24px] pt-[16px] pb-[0px]">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => navigate(-1)}
              className="hover:bg-muted rounded-lg transition-all p-[0px]"
            >
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <div>
              <h1 className="font-bold text-foreground text-[16px]">Cài đặt</h1>
              
            </div>
          </div>

          {/* Tabs Navigation */}
          <div className="flex items-center gap-6 overflow-x-auto">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-3 border-b-2 transition-all text-sm whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-primary text-primary -mb-[1px]'
                      : 'border-transparent text-foreground/80 hover:text-foreground'
                  }`}
                >
                  <IconComponent className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
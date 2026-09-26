import { Star, MoreHorizontal, Sliders, X, Check, Trophy, Phone, MessageCircle, TrendingUp, MapPin, Mail, FileText, Edit, MoreVertical, User, BookMarked, Bookmark, CheckCircle2, Award, Lock, Flag, TriangleAlert } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { ReportDialog } from './ReportDialog';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface CreatorCardProps {
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
  };
  onOpenDrawer?: () => void;
  onTabChange?: (tab: string) => void;
  onSelect?: (creatorId: number) => void;
  onReject?: (creatorId: number) => void;
  onMessageClick?: () => void;
  openDropdownId?: number | null;
  setOpenDropdownId?: (id: number | null) => void;
  dropdownRefs?: React.MutableRefObject<{[key: number]: HTMLDivElement | null}>;
}

export function CreatorCard({ 
  creator, 
  onOpenDrawer, 
  onTabChange, 
  onSelect, 
  onReject, 
  onMessageClick,
  openDropdownId,
  setOpenDropdownId,
  dropdownRefs
}: CreatorCardProps) {
  const [isSelected, setIsSelected] = useState(false);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [hoveredStat, setHoveredStat] = useState<string | null>(null);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  
  // Fallback for local dropdown state if parent doesn't provide
  const [localDropdownOpen, setLocalDropdownOpen] = useState(false);
  const localDropdownRef = useRef<HTMLDivElement>(null);
  
  // Use parent state if provided, otherwise use local state
  const isDropdownOpen = openDropdownId !== undefined ? openDropdownId === creator.id : localDropdownOpen;
  const toggleDropdown = () => {
    if (setOpenDropdownId) {
      setOpenDropdownId(openDropdownId === creator.id ? null : creator.id);
    } else {
      setLocalDropdownOpen(!localDropdownOpen);
    }
  };
  const closeDropdown = () => {
    if (setOpenDropdownId) {
      setOpenDropdownId(null);
    } else {
      setLocalDropdownOpen(false);
    }
  };

  // Close local dropdown when clicking outside
  useEffect(() => {
    if (localDropdownOpen && !dropdownRefs) {
      const handleClickOutside = (event: MouseEvent) => {
        if (localDropdownRef.current && !localDropdownRef.current.contains(event.target as Node)) {
          setLocalDropdownOpen(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [localDropdownOpen, dropdownRefs]);

  const handleDropdownAction = (tab: string) => {
    closeDropdown();
    if (onOpenDrawer) {
      onOpenDrawer();
    }
    if (onTabChange) {
      // Delay to ensure drawer opens first
      setTimeout(() => onTabChange(tab), 100);
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    console.log('handleCardClick triggered, target:', e.target);
    
    // Prevent card click if clicking on buttons or interactive elements
    const target = e.target as HTMLElement;
    if (
      target.closest('button') || 
      target.closest('a') ||
      target.tagName === 'BUTTON' ||
      target.tagName === 'A'
    ) {
      console.log('Clicked on button/link, ignoring card click');
      return;
    }
    
    console.log('Opening drawer from card click');
    
    // Open drawer with "Chi tiết" tab
    if (onOpenDrawer) {
      onOpenDrawer();
    }
    if (onTabChange) {
      setTimeout(() => onTabChange('details'), 100);
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'youtube':
        return (
          <div className="w-4 h-4 bg-destructive rounded-sm flex items-center justify-center">
            <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
          </div>
        );
      case 'tiktok':
        return (
          <div className="w-4 h-4 bg-black rounded-sm flex items-center justify-center">
            <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor">
              <path fill="#25F4EE" d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
            </svg>
          </div>
        );
      case 'instagram':
        return (
          <div className="w-4 h-4 bg-gradient-to-br from-purple-500 via-pink-500 to-primary rounded flex items-center justify-center">
            <span className="text-white text-[10px]">📷</span>
          </div>
        );
      default:
        return null;
    }
  };

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
      default:
        return {
          bg: 'bg-muted/50',
          border: 'border-border',
          icon: 'text-muted-foreground',
        };
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-3 md:p-5 hover:shadow-md transition-all" onClick={handleCardClick}>
      {/* Mobile: Horizontal Layout */}
      <div className="flex md:hidden flex-col gap-3">
        {/* Top Section: Avatar + Info + Quick Actions */}
        <div className="flex gap-3">
          {/* Profile Image - Small on mobile */}
          <div className="flex-shrink-0">
            <ImageWithFallback
              src={creator.profileImage}
              alt={creator.name}
              className="w-16 h-16 rounded-xl object-cover cursor-pointer"
              onClick={onOpenDrawer}
            />
          </div>

          {/* Creator Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 mb-1">
              <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
                <h3 
                  className="font-semibold text-sm text-foreground cursor-pointer hover:text-primary transition-colors truncate"
                  onClick={onOpenDrawer}
                >
                  {creator.name}
                </h3>
                
                {/* Badge Xác thực */}
                {(() => {
                  const nickname = (creator as any).nickname || '';
                  const isNotVerified = nickname === 'khoapug' || nickname === 'khoailangthang';
                  const isVerified = !isNotVerified;
                  
                  return isVerified ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                  ) : null;
                })()}
                
                {/* Badge Chứng chỉ */}
                {(() => {
                  const hasLivestreamCourse = (creator as any).livestreamCourse || false;
                  
                  return hasLivestreamCourse ? (
                    <Award className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                  ) : null;
                })()}
                
                {/* Badge Tài khoản bị khóa */}
                {(() => {
                  const accountStatus = (creator as any).accountStatus;
                  
                  return accountStatus === 'locked' ? (
                    <div className="flex items-center gap-1 px-1.5 py-0.5 bg-primary bg-opacity-10 border border-primary rounded-full flex-shrink-0">
                      <Lock className="w-3 h-3 text-primary" />
                      <span className="text-[10px] font-semibold text-primary">Khóa</span>
                    </div>
                  ) : null;
                })()}
              </div>
              
              {/* Action Buttons - All 3 in one line */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <button 
                  className="p-2 bg-primary text-white rounded-full hover:bg-primary/90 transition-all flex items-center justify-center min-w-[32px] min-h-[32px]" 
                  onClick={onMessageClick}
                  title="Nhắn tin"
                >
                  <MessageCircle className="w-4 h-4" />
                </button>
                
                <button 
                  className="hidden md:flex p-2 border border-border rounded-full text-foreground/80 hover:border-primary hover:text-primary transition-colors items-center justify-center min-w-[32px] min-h-[32px]"
                  title="Lưu"
                >
                  <Bookmark className="w-4 h-4" />
                </button>
                
                {/* More Dropdown */}
                <div className="relative" ref={(el) => {
                  if (dropdownRefs) {
                    dropdownRefs.current[creator.id] = el;
                  } else if (el) {
                    localDropdownRef.current = el;
                  }
                }}>
                  <button 
                    className="p-2 border border-border rounded-full text-foreground/80 hover:border-primary hover:text-primary active:bg-muted transition-colors flex items-center justify-center min-w-[32px] min-h-[32px]"
                    onClick={(e) => {
                      console.log('Mobile More button clicked');
                      e.preventDefault();
                      e.stopPropagation();
                      toggleDropdown();
                    }}
                    onTouchStart={(e) => {
                      console.log('Mobile More button touched');
                      e.stopPropagation();
                    }}
                    title="Thêm"
                    type="button"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  
                  {isDropdownOpen && (
                    <div className="absolute right-0 top-full mt-1 w-40 bg-card border border-border rounded-lg shadow-lg z-50 py-1">
                      <button
                        className="w-full px-4 py-2.5 text-left text-sm text-foreground/80 hover:bg-muted/50 active:bg-muted flex items-center gap-2 transition-colors"
                        onClick={(e) => {
                          console.log('Mobile dropdown: Lưu clicked');
                          e.preventDefault();
                          e.stopPropagation();
                          closeDropdown();
                        }}
                        type="button"
                      >
                        <Bookmark className="w-4 h-4" />
                        <span>Lưu</span>
                      </button>
                      <button
                        className="w-full px-4 py-2.5 text-left text-sm text-foreground/80 hover:bg-muted/50 active:bg-muted flex items-center gap-2 transition-colors"
                        onClick={(e) => {
                          console.log('Mobile dropdown: Hồ sơ clicked');
                          e.preventDefault();
                          e.stopPropagation();
                          handleDropdownAction('personal');
                        }}
                        type="button"
                      >
                        <User className="w-4 h-4" />
                        <span>Hồ sơ</span>
                      </button>
                      <button
                        className="w-full px-4 py-2.5 text-left text-sm text-foreground/80 hover:bg-muted/50 active:bg-muted flex items-center gap-2 transition-colors"
                        onClick={(e) => {
                          console.log('Mobile dropdown: Ghi chú clicked');
                          e.preventDefault();
                          e.stopPropagation();
                          handleDropdownAction('notes');
                        }}
                        type="button"
                      >
                        <FileText className="w-4 h-4" />
                        <span>Ghi chú</span>
                      </button>
                      <button
                        className="w-full px-4 py-2.5 text-left text-sm text-foreground/80 hover:bg-muted/50 active:bg-muted flex items-center gap-2 transition-colors"
                        onClick={(e) => {
                          console.log('Mobile dropdown: Vi phạm clicked');
                          e.preventDefault();
                          e.stopPropagation();
                          handleDropdownAction('violations');
                        }}
                        type="button"
                      >
                        <TriangleAlert className="w-4 h-4" />
                        <span>Vi phạm</span>
                      </button>
                      <div className="border-t border-border my-1"></div>
                      <button
                        className="w-full px-4 py-2.5 text-left text-sm text-destructive hover:bg-destructive/10 active:bg-destructive/10 flex items-center gap-2 transition-colors"
                        onClick={(e) => {
                          console.log('Mobile dropdown: Báo cáo clicked');
                          e.preventDefault();
                          e.stopPropagation();
                          closeDropdown();
                          setIsReportDialogOpen(true);
                        }}
                        type="button"
                      >
                        <Flag className="w-4 h-4" />
                        <span>Báo cáo</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-1 mb-1.5">
              <MapPin className="w-3 h-3 text-muted-foreground flex-shrink-0" />
              <span className="text-[11px] text-muted-foreground truncate">{creator.location}, {creator.country}</span>
            </div>
            
            <p className="text-xs text-foreground/80 line-clamp-2 mb-2">{creator.bio}</p>
          </div>
        </div>

        {/* Content Images + Social Stats - Combined layout */}
        <div className="flex gap-4 overflow-x-auto pb-2 -mx-3 px-3">
          {creator.contentImages.slice(0, 3).map((img, idx) => {
            const platforms = ['youtube', 'instagram', 'tiktok'];
            const platform = platforms[idx];
            
            return (
              <div key={idx} className="relative flex-shrink-0">
                <ImageWithFallback
                  src={img}
                  alt={`Content ${idx + 1}`}
                  className="w-20 h-20 rounded-lg object-cover border border-border"
                />
                {/* Social Platform Icon Overlay */}
                <div className="absolute top-1 right-1">
                  {platform === 'youtube' && (
                    <div className="w-4 h-4 bg-destructive rounded-full flex items-center justify-center shadow-md">
                      <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                      </svg>
                    </div>
                  )}
                  {platform === 'instagram' && (
                    <div className="w-4 h-4 bg-gradient-to-br from-purple-600 via-pink-500 to-primary/70 rounded-full flex items-center justify-center shadow-md">
                      <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                      </svg>
                    </div>
                  )}
                  {platform === 'tiktok' && (
                    <div className="w-4 h-4 bg-black rounded-full flex items-center justify-center shadow-md">
                      <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor">
                        <path fill="#25F4EE" d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          
          {/* Social Stats - Column */}
          <div className="grid grid-rows-3 grid-flow-col gap-x-3 gap-y-1.5 flex-shrink-0 auto-cols-max">
            {['youtube', 'facebook', 'instagram', 'tiktok'].map((platformName) => {
              const stat = creator.stats.find(s => s.platform === platformName);
              if (!stat) return null;
              
              return (
                <div key={platformName} className="flex items-center gap-1">
                  {/* Platform Icon */}
                  {platformName === 'youtube' && (
                    <div className="w-4 h-4 bg-destructive rounded-full flex items-center justify-center">
                      <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                      </svg>
                    </div>
                  )}
                  {platformName === 'facebook' && (
                    <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                      <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                    </div>
                  )}
                  {platformName === 'instagram' && (
                    <div className="w-4 h-4 bg-gradient-to-br from-purple-600 via-pink-500 to-primary/70 rounded-full flex items-center justify-center">
                      <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                      </svg>
                    </div>
                  )}
                  {platformName === 'tiktok' && (
                    <div className="w-4 h-4 bg-black rounded-full flex items-center justify-center">
                      <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor">
                        <path fill="#25F4EE" d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                      </svg>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-medium text-foreground whitespace-nowrap">{stat.followers}</span>
                    <span className="text-[9px] text-muted-foreground/70">•</span>
                    <span className="text-[9px] text-muted-foreground whitespace-nowrap">{stat.engagement}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Categories - Horizontal scroll */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-3 px-3">
          {creator.categories.slice(0, 3).map((category) => {
            const style = getMedalStyle(category.medal);
            return (
              <div 
                key={category.name} 
                className={`flex items-center gap-1.5 px-2.5 py-1 ${style.bg} rounded-full flex-shrink-0`}
              >
                <Trophy className={`w-3 h-3 ${style.icon} flex-shrink-0`} />
                <span className="text-xs text-foreground font-medium whitespace-nowrap">{category.name}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Desktop: Keep original vertical layout */}
      <div className="hidden md:flex md:flex-row md:items-center gap-4 md:gap-6">
        {/* Profile Image - Top on mobile, Left on desktop */}
        <div className="flex flex-col items-center flex-shrink-0 relative mx-auto md:mx-0">
          <ImageWithFallback
            src={creator.profileImage}
            alt={creator.name}
            className="w-24 h-24 md:w-32 md:h-32 rounded-2xl object-cover cursor-pointer"
            onClick={onOpenDrawer}
          />
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex gap-2 md:gap-3 bg-card rounded-full shadow-lg px-3 md:px-4 py-1.5 md:py-2 border border-border">
            <button
              onClick={() => {
                setIsSelected(true);
                if (onSelect) {
                  onSelect(creator.id);
                }
              }}
              className="transition-all text-[#10B981] hover:opacity-80"
            >
              <Check className="w-4 h-4 md:w-5 md:h-5 stroke-[2.5]" />
            </button>
            <div className="w-px h-4 md:h-5 bg-muted"></div>
            <button
              onClick={() => {
                setIsSelected(false);
                if (onReject) {
                  onReject(creator.id);
                }
              }}
              className="transition-all text-destructive hover:opacity-80"
            >
              <X className="w-4 h-4 md:w-5 md:h-5 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Creator Info + Stats Container - Below image on mobile, Left Middle on desktop */}
        <div className="flex flex-col gap-3 flex-1 mt-4 md:mt-0">
          {/* Creator Info */}
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 
                  className="font-semibold text-base text-foreground cursor-pointer hover:text-primary transition-colors"
                  onClick={onOpenDrawer}
                >
                  {creator.name}
                </h3>
                
                {/* Badge Xác thực - Icon only with tooltip - Hiển thị theo data */}
                {(() => {
                  const nickname = (creator as any).nickname || '';
                  const isNotVerified = nickname === 'khoapug' || nickname === 'khoailangthang';
                  const isVerified = !isNotVerified;
                  
                  return isVerified ? (
                    <div className="relative group">
                      <CheckCircle2 className="w-4 h-4 text-blue-500 cursor-pointer" />
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
                      <Award className="w-4 h-4 text-green-500 cursor-pointer" />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-foreground text-white text-xs rounded-lg whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all pointer-events-none z-50">
                        Chứng chỉ
                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
                      </div>
                    </div>
                  ) : null;
                })()}
                
                {/* Badge Tài khoản bị khóa - Hiển thị nếu có accountStatus = 'locked' */}
                {(() => {
                  const accountStatus = (creator as any).accountStatus;
                  
                  return accountStatus === 'locked' ? (
                    <div className="relative group">
                      <div className="flex items-center gap-1 px-2 py-0.5 bg-primary bg-opacity-10 border border-primary rounded-full">
                        <Lock className="w-3.5 h-3.5 text-primary" />
                        <span className="text-xs font-semibold text-primary">Đã khóa</span>
                      </div>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-foreground text-white text-xs rounded-lg whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all pointer-events-none z-50 max-w-xs text-center">
                        Tài khoản bị khóa do vi phạm chính sách
                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>
              
              {/* Action Buttons */}
              <div className="flex items-center gap-2 ml-auto">
                <button 
                  className="p-1.5 border border-border rounded-full text-foreground/80 hover:border-primary hover:text-primary transition-colors"
                  title="Lưu vào Đã lưu"
                >
                  <Bookmark className="w-4 h-4" />
                </button>
                
                {/* More Dropdown */}
                <div className="relative" ref={(el) => {
                  if (dropdownRefs) {
                    dropdownRefs.current[creator.id] = el;
                  } else if (el) {
                    localDropdownRef.current = el;
                  }
                }}>
                  <button 
                    className="p-1.5 rounded-full border border-border hover:bg-muted transition-colors text-foreground/80 hover:text-primary hover:border-primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleDropdown();
                    }}
                    title="Thêm"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  
                  {/* Dropdown Menu */}
                  {isDropdownOpen && (
                    <div className="absolute right-0 top-full mt-1 w-40 bg-card border border-border rounded-lg shadow-lg z-50 py-1">
                      
                      <button
                        className="w-full px-4 py-2 text-left text-sm text-foreground/80 hover:bg-muted/50 flex items-center gap-2 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDropdownAction('personal');
                        }}
                      >
                        <User className="w-4 h-4" />
                        <span>Hồ sơ</span>
                      </button>
                      <button
                        className="w-full px-4 py-2 text-left text-sm text-foreground/80 hover:bg-muted/50 flex items-center gap-2 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDropdownAction('notes');
                        }}
                      >
                        <FileText className="w-4 h-4" />
                        <span>Ghi chú</span>
                      </button>
                      <button
                        className="w-full px-4 py-2 text-left text-sm text-foreground/80 hover:bg-muted/50 flex items-center gap-2 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDropdownAction('violations');
                        }}
                      >
                        <TriangleAlert className="w-4 h-4" />
                        <span>Vi phạm</span>
                      </button>
                      <div className="border-t border-border my-1"></div>
                      <button
                        className="w-full px-4 py-2 text-left text-sm text-destructive hover:bg-destructive/10 flex items-center gap-2 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          closeDropdown();
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
            </div>
            <div className="flex items-center gap-1.5 mb-2">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{creator.location}, {creator.country}</span>
            </div>
            <p className="text-sm text-foreground/80 line-clamp-2 mb-0">{creator.bio}</p>
          </div>

          {/* Social Stats - Below Bio */}
          <div className="flex items-start gap-2 md:gap-3 overflow-x-auto pb-2 -mx-3 px-3 md:mx-0 md:px-0">
            {['youtube', 'facebook', 'instagram', 'tiktok'].map((platformName) => {
              const stat = creator.stats.find(s => s.platform === platformName);
              if (!stat) return null;
              
              return (
                <div key={platformName} className="flex flex-col gap-1.5 flex-shrink-0">
                  {/* Row 1: Platform Icon + Followers */}
                  <div 
                    className="relative flex items-center gap-1.5"
                    onMouseEnter={() => setHoveredStat(`${platformName}-followers`)}
                    onMouseLeave={() => setHoveredStat(null)}
                  >
                    {/* Platform Icon */}
                    {platformName === 'youtube' && (
                      <div className="w-5 h-5 bg-destructive rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                        </svg>
                      </div>
                    )}
                    {platformName === 'facebook' && (
                      <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                      </div>
                    )}
                    {platformName === 'instagram' && (
                      <div className="w-5 h-5 bg-gradient-to-br from-purple-600 via-pink-500 to-primary/70 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                        </svg>
                      </div>
                    )}
                    {platformName === 'tiktok' && (
                      <div className="w-5 h-5 bg-black rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                          <path fill="#25F4EE" d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                        </svg>
                      </div>
                    )}
                    
                    {/* Followers */}
                    <span className="text-xs font-medium text-foreground">{stat.followers}</span>
                    
                    {/* Followers Tooltip */}
                    {hoveredStat === `${platformName}-followers` && (
                      <div className="absolute left-0 top-full mt-1 z-10 px-3 py-1.5 bg-foreground text-white text-xs rounded-md shadow-lg whitespace-nowrap">
                        Số người theo dõi
                        <div className="absolute -top-1 left-4 w-2 h-2 bg-foreground rotate-45"></div>
                      </div>
                    )}
                  </div>

                  {/* Row 2: Chart Icon + Engagement Rate */}
                  <div 
                    className="relative flex items-center gap-1.5"
                    onMouseEnter={() => setHoveredStat(`${platformName}-engagement`)}
                    onMouseLeave={() => setHoveredStat(null)}
                  >
                    <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-[11px] text-muted-foreground font-medium">{stat.engagement}</span>
                    
                    {/* Engagement Tooltip */}
                    {hoveredStat === `${platformName}-engagement` && (
                      <div className="absolute left-0 top-full mt-1 z-10 px-3 py-1.5 bg-foreground text-white text-xs rounded-md shadow-lg whitespace-nowrap">
                        Tỷ lệ tương tác
                        <div className="absolute -top-1 left-4 w-2 h-2 bg-foreground rotate-45"></div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Content Preview Images - Below stats on mobile, Middle on desktop */}
        <div className="flex gap-2 md:gap-2.5 flex-shrink-0 justify-center md:justify-start">
          {creator.contentImages.slice(0, 2).map((img, idx) => {
            // Định nghĩa social platform cho mỗi post
            const platforms = ['youtube', 'instagram', 'tiktok'];
            const platform = platforms[idx];
            
            return (
              <div key={idx} className="relative group">
                <img
                  src={img}
                  alt={`Content ${idx + 1}`}
                  className="w-24 h-24 md:w-28 md:h-28 rounded-xl object-cover border border-border"
                />
                {/* Social Platform Icon Overlay */}
                <div className="absolute top-1.5 right-1.5">
                  {platform === 'youtube' && (
                    <div className="w-5 h-5 bg-destructive rounded-full flex items-center justify-center shadow-md">
                      <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                      </svg>
                    </div>
                  )}
                  {platform === 'instagram' && (
                    <div className="w-5 h-5 bg-gradient-to-br from-purple-600 via-pink-500 to-primary/70 rounded-full flex items-center justify-center shadow-md">
                      <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                      </svg>
                    </div>
                  )}
                  {platform === 'tiktok' && (
                    <div className="w-5 h-5 bg-black rounded-full flex items-center justify-center shadow-md">
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                        <path fill="#25F4EE" d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Categories and Contact - Below images on mobile, stacked horizontally on desktop */}
        <div className="flex flex-col md:flex-row gap-3 md:gap-6 items-stretch md:items-center">
          {/* Categories - Full width on mobile, Right on desktop */}
          <div className="flex flex-wrap md:flex-col gap-2 flex-shrink-0 md:min-w-[140px]">
            {creator.categories.slice(0, 3).map((category) => {
              const style = getMedalStyle(category.medal);
              return (
                <div 
                  key={category.name} 
                  className={`relative flex items-center gap-1.5 px-2.5 py-1 ${style.bg} rounded-full`}
                  onMouseEnter={() => setHoveredCategory(category.name)}
                  onMouseLeave={() => setHoveredCategory(null)}
                >
                  <Trophy className={`w-3 h-3 ${style.icon} flex-shrink-0`} />
                  <span className="text-xs text-foreground font-medium truncate">{category.name}</span>
                  
                  {/* Tooltip */}
                  {hoveredCategory === category.name && (
                    <div className="absolute left-0 top-full mt-1 z-10 px-3 py-1.5 bg-foreground text-white text-xs rounded-md shadow-lg whitespace-nowrap">
                      {category.name}
                      <div className="absolute -top-1 left-4 w-2 h-2 bg-foreground rotate-45"></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Contact Button - Full width on mobile, Far Right on desktop */}
          <button className="w-full md:w-auto px-6 py-2.5 bg-primary text-white rounded-full hover:bg-primary/90 transition-all flex items-center justify-center gap-2 flex-shrink-0 md:self-center" onClick={onMessageClick}>
            <MessageCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Nhắn tin</span>
          </button>
        </div>
      </div>

      {/* Report Dialog */}
      <ReportDialog
        isOpen={isReportDialogOpen}
        onClose={() => setIsReportDialogOpen(false)}
        targetType="influencer"
        targetName={creator.title}
        onSubmit={(reason, description) => {
          console.log('Report submitted:', { reason, description, creatorId: creator.id });
          // Handle report submission
        }}
      />
    </div>
  );
}
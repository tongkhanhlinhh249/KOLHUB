import { Search, ChevronDown, Users, TrendingUp, MapPin, Languages, User, Calendar, Tag, Globe, X, Check, Trash2, Circle, Filter } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

interface FilterBarProps {
  activeFilters: string[];
  onRemoveFilter: (filter: string) => void;
  className?: string;
  totalCount?: number;
  countLabel?: string;
  pageType?: 'influencer' | 'violation'; // New prop to differentiate pages
}

export function FilterBar({ 
  activeFilters, 
  onRemoveFilter, 
  className = '', 
  totalCount = 49000, 
  countLabel = 'KOLs',
  pageType = 'influencer' // Default to influencer page
}: FilterBarProps) {
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [showPlatformDropdown, setShowPlatformDropdown] = useState(false);
  const [showOtherFilters, setShowOtherFilters] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchKeywords, setSearchKeywords] = useState<string[]>([]);
  
  // Influencer filter states
  const [includeBrandAccounts, setIncludeBrandAccounts] = useState(false);
  const [showAffiliateOnly, setShowAffiliateOnly] = useState(false);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [geoLocation, setGeoLocation] = useState('');
  const [geoRadius, setGeoRadius] = useState('');
  const [selectedGender, setSelectedGender] = useState('All');
  const [selectedAgeRanges, setSelectedAgeRanges] = useState<string[]>([]);

  // Violation filter states
  const [selectedViolationTypes, setSelectedViolationTypes] = useState<string[]>([]);
  const [selectedReportTypes, setSelectedReportTypes] = useState<string[]>([]);
  const [selectedDateRange, setSelectedDateRange] = useState<string>('');
  const [showViolationTypeDropdown, setShowViolationTypeDropdown] = useState(false);
  const [showReportTypeDropdown, setShowReportTypeDropdown] = useState(false);
  const [showDateRangeDropdown, setShowDateRangeDropdown] = useState(false);

  // Refs for click outside detection
  const platformDropdownRef = useRef<HTMLDivElement>(null);
  const otherFiltersDropdownRef = useRef<HTMLDivElement>(null);
  const countryDropdownRef = useRef<HTMLDivElement>(null);
  const languageDropdownRef = useRef<HTMLDivElement>(null);
  const violationTypeDropdownRef = useRef<HTMLDivElement>(null);
  const dateRangeDropdownRef = useRef<HTMLDivElement>(null);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Platform dropdown
      if (platformDropdownRef.current && !platformDropdownRef.current.contains(event.target as Node)) {
        setShowPlatformDropdown(false);
      }
      
      // Other filters dropdown
      if (otherFiltersDropdownRef.current && !otherFiltersDropdownRef.current.contains(event.target as Node)) {
        setShowOtherFilters(false);
      }
      
      // Country dropdown
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target as Node)) {
        setShowCountryDropdown(false);
      }
      
      // Language dropdown
      if (languageDropdownRef.current && !languageDropdownRef.current.contains(event.target as Node)) {
        setShowLanguageDropdown(false);
      }
      
      // Violation type dropdown
      if (violationTypeDropdownRef.current && !violationTypeDropdownRef.current.contains(event.target as Node)) {
        setShowViolationTypeDropdown(false);
      }
      
      // Date range dropdown
      if (dateRangeDropdownRef.current && !dateRangeDropdownRef.current.contains(event.target as Node)) {
        setShowDateRangeDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Violation-specific options
  const violationTypes = [
    'Nội dung sai sự thật',
    'Quảng cáo gây hiểu lầm',
    'Vi phạm bản quyền',
    'Nội dung không phù hợp',
    'Spam/Scam',
    'Vi phạm quyền riêng tư',
    'Nội dung vi phạm cộng đồng',
    'Thông tin sai lệch',
    'Nội dung phản cảm'
  ];

  const reportTypes = [
    { id: 'ai', label: 'AI Report' },
    { id: 'user', label: 'User Report' },
    { id: 'brand', label: 'Brand Report' }
  ];

  const dateRangeOptions = [
    { id: '7days', label: '7 ngày qua' },
    { id: '30days', label: '30 ngày qua' },
    { id: '90days', label: '90 ngày qua' },
    { id: 'all', label: 'Tất cả' }
  ];

  const countries = ['Vietnam', 'United States', 'Japan', 'Korea', 'Thailand', 'Singapore', 'Indonesia'];
  const languages = ['English', 'Vietnamese', 'Japanese', 'Korean', 'Thai', 'Chinese'];
  const ageRanges = ['0-17', '18-24', '25-34', '35-54'];

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'Tất cả nền tảng':
        return (
          <div className="w-5 h-5 bg-gradient-to-br from-primary via-purple-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="3" y="3" width="7" height="7" rx="1"/>
              <rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="14" y="14" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/>
            </svg>
          </div>
        );
      case 'YouTube':
        return (
          <div className="w-5 h-5 bg-destructive rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
          </div>
        );
      case 'TikTok':
        return (
          <div className="w-5 h-5 bg-black rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
              <path fill="#25F4EE" d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
            </svg>
          </div>
        );
      case 'Instagram':
        return (
          <div className="w-5 h-5 bg-gradient-to-br from-purple-500 via-pink-500 to-primary rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
          </div>
        );
      case 'Facebook':
        return (
          <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
          </div>
        );
      case 'Twitter/X':
        return (
          <div className="w-5 h-5 bg-black rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
          </div>
        );
      case 'LinkedIn':
        return (
          <div className="w-5 h-5 bg-blue-700 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
          </div>
        );
      default:
        return null;
    }
  };

  const platforms = [
    { name: 'Tất cả nền tảng' },
    { name: 'YouTube' },
    { name: 'Instagram' },
    { name: 'TikTok' },
    { name: 'Facebook' },
    { name: 'Twitter/X' },
    { name: 'LinkedIn' },
  ];

  const toggleAgeRange = (range: string) => {
    setSelectedAgeRanges(prev =>
      prev.includes(range) ? prev.filter(r => r !== range) : [...prev, range]
    );
  };

  const removeLanguage = (lang: string) => {
    setSelectedLanguages(prev => prev.filter(l => l !== lang));
  };

  const toggleLanguage = (lang: string) => {
    setSelectedLanguages(prev =>
      prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
    );
  };

  const togglePlatform = (platform: string) => {
    if (platform === 'Tất cả nền tảng') {
      // If "All platforms" is clicked
      if (selectedPlatforms.includes('Tất cả nền tảng')) {
        // Deselect all
        setSelectedPlatforms([]);
      } else {
        // Select all platforms
        setSelectedPlatforms(['Tất cả nền tảng', 'YouTube', 'Instagram', 'TikTok', 'Facebook', 'Twitter/X', 'LinkedIn']);
      }
    } else {
      // If a specific platform is clicked
      setSelectedPlatforms(prev => {
        // Remove "Tất cả nền tảng" if it's selected
        const filtered = prev.filter(p => p !== 'Tất cả nền tảng');
        // Toggle the specific platform
        return filtered.includes(platform) 
          ? filtered.filter(p => p !== platform) 
          : [...filtered, platform];
      });
    }
  };

  const getPlatformButtonText = () => {
    if (selectedPlatforms.length === 0) return 'Nền tảng';
    if (selectedPlatforms.length === 1) return selectedPlatforms[0];
    return `Nền tảng (${selectedPlatforms.length})`;
  };

  const clearAllFilters = () => {
    if (pageType === 'influencer') {
      setIncludeBrandAccounts(false);
      setShowAffiliateOnly(false);
      setSelectedCountries([]);
      setSelectedLanguages([]);
      setGeoLocation('');
      setGeoRadius('');
      setSelectedGender('All');
      setSelectedAgeRanges([]);
    } else {
      setSelectedViolationTypes([]);
      setSelectedReportTypes([]);
      setSelectedDateRange('');
    }
  };

  // Count active filters
  const getActiveFiltersCount = () => {
    if (pageType === 'influencer') {
      let count = 0;
      if (includeBrandAccounts) count++;
      if (showAffiliateOnly) count++;
      count += selectedCountries.length;
      count += selectedLanguages.length;
      if (geoLocation) count++;
      if (selectedGender !== 'All') count++;
      count += selectedAgeRanges.length;
      return count;
    } else {
      let count = 0;
      count += selectedViolationTypes.length;
      count += selectedReportTypes.length;
      if (selectedDateRange) count++;
      return count;
    }
  };

  // Handle search keyword entry
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchInput.trim()) {
      if (!searchKeywords.includes(searchInput.trim())) {
        setSearchKeywords([...searchKeywords, searchInput.trim()]);
      }
      setSearchInput('');
    }
  };

  // Remove functions for tags
  const removeSearchKeyword = (keyword: string) => {
    setSearchKeywords(prev => prev.filter(k => k !== keyword));
  };

  const removePlatform = (platform: string) => {
    togglePlatform(platform);
  };

  const removeCountry = (country: string) => {
    setSelectedCountries(prev => prev.filter(c => c !== country));
  };

  const removeAgeRange = (range: string) => {
    setSelectedAgeRanges(prev => prev.filter(r => r !== range));
  };

  const removeGeoLocation = () => {
    setGeoLocation('');
    setGeoRadius('');
  };

  // Get gender label in Vietnamese
  const getGenderLabel = (gender: string) => {
    if (gender === 'Female') return 'Nữ';
    if (gender === 'Male') return 'Nam';
    return 'Tất cả';
  };

  // Check if there are any active tags
  const hasActiveTags = () => {
    if (pageType === 'influencer') {
      return searchKeywords.length > 0 || 
             selectedPlatforms.length > 0 || 
             selectedCountries.length > 0 || 
             selectedLanguages.length > 0 || 
             selectedGender !== 'All' || 
             selectedAgeRanges.length > 0 || 
             geoLocation || 
             includeBrandAccounts || 
             showAffiliateOnly;
    } else {
      return searchKeywords.length > 0 || 
             selectedPlatforms.length > 0 || 
             selectedViolationTypes.length > 0 || 
             selectedReportTypes.length > 0 || 
             selectedDateRange !== '';
    }
  };

  // Count total active tags
  const getActiveTagsCount = () => {
    if (pageType === 'influencer') {
      let count = 0;
      count += searchKeywords.length;
      count += selectedPlatforms.length;
      count += selectedCountries.length;
      count += selectedLanguages.length;
      count += selectedAgeRanges.length;
      if (selectedGender !== 'All') count++;
      if (geoLocation) count++;
      if (includeBrandAccounts) count++;
      if (showAffiliateOnly) count++;
      return count;
    } else {
      let count = 0;
      count += searchKeywords.length;
      count += selectedPlatforms.length;
      count += selectedViolationTypes.length;
      count += selectedReportTypes.length;
      if (selectedDateRange) count++;
      return count;
    }
  };

  // Clear all tags
  const clearAllTags = () => {
    setSearchKeywords([]);
    setSelectedPlatforms([]);
    if (pageType === 'influencer') {
      setSelectedCountries([]);
      setSelectedLanguages([]);
      setSelectedGender('All');
      setSelectedAgeRanges([]);
      setGeoLocation('');
      setGeoRadius('');
      setIncludeBrandAccounts(false);
      setShowAffiliateOnly(false);
    } else {
      setSelectedViolationTypes([]);
      setSelectedReportTypes([]);
      setSelectedDateRange('');
    }
  };

  // Violation filter toggle functions
  const toggleViolationType = (type: string) => {
    setSelectedViolationTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const toggleReportType = (type: string) => {
    setSelectedReportTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  return (
    <div className={`space-y-3 md:space-y-4 ${className}`}>
      {/* Main Search & Filters */}
      <div className="flex items-center gap-2">
        {/* Total Influencers Count - Hidden on mobile */}
        <div className="hidden md:flex items-center justify-center px-4 py-2.5 bg-card border-2 border-primary text-primary rounded-xl font-bold text-sm flex-shrink-0">
          {totalCount} {countLabel}
        </div>
        
        {/* Search Input - Flexible */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
          <input
            type="text"
            placeholder="Tìm kiếm..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm transition-all"
          />
        </div>

        {/* Platform Filter Dropdown */}
        <div className="relative flex-shrink-0" ref={platformDropdownRef}>
          <button 
            onClick={() => setShowPlatformDropdown(!showPlatformDropdown)}
            className="px-3 md:px-4 py-2.5 text-sm font-medium text-foreground/80 bg-card hover:bg-muted/50 rounded-xl flex items-center gap-2 border border-border transition-all"
          >
            <div className="flex items-center gap-2 min-w-0">
              {selectedPlatforms.length === 0 ? (
                <Globe className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              ) : (
                <div className="flex items-center -space-x-1.5">
                  {selectedPlatforms.slice(0, 3).map((platform) => (
                    <div key={platform}>
                      {getPlatformIcon(platform)}
                    </div>
                  ))}
                  {selectedPlatforms.length > 3 && (
                    <span className="ml-2 text-xs">+{selectedPlatforms.length - 3}</span>
                  )}
                </div>
              )}
              <span className="hidden md:inline">Nền tảng</span>
            </div>
            <ChevronDown className="w-4 h-4 flex-shrink-0 hidden md:block" />
          </button>
          
          {showPlatformDropdown && (
            <div className="absolute top-full mt-2 w-56 bg-card border border-border rounded-xl shadow-lg z-10">
              <div className="p-2">
                {platforms.map((platform) => (
                  <button
                    key={platform.name}
                    onClick={() => togglePlatform(platform.name)}
                    className="w-full text-left px-3 py-2 hover:bg-muted/50 rounded-lg text-sm flex items-center justify-between transition-all"
                  >
                    <div className="flex items-center gap-2">
                      {getPlatformIcon(platform.name)}
                      <span>{platform.name}</span>
                    </div>
                    {selectedPlatforms.includes(platform.name) && (
                      <Check className="w-4 h-4 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Other Filters Dropdown */}
        <div className="relative flex-shrink-0">
          <button 
            onClick={() => setShowOtherFilters(!showOtherFilters)}
            className="px-3 md:px-4 py-2.5 text-sm font-medium text-foreground/80 bg-card hover:bg-muted/50 rounded-xl flex items-center gap-2 border border-border transition-all relative"
          >
            <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            {getActiveFiltersCount() > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center md:hidden">
                {getActiveFiltersCount()}
              </span>
            )}
            <span className="hidden md:inline">
              Bộ lọc
              {getActiveFiltersCount() > 0 && (
                <span className="ml-1 text-primary">({getActiveFiltersCount()})</span>
              )}
            </span>
            <ChevronDown className="w-4 h-4 hidden md:block" />
          </button>
          
          {showOtherFilters && (
            <div className="absolute top-full mt-2 right-0 w-96 bg-card border border-border rounded-xl shadow-lg z-20 max-h-[600px] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-muted [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-muted-foreground/50" ref={otherFiltersDropdownRef}>
              {/* Header with Title and Reset Button */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border sticky top-0 bg-card z-10">
                <h3 className="font-semibold text-foreground">Bộ lọc khác</h3>
                <button
                  onClick={clearAllFilters}
                  className="text-sm text-primary hover:text-primary font-medium transition-colors"
                >
                  Đặt lại
                </button>
              </div>

              <div className="p-4 space-y-4">
                {pageType === 'influencer' ? (
                  <>
                    {/* Channel Filters */}
                    
                    {/* Subscribers Range */}
                    <div>
                      <label className="text-sm font-medium text-foreground/80 mb-2 block">Số lượng Subscribers</label>
                      <div className="grid grid-cols-2 gap-2">
                        {['< 10K', '10K - 100K', '100K - 1M', '> 1M'].map((range) => (
                          <button
                            key={range}
                            onClick={() => toggleAgeRange(range)}
                            className={`px-3 py-2 text-sm rounded-lg border transition-all ${
                              selectedAgeRanges.includes(range)
                                ? 'bg-primary text-white border-primary'
                                : 'bg-card text-foreground/80 border-border hover:border-muted-foreground/40'
                            }`}
                          >
                            {range}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Engagement Rate */}
                    <div>
                      <label className="text-sm font-medium text-foreground/80 mb-2 block">Engagement Rate</label>
                      <div className="grid grid-cols-2 gap-2">
                        {['< 1%', '1% - 3%', '3% - 5%', '> 5%'].map((rate) => (
                          <button
                            key={rate}
                            onClick={() => {
                              setSelectedCountries(prev =>
                                prev.includes(rate) ? prev.filter(c => c !== rate) : [...prev, rate]
                              );
                            }}
                            className={`px-3 py-2 text-sm rounded-lg border transition-all ${
                              selectedCountries.includes(rate)
                                ? 'bg-primary text-white border-primary'
                                : 'bg-card text-foreground/80 border-border hover:border-muted-foreground/40'
                            }`}
                          >
                            {rate}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-border my-2"></div>

                    {/* Content Category */}
                    <div>
                      <label className="text-sm font-medium text-foreground/80 mb-2 block">Danh mục nội dung</label>
                      <div className="relative">
                        <button
                          onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                          className="w-full px-3 py-2 text-sm text-left border border-border rounded-lg hover:border-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary flex items-center justify-between"
                        >
                          <span className="text-muted-foreground">
                            {selectedLanguages.length > 0 
                              ? `Đã chọn (${selectedLanguages.length})` 
                              : 'Chọn danh mục'}
                          </span>
                          <ChevronDown className="w-4 h-4 text-muted-foreground/70" />
                        </button>
                        {showCountryDropdown && (
                          <div className="absolute top-full mt-1 w-full bg-card border border-border rounded-lg shadow-lg z-30 max-h-48 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-muted [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&::-webkit-scrollbar-thumb]:rounded-full" ref={countryDropdownRef}>
                            {['Beauty & Fashion', 'Gaming', 'Tech & Review', 'Food & Cooking', 'Travel', 'Lifestyle', 'Education', 'Entertainment', 'Sports', 'Music'].map((category) => (
                              <button
                                key={category}
                                onClick={() => toggleLanguage(category)}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 flex items-center gap-2 transition-colors"
                              >
                                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                                  selectedLanguages.includes(category) 
                                    ? 'bg-primary border-primary' 
                                    : 'border-border'
                                }`}>
                                  {selectedLanguages.includes(category) && (
                                    <Check className="w-3 h-3 text-white" strokeWidth={3} />
                                  )}
                                </div>
                                {category}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      {/* Selected Categories */}
                      {selectedLanguages.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {selectedLanguages.map((category) => (
                            <span
                              key={category}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-muted text-foreground/80 text-xs rounded-full"
                            >
                              {category}
                              <button
                                onClick={() => removeLanguage(category)}
                                className="hover:text-destructive"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Verified Status */}
                    <div>
                      <label className="text-sm font-medium text-foreground/80 mb-2 block">Trạng thái xác minh</label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { id: 'verified', label: 'Verified' },
                          { id: 'not-verified', label: 'Not Verified' }
                        ].map((status) => (
                          <button
                            key={status.id}
                            onClick={() => {
                              setSelectedReportTypes(prev =>
                                prev.includes(status.id) ? prev.filter(t => t !== status.id) : [...prev, status.id]
                              );
                            }}
                            className={`px-4 py-1.5 text-sm rounded-full border-2 transition-all flex items-center gap-1.5 ${
                              selectedReportTypes.includes(status.id)
                                ? 'bg-primary text-white border-primary'
                                : 'bg-card text-foreground/80 border-border hover:border-primary hover:text-primary'
                            }`}
                          >
                            {selectedReportTypes.includes(status.id) && (
                              <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                            )}
                            {status.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Upload Frequency */}
                    <div>
                      <label className="text-sm font-medium text-foreground/80 mb-2 block">Tần suất đăng bài</label>
                      <div className="flex gap-2">
                        {[
                          { en: 'Daily', vi: 'Hàng ngày' },
                          { en: 'Weekly', vi: 'Hàng tuần' },
                          { en: 'Monthly', vi: 'Hàng tháng' }
                        ].map((freq) => (
                          <button
                            key={freq.en}
                            onClick={() => setSelectedGender(freq.en)}
                            className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-all ${
                              selectedGender === freq.en
                                ? 'bg-primary text-white border-primary'
                                : 'bg-card text-foreground/80 border-border hover:border-muted-foreground/40'
                            }`}
                          >
                            {freq.vi}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Average Views Range */}
                    <div>
                      <label className="text-sm font-medium text-foreground/80 mb-2 block">Lượt xem trung bình</label>
                      <div className="grid grid-cols-2 gap-2">
                        {['< 1K', '1K - 10K', '10K - 100K', '> 100K'].map((views) => (
                          <button
                            key={views}
                            onClick={() => {
                              setSelectedViolationTypes(prev =>
                                prev.includes(views) ? prev.filter(v => v !== views) : [...prev, views]
                              );
                            }}
                            className={`px-3 py-2 text-sm rounded-lg border transition-all ${
                              selectedViolationTypes.includes(views)
                                ? 'bg-primary text-white border-primary'
                                : 'bg-card text-foreground/80 border-border hover:border-muted-foreground/40'
                            }`}
                          >
                            {views}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-border my-2"></div>

                    {/* Channel Age */}
                    <div>
                      <label className="text-sm font-medium text-foreground/80 mb-2 block">Tuổi kênh</label>
                      <div className="relative">
                        <button
                          onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                          className="w-full px-3 py-2 text-sm text-left border border-border rounded-lg hover:border-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary flex items-center justify-between"
                        >
                          <span className="text-muted-foreground">
                            {selectedDateRange 
                              ? (['< 1 năm', '1-3 năm', '3-5 năm', '> 5 năm'][parseInt(selectedDateRange.replace('age', ''))] || 'Chọn tuổi kênh')
                              : 'Chọn tuổi kênh'}
                          </span>
                          <ChevronDown className="w-4 h-4 text-muted-foreground/70" />
                        </button>
                        {showLanguageDropdown && (
                          <div className="absolute top-full mt-1 w-full bg-card border border-border rounded-lg shadow-lg z-30 max-h-48 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-muted [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&::-webkit-scrollbar-thumb]:rounded-full" ref={languageDropdownRef}>
                            {['< 1 năm', '1-3 năm', '3-5 năm', '> 5 năm'].map((age, index) => (
                              <button
                                key={age}
                                onClick={() => {
                                  setSelectedDateRange(`age${index}`);
                                  setShowLanguageDropdown(false);
                                }}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 flex items-center gap-2 transition-colors"
                              >
                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                  selectedDateRange === `age${index}`
                                    ? 'border-primary'
                                    : 'border-border'
                                }`}>
                                  {selectedDateRange === `age${index}` && (
                                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                                  )}
                                </div>
                                {age}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Active Status Toggle */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground/80">Chỉ hiển thị kênh đang hoạt động</span>
                      <button
                        onClick={() => setIncludeBrandAccounts(!includeBrandAccounts)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          includeBrandAccounts ? 'bg-primary' : 'bg-muted-foreground/30'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-card transition-transform ${
                            includeBrandAccounts ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Has Contact Info Toggle */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground/80">Có thông tin liên hệ</span>
                      <button
                        onClick={() => setShowAffiliateOnly(!showAffiliateOnly)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          showAffiliateOnly ? 'bg-primary' : 'bg-muted-foreground/30'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-card transition-transform ${
                            showAffiliateOnly ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Violation Filters */}
                    {/* Violation Type Selection */}
                    <div>
                      <label className="text-sm font-medium text-foreground/80 mb-2 block">Loại vi phạm</label>
                      <div className="relative">
                        <button
                          onClick={() => setShowViolationTypeDropdown(!showViolationTypeDropdown)}
                          className="w-full px-3 py-2 text-sm text-left border border-border rounded-lg hover:border-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary flex items-center justify-between"
                        >
                          <span className="text-muted-foreground">
                            {selectedViolationTypes.length > 0 
                              ? `Đã chọn (${selectedViolationTypes.length})` 
                              : 'Chọn loại vi phạm'}
                          </span>
                          <ChevronDown className="w-4 h-4 text-muted-foreground/70" />
                        </button>
                        {showViolationTypeDropdown && (
                          <div className="absolute top-full mt-1 w-full bg-card border border-border rounded-lg shadow-lg z-30 max-h-48 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-muted [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&::-webkit-scrollbar-thumb]:rounded-full" ref={violationTypeDropdownRef}>
                            {violationTypes.map((type) => (
                              <button
                                key={type}
                                onClick={() => toggleViolationType(type)}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 flex items-center gap-2 transition-colors"
                              >
                                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                                  selectedViolationTypes.includes(type) 
                                    ? 'bg-primary border-primary' 
                                    : 'border-border'
                                }`}>
                                  {selectedViolationTypes.includes(type) && (
                                    <Check className="w-3 h-3 text-white" strokeWidth={3} />
                                  )}
                                </div>
                                {type}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      {/* Selected Violation Types */}
                      {selectedViolationTypes.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {selectedViolationTypes.map((type) => (
                            <span
                              key={type}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-muted text-foreground/80 text-xs rounded-full"
                            >
                              {type}
                              <button
                                onClick={() => toggleViolationType(type)}
                                className="hover:text-destructive"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Report Type Selection */}
                    <div>
                      <label className="text-sm font-medium text-foreground/80 mb-2 block">Nguồn báo cáo</label>
                      <div className="flex flex-wrap gap-2">
                        {reportTypes.map((type) => (
                          <button
                            key={type.id}
                            onClick={() => toggleReportType(type.id)}
                            className={`px-4 py-1.5 text-sm rounded-full border-2 transition-all flex items-center gap-1.5 ${
                              selectedReportTypes.includes(type.id)
                                ? 'bg-primary text-white border-primary'
                                : 'bg-card text-foreground/80 border-border hover:border-primary hover:text-primary'
                            }`}
                          >
                            {selectedReportTypes.includes(type.id) && (
                              <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                            )}
                            {type.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-border my-2"></div>

                    {/* Date Range */}
                    <div>
                      <label className="text-sm font-medium text-foreground/80 mb-2 block">Khoảng thời gian</label>
                      <div className="relative">
                        <button
                          onClick={() => setShowDateRangeDropdown(!showDateRangeDropdown)}
                          className="w-full px-3 py-2 text-sm text-left border border-border rounded-lg hover:border-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary flex items-center justify-between"
                        >
                          <span className="text-muted-foreground">
                            {selectedDateRange 
                              ? dateRangeOptions.find(option => option.id === selectedDateRange)?.label 
                              : 'Chọn khoảng thời gian'}
                          </span>
                          <ChevronDown className="w-4 h-4 text-muted-foreground/70" />
                        </button>
                        {showDateRangeDropdown && (
                          <div className="absolute top-full mt-1 w-full bg-card border border-border rounded-lg shadow-lg z-30 max-h-48 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-muted [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&::-webkit-scrollbar-thumb]:rounded-full" ref={dateRangeDropdownRef}>
                            {dateRangeOptions.map((option) => (
                              <button
                                key={option.id}
                                onClick={() => {
                                  setSelectedDateRange(option.id);
                                  setShowDateRangeDropdown(false);
                                }}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 flex items-center gap-2 transition-colors"
                              >
                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                  selectedDateRange === option.id
                                    ? 'border-primary'
                                    : 'border-border'
                                }`}>
                                  {selectedDateRange === option.id && (
                                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                                  )}
                                </div>
                                {option.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* Clear All Button */}
                
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Active Tags - Horizontal scroll on mobile */}
      {hasActiveTags() && (
        <div className="flex items-center gap-2 md:gap-3">
          <div className="flex flex-nowrap md:flex-wrap gap-2 flex-1 overflow-x-auto pb-1 -mx-3 px-3 md:mx-0 md:px-0 md:overflow-x-visible">
            {/* Search Keywords */}
            {searchKeywords.map((keyword) => (
              <span
                key={keyword}
                className="inline-flex items-center gap-1 px-2 py-1 bg-muted text-foreground/80 text-xs rounded-full"
              >
                {keyword}
                <button
                  onClick={() => removeSearchKeyword(keyword)}
                  className="hover:text-destructive"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            {/* Platforms */}
            {selectedPlatforms.map((platform) => (
              <span
                key={platform}
                className="inline-flex items-center gap-1 px-2 py-1 bg-muted text-foreground/80 text-xs rounded-full"
              >
                {getPlatformIcon(platform)}
                <span>{platform}</span>
                <button
                  onClick={() => removePlatform(platform)}
                  className="hover:text-destructive"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            {/* Countries */}
            {selectedCountries.map((country) => (
              <span
                key={country}
                className="inline-flex items-center gap-1 px-2 py-1 bg-muted text-foreground/80 text-xs rounded-full"
              >
                {country}
                <button
                  onClick={() => removeCountry(country)}
                  className="hover:text-destructive"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            {/* Languages */}
            {selectedLanguages.map((lang) => (
              <span
                key={lang}
                className="inline-flex items-center gap-1 px-2 py-1 bg-muted text-foreground/80 text-xs rounded-full"
              >
                {lang}
                <button
                  onClick={() => removeLanguage(lang)}
                  className="hover:text-destructive"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            {/* Age Ranges */}
            {selectedAgeRanges.map((range) => (
              <span
                key={range}
                className="inline-flex items-center gap-1 px-2 py-1 bg-muted text-foreground/80 text-xs rounded-full"
              >
                {range}
                <button
                  onClick={() => removeAgeRange(range)}
                  className="hover:text-destructive"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            {/* Gender */}
            {selectedGender !== 'All' && (
              <span
                className="inline-flex items-center gap-1 px-2 py-1 bg-muted text-foreground/80 text-xs rounded-full"
              >
                {getGenderLabel(selectedGender)}
                <button
                  onClick={() => setSelectedGender('All')}
                  className="hover:text-destructive"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {/* Brand Accounts */}
            {includeBrandAccounts && (
              <span
                className="inline-flex items-center gap-1 px-2 py-1 bg-muted text-foreground/80 text-xs rounded-full"
              >
                Bao gồm tài khoản thương hiệu
                <button
                  onClick={() => setIncludeBrandAccounts(false)}
                  className="hover:text-destructive"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {/* Affiliate Creators */}
            {showAffiliateOnly && (
              <span
                className="inline-flex items-center gap-1 px-2 py-1 bg-muted text-foreground/80 text-xs rounded-full"
              >
                Chỉ hiển thị creators có affiliate
                <button
                  onClick={() => setShowAffiliateOnly(false)}
                  className="hover:text-destructive"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {/* Geolocation */}
            {geoLocation && (
              <span
                className="inline-flex items-center gap-1 px-2 py-1 bg-muted text-foreground/80 text-xs rounded-full"
              >
                {geoLocation} ({geoRadius} km)
                <button
                  onClick={removeGeoLocation}
                  className="hover:text-destructive"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {/* Violation Filters Tags */}
            {pageType === 'violation' && (
              <>
                {/* Violation Types */}
                {selectedViolationTypes.map((type) => (
                  <span
                    key={type}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-muted text-foreground/80 text-xs rounded-full"
                  >
                    {type}
                    <button
                      onClick={() => toggleViolationType(type)}
                      className="hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}

                {/* Report Types */}
                {selectedReportTypes.map((reportType) => (
                  <span
                    key={reportType}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-muted text-foreground/80 text-xs rounded-full"
                  >
                    {reportTypes.find(t => t.id === reportType)?.label}
                    <button
                      onClick={() => toggleReportType(reportType)}
                      className="hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}

                {/* Date Range */}
                {selectedDateRange && (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-1 bg-muted text-foreground/80 text-xs rounded-full"
                  >
                    {dateRangeOptions.find(option => option.id === selectedDateRange)?.label}
                    <button
                      onClick={() => setSelectedDateRange('')}
                      className="hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </>
            )}
          </div>

          {/* Clear All Button - only show when more than 1 filter */}
          {getActiveTagsCount() > 1 && (
            <button
              onClick={clearAllTags}
              className="flex items-center gap-1 md:gap-1.5 text-muted-foreground hover:text-destructive text-xs font-medium transition-colors flex-shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Xoá</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
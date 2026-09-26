import { useState, useRef, useEffect } from 'react';
import { FilterBar } from '../components/FilterBar';
import { CreatorCard } from '../components/CreatorCard';
import { InfluencerDrawer } from '../components/InfluencerDrawer';
import { creators as initialCreators } from '../data/creators';

export function InfluencerList() {
  const [activeFilters, setActiveFilters] = useState(['AI', 'Automation', 'SaaS', 'Martech', 'CRM', 'Cloud']);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedCreator, setSelectedCreator] = useState<typeof initialCreators[0] | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerActiveTab, setDrawerActiveTab] = useState('overview');
  const [selectedCreatorIds, setSelectedCreatorIds] = useState<number[]>([]);
  const [rejectedCreatorIds, setRejectedCreatorIds] = useState<number[]>([]);
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
  const dropdownRefs = useRef<{[key: number]: HTMLDivElement | null}>({});
  const [creators, setCreators] = useState(initialCreators);
  
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

  const handleRemoveFilter = (filter: string) => {
    setActiveFilters(activeFilters.filter(f => f !== filter));
  };

  const handleOpenDrawer = (creator: typeof initialCreators[0]) => {
    setSelectedCreator(creator);
    setIsDrawerOpen(true);
  };

  const handleOpenDrawerWithTab = (creator: typeof initialCreators[0], tab: string) => {
    setSelectedCreator(creator);
    setIsDrawerOpen(true);
    setDrawerActiveTab(tab);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
  };

  const handleTabChange = (tab: string) => {
    setDrawerActiveTab(tab);
  };

  const handleSelectCreator = (creatorId: number) => {
    setRejectedCreatorIds(prev => prev.filter(id => id !== creatorId));
    if (!selectedCreatorIds.includes(creatorId)) {
      setSelectedCreatorIds(prev => [...prev, creatorId]);
    }
  };

  const handleRejectCreator = (creatorId: number) => {
    setSelectedCreatorIds(prev => prev.filter(id => id !== creatorId));
    if (!rejectedCreatorIds.includes(creatorId)) {
      setRejectedCreatorIds(prev => [...prev, creatorId]);
    }
  };



  const filteredCreators = creators.filter(creator => {
    if (activeTab === 'selected') {
      return selectedCreatorIds.includes(creator.id);
    }
    if (activeTab === 'rejected') {
      return rejectedCreatorIds.includes(creator.id);
    }
    return true;
  });

  const tabs = [
    { id: 'all', label: 'KOL/KOC/celeb' },
    { id: 'selected', label: 'Đã chọn', count: selectedCreatorIds.length },
    { id: 'rejected', label: 'Không chọn', count: rejectedCreatorIds.length },
  ];

  return (
    <>
      {/* Tabs - Horizontal scroll on mobile */}
      <div className="bg-card border-b border-border px-3 md:px-6">
        <div className="flex items-center gap-3 md:gap-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-2.5 md:py-3 border-b-2 transition-all text-sm whitespace-nowrap ${
                tab.id === activeTab
                  ? 'border-primary text-primary -mb-[1px]'
                  : 'border-transparent text-foreground/80 hover:text-foreground'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className="bg-muted text-foreground/80 px-2 py-0.5 rounded-full text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="p-3 md:p-6 space-y-4 md:space-y-6">
        {/* Filter Bar */}
        <FilterBar activeFilters={activeFilters} onRemoveFilter={handleRemoveFilter} className="mb-3" />

        {/* Creator Cards */}
        <div className="space-y-3">
          {filteredCreators.map((creator) => (
            <CreatorCard 
              key={creator.id} 
              creator={creator}
              onOpenDrawer={() => handleOpenDrawer(creator)}
              onTabChange={handleTabChange}
              onSelect={handleSelectCreator}
              onReject={handleRejectCreator}
              onMessageClick={() => handleOpenDrawerWithTab(creator, 'email')}
              openDropdownId={openDropdownId}
              setOpenDropdownId={setOpenDropdownId}
              dropdownRefs={dropdownRefs}
            />
          ))}
        </div>
      </div>

      {/* Influencer Drawer */}
      <InfluencerDrawer
        creator={selectedCreator}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        activeTab={drawerActiveTab}
        onTabChange={setDrawerActiveTab}
      />
    </>
  );
}
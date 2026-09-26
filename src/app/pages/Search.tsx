import { Search as SearchIcon } from 'lucide-react';

export function Search() {
  return (
    <div className="p-6">
      <div className="bg-card rounded-xl border border-border p-12 text-center">
        <SearchIcon className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
        <h1 className="text-2xl font-semibold text-foreground mb-2">Tìm kiếm Influencer</h1>
        <p className="text-muted-foreground">Tính năng đang được phát triển</p>
      </div>
    </div>
  );
}

import { BookMarked } from 'lucide-react';

export function Saved() {
  return (
    <div className="p-6">
      <div className="bg-card rounded-xl border border-border p-12 text-center">
        <BookMarked className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
        <h1 className="text-2xl font-semibold text-foreground mb-2">Đã lưu</h1>
        <p className="text-muted-foreground">Chưa có mục nào được lưu</p>
      </div>
    </div>
  );
}

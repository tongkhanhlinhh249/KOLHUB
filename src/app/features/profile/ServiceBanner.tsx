import { Link } from 'react-router';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { SAFETY_BASE } from '../../auth/roles';
import type { OwnerType } from '../../services';

/** "Tổng quan hồ sơ" side column: promotes KOL Safety (check videos before posting, monitor channels). */
export function ServiceBanner({ ownerType }: { ownerType: OwnerType }) {
  const whose = ownerType === 'MCN' ? 'các kênh MCN quản lý' : 'kênh của bạn';
  return (
    <section
      aria-labelledby="service-banner-title"
      className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary to-primary/75 p-5 text-primary-foreground shadow-sm"
    >
      <ShieldCheck className="pointer-events-none absolute -right-6 -bottom-6 size-36 opacity-15" aria-hidden />
      <p className="text-xs font-semibold tracking-widest uppercase opacity-90">Dịch vụ KOL Safety</p>
      <h2 id="service-banner-title" className="mt-1.5 text-lg leading-snug font-bold">
        Kiểm duyệt nội dung trước khi đăng
      </h2>
      <p className="mt-2 text-sm opacity-90">
        Phát hiện nội dung có rủi ro vi phạm và theo dõi {whose} để giữ dấu Kênh xác thực luôn an toàn.
      </p>
      <div className="relative mt-4 flex flex-wrap gap-2">
        <Button asChild variant="secondary" className="h-11 bg-white text-primary hover:bg-white/90 md:h-9">
          <Link to={`${SAFETY_BASE}/video`}>
            Kiểm tra video
            <ArrowRight aria-hidden />
          </Link>
        </Button>
        <Button
          asChild
          variant="ghost"
          className="h-11 text-primary-foreground hover:bg-white/15 hover:text-primary-foreground md:h-9"
        >
          <Link to={`${SAFETY_BASE}/tiktok`}>Kiểm duyệt kênh</Link>
        </Button>
      </div>
    </section>
  );
}

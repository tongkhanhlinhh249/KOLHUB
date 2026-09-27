import type { ReactNode } from 'react';
import { RefreshCw, Search, ShieldCheck, type LucideIcon } from 'lucide-react';
import logoImg from '../../../assets/logo.svg';
import type { AccountType } from '../../services';

const EYEBROW: Record<AccountType, string> = {
  KOL: 'Dành cho người sáng tạo nội dung',
  MCN: 'Dành cho tổ chức quản lý kênh',
  BIZ: 'Dành cho nhãn hàng và agency',
};

const HEADLINE = 'Minh bạch từng kênh. Tin cậy từng hợp tác.';

const FEATURES: { icon: LucideIcon; text: string }[] = [
  { icon: ShieldCheck, text: 'Xác thực danh tính bằng CCCD và cấp dấu Kênh xác thực cho từng kênh.' },
  { icon: Search, text: 'Nhãn hàng/Agency tìm KOL đã xác thực theo lĩnh vực, khu vực và nền tảng.' },
  { icon: RefreshCw, text: 'Hồ sơ và trạng thái xác thực đồng bộ với kol.gov.vn.' },
];

function Eyebrow({ type }: { type: AccountType }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
      {EYEBROW[type]}
    </p>
  );
}

/** Desktop (≥ lg) brand column. */
function BrandPanel({ type }: { type: AccountType }) {
  return (
    <aside
      aria-label="Giới thiệu KOLHUB"
      className="hidden bg-gradient-to-br from-primary/10 via-page to-accent/40 lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-[46%] lg:shrink-0 lg:flex-col lg:justify-center lg:self-start lg:overflow-y-auto lg:px-12 lg:py-16 lg:[scrollbar-width:none] xl:w-1/2 xl:px-20 [&::-webkit-scrollbar]:hidden"
    >
      <div className="max-w-lg space-y-10">
        <img src={logoImg} alt="KOLHUB" className="h-9 w-auto object-contain object-left" />
        <div className="space-y-5">
          <Eyebrow type={type} />
          <h2 className="text-4xl font-semibold leading-tight tracking-tight text-foreground xl:text-5xl xl:leading-[1.1]">
            {HEADLINE}
          </h2>
          <p className="text-base leading-relaxed text-muted-foreground">
            KOLHUB giúp người sáng tạo chứng minh danh tính và chủ quyền kênh, giúp nhãn hàng tìm đúng KOL đã được xác
            thực.
          </p>
        </div>
        <ul className="space-y-4">
          {FEATURES.map((f) => (
            <li key={f.text} className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <f.icon className="size-[18px]" aria-hidden />
              </span>
              <span className="pt-1.5 text-sm leading-snug text-foreground">{f.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

/** Tablet (md–lg) compact band above the form. */
function BrandBand({ type }: { type: AccountType }) {
  return (
    <div className="hidden border-b border-border bg-gradient-to-br from-primary/10 via-page to-accent/40 md:block lg:hidden">
      <div className="mx-auto max-w-xl space-y-3 px-6 py-8">
        <img src={logoImg} alt="KOLHUB" className="h-8 w-auto object-contain object-left" />
        <Eyebrow type={type} />
        <h2 className="text-2xl font-semibold leading-tight tracking-tight text-foreground">{HEADLINE}</h2>
      </div>
    </div>
  );
}

/**
 * Split-screen guest frame for Đăng ký / Đăng nhập / Quên mật khẩu.
 * `accountType` only drives the brand eyebrow; the page owns the h1.
 */
export function AuthShell({ accountType, children }: { accountType: AccountType; children: ReactNode }) {
  // overflow-x-clip (not hidden): hidden would make this a scroll container and break the sticky brand panel.
  return (
    <div className="flex min-h-dvh w-full overflow-x-clip bg-card">
      <BrandPanel type={accountType} />
      <div className="flex min-w-0 flex-1 flex-col">
        <BrandBand type={accountType} />
        {/* Bottom padding keeps the last button clear of the floating Demo Panel button. */}
        <main className="flex flex-1 flex-col justify-center px-4 pt-8 pb-[calc(9rem+env(safe-area-inset-bottom))] sm:px-6 md:pt-10 md:pb-24 lg:px-10 lg:py-16">
          <div className="mx-auto w-full max-w-xl">
            <div className="mb-8 flex justify-center md:hidden">
              <img src={logoImg} alt="KOLHUB" className="h-8 w-auto object-contain" />
            </div>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

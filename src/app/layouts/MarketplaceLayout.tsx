import { useCallback } from 'react';
import { Link, Outlet, ScrollRestoration, useLocation, useNavigate, useSearchParams } from 'react-router';
import { LayoutDashboard, Plus } from 'lucide-react';
import logoImg from '../../assets/logo.svg';
import logoMarkImg from '../../assets/logo-mark.svg';
import { useAuth } from '../auth/AuthContext';
import { CAMPAIGNS_PATH, MARKETPLACE_PATH, ROLE_CONFIG } from '../auth/roles';
import { AccountMenu } from '../components/AccountMenu';
import { buttonVariants } from '../components/ui/button';
import { cn } from '../components/ui/utils';
import { KeywordSearch } from '../features/filters/KeywordSearch';
import { withParam } from '../features/supplier-booking/supplierBooking';

const SEARCH_PLACEHOLDER = 'Tìm tên chiến dịch, nhãn hàng, brief';
const SEARCH_LABEL = 'Tìm chiến dịch theo tên, nhãn hàng hoặc brief';

/**
 * Public frame of the Sàn chiến dịch (/san, /san/<id>), outside the app shell: marketplace header (logo, title,
 * keyword search bound to ?q=, sign-in actions or account + "Vào KOLHUB"), full-width content, small footer.
 * Open to every role incl. guests (roles.PUBLIC_PATHS).
 */
export function MarketplaceLayout() {
  const { role } = useAuth();
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const onList = pathname.replace(/\/+$/, '') === MARKETPLACE_PATH;
  const keyword = params.get('q')?.trim() || undefined;
  // On the list: filter in place. On a campaign page (/san/<id>): search goes back to the list with ?q=.
  const setKeyword = useCallback(
    (kw: string | undefined) => {
      const q = kw?.trim() || null;
      if (onList) setParams((prev) => withParam(prev, 'q', q), { replace: true });
      else if (q) navigate(`${MARKETPLACE_PATH}?${new URLSearchParams({ q }).toString()}`);
    },
    [onList, setParams, navigate],
  );
  const guest = role === 'kolhub.guest';
  const returnTo = encodeURIComponent(pathname + search);
  const { home } = ROLE_CONFIG[role];

  const renderSearch = (className: string) => (
    <KeywordSearch keyword={keyword} onKeywordChange={setKeyword} placeholder={SEARCH_PLACEHOLDER} label={SEARCH_LABEL} className={className} />
  );

  return (
    <div className="flex min-h-dvh w-full flex-col overflow-x-clip bg-page">
      <header className="sticky top-0 z-30 border-b border-panel bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85">
        <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center gap-3 px-4 md:px-6">
          <Link
            to={MARKETPLACE_PATH}
            aria-label="KOLHUB - Sàn chiến dịch"
            className="flex min-h-11 shrink-0 items-center rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <img src={logoMarkImg} alt="" className="h-7 w-auto object-contain sm:hidden" />
            <img src={logoImg} alt="" className="hidden h-7 w-auto object-contain object-left sm:block" />
          </Link>
          <span className="hidden h-5 w-px shrink-0 bg-border sm:block" aria-hidden />
          <p className="min-w-0 truncate text-sm font-semibold text-foreground md:text-base">Sàn chiến dịch</p>

          {renderSearch('mx-2 hidden max-w-md flex-1 md:block lg:mx-6')}

          <div className="ml-auto flex shrink-0 items-center gap-2">
            {guest ? (
              <>
                <Link
                  to={`/dang-nhap?returnTo=${returnTo}`}
                  className={buttonVariants({ variant: 'ghost', className: 'h-11 px-3 md:h-9' })}
                >
                  Đăng nhập
                </Link>
                <Link to="/dang-ky" className={buttonVariants({ className: 'h-11 px-3 md:h-9 md:px-4' })}>
                  Đăng ký
                </Link>
              </>
            ) : (
              <>
                {role === 'kolhub.user.biz' && (
                  <Link
                    to={`${CAMPAIGNS_PATH}/tao`}
                    aria-label="Đăng chiến dịch"
                    className={buttonVariants({ className: 'size-11 px-0 sm:w-auto sm:px-3 md:h-9' })}
                  >
                    <Plus aria-hidden />
                    <span className="hidden sm:inline">Đăng chiến dịch</span>
                  </Link>
                )}
                <Link
                  to={home}
                  aria-label="Vào KOLHUB"
                  className={buttonVariants({ variant: 'outline', className: 'size-11 px-0 sm:w-auto sm:px-3 md:h-9' })}
                >
                  <LayoutDashboard aria-hidden />
                  <span className="hidden sm:inline">Vào KOLHUB</span>
                </Link>
                <AccountMenu variant="market" logoutTo={MARKETPLACE_PATH} />
              </>
            )}
          </div>
        </div>
        {/* Phones / small tablets: search on its own row */}
        <div className="mx-auto w-full max-w-[1200px] px-4 pb-3 md:hidden">{renderSearch('w-full')}</div>
      </header>

      <main className="mx-auto w-full max-w-[1200px] min-w-0 flex-1 px-4 py-5 md:px-6 md:py-8">
        <Outlet />
      </main>
      {/* Keyed by pathname: a campaign page opens at the top, "back" returns to the list's position, and
          filter / keyword changes on the list (same pathname) keep the scroll position. */}
      <ScrollRestoration getKey={(loc) => loc.pathname} />

      <footer className="border-t border-panel bg-card">
        <div
          className={cn(
            'mx-auto flex w-full max-w-[1200px] flex-col gap-2 px-4 py-5 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between md:px-6',
            // Keep the last line clear of the floating demo button on phones.
            'pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-5',
          )}
        >
          <p>© 2026 KOLHUB · Sàn chiến dịch kết nối Nhãn hàng với KOL/MCN có kênh đã xác thực.</p>
          <Link
            to={guest ? '/dang-ky' : home}
            className="inline-flex min-h-11 items-center self-start font-medium text-primary underline-offset-4 hover:underline md:min-h-0"
          >
            {guest ? 'Tạo tài khoản KOLHUB' : 'Vào KOLHUB'}
          </Link>
        </div>
      </footer>
    </div>
  );
}

import { Outlet } from 'react-router';
import logoImg from '../../assets/logo.svg';

/** Guest frame: logo on top, content card centred, no sidebar. */
export function GuestLayout() {
  return (
    <div className="min-h-dvh w-full overflow-x-hidden bg-page pb-safe">
      <div className="mx-auto flex w-full max-w-xl flex-col px-4 py-6 sm:py-10">
        <div className="mb-6 flex justify-center sm:mb-8">
          <img src={logoImg} alt="KOLHUB" className="h-8 w-auto object-contain" />
        </div>
        <main className="rounded-[20px] border border-panel bg-card p-4 shadow-xs sm:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

/** Right-column page title: the single h1 of each guest page. */
export function AuthPageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="space-y-2 text-center">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{title}</h1>
      <p className="text-sm text-muted-foreground sm:text-base">{subtitle}</p>
    </div>
  );
}

/** Legal line under the guest forms (links are placeholders in the prototype). */
export function AuthLegalNote() {
  const link =
    'rounded-sm font-medium text-foreground underline underline-offset-2 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
  return (
    <p className="text-center text-xs leading-relaxed text-muted-foreground">
      Bằng việc sử dụng KOLHUB, bạn đồng ý với{' '}
      <a href="#" className={link}>
        Điều khoản sử dụng
      </a>{' '}
      và{' '}
      <a href="#" className={link}>
        Chính sách bảo mật
      </a>
      .
    </p>
  );
}

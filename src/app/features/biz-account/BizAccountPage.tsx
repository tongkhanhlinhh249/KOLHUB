import { useState } from 'react';
import { Building2, MailCheck, Pencil } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { useAuth } from '../../auth/AuthContext';
import { ChangeEmailDialog } from './ChangeEmailDialog';
import { EditBizProfileDialog } from './EditBizProfileDialog';

/** SCR-08 — Brand/Agency account settings. */
export function BizAccountPage() {
  const { account } = useAuth();
  const [editOpen, setEditOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 p-4 md:p-6">
      <Card className="gap-4">
        <CardHeader>
          <CardTitle>Thông tin doanh nghiệp</CardTitle>
          <CardAction>
            <Button type="button" variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil aria-hidden />
              Sửa
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 sm:grid-cols-[160px_1fr] sm:gap-x-6">
            <dt className="text-sm text-muted-foreground">Họ tên</dt>
            <dd className="-mt-2 font-medium break-words text-foreground sm:mt-0">{account?.fullName || '—'}</dd>
            <dt className="text-sm text-muted-foreground">Tên công ty</dt>
            <dd className="-mt-2 font-medium break-words text-foreground sm:mt-0">{account?.company || '—'}</dd>
          </dl>
        </CardContent>
      </Card>

      <Card className="gap-4">
        <CardHeader>
          <CardTitle>Email công ty</CardTitle>
          <CardDescription>Email dùng để đăng nhập và nhận thông báo.</CardDescription>
          <CardAction>
            <Button type="button" variant="outline" size="sm" onClick={() => setEmailOpen(true)}>
              Đổi email
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <span className="min-w-0 font-medium break-all text-foreground">{account?.email}</span>
          <Badge className="gap-1">
            <MailCheck className="size-3" aria-hidden />
            Đã xác thực
          </Badge>
        </CardContent>
      </Card>

      <Card className="gap-4">
        <CardHeader>
          <CardTitle>Loại tài khoản</CardTitle>
        </CardHeader>
        <CardContent className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Building2 className="size-5" aria-hidden />
          </div>
          <div className="space-y-1">
            <p className="font-medium text-foreground">Nhãn hàng/Agency</p>
            <p className="text-sm text-muted-foreground">
              Dùng Tìm kiếm KOL, Xem hồ sơ KOL và Danh sách đã lưu. Không cần eKYC hay giấy chứng nhận.
            </p>
          </div>
        </CardContent>
      </Card>

      <EditBizProfileDialog open={editOpen} onOpenChange={setEditOpen} />
      <ChangeEmailDialog open={emailOpen} onOpenChange={setEmailOpen} />
    </div>
  );
}

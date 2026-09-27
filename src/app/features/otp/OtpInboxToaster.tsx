import { useEffect } from 'react';
import { toast } from 'sonner';
import { Mail, MessageSquare } from 'lucide-react';
import { otpInbox, type OtpMessage } from '../../services';
import { maskTarget } from './mask';

/** Fake SMS/email inbox: every OTP the mock service "sends" shows up as a toast. */
export function OtpInboxToaster() {
  useEffect(
    () =>
      otpInbox.subscribe((m: OtpMessage) => {
        const Icon = m.channel === 'sms' ? MessageSquare : Mail;
        const title =
          m.channel === 'sms'
            ? `Tin nhắn tới ${maskTarget('sms', m.target)}`
            : `Email tới ${maskTarget('email', m.target)}`;
        toast(title, {
          id: `otp-${m.channel}-${m.target}`,
          description: m.body,
          duration: 20_000,
          icon: <Icon className="size-4 text-primary" aria-hidden />,
          action: {
            label: 'Điền mã',
            onClick: () => {
              navigator.clipboard?.writeText(m.code).catch(() => undefined);
              window.dispatchEvent(new CustomEvent('kolhub:otp-fill', { detail: m }));
            },
          },
        });
      }),
    [],
  );
  return null;
}

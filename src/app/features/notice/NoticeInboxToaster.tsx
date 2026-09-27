import { useEffect } from 'react';
import { toast } from 'sonner';
import { Mail, MessageSquare } from 'lucide-react';
import { noticeInbox, type NoticeMessage } from '../../services';
import { maskTarget } from '../otp/mask';

/** Fake email/SMS inbox for review results (BR-17): every notice shows up as a toast. */
export function NoticeInboxToaster() {
  useEffect(
    () =>
      noticeInbox.subscribe((m: NoticeMessage) => {
        const Icon = m.channel === 'sms' ? MessageSquare : Mail;
        const heading =
          m.channel === 'sms' ? `Tin nhắn tới ${maskTarget('sms', m.target)}` : `Email tới ${maskTarget('email', m.target)}`;
        toast(heading, {
          description: (
            <span className="block space-y-0.5">
              <span className="block font-medium text-foreground">{m.title}</span>
              <span className="block">{m.body}</span>
            </span>
          ),
          duration: 15_000,
          icon: <Icon className="size-4 text-primary" aria-hidden />,
        });
      }),
    [],
  );
  return null;
}

import { useCallback, useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react';
import { ArrowLeft, Loader2, Mail, MessageSquare } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { cn } from '../../components/ui/utils';
import { KolhubError, otpService, type OtpChannel, type OtpMessage, type OtpPurpose } from '../../services';
import { maskTarget } from './mask';

const LENGTH = 6;

interface OtpStepProps {
  channel: OtpChannel;
  target: string;
  purpose: OtpPurpose;
  onVerified(requestId: string): void;
  onBack?(): void;
}

interface SentRequest {
  requestId: string;
  resendAvailableAt: number;
  expiresAt: number;
}

// Last code sent per (channel, target, purpose) in this tab. Going "back" and returning
// reuses a still-valid code instead of hitting the 60-second resend limit (KOLHUB-4007).
const lastSent = new Map<string, SentRequest>();
const keyOf = (c: OtpChannel, t: string, p: OtpPurpose) => `${c}|${t.trim().toLowerCase()}|${p}`;

function messageOf(e: unknown): string {
  if (e instanceof Error && e.message) return e.message;
  return 'Đã có lỗi xảy ra. Vui lòng thử lại.';
}

/** Shared OTP entry step (BR-04, BR-49): sends on mount, 6 digit boxes, 60-second resend. */
export function OtpStep({ channel, target, purpose, onVerified, onBack }: OtpStepProps) {
  const [digits, setDigits] = useState<string[]>(() => Array(LENGTH).fill(''));
  const [request, setRequest] = useState<SentRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [resendBlockedUntil, setResendBlockedUntil] = useState(0);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const started = useRef(false);
  const cacheKey = keyOf(channel, target, purpose);

  const send = useCallback(async () => {
    setSending(true);
    setError(null);
    try {
      const r = await otpService.send({ channel, target, purpose });
      lastSent.set(cacheKey, r);
      setRequest(r);
      setResendBlockedUntil(r.resendAvailableAt);
      setDigits(Array(LENGTH).fill(''));
      inputs.current[0]?.focus();
    } catch (e) {
      if (e instanceof KolhubError && e.meta?.retryAfterSec) {
        setResendBlockedUntil(Date.now() + e.meta.retryAfterSec * 1000);
      }
      setError(messageOf(e));
    } finally {
      setSending(false);
    }
  }, [channel, target, purpose, cacheKey]);

  // Send once on mount (guarded for StrictMode double effects), or reuse a still-valid code.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const cached = lastSent.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      setRequest(cached);
      setResendBlockedUntil(cached.resendAvailableAt);
      inputs.current[0]?.focus();
    } else {
      void send();
    }
  }, [cacheKey, send]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const verify = useCallback(
    async (code: string) => {
      if (!request || verifying) return;
      setVerifying(true);
      setError(null);
      try {
        await otpService.verify({ requestId: request.requestId, code });
        lastSent.delete(cacheKey);
        onVerified(request.requestId);
      } catch (e) {
        setError(messageOf(e));
        setDigits(Array(LENGTH).fill(''));
        inputs.current[0]?.focus();
      } finally {
        setVerifying(false);
      }
    },
    [request, verifying, cacheKey, onVerified],
  );

  const fill = useCallback(
    (code: string) => {
      const clean = code.replace(/\D/g, '').slice(0, LENGTH);
      if (!clean) return;
      const next = Array.from({ length: LENGTH }, (_, i) => clean[i] ?? '');
      setDigits(next);
      inputs.current[Math.min(clean.length, LENGTH - 1)]?.focus();
      if (clean.length === LENGTH) void verify(clean);
    },
    [verify],
  );

  // "Điền mã" in the fake inbox toast fills the boxes directly.
  useEffect(() => {
    const onFill = (ev: Event) => {
      const m = (ev as CustomEvent<OtpMessage>).detail;
      if (m?.channel === channel) fill(m.code);
    };
    window.addEventListener('kolhub:otp-fill', onFill);
    return () => window.removeEventListener('kolhub:otp-fill', onFill);
  }, [channel, fill]);

  const setDigit = (i: number, raw: string) => {
    const v = raw.replace(/\D/g, '');
    if (v.length > 1) {
      fill(v);
      return;
    }
    const next = [...digits];
    next[i] = v;
    setDigits(next);
    if (v && i < LENGTH - 1) inputs.current[i + 1]?.focus();
    if (v && next.every((d) => d)) void verify(next.join(''));
  };

  const onKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && i > 0) {
      e.preventDefault();
      inputs.current[i - 1]?.focus();
    } else if (e.key === 'ArrowRight' && i < LENGTH - 1) {
      e.preventDefault();
      inputs.current[i + 1]?.focus();
    }
  };

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    fill(e.clipboardData.getData('text'));
  };

  const secondsLeft = Math.max(0, Math.ceil((resendBlockedUntil - now) / 1000));
  const code = digits.join('');
  const Icon = channel === 'sms' ? MessageSquare : Mail;
  const channelLabel = channel === 'sms' ? 'số điện thoại' : 'email';
  const errorId = `otp-error-${channel}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className="size-6" aria-hidden />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-foreground">
            {channel === 'sms' ? 'Xác thực số điện thoại' : 'Xác thực email'}
          </h2>
          <p className="text-sm text-muted-foreground">
            Nhập mã 6 số đã gửi tới {channelLabel}{' '}
            <span className="font-medium text-foreground">{maskTarget(channel, target)}</span>. Mã có hiệu lực 5 phút.
          </p>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (code.length === LENGTH) void verify(code);
        }}
        className="space-y-4"
      >
        <fieldset className="flex justify-center gap-2 sm:gap-3" aria-describedby={error ? errorId : undefined}>
          <legend className="sr-only">Mã OTP gồm 6 chữ số</legend>
          {digits.map((d, i) => (
            <Input
              key={i}
              ref={(el) => {
                inputs.current[i] = el;
              }}
              value={d}
              onChange={(e) => setDigit(i, e.target.value)}
              onKeyDown={(e) => onKeyDown(i, e)}
              onPaste={onPaste}
              onFocus={(e) => e.target.select()}
              inputMode="numeric"
              autoComplete={i === 0 ? 'one-time-code' : 'off'}
              pattern="[0-9]*"
              maxLength={LENGTH}
              aria-label={`Chữ số ${i + 1}`}
              aria-invalid={error ? true : undefined}
              disabled={verifying || !request}
              className={cn(
                'h-12 w-11 px-0 text-center text-lg font-semibold sm:w-12',
                error && 'border-destructive',
              )}
            />
          ))}
        </fieldset>

        <p id={errorId} role="alert" aria-live="assertive" className="min-h-5 text-center text-sm text-destructive">
          {error}
        </p>

        <Button type="submit" className="h-11 w-full" disabled={code.length !== LENGTH || verifying || !request}>
          {verifying && <Loader2 className="animate-spin" aria-hidden />}
          Xác nhận
        </Button>
      </form>

      <div className="flex flex-col-reverse items-center justify-between gap-2 sm:flex-row">
        {onBack ? (
          <Button type="button" variant="ghost" className="h-11" onClick={onBack}>
            <ArrowLeft aria-hidden />
            Quay lại
          </Button>
        ) : (
          <span />
        )}
        <div className="text-sm text-muted-foreground" aria-live="polite">
          {secondsLeft > 0 ? (
            <span>Gửi lại mã sau {secondsLeft} giây</span>
          ) : (
            <Button type="button" variant="link" className="h-11 px-2" onClick={() => void send()} disabled={sending}>
              {sending && <Loader2 className="animate-spin" aria-hidden />}
              Gửi lại mã
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

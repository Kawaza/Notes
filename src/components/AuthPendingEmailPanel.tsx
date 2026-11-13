import { Loader2, Mail } from 'lucide-react';

type AuthPendingEmailPanelProps = {
  email: string;
  resending: boolean;
  resendMessage: string | null;
  onResend: () => void;
  onBackToSignIn: () => void;
  onUseDifferentEmail?: () => void;
  resendDisabled?: boolean;
  compact?: boolean;
};

export function AuthPendingEmailPanel({
  email,
  resending,
  resendMessage,
  onResend,
  onBackToSignIn,
  onUseDifferentEmail,
  resendDisabled = false,
  compact = false,
}: AuthPendingEmailPanelProps) {
  return (
    <div
      className={`rounded-xl border border-border bg-muted/40 space-y-4 ${
        compact ? 'p-4' : 'p-6'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 rounded-full bg-primary/10 p-2 text-primary">
          <Mail size={compact ? 18 : 22} />
        </div>
        <div className="space-y-3 min-w-0">
          <div className="space-y-2">
            <h2 className={`font-semibold ${compact ? 'text-sm' : 'text-base'}`}>
              Confirm your email
            </h2>
            <p className={`text-muted-foreground leading-relaxed ${compact ? 'text-xs' : 'text-sm'}`}>
              We sent a confirmation link to{' '}
              <span className="font-medium text-foreground break-all">{email}</span>.
            </p>
          </div>
          <ol
            className={`list-decimal list-inside space-y-1 text-muted-foreground ${
              compact ? 'text-xs' : 'text-sm'
            }`}
          >
            <li>Open the email and tap the confirmation link.</li>
            <li>Return to Notes and sign in with the same password.</li>
          </ol>
        </div>
      </div>

      {resendMessage && (
        <p
          className={`${compact ? 'text-xs' : 'text-sm'} ${
            resendMessage.toLowerCase().includes('could not') ||
            resendMessage.toLowerCase().includes('fail')
              ? 'text-destructive'
              : 'text-muted-foreground'
          }`}
        >
          {resendMessage}
        </p>
      )}

      <div className={`flex flex-wrap gap-2 ${compact ? '' : 'pt-1'}`}>
        <button
          type="button"
          onClick={onBackToSignIn}
          className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 cursor-pointer"
        >
          Sign in
        </button>
        <button
          type="button"
          disabled={resending || resendDisabled}
          onClick={onResend}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted cursor-pointer disabled:opacity-60 flex items-center gap-2"
        >
          {resending && <Loader2 size={14} className="animate-spin" />}
          Resend email
        </button>
        {onUseDifferentEmail && (
          <button
            type="button"
            onClick={onUseDifferentEmail}
            className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground cursor-pointer"
          >
            Use a different email
          </button>
        )}
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { CheckCircle2, MailX } from 'lucide-react';
import { NotesLogo } from './NotesLogo';
import { supabase, isSupabaseConfigured } from '../sync/supabaseClient';
import { parseAuthCallbackHash } from '../sync/authRedirect';

type Status = 'loading' | 'confirmed' | 'expired' | 'error';

export function AuthEmailConfirmed() {
  const [status, setStatus] = useState<Status>('loading');
  const [detail, setDetail] = useState<string | null>(null);

  useEffect(() => {
    const hash = parseAuthCallbackHash();
    if (!hash.ok) {
      const expired =
        hash.error === 'access_denied' &&
        (hash.errorDescription?.toLowerCase().includes('expired') ||
          hash.errorDescription?.toLowerCase().includes('invalid'));
      setStatus(expired ? 'expired' : 'error');
      setDetail(
        expired
          ? 'That confirmation link has expired.'
          : 'We could not verify that link. Try signing up again or request a new email from the app.',
      );
      return;
    }

    if (!isSupabaseConfigured() || !supabase) {
      setStatus('confirmed');
      return;
    }

    void (async () => {
      const { error } = await supabase.auth.getSession();
      if (error) {
        setStatus('error');
        setDetail('Something went wrong. You can still try signing in from the Notes app.');
        return;
      }
      setStatus('confirmed');
    })();
  }, []);

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background mobile-page-padding">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="flex justify-center">
          <NotesLogo />
        </div>

        {status === 'loading' && (
          <p className="text-sm text-muted-foreground">Confirming your email…</p>
        )}

        {status === 'confirmed' && (
          <>
            <div className="flex justify-center text-primary">
              <CheckCircle2 size={48} strokeWidth={1.5} />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight">Email confirmed</h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                You&apos;re all set. Open the Notes app and sign in with your email and password.
              </p>
            </div>
          </>
        )}

        {status === 'expired' && (
          <>
            <div className="flex justify-center text-muted-foreground">
              <MailX size={48} strokeWidth={1.5} />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-semibold">Link expired</h1>
              <p className="text-sm text-muted-foreground leading-relaxed">{detail}</p>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="flex justify-center text-destructive">
              <MailX size={48} strokeWidth={1.5} />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-semibold">Couldn&apos;t confirm</h1>
              <p className="text-sm text-muted-foreground leading-relaxed">{detail}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

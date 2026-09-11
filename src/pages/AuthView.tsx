import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { BrandMark } from '../components/TrophyBadge';
import { APP_NAME } from '../lib/constants';
import { getRememberMe } from '../lib/supabase';
import { Button, FieldLabel, Switch } from '../components/ui';
import { LockIcon, MailIcon, RefreshIcon } from '../components/icons';
import { cn } from '../lib/cn';

type Mode = 'signin' | 'signup';

export const AuthView: React.FC = () => {
  const { signIn, signUp } = useAuth();

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(getRememberMe);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'signup' && password.length < 8) {
      setError('Choose a password of at least 8 characters.');
      return;
    }

    setBusy(true);
    const result =
      mode === 'signin' ? await signIn(email, password, remember) : await signUp(email, password);
    setBusy(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.needsConfirmation) setConfirmationSent(true);
  };

  if (confirmationSent) {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-inset bg-positive-wash text-positive">
            <MailIcon size={22} />
          </span>
          <h1 className="m-0 font-display text-[24px] font-bold text-ink">Confirm your email</h1>
          <p className="m-0 text-[14px] text-muted [text-wrap:pretty]">
            We sent a confirmation link to <span className="text-ink">{email}</span>. Open it, then
            come back and sign in.
          </p>
          <Button
            variant="outline"
            size="xl"
            className="w-full"
            onClick={() => {
              setConfirmationSent(false);
              setMode('signin');
              setPassword('');
            }}
          >
            Back to sign in
          </Button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="flex flex-col items-start gap-3">
        <BrandMark size={20} />
        <div>
          <h1 className="m-0 font-display text-[30px] font-bold leading-[1.1] tracking-[-0.02em] text-ink">
            {APP_NAME}
          </h1>
          <p className="m-0 mt-1.5 text-[13px] text-muted [text-wrap:pretty]">
            One cabinet for every Steam achievement and PlayStation platinum you have earned.
          </p>
        </div>
      </div>

      <div
        role="tablist"
        aria-label="Sign in or create an account"
        className="flex gap-0.5 rounded-control bg-surface-2 p-[3px]"
      >
        <ModeTab active={mode === 'signin'} onClick={() => setMode('signin')}>
          Sign in
        </ModeTab>
        <ModeTab active={mode === 'signup'} onClick={() => setMode('signup')}>
          Create account
        </ModeTab>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <FieldLabel htmlFor="tt-auth-email">Email address</FieldLabel>
          <input
            id="tt-auth-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="player@example.com"
            className="h-12 w-full rounded-control border-0 bg-surface-2 px-3.5 text-[15px] text-ink shadow-[inset_0_0_0_1px_var(--tt-line)] transition-shadow focus:shadow-[inset_0_0_0_1px_var(--tt-accent)] focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-2">
          <FieldLabel htmlFor="tt-auth-password">Password</FieldLabel>
          <input
            id="tt-auth-password"
            type="password"
            required
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === 'signup' ? 'At least 8 characters' : '••••••••'}
            className="h-12 w-full rounded-control border-0 bg-surface-2 px-3.5 text-[15px] text-ink shadow-[inset_0_0_0_1px_var(--tt-line)] transition-shadow focus:shadow-[inset_0_0_0_1px_var(--tt-accent)] focus:outline-none"
          />
        </div>

        {mode === 'signin' ? (
          <div className="flex items-center justify-between gap-3">
            <span className="text-[13px] text-muted">Keep me signed in on this device</span>
            <Switch checked={remember} onChange={setRemember} label="Keep me signed in" />
          </div>
        ) : null}

        {error ? (
          <p
            role="alert"
            className="m-0 rounded-control bg-danger-wash px-3 py-2.5 text-[13px] text-danger shadow-[inset_0_0_0_1px_rgb(242_104_111_/_.35)]"
          >
            {error}
          </p>
        ) : null}

        <Button type="submit" variant="accent" size="xl" disabled={busy} className="w-full">
          {busy ? (
            <RefreshIcon size={16} className="animate-spin" />
          ) : (
            <LockIcon size={16} />
          )}
          {mode === 'signin' ? 'Sign in' : 'Create account'}
        </Button>
      </form>
    </Shell>
  );
};

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex min-h-dvh items-center justify-center bg-[radial-gradient(circle_at_50%_0%,var(--tt-surface-2),var(--tt-bg)_62%)] p-6">
    <div className="flex w-full max-w-[420px] flex-col gap-6 rounded-panel bg-surface p-[clamp(24px,5vw,40px)] shadow-[inset_0_0_0_1px_var(--tt-line),0_32px_80px_-24px_rgb(0_0_0_/_.9)]">
      {children}
    </div>
  </div>
);

const ModeTab: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({
  active,
  onClick,
  children,
}) => (
  <button
    type="button"
    role="tab"
    aria-selected={active}
    onClick={onClick}
    className={cn(
      'h-8 flex-1 cursor-pointer rounded-[3px] border-0 font-display text-[13px] font-bold transition-colors',
      active ? 'bg-surface-3 text-ink' : 'bg-transparent text-subtle hover:text-muted',
    )}
  >
    {children}
  </button>
);

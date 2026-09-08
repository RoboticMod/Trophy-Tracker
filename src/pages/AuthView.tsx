import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Loader2, LogIn, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { TrophyPair } from '../components/TrophyBadge';
import { APP_NAME } from '../lib/constants';
import { Button, Field, TextInput } from '../components/ui';

type Mode = 'signin' | 'signup';

export const AuthView: React.FC = () => {
  const { signIn, signUp } = useAuth();

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    const result = mode === 'signin' ? await signIn(email, password) : await signUp(email, password);
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
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-positive-100 text-positive-900">
            <Mail size={22} />
          </div>
          <h1 className="text-400 font-bold text-gray-1000">Confirm your email</h1>
          <p className="text-100 text-gray-700">
            We sent a confirmation link to <span className="text-gray-900">{email}</span>. Open it,
            then come back and sign in.
          </p>
          <Button
            variant="secondary"
            buttonStyle="outline"
            size="l"
            className="w-full"
            onClick={() => {
              setConfirmationSent(false);
              setMode('signin');
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
      <div className="mb-6 space-y-2 text-center">
        {/* Same brand lockup as the sidebar: both award marks, not a glyph. */}
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-gray-200">
          <TrophyPair size={22} />
        </div>
        <h1 className="text-500 font-bold tracking-tight text-gray-1000">{APP_NAME}</h1>
        <p className="text-100 text-gray-700">
          {mode === 'signin'
            ? 'Sign in to reach your library on any device.'
            : 'Create an account to start tracking.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Email">
          {(props) => (
            <TextInput
              {...props}
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          )}
        </Field>

        <Field
          label="Password"
          description={mode === 'signup' ? 'At least 8 characters.' : undefined}
        >
          {(props) => (
            <TextInput
              {...props}
              type="password"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          )}
        </Field>

        {error ? (
          <p
            role="alert"
            className="rounded-sm border border-negative-700 bg-negative-100 px-3 py-2 text-75 text-negative-900"
          >
            {error}
          </p>
        ) : null}

        <Button type="submit" variant="accent" size="l" className="w-full" disabled={busy}>
          {busy ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
          <span>{mode === 'signin' ? 'Sign in' : 'Create account'}</span>
        </Button>
      </form>

      <p className="mt-5 text-center text-75 text-gray-700">
        {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}{' '}
        <button
          type="button"
          onClick={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin');
            setError(null);
          }}
          className="rounded-sm font-semibold text-accent-900 hover:underline"
        >
          {mode === 'signin' ? 'Create one' : 'Sign in'}
        </button>
      </p>
    </Shell>
  );
};

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex min-h-dvh items-center justify-center bg-gray-50 p-6">
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="w-full max-w-sm rounded-lg border border-gray-200 bg-gray-100 p-7 shadow-lg"
    >
      {children}
    </motion.div>
  </div>
);

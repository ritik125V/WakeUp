'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { signIn } from 'next-auth/react';
import { User, Mail, KeyRound, ArrowRight, Zap, Activity, AlertCircle } from 'lucide-react';
import { signupWithPin } from '@/lib/api';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !pin) return;

    if (pin.length < 4) {
      setError('Security PIN must be at least 4 characters long');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await signupWithPin(email, pin, name);
      router.push('/');
      router.refresh();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else if (axiosIsError(err)) {
        setError(err.response?.data?.error || 'Signup failed');
      } else {
        setError('Failed to create account. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-neutral-100 flex flex-col items-center justify-center p-4 sm:p-6 font-mono">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full max-w-md space-y-5 z-10"
      >
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-neutral-900 border border-neutral-800 text-xs font-mono text-rose-300 uppercase rounded-md">
            <Activity className="w-3.5 h-3.5 text-rose-300" /> NEW ACCOUNT
          </div>
          <h1 className="text-2xl font-bold uppercase text-white tracking-wide">REGISTER ACCOUNT</h1>
          <p className="text-xs text-neutral-400">Set up Email & Security PIN or Social OAuth</p>
        </div>

        <div className="p-6 bg-neutral-950 border border-neutral-800 rounded-none space-y-5 shadow-2xl">
          {error && (
            <div className="p-3 text-xs bg-red-950/40 border border-red-800/80 text-red-400 rounded-none flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs text-neutral-300 uppercase flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-red-500" /> DISPLAY NAME
              </label>
              <input
                type="text"
                placeholder="Alex Dev"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2 bg-black border border-neutral-800 focus:border-red-600 rounded-none text-neutral-100 text-xs font-mono outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-neutral-300 uppercase flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-red-500" /> EMAIL ADDRESS *
              </label>
              <input
                type="email"
                placeholder="user@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3.5 py-2 bg-black border border-neutral-800 focus:border-red-600 rounded-none text-neutral-100 text-xs font-mono outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-neutral-300 uppercase flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-red-500" /> SECURITY PIN (MIN 4 CHARS) *
              </label>
              <input
                type="password"
                placeholder="••••"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                required
                minLength={4}
                className="w-full px-3.5 py-2 bg-black border border-neutral-800 focus:border-red-600 rounded-none text-neutral-100 text-xs font-mono outline-none tracking-widest"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !email || !pin}
              className="w-full py-2.5 bg-red-600 hover:bg-red-700 active:bg-red-600 text-white text-xs font-mono font-bold uppercase border border-red-500 transition-all flex items-center justify-center gap-2 rounded-none disabled:opacity-50"
            >
              {loading ? (
                <span className="text-xs">CREATING...</span>
              ) : (
                <>
                  CREATE ACCOUNT WITH PIN <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-neutral-900 w-full" />
            <span className="bg-neutral-950 px-2 text-[10px] font-mono text-neutral-500 uppercase absolute">OR</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              disabled
              type="button"
              className="flex items-center justify-center gap-2 px-3 py-2 bg-neutral-900/60 text-neutral-500 text-xs uppercase border border-neutral-800/40 rounded-none cursor-not-allowed opacity-50"
            >
              GitHub (Disabled)
            </button>

            <button
              disabled
              type="button"
              className="flex items-center justify-center gap-2 px-3 py-2 bg-neutral-900/60 text-neutral-500 text-xs uppercase border border-neutral-800/40 rounded-none cursor-not-allowed opacity-50"
            >
              Google (Disabled)
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-neutral-400 font-mono">
          ALREADY REGISTERED?{' '}
          <Link href="/login" className="text-red-400 hover:underline font-bold uppercase">
            LOG IN WITH PIN
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

function axiosIsError(err: unknown): err is { response?: { data?: { error?: string } } } {
  return typeof err === 'object' && err !== null && 'response' in err;
}

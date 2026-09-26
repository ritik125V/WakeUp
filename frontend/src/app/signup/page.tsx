'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { User, Mail, ArrowRight, Activity, AlertCircle } from 'lucide-react';
import { signupWithPin } from '@/lib/api';
import { DynamicPinInput } from '@/components/DynamicPinInput';

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
      setError('Security PIN must be at least 4 digits long');
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
    <div className="min-h-screen bg-black text-neutral-100 flex flex-col items-center justify-center px-3.5 sm:px-6 py-4 sm:py-8 font-sans">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full max-w-md space-y-5 z-10"
      >
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-neutral-900 text-xs font-semibold text-neutral-300 uppercase rounded-full">
            <Activity className="w-3.5 h-3.5 text-white" /> Create Account
          </div>
          <h1 className="text-xl sm:text-2xl font-bold uppercase text-white tracking-wide">
            Register Account
          </h1>
          <p className="text-xs text-neutral-400">Set up Email & Security PIN to access WakeUp</p>
        </div>

        <div className="p-4 sm:p-6 bg-neutral-950 rounded-2xl space-y-5 shadow-2xl border-none font-sans">
          {error && (
            <div className="p-3 text-xs bg-rose-950/60 text-rose-300 rounded-xl flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-neutral-400" /> Display Name
              </label>
              <input
                type="text"
                placeholder="e.g. Alex Rivera"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-neutral-900 rounded-xl text-neutral-100 text-xs font-sans outline-none border-none focus:ring-1 focus:ring-neutral-600"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-neutral-400" /> Email Address *
              </label>
              <input
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-neutral-900 rounded-xl text-neutral-100 text-xs font-sans outline-none border-none focus:ring-1 focus:ring-neutral-600"
              />
            </div>

            {/* Dynamic Expandable Box Security PIN Input */}
            <div className="pt-2">
              <DynamicPinInput
                value={pin}
                onChange={setPin}
                minBoxes={4}
                label="Security PIN (Min 4 Digits) *"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !email || pin.length < 4}
              className="w-full py-2.5 min-h-[44px] bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-800 text-white text-xs font-semibold uppercase rounded-xl transition-all flex items-center justify-center gap-2 border-none disabled:opacity-50 cursor-pointer shadow-md mt-4 touch-press touch-manipulation"
            >
              {loading ? (
                <span className="text-xs">Creating Account...</span>
              ) : (
                <>
                  <span>Create Account</span> <ArrowRight className="w-4 h-4 text-white" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-neutral-400 font-sans">
          Already registered?{' '}
          <Link href="/login" className="text-white hover:underline font-semibold">
            Log in with PIN
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

function axiosIsError(err: unknown): err is { response?: { data?: { error?: string } } } {
  return typeof err === 'object' && err !== null && 'response' in err;
}

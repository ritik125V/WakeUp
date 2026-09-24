'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import {
  User as UserIcon,
  Mail,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Save,
  Server,
  Layers,
  Lock,
  ArrowLeft,
} from 'lucide-react';
import {
  fetchCurrentUser,
  changeUserPin,
  updateUserProfile,
  fetchGroupedEndpoints,
  fetchWorkflows,
  UserData,
} from '@/lib/api';

export default function ProfilePage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();

  const [user, setUser] = useState<(UserData & { createdAt?: string }) | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // Stats
  const [endpointCount, setEndpointCount] = useState<number>(0);
  const [workflowCount, setWorkflowCount] = useState<number>(0);

  // Profile Edit State
  const [name, setName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // PIN Change State
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [changingPin, setChangingPin] = useState(false);
  const [pinMsg, setPinMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoadingUser(true);

      // Check localStorage token first
      const localToken = typeof window !== 'undefined' ? localStorage.getItem('wakeup_auth_token') : null;
      const localUserData = typeof window !== 'undefined' ? localStorage.getItem('wakeup_user') : null;

      if (!localToken && sessionStatus === 'unauthenticated') {
        router.push('/login');
        return;
      }

      try {
        if (localToken) {
          const fetchedUser = await fetchCurrentUser();
          if (fetchedUser) {
            setUser(fetchedUser);
            setName(fetchedUser.name || '');
          }
        } else if (session?.user) {
          setUser({
            id: 'oauth-user',
            email: session.user.email || '',
            name: session.user.name || '',
            avatar: session.user.image || '',
            provider: (session.user as { provider?: string }).provider === 'github' ? 'github' : 'google',
          });
          setName(session.user.name || '');
        } else if (localUserData) {
          const parsed = JSON.parse(localUserData);
          setUser(parsed);
          setName(parsed.name || '');
        }

        // Load stats
        try {
          const [epRes, wfRes] = await Promise.all([fetchGroupedEndpoints(), fetchWorkflows()]);
          setEndpointCount(epRes.totalEndpoints);
          setWorkflowCount(wfRes.workflows.length);
        } catch (e) {
          console.error('Failed to load stats:', e);
        }
      } catch (err: unknown) {
        console.error('Failed to load user profile:', err);
      } finally {
        setLoadingUser(false);
      }
    }

    loadData();
  }, [session, sessionStatus, router]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);

    try {
      const res = await updateUserProfile({ name });
      setUser((prev) => (prev ? { ...prev, name: res.user.name } : res.user));
      setProfileMsg({ type: 'success', text: 'Profile display name updated successfully!' });

      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('wakeup_user');
        if (stored) {
          const parsed = JSON.parse(stored);
          parsed.name = res.user.name;
          localStorage.setItem('wakeup_user', JSON.stringify(parsed));
        }
      }
    } catch (err: any) {
      setProfileMsg({
        type: 'error',
        text: err.response?.data?.error || 'Failed to update display name.',
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinMsg(null);

    if (newPin.length < 4) {
      setPinMsg({ type: 'error', text: 'New Security PIN must be at least 4 characters long.' });
      return;
    }

    if (newPin !== confirmPin) {
      setPinMsg({ type: 'error', text: 'New PIN and Confirm PIN do not match.' });
      return;
    }

    setChangingPin(true);

    try {
      const res = await changeUserPin(currentPin, newPin);
      setPinMsg({ type: 'success', text: res.message || 'Security PIN updated successfully!' });
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
    } catch (err: any) {
      setPinMsg({
        type: 'error',
        text: err.response?.data?.error || 'Failed to update Security PIN.',
      });
    } finally {
      setChangingPin(false);
    }
  };

  if (loadingUser) {
    return (
      <div className="min-h-screen bg-black text-neutral-100 flex items-center justify-center font-mono">
        <div className="flex items-center gap-2 text-rose-300 text-xs">
          <RefreshCw className="w-4 h-4 animate-spin text-rose-300" /> Loading User Profile...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-neutral-100 font-mono p-4 sm:p-8">
      <div className="w-full max-w-4xl mx-auto space-y-6">
        {/* Navigation Header */}
        <div className="flex items-center justify-between border-b border-neutral-900 pb-4">
          <div className="space-y-1">
            <button
              onClick={() => router.push('/')}
              className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors mb-1"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-rose-300" /> Return to Dashboard
            </button>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-neutral-900 text-rose-300 text-[10px] rounded-md font-bold uppercase">
                <UserIcon className="w-3.5 h-3.5 text-rose-300" /> ACCOUNT PROFILE
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-wide">
              User Profile & Security Settings
            </h1>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 bg-neutral-950 rounded-lg flex items-center justify-between border-none">
            <div>
              <span className="text-[10px] text-neutral-400 uppercase block">Registered Endpoints</span>
              <p className="text-xl font-bold text-white mt-0.5">{endpointCount}</p>
            </div>
            <Server className="w-5 h-5 text-rose-300" />
          </div>

          <div className="p-4 bg-neutral-950 rounded-lg flex items-center justify-between border-none">
            <div>
              <span className="text-[10px] text-neutral-400 uppercase block">Configured Workflows</span>
              <p className="text-xl font-bold text-rose-300 mt-0.5">{workflowCount}</p>
            </div>
            <Layers className="w-5 h-5 text-rose-300" />
          </div>

          <div className="p-4 bg-neutral-950 rounded-lg flex items-center justify-between border-none">
            <div>
              <span className="text-[10px] text-neutral-400 uppercase block">Account Security</span>
              <p className="text-xs font-bold text-emerald-400 mt-1 flex items-center gap-1 uppercase">
                <ShieldCheck className="w-3.5 h-3.5" /> SECURED & ACTIVE
              </p>
            </div>
            <Lock className="w-5 h-5 text-emerald-400" />
          </div>
        </div>

        {/* User Details & Profile Form */}
        <div className="p-6 bg-neutral-950 rounded-lg space-y-6 border-none shadow-md">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-neutral-900 pb-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-neutral-900 border border-neutral-800 text-rose-300 rounded-full flex items-center justify-center text-lg font-bold">
                {user?.name ? user.name.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div>
                <h2 className="text-base font-bold text-white">{user?.name || 'User Account'}</h2>
                <p className="text-xs text-neutral-400 flex items-center gap-1 mt-0.5">
                  <Mail className="w-3 h-3 text-neutral-500" /> {user?.email}
                </p>
              </div>
            </div>

            <span className="px-2.5 py-1 bg-neutral-900 text-rose-300 text-[10px] font-bold uppercase rounded-md border-none">
              AUTH METHOD: {user?.provider?.toUpperCase() || 'CREDENTIALS'}
            </span>
          </div>

          {/* Edit Display Name Form */}
          <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-md">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <UserIcon className="w-3.5 h-3.5 text-rose-300" /> Display Name
            </h3>

            {profileMsg && (
              <div
                className={`p-3 text-xs rounded-md flex items-center gap-2 ${
                  profileMsg.type === 'success'
                    ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60'
                    : 'bg-rose-950/60 text-rose-300 border border-rose-800/60'
                }`}
              >
                {profileMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{profileMsg.text}</span>
              </div>
            )}

            <div className="space-y-1">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter display name"
                className="w-full px-3.5 py-2 bg-black border border-neutral-800 focus:border-rose-400 rounded-md text-white text-xs outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-md transition-all border-none cursor-pointer disabled:opacity-50"
            >
              {savingProfile ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" /> Save Display Name
                </>
              )}
            </button>
          </form>
        </div>

        {/* Change Security PIN Section */}
        <div className="p-6 bg-neutral-950 rounded-lg space-y-5 border-none shadow-md">
          <div className="border-b border-neutral-900 pb-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-rose-300" /> SECURITY PIN MANAGEMENT
            </h2>
            <p className="text-xs text-neutral-400 mt-1">
              Update your 4-digit Security PIN used for account access and authorization.
            </p>
          </div>

          {pinMsg && (
            <div
              className={`p-3 text-xs rounded-md flex items-center gap-2 ${
                pinMsg.type === 'success'
                  ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60'
                  : 'bg-rose-950/60 text-rose-300 border border-rose-800/60'
              }`}
            >
              {pinMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{pinMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleChangePin} className="space-y-4 max-w-md">
            <div className="space-y-1">
              <label className="text-xs text-neutral-300 uppercase block">CURRENT SECURITY PIN</label>
              <input
                type="password"
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value)}
                placeholder="••••"
                className="w-full px-3.5 py-2 bg-black border border-neutral-800 focus:border-rose-400 rounded-md text-white text-xs outline-none tracking-widest"
              />
              <span className="text-[10px] text-neutral-500 block">
                Leave blank if setting PIN for the first time on OAuth accounts.
              </span>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-neutral-300 uppercase block">NEW SECURITY PIN (MIN 4 DIGITS)</label>
              <input
                type="password"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="••••"
                required
                minLength={4}
                className="w-full px-3.5 py-2 bg-black border border-neutral-800 focus:border-rose-400 rounded-md text-white text-xs outline-none tracking-widest"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-neutral-300 uppercase block">CONFIRM NEW SECURITY PIN</label>
              <input
                type="password"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                placeholder="••••"
                required
                minLength={4}
                className="w-full px-3.5 py-2 bg-black border border-neutral-800 focus:border-rose-400 rounded-md text-white text-xs outline-none tracking-widest"
              />
            </div>

            <button
              type="submit"
              disabled={changingPin || !newPin || !confirmPin}
              className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-md transition-all border-none cursor-pointer disabled:opacity-50 shadow-sm"
            >
              {changingPin ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Updating PIN...
                </>
              ) : (
                <>
                  <KeyRound className="w-3.5 h-3.5" /> Update Security PIN
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

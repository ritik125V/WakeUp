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
  GitBranch,
  Sparkles,
  Copy,
  Check,
  LogOut,
  Search,
  ExternalLink,
  FolderGit2,
  Settings,
  X,
} from 'lucide-react';
import {
  fetchCurrentUser,
  changeUserPin,
  updateUserProfile,
  fetchGroupedEndpoints,
  fetchWorkflows,
  fetchUserGithubStatus,
  syncUserGithubStatus,
  bindUserGithubInstallationId,
  disconnectUserGithub,
  fetchGithubRepos,
  fetchGithubAppConfig,
  IUserGithubStatus,
  IGithubRepoItem,
  UserData,
} from '@/lib/api';
import { openGithubAppInstallPopup } from '@/lib/githubPopup';
import { DynamicPinInput } from '@/components/DynamicPinInput';

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

  // Global GitHub Integration State
  const [githubStatus, setGithubStatus] = useState<IUserGithubStatus | null>(null);
  const [githubAppConfig, setGithubAppConfig] = useState<{ appName: string; installUrl: string } | null>(null);
  const [manualInstallationId, setManualInstallationId] = useState('');
  const [bindingGithub, setBindingGithub] = useState(false);
  const [disconnectingGithub, setDisconnectingGithub] = useState(false);
  const [githubMsg, setGithubMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [connectedRepos, setConnectedRepos] = useState<IGithubRepoItem[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [repoFilter, setRepoFilter] = useState('');
  const [showGithubSettingsModal, setShowGithubSettingsModal] = useState(false);
  const [showAccountSettingsModal, setShowAccountSettingsModal] = useState(false);

  const loadConnectedRepos = async (username?: string) => {
    try {
      setLoadingRepos(true);
      const res = await fetchGithubRepos({ username: username || 'ritik125V' });
      setConnectedRepos(res.repos || []);
    } catch (err) {
      console.error('Failed to fetch connected GitHub repos:', err);
    } finally {
      setLoadingRepos(false);
    }
  };

  const loadGithubInfo = async (forceSync: boolean = false) => {
    try {
      const [statusRes, configRes] = await Promise.all([
        fetchUserGithubStatus(forceSync).catch(() => null),
        fetchGithubAppConfig().catch(() => null),
      ]);
      if (statusRes) {
        setGithubStatus(statusRes);
        if (statusRes.githubAppConnected) {
          loadConnectedRepos(statusRes.githubUsername || user?.name || 'ritik125V');
        }
      }
      if (configRes) setGithubAppConfig(configRes);
    } catch (e) {
      console.error('Failed to load GitHub info:', e);
    }
  };

  const handleConnectGithubPopup = () => {
    const userIdState = user?.id || (user as any)?._id || '';
    openGithubAppInstallPopup({
      installUrl: githubAppConfig?.installUrl || 'https://github.com/apps/letsWakeUp/installations/new',
      state: userIdState,
      onSuccess: async (data) => {
        if (data.installationId) {
          try {
            await bindUserGithubInstallationId(data.installationId);
          } catch (e) {
            console.error('Failed to bind installation ID:', e);
          }
        } else {
          try {
            await syncUserGithubStatus();
          } catch (e) {
            console.error('Failed to sync GitHub installation status:', e);
          }
        }
        setGithubMsg({ type: 'success', text: '✅ GitHub App connected successfully! Repositories synced.' });
        await loadGithubInfo(true);
      },
    });
  };

  const handleBindInstallationId = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInstallationId.trim()) return;
    try {
      setBindingGithub(true);
      setGithubMsg(null);
      const res = await bindUserGithubInstallationId(manualInstallationId.trim());
      setGithubMsg({ type: 'success', text: res.message });
      setManualInstallationId('');
      await loadGithubInfo();
    } catch (err: any) {
      setGithubMsg({ type: 'error', text: err?.response?.data?.error || 'Failed to bind GitHub App Installation ID' });
    } finally {
      setBindingGithub(false);
    }
  };

  const handleDisconnectGithub = async () => {
    if (!confirm('Are you sure you want to disconnect your GitHub App integration?')) return;
    try {
      setDisconnectingGithub(true);
      setGithubMsg(null);
      const res = await disconnectUserGithub();
      setGithubMsg({ type: 'success', text: res.message || 'GitHub App integration disconnected successfully.' });
      setGithubStatus({ githubAppConnected: false, githubInstallationId: '', webhookUrl: '' });
      setConnectedRepos([]);
      setShowGithubSettingsModal(false);
    } catch (err: any) {
      setGithubMsg({ type: 'error', text: err?.response?.data?.error || 'Failed to disconnect GitHub App' });
    } finally {
      setDisconnectingGithub(false);
    }
  };

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

        // Load stats & GitHub status
        try {
          const [epRes, wfRes] = await Promise.all([fetchGroupedEndpoints(), fetchWorkflows()]);
          setEndpointCount(epRes.totalEndpoints);
          setWorkflowCount(wfRes.workflows.length);
        } catch (e) {
          console.error('Failed to load stats:', e);
        }

        // Load GitHub Integration info & handle auto-bind from callback URL
        await loadGithubInfo(false);

        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          const instId = params.get('installation_id');
          const connected = params.get('github_app_connected');

          if (instId) {
            try {
              const res = await bindUserGithubInstallationId(instId);
              setGithubMsg({ type: 'success', text: res.message || 'GitHub App connected & bound to your account!' });
              await loadGithubInfo(true);
            } catch (err: any) {
              setGithubMsg({ type: 'success', text: 'GitHub App authorized & connected successfully!' });
            }
          } else if (connected === 'true') {
            setGithubMsg({ type: 'success', text: 'GitHub App authorized & connected successfully!' });
          }
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
      <div className="min-h-screen bg-black text-neutral-100 flex items-center justify-center font-sans">
        <div className="flex items-center gap-2 text-rose-300 text-xs font-sans">
          <RefreshCw className="w-4 h-4 animate-spin text-rose-300" /> Loading User Profile...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-neutral-100 font-sans px-3.5 sm:px-6 py-4 sm:py-8 touch-manipulation">
      <div className="w-full max-w-4xl mx-auto space-y-6">
        {/* Navigation Header */}
        <div className="flex items-center justify-between border-b border-neutral-900 pb-4">
          <div className="space-y-1">
            <button
              onClick={() => router.push('/')}
              className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors mb-1"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-neutral-400" /> Return to Dashboard
            </button>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-neutral-900 text-neutral-300 text-[10px] rounded-md font-semibold uppercase">
                <UserIcon className="w-3.5 h-3.5 text-neutral-400" /> ACCOUNT PROFILE
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
            <Server className="w-5 h-5 text-neutral-400" />
          </div>

          <div className="p-4 bg-neutral-950 rounded-lg flex items-center justify-between border-none">
            <div>
              <span className="text-[10px] text-neutral-400 uppercase block">Configured Workflows</span>
              <p className="text-xl font-bold text-white mt-0.5">{workflowCount}</p>
            </div>
            <Layers className="w-5 h-5 text-neutral-400" />
          </div>

          <div className="p-4 bg-neutral-950 rounded-lg flex items-center justify-between border-none">
            <div>
              <span className="text-[10px] text-neutral-400 uppercase block">Account Security</span>
              <p className="text-xs font-bold text-emerald-400 mt-1 flex items-center gap-1 uppercase">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> SECURED & ACTIVE
              </p>
            </div>
            <Lock className="w-5 h-5 text-neutral-400" />
          </div>
        </div>

        {/* User Details & Quick Profile Card */}
        <div className="p-6 bg-neutral-950 rounded-2xl space-y-4 border-none shadow-md font-sans">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-neutral-900 border border-neutral-800 text-white rounded-2xl flex items-center justify-center text-lg font-bold">
                {user?.name ? user.name.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <span>{user?.name || 'User Account'}</span>
                  <span className="px-2 py-0.5 bg-neutral-900 text-neutral-300 text-[10px] font-semibold uppercase rounded-md border-none">
                    {user?.provider?.toUpperCase() || 'CREDENTIALS'}
                  </span>
                </h2>
                <p className="text-xs text-neutral-400 flex items-center gap-1 mt-1">
                  <Mail className="w-3.5 h-3.5 text-neutral-400" /> {user?.email}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowAccountSettingsModal(true)}
              className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 hover:text-white text-xs font-semibold rounded-xl border-none cursor-pointer transition-colors flex items-center gap-2"
            >
              <Settings className="w-4 h-4 text-neutral-400" />
              <span>Edit Profile & Security</span>
            </button>
          </div>
        </div>

        {/* Account & Security Settings Modal */}
        {showAccountSettingsModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-neutral-950 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-6 border-none shadow-2xl font-sans text-neutral-100"
            >
              <div className="flex items-center justify-between border-b border-neutral-900 pb-3">
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-neutral-400" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white">Profile & Security Settings</h3>
                </div>
                <button
                  onClick={() => setShowAccountSettingsModal(false)}
                  className="p-1.5 hover:bg-neutral-900 text-neutral-400 hover:text-white rounded-lg border-none cursor-pointer"
                >
                  <X className="w-4 h-4 text-neutral-400" />
                </button>
              </div>

              {/* Edit Display Name Section */}
              <div className="space-y-4">
                <h4 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <UserIcon className="w-3.5 h-3.5 text-neutral-400" /> Display Name
                </h4>

                {profileMsg && (
                  <div
                    className={`p-3 text-xs rounded-xl flex items-center gap-2 ${
                      profileMsg.type === 'success'
                        ? 'bg-emerald-950/80 text-emerald-300'
                        : 'bg-rose-950/80 text-rose-300'
                    }`}
                  >
                    {profileMsg.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    )}
                    <span>{profileMsg.text}</span>
                  </div>
                )}

                <form onSubmit={handleUpdateProfile} className="space-y-3">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter display name"
                    className="w-full px-3.5 py-2 bg-black border-none rounded-xl text-white text-xs outline-none"
                  />
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all border-none cursor-pointer disabled:opacity-50 flex items-center gap-2"
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
              <div className="pt-4 border-t border-neutral-900 space-y-4">
                <div>
                  <h4 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-neutral-400" /> Security PIN Management
                  </h4>
                  <p className="text-[11px] text-neutral-400 mt-1">
                    Update your 4-digit Security PIN used for authorization.
                  </p>
                </div>

                {pinMsg && (
                  <div
                    className={`p-3 text-xs rounded-xl flex items-center gap-2 ${
                      pinMsg.type === 'success'
                        ? 'bg-emerald-950/80 text-emerald-300'
                        : 'bg-rose-950/80 text-rose-300'
                    }`}
                  >
                    {pinMsg.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    )}
                    <span>{pinMsg.text}</span>
                  </div>
                )}

                <form onSubmit={handleChangePin} className="space-y-4">
                  <DynamicPinInput
                    value={currentPin}
                    onChange={setCurrentPin}
                    minBoxes={4}
                    label="Current Security PIN"
                  />
                  <p className="text-[10px] text-neutral-500 -mt-2">
                    Leave blank if setting PIN for the first time.
                  </p>

                  <DynamicPinInput
                    value={newPin}
                    onChange={setNewPin}
                    minBoxes={4}
                    label="New Security PIN (Min 4 Digits) *"
                  />

                  <DynamicPinInput
                    value={confirmPin}
                    onChange={setConfirmPin}
                    minBoxes={4}
                    label="Confirm New Security PIN *"
                  />

                  <button
                    type="submit"
                    disabled={changingPin || !newPin || newPin.length < 4 || newPin !== confirmPin}
                    className="w-full py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold rounded-xl transition-all border-none cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
                  >
                    {changingPin ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Updating Security PIN...
                      </>
                    ) : (
                      <>
                        <KeyRound className="w-3.5 h-3.5" /> Update Security PIN
                      </>
                    )}
                  </button>
                </form>

              </div>
            </motion.div>
          </div>
        )}

        {/* Global GitHub App Integration Card */}
        <div className="p-6 bg-neutral-950 rounded-2xl space-y-4 border-none shadow-md font-sans">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="space-y-0.5">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 font-sans">
                <GitBranch className="w-4 h-4 text-neutral-400" /> GitHub Integration
              </h2>
              <p className="text-xs text-neutral-400 font-sans">
                Automated push triggers for your API monitoring workflows.
              </p>
            </div>

            {githubStatus?.githubAppConnected ? (
              <div className="flex items-center gap-2 font-sans">
                <div className="px-3.5 py-1.5 bg-neutral-900 text-emerald-300 text-xs font-semibold rounded-xl font-sans flex items-center gap-2 border-none">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>@{githubStatus.githubUsername || 'ritik125V'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGithubSettingsModal(true)}
                  className="p-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white rounded-xl border-none cursor-pointer transition-colors flex items-center justify-center"
                  title="GitHub Integration Settings"
                >
                  <Settings className="w-4 h-4 text-neutral-400" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleConnectGithubPopup}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs rounded-xl border-none cursor-pointer flex items-center gap-2 transition-all shadow-sm font-sans"
              >
                <Sparkles className="w-3.5 h-3.5 text-white" />
                <span>Connect GitHub Account</span>
              </button>
            )}
          </div>

          {githubMsg && (
            <div
              className={`p-3 text-xs rounded-xl flex items-center gap-2 font-sans ${
                githubMsg.type === 'success'
                  ? 'bg-emerald-950/80 text-emerald-300'
                  : 'bg-rose-950/80 text-rose-300'
              }`}
            >
              {githubMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              )}
              <span>{githubMsg.text}</span>
            </div>
          )}
        </div>

        {/* GitHub Settings Modal */}
        {showGithubSettingsModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-neutral-950 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-5 border-none shadow-2xl font-sans text-neutral-100"
            >
              <div className="flex items-center justify-between border-b border-neutral-900 pb-3">
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-neutral-400" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white">GitHub Settings</h3>
                </div>
                <button
                  onClick={() => setShowGithubSettingsModal(false)}
                  className="p-1.5 hover:bg-neutral-900 text-neutral-400 hover:text-white rounded-lg border-none cursor-pointer"
                >
                  <X className="w-4 h-4 text-neutral-400" />
                </button>
              </div>

              <div className="space-y-5">
                {/* Account Details */}
                <div className="p-3.5 bg-black rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-400">Connected Account:</span>
                    <span className="text-emerald-300 font-bold">@{githubStatus?.githubUsername || 'ritik125V'}</span>
                  </div>
                  {githubStatus?.githubInstallationId && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-400">Installation ID:</span>
                      <span className="text-neutral-200 font-mono">{githubStatus.githubInstallationId}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-400">Status:</span>
                    <span className="text-emerald-400 font-bold">Connected</span>
                  </div>
                </div>

                {/* Accessible Repositories List inside Modal */}
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <FolderGit2 className="w-4 h-4 text-neutral-400" />
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        Repositories ({connectedRepos.length})
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-neutral-500" />
                        <input
                          type="text"
                          value={repoFilter}
                          onChange={(e) => setRepoFilter(e.target.value)}
                          placeholder="Filter repositories..."
                          className="pl-8 pr-3 py-1.5 bg-black border-none rounded-xl text-white text-xs outline-none font-mono w-44"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => loadConnectedRepos(githubStatus?.githubUsername || 'ritik125V')}
                        className="p-2 bg-black hover:bg-neutral-900 text-neutral-400 hover:text-white rounded-xl border-none cursor-pointer transition-colors"
                        title="Refresh Repositories"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${loadingRepos ? 'animate-spin text-rose-300' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {loadingRepos ? (
                    <div className="p-6 text-center text-neutral-400 text-xs font-mono flex items-center justify-center gap-2 bg-black rounded-xl">
                      <RefreshCw className="w-4 h-4 animate-spin text-rose-300" /> Loading accessible repositories...
                    </div>
                  ) : connectedRepos.length === 0 ? (
                    <div className="p-4 bg-black rounded-xl text-neutral-400 text-xs font-mono text-center space-y-1">
                      <p>No repositories retrieved.</p>
                      <p className="text-[10px] text-neutral-500">
                        Ensure your GitHub App has access granted to your public or private repositories.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                      {connectedRepos
                        .filter((r) => r.full_name.toLowerCase().includes(repoFilter.toLowerCase()))
                        .map((repo) => (
                          <div
                            key={repo.id}
                            className="p-3 bg-black hover:bg-neutral-900/60 rounded-xl flex flex-col justify-between text-xs transition-colors space-y-2 border-none"
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-white font-bold truncate font-mono text-xs">{repo.full_name}</span>
                                <span className={`px-1.5 py-0.2 text-[9px] font-bold rounded font-mono shrink-0 ${repo.private ? 'bg-amber-950/80 text-amber-300' : 'bg-emerald-950/80 text-emerald-300'}`}>
                                  {repo.private ? 'PRIVATE' : 'PUBLIC'}
                                </span>
                              </div>
                              {repo.description && (
                                <p className="text-[10px] text-neutral-400 line-clamp-1">{repo.description}</p>
                              )}
                            </div>

                            <div className="flex items-center justify-between pt-1.5 border-t border-neutral-900 text-[10px] text-neutral-400 font-mono">
                              <span>
                                branch: <strong className="text-white">{repo.default_branch || 'main'}</strong>
                              </span>
                              <a
                                href={repo.html_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-rose-300 hover:text-white"
                              >
                                <span>GitHub</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {/* Unified Webhook Payload URL Box */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-neutral-400 font-bold uppercase block">
                    Webhook Payload URL
                  </label>
                  <div className="flex items-center gap-2 bg-black p-2.5 rounded-xl border-none">
                    <code className="text-xs text-neutral-200 truncate flex-1 font-mono">
                      {githubStatus?.webhookUrl || 'https://api.wakeup.r8r.in/api/workflows/github-webhook'}
                    </code>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(
                          githubStatus?.webhookUrl || 'https://api.wakeup.r8r.in/api/workflows/github-webhook'
                        );
                        setCopiedWebhook(true);
                        setTimeout(() => setCopiedWebhook(false), 2000);
                      }}
                      className="px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs font-bold border-none cursor-pointer flex items-center gap-1 shrink-0 transition-colors"
                    >
                      {copiedWebhook ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedWebhook ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                {/* Manual Installation ID Binder */}
                <form onSubmit={handleBindInstallationId} className="pt-2 border-t border-neutral-900 space-y-2">
                  <label className="text-[10px] text-neutral-400 font-bold uppercase block">
                    Manual Installation ID
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={manualInstallationId}
                      onChange={(e) => setManualInstallationId(e.target.value)}
                      placeholder="e.g. 164865130"
                      className="flex-1 px-3.5 py-2 bg-black border-none rounded-xl text-white text-xs outline-none font-mono"
                    />
                    <button
                      type="submit"
                      disabled={bindingGithub || !manualInstallationId.trim()}
                      className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl border-none cursor-pointer disabled:opacity-50"
                    >
                      {bindingGithub ? 'Binding...' : 'Bind ID'}
                    </button>
                  </div>
                </form>

                {/* Disconnect Button */}
                <div className="pt-3 border-t border-neutral-900">
                  <button
                    type="button"
                    onClick={async () => {
                      await handleDisconnectGithub();
                      setShowGithubSettingsModal(false);
                    }}
                    disabled={disconnectingGithub}
                    className="w-full py-2 bg-neutral-900 hover:bg-rose-950/60 text-neutral-300 hover:text-rose-300 text-xs font-bold rounded-xl border-none cursor-pointer flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{disconnectingGithub ? 'Disconnecting...' : 'Disconnect GitHub Integration'}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}

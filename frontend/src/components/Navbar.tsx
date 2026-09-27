'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  Server,
  Layers,
  LogIn,
  UserPlus,
  LogOut,
  User as UserIcon,
  Menu,
  X,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';
import Image from 'next/image';
import { logoutUser, UserData } from '@/lib/api';

export function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [localUser, setLocalUser] = useState<UserData | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('wakeup_user');
      if (stored) {
        try {
          setLocalUser(JSON.parse(stored));
        } catch {
          setLocalUser(null);
        }
      }
    }
  }, []);

  const handleLogout = () => {
    logoutUser();
    setLocalUser(null);
    signOut();
  };

  const activeUser = localUser || (session?.user ? {
    id: 'oauth-user',
    email: session.user.email || '',
    name: session.user.name || undefined,
    avatar: session.user.image || undefined,
    provider: (session.user as { provider?: string }).provider === 'github' ? 'github' : 'google',
  } : null);

  const navLinks = [
    { name: 'Dashboard', href: '/', icon: Server },
    { name: 'Status Studio', href: '/status-pages', icon: SlidersHorizontal },
    { name: 'Flow Runner', href: '/workflows', icon: Layers },
    { name: 'Profile', href: '/profile', icon: UserIcon },
  ];

  return (
    <header className="w-full bg-[#121214] border-none sticky top-0 z-50 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3 flex items-center justify-between gap-4">
        {/* Brand Logo & Title */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <Activity className="w-5 h-5 text-white flex-shrink-0" />
          <span className="text-base sm:text-lg font-bold text-white tracking-wide group-hover:text-neutral-300 transition-colors">
            WakeUp
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 bg-[#1a1a1e] p-1 rounded-md border-none">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all touch-press ${
                  isActive
                    ? 'bg-[#f5f0e8] text-black font-bold shadow-sm'
                    : 'text-neutral-400 hover:text-white hover:bg-[#242429]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-black' : 'text-neutral-400'}`} />
                <span>{link.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Desktop User / Auth Quick Control */}
        <div className="hidden md:flex items-center gap-3">
          {activeUser ? (
            <div className="flex items-center gap-3 bg-[#1a1a1e] pl-2.5 pr-1.5 py-1 rounded-md">
              <Link href="/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                {activeUser.avatar ? (
                  <Image
                    src={activeUser.avatar}
                    alt={activeUser.name || 'User Avatar'}
                    width={24}
                    height={24}
                    className="rounded-full flex-shrink-0"
                  />
                ) : (
                  <div className="w-6 h-6 bg-neutral-800 flex items-center justify-center text-neutral-300 rounded-full flex-shrink-0">
                    <UserIcon className="w-3.5 h-3.5 text-neutral-300" />
                  </div>
                )}
                <span className="text-xs font-semibold text-white max-w-[120px] truncate">
                  {activeUser.name || activeUser.email.split('@')[0]}
                </span>
              </Link>

              <button
                onClick={handleLogout}
                className="p-1.5 text-neutral-400 hover:text-white hover:bg-[#242429] rounded transition-colors cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-neutral-300 bg-[#1a1a1e] hover:bg-[#242429] rounded-md transition-all border-none touch-press"
              >
                <LogIn className="w-3.5 h-3.5 text-neutral-400" /> Log In
              </Link>

              <Link
                href="/signup"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-black bg-[#f5f0e8] hover:bg-[#e8e2d8] rounded-md transition-all border-none shadow-md touch-press"
              >
                <UserPlus className="w-3.5 h-3.5 text-black" /> Sign Up
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Menu Toggle Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-neutral-400 hover:text-white rounded-md bg-[#1a1a1e] touch-press"
          aria-label="Toggle Menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer Navigation */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-neutral-900 bg-[#121214] px-4 py-4 space-y-3"
          >
            <div className="flex flex-col space-y-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-md text-xs font-bold transition-all touch-press ${
                      isActive
                        ? 'bg-[#f5f0e8] text-black'
                        : 'text-neutral-400 hover:text-white hover:bg-[#1a1a1e]'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-black' : 'text-neutral-400'}`} />
                    <span>{link.name}</span>
                  </Link>
                );
              })}
            </div>

            <div className="pt-2 border-t border-neutral-900">
              {activeUser ? (
                <div className="flex items-center justify-between p-2.5 bg-[#1a1a1e] rounded-md">
                  <div className="flex items-center gap-2">
                    {activeUser.avatar ? (
                      <Image
                        src={activeUser.avatar}
                        alt="User"
                        width={28}
                        height={28}
                        className="rounded-full"
                      />
                    ) : (
                      <div className="w-7 h-7 bg-neutral-800 flex items-center justify-center text-white rounded-full">
                        <UserIcon className="w-4 h-4" />
                      </div>
                    )}
                    <div>
                      <div className="text-xs font-bold text-white">{activeUser.name || 'User'}</div>
                      <div className="text-[10px] text-neutral-400">{activeUser.email}</div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="p-1.5 text-neutral-400 hover:text-white"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-neutral-200 bg-[#1a1a1e] rounded-md touch-press"
                  >
                    <LogIn className="w-3.5 h-3.5" /> Log In
                  </Link>

                  <Link
                    href="/signup"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-black bg-[#f5f0e8] rounded-md touch-press"
                  >
                    <UserPlus className="w-3.5 h-3.5" /> Sign Up
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

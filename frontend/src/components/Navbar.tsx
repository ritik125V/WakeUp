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
    <header className="w-full bg-neutral-950/90 backdrop-blur-md border-b border-neutral-900 sticky top-0 z-50 font-mono">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3 flex items-center justify-between gap-4">
        {/* Brand Logo & Title */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <Activity className="w-5 h-5 text-rose-300 flex-shrink-0" />
          <div className="flex items-center gap-2">
            <span className="text-base sm:text-lg font-bold text-white tracking-wide group-hover:text-rose-300 transition-colors">
              WakeUp
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] bg-neutral-900 text-rose-300 px-2 py-0.5 rounded font-bold border-none">
              MONITOR
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 bg-neutral-900/60 p-1 rounded-lg border-none">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-rose-950 text-rose-300 shadow-sm'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900/80'
                }`}
              >
                <Icon className="w-3.5 h-3.5 text-rose-300 flex-shrink-0" />
                <span>{link.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Desktop User / Auth Quick Control */}
        <div className="hidden md:flex items-center gap-3">
          {activeUser ? (
            <div className="flex items-center gap-3 bg-neutral-900/60 pl-2.5 pr-1.5 py-1 rounded-lg">
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
                  <div className="w-6 h-6 bg-neutral-800 flex items-center justify-center text-rose-300 rounded-full flex-shrink-0">
                    <UserIcon className="w-3.5 h-3.5" />
                  </div>
                )}
                <span className="text-xs font-bold text-white max-w-[120px] truncate">
                  {activeUser.name || activeUser.email.split('@')[0]}
                </span>
              </Link>

              <button
                onClick={handleLogout}
                className="p-1.5 text-neutral-400 hover:text-rose-300 hover:bg-neutral-800 rounded transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-300 bg-rose-950/60 hover:bg-rose-900/60 rounded-md transition-all border-none"
              >
                <LogIn className="w-3.5 h-3.5 text-rose-300" /> Log In
              </Link>

              <Link
                href="/signup"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-md transition-all border-none shadow-md"
              >
                <UserPlus className="w-3.5 h-3.5" /> Sign Up
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Menu Toggle Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-neutral-400 hover:text-white rounded-md bg-neutral-900"
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
            className="md:hidden border-t border-neutral-900 bg-neutral-950 px-4 py-4 space-y-3"
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
                    className={`flex items-center gap-2.5 px-3.5 py-2 rounded-md text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-rose-950 text-rose-300'
                        : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                    }`}
                  >
                    <Icon className="w-4 h-4 text-rose-300" />
                    <span>{link.name}</span>
                  </Link>
                );
              })}
            </div>

            <div className="pt-2 border-t border-neutral-900">
              {activeUser ? (
                <div className="flex items-center justify-between p-2.5 bg-neutral-900 rounded-md">
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
                      <div className="w-7 h-7 bg-neutral-800 flex items-center justify-center text-rose-300 rounded-full">
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
                    className="p-1.5 text-neutral-400 hover:text-rose-300"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-rose-300 bg-rose-950/60 rounded-md"
                  >
                    <LogIn className="w-3.5 h-3.5" /> Log In
                  </Link>

                  <Link
                    href="/signup"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-white bg-rose-600 rounded-md"
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

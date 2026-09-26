'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle2, RefreshCw, GitBranch } from 'lucide-react';
import { bindUserGithubInstallationId } from '@/lib/api';

function OAuthCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [statusMsg, setStatusMsg] = useState('Processing GitHub connection...');
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    const installationId = searchParams.get('installation_id') || searchParams.get('installationId') || '';
    const state = searchParams.get('state') || '';

    const processCallback = async () => {
      if (installationId) {
        try {
          await bindUserGithubInstallationId(installationId);
        } catch (err) {
          console.error('Failed to bind installation ID in callback page:', err);
        }
      }

      setCompleted(true);
      setStatusMsg('GitHub Integration Connected Successfully!');

      // If opened inside a popup window (Render style flow)
      if (typeof window !== 'undefined' && window.opener && window.opener !== window) {
        try {
          window.opener.postMessage(
            {
              type: 'GITHUB_APP_INSTALLED',
              installationId,
              state,
              connected: true,
            },
            '*'
          );
        } catch (e) {
          console.error('Failed to postMessage to window.opener:', e);
        }

        // Automatically close popup window after brief pause
        setTimeout(() => {
          try {
            window.close();
          } catch (e) {
            // Ignored if browser blocks window.close()
          }
        }, 1200);
      } else {
        // Full tab navigation fallback
        setTimeout(() => {
          if (state && state.length === 24) {
            router.push(`/workflows/${state}?github_app_connected=true`);
          } else {
            router.push('/profile?github_app_connected=true');
          }
        }, 1500);
      }
    };

    processCallback();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-black text-white font-sans flex items-center justify-center p-6">
      <div className="bg-neutral-950 p-8 rounded-2xl border-none max-w-md w-full space-y-5 text-center shadow-2xl">
        <div className="w-14 h-14 rounded-2xl bg-emerald-950/60 text-emerald-400 font-bold flex items-center justify-center mx-auto">
          {completed ? <CheckCircle2 className="w-8 h-8 text-emerald-400" /> : <RefreshCw className="w-7 h-7 text-rose-400 animate-spin" />}
        </div>

        <div className="space-y-1">
          <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center justify-center gap-2">
            <GitBranch className="w-4 h-4 text-rose-300" /> GitHub Connection
          </h2>
          <p className="text-xs text-neutral-300 font-sans leading-relaxed">{statusMsg}</p>
        </div>

        <p className="text-[11px] text-neutral-400 font-mono">
          {typeof window !== 'undefined' && window.opener ? 'Closing window automatically...' : 'Redirecting to application...'}
        </p>

        <button
          type="button"
          onClick={() => {
            if (typeof window !== 'undefined' && window.opener) {
              window.close();
            } else {
              router.push('/profile');
            }
          }}
          className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs rounded-xl border-none cursor-pointer transition-colors"
        >
          {typeof window !== 'undefined' && window.opener ? 'Close Window' : 'Return to Profile'}
        </button>
      </div>
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black text-neutral-400 p-8 font-mono flex items-center justify-center">Connecting to GitHub...</div>}>
      <OAuthCallbackContent />
    </Suspense>
  );
}

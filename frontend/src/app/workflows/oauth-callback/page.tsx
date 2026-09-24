'use client';

export default function OAuthCallbackPage() {
  return (
    <div className="min-h-screen bg-black text-white font-mono flex items-center justify-center p-6">
      <div className="bg-neutral-950 p-6 rounded-xl border-none max-w-md w-full space-y-4 text-center shadow-2xl">
        <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 font-bold text-lg flex items-center justify-center mx-auto">
          ⚠️
        </div>
        <h2 className="text-lg font-bold text-white uppercase">OAuth Disabled</h2>
        <p className="text-xs text-neutral-400">
          OAuth authentication is currently disabled. Please close this window and log in using Email & Security PIN.
        </p>
      </div>
    </div>
  );
}


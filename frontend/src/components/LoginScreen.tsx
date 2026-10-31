import { useEffect, useState, type FormEvent } from 'react';
import { useHotel } from '@/store/HotelStore';

const INPUT = 'w-full pl-9 pr-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white/90 dark:bg-gray-800/90 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-brand-500 outline-none transition-all';

export function LoginScreen() {
  const { executeLogin, authLoading, authError, bypassToDemo } = useHotel();
  const [inviteToken] = useState(() => new URLSearchParams(window.location.search).get('invite') ?? undefined);
  const [mode, setMode] = useState<'login' | 'register'>(inviteToken ? 'register' : 'login');
  const [name, setName] = useState('');
  const [hotelName, setHotelName] = useState('');
  const [email, setEmail] = useState('reyansh@stayflow.internal');
  const [password, setPassword] = useState('password12345');

  useEffect(() => {
    if (inviteToken) window.history.replaceState(null, '', window.location.pathname);
  }, [inviteToken]);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void executeLogin({
      mode,
      email,
      password,
      ...(mode === 'register' ? { name, ...(inviteToken ? {} : { hotelName }) } : {}),
      ...(inviteToken ? { inviteToken } : {}),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-brand-950 to-indigo-950 text-gray-800 dark:text-gray-100 overflow-y-auto">
      <div className="glass-card rounded-3xl p-8 max-w-md w-full shadow-2xl border border-white/20 dark:border-gray-700/50 relative overflow-hidden my-6">
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-brand-500/30 rounded-full blur-2xl"></div>
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-indigo-500/30 rounded-full blur-2xl"></div>
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-brand-600 flex items-center justify-center text-white shadow-lg mb-3">
            <i className="fa-solid fa-hotel text-2xl"></i>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">StayFlow</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Hotel operations, connected.</p>

          {/* Quick Bypass Button */}
          <div className="w-full mt-5 mb-2 p-3 rounded-2xl bg-gradient-to-r from-amber-500/10 via-brand-500/15 to-indigo-500/10 border border-brand-500/30 dark:border-brand-400/30 text-left">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-brand-600 dark:text-brand-300 flex items-center gap-1.5">
                <i className="fa-solid fa-bolt text-amber-500 animate-pulse"></i>
                <span>Instant Login Bypass</span>
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                Demo Ready
              </span>
            </div>
            <p className="text-[11px] text-gray-600 dark:text-gray-300 mb-2.5">
              Skip authentication entirely and jump straight into the full hotel workspace with preloaded rooms, reservations, staff, and analytics.
            </p>
            <button
              type="button"
              disabled={authLoading}
              onClick={() => void bypassToDemo()}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-brand-600 hover:from-amber-600 hover:to-brand-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
            >
              <i className="fa-solid fa-arrow-right-to-bracket text-xs"></i>
              <span>Enter Hotel Workspace Directly</span>
            </button>
          </div>

          <div className="relative flex py-3 items-center w-full">
            <div className="flex-grow border-t border-gray-300 dark:border-gray-700"></div>
            <span className="flex-shrink mx-3 text-[10px] uppercase font-bold tracking-wider text-gray-400">or sign in manually</span>
            <div className="flex-grow border-t border-gray-300 dark:border-gray-700"></div>
          </div>

          <div className="grid grid-cols-2 p-1 bg-gray-200/70 dark:bg-gray-700/60 rounded-xl w-full mb-4 text-sm font-semibold">
            <button type="button" onClick={() => setMode('login')} className={`py-2 rounded-lg transition-all ${mode === 'login' ? 'bg-white dark:bg-gray-800 text-brand-600 dark:text-brand-300 shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:text-brand-600'}`}>
              Sign in
            </button>
            <button type="button" onClick={() => setMode('register')} className={`py-2 rounded-lg transition-all ${mode === 'register' ? 'bg-white dark:bg-gray-800 text-brand-600 dark:text-brand-300 shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:text-brand-600'}`}>
              Create account
            </button>
          </div>

          {inviteToken && (
            <div className="w-full text-left mb-4 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
              {mode === 'register' ? 'You are joining a hotel team. Register with the email address that received the invitation.' : 'Sign in with the invited email address to join this hotel team.'}
            </div>
          )}
          {authError && <div role="alert" className="w-full text-left mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200">{authError}</div>}

          <form onSubmit={onSubmit} className="w-full text-left space-y-3.5">
            {mode === 'register' && (
              <>
                <div>
                  <label htmlFor="register-name" className="block text-[11px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1">Your name</label>
                  <div className="relative"><i className="fa-solid fa-user absolute left-3 top-3 text-gray-400 text-xs"></i><input id="register-name" required minLength={2} maxLength={255} autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} className={INPUT} /></div>
                </div>
                {!inviteToken && (
                  <div>
                    <label htmlFor="register-hotel" className="block text-[11px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1">Hotel or property name</label>
                    <div className="relative"><i className="fa-solid fa-hotel absolute left-3 top-3 text-gray-400 text-xs"></i><input id="register-hotel" required minLength={2} maxLength={255} autoComplete="organization" value={hotelName} onChange={(event) => setHotelName(event.target.value)} className={INPUT} /></div>
                  </div>
                )}
              </>
            )}

            <div>
              <label htmlFor="login-email" className="block text-[11px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1">Email address</label>
              <div className="relative"><i className="fa-solid fa-envelope absolute left-3 top-3 text-gray-400 text-xs"></i><input type="email" id="login-email" required maxLength={255} autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className={INPUT} /></div>
            </div>

            <div>
              <label htmlFor="login-password" className="block text-[11px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1">Password</label>
              <div className="relative"><i className="fa-solid fa-lock absolute left-3 top-3 text-gray-400 text-xs"></i><input type="password" id="login-password" required minLength={1} maxLength={128} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} className={INPUT} /></div>
            </div>

            <button type="submit" disabled={authLoading} className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2">
              <span>{authLoading ? 'Connecting…' : mode === 'login' ? 'Sign in to StayFlow' : inviteToken ? 'Join hotel team' : 'Create hotel account'}</span>
              {!authLoading && <i className="fa-solid fa-arrow-right text-xs"></i>}
            </button>
          </form>

          {!inviteToken && <p className="text-[11px] leading-relaxed text-gray-500 dark:text-gray-400 mt-4">Pre-filled with working demo credentials. Click sign-in or use the bypass button above.</p>}
        </div>
      </div>
    </div>
  );
}

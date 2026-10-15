import React, { useState } from 'react';
import {
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  ShieldCheck,
  Store,
  Sparkles,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  ShieldAlert,
} from 'lucide-react';
import { User, Shop } from '../../types';
import { StorageService } from '../../services/storage';

interface LoginViewProps {
  onLoginSuccess: (user: User, shop: Shop) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [showCreds, setShowCreds] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setLoading(true);

    setTimeout(() => {
      const result = StorageService.authenticate(username, password);
      if (result.success && result.user && result.shop) {
        if (rememberMe) {
          StorageService.setCurrentSession(result.user, result.shop);
        }
        onLoginSuccess(result.user, result.shop);
      } else {
        setError(result.error || 'Invalid credentials. Please verify your login details.');
      }
      setLoading(false);
    }, 200);
  };

  const handleQuickFill = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950 flex flex-col justify-between p-4 sm:p-6 text-slate-100">
      {/* Top Header */}
      <div className="max-w-6xl mx-auto w-full flex items-center justify-between py-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center font-black text-white text-xl shadow-lg shadow-orange-600/30">
            P
          </div>
          <div>
            <h1 className="font-extrabold text-lg sm:text-xl tracking-tight text-white flex items-center gap-2">
              <span>PANDIT POS</span>
              <span className="text-[10px] font-mono font-semibold bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full border border-orange-500/30">
                PRO RETAIL v2.6
              </span>
            </h1>
            <p className="text-xs text-slate-400">Fireworks Wholesale &amp; Retail Cloud Suite</p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-emerald-400 font-mono bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Server Active &amp; Ready</span>
        </div>
      </div>

      {/* Main Login Container */}
      <div className="max-w-md w-full mx-auto my-auto">
        <div className="bg-slate-900/90 backdrop-blur-md rounded-3xl border border-slate-800 shadow-2xl p-6 sm:p-8">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-gradient-to-tr from-orange-600 to-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-orange-600/30 text-white">
              <Lock className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Staff &amp; Admin Sign In</h2>
            <p className="text-xs text-slate-400 mt-1">
              Enter your authorized terminal credentials to access PANDIT POS
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-start gap-2.5 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Username or Mobile
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. tushar.paliwal01 or panditfireworks"
                  autoFocus
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-orange-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Password</span>
                <span className="text-[10px] text-slate-500">Case-sensitive</span>
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your security password"
                  required
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-orange-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-orange-600 focus:ring-orange-500"
                />
                <span>Remember this terminal session</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 active:scale-98 text-white rounded-xl text-sm font-bold shadow-lg shadow-orange-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In to Terminal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick-Access Credentials Selector - Hidden by default for privacy & security */}
          <div className="mt-5 pt-4 border-t border-slate-800 text-center">
            {showCreds ? (
              <div className="space-y-2 text-left animate-in fade-in duration-200">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                  <span>Quick Test Accounts:</span>
                  <button
                    type="button"
                    onClick={() => setShowCreds(false)}
                    className="text-[11px] text-slate-400 hover:text-white"
                  >
                    Hide &times;
                  </button>
                </div>

                {/* Supermaster */}
                <button
                  type="button"
                  onClick={() => handleQuickFill('tushar.paliwal01', 'Asdf@1234')}
                  className="w-full p-2 bg-slate-950 hover:bg-slate-800/90 border border-slate-800 rounded-lg text-left flex items-center justify-between text-xs transition-all"
                >
                  <span className="font-semibold text-white">Supermaster (tushar.paliwal01)</span>
                  <span className="text-[10px] text-orange-400 font-mono">Fill &rarr;</span>
                </button>

                {/* Pandit Fireworks */}
                <button
                  type="button"
                  onClick={() => handleQuickFill('panditfireworks', 'pandit12345678')}
                  className="w-full p-2 bg-slate-950 hover:bg-slate-800/90 border border-slate-800 rounded-lg text-left flex items-center justify-between text-xs transition-all"
                >
                  <span className="font-semibold text-white">Pandit Fireworks (Store Admin)</span>
                  <span className="text-[10px] text-amber-400 font-mono">Fill &rarr;</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowCreds(true)}
                className="text-[11px] text-slate-400 hover:text-slate-300 transition-colors inline-flex items-center gap-1.5"
              >
                <KeyRound className="w-3 h-3 text-slate-400" />
                <span>Show Quick Test Accounts (Demo)</span>
              </button>
            )}
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-4 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Role-based access security enforced on all terminals.</span>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-6xl mx-auto w-full text-center py-2 text-[11px] text-slate-400">
        &copy; {new Date().getFullYear()} PANDIT POS Inc. · All Rights Reserved · High-Speed Thermal Hardware Ready
      </div>
    </div>
  );
};

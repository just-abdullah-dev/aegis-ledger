import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { proxy } from '../lib/proxy';
import { Shield, Lock, Mail, ArrowRight, CheckCircle2, AlertCircle, Loader2, UserCheck, Smartphone } from 'lucide-react';

interface CustomerLoginPageProps {
  onLoginSuccess?: () => void;
}

export const CustomerLoginPage: React.FC<CustomerLoginPageProps> = ({ onLoginSuccess }) => {
  const { customerLogin, isLoading } = useAuthStore();
  const [emailOrId, setEmailOrId] = useState('customer');
  const [password, setPassword] = useState('Customer123!');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const res = await customerLogin(emailOrId, password);
    if (res.success) {
      onLoginSuccess?.();
      proxy.navigate('/customer/dashboard');
    } else {
      setErrorMsg(res.error || 'Invalid customer credentials. Please check your username and password.');
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 relative overflow-hidden font-sans">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-cyan-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[400px] h-[300px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-lg z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-500 shadow-xl shadow-cyan-500/20 text-white text-2xl font-bold mb-1">
            <Smartphone className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            AegisLedger Customer Portal
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
            Sovereign Retail Banking & Escrow Wallet Gateway. Sign in to review balances and deposits.
          </p>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-[11px] font-semibold text-cyan-400">
            <Shield className="w-3.5 h-3.5 text-cyan-400" />
            <span>Retail Customer Security Gateway • 256-Bit Encrypted</span>
          </div>
        </div>

        {/* Login Form Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-5">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>Customer ID or Email</span>
              </label>
              <input
                type="text"
                required
                value={emailOrId}
                onChange={(e) => setEmailOrId(e.target.value)}
                placeholder="customer or customer@aegisledger.bank"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-950/70 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>Customer Password</span>
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-950/70 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating Customer Session...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Customer Wallet</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials */}
          <div className="pt-3 border-t border-slate-800 text-xs text-slate-400 space-y-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Demo Customer Account
            </span>
            <div 
              onClick={() => {
                setEmailOrId('customer');
                setPassword('Customer123!');
                setErrorMsg(null);
              }}
              className="p-2.5 rounded-lg border border-slate-800 bg-slate-950/50 hover:bg-slate-800/50 transition cursor-pointer flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-cyan-400" />
                <div>
                  <div className="font-semibold text-slate-200">Retail Customer</div>
                  <div className="text-[10px] font-mono text-slate-500">Username: customer | Pass: Customer123!</div>
                </div>
              </div>
              <span className="text-[10px] text-cyan-400 font-semibold">Click to autofill</span>
            </div>
          </div>

          {/* Link to Staff Operator Gateway */}
          <div className="pt-2 text-center text-xs text-slate-400">
            <span>Bank Officer, Teller, or Auditor? </span>
            <button
              type="button"
              onClick={() => proxy.navigate('/login')}
              className="font-semibold text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
            >
              Go to Operator Portal →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

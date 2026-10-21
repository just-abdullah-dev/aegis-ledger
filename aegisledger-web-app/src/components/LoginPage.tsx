import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { UserPersona } from '../types/ledger';
import { proxy } from '../lib/proxy';
import { Shield, Lock, Mail, ArrowRight, CheckCircle2, KeyRound, AlertCircle, Loader2 } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess?: () => void;
}

interface PersonaPreset {
  persona: UserPersona;
  label: string;
  username: string;
  email: string;
  pass: string;
  role: string;
  description: string;
}

const PRESETS: PersonaPreset[] = [
  {
    persona: 'Compliance Auditor',
    label: 'Auditor',
    username: 'auditor',
    email: 'elena.rostova@aegisledger.bank',
    pass: 'Auditor123!',
    role: 'ComplianceAuditor',
    description: 'EOD batch auditing, zero-drift invariant proofs, and SHA-256 seal verification.',
  },
  {
    persona: 'Bank Teller',
    label: 'Bank Teller',
    username: 'teller',
    email: 'sarah.teller@aegisledger.bank',
    pass: 'Teller123!',
    role: 'BankTeller',
    description: 'Post inter-account transfers, place collateral holds, and release available funds.',
  },
  {
    persona: 'System Admin',
    label: 'System Admin',
    username: 'admin',
    email: 'alex.admin@aegisledger.bank',
    pass: 'Admin123!',
    role: 'SystemAdmin',
    description: 'Full supervisory controls, Hangfire scheduler telemetry, and account management.',
  },
];

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const { login, isLoading } = useAuthStore();
  const [emailOrId, setEmailOrId] = useState('auditor');
  const [password, setPassword] = useState('Auditor123!');
  const [selectedPersona, setSelectedPersona] = useState<UserPersona>('Compliance Auditor');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleApplyPreset = (preset: PersonaPreset) => {
    setSelectedPersona(preset.persona);
    setEmailOrId(preset.username);
    setPassword(preset.pass);
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const res = await login(emailOrId, password, selectedPersona);
    if (res.success) {
      onLoginSuccess?.();
    } else {
      setErrorMsg(res.error || 'Invalid authentication credentials. Please check your username/password or select a preset below.');
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 relative overflow-hidden font-sans">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[300px] bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-xl z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 shadow-xl shadow-indigo-500/20 text-white text-2xl font-bold mb-1">
            🏛️
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            AegisLedger Core Banking
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
            Strict Double-Entry General Ledger & Sovereign Banking Engine. Please authenticate your operator session to proceed.
          </p>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-[11px] font-semibold text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Zero-Drift Invariant Verified • SUM(DR) == SUM(CR)</span>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-md">
          {errorMsg && (
            <div className="mb-6 p-4 rounded-xl bg-red-950/60 border border-red-800/80 text-red-300 text-xs flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Username or Corporate Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={emailOrId}
                  onChange={(e) => setEmailOrId(e.target.value)}
                  placeholder="e.g. auditor, admin, teller, or user@aegisledger.bank"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Password / Passphrase
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition font-mono"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Ledger Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Core Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Preset Selector */}
          <div className="mt-8 pt-6 border-t border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold uppercase tracking-wider text-slate-500">
                Pre-Configured Operator Roles:
              </span>
              <span className="text-[11px] text-indigo-400">Click to fill</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {PRESETS.map((p) => {
                const isSelected = selectedPersona === p.persona;
                return (
                  <button
                    key={p.persona}
                    type="button"
                    onClick={() => handleApplyPreset(p)}
                    className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                      isSelected
                        ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200'
                        : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <span className="text-xs font-semibold">{p.label}</span>
                    <span className="text-[10px] font-mono opacity-60 truncate">{p.username}</span>
                  </button>
                );
              })}
            </div>

            <div className="p-3 rounded-lg bg-slate-950/50 border border-slate-800/60 text-[11px] text-slate-400">
              <strong className="text-slate-300">Selected Role:</strong>{' '}
              {PRESETS.find((p) => p.persona === selectedPersona)?.description}
            </div>

            {/* Link to Retail Customer Portal */}
            <div className="pt-2 text-center text-xs text-slate-400">
              <span>Are you a Retail Bank Customer? </span>
              <button
                type="button"
                onClick={() => proxy.navigate('/customer/login')}
                className="font-semibold text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
              >
                Go to Customer Portal →
              </button>
            </div>
          </div>
        </div>

        {/* Security Footer Notice */}
        <div className="text-center text-[11px] text-slate-500 space-y-1">
          <p>🔒 Tokens managed via HTTP-Only, SameSite cookies with HMAC-SHA256 signatures.</p>
          <p>AegisLedger v1.0 • .NET 10 (C# 14) • SQL Server 2022 • Redis 7 • React 19</p>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { UserPersona } from '../types/ledger';
import { Shield, Lock, Mail, CheckCircle2, UserCheck, X } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { login, isLoading } = useAuthStore();
  const [emailOrId, setEmailOrId] = useState('elena.rostova@aegisledger.bank');
  const [password, setPassword] = useState('AegisLedger2026!#');
  const [persona, setPersona] = useState<UserPersona>('Compliance Auditor');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const success = await login(emailOrId, password, persona);
    if (success) {
      onSuccess?.();
      onClose();
    } else {
      setErrorMsg('Authentication failed. Please verify credentials.');
    }
  };

  const handleSelectPersonaPreset = (presetPersona: UserPersona, presetEmail: string) => {
    setPersona(presetPersona);
    setEmailOrId(presetEmail);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">AegisLedger Core Auth</h2>
            <p className="text-xs text-slate-400">Sign in to access ledger & treasury operations</p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-950/50 border border-red-800/60 rounded-xl text-red-400 text-xs">
            {errorMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Account ID or Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
              <input
                type="text"
                value={emailOrId}
                onChange={(e) => setEmailOrId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition"
                placeholder="name@aegisledger.bank"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Password / Passphrase
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition"
                placeholder="••••••••••••"
                required
              />
            </div>
          </div>

          {/* Quick Persona Switcher in development */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Select User Role Persona:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() =>
                  handleSelectPersonaPreset('Compliance Auditor', 'elena.rostova@aegisledger.bank')
                }
                className={`py-2 px-2.5 rounded-lg text-xs font-medium border text-center transition ${
                  persona === 'Compliance Auditor'
                    ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                Auditor
              </button>
              <button
                type="button"
                onClick={() =>
                  handleSelectPersonaPreset('Bank Teller', 'sarah.teller@aegisledger.bank')
                }
                className={`py-2 px-2.5 rounded-lg text-xs font-medium border text-center transition ${
                  persona === 'Bank Teller'
                    ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                Bank Teller
              </button>
              <button
                type="button"
                onClick={() =>
                  handleSelectPersonaPreset('System Admin', 'alex.admin@aegisledger.bank')
                }
                className={`py-2 px-2.5 rounded-lg text-xs font-medium border text-center transition ${
                  persona === 'System Admin'
                    ? 'bg-purple-600/20 border-purple-500 text-purple-400'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                Admin
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-4 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition shadow-lg shadow-blue-600/20"
          >
            {isLoading ? (
              <span className="text-sm">Authenticating...</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm">Authenticate Session</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

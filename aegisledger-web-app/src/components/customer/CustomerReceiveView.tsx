import React, { useState } from 'react';
import { BankAccount } from '../../types/ledger';
import { 
  QrCode, 
  Copy, 
  Check, 
  Building2, 
  ShieldCheck, 
  Download, 
  Share2, 
  Info 
} from 'lucide-react';

interface CustomerReceiveViewProps {
  accounts: BankAccount[];
}

export const CustomerReceiveView: React.FC<CustomerReceiveViewProps> = ({ accounts }) => {
  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    accounts[0]?.id || ''
  );
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const activeAccount = accounts.find((a) => a.id === selectedAccountId) || accounts[0];

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const accountPayload = `AEGISLEDGER://PAY?account=${activeAccount?.accountNumber || ''}&routing=${activeAccount?.routingCode || '021000021'}`;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* View Header */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-2 text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/70 border border-cyan-500/30 text-[11px] font-semibold text-cyan-400">
          <QrCode className="w-3.5 h-3.5" />
          <span>Inward Wire & P2P Settlement</span>
        </div>
        <h1 className="text-2xl font-black text-white">Receive Funds & QR Code</h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
          Share your account number or display your QR code to receive instant internal transfers from other clients.
        </p>
      </div>

      {/* Account Selector if multiple */}
      {accounts.length > 1 && (
        <div className="flex items-center justify-center gap-2 overflow-x-auto pb-1">
          {accounts.map((acc) => (
            <button
              key={acc.id}
              onClick={() => setSelectedAccountId(acc.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-semibold transition cursor-pointer ${
                acc.id === selectedAccountId
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
              }`}
            >
              {acc.name} ({acc.accountNumber})
            </button>
          ))}
        </div>
      )}

      {/* Main QR Card */}
      <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-6 flex flex-col items-center text-center">
        {/* SVG Simulated QR Code */}
        <div className="p-4 rounded-3xl bg-white shadow-2xl border-4 border-slate-800 relative group">
          <svg className="w-56 h-56 text-slate-950" viewBox="0 0 100 100" fill="currentColor">
            {/* Position Detection Squares */}
            <rect x="5" y="5" width="25" height="25" rx="3" fill="#0f172a" />
            <rect x="9" y="9" width="17" height="17" rx="2" fill="#ffffff" />
            <rect x="13" y="13" width="9" height="9" rx="1" fill="#0891b2" />

            <rect x="70" y="5" width="25" height="25" rx="3" fill="#0f172a" />
            <rect x="74" y="9" width="17" height="17" rx="2" fill="#ffffff" />
            <rect x="78" y="13" width="9" height="9" rx="1" fill="#0891b2" />

            <rect x="5" y="70" width="25" height="25" rx="3" fill="#0f172a" />
            <rect x="9" y="74" width="17" height="17" rx="2" fill="#ffffff" />
            <rect x="13" y="78" width="9" height="9" rx="1" fill="#0891b2" />

            {/* Pattern Elements */}
            <rect x="35" y="10" width="6" height="6" fill="#0f172a" />
            <rect x="45" y="10" width="6" height="6" fill="#0f172a" />
            <rect x="55" y="10" width="6" height="6" fill="#0f172a" />
            <rect x="35" y="20" width="6" height="6" fill="#0f172a" />
            <rect x="50" y="20" width="12" height="6" fill="#0891b2" />

            <rect x="10" y="35" width="6" height="6" fill="#0f172a" />
            <rect x="20" y="35" width="6" height="6" fill="#0f172a" />
            <rect x="10" y="45" width="6" height="6" fill="#0f172a" />
            <rect x="20" y="55" width="6" height="6" fill="#0f172a" />

            {/* Center Grid Matrix */}
            <rect x="35" y="35" width="30" height="30" rx="4" fill="#0f172a" />
            <rect x="42" y="42" width="16" height="16" rx="2" fill="#0891b2" />
            <circle cx="50" cy="50" r="4" fill="#ffffff" />

            <rect x="70" y="35" width="6" height="6" fill="#0f172a" />
            <rect x="80" y="45" width="10" height="6" fill="#0f172a" />
            <rect x="70" y="55" width="6" height="6" fill="#0f172a" />

            <rect x="35" y="70" width="6" height="6" fill="#0f172a" />
            <rect x="45" y="75" width="10" height="6" fill="#0f172a" />
            <rect x="35" y="85" width="16" height="6" fill="#0f172a" />

            <rect x="70" y="70" width="6" height="6" fill="#0f172a" />
            <rect x="80" y="80" width="12" height="12" rx="2" fill="#0891b2" />
          </svg>
        </div>

        {/* Account Details Box */}
        <div className="w-full p-4 rounded-2xl bg-slate-950 border border-slate-800 text-left space-y-3">
          {/* Account Number */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold block">
                Account Number
              </span>
              <span className="font-mono text-base font-bold text-white">
                {activeAccount?.accountNumber || 'ACC-8029-CHK'}
              </span>
            </div>
            <button
              onClick={() => handleCopy(activeAccount?.accountNumber || 'ACC-8029-CHK', 'acc')}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
            >
              {copiedField === 'acc' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copiedField === 'acc' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          {/* Wire Routing Code */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold block">
                Fedwire / ABA Routing Code
              </span>
              <span className="font-mono text-base font-bold text-white">
                {activeAccount?.routingCode || '021000021'}
              </span>
            </div>
            <button
              onClick={() => handleCopy(activeAccount?.routingCode || '021000021', 'route')}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
            >
              {copiedField === 'route' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copiedField === 'route' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          {/* Bank Institution */}
          <div className="pt-2 border-t border-slate-800 flex justify-between text-xs text-slate-400">
            <span>Beneficiary Institution:</span>
            <span className="font-semibold text-slate-200">AegisLedger Sovereign Core Bank</span>
          </div>
        </div>

        {/* Note */}
        <div className="text-xs text-slate-500 flex items-center gap-1.5 max-w-sm">
          <Info className="w-4 h-4 shrink-0 text-cyan-400" />
          <span>Internal transfers between AegisLedger accounts clear in sub-second real-time with zero network fees.</span>
        </div>
      </div>
    </div>
  );
};

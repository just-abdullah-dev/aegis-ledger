import React, { useState } from 'react';
import { Transaction, BankAccount } from '../../types/ledger';
import { formatCurrency } from '../../utils/formatters';
import { 
  FileText, 
  Search, 
  ArrowUpRight, 
  ArrowDownLeft, 
  CheckCircle2, 
  Printer, 
  X, 
  ShieldCheck, 
  Clock, 
  Coins,
  ChevronRight,
  Filter
} from 'lucide-react';

interface CustomerTransactionsViewProps {
  transactions: Transaction[];
  accounts: BankAccount[];
}

export const CustomerTransactionsView: React.FC<CustomerTransactionsViewProps> = ({
  transactions,
  accounts,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Posted' | 'Pending'>('ALL');
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);

  const customerAccountIds = new Set(accounts.map((a) => a.id));
  const customerAccountNums = new Set(accounts.map((a) => a.accountNumber));

  // Filter transactions relevant to this customer
  const customerTxns = transactions.filter((t) => 
    customerAccountIds.has(t.senderAccountId) ||
    customerAccountIds.has(t.receiverAccountId) ||
    customerAccountNums.has(t.senderAccountNum) ||
    customerAccountNums.has(t.receiverAccountNum)
  );

  const filteredTxns = customerTxns.filter((t) => {
    const matchesSearch = 
      t.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.senderAccountNum.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.receiverAccountNum.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.idempotencyKey.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/70 border border-cyan-500/30 text-[11px] font-semibold text-cyan-400">
          <FileText className="w-3.5 h-3.5" />
          <span>Double-Entry General Ledger</span>
        </div>
        <h1 className="text-2xl font-black text-white">Account Statements & Digital Receipts</h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
          Search and export verified digital receipts for settled payments, P2P transfers, and deposits.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reference #, account #, memo..."
            className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-500/40"
          />
        </div>

        <div className="flex items-center gap-2">
          {(['ALL', 'Posted', 'Pending'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                statusFilter === s
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions List */}
      <div className="space-y-3">
        {filteredTxns.length === 0 ? (
          <div className="p-12 text-center rounded-3xl border border-slate-800 bg-slate-900/60 space-y-2">
            <FileText className="w-10 h-10 text-slate-500 mx-auto" />
            <div className="font-bold text-sm text-white">No Matching Statements Found</div>
            <p className="text-xs text-slate-400">
              Try adjusting your search criteria or filter options.
            </p>
          </div>
        ) : (
          filteredTxns.map((tx) => {
            const isOutgoing = customerAccountIds.has(tx.senderAccountId) || customerAccountNums.has(tx.senderAccountNum);
            return (
              <div
                key={tx.id}
                onClick={() => setSelectedTxn(tx)}
                className="p-4 rounded-2xl border border-slate-800/80 bg-slate-900/80 hover:bg-slate-800/60 hover:border-slate-700 transition flex items-center justify-between gap-3 cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    isOutgoing
                      ? 'bg-rose-950/40 text-rose-400 border border-rose-900/60'
                      : 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/60'
                  }`}>
                    {isOutgoing ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                  </div>

                  <div>
                    <div className="font-bold text-sm text-white group-hover:text-cyan-400 transition">
                      {tx.description || (isOutgoing ? 'Outward Payment' : 'Inward Deposit')}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      Ref: {tx.reference} · {new Date(tx.timestamp).toLocaleString()}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {isOutgoing ? `To: ${tx.receiverAccountNum || 'Recipient'}` : `From: ${tx.senderAccountNum || 'Sender'}`}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className={`font-mono font-bold text-base ${isOutgoing ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {isOutgoing ? '-' : '+'}{formatCurrency(tx.amount, 'USD')}
                  </div>
                  <div className="text-[10px] text-slate-500 uppercase font-mono">
                    {tx.status} · Tap for Receipt
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Official Digital Banking Receipt Modal */}
      {selectedTxn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 space-y-6 shadow-2xl relative">
            <button
              onClick={() => setSelectedTxn(null)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Receipt Printable Card */}
            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 font-mono text-xs">
              {/* Receipt Header */}
              <div className="text-center pb-4 border-b border-slate-800 space-y-1">
                <div className="font-bold text-base text-white tracking-wider">
                  AEGISLEDGER CORE BANKING
                </div>
                <div className="text-[10px] text-slate-400">
                  OFFICIAL TRANSACTION STATEMENT & RECEIPT
                </div>
                <div className="inline-block mt-1 px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                  STATUS: {selectedTxn.status.toUpperCase()}
                </div>
              </div>

              {/* Data Rows */}
              <div className="space-y-2.5 text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">Transaction Ref:</span>
                  <span className="text-white font-bold">{selectedTxn.reference}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Execution Time:</span>
                  <span>{new Date(selectedTxn.timestamp).toUTCString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Sender Account:</span>
                  <span>{selectedTxn.senderAccountNum}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Receiver Account:</span>
                  <span>{selectedTxn.receiverAccountNum}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Description:</span>
                  <span className="text-slate-200">{selectedTxn.description}</span>
                </div>
                <div className="pt-2 border-t border-slate-800 flex justify-between text-sm">
                  <span className="text-slate-400 font-bold">Settled Amount:</span>
                  <span className="text-emerald-400 font-black">{formatCurrency(selectedTxn.amount, 'USD')}</span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Settlement Fee:</span>
                  <span>$0.00 (Zero Drift Invariant)</span>
                </div>
              </div>

              {/* Double-Entry Splits If Present */}
              {selectedTxn.journalLines && selectedTxn.journalLines.length > 0 && (
                <div className="pt-3 border-t border-slate-800 space-y-1.5 text-[10px]">
                  <span className="text-slate-500 uppercase font-bold">Double-Entry Posting Legs:</span>
                  {selectedTxn.journalLines.map((line, idx) => (
                    <div key={idx} className="flex justify-between text-slate-400">
                      <span>[{line.entryType}] Acc: {line.accountNumber || line.accountId.slice(0, 8)}</span>
                      <span className={line.entryType === 'DEBIT' ? 'text-rose-400' : 'text-emerald-400'}>
                        {formatCurrency(line.amount, 'USD')}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Cryptographic Seal */}
              <div className="pt-3 border-t border-slate-800 text-[10px] text-slate-600 break-all space-y-1">
                <div>Idempotency Key: {selectedTxn.idempotencyKey}</div>
                <div>Invariant Hash: SHA256({selectedTxn.reference}:{selectedTxn.amount})</div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700 transition cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Statement</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedTxn(null)}
                className="flex-1 py-3 px-4 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/20 transition cursor-pointer"
              >
                Close Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

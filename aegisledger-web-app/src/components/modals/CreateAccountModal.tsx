import React, { useState, useEffect } from 'react';
import { 
  X, 
  Landmark, 
  Building2, 
  ShieldCheck, 
  Sparkles, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRightLeft, 
  Coins, 
  FileText, 
  UserCheck, 
  BadgeCheck,
  CreditCard,
  Banknote,
  Send,
  Loader2
} from 'lucide-react';
import { BankAccount, Currency, UserPersona } from '../../types/ledger';
import { formatCurrency } from '../../utils/formatters';
import { CreateAccountPayload } from '../../lib/api-client';

interface CreateAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: BankAccount[];
  currency: Currency;
  persona: UserPersona;
  onCreateAccount: (payload: CreateAccountPayload) => Promise<{ success: boolean; message: string; account?: BankAccount }>;
}

export const CreateAccountModal: React.FC<CreateAccountModalProps> = ({
  isOpen,
  onClose,
  accounts,
  currency,
  persona,
  onCreateAccount,
}) => {
  // Classification
  const [category, setCategory] = useState<'customer' | 'system'>('customer');
  const [accountType, setAccountType] = useState<string>('Checking');

  // Identification
  const [autoGenAccNum, setAutoGenAccNum] = useState<string>('');
  const [useCustomAccNum, setUseCustomAccNum] = useState<boolean>(false);
  const [customAccNum, setCustomAccNum] = useState<string>('');

  // Legal Entity Details
  const [name, setName] = useState<string>('');
  const [owner, setOwner] = useState<string>('');
  const [taxId, setTaxId] = useState<string>('');
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [branchCode, setBranchCode] = useState<string>('NYC-BR01');
  const [routingCode, setRoutingCode] = useState<string>('021000021');
  const [amlRiskTier, setAmlRiskTier] = useState<string>('Low');

  // Initial Funding & Deposit
  const [initialDepositStr, setInitialDepositStr] = useState<string>('0');
  const [depositType, setDepositType] = useState<
    'ZeroBalance' | 'CashVault' | 'WireClearing' | 'ChequeDeposit' | 'InternalTransfer'
  >('ZeroBalance');
  const [sourceAccountId, setSourceAccountId] = useState<string>('');

  // Memo & Description
  const [description, setDescription] = useState<string>('');

  // UI state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Generate compliant account number helper
  const generateRandomAccountNumber = (cat: 'customer' | 'system', type: string) => {
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    if (cat === 'system') {
      const suffix = 
        type === 'Asset' ? 'AST' :
        type === 'Liability' ? 'LIA' :
        type === 'Equity' ? 'EQT' :
        type === 'Revenue' ? 'REV' : 'GL';
      return `SYS-${randomDigits}-${suffix}`;
    } else {
      const suffix = 
        type === 'Savings' ? 'SAV' :
        type === 'Escrow' ? 'ESC' : 'CHK';
      return `ACC-${randomDigits}-${suffix}`;
    }
  };

  // Sync auto account number whenever category or type changes
  useEffect(() => {
    if (isOpen) {
      setAutoGenAccNum(generateRandomAccountNumber(category, accountType));
    }
  }, [category, accountType, isOpen]);

  // Reset form when opened
  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      setIsSubmitting(false);
      setCategory('customer');
      setAccountType('Checking');
      setName('');
      setOwner('');
      setTaxId('');
      setCustomerEmail('');
      setCustomerPhone('');
      setBranchCode('NYC-BR01');
      setRoutingCode('021000021');
      setAmlRiskTier('Low');
      setInitialDepositStr('0');
      setDepositType('ZeroBalance');
      setDescription('');
      setUseCustomAccNum(false);
      setCustomAccNum('');

      const firstCustomerAccount = accounts.find((a) => a.category === 'customer' && a.status === 'Active');
      if (firstCustomerAccount) {
        setSourceAccountId(firstCustomerAccount.id);
      }
    }
  }, [isOpen, accounts]);

  // Adjust default routing code and type when category toggles
  const handleCategoryChange = (cat: 'customer' | 'system') => {
    setCategory(cat);
    if (cat === 'system') {
      setAccountType('Asset');
      setRoutingCode('000000000');
      setDepositType('ZeroBalance');
    } else {
      setAccountType('Checking');
      setRoutingCode('021000021');
    }
  };

  const initialDeposit = parseFloat(initialDepositStr) || 0;
  const effectiveAccountNumber = useCustomAccNum ? customAccNum.trim().toUpperCase() : autoGenAccNum;

  // Selected source account for internal transfer
  const selectedSourceAccount = accounts.find((a) => a.id === sourceAccountId);

  // Validation
  const validateForm = (): string | null => {
    if (!name.trim()) return 'Legal Account Name / Title is required.';
    if (!owner.trim()) return 'Account Owner / Signatory is required.';
    if (useCustomAccNum && !customAccNum.trim()) return 'Custom Account Number cannot be empty.';
    if (initialDeposit < 0) return 'Initial deposit amount cannot be negative.';

    if (initialDeposit > 0) {
      if (depositType === 'ZeroBalance') {
        return 'Please select a valid deposit funding method (Cash, Wire, Cheque, or Internal Transfer) for amounts greater than $0.00.';
      }
      if (depositType === 'InternalTransfer') {
        if (!sourceAccountId) {
          return 'Please select a source account for internal transfer funding.';
        }
        if (selectedSourceAccount && selectedSourceAccount.availableBalance < initialDeposit) {
          return `Insufficient funds in source account ${selectedSourceAccount.accountNumber}. Available: ${formatCurrency(
            selectedSourceAccount.availableBalance,
            currency
          )}`;
        }
      }
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    setErrorMsg('');
    setIsSubmitting(true);

    try {
      const payload: CreateAccountPayload = {
        accountNumber: effectiveAccountNumber,
        name: name.trim(),
        owner: owner.trim(),
        category,
        type: accountType,
        currency,
        initialDeposit,
        depositType,
        sourceAccountId: depositType === 'InternalTransfer' ? sourceAccountId : undefined,
        routingCode,
        description: description.trim(),
        taxId: taxId.trim() || undefined,
        customerEmail: customerEmail.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        branchCode: branchCode.trim() || undefined,
        amlRiskTier,
      };

      const result = await onCreateAccount(payload);
      if (result.success) {
        onClose();
      } else {
        setErrorMsg(result.message || 'Account creation was rejected by the core ledger engine.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred during account creation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs transition-opacity" 
        onClick={onClose} 
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-3xl my-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-10 text-slate-900 dark:text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Open New Banking Account
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  System Admin Clearance
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Provision institutional deposit accounts and Chart of Accounts (COA) general ledgers with atomic invariant validation.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Account Classification */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
              1. Account Classification & Ledger Type
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleCategoryChange('customer')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  category === 'customer'
                    ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 ring-1 ring-emerald-500'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold text-xs text-slate-900 dark:text-white">
                    <Building2 className="w-4 h-4 text-emerald-500" />
                    Customer Deposit Account
                  </div>
                  {category === 'customer' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Commercial checking, high-yield savings, or escrow liability account belonging to external clients.
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleCategoryChange('system')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  category === 'system'
                    ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20 ring-1 ring-indigo-500'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold text-xs text-slate-900 dark:text-white">
                    <Landmark className="w-4 h-4 text-indigo-500" />
                    Chart of Accounts (System COA)
                  </div>
                  {category === 'system' && <CheckCircle2 className="w-4 h-4 text-indigo-500" />}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Internal general ledger chart (Asset, Liability, Equity, Revenue, Expense) for central bank reserves & ops.
                </p>
              </button>
            </div>

            {/* Type selector and Account Number Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1">
                  Account Type / Category
                </label>
                <select
                  value={accountType}
                  onChange={(e) => setAccountType(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-emerald-500 outline-hidden"
                >
                  {category === 'customer' ? (
                    <>
                      <option value="Checking">Checking (Demand Deposit Account - DDA)</option>
                      <option value="Savings">Savings (High-Yield Commercial Reserve)</option>
                      <option value="Escrow">Escrow (Fiduciary Ring-Fenced Account)</option>
                    </>
                  ) : (
                    <>
                      <option value="Asset">Asset (1000s - Cash Vault, Federal Reserve Clearing)</option>
                      <option value="Liability">Liability (2000s - Customer Deposit Aggregate)</option>
                      <option value="Equity">Equity (3000s - Tier 1 Paid-In Capital)</option>
                      <option value="Revenue">Revenue (4000s - Interchange & Wire Fees)</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    Account Number
                  </label>
                  <button
                    type="button"
                    onClick={() => setUseCustomAccNum(!useCustomAccNum)}
                    className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    {useCustomAccNum ? 'Use auto-generated' : 'Custom number'}
                  </button>
                </div>

                {useCustomAccNum ? (
                  <input
                    type="text"
                    placeholder={category === 'customer' ? 'e.g. ACC-1234-CHK' : 'e.g. SYS-1020-AST'}
                    value={customAccNum}
                    onChange={(e) => setCustomAccNum(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-emerald-500 outline-hidden uppercase"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 px-3 py-2 text-xs font-mono font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-emerald-600 dark:text-emerald-400">
                      {autoGenAccNum}
                    </div>
                    <button
                      type="button"
                      onClick={() => setAutoGenAccNum(generateRandomAccountNumber(category, accountType))}
                      title="Regenerate account number"
                      className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 2. Legal Entity & Signatory Information */}
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
              2. Legal Entity & Regulatory Verification (KYC / AML)
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1">
                  Legal Account Name / Entity Title *
                </label>
                <input
                  type="text"
                  placeholder={category === 'customer' ? 'e.g. Horizon Robotics LLC' : 'e.g. Liquidity Settlement Reserve'}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-emerald-500 outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1">
                  Beneficial Signatory / Legal Owner *
                </label>
                <input
                  type="text"
                  placeholder={category === 'customer' ? 'e.g. Eleanor Vance, Managing Partner' : 'e.g. Aegis Central Treasury'}
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-emerald-500 outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1">
                  Tax Identification Number (EIN / SSN)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 12-3456789 or 987-65-4321"
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-emerald-500 outline-hidden"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1">
                  AML Compliance Risk Tier
                </label>
                <select
                  value={amlRiskTier}
                  onChange={(e) => setAmlRiskTier(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-emerald-500 outline-hidden"
                >
                  <option value="Low">Tier 1: Low Risk (Standard Corporate / Individual)</option>
                  <option value="Medium">Tier 2: Medium Risk (Cross-Border / High-Velocity)</option>
                  <option value="High">Tier 3: Elevated Risk (Fiduciary / High Net Worth)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1">
                  Notification Email Address
                </label>
                <input
                  type="email"
                  placeholder="e.g. accounting@horizonrobotics.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-emerald-500 outline-hidden"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1">
                  ABA Routing Transit Number
                </label>
                <input
                  type="text"
                  value={routingCode}
                  onChange={(e) => setRoutingCode(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-emerald-500 outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* 3. Initial Funding & Invariant Balancing */}
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                3. Initial Funding & Deposit Workflow
              </label>
              <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Atomic Double-Entry Posting
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1">
                  Initial Deposit Amount ({currency})
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs text-slate-400 font-bold">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={initialDepositStr}
                    onChange={(e) => {
                      const val = e.target.value;
                      setInitialDepositStr(val);
                      if (parseFloat(val) > 0 && depositType === 'ZeroBalance') {
                        setDepositType('CashVault');
                      } else if (parseFloat(val) === 0) {
                        setDepositType('ZeroBalance');
                      }
                    }}
                    className="w-full pl-7 pr-3 py-2 text-xs font-mono font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-emerald-500 outline-hidden"
                  />
                </div>
                <span className="text-[11px] text-slate-400 mt-0.5 block">
                  Set to 0.00 for Zero-Balance Account (ZBA) opened pending subsequent incoming transfer.
                </span>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1">
                  Deposit Type / Funding Source
                </label>
                <select
                  value={depositType}
                  onChange={(e) => setDepositType(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-emerald-500 outline-hidden"
                >
                  <option value="ZeroBalance">Zero-Balance Account ($0.00 initial funding)</option>
                  <option value="CashVault">Cash Vault Deposit (Physical currency intake at teller desk)</option>
                  <option value="WireClearing">Fedwire / ACH Clearing (Incoming central reserve wire)</option>
                  <option value="ChequeDeposit">Cheque Transit Deposit (Commercial clearing item)</option>
                  <option value="InternalTransfer">Internal Book Transfer (From existing active account)</option>
                </select>
              </div>
            </div>

            {/* Source account picker if internal transfer */}
            {depositType === 'InternalTransfer' && initialDeposit > 0 && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                  Select Source Funding Account
                </label>
                <select
                  value={sourceAccountId}
                  onChange={(e) => setSourceAccountId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-emerald-500 outline-hidden"
                >
                  {accounts
                    .filter((a) => a.status === 'Active')
                    .map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.accountNumber} - {acc.name} (Available: {formatCurrency(acc.availableBalance, currency)})
                      </option>
                    ))}
                </select>

                {selectedSourceAccount && (
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1">
                    <span>Source Ledger Balance: {formatCurrency(selectedSourceAccount.ledgerBalance, currency)}</span>
                    <span className={selectedSourceAccount.availableBalance < initialDeposit ? 'text-red-500 font-bold' : 'text-emerald-500'}>
                      Available: {formatCurrency(selectedSourceAccount.availableBalance, currency)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Double-Entry Balancing Simulation Box */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/60 font-mono text-xs space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span className="font-semibold uppercase tracking-wider">Accounting Posting Preview</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                  Invariant: Zero Drift (Δ = $0.00)
                </span>
              </div>

              {initialDeposit > 0 ? (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
                    <span className="text-red-600 dark:text-red-400 font-bold">DEBIT (DR):</span>
                    <span className="text-slate-600 dark:text-slate-300">
                      {depositType === 'InternalTransfer' 
                        ? (selectedSourceAccount?.accountNumber || 'Source Account') 
                        : 'SYS-1010-CASH (Reserve Asset)'}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {formatCurrency(initialDeposit, currency)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">CREDIT (CR):</span>
                    <span className="text-slate-600 dark:text-slate-300">
                      {effectiveAccountNumber} ({category === 'customer' ? 'Deposit Liability' : 'GL Equity/Asset'})
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {formatCurrency(initialDeposit, currency)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-[11px] text-slate-500 dark:text-slate-400 italic py-1">
                  Zero initial deposit selected. The account will be registered with $0.00 ledger balance. No double-entry offset required.
                </div>
              )}
            </div>
          </div>

          {/* 4. Operating Narrative */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
              4. Operating Narrative & Compliance Memo
            </label>
            <input
              type="text"
              placeholder="e.g. Primary corporate operating treasury account for automated wire clearing"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-emerald-500 outline-hidden"
            />
          </div>
        </form>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 flex items-center justify-between">
          <div className="text-[11px] text-slate-400">
            Audit logging: SystemAdmin session active
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 rounded-lg shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Provisioning Account...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Authorize & Provision Account
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

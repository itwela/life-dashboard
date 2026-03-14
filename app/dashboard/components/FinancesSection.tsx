"use client";

import { useState } from "react";
import { Doc, Id } from "../../../convex/_generated/dataModel";
import AddModal, { FormField, FormInput, FormSelect } from "./AddModal";

const ACCENT = "#4ade80";

interface Props {
  accounts: Doc<"accounts">[];
  transactions: Doc<"transactions">[];
  upsertAccount: (args: { id?: Id<"accounts">; name: string; type: "checking" | "savings" | "investment" | "debt" | "other"; balance: number }) => Promise<void>;
  addTransaction: (args: { label: string; amount: number; type: "income" | "expense"; category: string }) => Promise<void>;
}

const typeColor: Record<string, string> = {
  checking: "#60a5fa", savings: "#4ade80", investment: "#f59e0b", debt: "#f87171", other: "#a78bfa",
};

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

export default function FinancesSection({
  accounts,
  transactions,
  upsertAccount,
  addTransaction,
}: Props) {
  const [accountModal, setAccountModal] = useState(false);
  const [txModal, setTxModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Doc<"accounts"> | null>(null);

  const [accName, setAccName]       = useState("");
  const [accType, setAccType]       = useState<"checking" | "savings" | "investment" | "debt" | "other">("checking");
  const [accBalance, setAccBalance] = useState("");

  const [txLabel, setTxLabel]       = useState("");
  const [txAmount, setTxAmount]     = useState("");
  const [txType, setTxType]         = useState<"income" | "expense">("expense");
  const [txCategory, setTxCategory] = useState("General");

  const netWorth = accounts.reduce(
    (s, a) => (a.type === "debt" ? s - a.balance : s + a.balance),
    0
  );

  const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);
  const monthTx      = transactions.filter((t) => t.date >= startOfMonth.getTime());
  const monthIncome  = monthTx.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const monthExpense = monthTx.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  function openAddAccount() { setEditingAccount(null); setAccName(""); setAccType("checking"); setAccBalance(""); setAccountModal(true); }
  function openEditAccount(a: Doc<"accounts">) { setEditingAccount(a); setAccName(a.name); setAccType(a.type); setAccBalance(String(a.balance)); setAccountModal(true); }

  async function handleAccountSubmit() {
    if (!accName.trim()) return;
    await upsertAccount({ id: editingAccount?._id, name: accName.trim(), type: accType, balance: Number(accBalance) || 0 });
    setAccountModal(false);
  }

  async function handleTxSubmit() {
    if (!txLabel.trim() || !txAmount) return;
    await addTransaction({ label: txLabel.trim(), amount: Number(txAmount), type: txType, category: txCategory || "General" });
    setTxModal(false); setTxLabel(""); setTxAmount(""); setTxType("expense"); setTxCategory("General");
  }

  return (
    <div
      className="h-full rounded-2xl p-5 flex flex-col overflow-hidden relative"
      style={{
        background: "linear-gradient(135deg, rgba(74,222,128,0.07) 0%, rgba(21,128,61,0.05) 100%)",
        border: "1px solid rgba(74,222,128,0.2)",
        boxShadow: "0 0 40px rgba(74,222,128,0.07), inset 0 1px 0 rgba(255,255,255,0.08)",
      }}
    >
      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(74,222,128,0.12) 0%, transparent 70%)" }} />

      {/* Header */}
      <div className="shrink-0 flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgba(74,222,128,0.3), rgba(21,128,61,0.15))", border: "1px solid rgba(74,222,128,0.35)", boxShadow: "0 0 16px rgba(74,222,128,0.3)" }}>💰</div>
          <div>
            <h2 className="text-sm font-bold text-white">Finances</h2>
            <p className="text-xs text-white/40">Net Worth & Cash Flow</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <button onClick={() => { setTxLabel(""); setTxAmount(""); setTxType("expense"); setTxCategory("General"); setTxModal(true); }}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:scale-105 active:scale-95"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}>
            + Transaction
          </button>
          <button onClick={openAddAccount}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:scale-105 active:scale-95"
            style={{ background: "linear-gradient(135deg, rgba(74,222,128,0.35), rgba(21,128,61,0.2))", border: "1px solid rgba(74,222,128,0.4)", boxShadow: "0 0 12px rgba(74,222,128,0.25)" }}>
            + Account
          </button>
        </div>
      </div>

      {/* 2-col layout */}
      <div className="flex-1 min-h-0 grid grid-cols-2 gap-4">

        {/* Left: net worth + cashflow + accounts */}
        <div className="flex flex-col gap-3 min-h-0">
          <div className="rounded-xl p-4 text-center shrink-0" style={{ background: "linear-gradient(135deg, rgba(74,222,128,0.12), rgba(21,128,61,0.08))", border: "1px solid rgba(74,222,128,0.2)", boxShadow: "0 0 24px rgba(74,222,128,0.12)" }}>
            <p className="text-xs text-white/40 uppercase tracking-widest mb-1">Total Net Worth</p>
            <p className="text-4xl font-black tracking-tight" style={{ color: netWorth >= 0 ? ACCENT : "#f87171", textShadow: `0 0 30px ${netWorth >= 0 ? "rgba(74,222,128,0.5)" : "rgba(248,113,113,0.5)"}` }}>
              {fmt(netWorth)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 shrink-0">
            <div className="rounded-xl p-3 text-center" style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.15)" }}>
              <p className="text-xs text-white/40 mb-0.5">Income (MTD)</p>
              <p className="text-base font-bold text-green-400">{fmt(monthIncome)}</p>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.15)" }}>
              <p className="text-xs text-white/40 mb-0.5">Expenses (MTD)</p>
              <p className="text-base font-bold text-red-400">{fmt(monthExpense)}</p>
            </div>
          </div>

          <div className="flex flex-col min-h-0 flex-1">
            <p className="text-xs text-white/40 uppercase tracking-wider mb-2 shrink-0">Accounts</p>
            {accounts.length === 0 ? (
              <p className="text-sm text-white/25 text-center py-4">No accounts yet.</p>
            ) : (
              <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-2 content-start pr-1">
                {accounts.map((a) => (
                  <div key={a._id} className="rounded-xl p-3 cursor-pointer hover:scale-[1.02] transition-transform"
                    style={{ background: `rgba(${a.type === "checking" ? "96,165,250" : a.type === "savings" ? "74,222,128" : a.type === "investment" ? "245,158,11" : a.type === "debt" ? "248,113,113" : "167,139,250"},0.08)`, border: `1px solid ${typeColor[a.type]}30` }}
                    onClick={() => openEditAccount(a)}>
                    <p className="text-xs text-white/40 capitalize mb-0.5">{a.type}</p>
                    <p className="text-xs font-semibold text-white truncate">{a.name}</p>
                    <p className="text-sm font-bold mt-0.5" style={{ color: typeColor[a.type] }}>
                      {a.type === "debt" ? `-${fmt(a.balance)}` : fmt(a.balance)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: transactions */}
        <div className="flex flex-col min-h-0">
          <p className="text-xs text-white/40 uppercase tracking-wider mb-2 shrink-0">Recent Transactions</p>
          {transactions.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm text-white/25 text-center">No transactions yet.</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-1 pr-1">
              {transactions.map((t) => (
                <div key={t._id} className="flex items-center gap-3 px-3 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <span className="text-sm">{t.type === "income" ? "↑" : "↓"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/80 truncate">{t.label}</p>
                    <p className="text-xs text-white/30">{t.category}</p>
                  </div>
                  <span className="text-sm font-semibold shrink-0" style={{ color: t.type === "income" ? "#4ade80" : "#f87171" }}>
                    {t.type === "income" ? "+" : "-"}{fmt(t.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <AddModal title={editingAccount ? "Edit Account" : "Add Account"} open={accountModal} onClose={() => setAccountModal(false)} onSubmit={handleAccountSubmit} accentColor={ACCENT}>
        <FormField label="Account Name"><FormInput value={accName} onChange={setAccName} placeholder="e.g. Chase Checking" /></FormField>
        <FormField label="Type"><FormSelect value={accType} onChange={(v) => setAccType(v as typeof accType)} options={[{ value: "checking", label: "Checking" }, { value: "savings", label: "Savings" }, { value: "investment", label: "Investment" }, { value: "debt", label: "Debt" }, { value: "other", label: "Other" }]} /></FormField>
        <FormField label="Balance ($)"><FormInput value={accBalance} onChange={setAccBalance} type="number" placeholder="0.00" /></FormField>
      </AddModal>

      <AddModal title="Log Transaction" open={txModal} onClose={() => setTxModal(false)} onSubmit={handleTxSubmit} accentColor={ACCENT} submitLabel="Log It">
        <FormField label="Description"><FormInput value={txLabel} onChange={setTxLabel} placeholder="e.g. Spotify subscription" /></FormField>
        <FormField label="Amount ($)"><FormInput value={txAmount} onChange={setTxAmount} type="number" placeholder="0.00" /></FormField>
        <FormField label="Type"><FormSelect value={txType} onChange={(v) => setTxType(v as typeof txType)} options={[{ value: "income", label: "Income" }, { value: "expense", label: "Expense" }]} /></FormField>
        <FormField label="Category"><FormInput value={txCategory} onChange={setTxCategory} placeholder="e.g. Subscriptions" /></FormField>
      </AddModal>
    </div>
  );
}

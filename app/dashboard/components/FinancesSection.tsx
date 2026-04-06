"use client";

import { useState, useRef } from "react";
import { Doc, Id } from "../../../convex/_generated/dataModel";
import AddModal, { FormField, FormInput, FormSelect } from "./AddModal";

const ACCENT = "#4ade80";

const INVESTMENT_TYPES = [
  { value: "brokerage", label: "Brokerage" },
  { value: "401k", label: "401(k)" },
  { value: "ira", label: "IRA" },
  { value: "crypto", label: "Crypto" },
  { value: "other", label: "Other" },
] as const;

interface FinanceFileWithUrl extends Doc<"financeFiles"> {
  url: string | null;
}

interface Props {
  accounts: Doc<"accounts">[];
  financeFiles: FinanceFileWithUrl[];
  upsertAccount: (args: {
    id?: Id<"accounts">;
    name: string;
    type: "checking" | "savings" | "investment" | "debt" | "other";
    balance: number;
    investmentType?: string;
  }) => Promise<void>;
  generateUploadUrl: () => Promise<string>;
  saveFinanceFile: (args: { name: string; storageId: Id<"_storage">; notes?: string }) => Promise<void>;
  deleteFinanceFile: (args: { id: Id<"financeFiles"> }) => Promise<void>;
}

const typeColor: Record<string, string> = {
  checking: "#60a5fa",
  savings: "#4ade80",
  investment: "#f59e0b",
  debt: "#f87171",
  other: "#a78bfa",
};

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

export default function FinancesSection({
  accounts,
  financeFiles,
  upsertAccount,
  generateUploadUrl,
  saveFinanceFile,
  deleteFinanceFile,
}: Props) {
  const [accountModal, setAccountModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Doc<"accounts"> | null>(null);
  const [accName, setAccName] = useState("");
  const [accType, setAccType] = useState<"checking" | "savings" | "investment" | "debt" | "other">("checking");
  const [accBalance, setAccBalance] = useState("");
  const [accInvestmentType, setAccInvestmentType] = useState<string>("brokerage");
  const [fileUploading, setFileUploading] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<Id<"financeFiles"> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cash = accounts
    .filter((a) => a.type === "checking" || a.type === "savings")
    .reduce((s, a) => s + a.balance, 0);
  const investments = accounts.filter((a) => a.type === "investment").reduce((s, a) => s + a.balance, 0);
  const debt = accounts.filter((a) => a.type === "debt").reduce((s, a) => s + a.balance, 0);
  const other = accounts.filter((a) => a.type === "other").reduce((s, a) => s + a.balance, 0);
  const netWorth = cash + investments + other - debt;

  function openAddAccount() {
    setEditingAccount(null);
    setAccName("");
    setAccType("checking");
    setAccBalance("");
    setAccInvestmentType("brokerage");
    setAccountModal(true);
  }
  function openEditAccount(a: Doc<"accounts">) {
    setEditingAccount(a);
    setAccName(a.name);
    setAccType(a.type);
    setAccBalance(String(a.balance));
    setAccInvestmentType("investmentType" in a && a.investmentType ? a.investmentType : "brokerage");
    setAccountModal(true);
  }

  async function handleAccountSubmit() {
    if (!accName.trim()) return;
    await upsertAccount({
      id: editingAccount?._id,
      name: accName.trim(),
      type: accType,
      balance: Number(accBalance) || 0,
      investmentType: accType === "investment" ? accInvestmentType : undefined,
    });
    setAccountModal(false);
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || fileUploading) return;
    setFileUploading(true);
    try {
      const url = await generateUploadUrl();
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!res.ok) throw new Error("Upload failed");
      const { storageId } = (await res.json()) as { storageId: Id<"_storage"> };
      await saveFinanceFile({
        name: newFileName.trim() || file.name,
        storageId,
        notes: undefined,
      });
      setNewFileName("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } finally {
      setFileUploading(false);
    }
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
      <div
        className="absolute -top-10 -right-10 w-40 h-40 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(74,222,128,0.12) 0%, transparent 70%)" }}
      />

      <div className="shrink-0 flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, rgba(74,222,128,0.3), rgba(21,128,61,0.15))",
              border: "1px solid rgba(74,222,128,0.35)",
              boxShadow: "0 0 16px rgba(74,222,128,0.3)",
            }}
          >
            💰
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Finances</h2>
            <p className="text-xs text-white/40">Net worth, accounts & files</p>
          </div>
        </div>
        <button
          onClick={openAddAccount}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:scale-105 active:scale-95"
          style={{
            background: "linear-gradient(135deg, rgba(74,222,128,0.35), rgba(21,128,61,0.2))",
            border: "1px solid rgba(74,222,128,0.4)",
            boxShadow: "0 0 12px rgba(74,222,128,0.25)",
          }}
        >
          + Account
        </button>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-3 min-h-0">
          <div
            className="rounded-xl p-4 text-center shrink-0"
            style={{
              background: "linear-gradient(135deg, rgba(74,222,128,0.12), rgba(21,128,61,0.08))",
              border: "1px solid rgba(74,222,128,0.2)",
              boxShadow: "0 0 24px rgba(74,222,128,0.12)",
            }}
          >
            <p className="text-xs text-white/40 uppercase tracking-widest mb-1">Total Net Worth</p>
            <p
              className="text-4xl font-black tracking-tight"
              style={{
                color: netWorth >= 0 ? ACCENT : "#f87171",
                textShadow: `0 0 30px ${netWorth >= 0 ? "rgba(74,222,128,0.5)" : "rgba(248,113,113,0.5)"}`,
              }}
            >
              {fmt(netWorth)}
            </p>
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2 text-xs">
              <span className="text-white/50">Cash:</span>
              <span className="text-blue-300">{fmt(cash)}</span>
              <span className="text-white/40">·</span>
              <span className="text-white/50">Investments:</span>
              <span className="text-amber-300">{fmt(investments)}</span>
              <span className="text-white/40">·</span>
              <span className="text-white/50">Debt:</span>
              <span className="text-red-400">{debt > 0 ? `-${fmt(debt)}` : fmt(0)}</span>
              {other !== 0 && (
                <>
                  <span className="text-white/40">·</span>
                  <span className="text-white/50">Other:</span>
                  <span className="text-purple-300">{fmt(other)}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-col min-h-0 flex-1">
            <p className="text-xs text-white/40 uppercase tracking-wider mb-2 shrink-0">Accounts</p>
            {accounts.length === 0 ? (
              <p className="text-sm text-white/25 text-center py-4">No accounts yet.</p>
            ) : (
              <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-2 content-start pr-1">
                {accounts.map((a) => (
                  <div
                    key={a._id}
                    className="rounded-xl p-3 cursor-pointer hover:scale-[1.02] transition-transform"
                    style={{
                      background: `rgba(${
                        a.type === "checking"
                          ? "96,165,250"
                          : a.type === "savings"
                            ? "74,222,128"
                            : a.type === "investment"
                              ? "245,158,11"
                              : a.type === "debt"
                                ? "248,113,113"
                                : "167,139,250"
                      },0.08)`,
                      border: `1px solid ${typeColor[a.type]}30`,
                    }}
                    onClick={() => openEditAccount(a)}
                  >
                    <p className="text-xs text-white/40 capitalize mb-0.5">
                      {a.type === "investment" && "investmentType" in a && a.investmentType
                        ? a.investmentType
                        : a.type}
                    </p>
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

        <div className="flex flex-col min-h-0">
          <p className="text-xs text-white/40 uppercase tracking-wider mb-2 shrink-0">Files (e.g. credit report)</p>
          <p className="text-xs text-white/35 mb-2">Save with date so you know when you can get a new free one.</p>
          <div className="shrink-0 flex flex-wrap gap-2 mb-2">
            <input
              type="text"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder="Name (e.g. Credit Report)"
              className="rounded-lg px-2 py-1.5 text-xs bg-white/5 border border-white/10 text-white placeholder-white/30 flex-1 min-w-[120px]"
            />
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.PDF,image/*"
              onChange={handleFileSelect}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={fileUploading}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-white/10 border border-white/20 hover:bg-white/15 disabled:opacity-50"
            >
              {fileUploading ? "Uploading…" : "+ Add file"}
            </button>
          </div>
          {financeFiles.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm text-white/25 text-center">No files yet. Add a credit report or other doc.</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {financeFiles.map((f) => (
                <div
                  key={f._id}
                  className="flex items-center justify-between gap-2 rounded-lg px-3 py-2"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white/90 truncate">{f.name}</p>
                    <p className="text-xs text-white/40">
                      {new Date(f.addedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {f.url && (
                      <a
                        href={f.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-1 rounded text-xs font-medium text-[#60c8ff] hover:bg-white/10"
                      >
                        Open
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (pendingDeleteId === f._id) {
                          deleteFinanceFile({ id: f._id });
                          setPendingDeleteId(null);
                        } else {
                          setPendingDeleteId(f._id);
                        }
                      }}
                      onBlur={() => setTimeout(() => setPendingDeleteId(null), 200)}
                      className={`px-2 py-1 rounded text-xs transition-all duration-200 min-w-[52px] ${
                        pendingDeleteId !== f._id ? "hover:text-red-400 hover:bg-white/5" : ""
                      }`}
                      style={
                        pendingDeleteId === f._id
                          ? {
                              background: "rgba(248,113,113,0.25)",
                              border: "1px solid rgba(248,113,113,0.5)",
                              color: "#fca5a5",
                              boxShadow: "0 0 12px rgba(248,113,113,0.2)",
                            }
                          : { color: "rgba(255,255,255,0.5)" }
                      }
                    >
                      {pendingDeleteId === f._id ? "Sure?" : "Delete"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <AddModal
        title={editingAccount ? "Edit Account" : "Add Account"}
        open={accountModal}
        onClose={() => setAccountModal(false)}
        onSubmit={handleAccountSubmit}
        accentColor={ACCENT}
      >
        <FormField label="Account Name">
          <FormInput value={accName} onChange={setAccName} placeholder="e.g. Chase Checking" />
        </FormField>
        <FormField label="Type">
          <FormSelect
            value={accType}
            onChange={(v) => setAccType(v as typeof accType)}
            options={[
              { value: "checking", label: "Checking" },
              { value: "savings", label: "Savings" },
              { value: "investment", label: "Investment" },
              { value: "debt", label: "Debt" },
              { value: "other", label: "Other" },
            ]}
          />
        </FormField>
        {accType === "investment" && (
          <FormField label="Investment type">
            <FormSelect
              value={accInvestmentType}
              onChange={setAccInvestmentType}
              options={INVESTMENT_TYPES.map((t) => ({ value: t.value, label: t.label }))}
            />
          </FormField>
        )}
        <FormField label="Balance ($)">
          <FormInput value={accBalance} onChange={setAccBalance} type="number" placeholder="0.00" />
        </FormField>
      </AddModal>
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { Check, X, AlertTriangle, Edit2, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface StagingRow {
  id: string | number;
  date: string;
  vendor: string;
  amount: number;
  description: string;
  account: string; // The AI Mapped Account
  confidence: number; // 0-100
  riskLevel: "Low" | "Medium" | "High" | "Critical";
  status: "Pending" | "Approved" | "Rejected";
}

interface StagingTableProps {
  data: StagingRow[];
  onUpdateRow: (id: string | number, updates: Partial<StagingRow>) => void;
  onApprove: (id: string | number) => void;
  onReject: (id: string | number) => void;
}

const StagingTable: React.FC<StagingTableProps> = ({ data, onUpdateRow, onApprove, onReject }) => {
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [editValues, setEditValues] = useState<Partial<StagingRow>>({});

  const startEdit = (row: StagingRow) => {
    setEditingId(row.id);
    setEditValues({ ...row });
  };

  const saveEdit = () => {
    if (editingId) {
      onUpdateRow(editingId, editValues);
      setEditingId(null);
      setEditValues({});
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValues({});
  };

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-white/10 bg-slate-900/50 backdrop-blur-md shadow-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-300">
          <thead>
            <tr className="border-b border-white/5 bg-black/20 text-xs font-black uppercase tracking-widest text-slate-500">
              <th className="p-4 w-12 text-center">Stat</th>
              <th className="p-4">Date</th>
              <th className="p-4">Vendor</th>
              <th className="p-4 text-right">Amount</th>
              <th className="p-4">Description</th>
              <th className="p-4 w-48">Account (AI Mapped)</th>
              <th className="p-4 w-24 text-center">Risk</th>
              <th className="p-4 text-center w-32">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            <AnimatePresence>
              {data.map((row) => (
                <motion.tr
                  key={row.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`group transition-all hover:bg-white/5 ${
                    editingId === row.id ? "bg-blue-500/10" : ""
                  }`}
                >
                  {/* Status Icon */}
                  <td className="p-4 text-center">
                    <div
                      className={`mx-auto h-2 w-2 rounded-full ${
                        row.status === "Approved"
                          ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                          : row.status === "Rejected"
                          ? "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]"
                          : "bg-amber-400"
                      }`}
                    />
                  </td>

                  {/* Date */}
                  <td className="p-4 font-mono text-xs opacity-70">{row.date}</td>

                  {/* Vendor */}
                  <td className="p-4 font-bold text-white">{row.vendor}</td>

                  {/* Amount */}
                  <td className="p-4 text-right font-mono font-bold text-emerald-400">
                    {row.amount.toLocaleString()}
                  </td>

                  {/* Description */}
                  <td className="p-4 text-slate-400 max-w-[200px] truncate" title={row.description}>
                    {row.description}
                  </td>

                  {/* Account (Editable) */}
                  <td className="p-4">
                    {editingId === row.id ? (
                      <input
                        autoFocus
                        type="text"
                        value={editValues.account || ""}
                        onChange={(e) =>
                          setEditValues({
                            ...editValues,
                            account: e.target.value,
                            status: "Approved", // Auto-approve on manual edit? Maybe
                          })
                        }
                        className="w-full rounded-lg border border-blue-500 bg-slate-800 px-3 py-1.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      />
                    ) : (
                      <div
                        onClick={() => startEdit(row)}
                        className="flex cursor-pointer items-center gap-2 rounded-lg border border-transparent px-2 py-1 hover:border-white/10 hover:bg-white/5"
                      >
                        <span
                          className={`font-bold ${
                            row.confidence < 70 ? "text-amber-400" : "text-blue-300"
                          }`}
                        >
                          {row.account || "Unassigned"}
                        </span>
                        {row.confidence < 70 && (
                          <AlertTriangle className="h-3 w-3 text-amber-500" />
                        )}
                        <Edit2 className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-50" />
                      </div>
                    )}
                  </td>

                  {/* Risk Level */}
                  <td className="p-4 text-center">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-tight ${
                        row.riskLevel === "Critical"
                          ? "bg-rose-500/20 text-rose-500 border border-rose-500/30"
                          : row.riskLevel === "High"
                          ? "bg-orange-500/20 text-orange-500 border border-orange-500/30"
                          : row.riskLevel === "Medium"
                          ? "bg-amber-500/20 text-amber-500 border border-amber-500/30"
                          : "bg-slate-700/50 text-slate-500 border border-slate-700"
                      }`}
                    >
                      {row.riskLevel}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="p-4 text-center">
                    {editingId === row.id ? (
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={saveEdit}
                          className="rounded-lg bg-blue-600 p-1.5 text-white hover:bg-blue-500"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="rounded-lg bg-slate-700 p-1.5 text-slate-300 hover:bg-slate-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2 opacity-50 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={() => onApprove(row.id)}
                          className="rounded-lg p-1.5 text-emerald-500 hover:bg-emerald-500/10"
                          title="Approve"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onReject(row.id)}
                          className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-500/10"
                          title="Reject"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
      {data.length === 0 && (
        <div className="flex h-40 items-center justify-center text-slate-500">
          No transactions pending review.
        </div>
      )}
    </div>
  );
};

export default StagingTable;

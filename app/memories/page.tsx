"use client";

import { useEffect, useState } from "react";
import {
  ShieldAlert,
  BrainCircuit,
  Sliders,
  Trash2,
  Edit3,
  AlertTriangle,
  CheckCircle,
  Clock,
  History,
  Lock,
  Search,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Memory } from "@/types/memory";

export default function MemoryGovernancePage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [expandedMemoryId, setExpandedMemoryId] = useState<string | null>(null);

  // Modals / Input states
  const [disputingMemory, setDisputingMemory] = useState<Memory | null>(null);
  const [disputeReason, setDisputeReason] = useState("");

  const [editingMemory, setEditingMemory] = useState<Memory | null>(null);
  const [newObservation, setNewObservation] = useState("");
  const [editReason, setEditReason] = useState("");

  const loadMemories = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/memories?userId=demo_speaker_1&all=true");
      const data = await res.json();
      if (data.success && data.memories) {
        setMemories(data.memories);
      }
    } catch (err) {
      console.error("Failed to load memories:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMemories();
  }, []);

  const handleDispute = async () => {
    if (!disputingMemory || !disputeReason) return;
    try {
      const res = await fetch(`/api/memories/${disputingMemory.memoryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "dispute",
          reason: disputeReason,
        }),
      });
      if (res.ok) {
        setDisputingMemory(null);
        setDisputeReason("");
        loadMemories();
      }
    } catch (err) {
      console.error("Dispute failed:", err);
    }
  };

  const handleEdit = async () => {
    if (!editingMemory || !newObservation) return;
    try {
      const res = await fetch(`/api/memories/${editingMemory.memoryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "edit",
          observation: newObservation,
          reason: editReason || "User corrected inaccurate observation",
        }),
      });
      if (res.ok) {
        setEditingMemory(null);
        setNewObservation("");
        setEditReason("");
        loadMemories();
      }
    } catch (err) {
      console.error("Edit failed:", err);
    }
  };

  const handleDeprecate = async (memoryId: string) => {
    try {
      const res = await fetch(`/api/memories/${memoryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "deprecate",
          reason: "User manually deactivated this memory",
        }),
      });
      if (res.ok) {
        loadMemories();
      }
    } catch (err) {
      console.error("Deprecate failed:", err);
    }
  };

  const handlePurge = async (memoryId: string) => {
    if (!confirm("Are you sure you want to permanently delete this memory? (Right to be Forgotten)")) return;
    try {
      const res = await fetch(`/api/memories/${memoryId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        loadMemories();
      }
    } catch (err) {
      console.error("Purge failed:", err);
    }
  };

  const filteredMemories = memories.filter((m) => {
    if (filterStatus === "all") return true;
    return m.governanceStatus === filterStatus;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 w-full space-y-8 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-surface-border pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-cyber-amber text-xs font-semibold mb-2">
            <ShieldAlert className="w-3.5 h-3.5" />
            Governance & Audit Console &bull; Statement Two
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Memory Governance Control Center
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Persist, audit, correct, and expire episodic memories stored in MongoDB Atlas with strict tenant isolation.
          </p>
        </div>

        {/* Tenant Filter Badge */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900 border border-surface-border text-xs font-mono">
          <Lock className="w-3.5 h-3.5 text-cyber-cyan" />
          <span className="text-slate-400">Scoped Tenant:</span>
          <span className="text-cyber-cyan font-bold">demo_speaker_1</span>
        </div>
      </div>

      {/* Governance Explainer Grid for Judges */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl glass-panel border border-surface-border">
          <span className="text-xs font-mono text-cyber-cyan font-bold block mb-1">
            Q1: Anti-Leakage Guarantee
          </span>
          <p className="text-xs text-slate-300 leading-relaxed">
            Atlas Vector Search enforces a mandatory <code className="text-cyber-cyan">userId</code> filter stage before vector distance calculation.
          </p>
        </div>
        <div className="p-4 rounded-xl glass-panel border border-surface-border">
          <span className="text-xs font-mono text-cyber-amber font-bold block mb-1">
            Q2: Dispute, Edit & TTL
          </span>
          <p className="text-xs text-slate-300 leading-relaxed">
            Users can challenge false observations, edit text, or let Atlas TTL indexes automatically expire old memories.
          </p>
        </div>
        <div className="p-4 rounded-xl glass-panel border border-surface-border">
          <span className="text-xs font-mono text-cyber-emerald font-bold block mb-1">
            Q3: Proven Behavioral Impact
          </span>
          <p className="text-xs text-slate-300 leading-relaxed">
            Each memory tracks its <code className="text-cyber-emerald">timesApplied</code> frequency and outputs counterfactual attribution deltas.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-surface-border pb-3">
        {["all", "active", "disputed", "deprecated"].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
              filterStatus === status
                ? "bg-surface-secondary text-cyber-cyan border border-cyber-cyan/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {status.toUpperCase()} ({status === "all" ? memories.length : memories.filter((m) => m.governanceStatus === status).length})
          </button>
        ))}
      </div>

      {/* Memory Cards List */}
      <div className="space-y-4">
        {filteredMemories.length === 0 ? (
          <div className="p-8 text-center text-slate-400 font-mono text-sm border border-dashed border-slate-800 rounded-xl">
            No memories matching filter: {filterStatus.toUpperCase()}
          </div>
        ) : (
          filteredMemories.map((m) => (
            <div
              key={m.memoryId}
              className="p-5 rounded-2xl glass-panel border border-surface-border space-y-3 relative overflow-hidden"
            >
              {/* Top Row: Category, Status, Times Applied, Expiration */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyber-cyan uppercase border border-cyan-500/20 font-bold">
                    {m.category}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded font-bold uppercase ${
                      m.governanceStatus === "active"
                        ? "bg-emerald-500/10 text-cyber-emerald border border-emerald-500/30"
                        : m.governanceStatus === "disputed"
                        ? "bg-amber-500/10 text-cyber-amber border border-amber-500/30"
                        : "bg-rose-500/10 text-cyber-rose border border-rose-500/30"
                    }`}
                  >
                    {m.governanceStatus}
                  </span>
                  <span className="text-slate-500">ID: {m.memoryId}</span>
                </div>

                <div className="flex items-center gap-3 text-slate-400">
                  <span>Applied: <strong>{m.timesApplied}x</strong></span>
                  {m.expiresAt && (
                    <span className="flex items-center gap-1 text-[11px]">
                      <Clock className="w-3 h-3 text-slate-500" />
                      Expires: {new Date(m.expiresAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>

              {/* Observation Content */}
              <p className="text-sm font-medium text-slate-100 leading-relaxed">
                "{m.observation}"
              </p>

              {/* Dispute Reason if present */}
              {m.disputeReason && (
                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-cyber-amber flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span><strong>Dispute Reason:</strong> {m.disputeReason}</span>
                </div>
              )}

              {/* Bottom Row: Actions & Audit Trail toggle */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-surface-border text-xs">
                <button
                  onClick={() =>
                    setExpandedMemoryId(
                      expandedMemoryId === m.memoryId ? null : m.memoryId
                    )
                  }
                  className="text-slate-400 hover:text-white flex items-center gap-1 font-mono"
                >
                  <History className="w-3.5 h-3.5 text-cyber-cyan" />
                  Audit Trail ({m.auditTrail?.length || 0} events)
                  {expandedMemoryId === m.memoryId ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>

                {/* Governance Action Buttons */}
                <div className="flex items-center gap-2">
                  {m.governanceStatus === "active" && (
                    <>
                      <button
                        onClick={() => {
                          setEditingMemory(m);
                          setNewObservation(m.observation);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-surface-secondary border border-surface-border hover:bg-surface-hover text-slate-200 flex items-center gap-1"
                      >
                        <Edit3 className="w-3 h-3 text-cyber-cyan" />
                        Edit
                      </button>

                      <button
                        onClick={() => {
                          setDisputingMemory(m);
                          setDisputeReason("");
                        }}
                        className="px-2.5 py-1 rounded-lg bg-surface-secondary border border-surface-border hover:bg-surface-hover text-cyber-amber flex items-center gap-1"
                      >
                        <AlertTriangle className="w-3 h-3" />
                        Dispute
                      </button>

                      <button
                        onClick={() => handleDeprecate(m.memoryId)}
                        className="px-2.5 py-1 rounded-lg bg-surface-secondary border border-surface-border hover:bg-surface-hover text-slate-400 hover:text-white"
                      >
                        Deprecate
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => handlePurge(m.memoryId)}
                    className="px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-cyber-rose hover:bg-rose-500/20 flex items-center gap-1"
                    title="Right to be forgotten"
                  >
                    <Trash2 className="w-3 h-3" />
                    Purge
                  </button>
                </div>
              </div>

              {/* Expanded Audit Trail */}
              {expandedMemoryId === m.memoryId && (
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2 mt-2 font-mono text-xs">
                  <span className="text-slate-400 font-bold block mb-1">
                    Immutable Provenance & Governance Log:
                  </span>
                  <div className="space-y-1.5 divide-y divide-slate-800">
                    {m.auditTrail?.map((audit, idx) => (
                      <div key={idx} className="pt-1.5 first:pt-0 flex flex-col gap-0.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-cyber-cyan font-bold uppercase">
                            [{audit.action}] by {audit.actor}
                          </span>
                          <span className="text-slate-500">
                            {new Date(audit.timestamp).toLocaleString()}
                          </span>
                        </div>
                        {audit.reason && (
                          <span className="text-slate-300 text-[11px]">
                            &rarr; {audit.reason}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Dispute Modal */}
      {disputingMemory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-surface border border-surface-border p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-cyber-amber" />
              Dispute Memory Observation
            </h3>
            <p className="text-xs text-slate-300 font-mono">
              "{disputingMemory.observation}"
            </p>
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">
                Why is this memory inaccurate? (e.g. "I was referencing whiteboard notes")
              </label>
              <textarea
                rows={3}
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                placeholder="Enter justification..."
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-surface-border text-xs text-white focus:outline-none focus:border-cyber-amber"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDisputingMemory(null)}
                className="px-4 py-2 rounded-lg bg-surface-secondary text-xs text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleDispute}
                disabled={!disputeReason}
                className="px-4 py-2 rounded-lg bg-cyber-amber text-slate-950 font-bold text-xs disabled:opacity-50"
              >
                Submit Dispute
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingMemory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-surface border border-surface-border p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-cyber-cyan" />
              Edit Governed Observation
            </h3>
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">
                Corrected Observation Text:
              </label>
              <textarea
                rows={3}
                value={newObservation}
                onChange={(e) => setNewObservation(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-surface-border text-xs text-white focus:outline-none focus:border-cyber-cyan"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">
                Audit Reason:
              </label>
              <input
                type="text"
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                placeholder="e.g. Corrected specific speech pattern observation"
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-surface-border text-xs text-white focus:outline-none focus:border-cyber-cyan"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingMemory(null)}
                className="px-4 py-2 rounded-lg bg-surface-secondary text-xs text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleEdit}
                disabled={!newObservation}
                className="px-4 py-2 rounded-lg bg-cyber-cyan text-slate-950 font-bold text-xs disabled:opacity-50"
              >
                Save Correction
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

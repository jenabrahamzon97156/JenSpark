"use client";

// components/fitness/FitnessTipsPanel.tsx

import { useState } from "react";
import { FitnessTip } from "@/lib/types";

export default function FitnessTipsPanel({
  tips,
  onAdd,
  onUpdate,
  onDelete,
  onClose,
}: {
  tips: FitnessTip[];
  onAdd: (content: string) => void;
  onUpdate: (id: string, content: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const [newTip, setNewTip] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-[#1D2027]">Fitness Tips</p>
        <button onClick={onClose} className="text-[#9CA3AF] text-sm">
          {"\u00d7"}
        </button>
      </div>

      <div className="flex flex-col gap-2 mb-3">
        {tips.length === 0 && <p className="text-xs text-[#6B7280] text-center py-2">No tips saved yet.</p>}
        {tips.map((t) =>
          editingId === t.id ? (
            <div key={t.id} className="flex flex-col gap-1.5">
              <textarea
                autoFocus
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                rows={2}
                className="bg-[#F7F8FA] border border-[#E5E7EB] rounded-md px-3 py-2 text-sm text-[#1D2027] focus:outline-none focus:border-[#0D9488]"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (!editValue.trim()) return;
                    onUpdate(t.id, editValue.trim());
                    setEditingId(null);
                  }}
                  className="flex-1 rounded-md bg-[#0D9488] text-white text-xs font-medium py-1.5"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="px-3 rounded-md border border-[#E5E7EB] text-xs text-[#6B7280]"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div key={t.id} className="flex items-start justify-between rounded-md bg-[#F7F8FA] px-3 py-2 gap-2">
              <p className="text-sm text-[#1D2027] whitespace-pre-wrap">{t.content}</p>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => {
                    setEditingId(t.id);
                    setEditValue(t.content);
                  }}
                  className="text-xs text-[#0D9488] font-medium"
                >
                  Edit
                </button>
                <button onClick={() => onDelete(t.id)} className="text-xs text-[#9CA3AF] hover:text-[#DC2626]">
                  {"\u00d7"}
                </button>
              </div>
            </div>
          )
        )}
      </div>

      <div className="flex gap-2">
        <textarea
          value={newTip}
          onChange={(e) => setNewTip(e.target.value)}
          placeholder="Add a tip or note..."
          rows={2}
          className="flex-1 bg-[#F7F8FA] border border-[#E5E7EB] rounded-md px-3 py-2 text-sm text-[#1D2027] focus:outline-none focus:border-[#0D9488]"
        />
      </div>
      <button
        onClick={() => {
          if (!newTip.trim()) return;
          onAdd(newTip.trim());
          setNewTip("");
        }}
        className="w-full mt-2 rounded-md bg-[#0D9488] text-white text-sm font-medium py-2"
      >
        Add tip
      </button>
    </div>
  );
}

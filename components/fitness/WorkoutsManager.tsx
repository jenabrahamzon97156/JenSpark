"use client";

// components/fitness/WorkoutsManager.tsx

import { useState } from "react";
import { CATEGORY_LABELS, DEFAULT_TYPES } from "@/lib/fitnessStore";
import { FitnessCategory, WorkoutTemplate } from "@/lib/types";

const CATEGORIES: FitnessCategory[] = ["cardio", "weightlifting", "yoga", "swimming", "stretching"];

export default function WorkoutsManager({
  workouts,
  onCreate,
  onDelete,
  onLog,
  onClose,
}: {
  workouts: WorkoutTemplate[];
  onCreate: (name: string, items: { category: FitnessCategory; typeName: string }[]) => void;
  onDelete: (id: string) => void;
  onLog: (workout: WorkoutTemplate) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [items, setItems] = useState<{ category: FitnessCategory; typeName: string }[]>([]);
  const [category, setCategory] = useState<FitnessCategory>("weightlifting");
  const [typeName, setTypeName] = useState(DEFAULT_TYPES.weightlifting[0]);

  const addItem = () => {
    if (!typeName) return;
    setItems((prev) => [...prev, { category, typeName }]);
  };

  const save = () => {
    if (!name.trim() || items.length === 0) return;
    onCreate(name.trim(), items);
    setName("");
    setItems([]);
  };

  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-[#1D2027]">Workouts</p>
        <button onClick={onClose} className="text-[#9CA3AF] text-sm">
          {"\u00d7"}
        </button>
      </div>

      <input
        placeholder="Workout name, e.g. 'Day 1: Full Body'"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full mb-2 bg-[#F7F8FA] border border-[#E5E7EB] rounded-md px-3 py-2 text-sm text-[#1D2027] focus:outline-none focus:border-[#0D9488]"
      />

      <div className="flex gap-1.5 mb-2 overflow-x-auto">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => {
              setCategory(c);
              setTypeName(DEFAULT_TYPES[c][0]);
            }}
            className={`shrink-0 text-xs px-2.5 py-1 rounded-full border ${
              category === c ? "bg-[#0D9488] text-white border-[#0D9488]" : "border-[#E5E7EB] text-[#6B7280]"
            }`}
          >
            {CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      <div className="flex gap-2 mb-3">
        <select
          value={typeName}
          onChange={(e) => setTypeName(e.target.value)}
          className="flex-1 bg-[#F7F8FA] border border-[#E5E7EB] rounded-md px-3 py-2 text-sm text-[#1D2027]"
        >
          {DEFAULT_TYPES[category].map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <button onClick={addItem} className="px-4 rounded-md bg-[#1D2027] text-white text-sm font-medium">
          Add
        </button>
      </div>

      {items.length > 0 && (
        <div className="flex flex-col gap-1.5 mb-3">
          {items.map((it, i) => (
            <div key={i} className="flex items-center justify-between text-sm rounded-md bg-[#F7F8FA] px-3 py-1.5">
              <span className="text-[#1D2027]">
                {it.typeName} <span className="text-[#9CA3AF] text-xs">({CATEGORY_LABELS[it.category]})</span>
              </span>
              <button
                onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}
                className="text-[#9CA3AF] hover:text-[#DC2626] text-xs"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      <button onClick={save} className="w-full rounded-md bg-[#0D9488] text-white text-sm font-medium py-2 mb-4">
        Save workout
      </button>

      {workouts.length > 0 && (
        <div className="border-t border-[#E5E7EB] pt-3">
          <p className="text-xs text-[#6B7280] mb-2">Saved workouts</p>
          <div className="flex flex-col gap-2">
            {workouts.map((w) => (
              <div key={w.id} className="flex items-center justify-between rounded-md border border-[#E5E7EB] px-3 py-2">
                <div>
                  <p className="text-sm text-[#1D2027]">{w.name}</p>
                  <p className="text-xs text-[#6B7280]">{w.items.length} exercises</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onLog(w)}
                    className="text-xs px-3 py-1 rounded-full bg-[#0D9488] text-white"
                  >
                    Log today
                  </button>
                  <button
                    onClick={() => onDelete(w.id)}
                    className="text-xs text-[#9CA3AF] hover:text-[#DC2626]"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

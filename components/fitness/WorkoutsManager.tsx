"use client";

// components/fitness/WorkoutsManager.tsx
//
// Fixed a real bug here: the weightlifting type picker used to pull from
// DEFAULT_TYPES.weightlifting, which is now an empty list since
// weightlifting moved to the managed exercise_types library. That made
// building a weightlifting workout impossible. It now pulls exercise names
// from that same library instead.

import { useEffect, useState } from "react";
import { CATEGORY_LABELS, DEFAULT_TYPES } from "@/lib/fitnessStore";
import { fetchExerciseTypes } from "@/lib/exerciseTypesStore";
import { useAuth } from "@/lib/useAuth";
import { FitnessCategory, WorkoutTemplate } from "@/lib/types";

const CATEGORIES: FitnessCategory[] = ["cardio", "weightlifting", "yoga", "swimming", "stretching"];

interface DraftItem {
  category: FitnessCategory;
  typeName: string;
}

function WorkoutForm({
  initialName,
  initialDescription,
  initialItems,
  weightliftingNames,
  saveLabel,
  onSave,
  onCancel,
}: {
  initialName: string;
  initialDescription: string;
  initialItems: DraftItem[];
  weightliftingNames: string[];
  saveLabel: string;
  onSave: (name: string, description: string, items: DraftItem[]) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [items, setItems] = useState<DraftItem[]>(initialItems);
  const [category, setCategory] = useState<FitnessCategory>("weightlifting");
  const [typeName, setTypeName] = useState(weightliftingNames[0] ?? "");

  const optionsForCategory = category === "weightlifting" ? weightliftingNames : DEFAULT_TYPES[category];

  const addItem = () => {
    if (!typeName) return;
    setItems((prev) => [...prev, { category, typeName }]);
  };

  return (
    <div className="rounded-lg border border-[#0D9488] bg-[#0D9488]/5 p-3 mb-3">
      <input
        placeholder="Workout name, e.g. 'Lifting FullBody - A'"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full mb-2 bg-white border border-[#E5E7EB] rounded-md px-3 py-2 text-sm text-[#1D2027] focus:outline-none focus:border-[#0D9488]"
      />
      <textarea
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
        className="w-full mb-2 bg-white border border-[#E5E7EB] rounded-md px-3 py-2 text-sm text-[#1D2027] focus:outline-none focus:border-[#0D9488]"
      />

      <div className="flex gap-1.5 mb-2 overflow-x-auto">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => {
              setCategory(c);
              setTypeName((c === "weightlifting" ? weightliftingNames : DEFAULT_TYPES[c])[0] ?? "");
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
        {optionsForCategory.length === 0 ? (
          <p className="flex-1 text-xs text-[#6B7280] py-2">
            {category === "weightlifting"
              ? "No exercises in your library yet \u2014 add some from Log Activity first."
              : "No types available."}
          </p>
        ) : (
          <select
            value={typeName}
            onChange={(e) => setTypeName(e.target.value)}
            className="flex-1 bg-white border border-[#E5E7EB] rounded-md px-3 py-2 text-sm text-[#1D2027]"
          >
            {optionsForCategory.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        )}
        <button
          onClick={addItem}
          disabled={!typeName}
          className="px-4 rounded-md bg-[#1D2027] text-white text-sm font-medium disabled:opacity-40"
        >
          Add
        </button>
      </div>

      {items.length > 0 && (
        <div className="flex flex-col gap-1.5 mb-3">
          {items.map((it, i) => (
            <div key={i} className="flex items-center justify-between text-sm rounded-md bg-white px-3 py-1.5">
              <span className="text-[#1D2027]">
                {i + 1}. {it.typeName} <span className="text-[#9CA3AF] text-xs">({CATEGORY_LABELS[it.category]})</span>
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

      <div className="flex gap-2">
        <button
          onClick={() => name.trim() && items.length > 0 && onSave(name.trim(), description, items)}
          className="flex-1 rounded-md bg-[#0D9488] text-white text-sm font-medium py-2"
        >
          {saveLabel}
        </button>
        <button onClick={onCancel} className="px-4 rounded-md border border-[#E5E7EB] text-sm text-[#6B7280]">
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function WorkoutsManager({
  workouts,
  onCreate,
  onUpdate,
  onArchiveToggle,
  onDelete,
  onLog,
  onClose,
}: {
  workouts: WorkoutTemplate[];
  onCreate: (name: string, description: string | null, items: DraftItem[]) => void;
  onUpdate: (id: string, name: string, description: string | null, items: DraftItem[]) => void;
  onArchiveToggle: (id: string, archived: boolean) => void;
  onDelete: (id: string) => void;
  onLog: (workout: WorkoutTemplate) => void;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const [weightliftingNames, setWeightliftingNames] = useState<string[]>([]);
  const [showNewForm, setShowNewForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [view, setView] = useState<"active" | "archived">("active");

  useEffect(() => {
    if (!user) return;
    fetchExerciseTypes(user.id).then((types) => setWeightliftingNames(types.map((t) => t.name)));
  }, [user]);

  const active = workouts.filter((w) => !w.archived);
  const archived = workouts.filter((w) => w.archived);
  const shown = view === "active" ? active : archived;

  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-[#1D2027]">Workouts</p>
        <button onClick={onClose} className="text-[#9CA3AF] text-sm">
          {"\u00d7"}
        </button>
      </div>

      <div className="flex gap-1.5 mb-3">
        <button
          onClick={() => setView("active")}
          className={`text-xs px-3 py-1.5 rounded-full border ${
            view === "active" ? "bg-[#1D2027] text-white border-[#1D2027]" : "border-[#E5E7EB] text-[#6B7280]"
          }`}
        >
          Active ({active.length})
        </button>
        <button
          onClick={() => setView("archived")}
          className={`text-xs px-3 py-1.5 rounded-full border ${
            view === "archived" ? "bg-[#1D2027] text-white border-[#1D2027]" : "border-[#E5E7EB] text-[#6B7280]"
          }`}
        >
          Archived ({archived.length})
        </button>
      </div>

      {!showNewForm ? (
        <button
          onClick={() => setShowNewForm(true)}
          className="w-full rounded-md border border-dashed border-[#D1D5DB] text-[#6B7280] text-sm py-2 mb-3 hover:border-[#0D9488] hover:text-[#0D9488]"
        >
          + New workout
        </button>
      ) : (
        <WorkoutForm
          initialName=""
          initialDescription=""
          initialItems={[]}
          weightliftingNames={weightliftingNames}
          saveLabel="Save workout"
          onCancel={() => setShowNewForm(false)}
          onSave={(name, description, items) => {
            onCreate(name, description || null, items);
            setShowNewForm(false);
          }}
        />
      )}

      <div className="flex flex-col gap-2">
        {shown.length === 0 && (
          <p className="text-xs text-[#6B7280] text-center py-3">
            {view === "active" ? "No workouts yet." : "Nothing archived."}
          </p>
        )}
        {shown.map((w) =>
          editingId === w.id ? (
            <WorkoutForm
              key={w.id}
              initialName={w.name}
              initialDescription={w.description ?? ""}
              initialItems={w.items.map((it) => ({ category: it.category, typeName: it.typeName }))}
              weightliftingNames={weightliftingNames}
              saveLabel="Save changes"
              onCancel={() => setEditingId(null)}
              onSave={(name, description, items) => {
                onUpdate(w.id, name, description || null, items);
                setEditingId(null);
              }}
            />
          ) : (
            <div key={w.id} className="rounded-md border border-[#E5E7EB] px-3 py-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#1D2027]">{w.name}</p>
                  {w.description && <p className="text-xs text-[#6B7280] mt-0.5">{w.description}</p>}
                  <p className="text-xs text-[#9CA3AF] mt-0.5">
                    {w.items.map((it) => it.typeName).join(", ")}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 mt-2">
                {view === "active" && (
                  <button onClick={() => onLog(w)} className="text-xs px-3 py-1 rounded-full bg-[#0D9488] text-white">
                    Log today
                  </button>
                )}
                <button onClick={() => setEditingId(w.id)} className="text-xs text-[#0D9488] font-medium">
                  Edit
                </button>
                <button
                  onClick={() => onArchiveToggle(w.id, view === "active")}
                  className="text-xs text-[#6B7280]"
                >
                  {view === "active" ? "Archive" : "Unarchive"}
                </button>
                <button onClick={() => onDelete(w.id)} className="text-xs text-[#9CA3AF] hover:text-[#DC2626]">
                  Delete
                </button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}

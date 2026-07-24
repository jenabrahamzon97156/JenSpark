"use client";

// components/fitness/LogActivityPanel.tsx
//
// Weightlifting exercises come from a real, editable library (exercise_types)
// instead of free-text — this replaces the old inline "+New" text field,
// which had no confirm button and silently fell back to whatever type was
// already selected if you didn't press Enter. Other categories still use
// the lighter free-text + discovered-names pattern.

import { useEffect, useState } from "react";
import { DistanceUnit, ExerciseType, FitnessCategory } from "@/lib/types";
import { CATEGORY_LABELS, DEFAULT_TYPES, fetchCustomTypeNames } from "@/lib/fitnessStore";
import { createExerciseType, deleteExerciseType, fetchExerciseTypes, importYmcaCard, updateExerciseType } from "@/lib/exerciseTypesStore";
import { fetchSettings } from "@/lib/settingsStore";
import { useAuth } from "@/lib/useAuth";

const CATEGORIES: FitnessCategory[] = ["cardio", "weightlifting", "yoga", "swimming", "stretching"];

export interface LogActivityInput {
  category: FitnessCategory;
  typeName: string;
  distance: number | null;
  distanceUnit: DistanceUnit;
  durationMinutes: number | null;
  seatNumber: string | null;
  settingTwo: string | null;
  settingThree: string | null;
  notes: string | null;
  exerciseTypeId: string | null;
  caloriesBurned: number | null;
}

const BLANK_EXERCISE = { name: "", seatNumber: "", settingTwo: "", settingThree: "", notes: "" };

function ExerciseForm({
  initial,
  onSave,
  onCancel,
  saveLabel,
}: {
  initial: typeof BLANK_EXERCISE;
  onSave: (values: typeof BLANK_EXERCISE) => void;
  onCancel: () => void;
  saveLabel: string;
}) {
  const [values, setValues] = useState(initial);
  return (
    <div className="rounded-lg border border-[#0D9488] bg-[#0D9488]/5 p-3">
      <input
        autoFocus
        value={values.name}
        onChange={(e) => setValues({ ...values, name: e.target.value })}
        placeholder="Name"
        className="w-full mb-2 bg-white border border-[#E5E7EB] rounded-md px-3 py-2 text-sm text-[#1D2027] focus:outline-none focus:border-[#0D9488]"
      />
      <div className="grid grid-cols-2 gap-2 mb-2">
        <input
          value={values.seatNumber}
          onChange={(e) => setValues({ ...values, seatNumber: e.target.value })}
          placeholder="Seat"
          className="bg-white border border-[#E5E7EB] rounded-md px-3 py-2 text-sm text-[#1D2027] focus:outline-none focus:border-[#0D9488]"
        />
        <input
          value={values.settingTwo}
          onChange={(e) => setValues({ ...values, settingTwo: e.target.value })}
          placeholder="Setting #2"
          className="bg-white border border-[#E5E7EB] rounded-md px-3 py-2 text-sm text-[#1D2027] focus:outline-none focus:border-[#0D9488]"
        />
      </div>
      <input
        value={values.settingThree}
        onChange={(e) => setValues({ ...values, settingThree: e.target.value })}
        placeholder="Setting #3"
        className="w-full mb-2 bg-white border border-[#E5E7EB] rounded-md px-3 py-2 text-sm text-[#1D2027] focus:outline-none focus:border-[#0D9488]"
      />
      <textarea
        value={values.notes}
        onChange={(e) => setValues({ ...values, notes: e.target.value })}
        placeholder="Notes"
        rows={2}
        className="w-full mb-2 bg-white border border-[#E5E7EB] rounded-md px-3 py-2 text-sm text-[#1D2027] focus:outline-none focus:border-[#0D9488]"
      />
      <div className="flex gap-2">
        <button
          onClick={() => values.name.trim() && onSave(values)}
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

export default function LogActivityPanel({
  onLog,
  onClose,
}: {
  onLog: (input: LogActivityInput) => void;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const [category, setCategory] = useState<FitnessCategory>("weightlifting");

  // Non-weightlifting: free-text types
  const [types, setTypes] = useState<string[]>([]);
  const [typeName, setTypeName] = useState("");
  const [addingType, setAddingType] = useState(false);
  const [newType, setNewType] = useState("");

  // Weightlifting: managed library
  const [library, setLibrary] = useState<ExerciseType[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<ExerciseType | null>(null);
  const [showNewExerciseForm, setShowNewExerciseForm] = useState(false);
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [manageMode, setManageMode] = useState(false);

  const [distance, setDistance] = useState("");
  const [distanceUnit, setDistanceUnit] = useState<DistanceUnit>("mi");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [notes, setNotes] = useState("");
  const [caloriesBurned, setCaloriesBurned] = useState("");

  useEffect(() => {
    if (!user) return;
    fetchSettings(user.id).then((s) => setDistanceUnit(s.distanceUnitDefault));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setDistance("");
    setDurationMinutes("");
    setNotes("");
    setCaloriesBurned("");
    setSelectedExercise(null);
    setShowNewExerciseForm(false);
    setManageMode(false);

    if (category === "weightlifting") {
      fetchExerciseTypes(user.id).then((lib) => {
        setLibrary(lib);
        setSelectedExercise(lib[0] ?? null);
      });
    } else {
      fetchCustomTypeNames(user.id, category).then((custom) => {
        const merged = Array.from(new Set([...DEFAULT_TYPES[category], ...custom]));
        setTypes(merged);
        setTypeName(merged[0] ?? "");
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, user]);

  const submit = () => {
    if (category === "weightlifting") {
      if (!selectedExercise) return;
      onLog({
        category,
        typeName: selectedExercise.name,
        distance: null,
        distanceUnit,
        durationMinutes: null,
        seatNumber: selectedExercise.seatNumber,
        settingTwo: selectedExercise.settingTwo,
        settingThree: selectedExercise.settingThree,
        notes: selectedExercise.notes,
        exerciseTypeId: selectedExercise.id,
        caloriesBurned: Number(caloriesBurned) || null,
      });
      return;
    }
    if (!typeName) return;
    onLog({
      category,
      typeName,
      distance: category === "cardio" || category === "swimming" ? Number(distance) || null : null,
      distanceUnit,
      durationMinutes: Number(durationMinutes) || null,
      seatNumber: null,
      settingTwo: null,
      settingThree: null,
      notes: notes || null,
      exerciseTypeId: null,
      caloriesBurned: Number(caloriesBurned) || null,
    });
  };

  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-[#1D2027]">Log activity</p>
        <button onClick={onClose} className="text-[#9CA3AF] text-sm">
          {"\u00d7"}
        </button>
      </div>

      <div className="flex gap-1.5 mb-3 overflow-x-auto">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`shrink-0 text-xs px-3 py-1.5 rounded-full border ${
              category === c ? "bg-[#0D9488] text-white border-[#0D9488]" : "border-[#E5E7EB] text-[#6B7280]"
            }`}
          >
            {CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      {category === "weightlifting" ? (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] text-[#6B7280]">Exercise</p>
            <button onClick={() => setManageMode((m) => !m)} className="text-[10px] text-[#0D9488] font-medium">
              {manageMode ? "Done managing" : "Manage exercises"}
            </button>
          </div>

          {!manageMode ? (
            <div className="flex flex-wrap gap-1.5">
              {library.map((ex) => (
                <button
                  key={ex.id}
                  onClick={() => setSelectedExercise(ex)}
                  className={`text-xs px-2.5 py-1 rounded-full border ${
                    selectedExercise?.id === ex.id
                      ? "bg-[#1D2027] text-white border-[#1D2027]"
                      : "border-[#E5E7EB] text-[#6B7280]"
                  }`}
                >
                  {ex.name}
                </button>
              ))}
              {!showNewExerciseForm && (
                <button
                  onClick={() => setShowNewExerciseForm(true)}
                  className="text-xs px-2.5 py-1 rounded-full border border-dashed border-[#D1D5DB] text-[#6B7280]"
                >
                  + New
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {library.map((ex) =>
                editingExerciseId === ex.id ? (
                  <ExerciseForm
                    key={ex.id}
                    initial={{
                      name: ex.name,
                      seatNumber: ex.seatNumber ?? "",
                      settingTwo: ex.settingTwo ?? "",
                      settingThree: ex.settingThree ?? "",
                      notes: ex.notes ?? "",
                    }}
                    saveLabel="Save changes"
                    onCancel={() => setEditingExerciseId(null)}
                    onSave={async (v) => {
                      if (!user) return;
                      await updateExerciseType(ex.id, {
                        name: v.name.trim(),
                        seatNumber: v.seatNumber || null,
                        settingTwo: v.settingTwo || null,
                        settingThree: v.settingThree || null,
                        notes: v.notes || null,
                      });
                      const updated = await fetchExerciseTypes(user.id);
                      setLibrary(updated);
                      setEditingExerciseId(null);
                    }}
                  />
                ) : (
                  <div key={ex.id} className="flex items-center justify-between rounded-md border border-[#E5E7EB] px-3 py-2">
                    <div>
                      <p className="text-sm text-[#1D2027]">{ex.name}</p>
                      {(ex.seatNumber || ex.settingTwo) && (
                        <p className="text-xs text-[#6B7280]">
                          {ex.seatNumber && `Seat ${ex.seatNumber}`}
                          {ex.seatNumber && ex.settingTwo && " \u00b7 "}
                          {ex.settingTwo}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setEditingExerciseId(ex.id)} className="text-xs text-[#0D9488] font-medium">
                        Edit
                      </button>
                      <button
                        onClick={async () => {
                          setLibrary((prev) => prev.filter((x) => x.id !== ex.id));
                          if (selectedExercise?.id === ex.id) setSelectedExercise(null);
                          await deleteExerciseType(ex.id);
                        }}
                        className="text-xs text-[#9CA3AF] hover:text-[#DC2626]"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          )}

          {showNewExerciseForm && (
            <div className="mt-2">
              <ExerciseForm
                initial={BLANK_EXERCISE}
                saveLabel="Add New Option"
                onCancel={() => setShowNewExerciseForm(false)}
                onSave={async (v) => {
                  if (!user) return;
                  const created = await createExerciseType(user.id, {
                    name: v.name.trim(),
                    seatNumber: v.seatNumber || null,
                    settingTwo: v.settingTwo || null,
                    settingThree: v.settingThree || null,
                    notes: v.notes || null,
                  });
                  if (created) {
                    setLibrary((prev) => [...prev, created]);
                    setSelectedExercise(created);
                  }
                  setShowNewExerciseForm(false);
                }}
              />
            </div>
          )}

          {library.length === 0 && !showNewExerciseForm && (
            <div className="mt-2">
              <p className="text-xs text-[#6B7280] mb-2">
                No exercises yet — tap + New to add your first one, or import your YMCA card.
              </p>
              <button
                onClick={async () => {
                  if (!user) return;
                  const imported = await importYmcaCard(user.id);
                  setLibrary(imported);
                  setSelectedExercise(imported[0] ?? null);
                }}
                className="text-xs px-3 py-1.5 rounded-full border border-[#0D9488] text-[#0D9488]"
              >
                Import YMCA workout card
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {types.map((t) => (
            <button
              key={t}
              onClick={() => setTypeName(t)}
              className={`text-xs px-2.5 py-1 rounded-full border ${
                typeName === t ? "bg-[#1D2027] text-white border-[#1D2027]" : "border-[#E5E7EB] text-[#6B7280]"
              }`}
            >
              {t}
            </button>
          ))}
          {addingType ? (
            <div className="flex items-center gap-1">
              <input
                autoFocus
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newType.trim()) {
                    setTypes((prev) => [...prev, newType.trim()]);
                    setTypeName(newType.trim());
                    setNewType("");
                    setAddingType(false);
                  }
                }}
                placeholder="New type"
                className="text-xs px-2 py-1 rounded-full border border-[#E5E7EB] w-24"
              />
              <button
                onClick={() => {
                  if (!newType.trim()) return;
                  setTypes((prev) => [...prev, newType.trim()]);
                  setTypeName(newType.trim());
                  setNewType("");
                  setAddingType(false);
                }}
                className="text-xs px-2 py-1 rounded-full bg-[#0D9488] text-white"
              >
                Add
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAddingType(true)}
              className="text-xs px-2.5 py-1 rounded-full border border-dashed border-[#D1D5DB] text-[#6B7280]"
            >
              + New
            </button>
          )}
        </div>
      )}

      {!manageMode && (
        <div className="flex flex-col gap-2 mb-3">
          {(category === "cardio" || category === "swimming") && (
            <div className="grid grid-cols-2 gap-2">
              <div className="flex gap-1">
                <input
                  placeholder="Distance"
                  type="number"
                  value={distance}
                  onChange={(e) => setDistance(e.target.value)}
                  className="flex-1 min-w-0 bg-[#F7F8FA] border border-[#E5E7EB] rounded-md px-3 py-2 text-sm text-[#1D2027] focus:outline-none focus:border-[#0D9488]"
                />
                {(["mi", "km"] as DistanceUnit[]).map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setDistanceUnit(u)}
                    className={`px-2.5 rounded-md border text-xs ${
                      distanceUnit === u ? "bg-[#1D2027] text-white border-[#1D2027]" : "border-[#E5E7EB] text-[#6B7280]"
                    }`}
                  >
                    {u}
                  </button>
                ))}
              </div>
              <input
                placeholder="Total time (min)"
                type="number"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                className="bg-[#F7F8FA] border border-[#E5E7EB] rounded-md px-3 py-2 text-sm text-[#1D2027] focus:outline-none focus:border-[#0D9488]"
              />
            </div>
          )}
          {(category === "yoga" || category === "stretching") && (
            <input
              placeholder="Duration (min)"
              type="number"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              className="bg-[#F7F8FA] border border-[#E5E7EB] rounded-md px-3 py-2 text-sm text-[#1D2027] focus:outline-none focus:border-[#0D9488]"
            />
          )}
          {category !== "weightlifting" && (
            <textarea
              placeholder="Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="bg-[#F7F8FA] border border-[#E5E7EB] rounded-md px-3 py-2 text-sm text-[#1D2027] focus:outline-none focus:border-[#0D9488]"
            />
          )}
          <input
            placeholder="Calories burned (optional)"
            type="number"
            value={caloriesBurned}
            onChange={(e) => setCaloriesBurned(e.target.value)}
            className="bg-[#F7F8FA] border border-[#E5E7EB] rounded-md px-3 py-2 text-sm text-[#1D2027] focus:outline-none focus:border-[#0D9488]"
          />

          <button onClick={submit} className="w-full rounded-md bg-[#0D9488] text-white text-sm font-medium py-2">
            {category === "weightlifting" ? "Add exercise" : "Log activity"}
          </button>
        </div>
      )}
    </div>
  );
}

"use client";

// components/fitness/LogActivityPanel.tsx

import { useEffect, useState } from "react";
import { DistanceUnit, FitnessCategory } from "@/lib/types";
import { CATEGORY_LABELS, DEFAULT_TYPES, fetchCustomTypeNames, fetchLastSettingsForType } from "@/lib/fitnessStore";
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
  machineSettings: string | null;
  notes: string | null;
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
  const [types, setTypes] = useState<string[]>(DEFAULT_TYPES.weightlifting);
  const [typeName, setTypeName] = useState(DEFAULT_TYPES.weightlifting[0]);
  const [addingType, setAddingType] = useState(false);
  const [newType, setNewType] = useState("");

  const [distance, setDistance] = useState("");
  const [distanceUnit, setDistanceUnit] = useState<DistanceUnit>("mi");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [seatNumber, setSeatNumber] = useState("");
  const [machineSettings, setMachineSettings] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!user) return;
    fetchSettings(user.id).then((s) => setDistanceUnit(s.distanceUnitDefault));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchCustomTypeNames(user.id, category).then((custom) => {
      const merged = Array.from(new Set([...DEFAULT_TYPES[category], ...custom]));
      setTypes(merged);
      setTypeName(merged[0]);
    });
    setDistance("");
    setDurationMinutes("");
    setSeatNumber("");
    setMachineSettings("");
    setNotes("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, user]);

  useEffect(() => {
    if (!user || category !== "weightlifting" || !typeName) return;
    fetchLastSettingsForType(user.id, typeName).then((prev) => {
      if (prev) {
        setSeatNumber(prev.seatNumber ?? "");
        setMachineSettings(prev.machineSettings ?? "");
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeName, category, user]);

  const submit = () => {
    if (!typeName) return;
    onLog({
      category,
      typeName,
      distance: category === "cardio" || category === "swimming" ? Number(distance) || null : null,
      distanceUnit,
      durationMinutes: category !== "weightlifting" ? Number(durationMinutes) || null : null,
      seatNumber: category === "weightlifting" ? seatNumber || null : null,
      machineSettings: category === "weightlifting" ? machineSettings || null : null,
      notes: notes || null,
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

      {(category === "cardio" || category === "weightlifting" || category === "stretching") && (
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
        {category === "weightlifting" && (
          <div className="grid grid-cols-2 gap-2">
            <input
              placeholder="Seat number"
              value={seatNumber}
              onChange={(e) => setSeatNumber(e.target.value)}
              className="bg-[#F7F8FA] border border-[#E5E7EB] rounded-md px-3 py-2 text-sm text-[#1D2027] focus:outline-none focus:border-[#0D9488]"
            />
            <input
              placeholder="Other machine settings"
              value={machineSettings}
              onChange={(e) => setMachineSettings(e.target.value)}
              className="bg-[#F7F8FA] border border-[#E5E7EB] rounded-md px-3 py-2 text-sm text-[#1D2027] focus:outline-none focus:border-[#0D9488]"
            />
          </div>
        )}
        <textarea
          placeholder="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="bg-[#F7F8FA] border border-[#E5E7EB] rounded-md px-3 py-2 text-sm text-[#1D2027] focus:outline-none focus:border-[#0D9488]"
        />
      </div>

      <button onClick={submit} className="w-full rounded-md bg-[#0D9488] text-white text-sm font-medium py-2">
        {category === "weightlifting" ? "Add exercise" : "Log activity"}
      </button>
    </div>
  );
}

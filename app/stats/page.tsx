"use client";

// app/stats/page.tsx
//
// Weight and body measurements. The value field defaults to the last
// recorded entry of the same type/measurement so logging a small week-to-
// week change is a single edit, not starting from a blank field.

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/lib/useAuth";
import { StatEntry, StatEntryType } from "@/lib/types";
import { addStatEntry, deleteStatEntry, fetchAllStatEntries, fetchLatestValue } from "@/lib/statsStore";
import { todayDateString } from "@/lib/workoutStore";
import StatChart from "@/components/stats/StatChart";

const DEFAULT_MEASUREMENT_TYPES = ["Waist", "Chest", "Shoulders", "Hips", "Thigh", "Arm"];

function AddEntryForm({
  measurementTypes,
  onAddType,
  onSave,
}: {
  measurementTypes: string[];
  onAddType: (t: string) => void;
  onSave: (input: {
    entryType: StatEntryType;
    measurementType: string | null;
    value: number;
    unit: string;
  }) => void;
}) {
  const { user } = useAuth();
  const [entryType, setEntryType] = useState<StatEntryType>("weight");
  const [measurementType, setMeasurementType] = useState(measurementTypes[0]);
  const [value, setValue] = useState<string>("");
  const [addingType, setAddingType] = useState(false);
  const [newType, setNewType] = useState("");

  useEffect(() => {
    if (!user) return;
    fetchLatestValue(user.id, entryType, entryType === "measurement" ? measurementType : null).then(
      (v) => setValue(v != null ? String(v) : "")
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, entryType, measurementType]);

  const save = () => {
    const num = Number(value);
    if (!num || num <= 0) return;
    onSave({
      entryType,
      measurementType: entryType === "measurement" ? measurementType : null,
      value: num,
      unit: entryType === "weight" ? "lb" : "in",
    });
  };

  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
      <div className="flex gap-2 mb-3">
        {(["weight", "measurement"] as StatEntryType[]).map((t) => (
          <button
            key={t}
            onClick={() => setEntryType(t)}
            className={`text-xs px-3 py-1.5 rounded-full border capitalize ${
              entryType === t
                ? "bg-[#0D9488] text-white border-[#0D9488]"
                : "border-[#E5E7EB] text-[#6B7280]"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {entryType === "measurement" && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {measurementTypes.map((t) => (
            <button
              key={t}
              onClick={() => setMeasurementType(t)}
              className={`text-xs px-2.5 py-1 rounded-full border ${
                measurementType === t
                  ? "bg-[#1D2027] text-white border-[#1D2027]"
                  : "border-[#E5E7EB] text-[#6B7280]"
              }`}
            >
              {t}
            </button>
          ))}
          {addingType ? (
            <span className="flex items-center gap-1">
              <input
                autoFocus
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newType.trim()) {
                    onAddType(newType.trim());
                    setMeasurementType(newType.trim());
                    setNewType("");
                    setAddingType(false);
                  }
                }}
                placeholder="New type"
                className="text-xs px-2 py-1 rounded-full border border-[#E5E7EB] w-24"
              />
            </span>
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

      <div className="flex items-center gap-2 mb-3">
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="flex-1 bg-[#F7F8FA] border border-[#E5E7EB] rounded-md px-3 py-2 text-sm tabular-nums text-[#1D2027] focus:outline-none focus:border-[#0D9488]"
        />
        <span className="text-sm text-[#6B7280] w-8">{entryType === "weight" ? "lb" : "in"}</span>
      </div>

      <button onClick={save} className="w-full rounded-md bg-[#0D9488] text-white text-sm font-medium py-2">
        Save entry
      </button>
    </div>
  );
}

export default function StatsPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<StatEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [measurementTypes, setMeasurementTypes] = useState<string[]>(DEFAULT_MEASUREMENT_TYPES);
  const [filter, setFilter] = useState<string>("weight");

  useEffect(() => {
    if (!user) return;
    fetchAllStatEntries(user.id).then((data) => {
      setEntries(data);
      const customTypes = Array.from(
        new Set(data.filter((e) => e.measurementType).map((e) => e.measurementType as string))
      );
      setMeasurementTypes((prev) => Array.from(new Set([...prev, ...customTypes])));
      setLoading(false);
    });
  }, [user]);

  const filteredEntries = useMemo(() => {
    return entries
      .filter((e) => (filter === "weight" ? e.entryType === "weight" : e.measurementType === filter))
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [entries, filter]);

  const filterOptions = ["weight", ...measurementTypes];

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-[#1D2027]">Stats</h1>
          <p className="text-sm text-[#6B7280] mt-1">Weight and body measurements over time</p>
        </header>

        <div className="mb-6">
          <AddEntryForm
            measurementTypes={measurementTypes}
            onAddType={(t) => setMeasurementTypes((prev) => Array.from(new Set([...prev, t])))}
            onSave={async (input) => {
              if (!user) return;
              const created = await addStatEntry(user.id, { ...input, date: todayDateString() });
              if (created) setEntries((prev) => [created, ...prev]);
            }}
          />
        </div>

        <StatChart entries={[...filteredEntries].reverse()} unit={filteredEntries[0]?.unit ?? "lb"} />

        <div className="flex gap-1.5 mb-4 overflow-x-auto">
          {filterOptions.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`shrink-0 text-xs px-3 py-1.5 rounded-full border capitalize ${
                filter === f
                  ? "bg-[#1D2027] text-white border-[#1D2027]"
                  : "border-[#E5E7EB] text-[#6B7280]"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-[#6B7280]">Loading...</p>
        ) : filteredEntries.length === 0 ? (
          <p className="text-sm text-[#6B7280] py-4 text-center">No entries yet for this type.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {filteredEntries.map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between rounded-lg border border-[#E5E7EB] bg-white px-4 py-3"
              >
                <div>
                  <p className="text-sm tabular-nums text-[#1D2027]">
                    {e.value} {e.unit}
                  </p>
                  <p className="text-xs text-[#6B7280]">
                    {new Date(e.date + "T00:00:00").toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <button
                  onClick={async () => {
                    setEntries((prev) => prev.filter((x) => x.id !== e.id));
                    await deleteStatEntry(e.id);
                  }}
                  className="text-[#9CA3AF] hover:text-[#DC2626] text-sm px-1"
                  aria-label="Delete entry"
                >
                  {"\u00d7"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

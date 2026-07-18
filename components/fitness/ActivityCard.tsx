"use client";

// components/fitness/ActivityCard.tsx

import { useEffect, useState } from "react";
import { FitnessLogEntry } from "@/lib/types";
import { useAuth } from "@/lib/useAuth";
import { addSet, deleteSet, fetchLoggedDatesForType, fetchRecentLogsForType, updateSet } from "@/lib/fitnessStore";
import RestTimer from "@/components/dashboard/RestTimer";

const WEEK_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function startOfWeek(d: Date) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() - copy.getDay());
  copy.setHours(0, 0, 0, 0);
  return copy;
}
function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function ActivityCard({
  log,
  onDelete,
  onSetsChanged,
}: {
  log: FitnessLogEntry;
  onDelete: () => void;
  onSetsChanged: (sets: NonNullable<FitnessLogEntry["sets"]>) => void;
}) {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<FitnessLogEntry[]>([]);
  const [weekDates, setWeekDates] = useState<Set<string>>(new Set());
  const [restDuration, setRestDuration] = useState(90);
  const [resting, setResting] = useState(false);

  useEffect(() => {
    if (log.category !== "cardio" || !user) return;
    const start = startOfWeek(new Date());
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    fetchLoggedDatesForType(user.id, log.category, log.typeName, toDateStr(start), toDateStr(end)).then(
      (dates) => setWeekDates(new Set(dates))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [log.category, log.typeName, user]);

  const loadHistory = async () => {
    if (!user) return;
    const h = await fetchRecentLogsForType(user.id, log.category, log.typeName, 10);
    setHistory(h.filter((h2) => h2.id !== log.id));
    setShowHistory(true);
  };

  const sets = log.sets ?? [];

  const addNewSet = async () => {
    if (!user) return;
    const s = await addSet(user.id, log.id, sets.length + 1, null, null);
    if (s) onSetsChanged([...sets, s]);
  };

  const editSet = async (id: string, patch: { weight?: number | null; reps?: number | null }) => {
    const next = sets.map((s) => (s.id === id ? { ...s, ...patch } : s));
    onSetsChanged(next);
    const target = next.find((s) => s.id === id)!;
    await updateSet(id, target.weight, target.reps);
  };

  const removeSet = async (id: string) => {
    onSetsChanged(sets.filter((s) => s.id !== id));
    await deleteSet(id);
  };

  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white overflow-hidden">
      <button onClick={() => setExpanded((e) => !e)} className="w-full flex items-center justify-between px-4 py-3 text-left">
        <div>
          <p className="text-sm font-medium text-[#1D2027]">{log.typeName}</p>
          <p className="text-xs text-[#6B7280]">
            {log.category === "cardio" &&
              `${log.distance ?? "\u2014"} dist \u00b7 ${log.durationMinutes ?? "\u2014"} min`}
            {log.category === "weightlifting" && `${sets.length} sets`}
            {log.category === "swimming" && `${log.distance ?? "\u2014"} dist \u00b7 ${log.durationMinutes ?? "\u2014"} min`}
            {(log.category === "yoga" || log.category === "stretching") && `${log.durationMinutes ?? "\u2014"} min`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="text-[#9CA3AF] hover:text-[#DC2626] text-sm px-1"
          >
            {"\u00d7"}
          </button>
          <span className="text-xs text-[#9CA3AF]">{expanded ? "hide" : "show"}</span>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4">
          {log.category === "cardio" && (
            <div className="flex gap-1 mb-3">
              {WEEK_LABELS.map((label, i) => {
                const d = new Date(startOfWeek(new Date()));
                d.setDate(d.getDate() + i);
                const isLogged = weekDates.has(toDateStr(d));
                return (
                  <div
                    key={i}
                    className={`flex-1 h-7 rounded-md flex items-center justify-center text-[10px] ${
                      isLogged ? "bg-[#4C6EF5] text-white" : "bg-[#F1F2F4] text-[#9CA3AF]"
                    }`}
                  >
                    {label}
                  </div>
                );
              })}
            </div>
          )}

          {log.category === "weightlifting" && (
            <>
              {(log.seatNumber || log.machineSettings) && (
                <p className="text-xs text-[#6B7280] mb-2">
                  {log.seatNumber && `Seat ${log.seatNumber}`}
                  {log.seatNumber && log.machineSettings && " \u00b7 "}
                  {log.machineSettings}
                </p>
              )}
              <div className="grid grid-cols-[28px_1fr_1fr_28px] gap-2 px-1 mb-1">
                <span></span>
                <span className="text-[11px] text-[#6B7280]">weight</span>
                <span className="text-[11px] text-[#6B7280]">reps</span>
                <span></span>
              </div>
              {sets.map((s, i) => (
                <div key={s.id} className="grid grid-cols-[28px_1fr_1fr_28px] gap-2 items-center py-1">
                  <span className="text-xs font-mono text-[#6B7280] text-center">{i + 1}</span>
                  <input
                    type="number"
                    value={s.weight ?? ""}
                    onChange={(e) => editSet(s.id, { weight: e.target.value ? Number(e.target.value) : null })}
                    className="bg-[#F7F8FA] border border-[#E5E7EB] rounded-md px-2 py-1 text-sm font-mono text-[#1D2027]"
                  />
                  <input
                    type="number"
                    value={s.reps ?? ""}
                    onChange={(e) => editSet(s.id, { reps: e.target.value ? Number(e.target.value) : null })}
                    className="bg-[#F7F8FA] border border-[#E5E7EB] rounded-md px-2 py-1 text-sm font-mono text-[#1D2027]"
                  />
                  <button onClick={() => removeSet(s.id)} className="text-[#9CA3AF] hover:text-[#DC2626] text-xs">
                    {"\u00d7"}
                  </button>
                </div>
              ))}
              <button onClick={addNewSet} className="text-xs text-[#4C6EF5] font-medium mt-1 mb-3">
                + Add set
              </button>

              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-[#6B7280]">Rest timer:</span>
                {[30, 60, 90, 120].map((sec) => (
                  <button
                    key={sec}
                    onClick={() => setRestDuration(sec)}
                    className={`text-[10px] px-2 py-1 rounded-full border ${
                      restDuration === sec ? "bg-[#1D2027] text-white border-[#1D2027]" : "border-[#E5E7EB] text-[#6B7280]"
                    }`}
                  >
                    {sec}s
                  </button>
                ))}
                <button
                  onClick={() => setResting(true)}
                  className="ml-auto text-xs px-3 py-1 rounded-full bg-[#4C6EF5] text-white"
                >
                  Start
                </button>
              </div>
              {resting && (
                <div className="mt-2">
                  <RestTimer durationSeconds={restDuration} onComplete={() => setResting(false)} />
                </div>
              )}
            </>
          )}

          {log.notes && <p className="text-xs text-[#6B7280] mt-2">{log.notes}</p>}

          {!showHistory ? (
            <button onClick={loadHistory} className="text-xs text-[#4C6EF5] font-medium mt-3">
              Show history for {log.typeName}
            </button>
          ) : (
            <div className="mt-3 pt-3 border-t border-[#E5E7EB]">
              <p className="text-[11px] text-[#6B7280] mb-2">Recent history</p>
              <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
                {history.length === 0 && <p className="text-xs text-[#9CA3AF]">No earlier entries yet.</p>}
                {history.map((h) => (
                  <div key={h.id} className="flex justify-between text-xs">
                    <span className="text-[#6B7280]">
                      {new Date(h.date + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </span>
                    <span className="font-mono text-[#1D2027]">
                      {h.category === "weightlifting"
                        ? (h.sets ?? []).map((s) => `${s.weight ?? "-"}\u00d7${s.reps ?? "-"}`).join(", ")
                        : h.category === "cardio" || h.category === "swimming"
                        ? `${h.distance ?? "\u2014"} / ${h.durationMinutes ?? "\u2014"}min`
                        : `${h.durationMinutes ?? "\u2014"}min`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

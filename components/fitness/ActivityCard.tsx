"use client";

// components/fitness/ActivityCard.tsx

import { useEffect, useState } from "react";
import { FitnessLogEntry } from "@/lib/types";
import { useAuth } from "@/lib/useAuth";
import {
  addSet,
  deleteSet,
  fetchLoggedDatesForType,
  fetchRecentLogsForType,
  removeActivityImage,
  updateLogFields,
  updateSet,
  uploadActivityImage,
} from "@/lib/fitnessStore";
import { fetchSettings } from "@/lib/settingsStore";
import { dateToString as toDateStr } from "@/lib/workoutStore";
import RestTimer from "@/components/dashboard/RestTimer";

const WEEK_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function startOfWeek(d: Date) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() - copy.getDay());
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export default function ActivityCard({
  log,
  onDelete,
  onSetsChanged,
  onImageChanged,
  onFieldsChanged,
}: {
  log: FitnessLogEntry;
  onDelete: () => void;
  onSetsChanged: (sets: NonNullable<FitnessLogEntry["sets"]>) => void;
  onImageChanged: (imageUrl: string | null) => void;
  onFieldsChanged: (patch: Partial<FitnessLogEntry>) => void;
}) {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<FitnessLogEntry[]>([]);
  const [weekDates, setWeekDates] = useState<Set<string>>(new Set());
  const [restDuration, setRestDuration] = useState(60);
  const [resting, setResting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchSettings(user.id).then((s) => setRestDuration(s.restTimerDefaultSeconds));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

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

  const editSet = async (id: string, patch: { weight?: number | null; reps?: number | null; completed?: boolean }) => {
    const next = sets.map((s) => (s.id === id ? { ...s, ...patch } : s));
    onSetsChanged(next);
    await updateSet(id, patch);
  };

  const removeSet = async (id: string) => {
    onSetsChanged(sets.filter((s) => s.id !== id));
    await deleteSet(id);
  };

  const saveField = async (patch: Partial<{ seatNumber: string | null; settingTwo: string | null; settingThree: string | null; notes: string | null; caloriesBurned: number | null }>) => {
    onFieldsChanged(patch);
    await updateLogFields(log.id, patch);
  };

  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white overflow-hidden">
      <button onClick={() => setExpanded((e) => !e)} className="w-full flex items-center justify-between px-4 py-3 text-left">
        <div>
          <p className="text-sm font-medium text-[#1D2027]">{log.typeName}</p>
          <p className="text-xs text-[#6B7280]">
            {log.category === "cardio" &&
              `${log.distance ?? "\u2014"} ${log.distance != null ? log.distanceUnit : ""} \u00b7 ${log.durationMinutes ?? "\u2014"} min`}
            {log.category === "weightlifting" && `${sets.length} sets`}
            {log.category === "swimming" &&
              `${log.distance ?? "\u2014"} ${log.distance != null ? log.distanceUnit : ""} \u00b7 ${log.durationMinutes ?? "\u2014"} min`}
            {(log.category === "yoga" || log.category === "stretching") && `${log.durationMinutes ?? "\u2014"} min`}
            {log.caloriesBurned != null && ` \u00b7 ${log.caloriesBurned} kcal burned`}
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
                      isLogged ? "bg-[#0D9488] text-white" : "bg-[#F1F2F4] text-[#9CA3AF]"
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
              <div className="grid grid-cols-3 gap-1.5 mb-2">
                <input
                  value={log.seatNumber ?? ""}
                  onChange={(e) => saveField({ seatNumber: e.target.value || null })}
                  placeholder="Seat"
                  className="bg-[#F7F8FA] border border-[#E5E7EB] rounded-md px-2 py-1 text-xs text-[#1D2027]"
                />
                <input
                  value={log.settingTwo ?? ""}
                  onChange={(e) => saveField({ settingTwo: e.target.value || null })}
                  placeholder="Setting #2"
                  className="bg-[#F7F8FA] border border-[#E5E7EB] rounded-md px-2 py-1 text-xs text-[#1D2027]"
                />
                <input
                  value={log.settingThree ?? ""}
                  onChange={(e) => saveField({ settingThree: e.target.value || null })}
                  placeholder="Setting #3"
                  className="bg-[#F7F8FA] border border-[#E5E7EB] rounded-md px-2 py-1 text-xs text-[#1D2027]"
                />
              </div>
              <div className="grid grid-cols-[24px_1fr_1fr_24px_24px] gap-2 px-1 mb-1">
                <span></span>
                <span className="text-[11px] text-[#6B7280]">weight</span>
                <span className="text-[11px] text-[#6B7280]">reps</span>
                <span></span>
                <span></span>
              </div>
              {sets.map((s, i) => (
                <div key={s.id} className="grid grid-cols-[24px_1fr_1fr_24px_24px] gap-2 items-center py-1">
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
                  <button
                    onClick={() => editSet(s.id, { completed: !s.completed })}
                    aria-label={s.completed ? "Mark set incomplete" : "Mark set complete"}
                    className={`h-6 w-6 rounded-md border flex items-center justify-center text-xs ${
                      s.completed ? "bg-[#0D9488] border-[#0D9488] text-white" : "border-[#D1D5DB] text-transparent"
                    }`}
                  >
                    {"\u2713"}
                  </button>
                  <button onClick={() => removeSet(s.id)} className="text-[#9CA3AF] hover:text-[#DC2626] text-xs">
                    {"\u00d7"}
                  </button>
                </div>
              ))}
              <button onClick={addNewSet} className="text-xs text-[#0D9488] font-medium mt-1 mb-3">
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
                  className="ml-auto text-xs px-3 py-1 rounded-full bg-[#0D9488] text-white"
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

          <div className="mt-2">
            <textarea
              value={log.notes ?? ""}
              onChange={(e) => saveField({ notes: e.target.value || null })}
              placeholder="Notes"
              rows={2}
              className="w-full bg-[#F7F8FA] border border-[#E5E7EB] rounded-md px-2 py-1.5 text-xs text-[#1D2027]"
            />
          </div>

          <div className="mt-2 flex items-center gap-2">
            <label className="text-[11px] text-[#6B7280]">Calories burned</label>
            <input
              type="number"
              value={log.caloriesBurned ?? ""}
              onChange={(e) => saveField({ caloriesBurned: e.target.value ? Number(e.target.value) : null })}
              className="w-24 bg-[#F7F8FA] border border-[#E5E7EB] rounded-md px-2 py-1 text-xs font-mono text-[#1D2027]"
            />
          </div>

          <div className="mt-3">
            {log.imageUrl ? (
              <div className="relative inline-block">
                <img
                  src={log.imageUrl}
                  alt={`${log.typeName} photo`}
                  className="max-h-40 rounded-lg border border-[#E5E7EB]"
                />
                <button
                  onClick={async () => {
                    onImageChanged(null);
                    await removeActivityImage(log.id);
                  }}
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-white border border-[#E5E7EB] text-[#9CA3AF] hover:text-[#DC2626] text-xs flex items-center justify-center"
                  aria-label="Remove photo"
                >
                  {"\u00d7"}
                </button>
              </div>
            ) : (
              <label className="inline-flex items-center gap-1.5 text-xs text-[#0D9488] font-medium cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploadingImage}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file || !user) return;
                    setUploadingImage(true);
                    const url = await uploadActivityImage(user.id, log.id, file);
                    setUploadingImage(false);
                    if (url) onImageChanged(url);
                  }}
                />
                {uploadingImage ? "Uploading..." : "+ Add photo"}
              </label>
            )}
          </div>

          {!showHistory ? (
            <button onClick={loadHistory} className="text-xs text-[#0D9488] font-medium mt-3">
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
                        ? `${h.distance ?? "\u2014"}${h.distance != null ? h.distanceUnit : ""} / ${h.durationMinutes ?? "\u2014"}min`
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

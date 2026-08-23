"use client";

// app/dashboard/page.tsx (Fitness tab)
//
// Rebuilt for Phase 3: flexible category-based logging instead of a single
// fixed daily program. Logged activities render most-recent-first (not
// grouped by category) so the exercise you just logged is right at the top
// — easier to go back and forth between sets on the same exercise.

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import ActivityCard from "@/components/fitness/ActivityCard";
import LogActivityPanel, { LogActivityInput } from "@/components/fitness/LogActivityPanel";
import WorkoutsManager from "@/components/fitness/WorkoutsManager";
import FitnessTipsPanel from "@/components/fitness/FitnessTipsPanel";
import { useAuth } from "@/lib/useAuth";
import { supabase } from "@/lib/supabaseClient";
import { DistanceUnit, FitnessLogEntry, FitnessSet, FitnessTip, WorkoutTemplate } from "@/lib/types";
import { dateToString, todayDateString } from "@/lib/workoutStore";
import {
  createDefaultSets,
  createLog,
  createWorkout,
  updateWorkout,
  setWorkoutArchived,
  deleteLog,
  deleteWorkout,
  fetchLogsForDate,
  fetchWorkouts,
  logWorkoutForDate,
} from "@/lib/fitnessStore";
import { fetchSettings, saveSettings } from "@/lib/settingsStore";
import { addFitnessTip, deleteFitnessTip, fetchFitnessTips, updateFitnessTip } from "@/lib/fitnessTipsStore";

export default function FitnessPage() {
  const { user } = useAuth();
  const [date, setDate] = useState(todayDateString());
  const [logs, setLogs] = useState<FitnessLogEntry[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLogPanel, setShowLogPanel] = useState(false);
  const [showWorkouts, setShowWorkouts] = useState(false);
  const [showTips, setShowTips] = useState(false);
  const [tips, setTips] = useState<FitnessTip[]>([]);
  const [showRestSettings, setShowRestSettings] = useState(false);
  const [restDefault, setRestDefault] = useState(60);
  const [distanceUnitDefault, setDistanceUnitDefault] = useState<DistanceUnit>("mi");

  const isToday = date === todayDateString();

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([fetchLogsForDate(user.id, date), fetchWorkouts(user.id), fetchSettings(user.id)]).then(
      ([l, w, s]) => {
        setLogs(l);
        setWorkouts(w);
        setRestDefault(s.restTimerDefaultSeconds);
        setDistanceUnitDefault(s.distanceUnitDefault);
        setLoading(false);
      }
    );
  }, [user, date]);

  useEffect(() => {
    if (!user) return;
    fetchFitnessTips(user.id).then(setTips);
  }, [user]);

  const shiftDate = (delta: number) => {
    const d = new Date(date + "T00:00:00");
    d.setDate(d.getDate() + delta);
    setDate(dateToString(d));
  };

  const handleLog = async (input: LogActivityInput) => {
    if (!user) return;
    const created = await createLog(user.id, { date, workoutId: null, imageUrl: null, ...input });
    if (!created) return;
    // Weightlifting entries default to 3 sets, pre-filled from last time
    // this exercise was logged.
    if (created.category === "weightlifting") {
      created.sets = await createDefaultSets(user.id, created.id, created.typeName);
    }
    setLogs((prev) => [...prev, created]);
    setShowLogPanel(false);
  };

  const handleLogWorkout = async (workout: WorkoutTemplate) => {
    if (!user) return;
    const created = await logWorkoutForDate(user.id, workout, date);
    setLogs((prev) => [...prev, ...created]);
    setShowWorkouts(false);
    if (date !== todayDateString()) setDate(todayDateString());
  };

  // Most-recently-logged first, so whatever you just added is at the top —
  // easier to go back and forth on the same exercise across sets.
  const orderedLogs = [...logs].reverse();

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <header className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight text-[#1D2027]">Fitness</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowRestSettings((s) => !s)}
              className="text-xs text-[#0D9488] font-medium"
            >
              Settings
            </button>
            <button onClick={() => supabase.auth.signOut()} className="text-xs text-[#6B7280] hover:text-[#1D2027]">
              Sign out
            </button>
          </div>
        </header>

        {showRestSettings && (
          <div className="rounded-xl border border-[#0D9488] bg-[#0D9488]/5 p-4 mb-4">
            <p className="text-sm font-medium text-[#1D2027] mb-1">Default rest time</p>
            <p className="text-xs text-[#6B7280] mb-3">
              Used whenever you start a rest timer. You can still adjust it per set.
            </p>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {[30, 60, 90, 120].map((sec) => (
                <button
                  key={sec}
                  onClick={() => setRestDefault(sec)}
                  className={`text-xs px-3 py-1.5 rounded-full border ${
                    restDefault === sec
                      ? "bg-[#1D2027] text-white border-[#1D2027]"
                      : "border-[#E5E7EB] text-[#6B7280]"
                  }`}
                >
                  {sec < 60 ? `${sec}s` : sec === 90 ? "1.5 min" : `${sec / 60} min`}
                </button>
              ))}
              <button
                onClick={() => setRestDefault((d) => Math.max(15, d - 15))}
                className="text-xs px-2.5 py-1.5 rounded-full border border-[#E5E7EB] text-[#6B7280]"
              >
                -15s
              </button>
              <button
                onClick={() => setRestDefault((d) => d + 15)}
                className="text-xs px-2.5 py-1.5 rounded-full border border-[#E5E7EB] text-[#6B7280]"
              >
                +15s
              </button>
              <span className="text-xs font-mono text-[#1D2027] ml-1">{restDefault}s</span>
            </div>

            <p className="text-sm font-medium text-[#1D2027] mb-1">Default distance unit</p>
            <p className="text-xs text-[#6B7280] mb-2">Used for cardio and swimming. Overridable per entry.</p>
            <div className="flex gap-2 mb-3">
              {(["mi", "km"] as DistanceUnit[]).map((u) => (
                <button
                  key={u}
                  onClick={() => setDistanceUnitDefault(u)}
                  className={`text-xs px-4 py-1.5 rounded-full border ${
                    distanceUnitDefault === u
                      ? "bg-[#1D2027] text-white border-[#1D2027]"
                      : "border-[#E5E7EB] text-[#6B7280]"
                  }`}
                >
                  {u === "mi" ? "Miles" : "Kilometers"}
                </button>
              ))}
            </div>

            <button
              onClick={async () => {
                if (!user) return;
                await saveSettings(user.id, {
                  restTimerDefaultSeconds: restDefault,
                  distanceUnitDefault,
                });
                setShowRestSettings(false);
              }}
              className="mt-1 rounded-md bg-[#0D9488] text-white text-sm font-medium py-2 px-4"
            >
              Save
            </button>
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <button onClick={() => shiftDate(-1)} className="text-[#6B7280] px-2 py-1">
            {"\u2039"} Prev
          </button>
          <span className="text-sm font-medium text-[#1D2027]">
            {isToday
              ? "Today"
              : new Date(date + "T00:00:00").toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
          </span>
          <button onClick={() => shiftDate(1)} className="text-[#6B7280] px-2 py-1">
            Next {"\u203a"}
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-[#6B7280]">Loading...</p>
        ) : (
          <div className="flex flex-col gap-2 mb-4">
            {orderedLogs.length === 0 && (
              <p className="text-sm text-[#6B7280] py-3 text-center">Nothing logged for this day yet.</p>
            )}
            {orderedLogs.map((log) => (
              <ActivityCard
                key={log.id}
                log={log}
                onDelete={async () => {
                  setLogs((prev) => prev.filter((l) => l.id !== log.id));
                  await deleteLog(log.id);
                }}
                onSetsChanged={(sets: FitnessSet[]) =>
                  setLogs((prev) => prev.map((l) => (l.id === log.id ? { ...l, sets } : l)))
                }
                onImageChanged={(imageUrl: string | null) =>
                  setLogs((prev) => prev.map((l) => (l.id === log.id ? { ...l, imageUrl } : l)))
                }
                onFieldsChanged={(patch) =>
                  setLogs((prev) => prev.map((l) => (l.id === log.id ? { ...l, ...patch } : l)))
                }
              />
            ))}
          </div>
        )}

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => {
              setShowLogPanel((s) => !s);
              setShowWorkouts(false);
              setShowTips(false);
            }}
            className="flex-1 rounded-md bg-[#0D9488] text-white text-sm font-medium py-2.5"
          >
            + Log activity
          </button>
          <button
            onClick={() => {
              setShowWorkouts((s) => !s);
              setShowLogPanel(false);
              setShowTips(false);
            }}
            className="px-4 rounded-md border border-[#E5E7EB] text-sm text-[#6B7280]"
          >
            Workouts
          </button>
          <button
            onClick={() => {
              setShowTips((s) => !s);
              setShowLogPanel(false);
              setShowWorkouts(false);
            }}
            className="px-4 rounded-md border border-[#E5E7EB] text-sm text-[#6B7280]"
          >
            Tips
          </button>
        </div>

        {showLogPanel && <LogActivityPanel onLog={handleLog} onClose={() => setShowLogPanel(false)} />}

        {showTips && (
          <FitnessTipsPanel
            tips={tips}
            onClose={() => setShowTips(false)}
            onAdd={async (content) => {
              if (!user) return;
              const created = await addFitnessTip(user.id, content);
              if (created) setTips((prev) => [created, ...prev]);
            }}
            onUpdate={async (id, content) => {
              setTips((prev) => prev.map((t) => (t.id === id ? { ...t, content } : t)));
              await updateFitnessTip(id, content);
            }}
            onDelete={async (id) => {
              setTips((prev) => prev.filter((t) => t.id !== id));
              await deleteFitnessTip(id);
            }}
          />
        )}

        {showWorkouts && (
          <WorkoutsManager
            workouts={workouts}
            onClose={() => setShowWorkouts(false)}
            onCreate={async (name, description, items) => {
              if (!user) return;
              await createWorkout(user.id, name, description, items);
              setWorkouts(await fetchWorkouts(user.id));
            }}
            onUpdate={async (id, name, description, items) => {
              if (!user) return;
              await updateWorkout(user.id, id, name, description, items);
              setWorkouts(await fetchWorkouts(user.id));
            }}
            onArchiveToggle={async (id, archived) => {
              setWorkouts((prev) => prev.map((w) => (w.id === id ? { ...w, archived } : w)));
              await setWorkoutArchived(id, archived);
            }}
            onDelete={async (id) => {
              setWorkouts((prev) => prev.filter((w) => w.id !== id));
              await deleteWorkout(id);
            }}
            onLog={handleLogWorkout}
          />
        )}
      </div>
    </AppShell>
  );
}

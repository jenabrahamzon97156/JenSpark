"use client";

// app/home/page.tsx
//
// The at-a-glance landing page: today's status across every tracked area,
// a weekly rollup, and a monthly calendar showing which days had fitness,
// food, and/or custom Extras entries logged.

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/lib/useAuth";
import { supabase } from "@/lib/supabaseClient";
import { dateToString, todayDateString } from "@/lib/workoutStore";
import { fetchAllFitnessDatesInRange } from "@/lib/fitnessStore";
import { fetchFoodLoggedDatesInRange } from "@/lib/foodStore";
import { fetchExtraRecordDatesInRange } from "@/lib/extrasStore";
import { fetchActiveTasks, fetchCompletionsForDate, taskAppliesOnDate } from "@/lib/tasksStore";
import { fetchLatestValue } from "@/lib/statsStore";
import { DailyTask } from "@/lib/types";

function startOfWeek(d: Date) {
  const copy = new Date(d);
  const day = copy.getDay();
  copy.setDate(copy.getDate() - day);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export default function HomePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  const [tasksToday, setTasksToday] = useState<DailyTask[]>([]);
  const [completionsToday, setCompletionsToday] = useState<Record<string, boolean>>({});
  const [fitnessLoggedToday, setFitnessLoggedToday] = useState(false);
  const [latestWeight, setLatestWeight] = useState<number | null>(null);

  const [weekFitnessDays, setWeekFitnessDays] = useState(0);
  const [monthWorkoutDates, setMonthWorkoutDates] = useState<Set<string>>(new Set());
  const [monthFoodDates, setMonthFoodDates] = useState<Set<string>>(new Set());
  const [monthExtrasByDate, setMonthExtrasByDate] = useState<Map<string, string[]>>(new Map());
  const [monthLoading, setMonthLoading] = useState(true);

  const today = todayDateString();
  const now = new Date();

  // The month shown in the calendar — independent of "today" so browsing to
  // a past/future month never changes the status cards or week rollup above,
  // which always reflect the real current date.
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const monthLabel = calendarMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const isCurrentMonth = calendarMonth.getFullYear() === now.getFullYear() && calendarMonth.getMonth() === now.getMonth();

  const shiftMonth = (delta: number) => {
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function load() {
      const weekStart = dateToString(startOfWeek(now));

      const [tasks, completions, weekDates, fitnessToday, weight] = await Promise.all([
        fetchActiveTasks(user!.id),
        fetchCompletionsForDate(user!.id, today),
        fetchAllFitnessDatesInRange(user!.id, weekStart, today),
        fetchAllFitnessDatesInRange(user!.id, today, today),
        fetchLatestValue(user!.id, "weight", null),
      ]);

      if (cancelled) return;
      const todaysTasks = tasks.filter((t) => taskAppliesOnDate(t, today));
      setTasksToday(todaysTasks);
      setCompletionsToday(completions);
      setFitnessLoggedToday(fitnessToday.includes(today));
      setWeekFitnessDays(new Set(weekDates).size);
      setLatestWeight(weight);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, today]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function loadMonth() {
      setMonthLoading(true);
      const year = calendarMonth.getFullYear();
      const month = calendarMonth.getMonth();
      const monthStart = dateToString(new Date(year, month, 1));
      const monthEnd = dateToString(new Date(year, month + 1, 0));

      const [monthDates, monthFood, monthExtras] = await Promise.all([
        fetchAllFitnessDatesInRange(user!.id, monthStart, monthEnd),
        fetchFoodLoggedDatesInRange(user!.id, monthStart, monthEnd),
        fetchExtraRecordDatesInRange(user!.id, monthStart, monthEnd),
      ]);

      if (cancelled) return;
      setMonthWorkoutDates(new Set(monthDates));
      setMonthFoodDates(new Set(monthFood));
      const extrasMap = new Map<string, string[]>();
      for (const e of monthExtras) {
        const list = extrasMap.get(e.date) ?? [];
        if (!list.includes(e.emoji)) list.push(e.emoji);
        extrasMap.set(e.date, list);
      }
      setMonthExtrasByDate(extrasMap);
      setMonthLoading(false);
    }

    loadMonth();
    return () => {
      cancelled = true;
    };
  }, [user, calendarMonth]);

  const completedToday = tasksToday.filter((t) => completionsToday[t.id]).length;

  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const leadingBlanks = firstDay.getDay();
    const cells: { date: string | null; day: number | null }[] = [];
    for (let i = 0; i < leadingBlanks; i++) cells.push({ date: null, day: null });
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ date: dateToString(new Date(year, month, d)), day: d });
    }
    return cells;
  }, [calendarMonth]);

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <header className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#1D2027]">
              {now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
            </h1>
            <p className="text-sm text-[#6B7280] mt-1">Here's how today is going</p>
          </div>
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-xs text-[#6B7280] hover:text-[#1D2027] mt-1"
          >
            Sign out
          </button>
        </header>

        {loading ? (
          <p className="text-sm text-[#6B7280]">Loading...</p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
                <p className="text-xs text-[#6B7280] mb-1">Tasks</p>
                <p className="text-xl tabular-nums text-[#1D2027]">
                  {completedToday}/{tasksToday.length}
                </p>
                <p className="text-[11px] text-[#9CA3AF] mt-0.5">done today</p>
              </div>
              <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
                <p className="text-xs text-[#6B7280] mb-1">Fitness</p>
                <p className="text-xl tabular-nums text-[#1D2027]">{fitnessLoggedToday ? "\u2713" : "\u2014"}</p>
                <p className="text-[11px] text-[#9CA3AF] mt-0.5">
                  {fitnessLoggedToday ? "logged today" : "not yet today"}
                </p>
              </div>
              <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
                <p className="text-xs text-[#6B7280] mb-1">Weight</p>
                <p className="text-xl tabular-nums text-[#1D2027]">
                  {latestWeight != null ? latestWeight : "\u2014"}
                </p>
                <p className="text-[11px] text-[#9CA3AF] mt-0.5">
                  {latestWeight != null ? "lb, last logged" : "no entries yet"}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 mb-6">
              <p className="text-sm font-medium text-[#1D2027] mb-1">This week</p>
              <p className="text-sm text-[#6B7280]">
                Fitness logged on <span className="tabular-nums text-[#1D2027]">{weekFitnessDays}</span> day
                {weekFitnessDays === 1 ? "" : "s"} so far.
              </p>
            </div>

            <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
              <div className="flex items-center justify-between mb-1">
                <button
                  onClick={() => shiftMonth(-1)}
                  className="text-[#6B7280] px-2 py-1 text-sm"
                  aria-label="Previous month"
                >
                  {"\u2039"}
                </button>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-[#1D2027]">{monthLabel}</p>
                  {!isCurrentMonth && (
                    <button
                      onClick={() => setCalendarMonth(new Date(now.getFullYear(), now.getMonth(), 1))}
                      className="text-[10px] text-[#0D9488] font-medium"
                    >
                      Today
                    </button>
                  )}
                </div>
                <button
                  onClick={() => shiftMonth(1)}
                  className="text-[#6B7280] px-2 py-1 text-sm"
                  aria-label="Next month"
                >
                  {"\u203a"}
                </button>
              </div>
              <div className="flex items-center justify-end gap-3 text-[11px] text-[#9CA3AF] mb-3">
                <span>{"\ud83d\udcaa"} fitness</span>
                <span>{"\ud83c\udf7d\ufe0f"} food</span>
              </div>
              <div className={`grid grid-cols-7 gap-1 text-center ${monthLoading ? "opacity-50" : ""}`}>
                {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                  <div key={i} className="text-[10px] text-[#9CA3AF] pb-1">
                    {d}
                  </div>
                ))}
                {calendarDays.map((cell, i) => {
                  if (!cell.date) return <div key={i} />;
                  const hasFitness = monthWorkoutDates.has(cell.date);
                  const hasFood = monthFoodDates.has(cell.date);
                  const extrasEmoji = monthExtrasByDate.get(cell.date) ?? [];
                  const isToday = cell.date === today;
                  return (
                    <div
                      key={i}
                      className={`aspect-square rounded-md flex flex-col items-center justify-center text-[11px] ${
                        isToday ? "bg-[#0D9488]/10 ring-1 ring-[#0D9488]" : ""
                      }`}
                    >
                      <span className="text-[#1D2027]">{cell.day}</span>
                      <span className="text-[9px] leading-none flex gap-0.5">
                        {hasFitness && "\ud83d\udcaa"}
                        {hasFood && "\ud83c\udf7d"}
                        {extrasEmoji.slice(0, 2).join("")}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

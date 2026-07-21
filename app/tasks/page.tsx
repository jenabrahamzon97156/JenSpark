"use client";

// app/tasks/page.tsx
//
// One-time and recurring tasks. Completion is tracked per-date so a
// recurring task's history survives across days (needed for the archive
// view), while "once" tasks simply live and die on their one assigned date.

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/lib/useAuth";
import { DailyTask, Recurrence } from "@/lib/types";
import {
  archiveTask,
  createTask,
  fetchActiveTasks,
  fetchArchiveCompletions,
  fetchArchivedTasks,
  fetchCompletionsForDate,
  setTaskCompletion,
  taskAppliesOnDate,
} from "@/lib/tasksStore";
import { todayDateString } from "@/lib/workoutStore";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function NewTaskForm({ onCreate }: { onCreate: (input: Parameters<typeof createTask>[1]) => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [recurrence, setRecurrence] = useState<Recurrence>("once");
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);

  const toggleDay = (d: number) =>
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()));

  const submit = () => {
    if (!title.trim()) return;
    onCreate({
      title: title.trim(),
      notes,
      recurrence,
      recurrenceDays: recurrence === "weekdays" ? days : null,
      startDate: todayDateString(),
    });
    setTitle("");
    setNotes("");
    setRecurrence("once");
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-xl border border-dashed border-[#D1D5DB] text-[#6B7280] text-sm py-3 hover:border-[#0D9488] hover:text-[#0D9488] transition-colors"
      >
        + Add a task
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Task title"
        className="w-full mb-2 bg-[#F7F8FA] border border-[#E5E7EB] rounded-md px-3 py-2 text-sm text-[#1D2027] focus:outline-none focus:border-[#0D9488]"
      />
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes (optional)"
        rows={2}
        className="w-full mb-3 bg-[#F7F8FA] border border-[#E5E7EB] rounded-md px-3 py-2 text-sm text-[#1D2027] focus:outline-none focus:border-[#0D9488]"
      />

      <div className="flex gap-2 mb-3">
        {(["once", "daily", "weekdays"] as Recurrence[]).map((r) => (
          <button
            key={r}
            onClick={() => setRecurrence(r)}
            className={`text-xs px-3 py-1.5 rounded-full border ${
              recurrence === r
                ? "bg-[#0D9488] text-white border-[#0D9488]"
                : "border-[#E5E7EB] text-[#6B7280]"
            }`}
          >
            {r === "once" ? "One time" : r === "daily" ? "Every day" : "Specific days"}
          </button>
        ))}
      </div>

      {recurrence === "weekdays" && (
        <div className="flex gap-1 mb-3">
          {WEEKDAY_LABELS.map((label, i) => (
            <button
              key={i}
              onClick={() => toggleDay(i)}
              className={`w-9 h-9 rounded-full text-xs border ${
                days.includes(i)
                  ? "bg-[#0D9488] text-white border-[#0D9488]"
                  : "border-[#E5E7EB] text-[#6B7280]"
              }`}
            >
              {label[0]}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={submit}
          className="flex-1 rounded-md bg-[#0D9488] text-white text-sm font-medium py-2"
        >
          Add task
        </button>
        <button
          onClick={() => setOpen(false)}
          className="px-4 rounded-md border border-[#E5E7EB] text-sm text-[#6B7280]"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function TasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [completions, setCompletions] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"today" | "archive">("today");
  const [archivedTasks, setArchivedTasks] = useState<DailyTask[]>([]);
  const [archiveCompletions, setArchiveCompletions] = useState<
    { taskId: string; date: string; completed: boolean }[]
  >([]);
  const today = todayDateString();

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([fetchActiveTasks(user.id), fetchCompletionsForDate(user.id, today)]).then(
      ([t, c]) => {
        setTasks(t);
        setCompletions(c);
        setLoading(false);
      }
    );
  }, [user, today]);

  const loadArchive = async () => {
    if (!user) return;
    const [t, c] = await Promise.all([fetchArchivedTasks(user.id), fetchArchiveCompletions(user.id)]);
    setArchivedTasks(t);
    setArchiveCompletions(c);
    setView("archive");
  };

  const todaysTasks = useMemo(
    () => tasks.filter((t) => taskAppliesOnDate(t, today)),
    [tasks, today]
  );

  const toggle = async (taskId: string) => {
    if (!user) return;
    const next = !completions[taskId];
    setCompletions((prev) => ({ ...prev, [taskId]: next }));
    await setTaskCompletion(user.id, taskId, today, next);
  };

  const remove = async (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    await archiveTask(taskId);
  };

  const completedCount = todaysTasks.filter((t) => completions[t.id]).length;

  // Group archive completions by date, newest first.
  const archiveByDate = useMemo(() => {
    const map = new Map<string, { taskId: string; completed: boolean }[]>();
    for (const c of archiveCompletions) {
      if (!map.has(c.date)) map.set(c.date, []);
      map.get(c.date)!.push(c);
    }
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [archiveCompletions]);

  const taskTitle = (id: string) => archivedTasks.find((t) => t.id === id)?.title ?? tasks.find(t => t.id === id)?.title ?? "Deleted task";

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <header className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#1D2027]">Daily Tasks</h1>
            {view === "today" && (
              <p className="text-sm text-[#6B7280] mt-1">
                {completedCount} of {todaysTasks.length} done today
              </p>
            )}
          </div>
          {view === "today" ? (
            <button onClick={loadArchive} className="text-xs text-[#0D9488] font-medium mt-1">
              Archive
            </button>
          ) : (
            <button onClick={() => setView("today")} className="text-xs text-[#0D9488] font-medium mt-1">
              Back to today
            </button>
          )}
        </header>

        {view === "today" ? (
          <>
            {loading ? (
              <p className="text-sm text-[#6B7280]">Loading...</p>
            ) : (
              <div className="flex flex-col gap-2 mb-4">
                {todaysTasks.map((task) => {
                  const done = !!completions[task.id];
                  return (
                    <div
                      key={task.id}
                      className="flex items-start gap-3 rounded-xl border border-[#E5E7EB] bg-white p-3"
                    >
                      <button
                        onClick={() => toggle(task.id)}
                        aria-label={done ? "Mark incomplete" : "Mark complete"}
                        className={`mt-0.5 h-6 w-6 shrink-0 rounded-md border flex items-center justify-center text-sm ${
                          done
                            ? "bg-[#16A34A] border-[#16A34A] text-white"
                            : "border-[#D1D5DB] text-transparent"
                        }`}
                      >
                        {"\u2713"}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-medium ${
                            done ? "line-through text-[#9CA3AF]" : "text-[#1D2027]"
                          }`}
                        >
                          {task.title}
                        </p>
                        {task.notes && (
                          <p className={`text-xs mt-0.5 ${done ? "text-[#C4C7CC]" : "text-[#6B7280]"}`}>
                            {task.notes}
                          </p>
                        )}
                        {task.recurrence !== "once" && (
                          <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded bg-[#F1F2F4] text-[#6B7280]">
                            {task.recurrence === "daily" ? "Every day" : "Recurring"}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => remove(task.id)}
                        aria-label="Remove task"
                        className="text-[#9CA3AF] hover:text-[#DC2626] text-sm px-1"
                      >
                        {"\u00d7"}
                      </button>
                    </div>
                  );
                })}
                {!loading && todaysTasks.length === 0 && (
                  <p className="text-sm text-[#6B7280] py-4 text-center">
                    Nothing on your list for today.
                  </p>
                )}
              </div>
            )}
            <NewTaskForm
              onCreate={async (input) => {
                if (!user) return;
                const created = await createTask(user.id, input);
                if (created) setTasks((prev) => [...prev, created]);
              }}
            />
          </>
        ) : (
          <div className="flex flex-col gap-4">
            {archiveByDate.length === 0 && (
              <p className="text-sm text-[#6B7280] py-4 text-center">No history yet.</p>
            )}
            {archiveByDate.map(([date, entries]) => (
              <div key={date}>
                <p className="text-xs font-medium text-[#6B7280] mb-2">
                  {new Date(date + "T00:00:00").toLocaleDateString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
                <div className="flex flex-col gap-1.5">
                  {entries.map((e, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2"
                    >
                      <span
                        className={`h-4 w-4 rounded flex items-center justify-center text-[10px] ${
                          e.completed ? "bg-[#16A34A] text-white" : "border border-[#D1D5DB]"
                        }`}
                      >
                        {e.completed ? "\u2713" : ""}
                      </span>
                      <span
                        className={`text-sm ${
                          e.completed ? "line-through text-[#9CA3AF]" : "text-[#1D2027]"
                        }`}
                      >
                        {taskTitle(e.taskId)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

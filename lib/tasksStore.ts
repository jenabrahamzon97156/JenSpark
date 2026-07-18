// lib/tasksStore.ts

import { supabase } from "./supabaseClient";
import { DailyTask, Recurrence } from "./types";

function rowToTask(row: any): DailyTask {
  return {
    id: row.id,
    title: row.title,
    notes: row.notes,
    recurrence: row.recurrence,
    recurrenceDays: row.recurrence_days,
    startDate: row.start_date,
    archived: row.archived,
  };
}

export async function fetchActiveTasks(userId: string): Promise<DailyTask[]> {
  const { data, error } = await supabase
    .from("daily_tasks")
    .select("*")
    .eq("user_id", userId)
    .eq("archived", false)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Failed to load tasks:", error.message);
    return [];
  }
  return (data ?? []).map(rowToTask);
}

export async function fetchArchivedTasks(userId: string): Promise<DailyTask[]> {
  const { data, error } = await supabase
    .from("daily_tasks")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load archived tasks:", error.message);
    return [];
  }
  return (data ?? []).map(rowToTask);
}

export async function createTask(
  userId: string,
  input: { title: string; notes: string; recurrence: Recurrence; recurrenceDays: number[] | null; startDate: string }
): Promise<DailyTask | null> {
  const { data, error } = await supabase
    .from("daily_tasks")
    .insert({
      user_id: userId,
      title: input.title,
      notes: input.notes || null,
      recurrence: input.recurrence,
      recurrence_days: input.recurrenceDays,
      start_date: input.startDate,
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to create task:", error.message);
    return null;
  }
  return rowToTask(data);
}

export async function archiveTask(taskId: string) {
  const { error } = await supabase.from("daily_tasks").update({ archived: true }).eq("id", taskId);
  if (error) console.error("Failed to archive task:", error.message);
}

// Completions ----------------------------------------------------------------

export async function fetchCompletionsForDate(
  userId: string,
  date: string
): Promise<Record<string, boolean>> {
  const { data, error } = await supabase
    .from("task_completions")
    .select("task_id, completed")
    .eq("user_id", userId)
    .eq("date", date);

  if (error) {
    console.error("Failed to load completions:", error.message);
    return {};
  }
  const map: Record<string, boolean> = {};
  for (const row of data ?? []) map[row.task_id] = row.completed;
  return map;
}

export async function setTaskCompletion(
  userId: string,
  taskId: string,
  date: string,
  completed: boolean
) {
  const { error } = await supabase
    .from("task_completions")
    .upsert(
      { user_id: userId, task_id: taskId, date, completed },
      { onConflict: "task_id,date" }
    );
  if (error) console.error("Failed to save completion:", error.message);
}

export async function fetchArchiveCompletions(
  userId: string
): Promise<{ taskId: string; date: string; completed: boolean }[]> {
  const { data, error } = await supabase
    .from("task_completions")
    .select("task_id, date, completed")
    .eq("user_id", userId)
    .order("date", { ascending: false });

  if (error) {
    console.error("Failed to load archive completions:", error.message);
    return [];
  }
  return (data ?? []).map((r: any) => ({ taskId: r.task_id, date: r.date, completed: r.completed }));
}

// Recurrence helpers -----------------------------------------------------------

export function taskAppliesOnDate(task: DailyTask, dateStr: string): boolean {
  if (dateStr < task.startDate) return false;
  if (task.recurrence === "daily") return true;
  if (task.recurrence === "weekdays") {
    const day = new Date(dateStr + "T00:00:00").getDay();
    return (task.recurrenceDays ?? []).includes(day);
  }
  // "once" — only on its start date
  return dateStr === task.startDate;
}

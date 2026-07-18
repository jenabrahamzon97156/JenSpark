// lib/fitnessStore.ts

import { supabase } from "./supabaseClient";
import { FitnessCategory, FitnessLogEntry, FitnessSet, WorkoutTemplate } from "./types";

export const DEFAULT_TYPES: Record<FitnessCategory, string[]> = {
  cardio: ["Walking", "Running", "Zumba", "Cycling", "Elliptical"],
  weightlifting: ["Bench Press", "Squat", "Leg Press", "Pec Fly", "Lat Pulldown", "Bicep Curl"],
  yoga: ["Yoga"],
  swimming: ["Swimming"],
  stretching: ["Hamstring Stretch", "Hip Flexor Stretch", "Shoulder Stretch", "Full Body Stretch"],
};

export const CATEGORY_LABELS: Record<FitnessCategory, string> = {
  cardio: "Cardio",
  weightlifting: "Weightlifting",
  yoga: "Yoga",
  swimming: "Swimming",
  stretching: "Stretching",
};

function rowToLog(row: any): FitnessLogEntry {
  return {
    id: row.id,
    date: row.date,
    category: row.category,
    typeName: row.type_name,
    distance: row.distance != null ? Number(row.distance) : null,
    durationMinutes: row.duration_minutes != null ? Number(row.duration_minutes) : null,
    seatNumber: row.seat_number,
    machineSettings: row.machine_settings,
    notes: row.notes,
    workoutId: row.workout_id,
  };
}

function rowToSet(row: any): FitnessSet {
  return {
    id: row.id,
    setNumber: row.set_number,
    weight: row.weight != null ? Number(row.weight) : null,
    reps: row.reps != null ? Number(row.reps) : null,
  };
}

// Logs -----------------------------------------------------------------------

export async function fetchLogsForDate(userId: string, date: string): Promise<FitnessLogEntry[]> {
  const { data: logs, error } = await supabase
    .from("fitness_logs")
    .select("*")
    .eq("user_id", userId)
    .eq("date", date)
    .order("created_at", { ascending: true });
  if (error || !logs) return [];

  const weightLogIds = logs.filter((l: any) => l.category === "weightlifting").map((l: any) => l.id);
  let setsByLog: Record<string, FitnessSet[]> = {};
  if (weightLogIds.length > 0) {
    const { data: sets } = await supabase
      .from("fitness_sets")
      .select("*")
      .in("fitness_log_id", weightLogIds)
      .order("set_number", { ascending: true });
    for (const s of sets ?? []) {
      setsByLog[s.fitness_log_id] = setsByLog[s.fitness_log_id] ?? [];
      setsByLog[s.fitness_log_id].push(rowToSet(s));
    }
  }

  return logs.map((l: any) => ({ ...rowToLog(l), sets: setsByLog[l.id] ?? [] }));
}

export async function createLog(
  userId: string,
  input: Omit<FitnessLogEntry, "id" | "sets">
): Promise<FitnessLogEntry | null> {
  const { data, error } = await supabase
    .from("fitness_logs")
    .insert({
      user_id: userId,
      date: input.date,
      category: input.category,
      type_name: input.typeName,
      distance: input.distance,
      duration_minutes: input.durationMinutes,
      seat_number: input.seatNumber,
      machine_settings: input.machineSettings,
      notes: input.notes,
      workout_id: input.workoutId,
    })
    .select()
    .single();
  if (error) {
    console.error("Failed to log activity:", error.message);
    return null;
  }
  return { ...rowToLog(data), sets: [] };
}

export async function deleteLog(id: string) {
  const { error } = await supabase.from("fitness_logs").delete().eq("id", id);
  if (error) console.error("Failed to delete log:", error.message);
}

// Sets (weightlifting) --------------------------------------------------------

export async function addSet(
  userId: string,
  logId: string,
  setNumber: number,
  weight: number | null,
  reps: number | null
): Promise<FitnessSet | null> {
  const { data, error } = await supabase
    .from("fitness_sets")
    .insert({ user_id: userId, fitness_log_id: logId, set_number: setNumber, weight, reps })
    .select()
    .single();
  if (error) {
    console.error("Failed to add set:", error.message);
    return null;
  }
  return rowToSet(data);
}

export async function updateSet(id: string, weight: number | null, reps: number | null) {
  const { error } = await supabase.from("fitness_sets").update({ weight, reps }).eq("id", id);
  if (error) console.error("Failed to update set:", error.message);
}

export async function deleteSet(id: string) {
  const { error } = await supabase.from("fitness_sets").delete().eq("id", id);
  if (error) console.error("Failed to delete set:", error.message);
}

// Types & history --------------------------------------------------------------

export async function fetchCustomTypeNames(userId: string, category: FitnessCategory): Promise<string[]> {
  const { data, error } = await supabase
    .from("fitness_logs")
    .select("type_name")
    .eq("user_id", userId)
    .eq("category", category);
  if (error) return [];
  return Array.from(new Set((data ?? []).map((r: any) => r.type_name as string)));
}

// Previous machine settings for a weightlifting type, so the form can
// pre-fill seat number / notes from last time.
export async function fetchLastSettingsForType(
  userId: string,
  typeName: string
): Promise<{ seatNumber: string | null; machineSettings: string | null } | null> {
  const { data, error } = await supabase
    .from("fitness_logs")
    .select("seat_number, machine_settings")
    .eq("user_id", userId)
    .eq("category", "weightlifting")
    .eq("type_name", typeName)
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return { seatNumber: data.seat_number, machineSettings: data.machine_settings };
}

export async function fetchRecentLogsForType(
  userId: string,
  category: FitnessCategory,
  typeName: string,
  limit = 10
): Promise<FitnessLogEntry[]> {
  const { data: logs, error } = await supabase
    .from("fitness_logs")
    .select("*")
    .eq("user_id", userId)
    .eq("category", category)
    .eq("type_name", typeName)
    .order("date", { ascending: false })
    .limit(limit);
  if (error || !logs) return [];

  if (category !== "weightlifting") return logs.map(rowToLog);

  const ids = logs.map((l: any) => l.id);
  const { data: sets } = await supabase.from("fitness_sets").select("*").in("fitness_log_id", ids);
  const setsByLog: Record<string, FitnessSet[]> = {};
  for (const s of sets ?? []) {
    setsByLog[s.fitness_log_id] = setsByLog[s.fitness_log_id] ?? [];
    setsByLog[s.fitness_log_id].push(rowToSet(s));
  }
  return logs.map((l: any) => ({ ...rowToLog(l), sets: setsByLog[l.id] ?? [] }));
}

export async function fetchLoggedDatesForType(
  userId: string,
  category: FitnessCategory,
  typeName: string,
  startDate: string,
  endDate: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from("fitness_logs")
    .select("date")
    .eq("user_id", userId)
    .eq("category", category)
    .eq("type_name", typeName)
    .gte("date", startDate)
    .lte("date", endDate);
  if (error) return [];
  return Array.from(new Set((data ?? []).map((r: any) => r.date as string)));
}

export async function fetchAllFitnessDatesInRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from("fitness_logs")
    .select("date")
    .eq("user_id", userId)
    .gte("date", startDate)
    .lte("date", endDate);
  if (error) return [];
  return Array.from(new Set((data ?? []).map((r: any) => r.date as string)));
}

// Workout templates -------------------------------------------------------------

export async function fetchWorkouts(userId: string): Promise<WorkoutTemplate[]> {
  const { data: workouts, error } = await supabase
    .from("workouts")
    .select("*")
    .eq("user_id", userId)
    .order("name");
  if (error || !workouts) return [];

  const { data: items } = await supabase.from("workout_items").select("*").eq("user_id", userId);

  return workouts.map((w: any) => ({
    id: w.id,
    name: w.name,
    items: (items ?? [])
      .filter((it: any) => it.workout_id === w.id)
      .sort((a: any, b: any) => a.order_index - b.order_index)
      .map((it: any) => ({ category: it.category, typeName: it.type_name, orderIndex: it.order_index })),
  }));
}

export async function createWorkout(
  userId: string,
  name: string,
  items: { category: FitnessCategory; typeName: string }[]
) {
  const { data: workout, error } = await supabase
    .from("workouts")
    .insert({ user_id: userId, name })
    .select()
    .single();
  if (error || !workout) {
    console.error("Failed to create workout:", error?.message);
    return;
  }
  if (items.length > 0) {
    await supabase.from("workout_items").insert(
      items.map((it, i) => ({
        user_id: userId,
        workout_id: workout.id,
        category: it.category,
        type_name: it.typeName,
        order_index: i,
      }))
    );
  }
}

export async function deleteWorkout(id: string) {
  const { error } = await supabase.from("workouts").delete().eq("id", id);
  if (error) console.error("Failed to delete workout:", error.message);
}

// Logging an entire workout template creates one fitness_logs row per item
// for the given date, tagged with workout_id so they're grouped together.
export async function logWorkoutForDate(
  userId: string,
  workout: WorkoutTemplate,
  date: string
): Promise<FitnessLogEntry[]> {
  const created: FitnessLogEntry[] = [];
  for (const item of workout.items) {
    const log = await createLog(userId, {
      date,
      category: item.category,
      typeName: item.typeName,
      distance: null,
      durationMinutes: null,
      seatNumber: null,
      machineSettings: null,
      notes: null,
      workoutId: workout.id,
    });
    if (log) created.push(log);
  }
  return created;
}

// lib/fitnessStore.ts

import { supabase } from "./supabaseClient";
import { FitnessCategory, FitnessLogEntry, FitnessSet, WorkoutTemplate } from "./types";

export const DEFAULT_TYPES: Record<FitnessCategory, string[]> = {
  cardio: ["Walking", "Running", "Zumba", "Cycling", "Elliptical"],
  weightlifting: [],
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
    distanceUnit: row.distance_unit ?? "mi",
    durationMinutes: row.duration_minutes != null ? Number(row.duration_minutes) : null,
    seatNumber: row.seat_number,
    settingTwo: row.setting_2,
    settingThree: row.setting_3,
    notes: row.notes,
    workoutId: row.workout_id,
    imageUrl: row.image_url,
    exerciseTypeId: row.exercise_type_id,
    caloriesBurned: row.calories_burned != null ? Number(row.calories_burned) : null,
  };
}

function rowToSet(row: any): FitnessSet {
  return {
    id: row.id,
    setNumber: row.set_number,
    weight: row.weight != null ? Number(row.weight) : null,
    reps: row.reps != null ? Number(row.reps) : null,
    completed: !!row.completed,
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
      distance_unit: input.distanceUnit,
      duration_minutes: input.durationMinutes,
      seat_number: input.seatNumber,
      setting_2: input.settingTwo,
      setting_3: input.settingThree,
      notes: input.notes,
      workout_id: input.workoutId,
      image_url: input.imageUrl,
      exercise_type_id: input.exerciseTypeId,
      calories_burned: input.caloriesBurned,
    })
    .select()
    .single();
  if (error) {
    console.error("Failed to log activity:", error.message);
    return null;
  }
  return { ...rowToLog(data), sets: [] };
}

export async function updateLogFields(
  logId: string,
  patch: Partial<{
    seatNumber: string | null;
    settingTwo: string | null;
    settingThree: string | null;
    notes: string | null;
    caloriesBurned: number | null;
  }>
) {
  const dbPatch: Record<string, any> = {};
  if ("seatNumber" in patch) dbPatch.seat_number = patch.seatNumber;
  if ("settingTwo" in patch) dbPatch.setting_2 = patch.settingTwo;
  if ("settingThree" in patch) dbPatch.setting_3 = patch.settingThree;
  if ("notes" in patch) dbPatch.notes = patch.notes;
  if ("caloriesBurned" in patch) dbPatch.calories_burned = patch.caloriesBurned;
  const { error } = await supabase.from("fitness_logs").update(dbPatch).eq("id", logId);
  if (error) console.error("Failed to update activity:", error.message);
}

// Photo -----------------------------------------------------------------------

export async function uploadActivityImage(
  userId: string,
  logId: string,
  file: File
): Promise<string | null> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${userId}/${logId}-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage.from("activity-images").upload(path, file, {
    upsert: true,
  });
  if (uploadError) {
    console.error("Failed to upload image:", uploadError.message);
    return null;
  }

  const { data } = supabase.storage.from("activity-images").getPublicUrl(path);
  const url = data.publicUrl;

  const { error: updateError } = await supabase
    .from("fitness_logs")
    .update({ image_url: url })
    .eq("id", logId);
  if (updateError) {
    console.error("Failed to save image URL:", updateError.message);
    return null;
  }

  return url;
}

export async function removeActivityImage(logId: string) {
  const { error } = await supabase.from("fitness_logs").update({ image_url: null }).eq("id", logId);
  if (error) console.error("Failed to remove image:", error.message);
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

export async function updateSet(
  id: string,
  patch: Partial<{ weight: number | null; reps: number | null; completed: boolean }>
) {
  const { error } = await supabase.from("fitness_sets").update(patch).eq("id", id);
  if (error) console.error("Failed to update set:", error.message);
}

export async function deleteSet(id: string) {
  const { error } = await supabase.from("fitness_sets").delete().eq("id", id);
  if (error) console.error("Failed to delete set:", error.message);
}

// Default new weightlifting log entries to 3 sets, pre-filled with the
// weight/reps from the most recent previous session of the same exercise
// (all three rows get that same last-known weight/reps as a starting point).
export async function createDefaultSets(
  userId: string,
  logId: string,
  typeName: string
): Promise<FitnessSet[]> {
  const last = await fetchLastSetsForType(userId, typeName);
  const created: FitnessSet[] = [];
  for (let i = 0; i < 3; i++) {
    const prior = last[i] ?? last[last.length - 1] ?? null;
    const s = await addSet(userId, logId, i + 1, prior?.weight ?? null, prior?.reps ?? null);
    if (s) created.push(s);
  }
  return created;
}

async function fetchLastSetsForType(userId: string, typeName: string): Promise<FitnessSet[]> {
  const { data: lastLog } = await supabase
    .from("fitness_logs")
    .select("id")
    .eq("user_id", userId)
    .eq("category", "weightlifting")
    .eq("type_name", typeName)
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!lastLog) return [];
  const { data: sets } = await supabase
    .from("fitness_sets")
    .select("*")
    .eq("fitness_log_id", lastLog.id)
    .order("set_number", { ascending: true });
  return (sets ?? []).map(rowToSet);
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
    description: w.description,
    archived: !!w.archived,
    items: (items ?? [])
      .filter((it: any) => it.workout_id === w.id)
      .sort((a: any, b: any) => a.order_index - b.order_index)
      .map((it: any) => ({ category: it.category, typeName: it.type_name, orderIndex: it.order_index })),
  }));
}

async function replaceWorkoutItems(
  userId: string,
  workoutId: string,
  items: { category: FitnessCategory; typeName: string }[]
) {
  await supabase.from("workout_items").delete().eq("workout_id", workoutId);
  if (items.length > 0) {
    await supabase.from("workout_items").insert(
      items.map((it, i) => ({
        user_id: userId,
        workout_id: workoutId,
        category: it.category,
        type_name: it.typeName,
        order_index: i,
      }))
    );
  }
}

export async function createWorkout(
  userId: string,
  name: string,
  description: string | null,
  items: { category: FitnessCategory; typeName: string }[]
) {
  const { data: workout, error } = await supabase
    .from("workouts")
    .insert({ user_id: userId, name, description })
    .select()
    .single();
  if (error || !workout) {
    console.error("Failed to create workout:", error?.message);
    return;
  }
  await replaceWorkoutItems(userId, workout.id, items);
}

export async function updateWorkout(
  userId: string,
  workoutId: string,
  name: string,
  description: string | null,
  items: { category: FitnessCategory; typeName: string }[]
) {
  const { error } = await supabase.from("workouts").update({ name, description }).eq("id", workoutId);
  if (error) {
    console.error("Failed to update workout:", error.message);
    return;
  }
  await replaceWorkoutItems(userId, workoutId, items);
}

export async function setWorkoutArchived(id: string, archived: boolean) {
  const { error } = await supabase.from("workouts").update({ archived }).eq("id", id);
  if (error) console.error("Failed to update workout:", error.message);
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
      distanceUnit: "mi",
      durationMinutes: null,
      seatNumber: null,
      settingTwo: null,
      settingThree: null,
      notes: null,
      workoutId: workout.id,
      imageUrl: null,
      exerciseTypeId: null,
      caloriesBurned: null,
    });
    if (log) {
      if (item.category === "weightlifting") {
        log.sets = await createDefaultSets(userId, log.id, item.typeName);
      }
      created.push(log);
    }
  }
  return created;
}

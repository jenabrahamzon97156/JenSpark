// lib/exerciseTypesStore.ts

import { supabase } from "./supabaseClient";
import { ExerciseType } from "./types";

function rowToType(row: any): ExerciseType {
  return {
    id: row.id,
    name: row.name,
    seatNumber: row.seat_number,
    settingTwo: row.setting_2,
    settingThree: row.setting_3,
    notes: row.notes,
  };
}

export async function fetchExerciseTypes(userId: string): Promise<ExerciseType[]> {
  const { data, error } = await supabase
    .from("exercise_types")
    .select("*")
    .eq("user_id", userId)
    .order("name");
  if (error) return [];
  return (data ?? []).map(rowToType);
}

export async function createExerciseType(
  userId: string,
  input: Omit<ExerciseType, "id">
): Promise<ExerciseType | null> {
  const { data, error } = await supabase
    .from("exercise_types")
    .insert({
      user_id: userId,
      name: input.name,
      seat_number: input.seatNumber,
      setting_2: input.settingTwo,
      setting_3: input.settingThree,
      notes: input.notes,
    })
    .select()
    .single();
  if (error) {
    console.error("Failed to create exercise:", error.message);
    return null;
  }
  return rowToType(data);
}

export async function updateExerciseType(id: string, input: Omit<ExerciseType, "id">) {
  const { error } = await supabase
    .from("exercise_types")
    .update({
      name: input.name,
      seat_number: input.seatNumber,
      setting_2: input.settingTwo,
      setting_3: input.settingThree,
      notes: input.notes,
    })
    .eq("id", id);
  if (error) console.error("Failed to update exercise:", error.message);
}

export async function deleteExerciseType(id: string) {
  const { error } = await supabase.from("exercise_types").delete().eq("id", id);
  if (error) console.error("Failed to delete exercise:", error.message);
}

// One-time bulk import from Jen's YMCA workout card, so she doesn't have to
// hand-type all of these. Seat/Other values are current as of the last
// dated column on the card; notes carry over her form cues.
export async function importYmcaCard(userId: string): Promise<ExerciseType[]> {
  const entries: Omit<ExerciseType, "id">[] = [
    { name: "Leg Press", seatNumber: "3", settingTwo: null, settingThree: null, notes: null },
    { name: "Seated Leg Curl", seatNumber: "4", settingTwo: "Front: 2, Back: 1", settingThree: null, notes: null },
    { name: "Leg Extension", seatNumber: "3", settingTwo: null, settingThree: null, notes: "Line knees, pivot pad" },
    { name: "Hip Adduction", seatNumber: null, settingTwo: null, settingThree: null, notes: "Inner thighs" },
    { name: "Hip Abduction", seatNumber: "3", settingTwo: null, settingThree: null, notes: "Outer thighs" },
    { name: "Glute", seatNumber: null, settingTwo: null, settingThree: null, notes: null },
    { name: "Seated Row", seatNumber: "2", settingTwo: "5", settingThree: null, notes: "Back — thumbs in, bring to chest" },
    { name: "Chest Press", seatNumber: null, settingTwo: null, settingThree: null, notes: "Chest" },
    { name: "Shoulder Press", seatNumber: "2", settingTwo: null, settingThree: null, notes: null },
    { name: "Lat Pulldown", seatNumber: null, settingTwo: null, settingThree: null, notes: "Back" },
    { name: "Pec Fly", seatNumber: "5", settingTwo: "1 — handles", settingThree: null, notes: "Thumbs in, chest" },
    { name: "Rear Delt", seatNumber: null, settingTwo: null, settingThree: null, notes: "Back of shoulders" },
    { name: "Bicep Curl", seatNumber: null, settingTwo: null, settingThree: null, notes: null },
    { name: "Triceps Press", seatNumber: null, settingTwo: null, settingThree: null, notes: null },
    { name: "Abdominal Crunch", seatNumber: null, settingTwo: null, settingThree: null, notes: null },
    { name: "Rotary Torso", seatNumber: "4", settingTwo: null, settingThree: null, notes: null },
    { name: "Pull Up Assist", seatNumber: null, settingTwo: null, settingThree: null, notes: null },
    { name: "Bi-angular Lat Row", seatNumber: null, settingTwo: null, settingThree: null, notes: null },
  ];

  const created: ExerciseType[] = [];
  for (const e of entries) {
    const c = await createExerciseType(userId, e);
    if (c) created.push(c);
  }
  return created;
}

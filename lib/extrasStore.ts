// lib/extrasStore.ts

import { supabase } from "./supabaseClient";
import { DayNote, ExtraRecord, ExtraType } from "./types";

function rowToNote(row: any): DayNote {
  return { id: row.id, date: row.date, notes: row.notes };
}
function rowToType(row: any): ExtraType {
  return { id: row.id, name: row.name, emoji: row.emoji };
}
function rowToRecord(row: any): ExtraRecord {
  return { id: row.id, typeId: row.type_id, date: row.date, name: row.name, notes: row.notes };
}

// Day notes -------------------------------------------------------------------

export async function fetchDayNotes(userId: string, date: string): Promise<DayNote[]> {
  const { data, error } = await supabase
    .from("day_notes")
    .select("*")
    .eq("user_id", userId)
    .eq("date", date)
    .order("created_at", { ascending: true });
  if (error) return [];
  return (data ?? []).map(rowToNote);
}

export async function addDayNote(userId: string, date: string, notes: string): Promise<DayNote | null> {
  const { data, error } = await supabase
    .from("day_notes")
    .insert({ user_id: userId, date, notes })
    .select()
    .single();
  if (error) {
    console.error("Failed to add note:", error.message);
    return null;
  }
  return rowToNote(data);
}

export async function deleteDayNote(id: string) {
  const { error } = await supabase.from("day_notes").delete().eq("id", id);
  if (error) console.error("Failed to delete note:", error.message);
}

// Extra types (custom trackers) ------------------------------------------------

export async function fetchExtraTypes(userId: string): Promise<ExtraType[]> {
  const { data, error } = await supabase.from("extra_types").select("*").eq("user_id", userId).order("name");
  if (error) return [];
  return (data ?? []).map(rowToType);
}

export async function createExtraType(userId: string, name: string, emoji: string): Promise<ExtraType | null> {
  const { data, error } = await supabase
    .from("extra_types")
    .insert({ user_id: userId, name, emoji })
    .select()
    .single();
  if (error) {
    console.error("Failed to create tracker type:", error.message);
    return null;
  }
  return rowToType(data);
}

export async function deleteExtraType(id: string) {
  const { error } = await supabase.from("extra_types").delete().eq("id", id);
  if (error) console.error("Failed to delete tracker type:", error.message);
}

// Extra records -----------------------------------------------------------------

export async function fetchExtraRecordsForDate(userId: string, date: string): Promise<ExtraRecord[]> {
  const { data, error } = await supabase
    .from("extra_records")
    .select("*")
    .eq("user_id", userId)
    .eq("date", date)
    .order("created_at", { ascending: true });
  if (error) return [];
  return (data ?? []).map(rowToRecord);
}

export async function addExtraRecord(
  userId: string,
  typeId: string,
  date: string,
  name: string,
  notes: string | null
): Promise<ExtraRecord | null> {
  const { data, error } = await supabase
    .from("extra_records")
    .insert({ user_id: userId, type_id: typeId, date, name, notes })
    .select()
    .single();
  if (error) {
    console.error("Failed to add record:", error.message);
    return null;
  }
  return rowToRecord(data);
}

export async function deleteExtraRecord(id: string) {
  const { error } = await supabase.from("extra_records").delete().eq("id", id);
  if (error) console.error("Failed to delete record:", error.message);
}

// For the Home page calendar: which dates in a range have a record of each
// type, paired with that type's emoji.
export async function fetchExtraRecordDatesInRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<{ date: string; emoji: string }[]> {
  const { data, error } = await supabase
    .from("extra_records")
    .select("date, extra_types(emoji)")
    .eq("user_id", userId)
    .gte("date", startDate)
    .lte("date", endDate);
  if (error) return [];
  return (data ?? []).map((r: any) => ({ date: r.date, emoji: r.extra_types?.emoji ?? "\u2b50" }));
}

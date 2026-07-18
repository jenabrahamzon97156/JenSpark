// lib/statsStore.ts

import { supabase } from "./supabaseClient";
import { StatEntry, StatEntryType } from "./types";

function rowToEntry(row: any): StatEntry {
  return {
    id: row.id,
    date: row.date,
    entryType: row.entry_type,
    measurementType: row.measurement_type,
    value: Number(row.value),
    unit: row.unit,
  };
}

export async function fetchAllStatEntries(userId: string): Promise<StatEntry[]> {
  const { data, error } = await supabase
    .from("stat_entries")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false });

  if (error) {
    console.error("Failed to load stats:", error.message);
    return [];
  }
  return (data ?? []).map(rowToEntry);
}

export async function fetchLatestValue(
  userId: string,
  entryType: StatEntryType,
  measurementType: string | null
): Promise<number | null> {
  let query = supabase
    .from("stat_entries")
    .select("value")
    .eq("user_id", userId)
    .eq("entry_type", entryType)
    .order("date", { ascending: false })
    .limit(1);

  query = measurementType ? query.eq("measurement_type", measurementType) : query.is("measurement_type", null);

  const { data, error } = await query.maybeSingle();
  if (error) {
    console.error("Failed to load latest stat value:", error.message);
    return null;
  }
  return data ? Number(data.value) : null;
}

export async function addStatEntry(
  userId: string,
  input: { date: string; entryType: StatEntryType; measurementType: string | null; value: number; unit: string }
): Promise<StatEntry | null> {
  const { data, error } = await supabase
    .from("stat_entries")
    .insert({
      user_id: userId,
      date: input.date,
      entry_type: input.entryType,
      measurement_type: input.measurementType,
      value: input.value,
      unit: input.unit,
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to add stat entry:", error.message);
    return null;
  }
  return rowToEntry(data);
}

export async function deleteStatEntry(id: string) {
  const { error } = await supabase.from("stat_entries").delete().eq("id", id);
  if (error) console.error("Failed to delete stat entry:", error.message);
}

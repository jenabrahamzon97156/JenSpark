// lib/fitnessTipsStore.ts

import { supabase } from "./supabaseClient";
import { FitnessTip } from "./types";

export async function fetchFitnessTips(userId: string): Promise<FitnessTip[]> {
  const { data, error } = await supabase
    .from("fitness_tips")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []).map((r: any) => ({ id: r.id, content: r.content }));
}

export async function addFitnessTip(userId: string, content: string): Promise<FitnessTip | null> {
  const { data, error } = await supabase
    .from("fitness_tips")
    .insert({ user_id: userId, content })
    .select()
    .single();
  if (error) {
    console.error("Failed to add tip:", error.message);
    return null;
  }
  return { id: data.id, content: data.content };
}

export async function updateFitnessTip(id: string, content: string) {
  const { error } = await supabase.from("fitness_tips").update({ content }).eq("id", id);
  if (error) console.error("Failed to update tip:", error.message);
}

export async function deleteFitnessTip(id: string) {
  const { error } = await supabase.from("fitness_tips").delete().eq("id", id);
  if (error) console.error("Failed to delete tip:", error.message);
}

// lib/settingsStore.ts

import { supabase } from "./supabaseClient";
import { UserSettings } from "./types";

const DEFAULTS: UserSettings = {
  statsReminderFrequency: "off",
  restTimerDefaultSeconds: 60,
  distanceUnitDefault: "mi",
};

export async function fetchSettings(userId: string): Promise<UserSettings> {
  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return DEFAULTS;
  return {
    statsReminderFrequency: data.stats_reminder_frequency ?? "off",
    restTimerDefaultSeconds: data.rest_timer_default_seconds ?? 60,
    distanceUnitDefault: data.distance_unit_default ?? "mi",
  };
}

export async function saveSettings(userId: string, settings: Partial<UserSettings>) {
  const { error } = await supabase.from("user_settings").upsert(
    {
      user_id: userId,
      ...(settings.statsReminderFrequency !== undefined && {
        stats_reminder_frequency: settings.statsReminderFrequency,
      }),
      ...(settings.restTimerDefaultSeconds !== undefined && {
        rest_timer_default_seconds: settings.restTimerDefaultSeconds,
      }),
      ...(settings.distanceUnitDefault !== undefined && {
        distance_unit_default: settings.distanceUnitDefault,
      }),
    },
    { onConflict: "user_id" }
  );
  if (error) console.error("Failed to save settings:", error.message);
}

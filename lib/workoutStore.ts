// lib/workoutStore.ts
//
// Small date-string helpers shared across pages. The old fixed-program
// workout storage (WorkoutDay local/remote sync) was retired in Phase 3 in
// favor of the flexible fitness_logs model in lib/fitnessStore.ts — the
// workout_days table itself is left in Supabase for anyone with historical
// data, just no longer written to by the app.

export function todayDateString() {
  return dateToString(new Date());
}

// Formats a Date as YYYY-MM-DD using its LOCAL calendar date (whatever
// timezone the browser/device is set to), not its UTC date.
//
// The previous version used d.toISOString(), which always converts through
// UTC. That's fine for a Date built as local midnight (e.g. calendar grid
// cells), but for "right now" it's wrong for a big chunk of the day: someone
// in US Central time testing in the evening would have their local "today"
// silently saved as tomorrow's UTC date, since UTC is already several hours
// ahead. This showed up as newly created tasks/entries not appearing under
// "today" — they were real, just filed under the wrong date.
export function dateToString(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

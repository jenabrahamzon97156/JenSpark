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

export function dateToString(d: Date) {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

// lib/types.ts

export type Goal = "hypertrophy" | "strength" | "endurance" | "general_fitness";
export type FitnessLevel = "beginner" | "intermediate" | "advanced";
export type Equipment =
  | "barbell"
  | "dumbbells"
  | "machines"
  | "cables"
  | "bodyweight"
  | "kettlebells"
  | "resistance_bands";

export interface UserProfile {
  id: string;
  goal: Goal;
  fitnessLevel: FitnessLevel;
  equipment: Equipment[];
  injuries: string[]; // e.g. ["left_shoulder", "lower_back"]
  daysPerWeek: number;
}

export interface SetLog {
  id: string;
  setNumber: number;
  targetReps: number;
  targetWeight: number; // lbs
  actualReps: number | null;
  actualWeight: number | null;
  completed: boolean;
  isWarmup?: boolean;
  isPR?: boolean;
}

export interface ExerciseLog {
  id: string;
  name: string;
  muscleGroup: string;
  equipment: Equipment;
  sets: SetLog[];
  restSeconds: number; // rest between sets for this exercise
  notes?: string;
  supersetWith?: string; // exercise id
}

export interface WorkoutDay {
  id: string;
  dayLabel: string; // "Push Day A"
  dayOfWeek: number; // 0-6
  exercises: ExerciseLog[];
  completedAt?: string;
}

export interface WeeklyRoutine {
  id: string;
  userId: string;
  weekStartDate: string;
  days: WorkoutDay[];
}

export interface CoachSuggestion {
  id: string;
  type: "progressive_overload" | "imbalance" | "alternative_exercise" | "recovery";
  exerciseId?: string;
  message: string;
  severity: "info" | "tip" | "warning";
}

// ---------------------------------------------------------------------------
// Daily Tasks
// ---------------------------------------------------------------------------

export type Recurrence = "once" | "daily" | "weekdays";

export interface DailyTask {
  id: string;
  title: string;
  notes: string | null;
  recurrence: Recurrence;
  recurrenceDays: number[] | null; // 0 (Sun) - 6 (Sat), used when recurrence === "weekdays"
  startDate: string; // YYYY-MM-DD
  archived: boolean;
}

export interface TaskCompletion {
  taskId: string;
  date: string; // YYYY-MM-DD
  completed: boolean;
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export type StatEntryType = "weight" | "measurement";
export type ReminderFrequency = "off" | "daily" | "weekly";

export interface StatEntry {
  id: string;
  date: string; // YYYY-MM-DD
  entryType: StatEntryType;
  measurementType: string | null; // e.g. "Waist" — null for weight
  value: number;
  unit: string;
}

// ---------------------------------------------------------------------------
// Food Tracking
// ---------------------------------------------------------------------------

export interface NutritionFacts {
  calories: number;
  proteinG: number;
  fiberG: number;
  sugarG: number;
  fatG: number;
  carbsG: number;
  sodiumMg: number;
}

export interface FoodItem extends NutritionFacts {
  id: string;
  name: string;
  brand: string | null;
  servingQty: number;
  servingUnit: string;
  source: "manual" | "openfoodfacts";
  externalId: string | null;
}

export interface MealWithItems {
  id: string;
  name: string;
  items: { foodId: string; quantity: number; food: FoodItem }[];
}

export interface RecipeWithIngredients {
  id: string;
  name: string;
  servings: number;
  ingredients: { foodId: string; quantity: number; food: FoodItem }[];
}

export type MealSlot =
  | "breakfast"
  | "morning_snack"
  | "lunch"
  | "afternoon_snack"
  | "dinner"
  | "evening_snack"
  | "other";

export interface FoodLogEntry extends NutritionFacts {
  id: string;
  date: string;
  entryName: string;
  quantity: number;
  sourceType: "food" | "meal" | "recipe";
  sourceId: string | null;
  mealSlot: MealSlot;
  notes: string | null;
}

export interface NutritionGoals {
  calories: number;
  proteinG: number;
  fiberG: number;
}

// ---------------------------------------------------------------------------
// Fitness (Phase 3)
// ---------------------------------------------------------------------------

export type FitnessCategory = "cardio" | "weightlifting" | "yoga" | "swimming" | "stretching";

export interface FitnessSet {
  id: string;
  setNumber: number;
  weight: number | null;
  reps: number | null;
}

export type DistanceUnit = "mi" | "km";

export interface FitnessLogEntry {
  id: string;
  date: string;
  category: FitnessCategory;
  typeName: string;
  distance: number | null;
  distanceUnit: DistanceUnit;
  durationMinutes: number | null;
  seatNumber: string | null;
  machineSettings: string | null;
  notes: string | null;
  workoutId: string | null;
  imageUrl: string | null;
  sets?: FitnessSet[];
}

export interface WorkoutTemplateItem {
  category: FitnessCategory;
  typeName: string;
  orderIndex: number;
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  items: WorkoutTemplateItem[];
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export interface UserSettings {
  statsReminderFrequency: ReminderFrequency;
  restTimerDefaultSeconds: number;
  distanceUnitDefault: DistanceUnit;
}

// ---------------------------------------------------------------------------
// Extras
// ---------------------------------------------------------------------------

export interface DayNote {
  id: string;
  date: string;
  notes: string;
}

export interface ExtraType {
  id: string;
  name: string;
  emoji: string;
}

export interface ExtraRecord {
  id: string;
  typeId: string;
  date: string;
  name: string;
  notes: string | null;
}

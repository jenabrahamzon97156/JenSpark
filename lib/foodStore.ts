// lib/foodStore.ts

import { supabase } from "./supabaseClient";
import {
  FoodItem,
  FoodLogEntry,
  MealSlot,
  MealWithItems,
  NutritionGoals,
  RecipeWithIngredients,
} from "./types";
import { FoodSearchResult } from "./usdaFoodData";

export const MEAL_SLOT_ORDER: MealSlot[] = [
  "breakfast",
  "morning_snack",
  "lunch",
  "afternoon_snack",
  "dinner",
  "evening_snack",
  "other",
];

export const MEAL_SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: "Breakfast",
  morning_snack: "Morning Snack",
  lunch: "Lunch",
  afternoon_snack: "Afternoon Snack",
  dinner: "Dinner",
  evening_snack: "Evening Snack",
  other: "Other",
};

function rowToFood(row: any): FoodItem {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    servingQty: Number(row.serving_qty),
    servingUnit: row.serving_unit,
    calories: Number(row.calories),
    proteinG: Number(row.protein_g),
    fiberG: Number(row.fiber_g),
    sugarG: Number(row.sugar_g),
    fatG: Number(row.fat_g),
    carbsG: Number(row.carbs_g),
    sodiumMg: Number(row.sodium_mg),
    source: row.source,
    externalId: row.external_id,
  };
}

function rowToLog(row: any): FoodLogEntry {
  return {
    id: row.id,
    date: row.date,
    entryName: row.entry_name,
    quantity: Number(row.quantity),
    calories: Number(row.calories),
    proteinG: Number(row.protein_g),
    fiberG: Number(row.fiber_g),
    sugarG: Number(row.sugar_g),
    fatG: Number(row.fat_g),
    carbsG: Number(row.carbs_g),
    sodiumMg: Number(row.sodium_mg),
    sourceType: row.source_type,
    sourceId: row.source_id,
    mealSlot: row.meal_slot ?? "other",
    notes: row.notes ?? null,
  };
}

// Food library ----------------------------------------------------------------

export async function fetchFoodItems(userId: string): Promise<FoodItem[]> {
  const { data, error } = await supabase
    .from("food_items")
    .select("*")
    .eq("user_id", userId)
    .order("name", { ascending: true });
  if (error) {
    console.error("Failed to load foods:", error.message);
    return [];
  }
  return (data ?? []).map(rowToFood);
}

export async function createFoodItem(
  userId: string,
  input: Omit<FoodItem, "id"> 
): Promise<FoodItem | null> {
  const { data, error } = await supabase
    .from("food_items")
    .insert({
      user_id: userId,
      name: input.name,
      brand: input.brand,
      serving_qty: input.servingQty,
      serving_unit: input.servingUnit,
      calories: input.calories,
      protein_g: input.proteinG,
      fiber_g: input.fiberG,
      sugar_g: input.sugarG,
      fat_g: input.fatG,
      carbs_g: input.carbsG,
      sodium_mg: input.sodiumMg,
      source: input.source,
      external_id: input.externalId,
    })
    .select()
    .single();
  if (error) {
    console.error("Failed to save food:", error.message);
    return null;
  }
  return rowToFood(data);
}

export async function saveSearchResultAsFood(
  userId: string,
  result: FoodSearchResult
): Promise<FoodItem | null> {
  return createFoodItem(userId, {
    name: result.name,
    brand: result.brand,
    servingQty: 100,
    servingUnit: "g",
    calories: result.calories,
    proteinG: result.proteinG,
    fiberG: result.fiberG,
    sugarG: result.sugarG,
    fatG: result.fatG,
    carbsG: result.carbsG,
    sodiumMg: result.sodiumMg,
    source: "openfoodfacts",
    externalId: result.externalId || null,
  });
}

// Logging -----------------------------------------------------------------

export async function fetchLogEntriesForDate(userId: string, date: string): Promise<FoodLogEntry[]> {
  const { data, error } = await supabase
    .from("food_logs")
    .select("*")
    .eq("user_id", userId)
    .eq("date", date)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("Failed to load food log:", error.message);
    return [];
  }
  return (data ?? []).map(rowToLog);
}

export async function addLogEntry(
  userId: string,
  input: Omit<FoodLogEntry, "id">
): Promise<FoodLogEntry | null> {
  const { data, error } = await supabase
    .from("food_logs")
    .insert({
      user_id: userId,
      date: input.date,
      entry_name: input.entryName,
      quantity: input.quantity,
      calories: input.calories,
      protein_g: input.proteinG,
      fiber_g: input.fiberG,
      sugar_g: input.sugarG,
      fat_g: input.fatG,
      carbs_g: input.carbsG,
      sodium_mg: input.sodiumMg,
      source_type: input.sourceType,
      source_id: input.sourceId,
      meal_slot: input.mealSlot,
      notes: input.notes,
    })
    .select()
    .single();
  if (error) {
    console.error("Failed to log food:", error.message);
    return null;
  }
  return rowToLog(data);
}

export async function deleteLogEntry(id: string) {
  const { error } = await supabase.from("food_logs").delete().eq("id", id);
  if (error) console.error("Failed to delete log entry:", error.message);
}

// Meals ---------------------------------------------------------------------

export async function fetchMeals(userId: string): Promise<MealWithItems[]> {
  const { data: meals, error } = await supabase
    .from("meals")
    .select("*")
    .eq("user_id", userId)
    .order("name");
  if (error || !meals) return [];

  const { data: items } = await supabase
    .from("meal_items")
    .select("*, food:food_items(*)")
    .eq("user_id", userId);

  return meals.map((m: any) => ({
    id: m.id,
    name: m.name,
    items: (items ?? [])
      .filter((it: any) => it.meal_id === m.id)
      .map((it: any) => ({ foodId: it.food_id, quantity: Number(it.quantity), food: rowToFood(it.food) })),
  }));
}

export async function createMeal(
  userId: string,
  name: string,
  items: { foodId: string; quantity: number }[]
): Promise<void> {
  const { data: meal, error } = await supabase
    .from("meals")
    .insert({ user_id: userId, name })
    .select()
    .single();
  if (error || !meal) {
    console.error("Failed to create meal:", error?.message);
    return;
  }
  if (items.length > 0) {
    await supabase.from("meal_items").insert(
      items.map((it) => ({ user_id: userId, meal_id: meal.id, food_id: it.foodId, quantity: it.quantity }))
    );
  }
}

export async function deleteMeal(id: string) {
  const { error } = await supabase.from("meals").delete().eq("id", id);
  if (error) console.error("Failed to delete meal:", error.message);
}

// Recipes ---------------------------------------------------------------------

export async function fetchRecipes(userId: string): Promise<RecipeWithIngredients[]> {
  const { data: recipes, error } = await supabase
    .from("recipes")
    .select("*")
    .eq("user_id", userId)
    .order("name");
  if (error || !recipes) return [];

  const { data: ingredients } = await supabase
    .from("recipe_ingredients")
    .select("*, food:food_items(*)")
    .eq("user_id", userId);

  return recipes.map((r: any) => ({
    id: r.id,
    name: r.name,
    servings: Number(r.servings),
    ingredients: (ingredients ?? [])
      .filter((it: any) => it.recipe_id === r.id)
      .map((it: any) => ({ foodId: it.food_id, quantity: Number(it.quantity), food: rowToFood(it.food) })),
  }));
}

export async function createRecipe(
  userId: string,
  name: string,
  servings: number,
  ingredients: { foodId: string; quantity: number }[]
): Promise<void> {
  const { data: recipe, error } = await supabase
    .from("recipes")
    .insert({ user_id: userId, name, servings })
    .select()
    .single();
  if (error || !recipe) {
    console.error("Failed to create recipe:", error?.message);
    return;
  }
  if (ingredients.length > 0) {
    await supabase.from("recipe_ingredients").insert(
      ingredients.map((it) => ({
        user_id: userId,
        recipe_id: recipe.id,
        food_id: it.foodId,
        quantity: it.quantity,
      }))
    );
  }
}

export async function deleteRecipe(id: string) {
  const { error } = await supabase.from("recipes").delete().eq("id", id);
  if (error) console.error("Failed to delete recipe:", error.message);
}

export async function fetchFoodLoggedDatesInRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from("food_logs")
    .select("date")
    .eq("user_id", userId)
    .gte("date", startDate)
    .lte("date", endDate);
  if (error) return [];
  return Array.from(new Set((data ?? []).map((r: any) => r.date as string)));
}

// Nutrition helpers -------------------------------------------------------------

// A food's stored nutrition is per its own serving; multiply by quantity
// (number of servings eaten) to get totals for logging.
export function scaleFood(food: FoodItem, quantity: number) {
  return {
    calories: food.calories * quantity,
    proteinG: food.proteinG * quantity,
    fiberG: food.fiberG * quantity,
    sugarG: food.sugarG * quantity,
    fatG: food.fatG * quantity,
    carbsG: food.carbsG * quantity,
    sodiumMg: food.sodiumMg * quantity,
  };
}

export function sumFoods(items: { food: FoodItem; quantity: number }[]) {
  return items.reduce(
    (acc, it) => {
      const s = scaleFood(it.food, it.quantity);
      acc.calories += s.calories;
      acc.proteinG += s.proteinG;
      acc.fiberG += s.fiberG;
      acc.sugarG += s.sugarG;
      acc.fatG += s.fatG;
      acc.carbsG += s.carbsG;
      acc.sodiumMg += s.sodiumMg;
      return acc;
    },
    { calories: 0, proteinG: 0, fiberG: 0, sugarG: 0, fatG: 0, carbsG: 0, sodiumMg: 0 }
  );
}

// Goals -----------------------------------------------------------------------

export async function fetchGoalsForDate(userId: string, date: string): Promise<NutritionGoals> {
  const { data, error } = await supabase
    .from("nutrition_goals")
    .select("*")
    .eq("user_id", userId)
    .lte("effective_date", date)
    .order("effective_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return { calories: 2000, proteinG: 100, fiberG: 25 };
  }
  return { calories: Number(data.calories), proteinG: Number(data.protein_g), fiberG: Number(data.fiber_g) };
}

export async function saveGoals(userId: string, goals: NutritionGoals, effectiveDate: string) {
  const { error } = await supabase.from("nutrition_goals").insert({
    user_id: userId,
    effective_date: effectiveDate,
    calories: goals.calories,
    protein_g: goals.proteinG,
    fiber_g: goals.fiberG,
  });
  if (error) console.error("Failed to save goals:", error.message);
}

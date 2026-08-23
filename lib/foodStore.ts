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
    servingLabel: row.serving_label ?? null,
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

export async function updateFoodItem(id: string, input: Omit<FoodItem, "id">) {
  const { error } = await supabase
    .from("food_items")
    .update({
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
    })
    .eq("id", id);
  if (error) console.error("Failed to update food:", error.message);
}

export async function deleteFoodItem(id: string) {
  const { error } = await supabase.from("food_items").delete().eq("id", id);
  if (error) console.error("Failed to delete food:", error.message);
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
    source: "usda",
    externalId: result.externalId || null,
  });
}

// A curated starter set of common foods in real US household servings
// (each/cup/oz/tbsp/slice), so there's a usable library on day one without
// depending on any external API. Values are standard reference figures,
// not from a live lookup — close enough for everyday tracking, editable
// afterward like any other library entry.
const STARTER_FOODS: Omit<FoodItem, "id" | "source" | "externalId">[] = [
  { name: "Large egg", brand: null, servingQty: 1, servingUnit: "each", calories: 72, proteinG: 6.3, fiberG: 0, sugarG: 0.2, fatG: 4.8, carbsG: 0.4, sodiumMg: 71 },
  { name: "Banana", brand: null, servingQty: 1, servingUnit: "each", calories: 105, proteinG: 1.3, fiberG: 3.1, sugarG: 14, fatG: 0.4, carbsG: 27, sodiumMg: 1 },
  { name: "Chicken breast, cooked", brand: null, servingQty: 3, servingUnit: "oz", calories: 165, proteinG: 31, fiberG: 0, sugarG: 0, fatG: 3.6, carbsG: 0, sodiumMg: 74 },
  { name: "White rice, cooked", brand: null, servingQty: 1, servingUnit: "cup", calories: 205, proteinG: 4.3, fiberG: 0.6, sugarG: 0.1, fatG: 0.4, carbsG: 45, sodiumMg: 2 },
  { name: "Brown rice, cooked", brand: null, servingQty: 1, servingUnit: "cup", calories: 216, proteinG: 5, fiberG: 3.5, sugarG: 0.7, fatG: 1.8, carbsG: 45, sodiumMg: 10 },
  { name: "Whole wheat bread", brand: null, servingQty: 1, servingUnit: "slice", calories: 81, proteinG: 4, fiberG: 1.9, sugarG: 1.4, fatG: 1.1, carbsG: 13.8, sodiumMg: 144 },
  { name: "White bread", brand: null, servingQty: 1, servingUnit: "slice", calories: 79, proteinG: 2.7, fiberG: 0.8, sugarG: 1.4, fatG: 1, carbsG: 14.6, sodiumMg: 152 },
  { name: "2% milk", brand: null, servingQty: 1, servingUnit: "cup", calories: 122, proteinG: 8.1, fiberG: 0, sugarG: 12.3, fatG: 4.8, carbsG: 11.7, sodiumMg: 115 },
  { name: "Greek yogurt, plain nonfat", brand: null, servingQty: 1, servingUnit: "cup", calories: 130, proteinG: 23, fiberG: 0, sugarG: 9, fatG: 0.7, carbsG: 9, sodiumMg: 82 },
  { name: "Broccoli, cooked", brand: null, servingQty: 1, servingUnit: "cup", calories: 55, proteinG: 3.7, fiberG: 5.1, sugarG: 2.2, fatG: 0.6, carbsG: 11.2, sodiumMg: 64 },
  { name: "Sweet potato, baked", brand: null, servingQty: 1, servingUnit: "each", calories: 103, proteinG: 2.3, fiberG: 3.8, sugarG: 7.4, fatG: 0.2, carbsG: 23.6, sodiumMg: 41 },
  { name: "Avocado", brand: null, servingQty: 0.5, servingUnit: "each", calories: 114, proteinG: 1.3, fiberG: 4.6, sugarG: 0.2, fatG: 10.5, carbsG: 6, sodiumMg: 5 },
  { name: "Almonds", brand: null, servingQty: 1, servingUnit: "oz", calories: 164, proteinG: 6, fiberG: 3.5, sugarG: 1.2, fatG: 14.2, carbsG: 6.1, sodiumMg: 0 },
  { name: "Peanut butter", brand: null, servingQty: 2, servingUnit: "tbsp", calories: 188, proteinG: 8, fiberG: 1.9, sugarG: 3.4, fatG: 16.3, carbsG: 6.9, sodiumMg: 147 },
  { name: "Salmon, cooked", brand: null, servingQty: 3, servingUnit: "oz", calories: 175, proteinG: 19, fiberG: 0, sugarG: 0, fatG: 10.5, carbsG: 0, sodiumMg: 50 },
  { name: "Ground beef, 85% lean, cooked", brand: null, servingQty: 3, servingUnit: "oz", calories: 213, proteinG: 22, fiberG: 0, sugarG: 0, fatG: 13, carbsG: 0, sodiumMg: 68 },
  { name: "Olive oil", brand: null, servingQty: 1, servingUnit: "tbsp", calories: 119, proteinG: 0, fiberG: 0, sugarG: 0, fatG: 13.5, carbsG: 0, sodiumMg: 0 },
  { name: "Apple", brand: null, servingQty: 1, servingUnit: "each", calories: 95, proteinG: 0.5, fiberG: 4.4, sugarG: 19, fatG: 0.3, carbsG: 25, sodiumMg: 2 },
  { name: "Orange", brand: null, servingQty: 1, servingUnit: "each", calories: 62, proteinG: 1.2, fiberG: 3.1, sugarG: 12.2, fatG: 0.2, carbsG: 15.4, sodiumMg: 0 },
  { name: "Strawberries", brand: null, servingQty: 1, servingUnit: "cup", calories: 49, proteinG: 1, fiberG: 3, sugarG: 7.4, fatG: 0.5, carbsG: 11.7, sodiumMg: 2 },
  { name: "Blueberries", brand: null, servingQty: 1, servingUnit: "cup", calories: 84, proteinG: 1.1, fiberG: 3.6, sugarG: 15, fatG: 0.5, carbsG: 21, sodiumMg: 1 },
  { name: "Oatmeal, cooked", brand: null, servingQty: 1, servingUnit: "cup", calories: 166, proteinG: 5.9, fiberG: 4, sugarG: 0.6, fatG: 3.6, carbsG: 28, sodiumMg: 9 },
  { name: "Cheddar cheese", brand: null, servingQty: 1, servingUnit: "oz", calories: 113, proteinG: 7, fiberG: 0, sugarG: 0.1, fatG: 9.3, carbsG: 0.4, sodiumMg: 174 },
  { name: "Black beans, cooked", brand: null, servingQty: 1, servingUnit: "cup", calories: 227, proteinG: 15.2, fiberG: 15, sugarG: 0.6, fatG: 0.9, carbsG: 40.8, sodiumMg: 1 },
  { name: "Pasta, cooked", brand: null, servingQty: 1, servingUnit: "cup", calories: 221, proteinG: 8.1, fiberG: 2.5, sugarG: 0.8, fatG: 1.3, carbsG: 43.2, sodiumMg: 1 },
  { name: "Quinoa, cooked", brand: null, servingQty: 1, servingUnit: "cup", calories: 222, proteinG: 8.1, fiberG: 5.2, sugarG: 1.6, fatG: 3.6, carbsG: 39.4, sodiumMg: 13 },
  { name: "Spinach, raw", brand: null, servingQty: 1, servingUnit: "cup", calories: 7, proteinG: 0.9, fiberG: 0.7, sugarG: 0.1, fatG: 0.1, carbsG: 1.1, sodiumMg: 24 },
  { name: "Carrots, raw, chopped", brand: null, servingQty: 1, servingUnit: "cup", calories: 52, proteinG: 1.2, fiberG: 3.6, sugarG: 6, fatG: 0.3, carbsG: 12.3, sodiumMg: 88 },
  { name: "Tomato", brand: null, servingQty: 1, servingUnit: "each", calories: 22, proteinG: 1.1, fiberG: 1.5, sugarG: 3.2, fatG: 0.2, carbsG: 4.8, sodiumMg: 6 },
  { name: "Cucumber, sliced", brand: null, servingQty: 1, servingUnit: "cup", calories: 16, proteinG: 0.7, fiberG: 0.5, sugarG: 1.8, fatG: 0.1, carbsG: 3.8, sodiumMg: 2 },
  { name: "Bell pepper", brand: null, servingQty: 1, servingUnit: "each", calories: 24, proteinG: 1, fiberG: 2.1, sugarG: 3.3, fatG: 0.2, carbsG: 5.5, sodiumMg: 3 },
  { name: "Tofu, firm", brand: null, servingQty: 3, servingUnit: "oz", calories: 62, proteinG: 6.6, fiberG: 0.3, sugarG: 0.6, fatG: 3.8, carbsG: 1.5, sodiumMg: 6 },
  { name: "Turkey breast, cooked", brand: null, servingQty: 3, servingUnit: "oz", calories: 125, proteinG: 26, fiberG: 0, sugarG: 0, fatG: 1.8, carbsG: 0, sodiumMg: 44 },
  { name: "Shrimp, cooked", brand: null, servingQty: 3, servingUnit: "oz", calories: 84, proteinG: 20, fiberG: 0, sugarG: 0, fatG: 0.2, carbsG: 0, sodiumMg: 190 },
  { name: "Butter", brand: null, servingQty: 1, servingUnit: "tbsp", calories: 102, proteinG: 0.1, fiberG: 0, sugarG: 0, fatG: 11.5, carbsG: 0, sodiumMg: 91 },
  { name: "Whole milk", brand: null, servingQty: 1, servingUnit: "cup", calories: 149, proteinG: 7.7, fiberG: 0, sugarG: 12.3, fatG: 8, carbsG: 11.7, sodiumMg: 105 },
  { name: "Bagel, plain", brand: null, servingQty: 1, servingUnit: "each", calories: 245, proteinG: 9.5, fiberG: 1.6, sugarG: 4, fatG: 1.5, carbsG: 47.7, sodiumMg: 430 },
  { name: "Bacon, cooked", brand: null, servingQty: 2, servingUnit: "slice", calories: 86, proteinG: 5.9, fiberG: 0, sugarG: 0, fatG: 6.6, carbsG: 0.2, sodiumMg: 302 },
  { name: "Hummus", brand: null, servingQty: 2, servingUnit: "tbsp", calories: 70, proteinG: 2, fiberG: 2, sugarG: 0.2, fatG: 5, carbsG: 4.5, sodiumMg: 130 },
  { name: "Popcorn, air-popped", brand: null, servingQty: 1, servingUnit: "cup", calories: 31, proteinG: 1, fiberG: 1.2, sugarG: 0.1, fatG: 0.4, carbsG: 6.2, sodiumMg: 0 },
];

export async function importStarterFoods(userId: string): Promise<FoodItem[]> {
  const created: FoodItem[] = [];
  for (const f of STARTER_FOODS) {
    const c = await createFoodItem(userId, { ...f, source: "manual", externalId: null });
    if (c) created.push(c);
  }
  return created;
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
      serving_label: input.servingLabel,
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

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

  // Proteins & meats
  { name: "Pork chop, cooked", brand: null, servingQty: 3, servingUnit: "oz", calories: 197, proteinG: 26, fiberG: 0, sugarG: 0, fatG: 9.6, carbsG: 0, sodiumMg: 57 },
  { name: "Ground turkey, 93% lean, cooked", brand: null, servingQty: 3, servingUnit: "oz", calories: 176, proteinG: 21.9, fiberG: 0, sugarG: 0, fatG: 9.6, carbsG: 0, sodiumMg: 79 },
  { name: "Tilapia, cooked", brand: null, servingQty: 3, servingUnit: "oz", calories: 109, proteinG: 22.4, fiberG: 0, sugarG: 0, fatG: 2.3, carbsG: 0, sodiumMg: 48 },
  { name: "Tuna, canned in water", brand: null, servingQty: 3, servingUnit: "oz", calories: 73, proteinG: 16.5, fiberG: 0, sugarG: 0, fatG: 0.5, carbsG: 0, sodiumMg: 210 },
  { name: "Cod, cooked", brand: null, servingQty: 3, servingUnit: "oz", calories: 89, proteinG: 19.4, fiberG: 0, sugarG: 0, fatG: 0.7, carbsG: 0, sodiumMg: 66 },
  { name: "Sirloin steak, cooked", brand: null, servingQty: 3, servingUnit: "oz", calories: 156, proteinG: 25.8, fiberG: 0, sugarG: 0, fatG: 5.2, carbsG: 0, sodiumMg: 52 },
  { name: "Ham, sliced", brand: null, servingQty: 2, servingUnit: "oz", calories: 92, proteinG: 10.5, fiberG: 0, sugarG: 1.6, fatG: 4.4, carbsG: 1.4, sodiumMg: 745 },
  { name: "Hot dog", brand: null, servingQty: 1, servingUnit: "each", calories: 151, proteinG: 5.2, fiberG: 0, sugarG: 1, fatG: 13.4, carbsG: 2, sodiumMg: 435 },
  { name: "Chicken sausage link", brand: null, servingQty: 1, servingUnit: "each", calories: 140, proteinG: 12, fiberG: 0, sugarG: 1, fatG: 9, carbsG: 3, sodiumMg: 480 },
  { name: "Rotisserie chicken, skinless", brand: null, servingQty: 3, servingUnit: "oz", calories: 142, proteinG: 24, fiberG: 0, sugarG: 0, fatG: 4.7, carbsG: 0, sodiumMg: 350 },
  { name: "Chicken thigh, cooked", brand: null, servingQty: 3, servingUnit: "oz", calories: 178, proteinG: 22.9, fiberG: 0, sugarG: 0, fatG: 9.3, carbsG: 0, sodiumMg: 79 },
  { name: "Deli turkey slices", brand: null, servingQty: 2, servingUnit: "oz", calories: 60, proteinG: 10.4, fiberG: 0, sugarG: 1, fatG: 1, carbsG: 2, sodiumMg: 580 },
  { name: "Egg white", brand: null, servingQty: 1, servingUnit: "each", calories: 17, proteinG: 3.6, fiberG: 0, sugarG: 0.2, fatG: 0.1, carbsG: 0.2, sodiumMg: 55 },
  { name: "Hard-boiled egg", brand: null, servingQty: 1, servingUnit: "each", calories: 78, proteinG: 6.3, fiberG: 0, sugarG: 0.6, fatG: 5.3, carbsG: 0.6, sodiumMg: 62 },

  // Dairy
  { name: "Mozzarella cheese", brand: null, servingQty: 1, servingUnit: "oz", calories: 85, proteinG: 6.3, fiberG: 0, sugarG: 0.6, fatG: 6.3, carbsG: 0.6, sodiumMg: 178 },
  { name: "String cheese", brand: null, servingQty: 1, servingUnit: "each", calories: 80, proteinG: 7, fiberG: 0, sugarG: 0, fatG: 6, carbsG: 1, sodiumMg: 200 },
  { name: "Cottage cheese, 2%", brand: null, servingQty: 1, servingUnit: "cup", calories: 163, proteinG: 28, fiberG: 0, sugarG: 6.2, fatG: 2.3, carbsG: 6.1, sodiumMg: 764 },
  { name: "Cream cheese", brand: null, servingQty: 1, servingUnit: "oz", calories: 99, proteinG: 1.7, fiberG: 0, sugarG: 0.8, fatG: 9.8, carbsG: 1.4, sodiumMg: 90 },
  { name: "Sour cream", brand: null, servingQty: 2, servingUnit: "tbsp", calories: 51, proteinG: 0.6, fiberG: 0, sugarG: 0.6, fatG: 5, carbsG: 1, sodiumMg: 8 },
  { name: "Half and half", brand: null, servingQty: 1, servingUnit: "tbsp", calories: 20, proteinG: 0.5, fiberG: 0, sugarG: 0.6, fatG: 1.7, carbsG: 0.6, sodiumMg: 6 },
  { name: "Heavy cream", brand: null, servingQty: 1, servingUnit: "tbsp", calories: 52, proteinG: 0.3, fiberG: 0, sugarG: 0.4, fatG: 5.6, carbsG: 0.4, sodiumMg: 6 },
  { name: "Ricotta cheese, part-skim", brand: null, servingQty: 0.5, servingUnit: "cup", calories: 171, proteinG: 14, fiberG: 0, sugarG: 3.8, fatG: 9.8, carbsG: 6.4, sodiumMg: 155 },
  { name: "Parmesan cheese, grated", brand: null, servingQty: 2, servingUnit: "tbsp", calories: 43, proteinG: 3.8, fiberG: 0, sugarG: 0, fatG: 2.9, carbsG: 0.4, sodiumMg: 183 },
  { name: "Swiss cheese", brand: null, servingQty: 1, servingUnit: "oz", calories: 106, proteinG: 7.6, fiberG: 0, sugarG: 0.1, fatG: 7.8, carbsG: 1.5, sodiumMg: 54 },
  { name: "Feta cheese", brand: null, servingQty: 1, servingUnit: "oz", calories: 75, proteinG: 4, fiberG: 0, sugarG: 1.2, fatG: 6, carbsG: 1.2, sodiumMg: 316 },
  { name: "Plain yogurt, whole milk", brand: null, servingQty: 1, servingUnit: "cup", calories: 149, proteinG: 8.5, fiberG: 0, sugarG: 11.4, fatG: 8, carbsG: 11.4, sodiumMg: 113 },
  { name: "Vanilla yogurt, low-fat", brand: null, servingQty: 1, servingUnit: "cup", calories: 208, proteinG: 11, fiberG: 0, sugarG: 33, fatG: 2.8, carbsG: 34, sodiumMg: 148 },
  { name: "Chocolate milk", brand: null, servingQty: 1, servingUnit: "cup", calories: 190, proteinG: 8, fiberG: 1.3, sugarG: 24, fatG: 2.5, carbsG: 30, sodiumMg: 150 },
  { name: "Almond milk, unsweetened", brand: null, servingQty: 1, servingUnit: "cup", calories: 39, proteinG: 1.5, fiberG: 0.5, sugarG: 0, fatG: 2.5, carbsG: 1.4, sodiumMg: 189 },
  { name: "Soy milk, unsweetened", brand: null, servingQty: 1, servingUnit: "cup", calories: 80, proteinG: 7, fiberG: 1, sugarG: 1, fatG: 4, carbsG: 4, sodiumMg: 90 },
  { name: "Oat milk", brand: null, servingQty: 1, servingUnit: "cup", calories: 120, proteinG: 3, fiberG: 2, sugarG: 7, fatG: 5, carbsG: 16, sodiumMg: 100 },
  { name: "Ice cream, vanilla", brand: null, servingQty: 0.5, servingUnit: "cup", calories: 137, proteinG: 2.3, fiberG: 0.5, sugarG: 14, fatG: 7.3, carbsG: 15.9, sodiumMg: 53 },

  // Grains & starches
  { name: "Couscous, cooked", brand: null, servingQty: 1, servingUnit: "cup", calories: 176, proteinG: 6, fiberG: 2.2, sugarG: 0.2, fatG: 0.3, carbsG: 36.5, sodiumMg: 8 },
  { name: "Instant oatmeal packet, plain", brand: null, servingQty: 1, servingUnit: "each", calories: 104, proteinG: 4.4, fiberG: 2.7, sugarG: 0.5, fatG: 1.7, carbsG: 18.1, sodiumMg: 76 },
  { name: "Granola", brand: null, servingQty: 0.5, servingUnit: "cup", calories: 298, proteinG: 8, fiberG: 4, sugarG: 12, fatG: 12, carbsG: 40, sodiumMg: 12 },
  { name: "Cornflakes", brand: null, servingQty: 1, servingUnit: "cup", calories: 100, proteinG: 2, fiberG: 0.8, sugarG: 2, fatG: 0.1, carbsG: 24, sodiumMg: 200 },
  { name: "Cheerios", brand: null, servingQty: 1, servingUnit: "cup", calories: 100, proteinG: 3, fiberG: 3, sugarG: 1, fatG: 2, carbsG: 20, sodiumMg: 140 },
  { name: "Flour tortilla", brand: null, servingQty: 1, servingUnit: "each", calories: 144, proteinG: 3.9, fiberG: 1.6, sugarG: 0.8, fatG: 3.4, carbsG: 24, sodiumMg: 314 },
  { name: "Corn tortilla", brand: null, servingQty: 1, servingUnit: "each", calories: 52, proteinG: 1.4, fiberG: 1.5, sugarG: 0.4, fatG: 0.7, carbsG: 10.7, sodiumMg: 11 },
  { name: "English muffin", brand: null, servingQty: 1, servingUnit: "each", calories: 134, proteinG: 4.4, fiberG: 1.5, sugarG: 1.7, fatG: 1, carbsG: 26.2, sodiumMg: 264 },
  { name: "Pita bread", brand: null, servingQty: 1, servingUnit: "each", calories: 165, proteinG: 5.5, fiberG: 1.6, sugarG: 0.7, fatG: 0.7, carbsG: 33.4, sodiumMg: 322 },
  { name: "Naan bread", brand: null, servingQty: 1, servingUnit: "each", calories: 262, proteinG: 8.7, fiberG: 1.9, sugarG: 3.3, fatG: 5.1, carbsG: 45.3, sodiumMg: 418 },
  { name: "Saltine crackers", brand: null, servingQty: 5, servingUnit: "each", calories: 65, proteinG: 1.4, fiberG: 0.3, sugarG: 0.2, fatG: 1.7, carbsG: 10.8, sodiumMg: 165 },
  { name: "Rice cakes", brand: null, servingQty: 1, servingUnit: "each", calories: 35, proteinG: 0.7, fiberG: 0.4, sugarG: 0.1, fatG: 0.3, carbsG: 7.3, sodiumMg: 29 },
  { name: "Pancake", brand: null, servingQty: 1, servingUnit: "each", calories: 86, proteinG: 2.4, fiberG: 0.5, sugarG: 2.6, fatG: 2.6, carbsG: 13.4, sodiumMg: 167 },
  { name: "Waffle", brand: null, servingQty: 1, servingUnit: "each", calories: 218, proteinG: 5.9, fiberG: 1.4, sugarG: 5.2, fatG: 10.6, carbsG: 24.7, sodiumMg: 383 },
  { name: "French fries", brand: null, servingQty: 1, servingUnit: "cup", calories: 365, proteinG: 4, fiberG: 3.8, sugarG: 0.2, fatG: 17, carbsG: 48, sodiumMg: 246 },
  { name: "Mashed potatoes", brand: null, servingQty: 1, servingUnit: "cup", calories: 214, proteinG: 4, fiberG: 3.2, sugarG: 2.5, fatG: 8.9, carbsG: 32, sodiumMg: 620 },
  { name: "Baked potato with skin", brand: null, servingQty: 1, servingUnit: "each", calories: 161, proteinG: 4.3, fiberG: 3.8, sugarG: 1.7, fatG: 0.2, carbsG: 36.6, sodiumMg: 17 },
  { name: "Macaroni and cheese", brand: null, servingQty: 1, servingUnit: "cup", calories: 310, proteinG: 12, fiberG: 1.5, sugarG: 5, fatG: 13, carbsG: 36, sodiumMg: 730 },
  { name: "Ramen noodles, prepared", brand: null, servingQty: 1, servingUnit: "each", calories: 385, proteinG: 8.4, fiberG: 1.8, sugarG: 1.9, fatG: 14.5, carbsG: 55.2, sodiumMg: 1731 },
  { name: "Barley, cooked", brand: null, servingQty: 1, servingUnit: "cup", calories: 193, proteinG: 3.6, fiberG: 6, sugarG: 0.4, fatG: 0.7, carbsG: 44.3, sodiumMg: 5 },

  // Legumes
  { name: "Chickpeas, cooked", brand: null, servingQty: 1, servingUnit: "cup", calories: 269, proteinG: 14.5, fiberG: 12.5, sugarG: 4.8, fatG: 4.3, carbsG: 45, sodiumMg: 11 },
  { name: "Kidney beans, cooked", brand: null, servingQty: 1, servingUnit: "cup", calories: 225, proteinG: 15.3, fiberG: 11.3, sugarG: 0.6, fatG: 0.9, carbsG: 40.4, sodiumMg: 2 },
  { name: "Pinto beans, cooked", brand: null, servingQty: 1, servingUnit: "cup", calories: 245, proteinG: 15.4, fiberG: 15.4, sugarG: 0.6, fatG: 1.1, carbsG: 44.8, sodiumMg: 2 },
  { name: "Lentils, cooked", brand: null, servingQty: 1, servingUnit: "cup", calories: 230, proteinG: 17.9, fiberG: 15.6, sugarG: 3.6, fatG: 0.8, carbsG: 39.9, sodiumMg: 4 },
  { name: "Edamame, cooked", brand: null, servingQty: 1, servingUnit: "cup", calories: 189, proteinG: 16.9, fiberG: 8.1, sugarG: 3.4, fatG: 8.1, carbsG: 15.6, sodiumMg: 9 },
  { name: "Refried beans", brand: null, servingQty: 0.5, servingUnit: "cup", calories: 118, proteinG: 6.9, fiberG: 6.7, sugarG: 0.7, fatG: 1.2, carbsG: 19.6, sodiumMg: 377 },

  // Nuts & seeds
  { name: "Walnuts", brand: null, servingQty: 1, servingUnit: "oz", calories: 185, proteinG: 4.3, fiberG: 1.9, sugarG: 0.7, fatG: 18.5, carbsG: 3.9, sodiumMg: 1 },
  { name: "Cashews", brand: null, servingQty: 1, servingUnit: "oz", calories: 157, proteinG: 5.2, fiberG: 0.9, sugarG: 1.7, fatG: 12.4, carbsG: 8.6, sodiumMg: 3 },
  { name: "Pistachios", brand: null, servingQty: 1, servingUnit: "oz", calories: 159, proteinG: 5.7, fiberG: 3, sugarG: 2.2, fatG: 12.8, carbsG: 7.7, sodiumMg: 0 },
  { name: "Pecans", brand: null, servingQty: 1, servingUnit: "oz", calories: 196, proteinG: 2.6, fiberG: 2.7, sugarG: 1.1, fatG: 20.4, carbsG: 3.9, sodiumMg: 0 },
  { name: "Sunflower seeds", brand: null, servingQty: 1, servingUnit: "oz", calories: 164, proteinG: 5.8, fiberG: 3, sugarG: 0.7, fatG: 14.1, carbsG: 6.4, sodiumMg: 1 },
  { name: "Chia seeds", brand: null, servingQty: 1, servingUnit: "tbsp", calories: 58, proteinG: 2, fiberG: 4.9, sugarG: 0, fatG: 3.7, carbsG: 5, sodiumMg: 1 },
  { name: "Peanuts", brand: null, servingQty: 1, servingUnit: "oz", calories: 161, proteinG: 7.3, fiberG: 2.4, sugarG: 1.3, fatG: 14, carbsG: 4.6, sodiumMg: 5 },

  // Fruits
  { name: "Grapes", brand: null, servingQty: 1, servingUnit: "cup", calories: 104, proteinG: 1.1, fiberG: 1.4, sugarG: 23, fatG: 0.2, carbsG: 27.3, sodiumMg: 3 },
  { name: "Watermelon", brand: null, servingQty: 1, servingUnit: "cup", calories: 46, proteinG: 0.9, fiberG: 0.6, sugarG: 9.4, fatG: 0.2, carbsG: 11.5, sodiumMg: 2 },
  { name: "Pineapple", brand: null, servingQty: 1, servingUnit: "cup", calories: 82, proteinG: 0.9, fiberG: 2.3, sugarG: 16, fatG: 0.2, carbsG: 21.6, sodiumMg: 2 },
  { name: "Mango", brand: null, servingQty: 1, servingUnit: "cup", calories: 99, proteinG: 1.4, fiberG: 2.6, sugarG: 22.5, fatG: 0.6, carbsG: 24.7, sodiumMg: 2 },
  { name: "Kiwi", brand: null, servingQty: 1, servingUnit: "each", calories: 42, proteinG: 0.8, fiberG: 2.1, sugarG: 6.2, fatG: 0.4, carbsG: 10.1, sodiumMg: 2 },
  { name: "Pear", brand: null, servingQty: 1, servingUnit: "each", calories: 101, proteinG: 0.6, fiberG: 5.5, sugarG: 17, fatG: 0.2, carbsG: 27, sodiumMg: 2 },
  { name: "Peach", brand: null, servingQty: 1, servingUnit: "each", calories: 59, proteinG: 1.4, fiberG: 2.3, sugarG: 12.9, fatG: 0.4, carbsG: 14.3, sodiumMg: 0 },
  { name: "Cherries", brand: null, servingQty: 1, servingUnit: "cup", calories: 97, proteinG: 1.6, fiberG: 3.2, sugarG: 19.7, fatG: 0.3, carbsG: 25, sodiumMg: 0 },
  { name: "Cantaloupe", brand: null, servingQty: 1, servingUnit: "cup", calories: 53, proteinG: 1.3, fiberG: 1.4, sugarG: 12.7, fatG: 0.3, carbsG: 12.7, sodiumMg: 25 },
  { name: "Raspberries", brand: null, servingQty: 1, servingUnit: "cup", calories: 64, proteinG: 1.5, fiberG: 8, sugarG: 5.4, fatG: 0.8, carbsG: 14.7, sodiumMg: 1 },
  { name: "Grapefruit", brand: null, servingQty: 0.5, servingUnit: "each", calories: 52, proteinG: 0.9, fiberG: 2, sugarG: 8.5, fatG: 0.2, carbsG: 13.1, sodiumMg: 0 },
  { name: "Raisins", brand: null, servingQty: 1, servingUnit: "oz", calories: 85, proteinG: 0.9, fiberG: 1, sugarG: 17.6, fatG: 0.1, carbsG: 22.5, sodiumMg: 3 },
  { name: "Dates", brand: null, servingQty: 2, servingUnit: "each", calories: 133, proteinG: 0.9, fiberG: 3.2, sugarG: 27.4, fatG: 0.1, carbsG: 36, sodiumMg: 1 },

  // Vegetables
  { name: "Cauliflower, cooked", brand: null, servingQty: 1, servingUnit: "cup", calories: 29, proteinG: 2.3, fiberG: 2.9, sugarG: 2.6, fatG: 0.6, carbsG: 5.3, sodiumMg: 19 },
  { name: "Zucchini, cooked", brand: null, servingQty: 1, servingUnit: "cup", calories: 27, proteinG: 2, fiberG: 2.5, sugarG: 4.2, fatG: 0.1, carbsG: 5.5, sodiumMg: 5 },
  { name: "Green beans, cooked", brand: null, servingQty: 1, servingUnit: "cup", calories: 44, proteinG: 2.4, fiberG: 4, sugarG: 3.3, fatG: 0.4, carbsG: 9.9, sodiumMg: 1 },
  { name: "Asparagus, cooked", brand: null, servingQty: 1, servingUnit: "cup", calories: 40, proteinG: 4.3, fiberG: 3.6, sugarG: 2.5, fatG: 0.4, carbsG: 7.4, sodiumMg: 26 },
  { name: "Brussels sprouts, cooked", brand: null, servingQty: 1, servingUnit: "cup", calories: 56, proteinG: 4, fiberG: 4.1, sugarG: 3.2, fatG: 0.8, carbsG: 11.1, sodiumMg: 33 },
  { name: "Kale, raw", brand: null, servingQty: 1, servingUnit: "cup", calories: 33, proteinG: 2.9, fiberG: 1.3, sugarG: 0.5, fatG: 0.6, carbsG: 6, sodiumMg: 29 },
  { name: "Romaine lettuce", brand: null, servingQty: 1, servingUnit: "cup", calories: 8, proteinG: 0.6, fiberG: 1, sugarG: 0.5, fatG: 0.1, carbsG: 1.5, sodiumMg: 4 },
  { name: "Onion, chopped", brand: null, servingQty: 0.5, servingUnit: "cup", calories: 32, proteinG: 0.9, fiberG: 1.4, sugarG: 4.2, fatG: 0.1, carbsG: 7.5, sodiumMg: 3 },
  { name: "Garlic", brand: null, servingQty: 1, servingUnit: "each", calories: 4, proteinG: 0.2, fiberG: 0.1, sugarG: 0.1, fatG: 0, carbsG: 1, sodiumMg: 0 },
  { name: "Mushrooms, sliced", brand: null, servingQty: 1, servingUnit: "cup", calories: 15, proteinG: 2.2, fiberG: 0.7, sugarG: 1.4, fatG: 0.2, carbsG: 2.3, sodiumMg: 4 },
  { name: "Corn, cooked", brand: null, servingQty: 1, servingUnit: "cup", calories: 143, proteinG: 4.7, fiberG: 4.6, sugarG: 6.4, fatG: 2.2, carbsG: 31, sodiumMg: 15 },
  { name: "Peas, cooked", brand: null, servingQty: 1, servingUnit: "cup", calories: 134, proteinG: 8.6, fiberG: 8.8, sugarG: 8.6, fatG: 0.4, carbsG: 25, sodiumMg: 5 },
  { name: "Butternut squash, cooked", brand: null, servingQty: 1, servingUnit: "cup", calories: 82, proteinG: 1.8, fiberG: 6.6, sugarG: 3.5, fatG: 0.2, carbsG: 21.5, sodiumMg: 8 },
  { name: "Celery", brand: null, servingQty: 1, servingUnit: "cup", calories: 16, proteinG: 0.7, fiberG: 1.6, sugarG: 1.8, fatG: 0.2, carbsG: 3, sodiumMg: 81 },

  // Condiments & sauces
  { name: "Ketchup", brand: null, servingQty: 1, servingUnit: "tbsp", calories: 19, proteinG: 0.2, fiberG: 0.2, sugarG: 4, fatG: 0, carbsG: 4.7, sodiumMg: 154 },
  { name: "Mustard", brand: null, servingQty: 1, servingUnit: "tbsp", calories: 9, proteinG: 0.6, fiberG: 0.3, sugarG: 0.2, fatG: 0.5, carbsG: 0.7, sodiumMg: 175 },
  { name: "Mayonnaise", brand: null, servingQty: 1, servingUnit: "tbsp", calories: 94, proteinG: 0.1, fiberG: 0, sugarG: 0.1, fatG: 10.3, carbsG: 0.1, sodiumMg: 88 },
  { name: "Soy sauce", brand: null, servingQty: 1, servingUnit: "tbsp", calories: 8, proteinG: 1.3, fiberG: 0.1, sugarG: 0.1, fatG: 0, carbsG: 0.8, sodiumMg: 902 },
  { name: "Salsa", brand: null, servingQty: 2, servingUnit: "tbsp", calories: 9, proteinG: 0.4, fiberG: 0.5, sugarG: 1.4, fatG: 0.1, carbsG: 2, sodiumMg: 125 },
  { name: "Ranch dressing", brand: null, servingQty: 2, servingUnit: "tbsp", calories: 129, proteinG: 0.4, fiberG: 0, sugarG: 1.2, fatG: 13.4, carbsG: 1.8, sodiumMg: 270 },
  { name: "BBQ sauce", brand: null, servingQty: 2, servingUnit: "tbsp", calories: 52, proteinG: 0.3, fiberG: 0.2, sugarG: 11, fatG: 0.2, carbsG: 13, sodiumMg: 396 },
  { name: "Honey", brand: null, servingQty: 1, servingUnit: "tbsp", calories: 64, proteinG: 0.1, fiberG: 0, sugarG: 17.3, fatG: 0, carbsG: 17.3, sodiumMg: 1 },
  { name: "Maple syrup", brand: null, servingQty: 1, servingUnit: "tbsp", calories: 52, proteinG: 0, fiberG: 0, sugarG: 12, fatG: 0, carbsG: 13.4, sodiumMg: 2 },
  { name: "Guacamole", brand: null, servingQty: 2, servingUnit: "tbsp", calories: 45, proteinG: 0.5, fiberG: 1.8, sugarG: 0.1, fatG: 4.2, carbsG: 2.4, sodiumMg: 75 },
  { name: "Marinara sauce", brand: null, servingQty: 0.5, servingUnit: "cup", calories: 70, proteinG: 2, fiberG: 2, sugarG: 8, fatG: 2, carbsG: 11, sodiumMg: 480 },

  // Beverages
  { name: "Orange juice", brand: null, servingQty: 1, servingUnit: "cup", calories: 112, proteinG: 1.7, fiberG: 0.5, sugarG: 20.8, fatG: 0.5, carbsG: 25.8, sodiumMg: 2 },
  { name: "Apple juice", brand: null, servingQty: 1, servingUnit: "cup", calories: 114, proteinG: 0.2, fiberG: 0.2, sugarG: 24, fatG: 0.3, carbsG: 28, sodiumMg: 10 },
  { name: "Coffee, black", brand: null, servingQty: 1, servingUnit: "cup", calories: 2, proteinG: 0.3, fiberG: 0, sugarG: 0, fatG: 0, carbsG: 0, sodiumMg: 5 },
  { name: "Coffee with cream and sugar", brand: null, servingQty: 1, servingUnit: "cup", calories: 45, proteinG: 0.5, fiberG: 0, sugarG: 4, fatG: 2.5, carbsG: 5, sodiumMg: 10 },
  { name: "Cola", brand: null, servingQty: 12, servingUnit: "oz", calories: 140, proteinG: 0, fiberG: 0, sugarG: 39, fatG: 0, carbsG: 39, sodiumMg: 45 },
  { name: "Diet soda", brand: null, servingQty: 12, servingUnit: "oz", calories: 0, proteinG: 0, fiberG: 0, sugarG: 0, fatG: 0, carbsG: 0, sodiumMg: 40 },
  { name: "Beer", brand: null, servingQty: 12, servingUnit: "oz", calories: 153, proteinG: 1.6, fiberG: 0, sugarG: 0, fatG: 0, carbsG: 13, sodiumMg: 14 },
  { name: "Red wine", brand: null, servingQty: 5, servingUnit: "oz", calories: 125, proteinG: 0.1, fiberG: 0, sugarG: 0.9, fatG: 0, carbsG: 3.8, sodiumMg: 6 },
  { name: "Protein shake, ready-to-drink", brand: null, servingQty: 1, servingUnit: "each", calories: 160, proteinG: 30, fiberG: 1, sugarG: 1, fatG: 2.5, carbsG: 6, sodiumMg: 230 },

  // Snacks & sweets
  { name: "Potato chips", brand: null, servingQty: 1, servingUnit: "oz", calories: 152, proteinG: 2, fiberG: 1.4, sugarG: 0.1, fatG: 9.8, carbsG: 15, sodiumMg: 168 },
  { name: "Tortilla chips", brand: null, servingQty: 1, servingUnit: "oz", calories: 140, proteinG: 2, fiberG: 1.5, sugarG: 0.2, fatG: 7, carbsG: 19, sodiumMg: 150 },
  { name: "Pretzels", brand: null, servingQty: 1, servingUnit: "oz", calories: 108, proteinG: 2.6, fiberG: 0.8, sugarG: 0.5, fatG: 0.8, carbsG: 22.5, sodiumMg: 385 },
  { name: "Granola bar", brand: null, servingQty: 1, servingUnit: "each", calories: 120, proteinG: 2.5, fiberG: 1.5, sugarG: 7, fatG: 4, carbsG: 20, sodiumMg: 65 },
  { name: "Protein bar", brand: null, servingQty: 1, servingUnit: "each", calories: 200, proteinG: 20, fiberG: 3, sugarG: 5, fatG: 7, carbsG: 22, sodiumMg: 200 },
  { name: "Dark chocolate", brand: null, servingQty: 1, servingUnit: "oz", calories: 170, proteinG: 2.2, fiberG: 3.1, sugarG: 6.8, fatG: 12.1, carbsG: 13, sodiumMg: 6 },
  { name: "Milk chocolate", brand: null, servingQty: 1, servingUnit: "oz", calories: 152, proteinG: 2.1, fiberG: 0.9, sugarG: 15.4, fatG: 8.5, carbsG: 16.6, sodiumMg: 23 },
  { name: "Chocolate chip cookie", brand: null, servingQty: 1, servingUnit: "each", calories: 78, proteinG: 0.9, fiberG: 0.4, sugarG: 5, fatG: 3.7, carbsG: 10.3, sodiumMg: 58 },
  { name: "Brownie", brand: null, servingQty: 1, servingUnit: "each", calories: 132, proteinG: 1.7, fiberG: 0.7, sugarG: 12, fatG: 5.9, carbsG: 18.5, sodiumMg: 82 },
  { name: "Glazed donut", brand: null, servingQty: 1, servingUnit: "each", calories: 239, proteinG: 3.3, fiberG: 0.8, sugarG: 13, fatG: 13.3, carbsG: 26.6, sodiumMg: 249 },
  { name: "Blueberry muffin", brand: null, servingQty: 1, servingUnit: "each", calories: 313, proteinG: 5, fiberG: 1.5, sugarG: 21, fatG: 12, carbsG: 46, sodiumMg: 336 },
  { name: "Gummy bears", brand: null, servingQty: 1, servingUnit: "oz", calories: 100, proteinG: 2, fiberG: 0, sugarG: 16, fatG: 0, carbsG: 22, sodiumMg: 10 },

  // Fast food staples
  { name: "Cheeseburger", brand: null, servingQty: 1, servingUnit: "each", calories: 300, proteinG: 15, fiberG: 1.5, sugarG: 6, fatG: 12, carbsG: 33, sodiumMg: 680 },
  { name: "Chicken nuggets", brand: null, servingQty: 6, servingUnit: "each", calories: 280, proteinG: 14, fiberG: 1, sugarG: 0, fatG: 18, carbsG: 16, sodiumMg: 540 },
  { name: "Cheese pizza slice", brand: null, servingQty: 1, servingUnit: "slice", calories: 285, proteinG: 12.2, fiberG: 2.5, sugarG: 3.8, fatG: 10.4, carbsG: 35.7, sodiumMg: 640 },
  { name: "Pepperoni pizza slice", brand: null, servingQty: 1, servingUnit: "slice", calories: 313, proteinG: 13.3, fiberG: 2, sugarG: 3.7, fatG: 13.9, carbsG: 34.4, sodiumMg: 740 },
  { name: "Chicken burrito", brand: null, servingQty: 1, servingUnit: "each", calories: 550, proteinG: 30, fiberG: 6, sugarG: 4, fatG: 20, carbsG: 62, sodiumMg: 1300 },
  { name: "Beef taco", brand: null, servingQty: 1, servingUnit: "each", calories: 170, proteinG: 8, fiberG: 2, sugarG: 1, fatG: 9, carbsG: 13, sodiumMg: 310 },
  { name: "Turkey sub sandwich, 6 inch", brand: null, servingQty: 1, servingUnit: "each", calories: 280, proteinG: 18, fiberG: 4, sugarG: 6, fatG: 3.5, carbsG: 46, sodiumMg: 810 },
  { name: "Fried chicken breast", brand: null, servingQty: 1, servingUnit: "each", calories: 364, proteinG: 34.8, fiberG: 0.3, sugarG: 0, fatG: 21.9, carbsG: 8.6, sodiumMg: 653 },

  // Baking & oils
  { name: "White sugar", brand: null, servingQty: 1, servingUnit: "tbsp", calories: 49, proteinG: 0, fiberG: 0, sugarG: 12.6, fatG: 0, carbsG: 12.6, sodiumMg: 0 },
  { name: "All-purpose flour", brand: null, servingQty: 0.25, servingUnit: "cup", calories: 114, proteinG: 3.3, fiberG: 1, sugarG: 0.1, fatG: 0.3, carbsG: 23.9, sodiumMg: 1 },
  { name: "Vegetable oil", brand: null, servingQty: 1, servingUnit: "tbsp", calories: 120, proteinG: 0, fiberG: 0, sugarG: 0, fatG: 14, carbsG: 0, sodiumMg: 0 },
  { name: "Coconut oil", brand: null, servingQty: 1, servingUnit: "tbsp", calories: 121, proteinG: 0, fiberG: 0, sugarG: 0, fatG: 13.5, carbsG: 0, sodiumMg: 0 },
];

export async function importStarterFoods(userId: string): Promise<FoodItem[]> {
  // Idempotent: safe to click more than once. Skips any starter food the
  // user already has in their library, matched case-insensitively by name
  // (so re-clicking, or clicking after manually adding "Banana" already,
  // never creates duplicates).
  const { data: existing, error: fetchError } = await supabase
    .from("food_items")
    .select("name")
    .eq("user_id", userId);
  if (fetchError) {
    console.error("Failed to check existing foods before starter import:", fetchError.message);
  }
  const existingNames = new Set((existing ?? []).map((r: any) => String(r.name).trim().toLowerCase()));

  const created: FoodItem[] = [];
  for (const f of STARTER_FOODS) {
    if (existingNames.has(f.name.trim().toLowerCase())) continue;
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

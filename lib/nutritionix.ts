// lib/nutritionix.ts
//
// Nutritionix's natural-language endpoint is used as the primary search
// instead of a plain keyword search: it parses queries like "egg" or
// "greek yogurt" and returns nutrition already expressed in a natural US
// household serving (e.g. "1 large egg", "6 oz") rather than always
// normalizing to 100g like a typical nutrition database. That directly
// answers the ask for US-measurement, by-item defaults.
//
// Requires a free App ID + App Key from https://developer.nutritionix.com.

import { FoodSearchResult } from "./usdaFoodData";

export interface NutritionixResult extends FoodSearchResult {
  servingQty: number;
  servingUnit: string;
  servingWeightGrams: number | null;
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 10) / 10 : 0;
}

export async function searchFoods(query: string): Promise<NutritionixResult[]> {
  if (!query.trim()) return [];

  const appId = process.env.NEXT_PUBLIC_NUTRITIONIX_APP_ID;
  const appKey = process.env.NEXT_PUBLIC_NUTRITIONIX_APP_KEY;
  if (!appId || !appKey) {
    throw new Error(
      "Nutritionix isn't configured yet — add NEXT_PUBLIC_NUTRITIONIX_APP_ID and NEXT_PUBLIC_NUTRITIONIX_APP_KEY to .env.local."
    );
  }

  const res = await fetch("https://trackapi.nutritionix.com/v2/natural/nutrients", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-app-id": appId,
      "x-app-key": appKey,
    },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new Error("Nutritionix App ID/Key look invalid — double check .env.local.");
    }
    if (res.status === 404) return []; // no match parsed from the query
    throw new Error("Food search failed");
  }

  const data = await res.json();
  const foods: any[] = data.foods ?? [];

  return foods.map((f) => ({
    externalId: String(f.nix_item_id ?? f.food_name ?? ""),
    name: f.food_name ?? "Unknown food",
    brand: f.brand_name ?? null,
    calories: num(f.nf_calories),
    proteinG: num(f.nf_protein),
    fiberG: num(f.nf_dietary_fiber),
    sugarG: num(f.nf_sugars),
    fatG: num(f.nf_total_fat),
    carbsG: num(f.nf_total_carbohydrate),
    sodiumMg: num(f.nf_sodium),
    servingQty: num(f.serving_qty) || 1,
    servingUnit: f.serving_unit || "serving",
    servingWeightGrams: f.serving_weight_grams != null ? num(f.serving_weight_grams) : null,
  }));
}

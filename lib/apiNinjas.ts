// lib/apiNinjas.ts
//
// API Ninjas (api-ninjas.com) absorbed CalorieNinjas in 2025. Free tier
// confirmed: sign up at api-ninjas.com/register, no credit card, free for
// personal/non-commercial use. Natural-language query, single X-Api-Key
// header — this replaces Nutritionix, which turned out to require a paid
// plan with no free option.
//
// Unlike Nutritionix, this endpoint reports nutrition for the resolved
// serving in grams rather than a natural-language unit string ("1 large
// egg"). Values are rescaled to per-100g here so results are consistent
// with USDA's convention and safe to feed through the same save logic.

import { FoodSearchResult } from "./usdaFoodData";

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 10) / 10 : 0;
}

export async function searchFoods(query: string): Promise<FoodSearchResult[]> {
  if (!query.trim()) return [];

  const apiKey = process.env.NEXT_PUBLIC_API_NINJAS_KEY;
  if (!apiKey) {
    throw new Error(
      "This food source isn't configured yet — add NEXT_PUBLIC_API_NINJAS_KEY to .env.local (see .env.local.example)."
    );
  }

  const res = await fetch(`https://api.api-ninjas.com/v1/nutrition?query=${encodeURIComponent(query)}`, {
    headers: { "X-Api-Key": apiKey },
  });

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new Error("API Ninjas key looks invalid — double check .env.local.");
    }
    throw new Error("Food search failed");
  }

  const items: any[] = await res.json();

  return items.map((f) => {
    const servingG = num(f.serving_size_g) || 100;
    const scale = 100 / servingG;
    // Guard each field explicitly rather than relying on undefined * scale
    // happening to coerce to 0 through num()'s NaN check — API Ninjas can
    // omit fields for foods it has thin data on, and this keeps that
    // distinguishable in future debugging instead of silently matching
    // "genuinely zero."
    return {
      externalId: `${f.name}-${servingG}`,
      name: f.name ?? "Unknown food",
      brand: null,
      calories: num((f.calories ?? 0) * scale),
      proteinG: num((f.protein_g ?? 0) * scale),
      fiberG: num((f.fiber_g ?? 0) * scale),
      sugarG: num((f.sugar_g ?? 0) * scale),
      fatG: num((f.fat_total_g ?? 0) * scale),
      carbsG: num((f.carbohydrates_total_g ?? 0) * scale),
      sodiumMg: num((f.sodium_mg ?? 0) * scale),
    };
  });
}

// lib/openFoodFacts.ts
//
// Open Food Facts (openfoodfacts.org) — free, no API key needed. Weaker
// than USDA for general "chicken breast" style search, but stronger for
// specific packaged/branded products (regional snacks, specific SKUs) since
// it's built from real product scans. Offered as a second source alongside
// USDA in the Search tab, not a replacement for it.

import { FoodSearchResult } from "./usdaFoodData";

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 10) / 10 : 0;
}

export async function searchFoods(query: string): Promise<FoodSearchResult[]> {
  if (!query.trim()) return [];

  const url =
    `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}` +
    `&search_simple=1&action=process&json=1&page_size=15&fields=code,product_name,brands,nutriments`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("Food search failed");
  const data = await res.json();

  const products: any[] = data.products ?? [];
  return products
    .filter((p) => p.product_name)
    .map((p) => {
      const n = p.nutriments ?? {};
      return {
        externalId: p.code ?? "",
        name: p.product_name,
        brand: p.brands ? p.brands.split(",")[0].trim() : null,
        calories: num(n["energy-kcal_100g"]),
        proteinG: num(n["proteins_100g"]),
        fiberG: num(n["fiber_100g"]),
        sugarG: num(n["sugars_100g"]),
        fatG: num(n["fat_100g"]),
        carbsG: num(n["carbohydrates_100g"]),
        sodiumMg: num(n["sodium_100g"]) * 1000, // OFF reports sodium in g
      };
    });
}

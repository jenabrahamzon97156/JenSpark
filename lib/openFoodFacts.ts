// lib/openFoodFacts.ts
//
// Open Food Facts (openfoodfacts.org) is a free, open, community-run
// nutrition database with no API key or rate-limit signup required — a
// reasonable default for a personal app. Results are per-100g by default,
// which is why searchResultToFoodItem below normalizes everything to a
// "100 g" serving; the person can adjust the serving size after saving it
// to their own food library.

export interface OffSearchResult {
  externalId: string;
  name: string;
  brand: string | null;
  calories: number;
  proteinG: number;
  fiberG: number;
  sugarG: number;
  fatG: number;
  carbsG: number;
  sodiumMg: number;
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 10) / 10 : 0;
}

export async function searchFoods(query: string): Promise<OffSearchResult[]> {
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

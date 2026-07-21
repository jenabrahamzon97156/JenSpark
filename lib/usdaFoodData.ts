// lib/usdaFoodData.ts
//
// USDA FoodData Central (fdc.nal.usda.gov) — the U.S. government's food
// composition database. Search quality for everyday foods (chicken breast,
// banana, etc.) is noticeably better than Open Food Facts, which is stronger
// for scanned packaged/branded barcodes than for general search. Requires a
// free API key from api.data.gov (30-second signup, no cost) — see
// .env.local.example for where it goes.
//
// Uses the same result shape the app's food-search UI already expects, so
// this is a drop-in for the search source.

export interface FoodSearchResult {
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

const NUTRIENT_NAMES: Record<string, keyof Omit<FoodSearchResult, "externalId" | "name" | "brand">> = {
  Energy: "calories",
  Protein: "proteinG",
  "Fiber, total dietary": "fiberG",
  "Sugars, total including NLEA": "sugarG",
  "Sugars, total": "sugarG",
  "Total lipid (fat)": "fatG",
  "Carbohydrate, by difference": "carbsG",
  "Sodium, Na": "sodiumMg",
};

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 10) / 10 : 0;
}

export async function searchFoods(query: string): Promise<FoodSearchResult[]> {
  if (!query.trim()) return [];

  const apiKey = process.env.NEXT_PUBLIC_USDA_API_KEY;
  if (!apiKey) {
    throw new Error(
      "USDA search isn't configured yet — add NEXT_PUBLIC_USDA_API_KEY to .env.local (see .env.local.example)."
    );
  }

  const url =
    `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(apiKey)}` +
    `&query=${encodeURIComponent(query)}&pageSize=15&dataType=Foundation,SR%20Legacy,Branded`;

  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 403) throw new Error("USDA API key looks invalid — double check .env.local.");
    throw new Error("Food search failed");
  }
  const data = await res.json();

  const foods: any[] = data.foods ?? [];
  return foods.map((f) => {
    // foodNutrients here is always per 100g, even for branded foods (whose
    // per-serving label values live in a separate labelNutrients field we
    // don't use, to keep every result on the same 100g basis).
    const result: FoodSearchResult = {
      externalId: String(f.fdcId ?? ""),
      name: f.description ?? "Unknown food",
      brand: f.brandOwner || f.brandName || null,
      calories: 0,
      proteinG: 0,
      fiberG: 0,
      sugarG: 0,
      fatG: 0,
      carbsG: 0,
      sodiumMg: 0,
    };
    for (const n of f.foodNutrients ?? []) {
      const key = NUTRIENT_NAMES[n.nutrientName];
      if (key) result[key] = num(n.value);
    }
    return result;
  });
}

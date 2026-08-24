// lib/barcodeLookup.ts
//
// Open Food Facts (openfoodfacts.org) — a free, community-maintained barcode
// database with no API key or signup required. It's the natural fit for
// scanned packaged products specifically (its strength vs. USDA, which is
// better for general/unpackaged food search — see the note in
// usdaFoodData.ts). Coverage is strongest for products sold in the US/EU;
// a "not found" result is common for less common or regional products, and
// callers should offer a manual-entry fallback when that happens.

import { FoodSearchResult } from "./usdaFoodData";

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 10) / 10 : 0;
}

export async function lookupBarcode(barcode: string): Promise<FoodSearchResult | null> {
  const code = barcode.trim();
  if (!code) return null;

  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Barcode lookup failed (Open Food Facts returned ${res.status}).`);
  }
  const data = await res.json();

  // status 0 = "product not found in the database" — a normal, common
  // outcome (not an error), not every product is in Open Food Facts.
  if (data.status !== 1 || !data.product) return null;

  const p = data.product;
  const n = p.nutriments ?? {};

  // Open Food Facts reports per-100g values directly (matching how this app
  // stores everything else), except sodium which comes in grams, not mg.
  return {
    externalId: code,
    name: p.product_name || p.generic_name || "Unknown product",
    brand: p.brands ? p.brands.split(",")[0].trim() : null,
    calories: num(n["energy-kcal_100g"]),
    proteinG: num(n["proteins_100g"]),
    fiberG: num(n["fiber_100g"]),
    sugarG: num(n["sugars_100g"]),
    fatG: num(n["fat_100g"]),
    carbsG: num(n["carbohydrates_100g"]),
    sodiumMg: num((n["sodium_100g"] ?? 0) * 1000),
  };
}

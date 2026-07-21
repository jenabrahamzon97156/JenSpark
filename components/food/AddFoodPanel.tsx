"use client";

// components/food/AddFoodPanel.tsx

import { useState } from "react";
import { FoodItem, MealSlot, MealWithItems, RecipeWithIngredients } from "@/lib/types";
import { searchFoods as searchUsda, FoodSearchResult } from "@/lib/usdaFoodData";
import { searchFoods as searchOff } from "@/lib/openFoodFacts";
import { MEAL_SLOT_LABELS, MEAL_SLOT_ORDER, sumFoods } from "@/lib/foodStore";

type Tab = "search" | "myFoods" | "meals" | "recipes" | "manual";
type Source = "usda" | "off";

// A reasonable time-of-day default so most people don't have to change it —
// still fully overridable via the pill row.
function defaultMealSlot(): MealSlot {
  const hour = new Date().getHours();
  if (hour < 10) return "breakfast";
  if (hour < 11) return "morning_snack";
  if (hour < 14) return "lunch";
  if (hour < 17) return "afternoon_snack";
  if (hour < 20) return "dinner";
  return "evening_snack";
}

function QuantityPicker({
  label,
  onConfirm,
  onCancel,
}: {
  label: string;
  onConfirm: (qty: number) => void;
  onCancel: () => void;
}) {
  const [qty, setQty] = useState("1");
  return (
    <div className="rounded-lg border border-[#0D9488] bg-[#0D9488]/5 p-3 mt-2">
      <p className="text-xs text-[#6B7280] mb-2">{label}</p>
      <div className="flex gap-2">
        <input
          type="number"
          inputMode="decimal"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          className="flex-1 bg-white border border-[#E5E7EB] rounded-md px-3 py-2 text-sm font-mono text-[#1D2027] focus:outline-none focus:border-[#0D9488]"
        />
        <button
          onClick={() => onConfirm(Number(qty) || 1)}
          className="px-4 rounded-md bg-[#0D9488] text-white text-sm font-medium"
        >
          Add
        </button>
        <button onClick={onCancel} className="px-3 rounded-md border border-[#E5E7EB] text-sm text-[#6B7280]">
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function AddFoodPanel({
  myFoods,
  meals,
  recipes,
  onLogFood,
  onLogMeal,
  onLogRecipe,
  onSaveSearchResult,
  onCreateManualFood,
  onClose,
}: {
  myFoods: FoodItem[];
  meals: MealWithItems[];
  recipes: RecipeWithIngredients[];
  onLogFood: (food: FoodItem, quantity: number, mealSlot: MealSlot, notes: string | null) => void;
  onLogMeal: (meal: MealWithItems, mealSlot: MealSlot, notes: string | null) => void;
  onLogRecipe: (recipe: RecipeWithIngredients, servingsEaten: number, mealSlot: MealSlot, notes: string | null) => void;
  onSaveSearchResult: (result: FoodSearchResult) => Promise<FoodItem | null>;
  onCreateManualFood: (food: Omit<FoodItem, "id">, mealSlot: MealSlot, notes: string | null) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>("search");
  const [mealSlot, setMealSlot] = useState<MealSlot>(defaultMealSlot());
  const [notes, setNotes] = useState("");
  const [source, setSource] = useState<Source>("usda");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [pickingFood, setPickingFood] = useState<FoodItem | null>(null);
  const [pickingResult, setPickingResult] = useState<FoodSearchResult | null>(null);
  const [pickingRecipe, setPickingRecipe] = useState<RecipeWithIngredients | null>(null);

  const [manual, setManual] = useState({
    name: "",
    servingQty: "1",
    servingUnit: "serving",
    calories: "",
    proteinG: "",
    fiberG: "",
    sugarG: "",
    fatG: "",
    carbsG: "",
    sodiumMg: "",
  });

  const runSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setSearchError(null);
    setHasSearched(true);
    try {
      const r = await (source === "usda" ? searchUsda(query) : searchOff(query));
      setResults(r);
    } catch (e) {
      setResults([]);
      setSearchError(e instanceof Error ? e.message : "Couldn't reach the food database. Check your connection and try again.");
    }
    setSearching(false);
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "search", label: "Search" },
    { id: "myFoods", label: "My Foods" },
    { id: "meals", label: "Meals" },
    { id: "recipes", label: "Recipes" },
    { id: "manual", label: "Manual" },
  ];

  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-[#1D2027]">Add food</p>
        <button onClick={onClose} className="text-[#9CA3AF] text-sm">
          {"\u00d7"}
        </button>
      </div>

      <p className="text-[10px] text-[#6B7280] mb-1.5">Add to</p>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {MEAL_SLOT_ORDER.map((slot) => (
          <button
            key={slot}
            onClick={() => setMealSlot(slot)}
            className={`text-[11px] px-2.5 py-1 rounded-full border ${
              mealSlot === slot ? "bg-[#0D9488] text-white border-[#0D9488]" : "border-[#E5E7EB] text-[#6B7280]"
            }`}
          >
            {MEAL_SLOT_LABELS[slot]}
          </button>
        ))}
      </div>

      <input
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes for this entry (optional)"
        className="w-full mb-3 bg-[#F7F8FA] border border-[#E5E7EB] rounded-md px-3 py-2 text-xs text-[#1D2027] focus:outline-none focus:border-[#0D9488]"
      />

      <div className="flex gap-1 mb-3 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`shrink-0 text-xs px-3 py-1.5 rounded-full border ${
              tab === t.id ? "bg-[#1D2027] text-white border-[#1D2027]" : "border-[#E5E7EB] text-[#6B7280]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "search" && (
        <div>
          <div className="flex gap-2 mb-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runSearch()}
              placeholder="Search foods, e.g. 'greek yogurt'"
              className="flex-1 bg-[#F7F8FA] border border-[#E5E7EB] rounded-md px-3 py-2 text-sm text-[#1D2027] focus:outline-none focus:border-[#0D9488]"
            />
            <button onClick={runSearch} className="px-4 rounded-md bg-[#0D9488] text-white text-sm font-medium">
              Go
            </button>
          </div>
          <div className="flex gap-1.5 mb-3">
            <button
              onClick={() => setSource("usda")}
              className={`text-[11px] px-2.5 py-1 rounded-full border ${
                source === "usda" ? "bg-[#1D2027] text-white border-[#1D2027]" : "border-[#E5E7EB] text-[#6B7280]"
              }`}
            >
              USDA (general foods)
            </button>
            <button
              onClick={() => setSource("off")}
              className={`text-[11px] px-2.5 py-1 rounded-full border ${
                source === "off" ? "bg-[#1D2027] text-white border-[#1D2027]" : "border-[#E5E7EB] text-[#6B7280]"
              }`}
            >
              Open Food Facts (packaged)
            </button>
          </div>
          {searching && <p className="text-sm text-[#6B7280]">Searching...</p>}
          {searchError && <p className="text-sm text-[#DC2626] mb-2">{searchError}</p>}
          <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
            {results.map((r, i) => (
              <div key={i} className="rounded-lg border border-[#E5E7EB] p-2.5">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm text-[#1D2027] truncate">{r.name}</p>
                    <p className="text-xs text-[#6B7280]">
                      {r.brand ? `${r.brand} \u00b7 ` : ""}
                      {r.calories} kcal / 100g
                    </p>
                  </div>
                  <button
                    onClick={() => setPickingResult(r)}
                    className="shrink-0 text-xs px-3 py-1 rounded-full bg-[#0D9488] text-white"
                  >
                    Add
                  </button>
                </div>
                {pickingResult === r && (
                  <QuantityPicker
                    label="Servings of 100g"
                    onConfirm={async (qty) => {
                      const saved = await onSaveSearchResult(r);
                      if (saved) onLogFood(saved, qty, mealSlot, notes || null);
                      setPickingResult(null);
                    }}
                    onCancel={() => setPickingResult(null)}
                  />
                )}
              </div>
            ))}
            {hasSearched && !searching && !searchError && results.length === 0 && (
              <div className="text-center py-3">
                <p className="text-sm text-[#6B7280] mb-2">No results in {source === "usda" ? "USDA" : "Open Food Facts"}.</p>
                <button
                  onClick={() => {
                    setManual((m) => ({ ...m, name: query }));
                    setTab("manual");
                  }}
                  className="text-xs text-[#0D9488] font-medium"
                >
                  Can't find it? Add "{query}" manually
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "myFoods" && (
        <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
          {myFoods.length === 0 && (
            <p className="text-sm text-[#6B7280] py-3 text-center">
              No saved foods yet — add one manually or from Search.
            </p>
          )}
          {myFoods.map((f) => (
            <div key={f.id} className="rounded-lg border border-[#E5E7EB] p-2.5">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm text-[#1D2027] truncate">{f.name}</p>
                  <p className="text-xs text-[#6B7280]">
                    {f.calories} kcal per {f.servingQty} {f.servingUnit}
                  </p>
                </div>
                <button
                  onClick={() => setPickingFood(f)}
                  className="shrink-0 text-xs px-3 py-1 rounded-full bg-[#0D9488] text-white"
                >
                  Add
                </button>
              </div>
              {pickingFood?.id === f.id && (
                <QuantityPicker
                  label={`Servings (1 = ${f.servingQty} ${f.servingUnit})`}
                  onConfirm={(qty) => {
                    onLogFood(f, qty, mealSlot, notes || null);
                    setPickingFood(null);
                  }}
                  onCancel={() => setPickingFood(null)}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "meals" && (
        <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
          {meals.length === 0 && (
            <p className="text-sm text-[#6B7280] py-3 text-center">
              No saved meals yet. Build one from the Meals &amp; Recipes manager below.
            </p>
          )}
          {meals.map((m) => {
            const totals = sumFoods(m.items.map((it) => ({ food: it.food, quantity: it.quantity })));
            return (
              <div key={m.id} className="rounded-lg border border-[#E5E7EB] p-2.5 flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#1D2027]">{m.name}</p>
                  <p className="text-xs text-[#6B7280]">
                    {Math.round(totals.calories)} kcal &middot; {m.items.length} items
                  </p>
                </div>
                <button
                  onClick={() => onLogMeal(m, mealSlot, notes || null)}
                  className="text-xs px-3 py-1 rounded-full bg-[#0D9488] text-white"
                >
                  Log meal
                </button>
              </div>
            );
          })}
        </div>
      )}

      {tab === "recipes" && (
        <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
          {recipes.length === 0 && (
            <p className="text-sm text-[#6B7280] py-3 text-center">
              No saved recipes yet. Build one from the Meals &amp; Recipes manager below.
            </p>
          )}
          {recipes.map((r) => {
            const totals = sumFoods(r.ingredients.map((it) => ({ food: it.food, quantity: it.quantity })));
            const perServing = Math.round(totals.calories / (r.servings || 1));
            return (
              <div key={r.id} className="rounded-lg border border-[#E5E7EB] p-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#1D2027]">{r.name}</p>
                    <p className="text-xs text-[#6B7280]">
                      {perServing} kcal/serving &middot; {r.servings} servings total
                    </p>
                  </div>
                  <button
                    onClick={() => setPickingRecipe(r)}
                    className="text-xs px-3 py-1 rounded-full bg-[#0D9488] text-white"
                  >
                    Add
                  </button>
                </div>
                {pickingRecipe?.id === r.id && (
                  <QuantityPicker
                    label="How many servings did you eat?"
                    onConfirm={(qty) => {
                      onLogRecipe(r, qty, mealSlot, notes || null);
                      setPickingRecipe(null);
                    }}
                    onCancel={() => setPickingRecipe(null)}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === "manual" && (
        <div className="flex flex-col gap-2">
          <input
            placeholder="Food name"
            value={manual.name}
            onChange={(e) => setManual({ ...manual, name: e.target.value })}
            className="bg-[#F7F8FA] border border-[#E5E7EB] rounded-md px-3 py-2 text-sm text-[#1D2027] focus:outline-none focus:border-[#0D9488]"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              placeholder="Serving qty"
              type="number"
              value={manual.servingQty}
              onChange={(e) => setManual({ ...manual, servingQty: e.target.value })}
              className="bg-[#F7F8FA] border border-[#E5E7EB] rounded-md px-3 py-2 text-sm text-[#1D2027] focus:outline-none focus:border-[#0D9488]"
            />
            <input
              placeholder="Unit (g, cup...)"
              value={manual.servingUnit}
              onChange={(e) => setManual({ ...manual, servingUnit: e.target.value })}
              className="bg-[#F7F8FA] border border-[#E5E7EB] rounded-md px-3 py-2 text-sm text-[#1D2027] focus:outline-none focus:border-[#0D9488]"
            />
          </div>
          <p className="text-[10px] text-[#6B7280] mt-1">Nutrition facts (per serving above)</p>
          <div className="grid grid-cols-3 gap-2">
            <input
              placeholder="Calories"
              type="number"
              value={manual.calories}
              onChange={(e) => setManual({ ...manual, calories: e.target.value })}
              className="bg-[#F7F8FA] border border-[#E5E7EB] rounded-md px-3 py-2 text-sm text-[#1D2027] focus:outline-none focus:border-[#0D9488]"
            />
            <input
              placeholder="Protein g"
              type="number"
              value={manual.proteinG}
              onChange={(e) => setManual({ ...manual, proteinG: e.target.value })}
              className="bg-[#F7F8FA] border border-[#E5E7EB] rounded-md px-3 py-2 text-sm text-[#1D2027] focus:outline-none focus:border-[#0D9488]"
            />
            <input
              placeholder="Fiber g"
              type="number"
              value={manual.fiberG}
              onChange={(e) => setManual({ ...manual, fiberG: e.target.value })}
              className="bg-[#F7F8FA] border border-[#E5E7EB] rounded-md px-3 py-2 text-sm text-[#1D2027] focus:outline-none focus:border-[#0D9488]"
            />
            <input
              placeholder="Sugar g"
              type="number"
              value={manual.sugarG}
              onChange={(e) => setManual({ ...manual, sugarG: e.target.value })}
              className="bg-[#F7F8FA] border border-[#E5E7EB] rounded-md px-3 py-2 text-sm text-[#1D2027] focus:outline-none focus:border-[#0D9488]"
            />
            <input
              placeholder="Fat g"
              type="number"
              value={manual.fatG}
              onChange={(e) => setManual({ ...manual, fatG: e.target.value })}
              className="bg-[#F7F8FA] border border-[#E5E7EB] rounded-md px-3 py-2 text-sm text-[#1D2027] focus:outline-none focus:border-[#0D9488]"
            />
            <input
              placeholder="Carbs g"
              type="number"
              value={manual.carbsG}
              onChange={(e) => setManual({ ...manual, carbsG: e.target.value })}
              className="bg-[#F7F8FA] border border-[#E5E7EB] rounded-md px-3 py-2 text-sm text-[#1D2027] focus:outline-none focus:border-[#0D9488]"
            />
            <input
              placeholder="Sodium mg"
              type="number"
              value={manual.sodiumMg}
              onChange={(e) => setManual({ ...manual, sodiumMg: e.target.value })}
              className="bg-[#F7F8FA] border border-[#E5E7EB] rounded-md px-3 py-2 text-sm text-[#1D2027] focus:outline-none focus:border-[#0D9488] col-span-2"
            />
          </div>
          <button
            onClick={() => {
              if (!manual.name.trim()) return;
              onCreateManualFood(
                {
                  name: manual.name.trim(),
                  brand: null,
                  servingQty: Number(manual.servingQty) || 1,
                  servingUnit: manual.servingUnit || "serving",
                  calories: Number(manual.calories) || 0,
                  proteinG: Number(manual.proteinG) || 0,
                  fiberG: Number(manual.fiberG) || 0,
                  sugarG: Number(manual.sugarG) || 0,
                  fatG: Number(manual.fatG) || 0,
                  carbsG: Number(manual.carbsG) || 0,
                  sodiumMg: Number(manual.sodiumMg) || 0,
                  source: "manual",
                  externalId: null,
                },
                mealSlot,
                notes || null
              );
              setManual({
                name: "",
                servingQty: "1",
                servingUnit: "serving",
                calories: "",
                proteinG: "",
                fiberG: "",
                sugarG: "",
                fatG: "",
                carbsG: "",
                sodiumMg: "",
              });
            }}
            className="rounded-md bg-[#0D9488] text-white text-sm font-medium py-2 mt-1"
          >
            Save &amp; add to today
          </button>
        </div>
      )}
    </div>
  );
}

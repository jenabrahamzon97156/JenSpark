"use client";

// components/food/AddFoodPanel.tsx

import { useState } from "react";
import { FoodItem, MealSlot, MealWithItems, RecipeWithIngredients } from "@/lib/types";
import { searchFoods as searchUsda, FoodSearchResult } from "@/lib/usdaFoodData";
import { searchFoods as searchApiNinjas } from "@/lib/apiNinjas";
import { MEAL_SLOT_LABELS, MEAL_SLOT_ORDER, sumFoods } from "@/lib/foodStore";

type Tab = "search" | "myFoods" | "meals" | "recipes" | "manual";

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
          className="flex-1 min-w-0 bg-white border border-[#E5E7EB] rounded-md px-2 py-2 text-sm font-mono text-[#1D2027] focus:outline-none focus:border-[#0D9488]"
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

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

export type SearchAddPick =
  | { mode: "grams"; qty: number }
  | { mode: "custom"; qty: number; unit: string; gramsPerUnit: number };

function SearchQuantityPicker({ onConfirm, onCancel }: { onConfirm: (pick: SearchAddPick) => void; onCancel: () => void }) {
  const [mode, setMode] = useState<"grams" | "custom">("grams");
  const [gramsQty, setGramsQty] = useState("1");
  const [customQty, setCustomQty] = useState("1");
  const [customUnit, setCustomUnit] = useState("cup");
  const [customGrams, setCustomGrams] = useState("");
  const [error, setError] = useState<string | null>(null);

  const confirm = () => {
    if (mode === "grams") {
      onConfirm({ mode: "grams", qty: Number(gramsQty) || 1 });
      return;
    }
    const grams = Number(customGrams);
    if (!grams) {
      setError("Enter how many grams that measurement equals.");
      return;
    }
    onConfirm({ mode: "custom", qty: Number(customQty) || 1, unit: customUnit, gramsPerUnit: grams });
  };

  return (
    <div className="rounded-lg border border-[#0D9488] bg-[#0D9488]/5 p-3 mt-2">
      <div className="flex gap-1.5 mb-2">
        <button
          type="button"
          onClick={() => setMode("grams")}
          className={`text-[11px] px-2.5 py-1 rounded-full border ${
            mode === "grams" ? "bg-[#1D2027] text-white border-[#1D2027]" : "border-[#E5E7EB] text-[#6B7280]"
          }`}
        >
          Servings of 100g
        </button>
        <button
          type="button"
          onClick={() => setMode("custom")}
          className={`text-[11px] px-2.5 py-1 rounded-full border ${
            mode === "custom" ? "bg-[#1D2027] text-white border-[#1D2027]" : "border-[#E5E7EB] text-[#6B7280]"
          }`}
        >
          Different measurement
        </button>
      </div>

      {mode === "grams" ? (
        <div className="flex gap-2">
          <input
            type="number"
            inputMode="decimal"
            value={gramsQty}
            onChange={(e) => setGramsQty(e.target.value)}
            className="flex-1 min-w-0 bg-white border border-[#E5E7EB] rounded-md px-2 py-2 text-sm font-mono text-[#1D2027] focus:outline-none focus:border-[#0D9488]"
          />
          <button onClick={confirm} className="px-4 rounded-md bg-[#0D9488] text-white text-sm font-medium">
            Add
          </button>
          <button onClick={onCancel} className="px-3 rounded-md border border-[#E5E7EB] text-sm text-[#6B7280]">
            Cancel
          </button>
        </div>
      ) : (
        <div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <input
              type="number"
              value={customQty}
              onChange={(e) => setCustomQty(e.target.value)}
              placeholder="Qty"
              className="min-w-0 bg-white border border-[#E5E7EB] rounded-md px-2 py-2 text-sm text-[#1D2027]"
            />
            <select
              value={customUnit}
              onChange={(e) => setCustomUnit(e.target.value)}
              className="min-w-0 bg-white border border-[#E5E7EB] rounded-md px-2 py-2 text-sm text-[#1D2027]"
            >
              {["each", "cup", "tbsp", "tsp", "oz", "slice", "piece", "scoop", "bar", "ml"].map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
          <label className="text-[10px] text-[#6B7280]">
            How many grams is {customQty || "1"} {customUnit}?
          </label>
          <input
            type="number"
            value={customGrams}
            onChange={(e) => setCustomGrams(e.target.value)}
            placeholder="e.g. 195"
            className="w-full mt-0.5 mb-2 bg-white border border-[#E5E7EB] rounded-md px-2 py-1.5 text-sm text-[#1D2027]"
          />
          {error && <p className="text-[11px] text-[#DC2626] mb-2">{error}</p>}
          <div className="flex gap-2">
            <button onClick={confirm} className="flex-1 rounded-md bg-[#0D9488] text-white text-sm font-medium py-2">
              Add
            </button>
            <button onClick={onCancel} className="px-3 rounded-md border border-[#E5E7EB] text-sm text-[#6B7280]">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SearchResultRow({
  result,
  sourceLabel,
  picking,
  onPick,
  onConfirm,
  onCancelPick,
  onSaveOnly,
}: {
  result: FoodSearchResult;
  sourceLabel: string;
  picking: boolean;
  onPick: () => void;
  onConfirm: (pick: SearchAddPick, existing: FoodItem | null) => void;
  onCancelPick: () => void;
  onSaveOnly: () => Promise<FoodItem | null>;
}) {
  const [savedFood, setSavedFood] = useState<FoodItem | null>(null);
  const [saving, setSaving] = useState(false);
  const looksEmpty =
    result.calories === 0 && result.proteinG === 0 && result.fatG === 0 && result.carbsG === 0 && result.sodiumMg === 0;

  const handleSaveOnly = async () => {
    setSaving(true);
    const food = await onSaveOnly();
    if (food) setSavedFood(food);
    setSaving(false);
  };

  return (
    <div className="rounded-lg border border-[#E5E7EB] p-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm text-[#1D2027] truncate">{result.name}</p>
          <p className="text-xs text-[#6B7280]">
            {result.brand ? `${result.brand} \u00b7 ` : ""}
            {result.calories} kcal / 100g &middot; {result.proteinG}g protein
          </p>
          {looksEmpty && (
            <p className="text-xs text-[#DC2626] mt-0.5">
              All nutrients came back 0 — likely thin data from {sourceLabel}, not an actually zero-calorie food. Try
              another section, a more specific search term, or edit the values after adding.
            </p>
          )}
          {savedFood && (
            <p className="text-xs text-[#0D9488] mt-0.5">Saved &#10003; &mdash; edit it anytime in the My Foods tab.</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {!savedFood && (
            <button
              onClick={handleSaveOnly}
              disabled={saving}
              className="text-xs px-2.5 py-1 rounded-full border border-[#0D9488] text-[#0D9488] disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save to My Foods"}
            </button>
          )}
          <button onClick={onPick} className="text-xs px-3 py-1 rounded-full bg-[#0D9488] text-white">
            Add
          </button>
        </div>
      </div>
      {picking && <SearchQuantityPicker onConfirm={(pick) => onConfirm(pick, savedFood)} onCancel={onCancelPick} />}
    </div>
  );
}

function FoodEditForm({
  food,
  onSave,
  onCancel,
}: {
  food: FoodItem;
  onSave: (values: Omit<FoodItem, "id">) => void;
  onCancel: () => void;
}) {
  const [v, setV] = useState({
    name: food.name,
    brand: food.brand ?? "",
    servingQty: String(food.servingQty),
    servingUnit: food.servingUnit,
    calories: String(food.calories),
    proteinG: String(food.proteinG),
    fiberG: String(food.fiberG),
    sugarG: String(food.sugarG),
    fatG: String(food.fatG),
    carbsG: String(food.carbsG),
    sodiumMg: String(food.sodiumMg),
  });

  // Switching the unit alone (e.g. "g" -> "cup") would leave the nutrition
  // numbers labeled for a serving they no longer describe. This lets the
  // person tell us the gram-weight of both the current and new serving so
  // every nutrient can be rescaled to match — not just relabeled.
  const [showConvert, setShowConvert] = useState(false);
  const [convertCurrentGrams, setConvertCurrentGrams] = useState(v.servingUnit === "g" ? v.servingQty : "");
  const [convertNewQty, setConvertNewQty] = useState("1");
  const [convertNewUnit, setConvertNewUnit] = useState("cup");
  const [convertNewGrams, setConvertNewGrams] = useState("");
  const [convertError, setConvertError] = useState<string | null>(null);
  const currentIsGrams = v.servingUnit === "g";

  const round1 = (n: number) => Math.round(n * 10) / 10;

  const applyConversion = () => {
    const currentG = currentIsGrams ? Number(v.servingQty) : Number(convertCurrentGrams);
    const newG = Number(convertNewGrams);
    if (!currentG || !newG) {
      setConvertError("Enter the gram weight for both the current and new serving.");
      return;
    }
    const scale = newG / currentG;
    setV((prev) => ({
      ...prev,
      servingQty: convertNewQty || "1",
      servingUnit: convertNewUnit,
      calories: String(round1(Number(prev.calories) * scale)),
      proteinG: String(round1(Number(prev.proteinG) * scale)),
      fiberG: String(round1(Number(prev.fiberG) * scale)),
      sugarG: String(round1(Number(prev.sugarG) * scale)),
      fatG: String(round1(Number(prev.fatG) * scale)),
      carbsG: String(round1(Number(prev.carbsG) * scale)),
      sodiumMg: String(round1(Number(prev.sodiumMg) * scale)),
    }));
    setConvertError(null);
    setShowConvert(false);
  };

  return (
    <div className="rounded-lg border border-[#0D9488] bg-[#0D9488]/5 p-3">
      <input
        value={v.name}
        onChange={(e) => setV({ ...v, name: e.target.value })}
        placeholder="Name"
        className="w-full mb-2 bg-white border border-[#E5E7EB] rounded-md px-3 py-2 text-sm text-[#1D2027]"
      />
      <div className="grid grid-cols-2 gap-2 mb-2">
        <input
          type="number"
          value={v.servingQty}
          onChange={(e) => setV({ ...v, servingQty: e.target.value })}
          placeholder="Serving qty"
          className="min-w-0 bg-white border border-[#E5E7EB] rounded-md px-2 py-2 text-sm text-[#1D2027]"
        />
        <select
          value={v.servingUnit}
          onChange={(e) => setV({ ...v, servingUnit: e.target.value })}
          className="min-w-0 bg-white border border-[#E5E7EB] rounded-md px-2 py-2 text-sm text-[#1D2027]"
        >
          {["each", "cup", "tbsp", "tsp", "oz", "slice", "piece", "scoop", "bar", "g", "ml"].map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </div>

      {!showConvert ? (
        <button
          type="button"
          onClick={() => setShowConvert(true)}
          className="text-xs text-[#0D9488] font-medium mb-2"
        >
          Convert measurement (e.g. grams &rarr; cups)
        </button>
      ) : (
        <div className="bg-white border border-[#E5E7EB] rounded-md p-2.5 mb-2">
          <p className="text-[11px] text-[#6B7280] mb-2">
            Tell us the gram weight of the current and new serving, and we'll rescale the nutrition to match instead
            of just relabeling it.
          </p>
          {!currentIsGrams && (
            <div className="mb-2">
              <label className="text-[10px] text-[#6B7280]">
                Current serving ({v.servingQty} {v.servingUnit}) equals how many grams?
              </label>
              <input
                type="number"
                value={convertCurrentGrams}
                onChange={(e) => setConvertCurrentGrams(e.target.value)}
                placeholder="e.g. 240"
                className="w-full mt-0.5 bg-[#F7F8FA] border border-[#E5E7EB] rounded-md px-2 py-1.5 text-xs text-[#1D2027]"
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 mb-2">
            <input
              type="number"
              value={convertNewQty}
              onChange={(e) => setConvertNewQty(e.target.value)}
              placeholder="New qty"
              className="min-w-0 bg-[#F7F8FA] border border-[#E5E7EB] rounded-md px-2 py-1.5 text-xs text-[#1D2027]"
            />
            <select
              value={convertNewUnit}
              onChange={(e) => setConvertNewUnit(e.target.value)}
              className="min-w-0 bg-[#F7F8FA] border border-[#E5E7EB] rounded-md px-2 py-1.5 text-xs text-[#1D2027]"
            >
              {["each", "cup", "tbsp", "tsp", "oz", "slice", "piece", "scoop", "bar", "g", "ml"].map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-2">
            <label className="text-[10px] text-[#6B7280]">
              New serving ({convertNewQty || "1"} {convertNewUnit}) equals how many grams?
            </label>
            <input
              type="number"
              value={convertNewGrams}
              onChange={(e) => setConvertNewGrams(e.target.value)}
              placeholder="e.g. 195"
              className="w-full mt-0.5 bg-[#F7F8FA] border border-[#E5E7EB] rounded-md px-2 py-1.5 text-xs text-[#1D2027]"
            />
          </div>
          {convertError && <p className="text-[11px] text-[#DC2626] mb-2">{convertError}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={applyConversion}
              className="flex-1 rounded-md bg-[#0D9488] text-white text-xs font-medium py-1.5"
            >
              Apply conversion
            </button>
            <button
              type="button"
              onClick={() => {
                setShowConvert(false);
                setConvertError(null);
              }}
              className="px-3 rounded-md border border-[#E5E7EB] text-xs text-[#6B7280]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 mb-2">
        <input type="number" value={v.calories} onChange={(e) => setV({ ...v, calories: e.target.value })} placeholder="Calories" className="min-w-0 bg-white border border-[#E5E7EB] rounded-md px-2 py-1.5 text-xs text-[#1D2027]" />
        <input type="number" value={v.proteinG} onChange={(e) => setV({ ...v, proteinG: e.target.value })} placeholder="Protein g" className="min-w-0 bg-white border border-[#E5E7EB] rounded-md px-2 py-1.5 text-xs text-[#1D2027]" />
        <input type="number" value={v.fiberG} onChange={(e) => setV({ ...v, fiberG: e.target.value })} placeholder="Fiber g" className="min-w-0 bg-white border border-[#E5E7EB] rounded-md px-2 py-1.5 text-xs text-[#1D2027]" />
        <input type="number" value={v.sugarG} onChange={(e) => setV({ ...v, sugarG: e.target.value })} placeholder="Sugar g" className="min-w-0 bg-white border border-[#E5E7EB] rounded-md px-2 py-1.5 text-xs text-[#1D2027]" />
        <input type="number" value={v.fatG} onChange={(e) => setV({ ...v, fatG: e.target.value })} placeholder="Fat g" className="min-w-0 bg-white border border-[#E5E7EB] rounded-md px-2 py-1.5 text-xs text-[#1D2027]" />
        <input type="number" value={v.carbsG} onChange={(e) => setV({ ...v, carbsG: e.target.value })} placeholder="Carbs g" className="min-w-0 bg-white border border-[#E5E7EB] rounded-md px-2 py-1.5 text-xs text-[#1D2027]" />
      </div>
      <input
        type="number"
        value={v.sodiumMg}
        onChange={(e) => setV({ ...v, sodiumMg: e.target.value })}
        placeholder="Sodium mg"
        className="w-full mb-2 bg-white border border-[#E5E7EB] rounded-md px-2 py-1.5 text-xs text-[#1D2027]"
      />
      <div className="flex gap-2">
        <button
          onClick={() =>
            v.name.trim() &&
            onSave({
              name: v.name.trim(),
              brand: v.brand || null,
              servingQty: Number(v.servingQty) || 1,
              servingUnit: v.servingUnit,
              calories: Number(v.calories) || 0,
              proteinG: Number(v.proteinG) || 0,
              fiberG: Number(v.fiberG) || 0,
              sugarG: Number(v.sugarG) || 0,
              fatG: Number(v.fatG) || 0,
              carbsG: Number(v.carbsG) || 0,
              sodiumMg: Number(v.sodiumMg) || 0,
              source: food.source,
              externalId: food.externalId,
            })
          }
          className="flex-1 rounded-md bg-[#0D9488] text-white text-sm font-medium py-2"
        >
          Save changes
        </button>
        <button onClick={onCancel} className="px-4 rounded-md border border-[#E5E7EB] text-sm text-[#6B7280]">
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
  onUpdateFood,
  onDeleteFood,
  onImportStarterFoods,
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
  onUpdateFood: (id: string, food: Omit<FoodItem, "id">) => void;
  onDeleteFood: (id: string) => void;
  onImportStarterFoods: () => Promise<number>;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>("search");
  const [mealSlot, setMealSlot] = useState<MealSlot>(defaultMealSlot());
  const [notes, setNotes] = useState("");
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [usdaResults, setUsdaResults] = useState<FoodSearchResult[]>([]);
  const [usdaSearching, setUsdaSearching] = useState(false);
  const [usdaError, setUsdaError] = useState<string | null>(null);
  const [ninjaResults, setNinjaResults] = useState<FoodSearchResult[]>([]);
  const [ninjaSearching, setNinjaSearching] = useState(false);
  const [ninjaError, setNinjaError] = useState<string | null>(null);
  const [pickingFood, setPickingFood] = useState<FoodItem | null>(null);
  const [pickingResult, setPickingResult] = useState<FoodSearchResult | null>(null);
  const [pickingRecipe, setPickingRecipe] = useState<RecipeWithIngredients | null>(null);
  const [editingFoodId, setEditingFoodId] = useState<string | null>(null);
  const [myFoodsFilter, setMyFoodsFilter] = useState("");
  const [importMessage, setImportMessage] = useState<string | null>(null);

  const [manual, setManual] = useState({
    name: "",
    servingQty: "1",
    servingUnit: "each",
    calories: "",
    proteinG: "",
    fiberG: "",
    sugarG: "",
    fatG: "",
    carbsG: "",
    sodiumMg: "",
  });

  // Searches My Foods (local, instant), USDA, and API Ninjas at once, each
  // shown in its own section below — so a missing/incomplete result from
  // one source doesn't hide what the others found.
  const runSearch = () => {
    const q = query.trim();
    if (!q) return;
    setSubmittedQuery(q);
    setHasSearched(true);

    setUsdaSearching(true);
    setUsdaError(null);
    searchUsda(q)
      .then(setUsdaResults)
      .catch((e) => {
        setUsdaResults([]);
        setUsdaError(e instanceof Error ? e.message : "Couldn't reach USDA. Check your connection and try again.");
      })
      .finally(() => setUsdaSearching(false));

    setNinjaSearching(true);
    setNinjaError(null);
    searchApiNinjas(q)
      .then(setNinjaResults)
      .catch((e) => {
        setNinjaResults([]);
        setNinjaError(e instanceof Error ? e.message : "Couldn't reach API Ninjas. Check your connection and try again.");
      })
      .finally(() => setNinjaSearching(false));
  };

  const myFoodMatches = submittedQuery
    ? myFoods.filter((f) => f.name.toLowerCase().includes(submittedQuery.toLowerCase()))
    : [];

  const handleImport = async () => {
    setImportMessage("Importing...");
    const count = await onImportStarterFoods();
    setImportMessage(
      count > 0
        ? `Added ${count} new food${count === 1 ? "" : "s"} to your library.`
        : "You already have all the common foods in your library."
    );
  };

  // Saves a search result to My Foods (unless it was already saved via the
  // "Save to My Foods" button), then logs it. If the person picked a custom
  // measurement (e.g. "1 cup = 195g") instead of plain 100g servings, the
  // saved food is rewritten to that unit — with every nutrient rescaled to
  // match — so it shows up in cups (not grams) from now on too.
  const handleSearchAdd = async (result: FoodSearchResult, pick: SearchAddPick, existing: FoodItem | null) => {
    const saved = existing ?? (await onSaveSearchResult(result));
    if (!saved) {
      setPickingResult(null);
      return;
    }
    if (pick.mode === "grams") {
      onLogFood(saved, pick.qty, mealSlot, notes || null);
      setPickingResult(null);
      return;
    }
    const scale = pick.gramsPerUnit / 100;
    const converted = {
      name: saved.name,
      brand: saved.brand,
      servingQty: pick.qty,
      servingUnit: pick.unit,
      calories: round1(saved.calories * scale),
      proteinG: round1(saved.proteinG * scale),
      fiberG: round1(saved.fiberG * scale),
      sugarG: round1(saved.sugarG * scale),
      fatG: round1(saved.fatG * scale),
      carbsG: round1(saved.carbsG * scale),
      sodiumMg: round1(saved.sodiumMg * scale),
      source: saved.source,
      externalId: saved.externalId,
    };
    await onUpdateFood(saved.id, converted);
    onLogFood({ ...saved, ...converted }, 1, mealSlot, notes || null);
    setPickingResult(null);
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
          <div className="flex gap-2 mb-4">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runSearch()}
              placeholder="Search foods, e.g. 'greek yogurt'"
              className="flex-1 min-w-0 bg-[#F7F8FA] border border-[#E5E7EB] rounded-md px-3 py-2 text-sm text-[#1D2027] focus:outline-none focus:border-[#0D9488]"
            />
            <button onClick={runSearch} className="px-4 rounded-md bg-[#0D9488] text-white text-sm font-medium">
              Go
            </button>
          </div>

          {hasSearched && (
            <div className="flex flex-col gap-4 max-h-96 overflow-y-auto">
              {/* My Foods — local library, no network call, so it's instant */}
              <div>
                <p className="text-[11px] font-medium text-[#6B7280] uppercase tracking-wide mb-1.5">My Foods</p>
                {myFoodMatches.length === 0 ? (
                  <p className="text-xs text-[#9CA3AF]">No matches in your library.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {myFoodMatches.map((f) => (
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
              </div>

              {/* USDA */}
              <div>
                <p className="text-[11px] font-medium text-[#6B7280] uppercase tracking-wide mb-1.5">
                  USDA (general foods)
                </p>
                {usdaSearching && <p className="text-xs text-[#6B7280]">Searching...</p>}
                {usdaError && <p className="text-xs text-[#DC2626] mb-1">{usdaError}</p>}
                {!usdaSearching && !usdaError && usdaResults.length === 0 && (
                  <p className="text-xs text-[#9CA3AF]">No results in USDA.</p>
                )}
                <div className="flex flex-col gap-2">
                  {usdaResults.map((r, i) => (
                    <SearchResultRow
                      key={i}
                      result={r}
                      sourceLabel="USDA"
                      picking={pickingResult === r}
                      onPick={() => setPickingResult(r)}
                      onConfirm={(pick, existing) => handleSearchAdd(r, pick, existing)}
                      onCancelPick={() => setPickingResult(null)}
                      onSaveOnly={() => onSaveSearchResult(r)}
                    />
                  ))}
                </div>
              </div>

              {/* API Ninjas */}
              <div>
                <p className="text-[11px] font-medium text-[#6B7280] uppercase tracking-wide mb-1.5">API Ninjas</p>
                {ninjaSearching && <p className="text-xs text-[#6B7280]">Searching...</p>}
                {ninjaError && <p className="text-xs text-[#DC2626] mb-1">{ninjaError}</p>}
                {!ninjaSearching && !ninjaError && ninjaResults.length === 0 && (
                  <p className="text-xs text-[#9CA3AF]">No results in API Ninjas.</p>
                )}
                <div className="flex flex-col gap-2">
                  {ninjaResults.map((r, i) => (
                    <SearchResultRow
                      key={i}
                      result={r}
                      sourceLabel="API Ninjas"
                      picking={pickingResult === r}
                      onPick={() => setPickingResult(r)}
                      onConfirm={(pick, existing) => handleSearchAdd(r, pick, existing)}
                      onCancelPick={() => setPickingResult(null)}
                      onSaveOnly={() => onSaveSearchResult(r)}
                    />
                  ))}
                </div>
              </div>

              {!usdaSearching &&
                !ninjaSearching &&
                myFoodMatches.length === 0 &&
                usdaResults.length === 0 &&
                ninjaResults.length === 0 && (
                  <div className="text-center py-1">
                    <button
                      onClick={() => {
                        setManual((m) => ({ ...m, name: query }));
                        setTab("manual");
                      }}
                      className="text-xs text-[#0D9488] font-medium"
                    >
                      Can't find it? Add "{submittedQuery}" manually
                    </button>
                  </div>
                )}
            </div>
          )}
        </div>
      )}

      {tab === "myFoods" && (
        <div>
          <input
            value={myFoodsFilter}
            onChange={(e) => setMyFoodsFilter(e.target.value)}
            placeholder="Filter your foods..."
            className="w-full mb-2 bg-[#F7F8FA] border border-[#E5E7EB] rounded-md px-3 py-2 text-sm text-[#1D2027] focus:outline-none focus:border-[#0D9488]"
          />
          {myFoods.length === 0 ? (
            <div className="text-center py-3 mb-2">
              <p className="text-sm text-[#6B7280] mb-2">
                No saved foods yet — add one manually, from Search, or start with a common-foods list.
              </p>
              <button
                onClick={handleImport}
                className="text-xs px-3 py-1.5 rounded-full border border-[#0D9488] text-[#0D9488]"
              >
                Import common foods
              </button>
            </div>
          ) : (
            <button
              onClick={handleImport}
              className="w-full mb-2 text-xs px-3 py-2 rounded-md border border-dashed border-[#D1D5DB] text-[#6B7280] hover:border-[#0D9488] hover:text-[#0D9488]"
            >
              + Import common foods (skips ones you already have)
            </button>
          )}
          {importMessage && <p className="text-xs text-[#0D9488] mb-2">{importMessage}</p>}
          <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
            {myFoods
              .filter((f) => f.name.toLowerCase().includes(myFoodsFilter.toLowerCase()))
              .map((f) =>
                editingFoodId === f.id ? (
                  <FoodEditForm
                    key={f.id}
                    food={f}
                    onCancel={() => setEditingFoodId(null)}
                    onSave={(values) => {
                      onUpdateFood(f.id, values);
                      setEditingFoodId(null);
                    }}
                  />
                ) : (
                  <div key={f.id} className="rounded-lg border border-[#E5E7EB] p-2.5">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-sm text-[#1D2027] truncate">{f.name}</p>
                        <p className="text-xs text-[#6B7280]">
                          {f.calories} kcal per {f.servingQty} {f.servingUnit}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => setEditingFoodId(f.id)} className="text-xs text-[#0D9488] font-medium">
                          Edit
                        </button>
                        <button
                          onClick={() => onDeleteFood(f.id)}
                          className="text-xs text-[#9CA3AF] hover:text-[#DC2626]"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setPickingFood(f)}
                          className="text-xs px-3 py-1 rounded-full bg-[#0D9488] text-white"
                        >
                          Add
                        </button>
                      </div>
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
                )
              )}
          </div>
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
              className="min-w-0 bg-[#F7F8FA] border border-[#E5E7EB] rounded-md px-2 py-2 text-sm text-[#1D2027] focus:outline-none focus:border-[#0D9488]"
            />
            <select
              value={manual.servingUnit}
              onChange={(e) => setManual({ ...manual, servingUnit: e.target.value })}
              className="min-w-0 bg-[#F7F8FA] border border-[#E5E7EB] rounded-md px-2 py-2 text-sm text-[#1D2027] focus:outline-none focus:border-[#0D9488]"
            >
              {["each", "cup", "tbsp", "tsp", "oz", "slice", "piece", "scoop", "bar", "g", "ml"].map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
          <p className="text-[10px] text-[#6B7280] mt-1">Nutrition facts (per serving above)</p>
          <div className="grid grid-cols-3 gap-2">
            <input placeholder="Calories" type="number" value={manual.calories} onChange={(e) => setManual({ ...manual, calories: e.target.value })} className="min-w-0 bg-[#F7F8FA] border border-[#E5E7EB] rounded-md px-2 py-2 text-sm text-[#1D2027] focus:outline-none focus:border-[#0D9488]" />
            <input placeholder="Protein g" type="number" value={manual.proteinG} onChange={(e) => setManual({ ...manual, proteinG: e.target.value })} className="min-w-0 bg-[#F7F8FA] border border-[#E5E7EB] rounded-md px-2 py-2 text-sm text-[#1D2027] focus:outline-none focus:border-[#0D9488]" />
            <input placeholder="Fiber g" type="number" value={manual.fiberG} onChange={(e) => setManual({ ...manual, fiberG: e.target.value })} className="min-w-0 bg-[#F7F8FA] border border-[#E5E7EB] rounded-md px-2 py-2 text-sm text-[#1D2027] focus:outline-none focus:border-[#0D9488]" />
            <input placeholder="Sugar g" type="number" value={manual.sugarG} onChange={(e) => setManual({ ...manual, sugarG: e.target.value })} className="min-w-0 bg-[#F7F8FA] border border-[#E5E7EB] rounded-md px-2 py-2 text-sm text-[#1D2027] focus:outline-none focus:border-[#0D9488]" />
            <input placeholder="Fat g" type="number" value={manual.fatG} onChange={(e) => setManual({ ...manual, fatG: e.target.value })} className="min-w-0 bg-[#F7F8FA] border border-[#E5E7EB] rounded-md px-2 py-2 text-sm text-[#1D2027] focus:outline-none focus:border-[#0D9488]" />
            <input placeholder="Carbs g" type="number" value={manual.carbsG} onChange={(e) => setManual({ ...manual, carbsG: e.target.value })} className="min-w-0 bg-[#F7F8FA] border border-[#E5E7EB] rounded-md px-2 py-2 text-sm text-[#1D2027] focus:outline-none focus:border-[#0D9488]" />
            <input placeholder="Sodium mg" type="number" value={manual.sodiumMg} onChange={(e) => setManual({ ...manual, sodiumMg: e.target.value })} className="min-w-0 bg-[#F7F8FA] border border-[#E5E7EB] rounded-md px-2 py-2 text-sm text-[#1D2027] focus:outline-none focus:border-[#0D9488] col-span-2" />
          </div>
          <button
            onClick={() => {
              if (!manual.name.trim()) return;
              onCreateManualFood(
                {
                  name: manual.name.trim(),
                  brand: null,
                  servingQty: Number(manual.servingQty) || 1,
                  servingUnit: manual.servingUnit || "each",
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
                servingUnit: "each",
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

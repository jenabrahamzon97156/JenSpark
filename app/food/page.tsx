"use client";

// app/food/page.tsx

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import AddFoodPanel, { MeasurementQuantityPicker, QuantityPick } from "@/components/food/AddFoodPanel";
import MealsRecipesManager from "@/components/food/MealsRecipesManager";
import { useAuth } from "@/lib/useAuth";
import { FoodItem, FoodLogEntry, MealSlot, MealWithItems, NutritionGoals, RecipeWithIngredients } from "@/lib/types";
import { dateToString, todayDateString } from "@/lib/workoutStore";
import { FoodSearchResult } from "@/lib/usdaFoodData";
import {
  addLogEntry,
  createFoodItem,
  updateFoodItem,
  deleteFoodItem,
  createMeal,
  createRecipe,
  deleteLogEntry,
  deleteMeal,
  deleteRecipe,
  fetchFoodItems,
  fetchGoalsForDate,
  fetchLogEntriesForDate,
  fetchMeals,
  fetchRecipes,
  MEAL_SLOT_LABELS,
  MEAL_SLOT_ORDER,
  saveGoals,
  saveSearchResultAsFood,
  importStarterFoods,
  scaleFood,
  updateLogEntry,
} from "@/lib/foodStore";

function ProgressBar({ label, value, goal, unit }: { label: string; value: number; goal: number; unit: string }) {
  const pct = goal > 0 ? Math.min(100, (value / goal) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-[#6B7280]">{label}</span>
        <span className="font-mono text-[#1D2027]">
          {Math.round(value)} / {Math.round(goal)} {unit}
        </span>
      </div>
      <div className="h-2 rounded-full bg-[#F1F2F4] overflow-hidden">
        <div className="h-full bg-[#0D9488] rounded-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// Lets a logged entry move to a different meal slot, and — when its
// original food is still in the person's library — also change how many
// servings were logged, recalculating every nutrient from that food's
// per-serving values rather than just editing the numbers directly (which
// would drift out of sync with the food's real nutrition).
function round1(n: number) {
  return Math.round(n * 10) / 10;
}

// Scales off the entry's OWN snapshot values (calories/quantity etc as
// logged) rather than re-deriving from the source food. That's what makes
// this correct for every entry, regardless of how it was originally
// logged: a plain food serving, a custom measurement (e.g. "2 tbsp" of a
// food stored in cups), a meal, or a recipe — and it still works even if
// the source food was later deleted from the library.
function EntryEditForm({
  entry,
  onSave,
  onCancel,
}: {
  entry: FoodLogEntry;
  onSave: (patch: Partial<Omit<FoodLogEntry, "id">>) => void;
  onCancel: () => void;
}) {
  const [mealSlot, setMealSlot] = useState<MealSlot>(entry.mealSlot);
  const [showServingPicker, setShowServingPicker] = useState(false);

  const baseUnit = entry.servingLabel ? entry.servingLabel.split(" ").slice(1).join(" ") || "serving" : "serving";
  const qtyDivisor = entry.quantity || 1;
  const perUnit = {
    calories: entry.calories / qtyDivisor,
    proteinG: entry.proteinG / qtyDivisor,
    fiberG: entry.fiberG / qtyDivisor,
    sugarG: entry.sugarG / qtyDivisor,
    fatG: entry.fatG / qtyDivisor,
    carbsG: entry.carbsG / qtyDivisor,
    sodiumMg: entry.sodiumMg / qtyDivisor,
  };

  const applyServingPick = (pick: QuantityPick) => {
    if (pick.mode === "base") {
      const qty = pick.qty;
      onSave({
        mealSlot,
        quantity: qty,
        servingLabel: `${qty} ${baseUnit}`,
        calories: round1(perUnit.calories * qty),
        proteinG: round1(perUnit.proteinG * qty),
        fiberG: round1(perUnit.fiberG * qty),
        sugarG: round1(perUnit.sugarG * qty),
        fatG: round1(perUnit.fatG * qty),
        carbsG: round1(perUnit.carbsG * qty),
        sodiumMg: round1(perUnit.sodiumMg * qty),
      });
      return;
    }
    const scale = pick.newGrams / pick.baseGrams;
    onSave({
      mealSlot,
      quantity: pick.qty,
      servingLabel: `${pick.qty} ${pick.unit}`,
      calories: round1(perUnit.calories * scale),
      proteinG: round1(perUnit.proteinG * scale),
      fiberG: round1(perUnit.fiberG * scale),
      sugarG: round1(perUnit.sugarG * scale),
      fatG: round1(perUnit.fatG * scale),
      carbsG: round1(perUnit.carbsG * scale),
      sodiumMg: round1(perUnit.sodiumMg * scale),
    });
  };

  return (
    <div className="px-3 pb-3 pt-1 border-t border-[#F1F2F4]">
      <p className="text-[10px] text-[#6B7280] mb-1.5">Move to</p>
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

      {showServingPicker ? (
        <MeasurementQuantityPicker
          baseQty={1}
          baseUnit={baseUnit}
          onConfirm={applyServingPick}
          onCancel={() => setShowServingPicker(false)}
        />
      ) : (
        <div className="flex gap-2">
          <button
            onClick={() => setShowServingPicker(true)}
            className="flex-1 rounded-md border border-[#0D9488] text-[#0D9488] text-xs font-medium py-1.5"
          >
            Change serving size
          </button>
          <button
            onClick={() => onSave({ mealSlot })}
            className="flex-1 rounded-md bg-[#0D9488] text-white text-xs font-medium py-1.5"
          >
            Save changes
          </button>
          <button onClick={onCancel} className="px-3 rounded-md border border-[#E5E7EB] text-xs text-[#6B7280]">
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

function GoalsEditor({ goals, onSave, onClose }: { goals: NutritionGoals; onSave: (g: NutritionGoals) => void; onClose: () => void }) {
  const [calories, setCalories] = useState(String(goals.calories));
  const [proteinG, setProteinG] = useState(String(goals.proteinG));
  const [fiberG, setFiberG] = useState(String(goals.fiberG));

  return (
    <div className="rounded-xl border border-[#0D9488] bg-[#0D9488]/5 p-4 mb-4">
      <p className="text-sm font-medium text-[#1D2027] mb-3">Daily goals</p>
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div>
          <label className="text-[10px] text-[#6B7280]">Calories</label>
          <input
            type="number"
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
            className="w-full bg-white border border-[#E5E7EB] rounded-md px-2 py-1.5 text-sm font-mono"
          />
        </div>
        <div>
          <label className="text-[10px] text-[#6B7280]">Protein (g)</label>
          <input
            type="number"
            value={proteinG}
            onChange={(e) => setProteinG(e.target.value)}
            className="w-full bg-white border border-[#E5E7EB] rounded-md px-2 py-1.5 text-sm font-mono"
          />
        </div>
        <div>
          <label className="text-[10px] text-[#6B7280]">Fiber (g)</label>
          <input
            type="number"
            value={fiberG}
            onChange={(e) => setFiberG(e.target.value)}
            className="w-full bg-white border border-[#E5E7EB] rounded-md px-2 py-1.5 text-sm font-mono"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => {
            onSave({ calories: Number(calories) || 0, proteinG: Number(proteinG) || 0, fiberG: Number(fiberG) || 0 });
            onClose();
          }}
          className="flex-1 rounded-md bg-[#0D9488] text-white text-sm font-medium py-2"
        >
          Save goals
        </button>
        <button onClick={onClose} className="px-4 rounded-md border border-[#E5E7EB] text-sm text-[#6B7280]">
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function FoodPage() {
  const { user } = useAuth();
  const [date, setDate] = useState(todayDateString());
  const [loading, setLoading] = useState(true);

  const [entries, setEntries] = useState<FoodLogEntry[]>([]);
  const [goals, setGoals] = useState<NutritionGoals>({ calories: 2000, proteinG: 100, fiberG: 25 });
  const [myFoods, setMyFoods] = useState<FoodItem[]>([]);
  const [meals, setMeals] = useState<MealWithItems[]>([]);
  const [recipes, setRecipes] = useState<RecipeWithIngredients[]>([]);

  const [showAdd, setShowAdd] = useState(false);
  const [showManager, setShowManager] = useState(false);
  const [showGoalsEditor, setShowGoalsEditor] = useState(false);
  const [showFullNutrition, setShowFullNutrition] = useState(false);
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [cloningEntryId, setCloningEntryId] = useState<string | null>(null);

  const isToday = date === todayDateString();

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      fetchLogEntriesForDate(user.id, date),
      fetchGoalsForDate(user.id, date),
      fetchFoodItems(user.id),
      fetchMeals(user.id),
      fetchRecipes(user.id),
    ]).then(([e, g, f, m, r]) => {
      setEntries(e);
      setGoals(g);
      setMyFoods(f);
      setMeals(m);
      setRecipes(r);
      setLoading(false);
    });
  }, [user, date]);

  const totals = useMemo(
    () =>
      entries.reduce(
        (acc, e) => {
          acc.calories += e.calories;
          acc.proteinG += e.proteinG;
          acc.fiberG += e.fiberG;
          acc.sugarG += e.sugarG;
          acc.fatG += e.fatG;
          acc.carbsG += e.carbsG;
          acc.sodiumMg += e.sodiumMg;
          return acc;
        },
        { calories: 0, proteinG: 0, fiberG: 0, sugarG: 0, fatG: 0, carbsG: 0, sodiumMg: 0 }
      ),
    [entries]
  );

  const shiftDate = (deltaDays: number) => {
    const d = new Date(date + "T00:00:00");
    d.setDate(d.getDate() + deltaDays);
    setDate(dateToString(d));
  };

  const servingLabelFor = (food: FoodItem, quantity: number) => {
    const totalQty = food.servingQty * quantity;
    const qtyStr = Number.isInteger(totalQty) ? String(totalQty) : totalQty.toFixed(1);
    return `${qtyStr} ${food.servingUnit}`;
  };

  const updateEntry = async (entry: FoodLogEntry, patch: Partial<Omit<FoodLogEntry, "id">>) => {
    setEntries((prev) => prev.map((x) => (x.id === entry.id ? { ...x, ...patch } : x)));
    await updateLogEntry(entry.id, patch);
    setEditingEntryId(null);
  };

  // Duplicates an entry's exact logged snapshot (same food, quantity, unit,
  // and nutrition) into whichever meal slot is chosen — handy for "I had
  // this again" without re-searching, and works the same regardless of
  // whether the entry came from a food, a meal, or a recipe.
  const cloneEntry = async (entry: FoodLogEntry, mealSlot: MealSlot) => {
    if (!user) return;
    const created = await addLogEntry(user.id, {
      date,
      entryName: entry.entryName,
      quantity: entry.quantity,
      sourceType: entry.sourceType,
      sourceId: entry.sourceId,
      mealSlot,
      notes: entry.notes,
      servingLabel: entry.servingLabel,
      calories: entry.calories,
      proteinG: entry.proteinG,
      fiberG: entry.fiberG,
      sugarG: entry.sugarG,
      fatG: entry.fatG,
      carbsG: entry.carbsG,
      sodiumMg: entry.sodiumMg,
    });
    if (created) setEntries((prev) => [...prev, created]);
  };

  const logFood = async (food: FoodItem, quantity: number, mealSlot: MealSlot, notes: string | null) => {
    if (!user) return;
    const s = scaleFood(food, quantity);
    const created = await addLogEntry(user.id, {
      date,
      entryName: food.name,
      quantity,
      sourceType: "food",
      sourceId: food.id,
      mealSlot,
      notes,
      servingLabel: servingLabelFor(food, quantity),
      ...s,
    });
    if (created) setEntries((prev) => [...prev, created]);
  };

  // Logs a food in a measurement that has nothing to do with its stored
  // serving (e.g. logging tablespoons for a food saved in cups). The scaled
  // nutrition is computed by the caller (AddFoodPanel) and passed straight
  // through — this is a one-off snapshot, so it doesn't touch the food's own
  // stored unit in My Foods.
  const logFoodCustom = async (
    food: FoodItem,
    custom: {
      qty: number;
      unit: string;
      calories: number;
      proteinG: number;
      fiberG: number;
      sugarG: number;
      fatG: number;
      carbsG: number;
      sodiumMg: number;
    },
    mealSlot: MealSlot,
    notes: string | null
  ) => {
    if (!user) return;
    const created = await addLogEntry(user.id, {
      date,
      entryName: food.name,
      quantity: custom.qty,
      sourceType: "food",
      sourceId: food.id,
      mealSlot,
      notes,
      servingLabel: `${custom.qty} ${custom.unit}`,
      calories: custom.calories,
      proteinG: custom.proteinG,
      fiberG: custom.fiberG,
      sugarG: custom.sugarG,
      fatG: custom.fatG,
      carbsG: custom.carbsG,
      sodiumMg: custom.sodiumMg,
    });
    if (created) setEntries((prev) => [...prev, created]);
  };

  const logMeal = async (meal: MealWithItems, mealSlot: MealSlot, notes: string | null) => {
    if (!user) return;
    for (const item of meal.items) {
      const s = scaleFood(item.food, item.quantity);
      const created = await addLogEntry(user.id, {
        date,
        entryName: `${meal.name} \u2014 ${item.food.name}`,
        quantity: item.quantity,
        sourceType: "meal",
        sourceId: meal.id,
        mealSlot,
        notes,
        servingLabel: servingLabelFor(item.food, item.quantity),
        ...s,
      });
      if (created) setEntries((prev) => [...prev, created]);
    }
    setShowAdd(false);
  };

  const logRecipe = async (
    recipe: RecipeWithIngredients,
    servingsEaten: number,
    mealSlot: MealSlot,
    notes: string | null
  ) => {
    if (!user) return;
    // Per-serving nutrition = sum of all ingredients / total recipe servings,
    // then scaled by however many servings were actually eaten.
    const totalNutrition = recipe.ingredients.reduce(
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
    const perServing = Object.fromEntries(
      Object.entries(totalNutrition).map(([k, v]) => [k, v / (recipe.servings || 1)])
    ) as typeof totalNutrition;

    const created = await addLogEntry(user.id, {
      date,
      entryName: recipe.name,
      quantity: servingsEaten,
      sourceType: "recipe",
      sourceId: recipe.id,
      mealSlot,
      notes,
      servingLabel: `${servingsEaten} serving${servingsEaten === 1 ? "" : "s"}`,
      calories: perServing.calories * servingsEaten,
      proteinG: perServing.proteinG * servingsEaten,
      fiberG: perServing.fiberG * servingsEaten,
      sugarG: perServing.sugarG * servingsEaten,
      fatG: perServing.fatG * servingsEaten,
      carbsG: perServing.carbsG * servingsEaten,
      sodiumMg: perServing.sodiumMg * servingsEaten,
    });
    if (created) setEntries((prev) => [...prev, created]);
    setShowAdd(false);
  };

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <header className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight text-[#1D2027]">Food Tracking</h1>
          <button
            onClick={() => setShowGoalsEditor((s) => !s)}
            className="text-xs text-[#0D9488] font-medium"
          >
            Edit goals
          </button>
        </header>

        <div className="flex items-center justify-between mb-4">
          <button onClick={() => shiftDate(-1)} className="text-[#6B7280] px-2 py-1">
            {"\u2039"} Prev
          </button>
          <span className="text-sm font-medium text-[#1D2027]">
            {isToday
              ? "Today"
              : new Date(date + "T00:00:00").toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
          </span>
          <button onClick={() => shiftDate(1)} className="text-[#6B7280] px-2 py-1">
            Next {"\u203a"}
          </button>
        </div>

        {showGoalsEditor && (
          <GoalsEditor
            goals={goals}
            onClose={() => setShowGoalsEditor(false)}
            onSave={async (g) => {
              if (!user) return;
              setGoals(g);
              await saveGoals(user.id, g, todayDateString());
            }}
          />
        )}

        <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 mb-4">
          <div className="flex flex-col gap-3">
            <ProgressBar label="Calories" value={totals.calories} goal={goals.calories} unit="kcal" />
            <ProgressBar label="Protein" value={totals.proteinG} goal={goals.proteinG} unit="g" />
            <ProgressBar label="Fiber" value={totals.fiberG} goal={goals.fiberG} unit="g" />
          </div>
          <button
            onClick={() => setShowFullNutrition((s) => !s)}
            className="text-xs text-[#0D9488] font-medium mt-3"
          >
            {showFullNutrition ? "Hide" : "Show"} full nutrition
          </button>
          {showFullNutrition && (
            <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-[#E5E7EB] text-xs">
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Sugar</span>
                <span className="font-mono text-[#1D2027]">{Math.round(totals.sugarG)} g</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Fat</span>
                <span className="font-mono text-[#1D2027]">{Math.round(totals.fatG)} g</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Carbs</span>
                <span className="font-mono text-[#1D2027]">{Math.round(totals.carbsG)} g</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Sodium</span>
                <span className="font-mono text-[#1D2027]">{Math.round(totals.sodiumMg)} mg</span>
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <p className="text-sm text-[#6B7280]">Loading...</p>
        ) : (
          <div className="flex flex-col gap-4 mb-4">
            {entries.length === 0 && (
              <p className="text-sm text-[#6B7280] py-3 text-center">Nothing logged for this day yet.</p>
            )}
            {MEAL_SLOT_ORDER.filter((slot) => entries.some((e) => e.mealSlot === slot)).map((slot) => (
              <div key={slot}>
                <p className="text-xs font-medium text-[#6B7280] mb-1.5">{MEAL_SLOT_LABELS[slot]}</p>
                <div className="flex flex-col gap-2">
                  {entries
                    .filter((e) => e.mealSlot === slot)
                    .map((e) => {
                      const isExpanded = expandedEntryId === e.id;
                      return (
                        <div key={e.id} className="rounded-lg border border-[#E5E7EB] bg-white overflow-hidden">
                          <button
                            onClick={() => setExpandedEntryId(isExpanded ? null : e.id)}
                            className="w-full flex items-center justify-between px-3 py-2.5 text-left"
                          >
                            <div className="min-w-0">
                              <p className="text-sm text-[#1D2027] truncate">{e.entryName}</p>
                              <p className="text-xs text-[#6B7280]">
                                {Math.round(e.calories)} kcal &middot; {Math.round(e.proteinG)}g protein
                              </p>
                              {e.notes && <p className="text-xs text-[#9CA3AF] italic mt-0.5">{e.notes}</p>}
                            </div>
                            <span
                              onClick={async (evt) => {
                                evt.stopPropagation();
                                setEntries((prev) => prev.filter((x) => x.id !== e.id));
                                await deleteLogEntry(e.id);
                              }}
                              className="text-[#9CA3AF] hover:text-[#DC2626] text-sm px-1 shrink-0"
                              aria-label="Remove entry"
                            >
                              {"\u00d7"}
                            </span>
                          </button>
                          {isExpanded && (
                            editingEntryId === e.id ? (
                              <EntryEditForm
                                entry={e}
                                onCancel={() => setEditingEntryId(null)}
                                onSave={(patch) => updateEntry(e, patch)}
                              />
                            ) : cloningEntryId === e.id ? (
                              <div className="px-3 pb-3 pt-1 border-t border-[#F1F2F4]">
                                <p className="text-[10px] text-[#6B7280] mb-1.5">Duplicate to</p>
                                <div className="flex flex-wrap gap-1.5 mb-2">
                                  {MEAL_SLOT_ORDER.map((slot) => (
                                    <button
                                      key={slot}
                                      onClick={() => {
                                        cloneEntry(e, slot);
                                        setCloningEntryId(null);
                                      }}
                                      className="text-[11px] px-2.5 py-1 rounded-full border border-[#E5E7EB] text-[#6B7280] hover:border-[#0D9488] hover:text-[#0D9488]"
                                    >
                                      {MEAL_SLOT_LABELS[slot]}
                                    </button>
                                  ))}
                                </div>
                                <button
                                  onClick={() => setCloningEntryId(null)}
                                  className="text-[11px] text-[#6B7280]"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="px-3 pb-3 pt-1 border-t border-[#F1F2F4]">
                                <div className="flex items-center justify-between mb-2">
                                  <p className="text-[11px] text-[#6B7280]">
                                    {e.servingLabel ?? `${e.quantity} serving${e.quantity === 1 ? "" : "s"}`}
                                  </p>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => setCloningEntryId(e.id)}
                                      className="text-[11px] text-[#0D9488] font-medium"
                                    >
                                      Duplicate
                                    </button>
                                    <button
                                      onClick={() => setEditingEntryId(e.id)}
                                      className="text-[11px] text-[#0D9488] font-medium"
                                    >
                                      Edit
                                    </button>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                                  <div className="flex justify-between">
                                    <span className="text-[#6B7280]">Calories</span>
                                    <span className="tabular-nums text-[#1D2027]">{Math.round(e.calories)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-[#6B7280]">Protein</span>
                                    <span className="tabular-nums text-[#1D2027]">{Math.round(e.proteinG)} g</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-[#6B7280]">Fiber</span>
                                    <span className="tabular-nums text-[#1D2027]">{Math.round(e.fiberG)} g</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-[#6B7280]">Sugar</span>
                                    <span className="tabular-nums text-[#1D2027]">{Math.round(e.sugarG)} g</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-[#6B7280]">Fat</span>
                                    <span className="tabular-nums text-[#1D2027]">{Math.round(e.fatG)} g</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-[#6B7280]">Carbs</span>
                                    <span className="tabular-nums text-[#1D2027]">{Math.round(e.carbsG)} g</span>
                                  </div>
                                  <div className="flex justify-between col-span-2">
                                    <span className="text-[#6B7280]">Sodium</span>
                                    <span className="tabular-nums text-[#1D2027]">{Math.round(e.sodiumMg)} mg</span>
                                  </div>
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => {
              setShowAdd((s) => !s);
              setShowManager(false);
            }}
            className="flex-1 rounded-md bg-[#0D9488] text-white text-sm font-medium py-2.5"
          >
            + Add food
          </button>
          <button
            onClick={() => {
              setShowManager((s) => !s);
              setShowAdd(false);
            }}
            className="px-4 rounded-md border border-[#E5E7EB] text-sm text-[#6B7280]"
          >
            Meals &amp; Recipes
          </button>
        </div>

        {showAdd && (
          <AddFoodPanel
            myFoods={myFoods}
            meals={meals}
            recipes={recipes}
            onClose={() => setShowAdd(false)}
            onLogFood={logFood}
            onLogFoodCustom={logFoodCustom}
            onLogMeal={logMeal}
            onLogRecipe={logRecipe}
            onSaveSearchResult={async (result: FoodSearchResult) => {
              if (!user) return null;
              const created = await saveSearchResultAsFood(user.id, result);
              if (created) setMyFoods((prev) => [...prev, created]);
              return created;
            }}
            onCreateManualFood={async (food, mealSlot, notes) => {
              if (!user) return;
              const created = await createFoodItem(user.id, food);
              if (created) {
                setMyFoods((prev) => [...prev, created]);
                logFood(created, 1, mealSlot, notes);
              }
            }}
            onUpdateFood={async (id, food) => {
              setMyFoods((prev) => prev.map((f) => (f.id === id ? { ...f, ...food } : f)));
              await updateFoodItem(id, food);
            }}
            onDeleteFood={async (id) => {
              setMyFoods((prev) => prev.filter((f) => f.id !== id));
              await deleteFoodItem(id);
            }}
            onImportStarterFoods={async () => {
              if (!user) return 0;
              const imported = await importStarterFoods(user.id);
              setMyFoods((prev) => [...prev, ...imported]);
              return imported.length;
            }}
          />
        )}

        {showManager && (
          <MealsRecipesManager
            myFoods={myFoods}
            meals={meals}
            recipes={recipes}
            onClose={() => setShowManager(false)}
            onCreateMeal={async (name, items) => {
              if (!user) return;
              await createMeal(user.id, name, items);
              setMeals(await fetchMeals(user.id));
            }}
            onCreateRecipe={async (name, servings, ingredients) => {
              if (!user) return;
              await createRecipe(user.id, name, servings, ingredients);
              setRecipes(await fetchRecipes(user.id));
            }}
            onDeleteMeal={async (id) => {
              setMeals((prev) => prev.filter((m) => m.id !== id));
              await deleteMeal(id);
            }}
            onDeleteRecipe={async (id) => {
              setRecipes((prev) => prev.filter((r) => r.id !== id));
              await deleteRecipe(id);
            }}
          />
        )}
      </div>
    </AppShell>
  );
}

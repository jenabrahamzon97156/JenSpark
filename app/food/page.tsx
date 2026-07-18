"use client";

// app/food/page.tsx

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import AddFoodPanel from "@/components/food/AddFoodPanel";
import MealsRecipesManager from "@/components/food/MealsRecipesManager";
import { useAuth } from "@/lib/useAuth";
import { FoodItem, FoodLogEntry, MealWithItems, NutritionGoals, RecipeWithIngredients } from "@/lib/types";
import { dateToString, todayDateString } from "@/lib/workoutStore";
import { OffSearchResult } from "@/lib/openFoodFacts";
import {
  addLogEntry,
  createFoodItem,
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
  saveGoals,
  saveSearchResultAsFood,
  scaleFood,
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
        <div className="h-full bg-[#4C6EF5] rounded-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function GoalsEditor({ goals, onSave, onClose }: { goals: NutritionGoals; onSave: (g: NutritionGoals) => void; onClose: () => void }) {
  const [calories, setCalories] = useState(String(goals.calories));
  const [proteinG, setProteinG] = useState(String(goals.proteinG));
  const [fiberG, setFiberG] = useState(String(goals.fiberG));

  return (
    <div className="rounded-xl border border-[#4C6EF5] bg-[#4C6EF5]/5 p-4 mb-4">
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
          className="flex-1 rounded-md bg-[#4C6EF5] text-white text-sm font-medium py-2"
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

  const logFood = async (food: FoodItem, quantity: number) => {
    if (!user) return;
    const s = scaleFood(food, quantity);
    const created = await addLogEntry(user.id, {
      date,
      entryName: food.name,
      quantity,
      sourceType: "food",
      sourceId: food.id,
      ...s,
    });
    if (created) setEntries((prev) => [...prev, created]);
  };

  const logMeal = async (meal: MealWithItems) => {
    if (!user) return;
    for (const item of meal.items) {
      const s = scaleFood(item.food, item.quantity);
      const created = await addLogEntry(user.id, {
        date,
        entryName: `${meal.name} \u2014 ${item.food.name}`,
        quantity: item.quantity,
        sourceType: "meal",
        sourceId: meal.id,
        ...s,
      });
      if (created) setEntries((prev) => [...prev, created]);
    }
    setShowAdd(false);
  };

  const logRecipe = async (recipe: RecipeWithIngredients, servingsEaten: number) => {
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
            className="text-xs text-[#4C6EF5] font-medium"
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
            className="text-xs text-[#4C6EF5] font-medium mt-3"
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
          <div className="flex flex-col gap-2 mb-4">
            {entries.length === 0 && (
              <p className="text-sm text-[#6B7280] py-3 text-center">Nothing logged for this day yet.</p>
            )}
            {entries.map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between rounded-lg border border-[#E5E7EB] bg-white px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-sm text-[#1D2027] truncate">{e.entryName}</p>
                  <p className="text-xs text-[#6B7280]">
                    {Math.round(e.calories)} kcal &middot; {Math.round(e.proteinG)}g protein
                  </p>
                </div>
                <button
                  onClick={async () => {
                    setEntries((prev) => prev.filter((x) => x.id !== e.id));
                    await deleteLogEntry(e.id);
                  }}
                  className="text-[#9CA3AF] hover:text-[#DC2626] text-sm px-1 shrink-0"
                  aria-label="Remove entry"
                >
                  {"\u00d7"}
                </button>
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
            className="flex-1 rounded-md bg-[#4C6EF5] text-white text-sm font-medium py-2.5"
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
            onLogMeal={logMeal}
            onLogRecipe={logRecipe}
            onSaveSearchResult={async (result: OffSearchResult) => {
              if (!user) return null;
              const created = await saveSearchResultAsFood(user.id, result);
              if (created) setMyFoods((prev) => [...prev, created]);
              return created;
            }}
            onCreateManualFood={async (food) => {
              if (!user) return;
              const created = await createFoodItem(user.id, food);
              if (created) {
                setMyFoods((prev) => [...prev, created]);
                logFood(created, 1);
              }
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

"use client";

// components/food/MealsRecipesManager.tsx

import { useState } from "react";
import { FoodItem, MealWithItems, RecipeWithIngredients } from "@/lib/types";

type Mode = "meal" | "recipe";

export default function MealsRecipesManager({
  myFoods,
  meals,
  recipes,
  onCreateMeal,
  onCreateRecipe,
  onDeleteMeal,
  onDeleteRecipe,
  onClose,
}: {
  myFoods: FoodItem[];
  meals: MealWithItems[];
  recipes: RecipeWithIngredients[];
  onCreateMeal: (name: string, items: { foodId: string; quantity: number }[]) => void;
  onCreateRecipe: (name: string, servings: number, ingredients: { foodId: string; quantity: number }[]) => void;
  onDeleteMeal: (id: string) => void;
  onDeleteRecipe: (id: string) => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<Mode>("meal");
  const [name, setName] = useState("");
  const [servings, setServings] = useState("1");
  const [selected, setSelected] = useState<Record<string, string>>({}); // foodId -> quantity string

  const toggleFood = (id: string) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (id in next) delete next[id];
      else next[id] = "1";
      return next;
    });
  };

  const save = () => {
    if (!name.trim()) return;
    const items = Object.entries(selected)
      .filter(([, q]) => Number(q) > 0)
      .map(([foodId, q]) => ({ foodId, quantity: Number(q) }));
    if (items.length === 0) return;

    if (mode === "meal") onCreateMeal(name.trim(), items);
    else onCreateRecipe(name.trim(), Number(servings) || 1, items);

    setName("");
    setServings("1");
    setSelected({});
  };

  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-[#1D2027]">Meals &amp; Recipes</p>
        <button onClick={onClose} className="text-[#9CA3AF] text-sm">
          {"\u00d7"}
        </button>
      </div>

      <div className="flex gap-2 mb-3">
        {(["meal", "recipe"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`text-xs px-3 py-1.5 rounded-full border capitalize ${
              mode === m ? "bg-[#0D9488] text-white border-[#0D9488]" : "border-[#E5E7EB] text-[#6B7280]"
            }`}
          >
            New {m}
          </button>
        ))}
      </div>

      <input
        placeholder={mode === "meal" ? "Meal name, e.g. 'My usual breakfast'" : "Recipe name"}
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full mb-2 bg-[#F7F8FA] border border-[#E5E7EB] rounded-md px-3 py-2 text-sm text-[#1D2027] focus:outline-none focus:border-[#0D9488]"
      />

      {mode === "recipe" && (
        <input
          placeholder="Number of servings this recipe makes"
          type="number"
          value={servings}
          onChange={(e) => setServings(e.target.value)}
          className="w-full mb-2 bg-[#F7F8FA] border border-[#E5E7EB] rounded-md px-3 py-2 text-sm text-[#1D2027] focus:outline-none focus:border-[#0D9488]"
        />
      )}

      <p className="text-xs text-[#6B7280] mb-2">
        Pick foods from your library and set the quantity of each {mode === "recipe" ? "ingredient" : "item"}:
      </p>

      <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto mb-3">
        {myFoods.length === 0 && (
          <p className="text-xs text-[#6B7280] py-2">
            Your food library is empty — add foods via Search or Manual entry first.
          </p>
        )}
        {myFoods.map((f) => {
          const checked = f.id in selected;
          return (
            <div key={f.id} className="flex items-center gap-2 rounded-md border border-[#E5E7EB] px-2.5 py-2">
              <input type="checkbox" checked={checked} onChange={() => toggleFood(f.id)} className="shrink-0" />
              <span className="flex-1 text-sm text-[#1D2027] truncate">{f.name}</span>
              {checked && (
                <input
                  type="number"
                  value={selected[f.id]}
                  onChange={(e) => setSelected((prev) => ({ ...prev, [f.id]: e.target.value }))}
                  className="w-16 bg-[#F7F8FA] border border-[#E5E7EB] rounded px-2 py-1 text-xs font-mono"
                />
              )}
            </div>
          );
        })}
      </div>

      <button onClick={save} className="w-full rounded-md bg-[#0D9488] text-white text-sm font-medium py-2 mb-4">
        Save {mode}
      </button>

      {(mode === "meal" ? meals : recipes).length > 0 && (
        <div className="border-t border-[#E5E7EB] pt-3">
          <p className="text-xs text-[#6B7280] mb-2">Existing {mode}s</p>
          <div className="flex flex-col gap-1.5">
            {mode === "meal"
              ? meals.map((m) => (
                  <div key={m.id} className="flex items-center justify-between text-sm">
                    <span className="text-[#1D2027]">{m.name}</span>
                    <button onClick={() => onDeleteMeal(m.id)} className="text-[#9CA3AF] hover:text-[#DC2626] text-xs">
                      Remove
                    </button>
                  </div>
                ))
              : recipes.map((r) => (
                  <div key={r.id} className="flex items-center justify-between text-sm">
                    <span className="text-[#1D2027]">{r.name}</span>
                    <button onClick={() => onDeleteRecipe(r.id)} className="text-[#9CA3AF] hover:text-[#DC2626] text-xs">
                      Remove
                    </button>
                  </div>
                ))}
          </div>
        </div>
      )}
    </div>
  );
}

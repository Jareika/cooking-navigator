import {
  buildRecipePlan,
  type RecipePlanOptions,
} from "./recipe-engine";
import type {
  CookbookLibrary,
  CookbookPerson,
  IngredientDefinition,
  Recipe,
  ShoppingStoreMode,
} from "./types";

export interface ShoppingListItem {
  ingredient: IngredientDefinition;
  amount: number;
  unit: string;
  notes: string[];
  marketIds: string[];
}

export interface ShoppingStorePlan {
  marketIds: string[];
  missingIngredients: IngredientDefinition[];
  usedFallback: boolean;
}

export interface BuildShoppingListOptions {
  getRecipePlanOptions?: (recipe: Recipe) => RecipePlanOptions | undefined;
}

export function getResolvedRecipeIngredientIds(
  recipe: Recipe,
  library: CookbookLibrary,
  selectedPeople: CookbookPerson[],
): Set<string> {
  const plan = buildRecipePlan(recipe, library, selectedPeople);

  return new Set([
    ...plan.ingredients.map((item) => item.ingredient.id),
    ...plan.steps.flatMap((step) =>
      step.ingredients.map((item) => item.ingredientId),
    ),
  ]);
}

export function buildShoppingList(
  recipes: Recipe[],
  library: CookbookLibrary,
  selectedPeople: CookbookPerson[],
  options: BuildShoppingListOptions = {},
): ShoppingListItem[] {
  const items = new Map<string, ShoppingListItem>();
  const allMarketIds = (library.markets ?? []).map((market) => market.id);

  for (const recipe of recipes) {
    const plan = buildRecipePlan(
      recipe,
      library,
      selectedPeople,
      options.getRecipePlanOptions?.(recipe),
    );

    for (const item of plan.ingredients) {
      const unit = item.unit ?? item.ingredient.defaultUnit;
      const key = `${item.ingredient.id}::${unit}`;
      const existing = items.get(key);

      /**
       * Fehlende storeIds heißen: Die Zutat ist in jedem konfigurierten Markt
       * verfügbar. Ein explizit leeres Array heißt hingegen: unbekannt bzw.
       * noch keinem Markt zugeordnet.
       */
      const marketIds =
        item.ingredient.storeIds === undefined
          ? allMarketIds
          : item.ingredient.storeIds;

      if (existing) {
        existing.amount += item.scaledAmount;

        if (item.note && !existing.notes.includes(item.note)) {
          existing.notes.push(item.note);
        }

        continue;
      }

      items.set(key, {
        ingredient: item.ingredient,
        amount: item.scaledAmount,
        unit,
        notes: item.note ? [item.note] : [],
        marketIds,
      });
    }
  }

  return [...items.values()].sort((a, b) =>
    a.ingredient.name.localeCompare(b.ingredient.name, "de"),
  );
}

export function createShoppingStorePlan(
  items: ShoppingListItem[],
  library: CookbookLibrary,
  mode: ShoppingStoreMode,
  favoriteStoreId?: string,
  availableMarketIds?: Iterable<string>,
): ShoppingStorePlan {
  const allowedMarketIds = availableMarketIds
    ? new Set(availableMarketIds)
    : undefined;

  const markets = (library.markets ?? []).filter(
    (market) => !allowedMarketIds || allowedMarketIds.has(market.id),
  );

  const availableMarketIdSet = new Set(markets.map((market) => market.id));

  const isAvailableAtSelectedLocation = (item: ShoppingListItem): boolean =>
    item.marketIds.some((marketId) => availableMarketIdSet.has(marketId));

  if (mode === "ingredient-stores" || markets.length === 0) {
    return {
      marketIds: [],
      missingIngredients: items
        .filter((item) => !isAvailableAtSelectedLocation(item))
        .map((item) => item.ingredient),
      usedFallback: false,
    };
  }

  const missingIngredients = items
    .filter((item) => !isAvailableAtSelectedLocation(item))
    .map((item) => item.ingredient);

  const coveredItems = items.filter(isAvailableAtSelectedLocation);

  if (coveredItems.length === 0) {
    return {
      marketIds: [],
      missingIngredients,
      usedFallback: false,
    };
  }

  const favoriteCoversEverything =
    favoriteStoreId &&
    coveredItems.every((item) => item.marketIds.includes(favoriteStoreId));

  if (mode === "favorite-first" && favoriteCoversEverything) {
    return {
      marketIds: [favoriteStoreId],
      missingIngredients,
      usedFallback: false,
    };
  }

  const smallestCover = findSmallestStoreCover(
    markets.map((market) => market.id),
    coveredItems,
    favoriteStoreId,
  );

  return {
    marketIds: smallestCover,
    missingIngredients,
    usedFallback:
      mode === "favorite-first" &&
      Boolean(favoriteStoreId) &&
      !favoriteCoversEverything,
  };
}

/**
 * Bei üblichen Haushaltslisten sind nur wenige Märkte hinterlegt. Deshalb
 * berechnen wir tatsächlich die kleinste Kombination statt einer bloßen
 * Greedy-Näherung.
 */
function findSmallestStoreCover(
  marketIds: string[],
  items: ShoppingListItem[],
  favoriteStoreId?: string,
): string[] {
  for (let size = 1; size <= marketIds.length; size += 1) {
    const combinations = getCombinations(marketIds, size);
    const validCombinations = combinations.filter((combination) =>
      items.every((item) =>
        combination.some((marketId) => item.marketIds.includes(marketId)),
      ),
    );

    if (validCombinations.length === 0) {
      continue;
    }

    validCombinations.sort((a, b) => {
      const aHasFavorite = favoriteStoreId && a.includes(favoriteStoreId);
      const bHasFavorite = favoriteStoreId && b.includes(favoriteStoreId);

      if (aHasFavorite !== bHasFavorite) {
        return aHasFavorite ? -1 : 1;
      }

      return a.join(",").localeCompare(b.join(","));
    });

    return validCombinations[0] ?? [];
  }

  return [];
}

function getCombinations<T>(values: T[], size: number): T[][] {
  if (size === 0) {
    return [[]];
  }

  if (values.length < size) {
    return [];
  }

  const [first, ...rest] = values;

  if (first === undefined) {
    return [];
  }

  return [
    ...getCombinations(rest, size - 1).map((combination) => [
      first,
      ...combination,
    ]),
    ...getCombinations(rest, size),
  ];
}
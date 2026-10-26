import {
  buildRecipePlan,
  type RecipePlanOptions,
} from "./recipe-engine";
import { t } from "./i18n";
import type {
  CookbookLibrary,
  CookbookPerson,
  IngredientDefinition,
  Recipe,
  ScaledIngredient,
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

export interface PreparationRecipeSummary {
  recipe: Recipe;
  requiredAmount: number;
  unit: string;
  scaleFactor: number;
  sourceRecipeTitles: string[];
}

export interface PreparationRecipeOption
  extends PreparationRecipeSummary {
  selected: boolean;
}

export interface ResolvedShoppingList {
  items: ShoppingListItem[];
  preparationOptions: PreparationRecipeOption[];
  preparedRecipes: PreparationRecipeSummary[];
}

export interface BuildShoppingListOptions {
  getRecipePlanOptions?: (recipe: Recipe) => RecipePlanOptions | undefined;
  allRecipes?: Iterable<Recipe>;
  preparedRecipeIds?: Iterable<string>;
}

interface PreparationDemand {
  recipe: Recipe;
  ingredient: IngredientDefinition;
  requiredAmount: number;
  unit: string;
  sourceRecipeTitles: Set<string>;
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

/**
 * Rückwärtskompatibler Helfer für Stellen, die nur Zutaten benötigen.
 */
export function buildShoppingList(
  recipes: Recipe[],
  library: CookbookLibrary,
  selectedPeople: CookbookPerson[],
  options: BuildShoppingListOptions = {},
): ShoppingListItem[] {
  return buildResolvedShoppingList(
    recipes,
    library,
    selectedPeople,
    options,
  ).items;
}

/**
 * Erstellt die normale Einkaufsliste und löst optional markierte
 * Zubereitungsrezepte in ihre Zutaten auf.
 *
 * Beispiel:
 * Cocktail -> 30 ml Sirup
 * Sirup-Rezept -> erzeugt 500 ml Sirup
 *
 * Bei aktivierter Selbstzubereitung wird das Sirup-Rezept mit 30 / 500
 * skaliert. Seine Zutaten landen direkt in derselben normalen Einkaufsliste.
 */
export function buildResolvedShoppingList(
  recipes: Recipe[],
  library: CookbookLibrary,
  selectedPeople: CookbookPerson[],
  options: BuildShoppingListOptions = {},
): ResolvedShoppingList {
  const items = new Map<string, ShoppingListItem>();
  const allMarketIds = (library.markets ?? []).map((market) => market.id);
  const preparedRecipeIds = new Set(options.preparedRecipeIds ?? []);
  const allRecipes = options.allRecipes
    ? [...options.allRecipes]
    : recipes;
  const recipeById = new Map(
    allRecipes.map((recipe) => [recipe.id, recipe]),
  );

  const preparationOptions = new Map<string, PreparationDemand>();
  const preparedRecipes = new Map<string, PreparationDemand>();

  const addItem = (item: ScaledIngredient): void => {
    const unit = getIngredientUnit(item);
    const key = `${item.ingredient.id}::${unit}`;
    const existing = items.get(key);

    const marketIds =
      item.ingredient.storeIds === undefined
        ? allMarketIds
        : item.ingredient.storeIds;

    if (existing) {
      existing.amount += item.scaledAmount;

      if (item.note && !existing.notes.includes(item.note)) {
        existing.notes.push(item.note);
      }

      return;
    }

    items.set(key, {
      ingredient: item.ingredient,
      amount: item.scaledAmount,
      unit,
      notes: item.note ? [item.note] : [],
      marketIds,
    });
  };

  const addDemand = (
    target: Map<string, PreparationDemand>,
    recipe: Recipe,
    ingredient: IngredientDefinition,
    amount: number,
    unit: string,
    sourceRecipeTitle: string,
  ): void => {
    const existing = target.get(recipe.id);

    if (!existing) {
      target.set(recipe.id, {
        recipe,
        ingredient,
        requiredAmount: amount,
        unit,
        sourceRecipeTitles: new Set([sourceRecipeTitle]),
      });
      return;
    }

    if (existing.unit !== unit) {
      throw new Error(
        t("errors.preparationRecipeUnitMismatch", {
          title: recipe.title,
          expectedUnit: existing.unit,
          actualUnit: unit,
        }),
      );
    }

    existing.requiredAmount += amount;
    existing.sourceRecipeTitles.add(sourceRecipeTitle);
  };

  const validatePreparationRecipe = (
    item: ScaledIngredient,
    recipe: Recipe,
  ): { amount: number; unit: string } => {
    const produces = recipe.produces;

    if (
      !produces ||
      !Number.isFinite(produces.amount) ||
      produces.amount <= 0
    ) {
      throw new Error(
        t("errors.preparationRecipeOutputMissing", {
          title: recipe.title,
        }),
      );
    }

    if (produces.ingredientId !== item.ingredient.id) {
      throw new Error(
        t("errors.preparationRecipeProducesWrongIngredient", {
          title: recipe.title,
          ingredient: item.ingredient.name,
        }),
      );
    }

    const unit = getIngredientUnit(item);
    const producedUnit = produces.unit ?? item.ingredient.defaultUnit;

    if (unit !== producedUnit) {
      throw new Error(
        t("errors.preparationRecipeUnitMismatch", {
          title: recipe.title,
          expectedUnit: producedUnit,
          actualUnit: unit,
        }),
      );
    }

    return {
      amount: produces.amount,
      unit,
    };
  };

  const processIngredients = (
    sourceRecipe: Recipe,
    ingredientItems: ScaledIngredient[],
    ancestry: string[],
  ): void => {
    const nestedDemands = new Map<string, PreparationDemand>();

    for (const item of ingredientItems) {
      if (!item.preparationRecipeId) {
        addItem(item);
        continue;
      }

      const preparationRecipe = recipeById.get(item.preparationRecipeId);

      if (!preparationRecipe) {
        throw new Error(
          t("errors.preparationRecipeNotFound", {
            recipeId: item.preparationRecipeId,
            ingredient: item.ingredient.name,
          }),
        );
      }

      validatePreparationRecipe(item, preparationRecipe);

      addDemand(
        preparationOptions,
        preparationRecipe,
        item.ingredient,
        item.scaledAmount,
        getIngredientUnit(item),
        sourceRecipe.title,
      );

      if (!preparedRecipeIds.has(preparationRecipe.id)) {
        addItem(item);
        continue;
      }

      addDemand(
        nestedDemands,
        preparationRecipe,
        item.ingredient,
        item.scaledAmount,
        getIngredientUnit(item),
        sourceRecipe.title,
      );
    }

    for (const demand of nestedDemands.values()) {
      expandPreparationRecipe(demand, ancestry);
    }
  };

  const expandPreparationRecipe = (
    demand: PreparationDemand,
    ancestry: string[],
  ): void => {
    if (ancestry.includes(demand.recipe.id)) {
      throw new Error(
        t("errors.preparationRecipeCycle", {
          title: [...ancestry, demand.recipe.id].join(" → "),
        }),
      );
    }

    const produces = demand.recipe.produces;

    if (!produces) {
      throw new Error(
        t("errors.preparationRecipeOutputMissing", {
          title: demand.recipe.title,
        }),
      );
    }

    const scaleFactor = demand.requiredAmount / produces.amount;

    addDemand(
      preparedRecipes,
      demand.recipe,
      demand.ingredient,
      demand.requiredAmount,
      demand.unit,
      [...demand.sourceRecipeTitles].join(", "),
    );

    const plan = buildRecipePlan(
      demand.recipe,
      library,
      selectedPeople,
      {
        fixedScaleFactor: scaleFactor,
      },
    );

    processIngredients(
      demand.recipe,
      plan.ingredients,
      [...ancestry, demand.recipe.id],
    );
  };

  for (const recipe of recipes) {
    const plan = buildRecipePlan(
      recipe,
      library,
      selectedPeople,
      options.getRecipePlanOptions?.(recipe),
    );

    processIngredients(recipe, plan.ingredients, [recipe.id]);
  }

  const toSummary = (
    demand: PreparationDemand,
  ): PreparationRecipeSummary => {
    const produces = demand.recipe.produces;

    if (!produces) {
      throw new Error(
        t("errors.preparationRecipeOutputMissing", {
          title: demand.recipe.title,
        }),
      );
    }

    return {
      recipe: demand.recipe,
      requiredAmount: demand.requiredAmount,
      unit: demand.unit,
      scaleFactor: demand.requiredAmount / produces.amount,
      sourceRecipeTitles: [...demand.sourceRecipeTitles].sort((a, b) =>
        a.localeCompare(b, "de"),
      ),
    };
  };

  return {
    items: [...items.values()].sort((a, b) =>
      a.ingredient.name.localeCompare(b.ingredient.name, "de"),
    ),
    preparationOptions: [...preparationOptions.values()]
      .map((demand) => ({
        ...toSummary(demand),
        selected: preparedRecipeIds.has(demand.recipe.id),
      }))
      .sort((a, b) =>
        a.recipe.title.localeCompare(b.recipe.title, "de"),
      ),
    preparedRecipes: [...preparedRecipes.values()]
      .map(toSummary)
      .sort((a, b) =>
        a.recipe.title.localeCompare(b.recipe.title, "de"),
      ),
  };
}

function getIngredientUnit(item: ScaledIngredient): string {
  return item.unit ?? item.ingredient.defaultUnit;
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
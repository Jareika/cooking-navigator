import type {
  AllergenDefinition,
  CookbookLibrary,
  CookbookPerson,
  IngredientDefinition,
  Recipe,
  RecipeIngredient,
  RecipeMatch,
  RecipePlan,
  ScaledIngredient,
} from "./types";
import { t } from "./i18n";

const EPSILON = 0.0001;

interface IngredientResolution {
  ingredient: IngredientDefinition;
  originalIngredient: IngredientDefinition;
  usesAlternative: boolean;
}

export interface RecipePlanOptions {
  packageStoreIds?: Iterable<string>;
  manualScaleFactor?: number;
  fixedScaleFactor?: number;
}

export function findRecipeMatches(
  recipes: Recipe[],
  library: CookbookLibrary,
  selectedPeople: CookbookPerson[],
): RecipeMatch[] {
  const ingredientMap = new Map(
    library.ingredients.map((ingredient) => [ingredient.id, ingredient]),
  );
  
  const allergenMap = new Map(
    (library.allergens ?? []).map((allergen) => [allergen.id, allergen]),
  );

  return recipes.map((recipe) => {

    const blockedBy: RecipeMatch["blockedBy"] = [];

    for (const item of getRecipeIngredients(recipe)) {
      const originalIngredient = getIngredientDefinition(
        item.ingredientId,
        recipe,
        ingredientMap,
      );
      const alternativeIngredient = getAlternativeIngredient(
        item,
        recipe,
        ingredientMap,
      );

      const originalBlockers = getIngredientBlockers(
        originalIngredient,
        recipe,
        selectedPeople,
        allergenMap,
      );

      if (originalBlockers.length === 0) {
        continue;
      }

      if (alternativeIngredient) {
        const alternativeBlockers = getIngredientBlockers(
          alternativeIngredient,
          recipe,
          selectedPeople,
          allergenMap,
        );

        if (alternativeBlockers.length === 0) {
          continue;
        }

        blockedBy.push(...originalBlockers, ...alternativeBlockers);
      } else {
        blockedBy.push(...originalBlockers);
      }
    }

    return {
      recipe,
      isAllowed: blockedBy.length === 0,
      blockedBy,
    };
  });
}

function getRecipeIngredients(recipe: Recipe): RecipeIngredient[] {
  return [
    ...recipe.ingredients,
    ...recipe.steps.flatMap((step) =>
      step.ingredients,
    ),
  ];
}

function getIngredientDefinition(
  ingredientId: string,
  recipe: Recipe,
  ingredientMap: Map<string, IngredientDefinition>,
): IngredientDefinition {
  const ingredient = ingredientMap.get(ingredientId);

  if (!ingredient) {
    throw new Error(
      t("errors.recipeReferencesUnknownIngredient", {
        title: recipe.title,
        ingredientId,
      }),
    );
  }

  return ingredient;
}

function getAlternativeIngredient(
  item: RecipeIngredient,
  recipe: Recipe,
  ingredientMap: Map<string, IngredientDefinition>,
): IngredientDefinition | undefined {
  if (!item.alternativeIngredientId) {
    return undefined;
  }

  return getIngredientDefinition(
    item.alternativeIngredientId,
    recipe,
    ingredientMap,
  );
}

function getIngredientBlockers(
  ingredient: IngredientDefinition,
  recipe: Recipe,
  selectedPeople: CookbookPerson[],
  allergenMap: Map<string, AllergenDefinition>,
): RecipeMatch["blockedBy"] {
  const blockers: RecipeMatch["blockedBy"] = [];

  for (const person of selectedPeople) {
    for (const avoidance of person.avoidances) {
      if (
        recipe.restrictionScopeIds.includes(avoidance.scopeId) &&
        avoidance.ingredientIds.includes(ingredient.id)
      ) {
        blockers.push({
          kind: "avoidance",
          person,
          ingredient,
          scopeId: avoidance.scopeId,
        });
      }
    }

    for (const allergenId of person.intoleranceAllergenIds ?? []) {
      const allergen = allergenMap.get(allergenId);

      if (!allergen) {
        throw new Error(
          t("errors.guestReferencesUnknownAllergen", {
            name: person.name,
            allergenId,
          }),
        );
      }

      if ((ingredient.allergenIds ?? []).includes(allergenId)) {
        blockers.push({
          kind: "allergen",
          person,
          ingredient,
          allergen,
        });
      }
    }
  }

  return blockers;
}

function resolveIngredient(
  item: RecipeIngredient,
  recipe: Recipe,
  selectedPeople: CookbookPerson[],
  ingredientMap: Map<string, IngredientDefinition>,
  allergenMap: Map<string, AllergenDefinition>,
): IngredientResolution {
  const originalIngredient = getIngredientDefinition(
    item.ingredientId,
    recipe,
    ingredientMap,
  );
  const alternativeIngredient = getAlternativeIngredient(
    item,
    recipe,
    ingredientMap,
  );

  const originalBlockers = getIngredientBlockers(
    originalIngredient,
    recipe,
    selectedPeople,
    allergenMap,
  );

  if (originalBlockers.length === 0) {
    return {
      ingredient: originalIngredient,
      originalIngredient,
      usesAlternative: false,
    };
  }

  if (
    alternativeIngredient &&
    getIngredientBlockers(
      alternativeIngredient,
      recipe,
      selectedPeople,
      allergenMap,
    ).length === 0
  ) {
    return {
      ingredient: alternativeIngredient,
      originalIngredient,
      usesAlternative: true,
    };
  }

  throw new Error(
    t("errors.recipeIncompatibleWithGuests", {
      title: recipe.title,
    }),
  );
}

export function buildRecipePlan(
  recipe: Recipe,
  library: CookbookLibrary,
  selectedPeople: CookbookPerson[],
  options: RecipePlanOptions = {},
): RecipePlan {
  const ingredientMap = new Map(
    library.ingredients.map((ingredient) => [ingredient.id, ingredient]),
  );
  const allergenMap = new Map(
    (library.allergens ?? []).map((allergen) => [allergen.id, allergen]),
  );

  const eaterTotal = selectedPeople.reduce(
    (sum, person) => sum + person.eaterWeight,
    0,
  );

  const requestedScaleFactor =
    eaterTotal > 0 ? eaterTotal / recipe.baseEaters : 1;

  const manualScaleFactor =
    options.manualScaleFactor &&
    Number.isFinite(options.manualScaleFactor) &&
    options.manualScaleFactor > 0
      ? options.manualScaleFactor
      : undefined;

  const fixedScaleFactor =
    options.fixedScaleFactor &&
    Number.isFinite(options.fixedScaleFactor) &&
    options.fixedScaleFactor > 0
      ? options.fixedScaleFactor
      : undefined;

  const packageAnchor = manualScaleFactor || fixedScaleFactor
    ? undefined
    : findPackageAnchor(
        recipe,
        selectedPeople,
        ingredientMap,
        allergenMap,
        requestedScaleFactor,
        options.packageStoreIds,
      );

  const scaleFactor =
    fixedScaleFactor ??
    manualScaleFactor ??
    (packageAnchor
      ? Math.max(
          requestedScaleFactor,
          packageAnchor.resultingScale,
        )
      : requestedScaleFactor);

  const scale = (item: RecipeIngredient): ScaledIngredient => {
    const resolved = resolveIngredient(
      item,
      recipe,
      selectedPeople,
      ingredientMap,
      allergenMap,
    );

    const scaledAmount = item.amount * scaleFactor;
    const allergens = resolveIngredientAllergens(
      resolved.ingredient,
      allergenMap,
    );

    return {
      ...item,
      ingredientId: resolved.ingredient.id,
      ingredient: resolved.ingredient,
      originalIngredient: resolved.originalIngredient,
      usesAlternative: resolved.usesAlternative,
      allergens,
      scaledAmount,
      displayAmount: roundForDisplay(scaledAmount),
    };
  };

  return {
    recipe,
    eaterTotal,
    scaleFactor,
    packageAnchor: packageAnchor
      ? {
          ingredient: packageAnchor.ingredient,
          requiredAmount: packageAnchor.requiredAmount,
          chosenAmount: packageAnchor.chosenAmount,
        }
      : undefined,
    ingredients: recipe.ingredients.map(scale),
    steps: recipe.steps.map((step) => ({
      ...step,
      ingredients: step.ingredients.map(scale),
    })),
  };
}

function resolveIngredientAllergens(
  ingredient: IngredientDefinition,
  allergenMap: Map<string, AllergenDefinition>,
): AllergenDefinition[] {
  return (ingredient.allergenIds ?? []).map((allergenId) => {
    const allergen = allergenMap.get(allergenId);

    if (!allergen) {
      throw new Error(
        t("errors.ingredientReferencesUnknownAllergen", {
          name: ingredient.name,
          allergenId,
        }),
      );
    }

    return allergen;
  });
}

function findPackageAnchor(
  recipe: Recipe,
  selectedPeople: CookbookPerson[],
  ingredientMap: Map<string, IngredientDefinition>,
  allergenMap: Map<string, AllergenDefinition>,
  requestedScaleFactor: number,
  packageStoreIds?: Iterable<string>,
):
  | {
      ingredient: IngredientDefinition;
      requiredAmount: number;
      chosenAmount: number;
	  resultingScale: number;
    }
  | undefined {
  const recipeIngredients = recipe.ingredients.map((recipeIngredient) => ({
    recipeIngredient,
    ingredient: resolveIngredient(
      recipeIngredient,
      recipe,
      selectedPeople,
      ingredientMap,
      allergenMap,
    ).ingredient,
  }));

  const primary = recipeIngredients.filter(
    (entry) => entry.ingredient.resourcePriority === "primary",
  );

  const candidates =
    primary.length > 0
      ? primary
      : recipeIngredients.filter(
          (entry) => entry.ingredient.resourcePriority === "secondary",
        );

  let best:
    | {
        ingredient: IngredientDefinition;
        requiredAmount: number;
        chosenAmount: number;
        resultingScale: number;
      }
    | undefined;

  for (const candidate of candidates) {
    const requiredAmount = candidate.recipeIngredient.amount * requestedScaleFactor;
    const packageSizes = getPackageSizesForStores(
      candidate.ingredient,
      packageStoreIds,
    );

    const chosenAmount = choosePackageAmount(
      requiredAmount,
      packageSizes,
      candidate.ingredient.packageRoundUpThreshold ?? 0.75,
    );

    if (chosenAmount === undefined || requiredAmount <= EPSILON) {
      continue;
    }

    const resultingScale = chosenAmount / candidate.recipeIngredient.amount;

    if (!best || resultingScale > best.resultingScale) {
      best = {
        ingredient: candidate.ingredient,
        requiredAmount,
        chosenAmount,
        resultingScale,
      };
    }
  }

  return best;
}

function getPackageSizesForStores(
  ingredient: IngredientDefinition,
  packageStoreIds?: Iterable<string>,
): number[] {
  const storeIds = packageStoreIds ? [...packageStoreIds] : [];

  if (storeIds.length === 0) {
    return ingredient.packageSizes ?? [];
  }

  const packageSizes = storeIds.flatMap(
    (storeId) =>
      ingredient.storePackageSizes?.[storeId] ??
      ingredient.packageSizes ??
      [],
  );

  return [...new Set(packageSizes)]
    .filter((size) => Number.isFinite(size) && size > 0)
    .sort((a, b) => a - b);
}

function choosePackageAmount(
  requiredAmount: number,
  packageSizes: number[],
  roundUpThreshold: number,
): number | undefined {
  const sizes = [...new Set(packageSizes)]
    .filter((size) => size > 0)
    .sort((a, b) => a - b);

  if (sizes.length === 0) {
    return undefined;
  }

  const largest = sizes.at(-1) ?? 0;
  const upperBound = Math.ceil(requiredAmount / largest + 2) * largest;
  const reachable = new Set<number>([0]);

  for (let current = 0; current <= upperBound; current += 1) {
    if (!reachable.has(current)) {
      continue;
    }

    for (const size of sizes) {
      if (current + size <= upperBound) {
        reachable.add(current + size);
      }
    }
  }

  const totals = [...reachable].filter((value) => value > 0).sort((a, b) => a - b);

  const lower = [...totals]
    .reverse()
    .find((value) => value <= requiredAmount + EPSILON);

  const upper = totals.find((value) => value >= requiredAmount - EPSILON);

  if (upper === undefined) {
    return undefined;
  }

  if (lower === undefined || Math.abs(lower - upper) < EPSILON) {
    return upper;
  }

  return requiredAmount / upper >= roundUpThreshold ? upper : lower;
}

function roundForDisplay(value: number): number {
  if (value >= 100) {
    return Math.round(value / 5) * 5;
  }

  if (value >= 10) {
    return Math.round(value);
  }

  return Math.round(value * 10) / 10;
}
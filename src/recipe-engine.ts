import type {
  AllergenDefinition,
  CookbookLibrary,
  CookbookPerson,
  IngredientDefinition,
  Recipe,
  RecipeMatch,
  RecipePlan,
  ScaledIngredient,
} from "./types";

const EPSILON = 0.0001;

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
    const recipeIngredientIds = getRecipeIngredientIds(recipe);
    const recipeIngredients = [...recipeIngredientIds].map((ingredientId) => {
      const ingredient = ingredientMap.get(ingredientId);

      if (!ingredient) {
        throw new Error(
          `Recipe "${recipe.title}" references unknown ingredient "${ingredientId}".`,
        );
      }

      return ingredient;
    });

    const blockedBy: RecipeMatch["blockedBy"] = [];

    for (const person of selectedPeople) {
      for (const avoidance of person.avoidances) {
        if (!recipe.restrictionScopeIds.includes(avoidance.scopeId)) {
          continue;
        }

        for (const ingredientId of avoidance.ingredientIds) {
          if (!recipeIngredientIds.has(ingredientId)) {
            continue;
          }

          const ingredient = ingredientMap.get(ingredientId);

          if (ingredient) {
            blockedBy.push({
              kind: "avoidance",
              person,
              ingredient,
              scopeId: avoidance.scopeId,
            });
          }
        }
      }

      for (const allergenId of person.intoleranceAllergenIds ?? []) {
        const allergen = allergenMap.get(allergenId);

        if (!allergen) {
          throw new Error(
            `Guest "${person.name}" references unknown allergen "${allergenId}".`,
          );
        }

        for (const ingredient of recipeIngredients) {
          if (!(ingredient.allergenIds ?? []).includes(allergenId)) {
            continue;
          }

          blockedBy.push({
            kind: "allergen",
            person,
            ingredient,
            allergen,
          });
        }
      }
    }

    return {
      recipe,
      isAllowed: blockedBy.length === 0,
      blockedBy,
    };
  });
}

function getRecipeIngredientIds(recipe: Recipe): Set<string> {
  return new Set([
    ...recipe.ingredients.map((ingredient) => ingredient.ingredientId),
    ...recipe.steps.flatMap((step) =>
      step.ingredients.map((ingredient) => ingredient.ingredientId),
    ),
  ]);
}

export function buildRecipePlan(
  recipe: Recipe,
  library: CookbookLibrary,
  selectedPeople: CookbookPerson[],
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

  const packageAnchor = findPackageAnchor(
    recipe,
    ingredientMap,
    requestedScaleFactor,
  );

  const scaleFactor = packageAnchor
    ? Math.max(
        requestedScaleFactor,
        packageAnchor.resultingScale,
      )
    : requestedScaleFactor;

  const scale = (item: {
    ingredientId: string;
    amount: number;
    unit?: string;
    note?: string;
  }): ScaledIngredient => {
    const ingredient = ingredientMap.get(item.ingredientId);

    if (!ingredient) {
      throw new Error(
        `Recipe "${recipe.title}" references unknown ingredient "${item.ingredientId}".`,
      );
    }

    const scaledAmount = item.amount * scaleFactor;
    const allergens = resolveIngredientAllergens(
      ingredient,
      allergenMap,
    );

    return {
      ...item,
      ingredient,
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
        `Ingredient "${ingredient.name}" references unknown allergen "${allergenId}".`,
      );
    }

    return allergen;
  });
}

function findPackageAnchor(
  recipe: Recipe,
  ingredientMap: Map<string, IngredientDefinition>,
  requestedScaleFactor: number,
):
  | {
      ingredient: IngredientDefinition;
      requiredAmount: number;
      chosenAmount: number;
	  resultingScale: number;
    }
  | undefined {
  const recipeIngredients = recipe.ingredients
    .map((item) => ({
      recipeIngredient: item,
      ingredient: ingredientMap.get(item.ingredientId),
    }))
    .filter(
      (
        entry,
      ): entry is {
        recipeIngredient: Recipe["ingredients"][number];
        ingredient: IngredientDefinition;
      } => Boolean(entry.ingredient),
    );

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
    const chosenAmount = choosePackageAmount(
      requiredAmount,
      candidate.ingredient.packageSizes ?? [],
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

/**
 * Finds reachable totals based on package sizes.
 *
 * With [400, 500], reachable values are 400, 500, 800, 900, 1000, ...
 * We deliberately allow combinations, because two 400 g packs are valid.
 */
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
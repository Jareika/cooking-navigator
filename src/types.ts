export type ResourcePriority = "none" | "primary" | "secondary";
export type ImagePlacement = "cover" | "after-ingredients";

export interface CookbookSettings {
  databaseFolder: string;
  defaultRecipeFile: string;
  showPackageSuggestions: boolean;
  showIngredientAllergens: boolean;
  preventSidePaneSwipes: boolean;
  categoryButtons: CategoryButtonSettings[];
  guestButtons: GuestButtonSettings[];
  allRecipesButtonImagePath?: string;
}

export interface CategoryButtonSettings {
  categoryId: string;
  imagePath?: string;
}

export interface GuestButtonSettings {
  personId: string;
  imagePath?: string;
}

export interface RecipeCategory {
  id: string;
  name: string;
  color?: string;
}

export interface RestrictionScope {
  id: string;
  name: string;
  description?: string;
}

export interface IngredientDefinition {
  id: string;
  name: string;
  defaultUnit: string;
  defaultUnitPlural?: string;
  resourcePriority: ResourcePriority;
  allergenIds?: string[];

  /**
   * Available package sizes in the ingredient's default unit.
   * Example for minced meat: [400, 500].
   */
  packageSizes?: number[];

  /**
   * When a calculated amount reaches this ratio of the next possible
   * package total, the recipe is scaled up to that package total.
   *
   * Example: next package total 800 g, threshold 0.75:
   * - 550 g -> stays at the lower feasible total
   * - 600 g -> scales up to 800 g
   */
  packageRoundUpThreshold?: number;
}

export interface PersonAvoidance {
  scopeId: string;
  ingredientIds: string[];
}

export interface CookbookPerson {
  id: string;
  name: string;
  avatarUrl?: string;
  color: string;

  /**
   * 1 = one average eater.
   * 0.5 = half portion.
   * 1.5 = large portion.
   */
  eaterWeight: number;

  avoidances: PersonAvoidance[];
  intoleranceAllergenIds?: string[];
  favoriteRecipeIds: string[];
}

export interface AllergenDefinition {
  id: string;
  name: string;
}

export interface CookbookLibrary {
  version: 1;
  categories: RecipeCategory[];
  restrictionScopes: RestrictionScope[];
  allergens?: AllergenDefinition[];
  ingredients: IngredientDefinition[];
  people: CookbookPerson[];
}

export interface RecipeIngredient {
  ingredientId: string;
  amount: number;
  unit?: string;
  unitPlural?: string;
  Suffix?: string;
  note?: string;
}

export interface RecipeStep {
  title?: string;
  ingredients: RecipeIngredient[];
  instructions: string[];
  timerMinutes?: number;
}

export interface Recipe {
  id: string;
  title: string;
  categoryIds: string[];

  /**
   * Number of average eaters for which the base ingredient amounts apply.
   */
  baseEaters: number;

  /**
   * A recipe can belong to one or more restriction contexts.
   * Example: ["cooked"] or ["baking"].
   */
  restrictionScopeIds: string[];

  imageUrl?: string;
  imagePlacement?: ImagePlacement;

  prepMinutes?: number;
  cookMinutes?: number;
  bakeMinutes?: number;

  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
}

export interface RecipeDocument {
  version: 1;
  recipes: Recipe[];
}

export interface ScaledIngredient extends RecipeIngredient {
  ingredient: IngredientDefinition;
  allergens: AllergenDefinition[];
  scaledAmount: number;
  displayAmount: number;
}

export interface RecipeMatch {
  recipe: Recipe;
  isAllowed: boolean;
  blockedBy: RecipeBlocker[];
}

export type RecipeBlocker =
  | {
      kind: "avoidance";
      person: CookbookPerson;
      ingredient: IngredientDefinition;
      scopeId: string;
    }
  | {
      kind: "allergen";
      person: CookbookPerson;
      ingredient: IngredientDefinition;
      allergen: AllergenDefinition;
    };


export interface RecipePlan {
  recipe: Recipe;
  eaterTotal: number;
  scaleFactor: number;
  ingredients: ScaledIngredient[];
  steps: Array<RecipeStep & { ingredients: ScaledIngredient[] }>;
  packageAnchor?: {
    ingredient: IngredientDefinition;
    requiredAmount: number;
    chosenAmount: number;
  };
}
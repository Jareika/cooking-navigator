export type ResourcePriority = "none" | "primary" | "secondary";
export type ImagePlacement = "cover" | "after-ingredients";
export type ShoppingStoreMode =
  | "favorite-first"
  | "fewest-stores"
  | "ingredient-stores";
  
export interface RecipeScaleOverride {
  ingredientId: string;
  targetAmount: number;
  unit: string;
  scaleFactor: number;
}

export interface ManualShoppingItem {
  id: string;
  name: string;
  amount?: number;
  unit?: string;
}

export interface CookbookSettings {
  databaseFolder: string;
  defaultRecipeFile: string;
  enableJsonBackups: boolean;
  jsonBackupCount: number;
  backupFolder: string;
  confirmShoppingPlanningReset: boolean;
  showPackageSuggestions: boolean;
  showIngredientAllergens: boolean;
  preventSidePaneSwipes: boolean;
  cookbookFocusMode: boolean;
  categoryButtons: CategoryButtonSettings[];
  guestButtons: GuestButtonSettings[];
  allRecipesButtonImagePath?: string;
  shoppingRecipeIds: string[];
  activeGuestIds: string[];
  manualRecipeScaleOverrides: Record<string, RecipeScaleOverride>;
  shoppingStoreMode: ShoppingStoreMode;
  shoppingLocationId?: string;
  favoriteStoreId?: string;
  shoppingListEmailRecipient?: string;
  shoppingExcludedIngredientIds: string[];
  manualShoppingItems: ManualShoppingItem[];
  timerAlarmSoundPath?: string;
  timerAlarmVolume: number;
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
   * Märkte, in denen diese Zutat erhältlich ist.
   *
   * undefined: in allen konfigurierten Märkten erhältlich
   * []: noch keinem Markt zugeordnet
   */
  storeIds?: string[];

  /**
   * Available package sizes in the ingredient's default unit.
   * Example for minced meat: [400, 500].
   */
  packageSizes?: number[];
  
  /**
   * Packungsgrößen je Supermarkt. Ein Eintrag überschreibt für diesen Markt
   * die allgemeinen packageSizes der Zutat.
   *
   * Beispiel:
   * {
   *   "aldi-haseluenne": [400],
   *   "edeka-haseluenne": [200, 500]
   * }
   */
  storePackageSizes?: Record<string, number[]>;

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

export interface StoreDefinition {
  id: string;
  name: string;
  locationId?: string;
  color?: string;
}

export interface ShoppingLocation {
  id: string;
  name: string;
}

export interface CookbookLibrary {
  version: 1;
  categories: RecipeCategory[];
  restrictionScopes: RestrictionScope[];
  allergens?: AllergenDefinition[];
  shoppingLocations?: ShoppingLocation[];
  markets?: StoreDefinition[];
  ingredients: IngredientDefinition[];
  people: CookbookPerson[];
}

export interface RecipeIngredient {
  ingredientId: string;
  alternativeIngredientId?: string;
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
  originalIngredient: IngredientDefinition;
  usesAlternative: boolean;
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
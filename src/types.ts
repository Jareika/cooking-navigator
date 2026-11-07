export type ResourcePriority = "none" | "primary" | "secondary";
export type ImagePlacement = "cover" | "after-ingredients";
export type AllRecipesButtonPlacement =
  | "start"
  | "end"
  | "hidden";
  
export type FavoriteRecipeDisplayMode =
  | "top"
  | "normal"
  | "button";
  
export type CategorySortIndex = 1 | 2 | 3;

export const FAVORITE_RECIPES_BUTTON_ID =
  "__cookbook-favorite-recipes__";

export type ShoppingStoreMode =
  | "favorite-first"
  | "fewest-stores"
  | "ingredient-stores";
  
export type UtensilShape = "cylinder" | "rectangular";

export interface UtensilCategory {
  id: string;
  name: string;
  shape: UtensilShape;
}

export type UtensilDimensions =
  | {
      diameterCm: number;
      heightCm: number;
      widthCm?: never;
      lengthCm?: never;
    }
  | {
      widthCm: number;
      lengthCm: number;
      heightCm: number;
      diameterCm?: never;
    };
	
export type CylindricalUtensilDimensions = Extract<
  UtensilDimensions,
  { diameterCm: number }
>;

export type RectangularUtensilDimensions = Extract<
  UtensilDimensions,
  { widthCm: number; lengthCm: number }
>;

export function isCylindricalUtensilDimensions(
  dimensions: UtensilDimensions,
): dimensions is CylindricalUtensilDimensions {
  return (
    typeof dimensions.diameterCm === "number" &&
    Number.isFinite(dimensions.diameterCm) &&
    dimensions.diameterCm > 0 &&
    Number.isFinite(dimensions.heightCm) &&
    dimensions.heightCm > 0
  );
}

export function isRectangularUtensilDimensions(
  dimensions: UtensilDimensions,
): dimensions is RectangularUtensilDimensions {
  return (
    typeof dimensions.widthCm === "number" &&
    Number.isFinite(dimensions.widthCm) &&
    dimensions.widthCm > 0 &&
    typeof dimensions.lengthCm === "number" &&
    Number.isFinite(dimensions.lengthCm) &&
    dimensions.lengthCm > 0 &&
    Number.isFinite(dimensions.heightCm) &&
    dimensions.heightCm > 0
  );
}

export function hasValidUtensilDimensions(
  shape: UtensilShape,
  dimensions: UtensilDimensions,
): boolean {
  return shape === "cylinder"
    ? isCylindricalUtensilDimensions(dimensions)
    : isRectangularUtensilDimensions(dimensions);
}

export type CookbookUtensil = {
  id: string;
  name: string;
  categoryId: string;
} & UtensilDimensions;

export type RecipeUtensilRequirement = {
  categoryId: string;
  maxHeightCm?: number;
} & UtensilDimensions;

  
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
  allRecipesButtonPlacement: AllRecipesButtonPlacement;
  favoriteRecipeDisplayMode: FavoriteRecipeDisplayMode;
  lastSelectedCategoryId?: string;
  allRecipesButtonImagePath?: string;
  shoppingRecipeIds: string[];
  activeGuestIds: string[];
  manualRecipeScaleOverrides: Record<string, RecipeScaleOverride>;
  shoppingStoreMode: ShoppingStoreMode;
  shoppingLocationId?: string;
  favoriteStoreIdsByLocation: Record<string, string>;
  favoriteStoreId?: string;
  shoppingListEmailRecipient?: string;
  shoppingExcludedIngredientIds: string[];
  manualShoppingItems: ManualShoppingItem[];
  preparedRecipeIds: string[];
  timerAlarmSoundPath?: string;
  timerAlarmVolume: number;
  utensils: CookbookUtensil[];
  selectedUtensilIdsByRecipe: Record<string, string>;
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
  storeIds?: string[];
  packageSizes?: number[];
  storePackageSizes?: Record<string, number[]>;
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
  utensilCategories?: UtensilCategory[];
  restrictionScopes: RestrictionScope[];
  allergens?: AllergenDefinition[];
  shoppingLocations?: ShoppingLocation[];
  markets?: StoreDefinition[];
  ingredients: IngredientDefinition[];
  people: CookbookPerson[];
}

export interface RecipeIngredient {
  ingredientId: string;
  sectionHeading?: string;
  preparationRecipeId?: string;
  alternativeIngredientId?: string;
  amount: number;
  unit?: string;
  unitPlural?: string;
  Suffix?: string;
  note?: string;
}

export interface RecipeTip {
  heading: string;
  text: string;
}

export interface RecipePairing {
  text?: string;
  recipeId?: string;
}

export interface RecipeStep {
  title?: string;
  ingredients: RecipeIngredient[];
  instructions: string[];
  timerMinutes?: number;
  tips?: RecipeTip[];
}

export interface Recipe {
  id: string;
  title: string;
  categoryIds: string[];
  categorySortIndexes?: Record<string, CategorySortIndex>;
  baseEaters: number;
  pairsWellWith?: RecipePairing[];
  tips?: RecipeTip[];
  produces?: {
    ingredientId: string;
    amount: number;
    unit?: string;
  };
  restrictionScopeIds: string[];
  imageUrl?: string;
  imagePlacement?: ImagePlacement;
  prepMinutes?: number;
  cookMinutes?: number;
  bakeMinutes?: number;
  inactiveMinutes?: number;
  utensilRequirements?: RecipeUtensilRequirement[];
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
}

export function getRecipeUtensilRequirements(
  recipe: Recipe,
): RecipeUtensilRequirement[] {
  return recipe.utensilRequirements ?? [];
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
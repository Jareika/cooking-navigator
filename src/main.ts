import { Notice, Plugin, WorkspaceLeaf } from "obsidian";
import { CookbookDatabase } from "./database";
import { CookingTimerController } from "./cooking-timer";
import { CookbookSettingTab } from "./settings";
import { GuestSettingsModal } from "./guest-settings-modal";
import { resolveImageUrl } from "./image-utils";
import {
  COOKBOOK_VIEW_TYPE,
  CookbookView,
} from "./cookbook-view";
import type {
  CookbookLibrary,
  CookbookSettings,
  CookbookPerson,
  GuestButtonSettings,
  ManualShoppingItem,
  RecipeCategory,
  RecipeDocument,
  RecipeScaleOverride,
  Recipe,
  ShoppingLocation,
  StoreDefinition,
} from "./types";
import { IngredientManagementModal } from "./ingredient-management-modal";
import { RecipeEditorModal } from "./recipe-editor-modal";

interface ObsidianSettingsView {
  open(): void;
  openTabById(id: string): void;
}

interface AppWithSettingsView {
  setting: ObsidianSettingsView;
}

const DEFAULT_SETTINGS: CookbookSettings = {
  databaseFolder: "Cookbook",
  defaultRecipeFile: "recipes-main.json",
  enableJsonBackups: true,
  jsonBackupCount: 2,
  backupFolder: "Cookbook/Backups",
  confirmShoppingPlanningReset: true,
  showPackageSuggestions: true,
  showIngredientAllergens: true,
  preventSidePaneSwipes: true,
  cookbookFocusMode: false,
  categoryButtons: [],
  guestButtons: [],
  allRecipesButtonImagePath: undefined,
  shoppingRecipeIds: [],
  activeGuestIds: [],
  manualRecipeScaleOverrides: {},
  shoppingStoreMode: "favorite-first",
  shoppingLocationId: undefined,
  favoriteStoreId: undefined,
  shoppingListEmailRecipient: undefined,
  shoppingExcludedIngredientIds: [],
  manualShoppingItems: [],
  timerAlarmSoundPath: undefined,
  timerAlarmVolume: 0.8,
};

const EXAMPLE_LIBRARY: CookbookLibrary = {
  version: 1,
  categories: [
    { id: "pasta", name: "Pasta", color: "#e67e22" },
    { id: "oven", name: "Oven dishes", color: "#8e44ad" },
    { id: "quick", name: "Quick meals", color: "#27ae60" }
  ],
  restrictionScopes: [
    {
      id: "cooked",
      name: "Cooked dishes",
      description: "Restrictions relevant for cooked savoury meals."
    },
    {
      id: "baking",
      name: "Baking",
      description: "Restrictions relevant for cakes, pastries and baked goods."
    }
  ],
  allergens: [
    { id: "gluten", name: "Gluten" },
    { id: "laktose", name: "Laktose" }
  ],
  ingredients: [
    {
      id: "minced-beef",
      name: "Minced beef",
      defaultUnit: "g",
      resourcePriority: "primary",
      packageSizes: [400, 500],
      packageRoundUpThreshold: 0.75
    },
    {
      id: "spaghetti",
      name: "Spaghetti",
      defaultUnit: "g",
      resourcePriority: "none",
      allergenIds: ["gluten"]
    },
    {
      id: "tomato-passata",
      name: "Tomato passata",
      defaultUnit: "ml",
      resourcePriority: "none"
    },
    {
      id: "cream",
      name: "Cream",
      defaultUnit: "ml",
      resourcePriority: "secondary",
	  allergenIds: ["laktose"],
      packageSizes: [200],
      packageRoundUpThreshold: 0.75
    },
    {
      id: "onion",
      name: "Onion",
      defaultUnit: "piece",
      resourcePriority: "none"
    }
  ],
  people: [
    {
      id: "alex",
      name: "Alex",
      color: "#e67e22",
      eaterWeight: 1.5,
      avoidances: [],
      favoriteRecipeIds: ["spaghetti-bolognese"]
    },
    {
      id: "sam",
      name: "Sam",
      color: "#3498db",
      eaterWeight: 0.5,
      avoidances: [
        {
          scopeId: "cooked",
          ingredientIds: ["cream"]
        }
      ],
      favoriteRecipeIds: []
    }
  ]
};

const EXAMPLE_RECIPES: RecipeDocument = {
  version: 1,
  recipes: [
    {
      id: "spaghetti-bolognese",
      title: "Spaghetti Bolognese",
      categoryIds: ["pasta"],
      baseEaters: 2,
      restrictionScopeIds: ["cooked"],
      prepMinutes: 15,
      cookMinutes: 45,
      imagePlacement: "after-ingredients",
      ingredients: [
        { ingredientId: "minced-beef", amount: 400 },
        { ingredientId: "spaghetti", amount: 250 },
        { ingredientId: "tomato-passata", amount: 500 },
        { ingredientId: "onion", amount: 1 }
      ],
      steps: [
        {
          title: "Prepare",
          ingredients: [
            { ingredientId: "onion", amount: 1 }
          ],
          instructions: [
            "Finely dice the onion.",
            "Heat a large pan over medium-high heat."
          ]
        },
        {
          title: "Cook the sauce",
          ingredients: [
            { ingredientId: "minced-beef", amount: 400 },
            { ingredientId: "tomato-passata", amount: 500 }
          ],
          instructions: [
            "Brown the minced beef thoroughly.",
            "Add the onion and cook for two minutes.",
            "Add passata and simmer gently."
          ],
          timerMinutes: 35
        },
        {
          title: "Cook the pasta",
          ingredients: [
            { ingredientId: "spaghetti", amount: 250 }
          ],
          instructions: [
            "Cook spaghetti in salted water until al dente.",
            "Serve with the sauce."
          ],
          timerMinutes: 10
        }
      ]
    }
  ]
};

export default class CookbookPlugin extends Plugin {
  declare settings: CookbookSettings;
  database!: CookbookDatabase;
  cookingTimers!: CookingTimerController;
  private settingsTab!: CookbookSettingTab;
  private knownCategories: RecipeCategory[] = [];
  private knownPeople: CookbookPerson[] = [];
  private knownMarkets: StoreDefinition[] = [];
  private knownShoppingLocations: ShoppingLocation[] = [];

  async onload(): Promise<void> {
    await this.loadSettings();
	this.applyCookbookFocusMode();

    this.database = new CookbookDatabase(
      this.app.vault,
      () => this.settings,
    );
	
    this.cookingTimers = new CookingTimerController({
      getAlarmSoundUrl: () => {
        const soundPath = this.settings.timerAlarmSoundPath;

        return soundPath
          ? this.resolveVaultImageUrl(soundPath)
          : undefined;
      },
      getAlarmVolume: () => this.settings.timerAlarmVolume,
      notice: (message) => this.notice(message),
    });

    this.registerView(
      COOKBOOK_VIEW_TYPE,
      (leaf) => new CookbookView(leaf, this),
    );

    this.addRibbonIcon("cooking-pot", "Open cookbook", () => {
      void this.openCookbook();
    });

    this.addCommand({
      id: "open-cookbook",
      name: "Open cookbook",
      callback: () => void this.openCookbook(),
    });

    this.addCommand({
      id: "create-example-database",
      name: "Create example database",
      callback: () => void this.createExampleDatabase(),
    });

    this.settingsTab = new CookbookSettingTab(this.app, this);
    this.addSettingTab(this.settingsTab);

    this.app.workspace.onLayoutReady(() => {
      void this.refreshCategoryButtons();
    });
	
    this.app.workspace.trigger("parse-style-settings");
  }
  
  onunload(): void {
    this.cookingTimers?.dispose();
	document.body.removeClass("cookbook-focus-mode");
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign(
      {},
      DEFAULT_SETTINGS,
      (await this.loadData()) as Partial<CookbookSettings>,
    );
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }
  
  isCookbookFocusModeEnabled(): boolean {
    return this.settings.cookbookFocusMode;
  }

  async toggleCookbookFocusMode(): Promise<void> {
    this.settings.cookbookFocusMode = !this.settings.cookbookFocusMode;
    await this.saveSettings();
    this.applyCookbookFocusMode();
  }

  private applyCookbookFocusMode(): void {
    document.body.toggleClass(
      "cookbook-focus-mode",
      this.settings.cookbookFocusMode,
    );
  }

  async createExampleDatabase(): Promise<void> {
    await this.database.createExampleDatabase(
      EXAMPLE_LIBRARY,
      EXAMPLE_RECIPES,
    );
	
    await this.refreshCategoryButtons();

    new Notice(
      `Cookbook files are available in "${this.settings.databaseFolder}".`,
    );
  }
  
  async loadLibrary(): Promise<CookbookLibrary> {
    const library = await this.database.loadLibrary();
    await this.syncCategoryButtons(library.categories);
    await this.syncGuestButtons(library.people);
    this.knownMarkets = library.markets ?? [];
	this.knownShoppingLocations = library.shoppingLocations ?? [];
    return library;
  }

  async refreshCategoryButtons(): Promise<void> {
    try {
      const library = await this.database.loadLibrary();
      await this.syncCategoryButtons(library.categories);
      await this.syncGuestButtons(library.people);
      this.knownMarkets = library.markets ?? [];
	  this.knownShoppingLocations = library.shoppingLocations ?? [];
    } catch {
      this.knownCategories = [];
      this.knownPeople = [];
      this.knownMarkets = [];
	  this.knownShoppingLocations = [];
      this.settingsTab?.update();
    }
  }
  
  getKnownShoppingLocations(): ShoppingLocation[] {
    return this.knownShoppingLocations;
  }

  getKnownMarkets(locationId?: string): StoreDefinition[] {
    if (!locationId) {
      return this.knownMarkets;
    }

    return this.knownMarkets.filter(
      (market) => market.locationId === locationId,
    );
  }

  getShoppingRecipeIds(): string[] {
    return [...new Set(this.settings.shoppingRecipeIds)];
  }

  isRecipeInShoppingList(recipeId: string): boolean {
    return this.settings.shoppingRecipeIds.includes(recipeId);
  }

  async toggleRecipeInShoppingList(recipeId: string): Promise<boolean> {
    const recipeIds = this.getShoppingRecipeIds();
    const currentIndex = recipeIds.indexOf(recipeId);

    if (currentIndex >= 0) {
      recipeIds.splice(currentIndex, 1);
    } else {
      recipeIds.push(recipeId);
    }

    this.settings.shoppingRecipeIds = recipeIds;
    await this.saveSettings();

    return recipeIds.includes(recipeId);
  }
  
  getRecipeScaleOverride(
    recipeId: string,
  ): RecipeScaleOverride | undefined {
    return this.settings.manualRecipeScaleOverrides[recipeId];
  }

  async setRecipeScaleOverride(
    recipeId: string,
    override: RecipeScaleOverride,
  ): Promise<void> {
    this.settings.manualRecipeScaleOverrides[recipeId] = override;
    await this.saveSettings();
  }

  async clearRecipeScaleOverride(recipeId: string): Promise<void> {
    delete this.settings.manualRecipeScaleOverrides[recipeId];
    await this.saveSettings();
  }

  getActiveGuestIds(): string[] {
    return [...new Set(this.settings.activeGuestIds)];
  }

  async setActiveGuestIds(guestIds: Iterable<string>): Promise<void> {
    this.settings.activeGuestIds = [...new Set(guestIds)];
    await this.saveSettings();
  }

  /**
   * Setzt den temporären Einkaufs- und Planungszustand zurück.
   * Persönliche Einstellungen wie Marktstrategie und Favoritenmarkt bleiben
   * bewusst erhalten.
   */
  async resetShoppingPlanning(): Promise<void> {
    this.settings.shoppingRecipeIds = [];
    this.settings.shoppingExcludedIngredientIds = [];
    this.settings.activeGuestIds = [];
    this.settings.manualRecipeScaleOverrides = {};
    this.settings.shoppingLocationId = undefined;
	this.settings.manualShoppingItems = [];

    await this.saveSettings();
  }

  getShoppingExcludedIngredientIds(): string[] {
    return [...new Set(this.settings.shoppingExcludedIngredientIds)];
  }

  isShoppingIngredientExcluded(ingredientId: string): boolean {
    return this.settings.shoppingExcludedIngredientIds.includes(ingredientId);
  }

  async setShoppingIngredientExcluded(
    ingredientId: string,
    excluded: boolean,
  ): Promise<void> {
    const ingredientIds = new Set(this.getShoppingExcludedIngredientIds());

    if (excluded) {
      ingredientIds.add(ingredientId);
    } else {
      ingredientIds.delete(ingredientId);
    }

    this.settings.shoppingExcludedIngredientIds = [...ingredientIds];
    await this.saveSettings();
  }
  
  getManualShoppingItems(): ManualShoppingItem[] {
    return this.settings.manualShoppingItems
      .filter((item) => item.name.trim().length > 0)
      .map((item) => ({ ...item }));
  }

  async addManualShoppingItem(
    name: string,
    amount?: number,
    unit?: string,
  ): Promise<void> {
    this.settings.manualShoppingItems.push({
      id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: name.trim(),
      amount,
      unit: unit?.trim() || undefined,
    });

    await this.saveSettings();
  }

  async removeManualShoppingItem(itemId: string): Promise<void> {
    this.settings.manualShoppingItems =
      this.settings.manualShoppingItems.filter(
        (item) => item.id !== itemId,
      );

    await this.saveSettings();
  }
  
  async setShoppingLocation(locationId: string | undefined): Promise<void> {
    this.settings.shoppingLocationId = locationId;

    if (
      this.settings.favoriteStoreId &&
      locationId &&
      !this.getKnownMarkets(locationId).some(
        (market) => market.id === this.settings.favoriteStoreId,
      )
    ) {
      this.settings.favoriteStoreId = undefined;
    }

    await this.saveSettings();
  }

  openIngredientManagement(onChanged: () => void): void {
    new IngredientManagementModal(this.app, this, onChanged).open();
  }
  
  openRecipeEditor(onChanged: () => void): void {
    new RecipeEditorModal(this.app, this, onChanged).open();
  }

  async createRecipe(recipe: Recipe): Promise<void> {
    await this.database.createRecipe(recipe);
  }

  getOrderedCategories(
    categories: RecipeCategory[] = this.knownCategories,
  ): Array<{ category: RecipeCategory; imagePath?: string }> {
    const categoryById = new Map(
      categories.map((category) => [category.id, category]),
    );

    const ordered: Array<{ category: RecipeCategory; imagePath?: string }> =
      [];
    const addedIds = new Set<string>();

    for (const button of this.settings.categoryButtons) {
      const category = categoryById.get(button.categoryId);

      if (!category || addedIds.has(category.id)) {
        continue;
      }

      ordered.push({
        category,
        imagePath: button.imagePath,
      });

      addedIds.add(category.id);
    }

    for (const category of categories) {
      if (!addedIds.has(category.id)) {
        ordered.push({ category });
      }
    }

    return ordered;
  }
  
  getOrderedPeople(
    people: CookbookPerson[] = this.knownPeople,
  ): Array<{ person: CookbookPerson; imagePath?: string }> {
    const personById = new Map(
      people.map((person) => [person.id, person]),
    );

    const ordered: Array<{ person: CookbookPerson; imagePath?: string }> = [];
    const addedIds = new Set<string>();

    for (const button of this.settings.guestButtons) {
      const person = personById.get(button.personId);

      if (!person || addedIds.has(person.id)) {
        continue;
      }

      ordered.push({
        person,
        imagePath: button.imagePath,
      });

      addedIds.add(person.id);
    }

    for (const person of people) {
      if (!addedIds.has(person.id)) {
        ordered.push({ person });
      }
    }

    return ordered;
  }

  async saveLibrary(library: CookbookLibrary): Promise<void> {
    await this.database.saveLibrary(library);
    await this.syncGuestButtons(library.people);
    this.knownMarkets = library.markets ?? [];
    this.knownShoppingLocations = library.shoppingLocations ?? [];

    if (
      this.settings.shoppingLocationId &&
      !this.knownShoppingLocations.some(
        (location) => location.id === this.settings.shoppingLocationId,
      )
    ) {
      this.settings.shoppingLocationId = undefined;
      await this.saveSettings();
    }
  }

  async setGuestButtonImage(
    personId: string,
    imagePath: string | undefined,
  ): Promise<void> {
    const button = this.getOrCreateGuestButton(personId);
    button.imagePath = imagePath;
    await this.saveSettings();
  }

  async moveGuestButton(
    personId: string,
    direction: -1 | 1,
  ): Promise<void> {
    const currentIndex = this.settings.guestButtons.findIndex(
      (button) => button.personId === personId,
    );

    const targetIndex = currentIndex + direction;

    if (
      currentIndex < 0 ||
      targetIndex < 0 ||
      targetIndex >= this.settings.guestButtons.length
    ) {
      return;
    }

    const [button] = this.settings.guestButtons.splice(currentIndex, 1);

    if (!button) {
      return;
    }

    this.settings.guestButtons.splice(targetIndex, 0, button);
    await this.saveSettings();
  }

  getGuestButtonIndex(personId: string): number {
    return this.settings.guestButtons.findIndex(
      (button) => button.personId === personId,
    );
  }

  openGuestSettings(onChanged: () => void): void {
    new GuestSettingsModal(this.app, this, onChanged).open();
  }
  
  openCookbookSettings(): void {
    const appWithSettings = this.app as unknown as AppWithSettingsView;

    appWithSettings.setting.open();
    appWithSettings.setting.openTabById(this.manifest.id);
  }

  resolveVaultImageUrl(imageUrl: string): string {
    return resolveImageUrl(this.app.vault, imageUrl);
  }

  async restoreLibraryFromBackup(): Promise<boolean> {
    const restored = await this.database.restoreLibraryFromBackup();

    this.notice(
      restored
        ? "Die Cookbook-Bibliothek wurde aus dem neuesten gültigen Backup wiederhergestellt."
        : "Kein gültiges Backup der Cookbook-Bibliothek wurde gefunden.",
    );

    return restored;
  }

  private async syncCategoryButtons(
    categories: RecipeCategory[],
  ): Promise<void> {
    this.knownCategories = categories;

    const categoryIds = new Set(categories.map((category) => category.id));
    const usedIds = new Set<string>();

    const existing = this.settings.categoryButtons.filter((button) => {
      if (!categoryIds.has(button.categoryId) || usedIds.has(button.categoryId)) {
        return false;
      }

      usedIds.add(button.categoryId);
      return true;
    });

    const missing = categories
      .filter((category) => !usedIds.has(category.id))
      .map((category) => ({ categoryId: category.id }));

    const nextButtons = [...existing, ...missing];

    if (
      JSON.stringify(nextButtons) !==
      JSON.stringify(this.settings.categoryButtons)
    ) {
      this.settings.categoryButtons = nextButtons;
      await this.saveSettings();
    }

    this.settingsTab?.update();
  }
  
  private async syncGuestButtons(
    people: CookbookPerson[],
  ): Promise<void> {
    this.knownPeople = people;

    const personIds = new Set(people.map((person) => person.id));
    const usedIds = new Set<string>();

    const existing = this.settings.guestButtons.filter((button) => {
      if (!personIds.has(button.personId) || usedIds.has(button.personId)) {
        return false;
      }

      usedIds.add(button.personId);
      return true;
    });

    const missing: GuestButtonSettings[] = people
      .filter((person) => !usedIds.has(person.id))
      .map((person) => ({ personId: person.id }));

    const nextButtons = [...existing, ...missing];

    if (
      JSON.stringify(nextButtons) !==
      JSON.stringify(this.settings.guestButtons)
    ) {
      this.settings.guestButtons = nextButtons;
      await this.saveSettings();
    }

    this.settingsTab?.update();
  }

  private getOrCreateGuestButton(personId: string): GuestButtonSettings {
    let button = this.settings.guestButtons.find(
      (entry) => entry.personId === personId,
    );

    if (!button) {
      button = { personId };
      this.settings.guestButtons.push(button);
    }

    return button;
  }

  notice(message: string): void {
    new Notice(message);
  }

  async openCookbook(): Promise<void> {
    const existing = this.app.workspace.getLeavesOfType(
      COOKBOOK_VIEW_TYPE,
    )[0];

    const leaf: WorkspaceLeaf =
      existing ??
      this.app.workspace.getLeaf("tab");

    await leaf.setViewState({
      type: COOKBOOK_VIEW_TYPE,
      active: true,
    });

    await this.app.workspace.revealLeaf(leaf);

    const view = leaf.view;

    if (view instanceof CookbookView) {
      await view.reload();
    }
  }
}
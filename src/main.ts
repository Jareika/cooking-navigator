import { Notice, Plugin, WorkspaceLeaf } from "obsidian";
import { CookbookDatabase } from "./database";
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
  RecipeCategory,
  RecipeDocument,
} from "./types";

const DEFAULT_SETTINGS: CookbookSettings = {
  databaseFolder: "Cookbook",
  defaultRecipeFile: "recipes-main.json",
  showPackageSuggestions: true,
  showIngredientAllergens: true,
  preventSidePaneSwipes: true,
  categoryButtons: [],
  guestButtons: [],
  allRecipesButtonImagePath: undefined,
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
  private settingsTab!: CookbookSettingTab;
  private knownCategories: RecipeCategory[] = [];
  private knownPeople: CookbookPerson[] = [];

  async onload(): Promise<void> {
    await this.loadSettings();

    this.database = new CookbookDatabase(
      this.app.vault,
      () => this.settings,
    );

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

    void this.refreshCategoryButtons();
	
    this.app.workspace.trigger("parse-style-settings");
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
    return library;
  }

  async refreshCategoryButtons(): Promise<void> {
    try {
      const library = await this.database.loadLibrary();
      await this.syncCategoryButtons(library.categories);
	  await this.syncGuestButtons(library.people);
    } catch {
      this.knownCategories = [];
	  this.knownPeople = [];
      this.settingsTab?.update();
    }
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

  resolveVaultImageUrl(imageUrl: string): string {
    return resolveImageUrl(this.app.vault, imageUrl);
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
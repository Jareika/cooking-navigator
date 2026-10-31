import {
  ItemView,
  Platform,
  setIcon,
  WorkspaceLeaf,
} from "obsidian";
import type CookbookPlugin from "./main";
import { resolveImageUrl } from "./image-utils";
import type {
  CookbookLibrary,
  CookbookPerson,
  ManualShoppingItem,
  Recipe,
  RecipeMatch,
  RecipePlan,
  ScaledIngredient,
} from "./types";
import { buildRecipePlan, findRecipeMatches } from "./recipe-engine";
import { RecipeScaleModal } from "./recipe-scale-modal";
import { ResetShoppingPlanningModal } from "./reset-shopping-planning-modal";
import {
  buildResolvedShoppingList,
  buildShoppingList,
  createShoppingStorePlan,
  getResolvedRecipeIngredientIds,
} from "./shopping-list";
import type { CookingTimerSnapshot } from "./cooking-timer";
import { getLocale, t } from "./i18n";

export const COOKBOOK_VIEW_TYPE = "cookbook-browser-view";

type Screen =
  | { kind: "browser" }
  | { kind: "guests" }
  | { kind: "shopping" }
  | { kind: "cook"; recipe: Recipe; page: number };

export class CookbookView extends ItemView {
  private library: CookbookLibrary | null = null;
  private recipes: Recipe[] = [];
  private selectedPersonIds = new Set<string>();
  private selectedCategoryId: string | null = null;
  private screen: Screen = { kind: "browser" };
  private styleSettingsObserver: MutationObserver | null = null;
  private browserCategoryListEl: HTMLElement | null = null;
  private browserRecipeGridEl: HTMLElement | null = null;
  private guestListEl: HTMLElement | null = null;
  private shoppingContentEl: HTMLElement | null = null;
  private timerUnsubscribers: Array<() => void> = [];

  constructor(
    leaf: WorkspaceLeaf,
    private readonly plugin: CookbookPlugin,
  ) {
    super(leaf);
  }

  getViewType(): string {
    return COOKBOOK_VIEW_TYPE;
  }

  getDisplayText(): string {
	return t("app.cookbook");
  }

  getIcon(): string {
    return "cooking-pot";
  }

  async onOpen(): Promise<void> {
	this.watchStyleSettings();
    await this.reload();
  }
  
  async onClose(): Promise<void> {
    this.styleSettingsObserver?.disconnect();
    this.styleSettingsObserver = null;
	this.disposeTimerSubscriptions();
  }

  async reload(): Promise<void> {
    try {
      this.library = await this.plugin.loadLibrary();
      this.recipes = await this.plugin.database.loadRecipes();
	  this.restoreSelectedPeople();
      await this.restoreSelectedCategory();
      this.render();
    } catch (error) {
      this.renderError(error);
    }
  }

  private renderError(error: unknown): void {
    this.containerEl.empty();

    const wrapper = this.containerEl.createDiv("cookbook-empty-state");
    wrapper.createEl("h2", {
      text: t("errors.cookbookNotConfigured"),
    });
    wrapper.createEl("p", {
      text:
        error instanceof Error
          ? error.message
          : t("errors.unknownDatabaseError"),
    });

    const createExampleButton = wrapper.createEl("button", {
      text: t("errors.createExampleDatabase"),
      cls: "mod-cta",
    });

    createExampleButton.addEventListener("click", () => {
      void this.createExampleDatabaseAndReload();
    });

    const restoreBackupButton = wrapper.createEl("button", {
      text: t("errors.restoreLibraryBackup"),
    });

    restoreBackupButton.addEventListener("click", () => {
      void this.restoreLibraryBackupAndReload();
    });
  }
  
  private async createExampleDatabaseAndReload(): Promise<void> {
    try {
      await this.plugin.createExampleDatabase();
      await this.reload();
    } catch (error) {
      this.renderError(error);
    }
  }
  
  private async restoreLibraryBackupAndReload(): Promise<void> {
    try {
      const restored = await this.plugin.restoreLibraryFromBackup();

      if (restored) {
        await this.reload();
      }
    } catch (error) {
      this.renderError(error);
    }
  }

  private render(): void {
    const scrollPosition = this.captureScrollPosition();

    try {
      if (!this.library) {
        return;
      }
	  
	  this.disposeTimerSubscriptions();
	  
      this.browserCategoryListEl = null;
      this.browserRecipeGridEl = null;
      this.guestListEl = null;
      this.shoppingContentEl = null;

      this.containerEl.empty();

      if (this.screen.kind === "browser") {
        this.renderBrowser();
      } else if (this.screen.kind === "guests") {
        this.renderGuestSelection();
      } else if (this.screen.kind === "shopping") {
        this.renderShoppingList();
      } else {
        this.renderCookingMode(this.screen.recipe, this.screen.page);
        return;
      }

      this.restoreScrollPosition(scrollPosition);
    } catch (error) {
      this.renderError(error);
    }
  }
  
  private captureScrollPosition(): {
    containerTop: number;
    rootTop: number;
  } {
    const root = this.containerEl.querySelector<HTMLElement>(
      ".cookbook-root",
    );

    return {
      containerTop: this.containerEl.scrollTop,
      rootTop: root?.scrollTop ?? 0,
    };
  }

  private restoreScrollPosition(position: {
    containerTop: number;
    rootTop: number;
  }): void {
    window.requestAnimationFrame(() => {
      const root = this.containerEl.querySelector<HTMLElement>(
        ".cookbook-root",
      );

      this.containerEl.scrollTop = position.containerTop;

      if (root) {
        root.scrollTop = position.rootTop;
      }
    });
  }

  private renderBrowser(): void {
    if (!this.library) {
      return;
    }

    const root = this.containerEl.createDiv({
      cls: [
        "cookbook-root",
        "cookbook-browser-screen",
        "cookbook-recipe-browser-screen",
      ],
    });
    const content = root.createDiv("cookbook-browser-content");
    const layout = content.createDiv("cookbook-browser-layout");
    this.browserCategoryListEl = layout.createDiv("cookbook-category-list");
    this.browserRecipeGridEl = layout.createDiv("cookbook-recipe-grid");

    this.renderBrowserActions(root);
    this.renderBrowserCategories();
    this.renderBrowserRecipeGrid();
  }
 
  private refreshBrowserContent(): void {
    if (
      this.screen.kind !== "browser" ||
      !this.browserCategoryListEl ||
      !this.browserRecipeGridEl
    ) {
      this.render();
      return;
    }
	
    const categoryScrollTop = this.browserCategoryListEl.scrollTop;
    const categoryScrollLeft = this.browserCategoryListEl.scrollLeft;

    this.renderBrowserCategories();
    this.renderBrowserRecipeGrid();
	
	this.restoreBrowserCategoryScroll(categoryScrollTop, categoryScrollLeft);
  }
  
  private restoreBrowserCategoryScroll(
    top: number,
    left: number,
  ): void {
    window.requestAnimationFrame(() => {
      if (!this.browserCategoryListEl) {
        return;
      }

      this.browserCategoryListEl.scrollTop = top;
      this.browserCategoryListEl.scrollLeft = left;
    });
  }

  private renderBrowserCategories(): void {
    if (!this.library || !this.browserCategoryListEl) {
      return;
    }

    const categoryList = this.browserCategoryListEl;
    categoryList.empty();

    const allRecipesButtonPlacement =
      this.plugin.getAllRecipesButtonPlacement();

    if (allRecipesButtonPlacement !== "hidden") {
      this.renderAllRecipesCategoryButton(
        categoryList,
        allRecipesButtonPlacement,
      );
    }

    for (const { category, imagePath } of this.plugin.getOrderedCategories(
      this.library.categories,
    )) {
      const button = this.createCategoryButton(categoryList, {
        cls: [
          "cookbook-category-button",
          this.selectedCategoryId === category.id ? "is-active" : "",
		  imagePath ? "has-category-image" : "",
        ],
		pressed: this.selectedCategoryId === category.id,
      });
	  
      this.addCategoryButtonLabel(
        button,
        category.name,
        `cookbook-category-label-${category.id}`,
      );

      if (category.color) {
        button.style.setProperty("--category-color", category.color);
      }

      if (imagePath) {
        const image = button.createEl("img", {
          cls: "cookbook-category-button-image",
          attr: {
            src: this.resolveImageUrl(imagePath),
            alt: "",
          },
        });

        image.addEventListener("error", () => {
          image.remove();
          button.removeClass("has-category-image");
        });
      }

      button.addEventListener("click", () => {
        void this.selectCategory(
          allRecipesButtonPlacement === "hidden" &&
            this.selectedCategoryId === category.id
            ? null
            : category.id,
        );
      });
    }
  }

  private renderAllRecipesCategoryButton(
    parent: HTMLElement,
    placement: "start" | "end",
  ): void {
    const allRecipesImagePath =
      this.plugin.settings.allRecipesButtonImagePath;

    const allCategoriesButton = this.createCategoryButton(parent, {
      cls: [
        "cookbook-category-button",
        "cookbook-all-recipes-category-button",
        placement === "end" ? "is-at-end" : "",
        this.selectedCategoryId === null ? "is-active" : "",
		allRecipesImagePath ? "has-category-image" : "",
      ],
      pressed: this.selectedCategoryId === null,
    });

    if (!allRecipesImagePath) {
      setIcon(allCategoriesButton, "list");
    }

    this.addCategoryButtonLabel(
      allCategoriesButton,
      t("browser.allRecipes"),
      "cookbook-all-recipes-label",
    );

    if (allRecipesImagePath) {
      const image = allCategoriesButton.createEl("img", {
        cls: "cookbook-category-button-image",
        attr: {
          src: this.resolveImageUrl(allRecipesImagePath),
          alt: "",
        },
      });

      image.addEventListener("error", () => {
        image.remove();
		allCategoriesButton.removeClass("has-category-image");
        setIcon(allCategoriesButton, "list");
      });
    }

    allCategoriesButton.addEventListener("click", () => {
      void this.selectCategory(null);
    });
  }

  private async selectCategory(categoryId: string | null): Promise<void> {
    this.selectedCategoryId = categoryId;
    await this.plugin.setLastSelectedCategoryId(categoryId ?? undefined);
    this.refreshBrowserContent();
  }

  private renderBrowserRecipeGrid(): void {
    if (!this.library || !this.browserRecipeGridEl) {
      return;
    }

    const grid = this.browserRecipeGridEl;
    grid.empty();

    const selectedPeople = this.getSelectedPeople();
    const matches = findRecipeMatches(
      this.recipes,
      this.library,
      selectedPeople,
    );
	
    const shoppingIngredientIds = this.getShoppingIngredientIds(selectedPeople);

    const visibleRecipes = matches.filter(
      (match) =>
        match.isAllowed &&
        (!this.selectedCategoryId ||
          match.recipe.categoryIds.includes(this.selectedCategoryId)),
    );

    if (visibleRecipes.length === 0) {
      grid.createDiv({
        cls: "cookbook-empty-state",
        text: t("browser.noRecipesMatch"),
      });
      return;
    }

    for (const match of visibleRecipes) {
      this.renderRecipeCard(
        grid,
        match,
        selectedPeople,
        shoppingIngredientIds,
      );
    }
  }
  
  private renderGuestSelection(): void {
    if (!this.library) {
      return;
    }

    const root = this.containerEl.createDiv({
      cls: ["cookbook-root", "cookbook-browser-screen"],
    });
    const content = root.createDiv("cookbook-browser-content");

    content.createEl("h2", { text: t("guests.title") });
    content.createEl("p", {
      cls: "cookbook-guest-selection-description",
	  text: t("guests.description"),
    });

    this.guestListEl = content.createDiv("cookbook-guest-list");
    this.renderGuestList();

    this.renderBrowserActions(root);
  }

  private refreshGuestList(): void {
    if (this.screen.kind !== "guests" || !this.guestListEl) {
      this.render();
      return;
    }

    this.renderGuestList();
  }

  private renderGuestList(): void {
    if (!this.library || !this.guestListEl) {
      return;
    }

    const guestList = this.guestListEl;
    guestList.empty();

    for (const { person, imagePath } of this.plugin.getOrderedPeople(
      this.library.people,
    )) {
      const selected = this.selectedPersonIds.has(person.id);
      const button = this.createGuestButton(guestList, {
        cls: [
          "cookbook-guest-card",
          selected ? "is-selected" : "",
        ],
        pressed: selected,
      });

      button.style.setProperty("--person-color", person.color);

      this.addGuestButtonLabel(
        button,
        person.name,
        `cookbook-guest-label-${person.id}`,
      );

      const avatarUrl = imagePath ?? person.avatarUrl;

      if (avatarUrl) {
        const image = button.createEl("img", {
          cls: "cookbook-guest-button-image",
          attr: {
            src: this.resolveImageUrl(avatarUrl),
            alt: "",
          },
        });

        image.addEventListener("error", () => {
          image.remove();
          button.createSpan({
            cls: "cookbook-guest-button-initials",
            text: initials(person.name),
          });
        });
      } else {
        button.createSpan({
          cls: "cookbook-guest-button-initials",
          text: initials(person.name),
        });
      }

      button.addEventListener("click", () => {
        void this.toggleSelectedPerson(person.id);
      });
    }
  }

  private renderBrowserActions(parent: HTMLElement): void {
    const actions = parent.createDiv("cookbook-browser-actions");
	
    if (Platform.isDesktopApp) {
      const closeButton = actions.createEl("button", {
        cls: [
          "cookbook-browser-action",
          "cookbook-close-app-action",
        ],
        attr: {
          "aria-label": t("app.closeObsidian"),
          title: t("app.closeObsidian"),
        },
      });

      setIcon(closeButton, "power");

      closeButton.addEventListener("click", () => {
        window.close();
      });
    }

    const reloadButton = actions.createEl("button", {
      cls: "cookbook-browser-action",
      attr: {
        "aria-label": t("app.reloadCookbook"),
        title: t("app.reloadCookbook"),
      },
    });

    setIcon(reloadButton, "refresh-cw");
    reloadButton.addEventListener("click", () => void this.reload());

    const isGuestSelection = this.screen.kind === "guests";
    const guestButton = actions.createEl("button", {
      cls: [
        "cookbook-browser-action",
        isGuestSelection ? "is-active" : "",
      ],
      attr: {
        "aria-label": isGuestSelection
          ? t("actions.backToRecipeBrowser")
          : t("actions.selectGuests"),
        "aria-pressed": String(isGuestSelection),
        title: isGuestSelection
          ? t("actions.backToRecipeBrowser")
          : t("actions.selectGuests"),
      },
    });

    setIcon(guestButton, isGuestSelection ? "book-open" : "users");

    guestButton.addEventListener("click", () => {
      this.screen = {
        kind: isGuestSelection ? "browser" : "guests",
      };
      this.render();
    });
	
    const isShoppingList = this.screen.kind === "shopping";
    const shoppingButton = actions.createEl("button", {
      cls: [
        "cookbook-browser-action",
        "cookbook-shopping-list-action",
        isShoppingList ? "is-active" : "",
      ],
      attr: {
        "aria-label": isShoppingList
          ? t("actions.backToRecipeBrowser")
          : t("actions.openShoppingList"),
        "aria-pressed": String(isShoppingList),
        title: isShoppingList
          ? t("actions.backToRecipeBrowser")
          : t("actions.openShoppingList"),
      },
    });

    setIcon(shoppingButton, isShoppingList ? "book-open" : "shopping-cart");

    shoppingButton.addEventListener("click", () => {
      this.screen = {
        kind: isShoppingList ? "browser" : "shopping",
      };
      this.render();
    });
	
    if (this.screen.kind === "cook") {
      const recipe = this.screen.recipe;
	  
      const backToBrowserButton = actions.createEl("button", {
        cls: [
          "cookbook-browser-action",
          "cookbook-back-to-browser-action",
        ],
        attr: {
          "aria-label": t("actions.backToRecipeBrowser"),
          title: t("actions.backToRecipeBrowser"),
        },
      });

      setIcon(backToBrowserButton, "book-open");

      backToBrowserButton.addEventListener("click", () => {
        this.screen = { kind: "browser" };
        this.render();
      });

      const scaleButton = actions.createEl("button", {
        cls: [
          "cookbook-browser-action",
          "cookbook-recipe-scale-action",
          this.plugin.getRecipeScaleOverride(recipe.id)
            ? "is-active"
            : "",
        ],
        attr: {
          "aria-label": t("actions.scaleRecipe"),
          title: t("actions.scaleRecipe"),
        },
      });

      setIcon(scaleButton, "scale");

      scaleButton.addEventListener("click", () => {
        const selectedPeople = this.getSelectedPeople();
        const packageStoreIds = this.getRecipePackageStoreIds(
          recipe,
          selectedPeople,
        );

        new RecipeScaleModal(
          this.app,
          this.plugin,
          recipe,
          selectedPeople,
          this.getRecipePlanOptions(
            recipe,
            packageStoreIds,
          ),
          () => this.render(),
        ).open();
      });
    }
	
    const hasShoppingPlanningState =
      this.plugin.getShoppingRecipeIds().length > 0 ||
      this.plugin.getShoppingExcludedIngredientIds().length > 0 ||
      this.plugin.getActiveGuestIds().length > 0 ||
	  this.plugin.getPreparedRecipeIds().length > 0 ||
      Object.keys(this.plugin.settings.manualRecipeScaleOverrides).length > 0 ||
      Boolean(this.plugin.settings.shoppingLocationId);

    if (hasShoppingPlanningState) {
      const resetShoppingPlanningButton = actions.createEl("button", {
        cls: [
          "cookbook-browser-action",
          "cookbook-reset-shopping-planning-action",
        ],
        attr: {
          "aria-label": t("actions.resetShoppingPlanning"),
          title: t("actions.resetShoppingPlanning"),
        },
      });

      setIcon(resetShoppingPlanningButton, "rotate-ccw");

      resetShoppingPlanningButton.addEventListener("click", () => {
        void this.requestShoppingPlanningReset();
      });
    }
	
    const createRecipeButton = actions.createEl("button", {
      cls: [
        "cookbook-browser-action",
        "cookbook-create-recipe-action",
      ],
      attr: {
        "aria-label": t("actions.createRecipe"),
        title: t("actions.createRecipe"),
      },
    });

    setIcon(createRecipeButton, "file-plus-2");

    createRecipeButton.addEventListener("click", () => {
      this.plugin.openRecipeEditor(() => {
        void this.reload();
      });
    });
	
    const manageIngredientsButton = actions.createEl("button", {
      cls: [
        "cookbook-browser-action",
        "cookbook-manage-ingredients-action",
      ],
      attr: {
        "aria-label": t("actions.manageIngredients"),
        title: t("actions.manageIngredients"),
      },
    });

    setIcon(manageIngredientsButton, "carrot");
    manageIngredientsButton.addEventListener("click", () => {
      this.plugin.openIngredientManagement(() => void this.reload());
    });

    const manageGuestsButton = actions.createEl("button", {
      cls: "cookbook-browser-action",
      attr: {
        "aria-label": t("actions.manageGuests"),
        title: t("actions.manageGuests"),
      },
    });

    setIcon(manageGuestsButton, "settings-2");
	
    const isFocusMode = this.plugin.isCookbookFocusModeEnabled();
    const focusModeButton = actions.createEl("button", {
      cls: [
        "cookbook-browser-action",
        "cookbook-focus-mode-toggle",
        isFocusMode ? "is-active" : "",
      ],
      attr: {
        "aria-label": isFocusMode
          ? t("actions.disableFocusMode")
          : t("actions.enableFocusMode"),
        "aria-pressed": String(isFocusMode),
        title: isFocusMode
          ? t("actions.disableFocusMode")
          : t("actions.enableFocusMode"),
      },
    });

    setIcon(focusModeButton, isFocusMode ? "minimize-2" : "maximize-2");

    focusModeButton.addEventListener("click", () => {
      void this.toggleFocusMode();
    });

    manageGuestsButton.addEventListener("click", () => {
      this.plugin.openGuestSettings(() => {
        void this.reload();
      });
    });
	
    const settingsButton = actions.createEl("button", {
      cls: "cookbook-browser-action",
      attr: {
        "aria-label": t("actions.openSettings"),
        title: t("app.settings"),
      },
    });

    setIcon(settingsButton, "settings");

    settingsButton.addEventListener("click", () => {
      this.plugin.openCookbookSettings();
    });

    const showAllergens = this.plugin.settings.showIngredientAllergens;
    const allergenButton = actions.createEl("button", {
      cls: [
        "cookbook-browser-action",
        "cookbook-allergen-toggle",
        showAllergens ? "" : "is-disabled",
      ],
      attr: {
        "aria-label": showAllergens
          ? t("actions.hideAllergens")
          : t("actions.showAllergens"),
        "aria-pressed": String(showAllergens),
        title: showAllergens
          ? t("actions.hideAllergens")
          : t("actions.showAllergens"),
      },
    });

    setIcon(allergenButton, "shield-alert");

    allergenButton.addEventListener("click", () => {
      void this.toggleIngredientAllergens();
    });
  }

  private async toggleIngredientAllergens(): Promise<void> {
    this.plugin.settings.showIngredientAllergens =
      !this.plugin.settings.showIngredientAllergens;

    await this.plugin.saveSettings();
    this.render();
  }
  
  private async toggleFocusMode(): Promise<void> {
    await this.plugin.toggleCookbookFocusMode();
    this.render();
  }

  private renderRecipeCard(
    parent: HTMLElement,
    match: RecipeMatch,
    selectedPeople: CookbookPerson[],
	shoppingIngredientIds: Set<string>,
  ): void {
    const recipe = match.recipe;
    const recipeIngredientIds = this.getRecipeIngredientIds(
      recipe,
      selectedPeople,
    );
    const matchingIngredientCount = [...recipeIngredientIds].filter((id) =>
      shoppingIngredientIds.has(id),
    ).length;
    const hasAllIngredientsInShoppingList =
      recipeIngredientIds.size > 0 &&
      matchingIngredientCount === recipeIngredientIds.size;
    const isInShoppingList = this.plugin.isRecipeInShoppingList(recipe.id);

    const row = parent.createDiv("cookbook-recipe-card-row");
    const card = row.createEl("button", {
      cls: "cookbook-recipe-card",
    });

    const favouritePeople = selectedPeople.filter((person) =>
      person.favoriteRecipeIds.includes(recipe.id),
    );

    if (favouritePeople.length > 0) {
      card.style.setProperty("--favorite-color", favouritePeople[0].color);
      card.addClass("is-favorite");
    }

    card.createEl("strong", { text: recipe.title });

    const metadata = card.createDiv("cookbook-recipe-meta");
    const duration = [
      recipe.prepMinutes
        ? t("browser.preparation", { minutes: recipe.prepMinutes })
        : null,
      recipe.cookMinutes
        ? t("browser.cooking", { minutes: recipe.cookMinutes })
        : null,
      recipe.bakeMinutes
        ? t("browser.baking", { minutes: recipe.bakeMinutes })
        : null,
    ]
      .filter(Boolean)
      .join(" · ");

    metadata.setText(duration || t("browser.noTimeInformation"));

    card.addEventListener("click", () => {
      this.screen = { kind: "cook", recipe, page: 0 };
      this.render();
    });

    const shoppingButton = row.createEl("button", {
      cls: [
        "cookbook-recipe-shopping-button",
        isInShoppingList ? "is-in-shopping-list" : "",
        hasAllIngredientsInShoppingList ? "is-complete" : "",
      ],
      attr: {
        "aria-label": isInShoppingList
          ? t("shopping.removeRecipe", { title: recipe.title })
          : t("shopping.addRecipe", { title: recipe.title }),
        title:
          recipeIngredientIds.size > 0
            ? t("shopping.recipeIngredientOverlap", {
                matching: matchingIngredientCount,
                total: recipeIngredientIds.size,
              })
            : t("shopping.noIngredients"),
      },
    });

    setIcon(shoppingButton, isInShoppingList ? "shopping-cart" : "plus");

    shoppingButton.createSpan({
      cls: "cookbook-recipe-shopping-overlap",
      text: `${matchingIngredientCount}/${recipeIngredientIds.size}`,
    });

    shoppingButton.addEventListener("click", () => {
      void this.toggleRecipeShoppingList(recipe);
    });
  }
  
  private async toggleRecipeShoppingList(recipe: Recipe): Promise<void> {
    const isInShoppingList =
      await this.plugin.toggleRecipeInShoppingList(recipe.id);

    this.plugin.notice(
      isInShoppingList
        ? t("notices.recipeAddedToShoppingList", {
            title: recipe.title,
          })
        : t("notices.recipeRemovedFromShoppingList", {
            title: recipe.title,
          }),
    );

    if (this.screen.kind === "browser") {
      const recipeGridScrollTop = this.browserRecipeGridEl?.scrollTop ?? 0;
      const recipeGridScrollLeft = this.browserRecipeGridEl?.scrollLeft ?? 0;

      this.renderBrowserRecipeGrid();
      this.restoreBrowserRecipeGridScroll(
        recipeGridScrollTop,
        recipeGridScrollLeft,
      );
      return;
    }

    if (this.screen.kind === "shopping") {
      this.refreshShoppingList();
      return;
    }

    this.render();
  }
  
  private restoreBrowserRecipeGridScroll(
    top: number,
    left: number,
  ): void {
    window.requestAnimationFrame(() => {
      if (!this.browserRecipeGridEl) {
        return;
      }

      this.browserRecipeGridEl.scrollTop = top;
      this.browserRecipeGridEl.scrollLeft = left;
    });
  }

  private getRecipeIngredientIds(
    recipe: Recipe,
    selectedPeople: CookbookPerson[],
  ): Set<string> {
    if (!this.library) {
      return new Set();
    }

    return getResolvedRecipeIngredientIds(
      recipe,
      this.library,
      selectedPeople,
    );
  }

  private getShoppingIngredientIds(
    selectedPeople: CookbookPerson[],
  ): Set<string> {
    if (!this.library) {
      return new Set();
    }

    const recipeIds = new Set(this.plugin.getShoppingRecipeIds());
    const ingredientIds = new Set<string>();

    for (const recipe of this.recipes) {
      if (!recipeIds.has(recipe.id)) {
        continue;
      }

      try {
        for (const ingredientId of this.getRecipeIngredientIds(
          recipe,
          selectedPeople,
        )) {
          ingredientIds.add(ingredientId);
        }
      } catch {
        // Rezept kann nach einer Gästeänderung inkompatibel geworden sein.
      }
    }

    return ingredientIds;
  }

  private renderShoppingList(): void {
    if (!this.library) {
      return;
    }

    const root = this.containerEl.createDiv({
      cls: ["cookbook-root", "cookbook-browser-screen"],
    });
    const content = root.createDiv("cookbook-browser-content");
    this.renderBrowserActions(root);

    content.createEl("h2", { text: t("shopping.title") });

    this.shoppingContentEl = content.createDiv(
      "cookbook-shopping-dynamic-content",
    );

    this.renderShoppingListContent();
  }

  private refreshShoppingList(): void {
    if (this.screen.kind !== "shopping" || !this.shoppingContentEl) {
      this.render();
      return;
    }

    this.renderShoppingListContent();
  }

  private renderShoppingListContent(): void {
    if (!this.library || !this.shoppingContentEl) {
      return;
    }

    const content = this.shoppingContentEl;
    content.empty();
	
    const locations = this.library.shoppingLocations ?? [];
    const selectedLocationId = this.plugin.settings.shoppingLocationId;

    if (locations.length > 0) {
      const locationField = content.createEl("label", {
        cls: "cookbook-shopping-location-field",
        text: t("shopping.location"),
      });

      const locationSelect = locationField.createEl("select", {
        attr: {
          "aria-label": t("shopping.selectLocationAriaLabel"),
        },
      });

      locationSelect.createEl("option", {
        value: "",
        text: t("shopping.selectLocation"),
      });

      for (const location of locations) {
        locationSelect.createEl("option", {
          value: location.id,
          text: location.name,
        });
      }

      locationSelect.value = selectedLocationId ?? "";

      locationSelect.addEventListener("change", () => {
        void this.plugin
          .setShoppingLocation(locationSelect.value || undefined)
          .then(() => this.refreshShoppingList());
      });
    }

    const recipeIds = new Set(this.plugin.getShoppingRecipeIds());
    const recipes = this.recipes.filter((recipe) => recipeIds.has(recipe.id));
	const manualItems = this.plugin.getManualShoppingItems();

    if (recipes.length === 0 && manualItems.length === 0) {
      content.createDiv({
        cls: "cookbook-empty-state",
        text: t("shopping.empty"),
      });
      return;
    }

    this.renderManualShoppingItems(content, manualItems);

    const selectedPeople = this.getSelectedPeople();
    const preparedRecipeIds = this.plugin.getPreparedRecipeIds();

    const preliminaryShoppingList = buildResolvedShoppingList(
      recipes,
      this.library,
      selectedPeople,
      {
        allRecipes: this.recipes,
        preparedRecipeIds,
      },
    );

    const marketsAtSelectedLocation = selectedLocationId
      ? this.plugin.getKnownMarkets(selectedLocationId)
      : this.library.markets ?? [];

    const excludedIngredientIds = new Set(
      this.plugin.getShoppingExcludedIngredientIds(),
    );

    const activeUnscaledItems = preliminaryShoppingList.items.filter(
      (item) => !excludedIngredientIds.has(item.ingredient.id),
    );

    const activeStorePlan = createShoppingStorePlan(
      activeUnscaledItems,
      this.library,
      this.plugin.settings.shoppingStoreMode,
      this.plugin.getFavoriteStoreId(selectedLocationId),
      marketsAtSelectedLocation.map((market) => market.id),
    );

    const resolvedShoppingList = buildResolvedShoppingList(
      recipes,
      this.library,
      selectedPeople,
      {
        allRecipes: this.recipes,
        preparedRecipeIds,
        getRecipePlanOptions: (recipe) =>
          this.getRecipePlanOptions(
            recipe,
            activeStorePlan.marketIds,
          ),
      },
    );
	
    const allItems = resolvedShoppingList.items;
    const items = allItems.filter(
      (item) => !excludedIngredientIds.has(item.ingredient.id),
    );

    const marketById = new Map(
      marketsAtSelectedLocation.map((market) => [market.id, market]),
    );

    const recipeList = content.createDiv("cookbook-shopping-recipes");
    recipeList.createEl("strong", { text: t("shopping.recipes") });

    if (recipes.length === 0) {
      recipeList.createEl("small", {
        text: t("shopping.noRecipesSelected"),
      });
    } else {
      for (const recipe of recipes) {
        const recipeRow = recipeList.createDiv("cookbook-shopping-recipe");
        recipeRow.createSpan({ text: recipe.title });
      
        recipeRow.createEl("small", {
          cls: "cookbook-shopping-recipe-scale",
          text: this.getRecipeScaleDescription(
            recipe,
            selectedPeople,
            activeStorePlan.marketIds,
          ),
        });

      const removeButton = recipeRow.createEl("button", {
        cls: "clickable-icon",
        attr: {
          "aria-label": t("shopping.removeRecipe", {
            title: recipe.title,
          }),
          title: t("shopping.removeRecipe", {
            title: recipe.title,
          }),
        },
      });

        setIcon(removeButton, "x");
        removeButton.addEventListener("click", () => {
          void this.toggleRecipeShoppingList(recipe);
        });
      }
    }
	
    this.renderPreparationRecipeOptions(
      content,
      resolvedShoppingList.preparationOptions,
    );

    for (const preparedRecipe of resolvedShoppingList.preparedRecipes) {
      const recipeRow = recipeList.createDiv("cookbook-shopping-recipe");

      recipeRow.createSpan({
        text: t("shopping.preparedRecipeTitle", {
          title: preparedRecipe.recipe.title,
        }),
      });

      recipeRow.createEl("small", {
        cls: "cookbook-shopping-recipe-scale",
        text: this.getPreparationRecipeScaleDescription(preparedRecipe),
      });
    }

    if (activeStorePlan.marketIds.length > 0) {
      const stores = activeStorePlan.marketIds
        .map((marketId) => marketById.get(marketId)?.name ?? marketId)
        .join(", ");

      content.createDiv({
        cls: "cookbook-shopping-store-plan",
        text: activeStorePlan.usedFallback
          ? t("shopping.favoriteStoreInsufficient", { stores })
          : t("shopping.recommendedStores", { stores }),
      });
    }

    if (activeStorePlan.missingIngredients.length > 0) {
      content.createDiv({
        cls: "cookbook-shopping-warning",
        text: selectedLocationId
          ? t("shopping.unavailableAtLocation", {
              ingredients: activeStorePlan.missingIngredients
                .map((ingredient) => ingredient.name)
                .join(", "),
            })
          : t("shopping.unavailableWithoutLocation", {
              ingredients: activeStorePlan.missingIngredients
                .map((ingredient) => ingredient.name)
                .join(", "),
            }),
      });
    }

    const list = content.createDiv("cookbook-shopping-items");

    for (const item of items) {
      const row = list.createDiv("cookbook-shopping-item");
      row.createEl("strong", { text: item.ingredient.name });

      row.createSpan({
        text: `${formatNumber(item.amount)} ${item.unit}`,
      });
	  
      const removeButton = row.createEl("button", {
        cls: "clickable-icon cookbook-shopping-item-remove",
        attr: {
          "aria-label": t("shopping.markAsAtHome", {
            name: item.ingredient.name,
          }),
          title: t("shopping.markAsAtHomeTitle"),
        },
      });

      setIcon(removeButton, "house");

      removeButton.addEventListener("click", () => {
        void this.plugin
          .setShoppingIngredientExcluded(item.ingredient.id, true)
          .then(() => this.refreshShoppingList());
      });

      if (this.plugin.settings.shoppingStoreMode === "ingredient-stores") {
        const marketNames = item.marketIds
          .filter((marketId) => marketById.has(marketId))
          .map((marketId) => marketById.get(marketId)?.name ?? marketId)
          .join(", ");

        row.createEl("small", {
          text: marketNames || t("shopping.unavailableAtSelectedLocation"),
        });
      }

      if (item.notes.length > 0) {
        row.createEl("small", {
          cls: "cookbook-shopping-note",
          text: item.notes.join(" · "),
        });
      }
    }
	
    const excludedItems = allItems.filter((item) =>
      excludedIngredientIds.has(item.ingredient.id),
    );

    if (excludedItems.length > 0) {
      const excludedSection = content.createDiv(
        "cookbook-shopping-excluded-items",
      );

      excludedSection.createEl("strong", {
        text: t("shopping.alreadyAtHome"),
      });

      for (const item of excludedItems) {
        const row = excludedSection.createDiv(
          "cookbook-shopping-excluded-item",
        );

        row.createSpan({
          text: `${item.ingredient.name} (${formatNumber(item.amount)} ${item.unit})`,
        });

        const restoreButton = row.createEl("button", {
          text: t("shopping.buyAgain"),
        });

        restoreButton.addEventListener("click", () => {
          void this.plugin
            .setShoppingIngredientExcluded(item.ingredient.id, false)
            .then(() => this.refreshShoppingList());
        });
      }
    }

    const emailButton = content.createEl("button", {
      text: t("shopping.email"),
      cls: "mod-cta cookbook-shopping-email-button",
    });

    if (!this.plugin.settings.shoppingListEmailRecipient) {
      emailButton.disabled = true;
      content.createEl("small", {
        cls: "cookbook-shopping-email-hint",
        text:
          t("shopping.emailRecipientMissing"),
      });
      return;
    }

    emailButton.addEventListener("click", () => {
      const recipient = this.plugin.settings.shoppingListEmailRecipient;

      if (!recipient) {
        return;
      }

      const body = formatShoppingEmail(
        [
          ...recipes.map((recipe) => ({
            title: recipe.title,
            scaleDescription: this.getRecipeScaleDescription(
              recipe,
              selectedPeople,
              activeStorePlan.marketIds,
            ),
          })),
          ...resolvedShoppingList.preparedRecipes.map(
            (preparedRecipe) => ({
              title: t("shopping.preparedRecipeTitle", {
                title: preparedRecipe.recipe.title,
              }),
              scaleDescription:
                this.getPreparationRecipeScaleDescription(preparedRecipe),
            }),
          ),
        ],
        items,
		manualItems,
        activeStorePlan.marketIds.map(
          (marketId) => marketById.get(marketId)?.name ?? marketId,
        ),
      );

      window.location.href =
        `mailto:${encodeURIComponent(recipient)}` +
        `?subject=${encodeURIComponent(t("shopping.emailSubject"))}` +
        `&body=${encodeURIComponent(body)}`;
    });
  }
  
  private renderPreparationRecipeOptions(
    parent: HTMLElement,
    options: Array<{
      recipe: Recipe;
      requiredAmount: number;
      unit: string;
      scaleFactor: number;
      sourceRecipeTitles: string[];
      selected: boolean;
    }>,
  ): void {
    if (options.length === 0) {
      return;
    }

    const section = parent.createDiv(
      "cookbook-shopping-preparation-recipes",
    );

    section.createEl("strong", {
      text: t("shopping.preparationRecipes"),
    });

    for (const option of options) {
      const label = section.createEl("label", {
        cls: "cookbook-shopping-preparation-recipe",
      });

      const checkbox = label.createEl("input", {
        attr: {
          type: "checkbox",
          "aria-label": t("shopping.prepareRecipeAriaLabel", {
            title: option.recipe.title,
          }),
        },
      });

      checkbox.checked = option.selected;

      const details = label.createDiv(
        "cookbook-shopping-preparation-recipe-details",
      );

      details.createEl("strong", {
        text: option.recipe.title,
      });

      details.createEl("small", {
        text: this.getPreparationRecipeScaleDescription(option),
      });

      if (option.sourceRecipeTitles.length > 0) {
        details.createEl("small", {
          text: t("shopping.preparationUsedFor", {
            recipes: option.sourceRecipeTitles.join(", "),
          }),
        });
      }

      checkbox.addEventListener("change", () => {
        void this.plugin
          .setRecipePrepared(option.recipe.id, checkbox.checked)
          .then(() => this.refreshShoppingList());
      });
    }
  }
  
  private renderManualShoppingItems(
    parent: HTMLElement,
    manualItems: ManualShoppingItem[],
  ): void {
    const section = parent.createDiv("cookbook-shopping-manual-section");
    section.createEl("strong", { text: t("shopping.manual.title") });

    const form = section.createDiv("cookbook-shopping-manual-form");

    const nameInput = form.createEl("input", {
      attr: {
        type: "text",
        placeholder: t("shopping.manual.namePlaceholder"),
        "aria-label": t("shopping.manual.name"),
      },
    });

    const amountInput = form.createEl("input", {
      attr: {
        type: "number",
        min: "0",
        step: "0.1",
        placeholder: t("shopping.manual.amount"),
        "aria-label": t("shopping.manual.amount"),
      },
    });

    const unitInput = form.createEl("input", {
      attr: {
        type: "text",
        placeholder: t("shopping.manual.unitPlaceholder"),
        "aria-label": t("shopping.manual.unit"),
      },
    });

    const addButton = form.createEl("button", {
      text: t("shopping.manual.add"),
    });

    const addManualItem = (): void => {
      const name = nameInput.value.trim();
      const rawAmount = amountInput.value.trim();
      const amount = rawAmount ? Number(rawAmount) : undefined;

      if (!name) {
        this.plugin.notice(t("shopping.manual.nameRequired"));
        return;
      }

      if (
        amount !== undefined &&
        (!Number.isFinite(amount) || amount < 0)
      ) {
        this.plugin.notice(
          t("shopping.manual.invalidAmount"),
        );
        return;
      }

      void this.plugin
        .addManualShoppingItem(name, amount, unitInput.value)
        .then(() => this.refreshShoppingList());
    };

    addButton.addEventListener("click", addManualItem);
    nameInput.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") {
        return;
      }

      event.preventDefault();
      addManualItem();
    });

    if (manualItems.length === 0) {
      return;
    }

    const list = section.createDiv("cookbook-shopping-manual-items");
    list.createEl("strong", { text: t("shopping.manual.items") });

    for (const item of manualItems) {
      const row = list.createDiv("cookbook-shopping-manual-item");

      row.createEl("strong", { text: item.name });

      const quantity = formatManualShoppingItemAmount(item);

      if (quantity) {
        row.createSpan({ text: quantity });
      }

      const removeButton = row.createEl("button", {
        cls: "clickable-icon",
        attr: {
          "aria-label": t("shopping.manual.remove", {
            name: item.name,
          }),
        },
      });

      setIcon(removeButton, "x");
      removeButton.addEventListener("click", () => {
        void this.plugin
          .removeManualShoppingItem(item.id)
          .then(() => this.refreshShoppingList());
      });
    }
  }

  private renderCookingMode(recipe: Recipe, page: number): void {
    if (!this.library) {
      return;
    }

    const selectedPeople = this.getSelectedPeople();
    const packageStoreIds = this.getRecipePackageStoreIds(
      recipe,
      selectedPeople,
    );

    const plan = buildRecipePlan(recipe, this.library, selectedPeople, {
      ...this.getRecipePlanOptions(recipe, packageStoreIds),
    });

    const pages = buildCookingPages(plan);
    const safePage = Math.max(0, Math.min(page, pages.length - 1));

    const root = this.containerEl.createDiv({
      cls: ["cookbook-root", "cookbook-cooking-screen"],
    });
    const cooking = root.createDiv("cookbook-cooking");
    const pageEl = cooking.createDiv("cookbook-cooking-page");

    this.renderBrowserActions(root);

    let pointerId: number | null = null;
    let pointerStartX = 0;
    let pointerStartY = 0;
    let isHorizontalSwipe: boolean | null = null;
    let touchStartX = 0;
    let touchStartY = 0;

    pageEl.addEventListener(
      "touchstart",
      (event) => {
        if (isCookingPageInteractiveTarget(event.target)) {
          return;
        }

        if (!this.plugin.settings.preventSidePaneSwipes) {
          return;
        }

        const touch = event.touches[0];

        if (!touch) {
          return;
        }

        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        event.stopPropagation();
      },
      { capture: true, passive: true },
    );

    pageEl.addEventListener(
      "touchmove",
      (event) => {
        if (isCookingPageInteractiveTarget(event.target)) {
          return;
        }

        if (!this.plugin.settings.preventSidePaneSwipes) {
          return;
        }

        const touch = event.touches[0];

        if (!touch) {
          return;
        }

        const deltaX = touch.clientX - touchStartX;
        const deltaY = touch.clientY - touchStartY;
        const isHorizontal =
          Math.abs(deltaX) > 8 && Math.abs(deltaX) > Math.abs(deltaY);

        if (isHorizontal && event.cancelable) {
          event.preventDefault();
        }

        event.stopPropagation();
      },
      { capture: true, passive: false },
    );

    pageEl.addEventListener(
      "touchend",
      (event) => {
        if (isCookingPageInteractiveTarget(event.target)) {
          return;
        }

        if (!this.plugin.settings.preventSidePaneSwipes) {
          return;
        }

        event.stopPropagation();
      },
      { capture: true, passive: true },
    );

    pageEl.addEventListener(
      "touchcancel",
      (event) => {
        if (isCookingPageInteractiveTarget(event.target)) {
          return;
        }

        if (!this.plugin.settings.preventSidePaneSwipes) {
          return;
        }

        event.stopPropagation();
      },
      { capture: true, passive: true },
    );

    pageEl.addEventListener(
      "pointerdown",
      (event) => {
        if (isCookingPageInteractiveTarget(event.target)) {
          return;
        }

        if (event.pointerType === "mouse" && event.button !== 0) {
          return;
        }

        pointerId = event.pointerId;
        pointerStartX = event.clientX;
        pointerStartY = event.clientY;
        isHorizontalSwipe = null;

        pageEl.setPointerCapture(event.pointerId);

        if (this.plugin.settings.preventSidePaneSwipes) {
          event.stopPropagation();
        }
      },
	  { capture: true },
    );
	
    pageEl.addEventListener(
      "pointermove",
      (event) => {
        if (event.pointerId !== pointerId) {
          return;
        }

        const deltaX = event.clientX - pointerStartX;
        const deltaY = event.clientY - pointerStartY;

        if (
          isHorizontalSwipe === null &&
          (Math.abs(deltaX) > 8 || Math.abs(deltaY) > 8)
        ) {
          isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY);
        }

        if (isHorizontalSwipe) {
          pageEl.addClass("is-swiping-horizontally");

          if (event.cancelable) {
            event.preventDefault();
          }

          if (this.plugin.settings.preventSidePaneSwipes) {
            event.stopPropagation();
          }
        }
      },
      { capture: true, passive: false },
    );

    pageEl.addEventListener(
      "pointerup",
      (event) => {
        if (event.pointerId !== pointerId) {
          return;
        }

        const deltaX = event.clientX - pointerStartX;
        const deltaY = event.clientY - pointerStartY;

        pageEl.removeClass("is-swiping-horizontally");
        pointerId = null;

        if (pageEl.hasPointerCapture(event.pointerId)) {
          pageEl.releasePointerCapture(event.pointerId);
        }

        if (this.plugin.settings.preventSidePaneSwipes) {
          event.stopPropagation();
        }

        if (
          !isHorizontalSwipe ||
          Math.abs(deltaX) < 60 ||
          Math.abs(deltaX) <= Math.abs(deltaY)
        ) {
          return;
        }

        if (deltaX < 0) {
          this.goToCookingPage(recipe, safePage + 1, pages.length);
        } else {
          this.goToCookingPage(recipe, safePage - 1, pages.length);
        }
      },
	  { capture: true },
    );
	
    pageEl.addEventListener(
      "pointercancel",
      (event) => {
        pointerId = null;
        isHorizontalSwipe = null;
        pageEl.removeClass("is-swiping-horizontally");

        if (this.plugin.settings.preventSidePaneSwipes) {
          event.stopPropagation();
        }
      },
      { capture: true },
    );
	
    if (this.plugin.settings.preventSidePaneSwipes) {
      pageEl.addClass("is-side-pane-swipe-guarded");
    }

    const currentPage = pages[safePage];

    if (currentPage.kind === "image") {
      pageEl.addClass("is-image-page");
	  
	  const imageUrl = this.resolveImageUrl(currentPage.imageUrl);

      const image = pageEl.createEl("img", {
        cls: "cookbook-full-image",
        attr: {
		  src: imageUrl,
          alt: recipe.title,
        },
      });

      image.addEventListener("error", () => {
        image.replaceWith(
          pageEl.createDiv({
            cls: "cookbook-empty-state",
            text: t("cooking.imageLoadError"),
          }),
        );
      });
    }

    if (currentPage.kind === "ingredients") {
      pageEl.createEl("h1", { text: recipe.title });

      const eaterText =
        plan.eaterTotal > 0
          ? t("cooking.forEaters", {
              count: formatNumber(plan.eaterTotal),
            })
          : t("cooking.baseRecipe", {
              count: formatNumber(recipe.baseEaters),
            });

      pageEl.createEl("p", {
        cls: "cookbook-subtitle",
        text: eaterText,
      });

      if (
        plan.packageAnchor &&
        this.plugin.settings.showPackageSuggestions
      ) {
        pageEl.createDiv({
          cls: "cookbook-package-hint",
          text: t("cooking.packageHint", {
            ingredient: plan.packageAnchor.ingredient.name,
            amount: formatNumber(plan.packageAnchor.chosenAmount),
            unit: plan.packageAnchor.ingredient.defaultUnit,
          }),
        });
      }

      renderIngredientGrid(
        pageEl,
        plan.ingredients,
        this.plugin.settings.showIngredientAllergens,
        (preparationRecipeId) =>
          this.openPreparationRecipe(preparationRecipeId),
      );
    }

    if (currentPage.kind === "step") {
      pageEl.createEl("h1", {
        text:
          currentPage.step.title ??
          t("cooking.step", {
            number: currentPage.stepIndex + 1,
          }),
      });

      renderIngredientGrid(
        pageEl,
        currentPage.step.ingredients,
        this.plugin.settings.showIngredientAllergens,
        (preparationRecipeId) =>
          this.openPreparationRecipe(preparationRecipeId),
      );

      const instructionList = pageEl.createEl("ol", "cookbook-instructions");

      for (const instruction of currentPage.step.instructions) {
        instructionList.createEl("li", { text: instruction });
      }

      if (currentPage.step.timerMinutes) {
        this.renderCookingTimerControls(
          pageEl,
          this.getCookingTimerId(recipe, currentPage.stepIndex),
          `${recipe.title}: ${currentPage.step.title ??
            t("cooking.step", { number: currentPage.stepIndex + 1 })}`,
          currentPage.step.timerMinutes,
        );
      }
    }
	
	this.renderActiveCookingTimers(cooking, recipe);

    const footer = cooking.createDiv("cookbook-cooking-footer");

    const previous = footer.createEl("button", {
      text:
        safePage === 0
          ? t("cooking.backToBrowser")
          : t("cooking.previous"),
    });

    previous.addEventListener("click", () => {
      if (safePage === 0) {
        this.screen = { kind: "browser" };
        this.render();
        return;
      }

      this.goToCookingPage(recipe, safePage - 1, pages.length);
    });

    footer.createSpan({
      text: `${safePage + 1} / ${pages.length}`,
    });

    const next = footer.createEl("button", {
      text:
        safePage === pages.length - 1
          ? t("cooking.finish")
          : t("cooking.next"),
    });

    next.addEventListener("click", () => {
      if (safePage === pages.length - 1) {
        this.screen = { kind: "browser" };
        this.render();
        return;
      }

      this.goToCookingPage(recipe, safePage + 1, pages.length);
    });
  }
  
  private renderCookingTimerControls(
    parent: HTMLElement,
    timerId: string,
    label: string,
    durationMinutes: number,
  ): void {
    const timer = parent.createDiv("cookbook-timer");
    timer.createEl("strong", { text: t("timer.title") });

    const status = timer.createDiv("cookbook-timer-status");
    const actions = timer.createDiv("cookbook-timer-actions");

    const primaryButton = actions.createEl("button");
    const addMinuteButton = actions.createEl("button", {
      text: t("timer.addMinute"),
    });
    const cancelButton = actions.createEl("button", {
      text: t("timer.cancel"),
    });

    const update = (): void => {
      const currentTimer = this.plugin.cookingTimers.getTimer(timerId);
      this.updateCookingTimerControls(
        timer,
        status,
        primaryButton,
        addMinuteButton,
        cancelButton,
        currentTimer,
        durationMinutes,
      );
    };

    primaryButton.addEventListener("click", () => {
      const currentTimer = this.plugin.cookingTimers.getTimer(timerId);

      if (currentTimer?.status === "running") {
        this.plugin.cookingTimers.pause(timerId);
        return;
      }

      if (currentTimer?.status === "paused") {
        this.plugin.cookingTimers.resume(timerId);
        return;
      }

      this.plugin.cookingTimers.start(
        timerId,
        label,
        durationMinutes,
      );
    });

    addMinuteButton.addEventListener("click", () => {
      this.plugin.cookingTimers.addSeconds(timerId, 60);
    });

    cancelButton.addEventListener("click", () => {
      this.plugin.cookingTimers.cancel(timerId);
    });

    this.timerUnsubscribers.push(
      this.plugin.cookingTimers.subscribe(update),
    );

    update();
  }

  private renderActiveCookingTimers(
    parent: HTMLElement,
    recipe: Recipe,
  ): void {
    const recipeTimerPrefix = `recipe:${recipe.id}:`;
    const panel = parent.createDiv("cookbook-active-timers");
    panel.createEl("strong", { text: t("cooking.activeTimers") });

    const list = panel.createDiv("cookbook-active-timer-list");

    const update = (): void => {
      const activeTimers = this.plugin.cookingTimers
        .getTimers()
        .filter(
          (timer) =>
            timer.id.startsWith(recipeTimerPrefix) &&
            timer.status !== "finished",
        );

      panel.toggleClass("is-empty", activeTimers.length === 0);
      list.empty();

      if (activeTimers.length === 0) {
        return;
      }

      for (const timer of activeTimers) {
        const row = list.createDiv("cookbook-active-timer");

        row.createSpan({
          text: timer.label,
        });

        row.createEl("strong", {
          text: formatTimerDuration(timer.remainingSeconds),
        });

        const actionButton = row.createEl("button", {
          text:
            timer.status === "running"
              ? t("timer.pause")
              : t("timer.resume"),
        });

        actionButton.addEventListener("click", () => {
          if (timer.status === "running") {
            this.plugin.cookingTimers.pause(timer.id);
          } else {
            this.plugin.cookingTimers.resume(timer.id);
          }
        });

        const addMinuteButton = row.createEl("button", {
          text: "+1",
          attr: {
            "aria-label": t("timer.addMinuteToTimer", { label: timer.label }),
            title: t("timer.addMinuteTitle"),
          },
        });

        addMinuteButton.addEventListener("click", () => {
          this.plugin.cookingTimers.addSeconds(timer.id, 60);
        });

        const cancelButton = row.createEl("button", {
          text: t("timer.cancel"),
          attr: {
            "aria-label": t("timer.cancelTimer", { label: timer.label }),
            title: t("timer.cancelTitle"),
          },
        });

        cancelButton.addEventListener("click", () => {
          this.plugin.cookingTimers.cancel(timer.id);
        });
      }
    };

    this.timerUnsubscribers.push(
      this.plugin.cookingTimers.subscribe(update),
    );

    update();
  }

  private updateCookingTimerControls(
    container: HTMLElement,
    status: HTMLElement,
    primaryButton: HTMLButtonElement,
    addMinuteButton: HTMLButtonElement,
    cancelButton: HTMLButtonElement,
    timer: CookingTimerSnapshot | undefined,
    durationMinutes: number,
  ): void {
    container.removeClasses([
      "is-running",
      "is-paused",
      "is-finished",
    ]);

    if (!timer) {
      status.setText(
        t("timer.ready", {
          duration: formatTimerDuration(Math.round(durationMinutes * 60)),
        }),
      );
      primaryButton.setText(
        t("timer.start", {
          duration: formatTimerDuration(Math.round(durationMinutes * 60)),
        }),
      );
      addMinuteButton.disabled = true;
      cancelButton.disabled = true;
      return;
    }

    if (timer.status === "running") {
      container.addClass("is-running");
      status.setText(
        t("timer.running", {
          duration: formatTimerDuration(timer.remainingSeconds),
        }),
      );
      primaryButton.setText(t("timer.pause"));
      addMinuteButton.disabled = false;
      cancelButton.disabled = false;
      return;
    }

    if (timer.status === "paused") {
      container.addClass("is-paused");
      status.setText(
        t("timer.paused", {
          duration: formatTimerDuration(timer.remainingSeconds),
        }),
      );
      primaryButton.setText(t("timer.resume"));
      addMinuteButton.disabled = false;
      cancelButton.disabled = false;
      return;
    }

    container.addClass("is-finished");
    status.setText(t("timer.finished"));
    primaryButton.setText(t("timer.restart"));
    addMinuteButton.disabled = true;
    cancelButton.disabled = false;
  }

  private getCookingTimerId(
    recipe: Recipe,
    stepIndex: number,
  ): string {
    return `recipe:${recipe.id}:step:${stepIndex}`;
  }
  
  private openPreparationRecipe(preparationRecipeId: string): void {
    const recipe = this.recipes.find(
      (entry) => entry.id === preparationRecipeId,
    );

    if (!recipe) {
      this.plugin.notice(
        t("cooking.preparationRecipeNotFound", {
          recipeId: preparationRecipeId,
        }),
      );
      return;
    }

    this.screen = {
      kind: "cook",
      recipe,
      page: 0,
    };
    this.render();
  }

  private disposeTimerSubscriptions(): void {
    for (const unsubscribe of this.timerUnsubscribers) {
      unsubscribe();
    }

    this.timerUnsubscribers = [];
  }
  
  private resolveImageUrl(imageUrl: string): string {
    return resolveImageUrl(this.app.vault, imageUrl);
  }

  private goToCookingPage(
    recipe: Recipe,
    page: number,
    pageCount: number,
  ): void {
    if (page < 0) {
      this.screen = { kind: "browser" };
    } else {
      this.screen = {
        kind: "cook",
        recipe,
        page: Math.min(page, pageCount - 1),
      };
    }

    this.render();
  }
  
  private getRecipePackageStoreIds(
    recipe: Recipe,
    selectedPeople: CookbookPerson[],
  ): string[] {
    if (!this.library) {
      return [];
    }

    const selectedLocationId = this.plugin.settings.shoppingLocationId;
    const markets = selectedLocationId
      ? this.plugin.getKnownMarkets(selectedLocationId)
      : this.library.markets ?? [];

    const recipeIds = new Set(this.plugin.getShoppingRecipeIds());
    const relevantRecipes = recipeIds.has(recipe.id)
      ? this.recipes.filter((entry) => recipeIds.has(entry.id))
      : [recipe];

    const allItems = buildShoppingList(
      relevantRecipes,
      this.library,
      selectedPeople,
      {
        allRecipes: this.recipes,
        preparedRecipeIds: this.plugin.getPreparedRecipeIds(),
      },
    );
	
    const excludedIngredientIds = new Set(
      this.plugin.getShoppingExcludedIngredientIds(),
    );

    return createShoppingStorePlan(
      allItems.filter(
        (item) => !excludedIngredientIds.has(item.ingredient.id),
      ),
      this.library,
      this.plugin.settings.shoppingStoreMode,
      this.plugin.getFavoriteStoreId(selectedLocationId),
      markets.map((market) => market.id),
    ).marketIds;
  }
  
  private getRecipePlanOptions(
    recipe: Recipe,
    packageStoreIds: string[],
  ): {
    packageStoreIds: string[];
    manualScaleFactor?: number;
  } {
    return {
      packageStoreIds,
      manualScaleFactor: this.plugin.getRecipeScaleOverride(recipe.id)
        ?.scaleFactor,
    };
  }

  private getRecipeScaleDescription(
    recipe: Recipe,
    selectedPeople: CookbookPerson[],
    packageStoreIds: string[],
  ): string {
    if (!this.library) {
      return "";
    }

    const override = this.plugin.getRecipeScaleOverride(recipe.id);

    if (override) {
      const ingredient =
        this.library.ingredients.find(
          (entry) => entry.id === override.ingredientId,
        )?.name ?? override.ingredientId;

      return t("shopping.manualScaling", {
        ingredient,
        amount: formatNumber(override.targetAmount),
        unit: override.unit,
      });
    }

    const plan = buildRecipePlan(
      recipe,
      this.library,
      selectedPeople,
      this.getRecipePlanOptions(recipe, packageStoreIds),
    );

    if (plan.packageAnchor) {
      return t("shopping.automaticScaling", {
        ingredient: plan.packageAnchor.ingredient.name,
        amount: formatNumber(plan.packageAnchor.chosenAmount),
        unit: plan.packageAnchor.ingredient.defaultUnit,
      });
    }

    return t("shopping.scalingForEaters", {
      count: formatNumber(plan.eaterTotal || recipe.baseEaters),
    });
  }
  
  private getPreparationRecipeScaleDescription(
    preparation: {
      recipe: Recipe;
      requiredAmount: number;
      unit: string;
      scaleFactor: number;
    },
  ): string {
    const produces = preparation.recipe.produces;

    if (!produces) {
      return "";
    }

    return t("shopping.preparationScaling", {
      requiredAmount: formatNumber(preparation.requiredAmount),
      unit: preparation.unit,
      yieldAmount: formatNumber(produces.amount),
      scale: formatNumber(preparation.scaleFactor),
    });
  }

  private getSelectedPeople(): CookbookPerson[] {
    return (
      this.library?.people.filter((person) =>
        this.selectedPersonIds.has(person.id),
      ) ?? []
    );
  }
  
  private restoreSelectedPeople(): void {
    if (!this.library) {
      return;
    }

    const knownPersonIds = new Set(
      this.library.people.map((person) => person.id),
    );

    const activeGuestIds = this.plugin
      .getActiveGuestIds()
      .filter((personId) => knownPersonIds.has(personId));

    this.selectedPersonIds = new Set(activeGuestIds);

    if (
      activeGuestIds.length !== this.plugin.getActiveGuestIds().length
    ) {
      void this.plugin.setActiveGuestIds(activeGuestIds);
    }
  }
  
  private async restoreSelectedCategory(): Promise<void> {
    if (!this.library) {
      return;
    }

    const categoryId = this.plugin.settings.lastSelectedCategoryId;

    if (
      !categoryId ||
      this.library.categories.some((category) => category.id === categoryId)
    ) {
      this.selectedCategoryId = categoryId ?? null;
      return;
    }

    this.selectedCategoryId = null;
    await this.plugin.setLastSelectedCategoryId(undefined);
  }

  private async toggleSelectedPerson(personId: string): Promise<void> {
    if (this.selectedPersonIds.has(personId)) {
      this.selectedPersonIds.delete(personId);
    } else {
      this.selectedPersonIds.add(personId);
    }

    await this.plugin.setActiveGuestIds(this.selectedPersonIds);

    if (this.screen.kind === "guests") {
      this.refreshGuestList();
      return;
    }

    if (this.screen.kind === "browser") {
      this.renderBrowserRecipeGrid();
      return;
    }

    if (this.screen.kind === "shopping") {
      this.refreshShoppingList();
      return;
    }

    this.render();
  }
  
  private async requestShoppingPlanningReset(): Promise<void> {
    if (!this.plugin.settings.confirmShoppingPlanningReset) {
      await this.resetShoppingPlanning();
      return;
    }

    new ResetShoppingPlanningModal(
      this.app,
      async (dontAskAgain) => {
        if (dontAskAgain) {
          this.plugin.settings.confirmShoppingPlanningReset = false;
          await this.plugin.saveSettings();
        }

        await this.resetShoppingPlanning();
      },
    ).open();
  }

  private async resetShoppingPlanning(): Promise<void> {
    await this.plugin.resetShoppingPlanning();
    this.selectedPersonIds.clear();
    this.selectedCategoryId = null;
    this.screen = { kind: "browser" };

    this.plugin.notice(t("notices.shoppingPlanningReset"));
    this.render();
  }
  
  private addCategoryButtonLabel(
    button: HTMLElement,
    label: string,
    labelId: string,
  ): void {
    const accessibleLabel = button.createSpan({
      cls: "cookbook-visually-hidden",
      text: label,
    });

    accessibleLabel.id = labelId;
    button.setAttribute("aria-labelledby", labelId);

    if (this.shouldShowCategoryTooltips()) {
      button.setAttribute("aria-label", label);
    }
  }

  private shouldShowCategoryTooltips(): boolean {
    return document.body.classList.contains(
      "cookbook-show-category-tooltips",
    );
  }
  
  private addGuestButtonLabel(
    button: HTMLElement,
    label: string,
    labelId: string,
  ): void {
    const accessibleLabel = button.createSpan({
      cls: "cookbook-visually-hidden",
      text: label,
    });

    accessibleLabel.id = labelId;
    button.setAttribute("aria-labelledby", labelId);

    if (this.shouldShowGuestTooltips()) {
      button.setAttribute("aria-label", label);
    }
  }

  private shouldShowGuestTooltips(): boolean {
    return document.body.classList.contains(
      "cookbook-show-guest-tooltips",
    );
  }
  
  private createCategoryButton(
    parent: HTMLElement,
    options: {
      cls: string[];
      pressed: boolean;
    },
  ): HTMLDivElement {
    const button = parent.createDiv({
      cls: options.cls,
      attr: {
        role: "button",
        tabindex: "0",
        "aria-pressed": String(options.pressed),
      },
    });

    button.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }

      event.preventDefault();
      button.click();
    });

    return button;
  }
  
  private createGuestButton(
    parent: HTMLElement,
    options: {
      cls: string[];
      pressed: boolean;
    },
  ): HTMLDivElement {
    const button = parent.createDiv({
      cls: options.cls,
      attr: {
        role: "button",
        tabindex: "0",
        "aria-pressed": String(options.pressed),
      },
    });

    button.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }

      event.preventDefault();
      button.click();
    });

    return button;
  }

  private watchStyleSettings(): void {
    this.styleSettingsObserver?.disconnect();

    this.styleSettingsObserver = new MutationObserver((mutations) => {
      const styleSettingChanged = mutations.some(
        (mutation) =>
          mutation.type === "attributes" &&
          mutation.attributeName === "class" &&
          this.didTooltipSettingChange(mutation),
      );

      if (
        styleSettingChanged &&
        (this.screen.kind === "browser" || this.screen.kind === "guests")
      ) {
        this.render();
      }
    });

    this.styleSettingsObserver.observe(document.body, {
      attributes: true,
	  attributeOldValue: true,
      attributeFilter: ["class"],
    });
  }
  
  private didTooltipSettingChange(mutation: MutationRecord): boolean {
    const previousClasses = new Set(
      (mutation.oldValue ?? "")
        .split(/\s+/)
        .filter(Boolean),
    );

    return [
      "cookbook-show-category-tooltips",
      "cookbook-show-guest-tooltips",
    ].some(
      (className) =>
        previousClasses.has(className) !==
        document.body.classList.contains(className),
    );
  }
}

function buildCookingPages(plan: RecipePlan) {
  const pages: Array<
    | { kind: "image"; imageUrl: string }
    | { kind: "ingredients" }
    | {
        kind: "step";
        stepIndex: number;
        step: RecipePlan["steps"][number];
      }
  > = [];

  if (plan.recipe.imageUrl && plan.recipe.imagePlacement === "cover") {
    pages.push({ kind: "image", imageUrl: plan.recipe.imageUrl });
  }

  pages.push({ kind: "ingredients" });

  if (
    plan.recipe.imageUrl &&
    plan.recipe.imagePlacement === "after-ingredients"
  ) {
    pages.push({ kind: "image", imageUrl: plan.recipe.imageUrl });
  }

  plan.steps.forEach((step, stepIndex) => {
    pages.push({ kind: "step", stepIndex, step });
  });

  return pages;
}

function isCookingPageInteractiveTarget(
  target: EventTarget | null,
): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  return Boolean(
    target.closest(
      "button, input, select, textarea, a, [role='button'], [contenteditable='true']",
    ),
  );
}

function renderIngredientGrid(
  parent: HTMLElement,
  ingredients: ScaledIngredient[],
  showAllergens: boolean,
  onOpenPreparationRecipe?: (recipeId: string) => void,
): void {
  const grid = parent.createDiv("cookbook-ingredient-grid");

  for (const item of ingredients) {
    const card = grid.createDiv({
      cls: [
        "cookbook-ingredient",
        item.usesAlternative ? "is-alternative" : "",
      ],
    });

    card.createEl("strong", {
      text: [
        item.ingredient.name,
        item.Suffix,
      ]
        .filter(Boolean)
        .join(" "),
    });

    const amount = `${formatNumber(item.displayAmount)} ${getIngredientUnit(
      item,
    )}`;

    card.createDiv({ text: amount });
	
    if (item.usesAlternative) {
      card.createEl("small", {
        cls: "cookbook-ingredient-alternative",
        text: t("ingredient.alternativeFor", {
          name: item.originalIngredient.name,
        }),
      });
    }
	
    if (showAllergens && item.allergens.length > 0) {
      card.createEl("small", {
        cls: "cookbook-ingredient-allergens",
        text: t("ingredient.contains", {
          allergens: item.allergens
            .map((allergen) => allergen.name)
            .join(", "),
        }),
      });
    }

    if (item.note) {
      card.createEl("small", { text: item.note });
    }

    if (item.preparationRecipeId && onOpenPreparationRecipe) {
      const preparationButton = card.createEl("button", {
        cls: "cookbook-ingredient-preparation-link",
        text: t("cooking.openPreparationRecipe"),
      });

      preparationButton.addEventListener("click", () => {
        onOpenPreparationRecipe(item.preparationRecipeId ?? "");
      });
    }
  }
}

function getIngredientUnit(item: ScaledIngredient): string {
  const singularUnit = item.unit ?? item.ingredient.defaultUnit;
  const pluralUnit = item.unitPlural ?? item.ingredient.defaultUnitPlural;

  if (Math.abs(item.displayAmount - 1) < 0.0001 || !pluralUnit) {
    return singularUnit;
  }

  return pluralUnit;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat(getLocale(), {
    maximumFractionDigits: 1,
  }).format(value);
}

function formatTimerDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.ceil(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatShoppingEmail(
  recipes: Array<{ title: string; scaleDescription: string }>,
  items: Array<{
    ingredient: { name: string };
    amount: number;
    unit: string;
    notes: string[];
  }>,
  manualItems: ManualShoppingItem[],
  marketNames: string[],
): string {
  const lines = [
    t("shopping.emailSubject"),
    "",
    t("shopping.emailRecipes"),
    ...recipes.map(
      (recipe) => `- ${recipe.title} (${recipe.scaleDescription})`,
    ),
    "",
  ];

  if (marketNames.length > 0) {
    lines.push(t("shopping.recommendedStores", {
      stores: marketNames.join(", "),
    }), "");
  }

  lines.push(
    t("shopping.emailIngredients"),
    ...items.map((item) => {
      const note = item.notes.length > 0 ? ` (${item.notes.join("; ")})` : "";
      return `- ${formatNumber(item.amount)} ${item.unit} ${item.ingredient.name}${note}`;
    }),
  );
  
  if (manualItems.length > 0) {
    lines.push(
      "",
      t("shopping.emailManualItems"),
      ...manualItems.map((item) => {
        const amount = formatManualShoppingItemAmount(item);
        return `- ${amount ? `${amount} ` : ""}${item.name}`;
      }),
    );
  }

  return lines.join("\n");
}

function formatManualShoppingItemAmount(
  item: ManualShoppingItem,
): string {
  if (item.amount === undefined) {
    return item.unit ?? "";
  }

  return `${formatNumber(item.amount)}${item.unit ? ` ${item.unit}` : ""}`;
}
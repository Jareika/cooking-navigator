import {
  ItemView,
  normalizePath,
  setIcon,
  TFile,
  WorkspaceLeaf,
} from "obsidian";
import type CookbookPlugin from "./main";
import { resolveImageUrl } from "./image-utils";
import type {
  CookbookLibrary,
  CookbookPerson,
  Recipe,
  RecipeMatch,
  RecipePlan,
  ScaledIngredient,
} from "./types";
import { buildRecipePlan, findRecipeMatches } from "./recipe-engine";

export const COOKBOOK_VIEW_TYPE = "cookbook-browser-view";

type Screen =
  | { kind: "browser" }
  | { kind: "guests" }
  | { kind: "cook"; recipe: Recipe; page: number };

export class CookbookView extends ItemView {
  private library: CookbookLibrary | null = null;
  private recipes: Recipe[] = [];
  private selectedPersonIds = new Set<string>();
  private selectedCategoryId: string | null = null;
  private screen: Screen = { kind: "browser" };
  private styleSettingsObserver: MutationObserver | null = null;

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
    return "Cookbook";
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
  }

  async reload(): Promise<void> {
    try {
      this.library = await this.plugin.loadLibrary();
      this.recipes = await this.plugin.database.loadRecipes();
      this.render();
    } catch (error) {
      this.renderError(error);
    }
  }

  private renderError(error: unknown): void {
    this.containerEl.empty();

    const wrapper = this.containerEl.createDiv("cookbook-empty-state");
    wrapper.createEl("h2", { text: "Cookbook is not configured yet" });
    wrapper.createEl("p", {
      text:
        error instanceof Error
          ? error.message
          : "Unknown database error.",
    });

    const button = wrapper.createEl("button", {
      text: "Create example database",
      cls: "mod-cta",
    });

    button.addEventListener("click", () => {
      void this.createExampleDatabaseAndReload();
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

  private render(): void {
    try {
      if (!this.library) {
        return;
      }

      this.containerEl.empty();

      if (this.screen.kind === "browser") {
        this.renderBrowser();
        return;
      }
	  
      if (this.screen.kind === "guests") {
        this.renderGuestSelection();
        return;
      }

      this.renderCookingMode(this.screen.recipe, this.screen.page);
    } catch (error) {
      this.renderError(error);
    }
  }

  private renderBrowser(): void {
    if (!this.library) {
      return;
    }

    const root = this.containerEl.createDiv({
      cls: ["cookbook-root", "cookbook-browser-screen"],
    });
    const content = root.createDiv("cookbook-browser-content");
    const layout = content.createDiv("cookbook-browser-layout");
    const categoryList = layout.createDiv("cookbook-category-list");
    const grid = layout.createDiv("cookbook-recipe-grid");

    this.renderBrowserActions(root);

    const allCategoriesButton = this.createCategoryButton(categoryList, {
      cls: [
        "cookbook-category-button",
        this.selectedCategoryId === null ? "is-active" : "",
      ],
	  pressed: this.selectedCategoryId === null,
    });
	
    this.addCategoryButtonLabel(
      allCategoriesButton,
      "All recipes",
      "cookbook-all-recipes-label",
    );

    const allRecipesImagePath = this.plugin.settings.allRecipesButtonImagePath;

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
        setIcon(allCategoriesButton, "list");
      });
    } else {
      setIcon(allCategoriesButton, "list");
    }

    allCategoriesButton.addEventListener("click", () => {
      this.selectedCategoryId = null;
      this.render();
    });

    for (const { category, imagePath } of this.plugin.getOrderedCategories(
      this.library.categories,
    )) {
      const button = this.createCategoryButton(categoryList, {
        cls: [
          "cookbook-category-button",
          this.selectedCategoryId === category.id ? "is-active" : "",
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

        image.addEventListener("error", () => image.remove());
      }

      button.addEventListener("click", () => {
        this.selectedCategoryId = category.id;
        this.render();
      });
    }

    const selectedPeople = this.getSelectedPeople();
    const matches = findRecipeMatches(
      this.recipes,
      this.library,
      selectedPeople,
    );

    const visibleRecipes = matches.filter(
      (match) =>
        match.isAllowed &&
        (!this.selectedCategoryId ||
          match.recipe.categoryIds.includes(this.selectedCategoryId)),
    );

    if (visibleRecipes.length === 0) {
      grid.createDiv({
        cls: "cookbook-empty-state",
        text: "No recipes match the selected guests and category.",
      });
      return;
    }

    for (const match of visibleRecipes) {
      this.renderRecipeCard(grid, match, selectedPeople);
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

    content.createEl("h2", { text: "Select guests" });
    content.createEl("p", {
      cls: "cookbook-guest-selection-description",
      text:
        "Selected guests determine recipe restrictions, favourites, and portion sizes.",
    });

    const guestList = content.createDiv("cookbook-guest-list");

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
        if (this.selectedPersonIds.has(person.id)) {
          this.selectedPersonIds.delete(person.id);
        } else {
          this.selectedPersonIds.add(person.id);
        }

        this.render();
      });
    }

    this.renderBrowserActions(root);
  }

  private renderBrowserActions(parent: HTMLElement): void {
    const actions = parent.createDiv("cookbook-browser-actions");

    const reloadButton = actions.createEl("button", {
      cls: "cookbook-browser-action",
      attr: {
        "aria-label": "Reload cookbook",
        title: "Reload cookbook",
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
          ? "Back to recipe browser"
          : "Select guests",
        "aria-pressed": String(isGuestSelection),
        title: isGuestSelection
          ? "Back to recipe browser"
          : "Select guests",
      },
    });

    setIcon(guestButton, isGuestSelection ? "book-open" : "users");

    guestButton.addEventListener("click", () => {
      this.screen = {
        kind: isGuestSelection ? "browser" : "guests",
      };
      this.render();
    });

    const manageGuestsButton = actions.createEl("button", {
      cls: "cookbook-browser-action",
      attr: {
        "aria-label": "Manage guests",
        title: "Manage guests",
      },
    });

    setIcon(manageGuestsButton, "settings-2");

    manageGuestsButton.addEventListener("click", () => {
      this.plugin.openGuestSettings(() => {
        void this.reload();
      });
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
          ? "Hide allergen notices"
          : "Show allergen notices",
        "aria-pressed": String(showAllergens),
        title: showAllergens
          ? "Hide allergen notices"
          : "Show allergen notices",
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

  private renderRecipeCard(
    parent: HTMLElement,
    match: RecipeMatch,
    selectedPeople: CookbookPerson[],
  ): void {
    const recipe = match.recipe;
    const card = parent.createEl("button", {
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
      recipe.prepMinutes ? `${recipe.prepMinutes} min prep` : null,
      recipe.cookMinutes ? `${recipe.cookMinutes} min cook` : null,
      recipe.bakeMinutes ? `${recipe.bakeMinutes} min bake` : null,
    ]
      .filter(Boolean)
      .join(" · ");

    metadata.setText(duration || "No time information");

    card.addEventListener("click", () => {
      this.screen = { kind: "cook", recipe, page: 0 };
      this.render();
    });
  }

  private renderCookingMode(recipe: Recipe, page: number): void {
    if (!this.library) {
      return;
    }

    const selectedPeople = this.getSelectedPeople();
    const plan = buildRecipePlan(recipe, this.library, selectedPeople);

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

    pageEl.addEventListener(
      "pointerdown",
      (event) => {
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
      { passive: false },
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
    );
	
    pageEl.addEventListener("pointercancel", () => {
      pointerId = null;
      isHorizontalSwipe = null;
      pageEl.removeClass("is-swiping-horizontally");
    });
	
    if (this.plugin.settings.preventSidePaneSwipes) {
      pageEl.addClass("is-side-pane-swipe-guarded");
    }

    const currentPage = pages[safePage];

    if (currentPage.kind === "image") {
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
            text: "Recipe image could not be loaded.",
          }),
        );
      });
    }

    if (currentPage.kind === "ingredients") {
      pageEl.createEl("h1", { text: recipe.title });

      const eaterText =
        plan.eaterTotal > 0
          ? `For ${formatNumber(plan.eaterTotal)} eater units`
          : `Base recipe for ${formatNumber(recipe.baseEaters)} eater units`;

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
          text: `${plan.packageAnchor.ingredient.name}: scaled to ${formatNumber(plan.packageAnchor.chosenAmount)} ${plan.packageAnchor.ingredient.defaultUnit} because it is a critical resource.`,
        });
      }

      renderIngredientGrid(
        pageEl,
        plan.ingredients,
        this.plugin.settings.showIngredientAllergens,
      );
    }

    if (currentPage.kind === "step") {
      pageEl.createEl("h1", {
        text: currentPage.step.title ?? `Step ${currentPage.stepIndex + 1}`,
      });

      renderIngredientGrid(
        pageEl,
        currentPage.step.ingredients,
        this.plugin.settings.showIngredientAllergens,
      );

      const instructionList = pageEl.createEl("ol", "cookbook-instructions");

      for (const instruction of currentPage.step.instructions) {
        instructionList.createEl("li", { text: instruction });
      }

      if (currentPage.step.timerMinutes) {
        pageEl.createDiv({
          cls: "cookbook-timer-hint",
          text: `Timer: ${currentPage.step.timerMinutes} minutes`,
        });
      }
    }

    const footer = cooking.createDiv("cookbook-cooking-footer");

    const previous = footer.createEl("button", {
      text: safePage === 0 ? "Back to browser" : "Previous",
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
      text: safePage === pages.length - 1 ? "Finish" : "Next",
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
  
  /**
   * Converts a vault-relative attachment path into a URL that the embedded
   * browser can load. External image URLs remain unchanged.
   */
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

  private getSelectedPeople(): CookbookPerson[] {
    return (
      this.library?.people.filter((person) =>
        this.selectedPersonIds.has(person.id),
      ) ?? []
    );
  }
  
  /**
   * The visually hidden label keeps category buttons accessible even when
   * Obsidian's visible native tooltip is disabled.
   *
   * Obsidian displays its native black tooltip for aria-label. Therefore it
   * is only assigned while the Style Settings option is enabled.
   */
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
  
  /**
   * Obsidian Mobile/Themes may force native <button> elements to full width.
   * A role-button retains keyboard and screen-reader support without being
   * affected by generic native-button layout rules.
   */
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

  /**
   * Style Settings changes classes on <body>, but does not re-render this
   * ItemView. Watch for that class change so the native Obsidian tooltip is
   * added or removed immediately after toggling the setting.
   */
  private watchStyleSettings(): void {
    this.styleSettingsObserver?.disconnect();

    this.styleSettingsObserver = new MutationObserver((mutations) => {
      const styleSettingChanged = mutations.some(
        (mutation) =>
          mutation.type === "attributes" &&
          mutation.attributeName === "class",
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
      attributeFilter: ["class"],
    });
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

function renderIngredientGrid(
  parent: HTMLElement,
  ingredients: ScaledIngredient[],
  showAllergens: boolean,
): void {
  const grid = parent.createDiv("cookbook-ingredient-grid");

  for (const item of ingredients) {
    const card = grid.createDiv("cookbook-ingredient");

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
	
    if (showAllergens && item.allergens.length > 0) {
      card.createEl("small", {
        cls: "cookbook-ingredient-allergens",
        text: `Contains: ${item.allergens
          .map((allergen) => allergen.name)
          .join(", ")}`,
      });
    }

    if (item.note) {
      card.createEl("small", { text: item.note });
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
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 1,
  }).format(value);
}
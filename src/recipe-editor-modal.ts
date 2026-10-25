import { App, Modal, setIcon, TFile } from "obsidian";
import type CookbookPlugin from "./main";
import type {
  CookbookLibrary,
  Recipe,
  RecipeIngredient,
  RecipeStep,
} from "./types";

const IMAGE_EXTENSIONS = new Set([
  "avif",
  "gif",
  "jpeg",
  "jpg",
  "png",
  "svg",
  "webp",
]);

export class RecipeEditorModal extends Modal {
  private library: CookbookLibrary | null = null;
  private existingRecipes: Recipe[] = [];
  private editorEl: HTMLElement | null = null;
  private imageFiles: TFile[] = [];
  private draft: Recipe = createEmptyRecipe();

  constructor(
    app: App,
    private readonly plugin: CookbookPlugin,
    private readonly onChanged: () => void,
  ) {
    super(app);
  }

  onOpen(): void {
    void this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      const [library, recipes] = await Promise.all([
        this.plugin.loadLibrary(),
        this.plugin.database.loadRecipes(),
      ]);

      this.library = library;
      this.existingRecipes = recipes;
      this.imageFiles = this.app.vault
        .getFiles()
        .filter((file) =>
          IMAGE_EXTENSIONS.has(file.extension.toLocaleLowerCase()),
        )
        .sort((a, b) => a.path.localeCompare(b.path));

      this.ensureModalLayout();
      this.refreshEditor();
    } catch (error) {
      this.renderError(error);
    }
  }

  private ensureModalLayout(): void {
    if (this.editorEl) {
      return;
    }

    this.contentEl.empty();
    this.contentEl.addClass("cookbook-recipe-editor-modal");
    this.contentEl.createEl("h2", { text: "Neues Rezept erstellen" });
    this.contentEl.createEl("p", {
      cls: "setting-item-description",
      text:
        "Lege zuerst die Zutaten für die Einkaufsliste an und ordne sie anschließend optional den einzelnen Kochschritten zu.",
    });

    this.editorEl = this.contentEl.createDiv(
      "cookbook-recipe-editor-content",
    );
  }

  private renderError(error: unknown): void {
    this.editorEl = null;
    this.contentEl.empty();
    this.contentEl.addClass("cookbook-recipe-editor-modal");
    this.contentEl.createEl("h2", { text: "Rezept erstellen" });
    this.contentEl.createEl("p", {
      text:
        error instanceof Error
          ? error.message
          : "Die Cookbook-Daten konnten nicht geladen werden.",
    });
  }

  private refreshEditor(): void {
    if (!this.library || !this.editorEl) {
      return;
    }

    const scrollTop = this.contentEl.scrollTop;
    this.editorEl.empty();

    this.renderGeneralSection(this.editorEl);
    this.renderRecipeIngredients(this.editorEl);
    this.renderSteps(this.editorEl);
    this.renderActions(this.editorEl);

    window.requestAnimationFrame(() => {
      this.contentEl.scrollTop = scrollTop;
    });
  }

  private renderGeneralSection(parent: HTMLElement): void {
    if (!this.library) {
      return;
    }

    const section = parent.createDiv("cookbook-recipe-editor-section");
    section.createEl("h3", { text: "Grunddaten" });

    const fields = section.createDiv("cookbook-recipe-editor-fields");

    const titleInput = this.createTextField(
      fields,
      "Rezeptname",
      this.draft.title,
      "z. B. Kartoffelsuppe",
    );
    titleInput.addEventListener("input", () => {
      this.draft.title = titleInput.value;
    });

    const eatersInput = this.createNumberField(
      fields,
      "Portionseinheiten",
      this.draft.baseEaters,
      0.1,
      0.1,
    );
    eatersInput.addEventListener("change", () => {
      this.draft.baseEaters = Number(eatersInput.value);
    });

    const prepInput = this.createOptionalNumberField(
      fields,
      "Vorbereitung (Min.)",
      this.draft.prepMinutes,
    );
    prepInput.addEventListener("change", () => {
      this.draft.prepMinutes = getOptionalNumber(prepInput.value);
    });

    const cookInput = this.createOptionalNumberField(
      fields,
      "Kochen (Min.)",
      this.draft.cookMinutes,
    );
    cookInput.addEventListener("change", () => {
      this.draft.cookMinutes = getOptionalNumber(cookInput.value);
    });

    const bakeInput = this.createOptionalNumberField(
      fields,
      "Backen (Min.)",
      this.draft.bakeMinutes,
    );
    bakeInput.addEventListener("change", () => {
      this.draft.bakeMinutes = getOptionalNumber(bakeInput.value);
    });

    const imageLabel = fields.createEl("label", {
      cls: "cookbook-recipe-editor-field",
      text: "Rezeptbild",
    });
    const imageSelect = imageLabel.createEl("select");
    imageSelect.createEl("option", {
      value: "",
      text: "Kein Bild",
    });

    for (const file of this.imageFiles) {
      imageSelect.createEl("option", {
        value: file.path,
        text: file.path,
      });
    }

    imageSelect.value = this.draft.imageUrl ?? "";
    imageSelect.addEventListener("change", () => {
      this.draft.imageUrl = imageSelect.value || undefined;
    });

    const placementLabel = fields.createEl("label", {
      cls: "cookbook-recipe-editor-field",
      text: "Bildposition",
    });
    const placementSelect = placementLabel.createEl("select");
    placementSelect.createEl("option", {
      value: "cover",
      text: "Vor den Zutaten",
    });
    placementSelect.createEl("option", {
      value: "after-ingredients",
      text: "Nach den Zutaten",
    });
    placementSelect.value = this.draft.imagePlacement ?? "cover";
    placementSelect.addEventListener("change", () => {
      this.draft.imagePlacement =
        placementSelect.value === "after-ingredients"
          ? "after-ingredients"
          : "cover";
    });

    this.renderCheckboxGroup(
      section,
      "Kategorien",
      this.library.categories.map((category) => ({
        id: category.id,
        name: category.name,
      })),
      this.draft.categoryIds,
      (ids) => {
        this.draft.categoryIds = ids;
      },
    );
	
    const addCategory = section.createDiv(
      "cookbook-recipe-editor-add-category",
    );

    const categoryNameInput = addCategory.createEl("input", {
      attr: {
        type: "text",
        placeholder: "Neue Kategorie, z. B. Aufläufe",
        "aria-label": "Name der neuen Kategorie",
      },
    });

    const addCategoryButton = addCategory.createEl("button", {
      text: "Kategorie anlegen",
    });

    const submitCategory = (): void => {
      void this.addCategory(categoryNameInput.value);
    };

    addCategoryButton.addEventListener("click", submitCategory);
    categoryNameInput.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") {
        return;
      }

      event.preventDefault();
      submitCategory();
    });

    this.renderCheckboxGroup(
      section,
      "Einschränkungsbereiche",
      this.library.restrictionScopes.map((scope) => ({
        id: scope.id,
        name: scope.name,
      })),
      this.draft.restrictionScopeIds,
      (ids) => {
        this.draft.restrictionScopeIds = ids;
      },
    );
  }

  private renderRecipeIngredients(parent: HTMLElement): void {
    const section = parent.createDiv("cookbook-recipe-editor-section");
    const header = section.createDiv("cookbook-recipe-editor-section-header");
    header.createEl("h3", { text: "Zutaten für Einkaufsliste" });

    const addButton = header.createEl("button", {
      text: "Zutat hinzufügen",
    });

    addButton.addEventListener("click", () => {
      const ingredient = this.createIngredient();

      if (!ingredient) {
        return;
      }

      this.draft.ingredients.push(ingredient);
      this.refreshEditor();
    });

    section.createEl("small", {
      cls: "setting-item-description",
      text:
        "Diese Liste bestimmt die Zutatenübersicht und die Einkaufsliste. Zutaten in Schritten dienen zusätzlich als Kochhilfe.",
    });

    this.renderIngredientList(
      section,
      this.draft.ingredients,
      (index) => {
        this.draft.ingredients.splice(index, 1);
        this.refreshEditor();
      },
    );
  }

  private renderSteps(parent: HTMLElement): void {
    const section = parent.createDiv("cookbook-recipe-editor-section");
    const header = section.createDiv("cookbook-recipe-editor-section-header");
    header.createEl("h3", { text: "Kochschritte" });

    const addStepButton = header.createEl("button", {
      text: "Schritt hinzufügen",
    });

    addStepButton.addEventListener("click", () => {
      this.draft.steps.push({
        title: "",
        ingredients: [],
        instructions: [""],
      });
      this.refreshEditor();
    });

    for (const [index, step] of this.draft.steps.entries()) {
      this.renderStep(section, step, index);
    }
  }

  private renderStep(
    parent: HTMLElement,
    step: RecipeStep,
    stepIndex: number,
  ): void {
    const card = parent.createDiv("cookbook-recipe-editor-step");
    const header = card.createDiv("cookbook-recipe-editor-step-header");
    header.createEl("strong", { text: `Schritt ${stepIndex + 1}` });

    const removeButton = this.createIconButton(
      header,
      "trash-2",
      `Schritt ${stepIndex + 1} entfernen`,
    );
    removeButton.disabled = this.draft.steps.length === 1;
    removeButton.addEventListener("click", () => {
      this.draft.steps.splice(stepIndex, 1);
      this.refreshEditor();
    });

    const fields = card.createDiv("cookbook-recipe-editor-fields");
    const titleInput = this.createTextField(
      fields,
      "Überschrift",
      step.title ?? "",
      `Schritt ${stepIndex + 1}`,
    );
    titleInput.addEventListener("input", () => {
      step.title = titleInput.value || undefined;
    });

    const timerInput = this.createOptionalNumberField(
      fields,
      "Timer (Min., optional)",
      step.timerMinutes,
    );
    timerInput.addEventListener("change", () => {
      step.timerMinutes = getOptionalNumber(timerInput.value);
    });

    const instructionLabel = card.createEl("label", {
      cls: "cookbook-recipe-editor-field",
      text: "Anweisungen (eine Zeile = ein Listenpunkt)",
    });
    const instructionsInput = instructionLabel.createEl("textarea", {
      attr: {
        rows: "5",
        placeholder: "Zutat vorbereiten\nIm Topf erhitzen\nServieren",
      },
    });
    instructionsInput.value = step.instructions.join("\n");
    instructionsInput.addEventListener("input", () => {
      step.instructions = instructionsInput.value.split("\n");
    });

    const ingredientHeader = card.createDiv(
      "cookbook-recipe-editor-step-ingredients-header",
    );
    ingredientHeader.createEl("strong", {
      text: "Zutaten in diesem Schritt",
    });

    const addIngredientButton = ingredientHeader.createEl("button", {
      text: "Zutat zuordnen",
    });
    addIngredientButton.addEventListener("click", () => {
      const ingredient = this.createStepIngredient(stepIndex);

      if (!ingredient) {
        return;
      }

      step.ingredients.push(ingredient);
      this.refreshEditor();
    });

    this.renderIngredientList(
      card,
      step.ingredients,
      (ingredientIndex) => {
        step.ingredients.splice(ingredientIndex, 1);
        this.refreshEditor();
      },
      stepIndex,
    );
  }

  private renderIngredientList(
    parent: HTMLElement,
    ingredients: RecipeIngredient[],
    onRemove: (index: number) => void,
	stepIndex?: number,
  ): void {
    if (!this.library) {
      return;
    }

    const list = parent.createDiv("cookbook-recipe-editor-ingredient-list");

    if (ingredients.length === 0) {
      list.createEl("small", {
        cls: "setting-item-description",
        text: "Noch keine Zutaten hinzugefügt.",
      });
      return;
    }

    const ingredientDefinitions = [...this.library.ingredients].sort(
      (a, b) => a.name.localeCompare(b.name, "de"),
    );

    for (const [index, ingredient] of ingredients.entries()) {
      const row = list.createDiv("cookbook-recipe-editor-ingredient");
      const fields = row.createDiv("cookbook-recipe-editor-ingredient-fields");

      const ingredientLabel = fields.createEl("label", {
        cls: "cookbook-recipe-editor-field",
        text: "Zutat",
      });
      const ingredientSelect = ingredientLabel.createEl("select");

      if (stepIndex === undefined) {
        for (const definition of ingredientDefinitions) {
          ingredientSelect.createEl("option", {
            value: definition.id,
            text: `${definition.name} (${definition.defaultUnit})`,
          });
        }

        ingredientSelect.value = ingredient.ingredientId;
      } else {
        for (const [recipeIngredientIndex, recipeIngredient] of this.draft.ingredients.entries()) {
          const definition = this.library.ingredients.find(
            (entry) => entry.id === recipeIngredient.ingredientId,
          );

          if (!definition) {
            continue;
          }

          ingredientSelect.createEl("option", {
            value: String(recipeIngredientIndex),
            text: `${definition.name}${recipeIngredient.Suffix ? ` ${recipeIngredient.Suffix}` : ""} (${formatNumber(recipeIngredient.amount)} ${recipeIngredient.unit ?? definition.defaultUnit})`,
          });
        }

        const matchingRecipeIngredientIndex =
          this.draft.ingredients.findIndex(
            (recipeIngredient) =>
              recipeIngredient.ingredientId === ingredient.ingredientId,
          );

        ingredientSelect.value =
          matchingRecipeIngredientIndex >= 0
            ? String(matchingRecipeIngredientIndex)
            : "";
      }

      ingredientSelect.addEventListener("change", () => {
        if (stepIndex === undefined) {
          ingredient.ingredientId = ingredientSelect.value;
          return;
        }

        const recipeIngredient = this.draft.ingredients[
          Number(ingredientSelect.value)
        ];

        if (!recipeIngredient) {
          return;
        }

        this.applyRecipeIngredientToStepIngredient(
          ingredient,
          recipeIngredient,
          stepIndex,
        );
        this.refreshEditor();
      });

      const amountInput = this.createNumberField(
        fields,
        "Menge",
        ingredient.amount,
        0.1,
        0.1,
      );
      amountInput.addEventListener("change", () => {
        ingredient.amount = Number(amountInput.value);
      });

      amountInput.addEventListener("click", () => {
        amountInput.select();
      });

      const alternativeLabel = fields.createEl("label", {
        cls: "cookbook-recipe-editor-field",
        text: "Alternative",
      });
      const alternativeSelect = alternativeLabel.createEl("select");
      alternativeSelect.createEl("option", {
        value: "",
        text: "Keine Alternative",
      });

      for (const definition of ingredientDefinitions) {
        if (definition.id === ingredient.ingredientId) {
          continue;
        }

        alternativeSelect.createEl("option", {
          value: definition.id,
          text: definition.name,
        });
      }

      alternativeSelect.value = ingredient.alternativeIngredientId ?? "";
      alternativeSelect.addEventListener("change", () => {
        ingredient.alternativeIngredientId =
          alternativeSelect.value || undefined;
      });

      const suffixInput = this.createTextField(
        fields,
        "Zusatz",
        ingredient.Suffix ?? "",
        "z. B. gehackt",
      );
      suffixInput.addEventListener("input", () => {
        ingredient.Suffix = suffixInput.value.trim() || undefined;
      });

      const noteInput = this.createTextField(
        fields,
        "Hinweis",
        ingredient.note ?? "",
        "z. B. zum Servieren",
      );
      noteInput.addEventListener("input", () => {
        ingredient.note = noteInput.value.trim() || undefined;
      });

      const removeButton = this.createIconButton(
        row,
        "x",
        "Zutat entfernen",
      );
      removeButton.addEventListener("click", () => onRemove(index));
    }
  }

  private renderActions(parent: HTMLElement): void {
    const actions = parent.createDiv("cookbook-recipe-editor-actions");

    const cancelButton = actions.createEl("button", {
      text: "Abbrechen",
    });
    cancelButton.addEventListener("click", () => this.close());

    const saveButton = actions.createEl("button", {
      text: "Rezept speichern",
      cls: "mod-cta",
    });
    saveButton.addEventListener("click", () => {
      void this.saveRecipe();
    });
  }

  private async saveRecipe(): Promise<void> {
    const title = this.draft.title.trim();

    if (!title) {
      this.plugin.notice("Bitte gib einen Rezeptnamen ein.");
      return;
    }

    if (
      !Number.isFinite(this.draft.baseEaters) ||
      this.draft.baseEaters <= 0
    ) {
      this.plugin.notice(
        "Die Portionseinheiten müssen größer als null sein.",
      );
      return;
    }

    if (this.draft.ingredients.length === 0) {
      this.plugin.notice(
        "Bitte füge mindestens eine Zutat für die Einkaufsliste hinzu.",
      );
      return;
    }

    if (
      !this.areIngredientsValid(this.draft.ingredients) ||
      !this.draft.steps.every((step) =>
        this.areIngredientsValid(step.ingredients),
      )
    ) {
      this.plugin.notice(
        "Jede Zutat benötigt eine gültige Auswahl und eine Menge größer als null.",
      );
      return;
    }
	
    const assignedRecipeIngredientIds = new Set(
      this.draft.ingredients.map((ingredient) => ingredient.ingredientId),
    );

    if (
      this.draft.steps.some((step) =>
        step.ingredients.some(
          (ingredient) =>
            !assignedRecipeIngredientIds.has(ingredient.ingredientId),
        ),
      )
    ) {
      this.plugin.notice(
        "Kochschritte dürfen nur Zutaten verwenden, die dem Rezept zugeordnet wurden.",
      );
      return;
    }

    const steps = this.draft.steps
      .map((step) => ({
        ...step,
        title: step.title?.trim() || undefined,
        instructions: step.instructions
          .map((instruction) => instruction.trim())
          .filter(Boolean),
      }))
      .filter((step) => step.instructions.length > 0);

    if (steps.length === 0) {
      this.plugin.notice(
        "Bitte erstelle mindestens einen Kochschritt mit einer Anweisung.",
      );
      return;
    }

    const recipe: Recipe = {
      ...this.draft,
      id: createUniqueRecipeId(title, this.existingRecipes),
      title,
      categoryIds: [...new Set(this.draft.categoryIds)],
      restrictionScopeIds: [...new Set(this.draft.restrictionScopeIds)],
      ingredients: this.draft.ingredients.map((ingredient) => ({
        ...ingredient,
      })),
      steps,
    };

    try {
      await this.plugin.createRecipe(recipe);
      this.plugin.notice(`"${recipe.title}" wurde erstellt.`);
      this.onChanged();
      this.close();
    } catch (error) {
      this.plugin.notice(
        error instanceof Error
          ? error.message
          : "Das Rezept konnte nicht gespeichert werden.",
      );
    }
  }

  private areIngredientsValid(ingredients: RecipeIngredient[]): boolean {
    return ingredients.every(
      (ingredient) =>
        ingredient.ingredientId.trim().length > 0 &&
        Number.isFinite(ingredient.amount) &&
        ingredient.amount > 0,
    );
  }

  private createIngredient(): RecipeIngredient | null {
    const ingredientId = this.library?.ingredients[0]?.id;

    if (!ingredientId) {
      this.plugin.notice(
        "Lege zuerst im Zutatenmanagement mindestens eine Zutat an.",
      );
      return null;
    }

    return {
      ingredientId,
      amount: 1,
    };
  }
  
  /**
   * Zutaten eines Arbeitsschritts werden immer aus der Zutatenliste des
   * Rezepts übernommen. Die Menge entspricht der noch nicht in vorherigen
   * Schritten verwendeten Menge.
   */
  private createStepIngredient(
    stepIndex: number,
  ): RecipeIngredient | null {
    const recipeIngredient = this.draft.ingredients[0];

    if (!recipeIngredient) {
      this.plugin.notice(
        "Füge zuerst eine Zutat zur Rezept-Zutatenliste hinzu.",
      );
      return null;
    }

    const stepIngredient: RecipeIngredient = {
      ...recipeIngredient,
      amount: 0,
    };

    this.applyRecipeIngredientToStepIngredient(
      stepIngredient,
      recipeIngredient,
      stepIndex,
    );

    return stepIngredient;
  }

  private applyRecipeIngredientToStepIngredient(
    target: RecipeIngredient,
    source: RecipeIngredient,
    stepIndex: number,
  ): void {
    target.ingredientId = source.ingredientId;
    target.alternativeIngredientId = source.alternativeIngredientId;
    target.unit = source.unit;
    target.unitPlural = source.unitPlural;
    target.Suffix = source.Suffix;
    target.note = source.note;
    target.amount = this.getRemainingIngredientAmount(
      source.ingredientId,
      stepIndex,
    );
  }

  private getRemainingIngredientAmount(
    ingredientId: string,
    stepIndex: number,
  ): number {
    const configuredAmount = this.draft.ingredients
      .filter((ingredient) => ingredient.ingredientId === ingredientId)
      .reduce((sum, ingredient) => sum + ingredient.amount, 0);

    const previouslyUsedAmount = this.draft.steps
      .slice(0, stepIndex)
      .flatMap((step) => step.ingredients)
      .filter((ingredient) => ingredient.ingredientId === ingredientId)
      .reduce((sum, ingredient) => sum + ingredient.amount, 0);

    return Math.max(0, configuredAmount - previouslyUsedAmount);
  }

  private async addCategory(rawName: string): Promise<void> {
    if (!this.library) {
      return;
    }

    const name = rawName.trim();

    if (!name) {
      this.plugin.notice("Bitte gib einen Kategorienamen ein.");
      return;
    }

    if (
      this.library.categories.some(
        (category) =>
          category.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
      )
    ) {
      this.plugin.notice("Diese Kategorie ist bereits vorhanden.");
      return;
    }

    const category = {
      id: createUniqueCategoryId(name, this.library.categories.map(
        (entry) => entry.id,
      )),
      name,
    };

    this.library.categories.push(category);
    this.draft.categoryIds = [
      ...new Set([...this.draft.categoryIds, category.id]),
    ];

    try {
      await this.plugin.saveLibrary(this.library);
      this.plugin.notice(`Kategorie "${name}" wurde angelegt.`);
      this.onChanged();
      this.refreshEditor();
    } catch (error) {
      this.plugin.notice(
        error instanceof Error
          ? error.message
          : "Die Kategorie konnte nicht gespeichert werden.",
      );
    }
  }

  private renderCheckboxGroup(
    parent: HTMLElement,
    label: string,
    options: Array<{ id: string; name: string }>,
    selectedIds: string[],
    onChanged: (ids: string[]) => void,
  ): void {
    const section = parent.createDiv("cookbook-recipe-editor-checkbox-group");
    section.createEl("small", { text: label });

    const selected = new Set(selectedIds);
    const optionsEl = section.createDiv(
      "cookbook-recipe-editor-checkbox-options",
    );

    for (const option of options) {
      const optionLabel = optionsEl.createEl("label");
      const input = optionLabel.createEl("input", {
        attr: { type: "checkbox" },
      });

      input.checked = selected.has(option.id);
      optionLabel.createSpan({ text: option.name });

      input.addEventListener("change", () => {
        if (input.checked) {
          selected.add(option.id);
        } else {
          selected.delete(option.id);
        }

        onChanged([...selected]);
      });
    }
  }

  private createTextField(
    parent: HTMLElement,
    labelText: string,
    value: string,
    placeholder = "",
  ): HTMLInputElement {
    const label = parent.createEl("label", {
      cls: "cookbook-recipe-editor-field",
      text: labelText,
    });

    return label.createEl("input", {
      attr: {
        type: "text",
        value,
        placeholder,
      },
    });
  }

  private createNumberField(
    parent: HTMLElement,
    labelText: string,
    value: number,
    min: number,
    step: number,
  ): HTMLInputElement {
    const label = parent.createEl("label", {
      cls: "cookbook-recipe-editor-field",
      text: labelText,
    });

    return label.createEl("input", {
      attr: {
        type: "number",
        value: String(value),
        min: String(min),
        step: String(step),
      },
    });
  }

  private createOptionalNumberField(
    parent: HTMLElement,
    labelText: string,
    value: number | undefined,
  ): HTMLInputElement {
    const label = parent.createEl("label", {
      cls: "cookbook-recipe-editor-field",
      text: labelText,
    });

    return label.createEl("input", {
      attr: {
        type: "number",
        value: value === undefined ? "" : String(value),
        min: "1",
        step: "1",
      },
    });
  }

  private createIconButton(
    parent: HTMLElement,
    icon: string,
    label: string,
  ): HTMLButtonElement {
    const button = parent.createEl("button", {
      cls: "clickable-icon",
      attr: {
        "aria-label": label,
        title: label,
      },
    });

    setIcon(button, icon);
    return button;
  }
}

function createEmptyRecipe(): Recipe {
  return {
    id: "",
    title: "",
    categoryIds: [],
    baseEaters: 2,
    restrictionScopeIds: [],
    imagePlacement: "cover",
    ingredients: [],
    steps: [
      {
        title: "",
        ingredients: [],
        instructions: [""],
      },
    ],
  };
}

function getOptionalNumber(value: string): number | undefined {
  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function createUniqueRecipeId(title: string, recipes: Recipe[]): string {
  const base =
    title
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLocaleLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "rezept";

  const usedIds = new Set(recipes.map((recipe) => recipe.id));

  if (!usedIds.has(base)) {
    return base;
  }

  let suffix = 2;

  while (usedIds.has(`${base}-${suffix}`)) {
    suffix += 1;
  }

  return `${base}-${suffix}`;
}

function createUniqueCategoryId(
  name: string,
  usedIds: string[],
): string {
  const base =
    name
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLocaleLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "kategorie";

  const used = new Set(usedIds);

  if (!used.has(base)) {
    return base;
  }

  let suffix = 2;

  while (used.has(`${base}-${suffix}`)) {
    suffix += 1;
  }

  return `${base}-${suffix}`;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 1,
  }).format(value);
}
import { App, Modal, setIcon } from "obsidian";
import type CookbookPlugin from "./main";
import { t } from "./i18n";
import type {
  CookbookLibrary,
  CookbookPerson,
  Recipe,
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

const DEFAULT_GUEST_COLORS = [
  "#e67e22",
  "#3498db",
  "#27ae60",
  "#9b59b6",
  "#e74c3c",
  "#16a085",
  "#f39c12",
  "#34495e",
];

export class GuestSettingsModal extends Modal {
  private library: CookbookLibrary | null = null;
  private expandedGuestIds = new Set<string>();
  private recipes: Recipe[] = [];

  constructor(
    app: App,
    private readonly plugin: CookbookPlugin,
    private readonly onChanged: () => void,
  ) {
    super(app);
  }

  onOpen(): void {
    void this.render();
  }

  private async render(): Promise<void> {
    this.contentEl.empty();
    this.contentEl.addClass("cookbook-guest-settings-modal");

    try {
      this.library = await this.plugin.loadLibrary();
    } catch (error) {
      this.contentEl.createEl("h2", {
        text: t("guestSettings.errorTitle"),
      });
      this.contentEl.createEl("p", {
        text:
          error instanceof Error
            ? error.message
            : t("guestSettings.libraryLoadError"),
      });
      return;
    }

    this.contentEl.createEl("h2", {
      text: t("guestSettings.title"),
    });
    this.recipes = await this.plugin.database.loadRecipes();
    this.contentEl.createEl("p", {
      cls: "setting-item-description",
      text: t("guestSettings.description"),
    });

    this.renderGuestList(this.library);
    this.renderAddGuestForm(this.library);
  }

  private renderGuestList(library: CookbookLibrary): void {
    const list = this.contentEl.createDiv("cookbook-guest-settings-list");
    const imageFiles = this.app.vault
      .getFiles()
      .filter((file) => IMAGE_EXTENSIONS.has(file.extension.toLocaleLowerCase()))
      .sort((a, b) => a.path.localeCompare(b.path));

    for (const { person, imagePath } of this.plugin.getOrderedPeople(
      library.people,
    )) {
      const row = list.createDiv("cookbook-guest-settings-row");

      const header = row.createDiv("cookbook-guest-settings-header");
      const expanded = this.expandedGuestIds.has(person.id);

      const preview = header.createDiv("cookbook-guest-settings-preview");
      preview.style.setProperty("--person-color", person.color);

      if (imagePath ?? person.avatarUrl) {
        preview.createEl("img", {
          attr: {
            src: this.plugin.resolveVaultImageUrl(imagePath ?? person.avatarUrl ?? ""),
            alt: "",
          },
        });
      } else {
        preview.createSpan({ text: initials(person.name) });
      }

      header.createEl("strong", {
        cls: "cookbook-guest-settings-name",
        text: person.name,
      });

      const moveUp = this.createIconButton(
        header,
        "chevron-up",
        t("guestSettings.moveUp", { name: person.name }),
      );
      moveUp.disabled = this.plugin.getGuestButtonIndex(person.id) === 0;

      moveUp.addEventListener("click", () => {
        void this.moveGuest(person.id, -1);
      });

      const moveDown = this.createIconButton(
        header,
        "chevron-down",
        t("guestSettings.moveDown", { name: person.name }),
      );
      moveDown.disabled =
        this.plugin.getGuestButtonIndex(person.id) >=
        this.plugin.settings.guestButtons.length - 1;

      moveDown.addEventListener("click", () => {
        void this.moveGuest(person.id, 1);
      });

      const toggle = this.createIconButton(
        header,
        expanded ? "chevron-up" : "chevron-down",
        expanded
          ? t("guestSettings.collapse", { name: person.name })
          : t("guestSettings.edit", { name: person.name }),
      );
      toggle.addClass("cookbook-guest-settings-expand-button");

      toggle.addEventListener("click", () => {
        if (this.expandedGuestIds.has(person.id)) {
          this.expandedGuestIds.delete(person.id);
        } else {
          this.expandedGuestIds.add(person.id);
        }

        void this.render();
      });

      if (!expanded) {
        continue;
      }

      const content = row.createDiv("cookbook-guest-settings-content");

      this.renderGuestGeneralControls(
        content,
        person,
        imagePath,
        imageFiles,
      );
      this.renderAllergenControls(content, person, library);
      this.renderAvoidanceControls(content, person, library);
	  this.renderFavoriteRecipeControls(content, person);
    }
  }
  
  private renderGuestGeneralControls(
    parent: HTMLElement,
    person: CookbookPerson,
    imagePath: string | undefined,
    imageFiles: ReturnType<App["vault"]["getFiles"]>,
  ): void {
    const controls = parent.createDiv("cookbook-guest-general-controls");

    const weightLabel = controls.createEl("label", {
      cls: "cookbook-guest-field",
      text: t("guestSettings.portionSize"),
    });

    const eaterWeightInput = weightLabel.createEl("input", {
      attr: {
        type: "number",
        min: "0.1",
        step: "0.1",
        value: String(person.eaterWeight),
        "aria-label": t("guestSettings.portionSizeFor", {
          name: person.name,
        }),
      },
    });

    eaterWeightInput.addEventListener("change", () => {
      void this.updateEaterWeight(person, Number(eaterWeightInput.value));
    });

    const imageLabel = controls.createEl("label", {
      cls: "cookbook-guest-field cookbook-guest-image-field",
      text: t("guestSettings.image"),
    });

    const imageSelect = imageLabel.createEl("select", {
      attr: {
        "aria-label": t("guestSettings.imageFor", {
          name: person.name,
        }),
      },
    });

    imageSelect.createEl("option", {
      text: t("guestSettings.noConfiguredImage"),
      value: "",
    });

    for (const file of imageFiles) {
      imageSelect.createEl("option", {
        text: file.path,
        value: file.path,
      });
    }

    imageSelect.value = imagePath ?? "";

    imageSelect.addEventListener("change", () => {
      void this.updateImage(person, imageSelect.value || undefined);
    });
  }
  
  private renderAllergenControls(
    parent: HTMLElement,
    person: CookbookPerson,
    library: CookbookLibrary,
  ): void {
    const allergens = library.allergens ?? [];

    if (allergens.length === 0) {
      return;
    }

    const controls = parent.createDiv("cookbook-guest-allergen-controls");

    const selectedIds = new Set(person.intoleranceAllergenIds ?? []);

    for (const allergen of allergens) {
      const label = controls.createEl("label", {
        cls: "cookbook-guest-allergen-option",
      });

      const input = label.createEl("input", {
        attr: {
          type: "checkbox",
          "aria-label": t("guestSettings.allergenNotTolerated", {
            allergen: allergen.name,
            name: person.name,
          }),
        },
      });

      input.checked = selectedIds.has(allergen.id);
      label.createSpan({ text: allergen.name });

      input.addEventListener("change", () => {
        void this.updateGuestAllergen(
          person,
          allergen.id,
          input.checked,
        );
      });
    }
  }

  private renderAvoidanceControls(
    parent: HTMLElement,
    person: CookbookPerson,
    library: CookbookLibrary,
  ): void {
    const section = parent.createDiv("cookbook-guest-avoidance-controls");
    section.createEl("small", {
      text: t("guestSettings.avoidances"),
    });

    const scopeById = new Map(
      library.restrictionScopes.map((scope) => [scope.id, scope]),
    );
    const ingredientById = new Map(
      library.ingredients.map((ingredient) => [ingredient.id, ingredient]),
    );

    const existing = section.createDiv("cookbook-guest-avoidance-list");

    for (const avoidance of person.avoidances) {
      const scope = scopeById.get(avoidance.scopeId);

      for (const ingredientId of avoidance.ingredientIds) {
        const ingredient = ingredientById.get(ingredientId);

        if (!ingredient) {
          continue;
        }

        const item = existing.createDiv("cookbook-guest-avoidance-item");
        item.createSpan({
          text: `${scope?.name ?? avoidance.scopeId}: ${ingredient.name}`,
        });

        const remove = this.createIconButton(
          item,
          "x",
          t("guestSettings.allowIngredientAgain", {
            ingredient: ingredient.name,
            name: person.name,
          }),
        );
        remove.addClass("cookbook-guest-avoidance-remove");

        remove.addEventListener("click", () => {
          void this.removeAvoidance(
            person,
            avoidance.scopeId,
            ingredientId,
          );
        });
      }
    }

    const addControls = section.createDiv("cookbook-guest-avoidance-add");

    const scopeSelect = addControls.createEl("select", {
      attr: {
        "aria-label": t("guestSettings.scopeFor", {
          name: person.name,
        }),
      },
    });

    for (const scope of library.restrictionScopes) {
      scopeSelect.createEl("option", {
        text: scope.name,
        value: scope.id,
      });
    }

    const ingredientSelect = addControls.createEl("select", {
      attr: {
        "aria-label": t("guestSettings.ingredientFor", {
          name: person.name,
        }),
      },
    });

    for (const ingredient of [...library.ingredients].sort((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      ingredientSelect.createEl("option", {
        text: ingredient.name,
        value: ingredient.id,
      });
    }

    const add = addControls.createEl("button", {
      text: t("guestSettings.add"),
    });

    add.addEventListener("click", () => {
      void this.addAvoidance(
        person,
        scopeSelect.value,
        ingredientSelect.value,
      );
    });
  }

  private async updateEaterWeight(
    person: CookbookPerson,
    eaterWeight: number,
  ): Promise<void> {
    if (!Number.isFinite(eaterWeight) || eaterWeight <= 0) {
      this.plugin.notice(t("guestSettings.invalidPortionSize"));
      await this.render();
      return;
    }

    person.eaterWeight = eaterWeight;
    await this.saveLibraryAndNotify();
  }

  private async updateGuestAllergen(
    person: CookbookPerson,
    allergenId: string,
    enabled: boolean,
  ): Promise<void> {
    const allergenIds = new Set(person.intoleranceAllergenIds ?? []);

    if (enabled) {
      allergenIds.add(allergenId);
    } else {
      allergenIds.delete(allergenId);
    }

    person.intoleranceAllergenIds = [...allergenIds];

    await this.saveLibraryAndNotify();
  }
 
  private async addAvoidance(
    person: CookbookPerson,
    scopeId: string,
    ingredientId: string,
  ): Promise<void> {
    let avoidance = person.avoidances.find(
      (entry) => entry.scopeId === scopeId,
    );

    if (!avoidance) {
      avoidance = { scopeId, ingredientIds: [] };
      person.avoidances.push(avoidance);
    }

    if (avoidance.ingredientIds.includes(ingredientId)) {
      this.plugin.notice(t("guestSettings.avoidanceAlreadyExists"));
      return;
    }

    avoidance.ingredientIds.push(ingredientId);
    await this.saveLibraryAndNotify();
    await this.render();
  }

  private async removeAvoidance(
    person: CookbookPerson,
    scopeId: string,
    ingredientId: string,
  ): Promise<void> {
    const avoidance = person.avoidances.find(
      (entry) => entry.scopeId === scopeId,
    );

    if (!avoidance) {
      return;
    }

    avoidance.ingredientIds = avoidance.ingredientIds.filter(
      (id) => id !== ingredientId,
    );

    person.avoidances = person.avoidances.filter(
      (entry) => entry.ingredientIds.length > 0,
    );

    await this.saveLibraryAndNotify();
    await this.render();
  }
  
  private renderFavoriteRecipeControls(
    parent: HTMLElement,
    person: CookbookPerson,
  ): void {
    const section = parent.createDiv("cookbook-guest-favorite-controls");
    section.createEl("small", {
      text: t("guestSettings.favoriteRecipes"),
    });

    const recipeById = new Map(
      this.recipes.map((recipe) => [recipe.id, recipe]),
    );
    const existing = section.createDiv("cookbook-guest-favorite-list");

    for (const recipeId of person.favoriteRecipeIds) {
      const recipe = recipeById.get(recipeId);

      if (!recipe) {
        continue;
      }

      const item = existing.createDiv("cookbook-guest-favorite-item");
      item.createSpan({ text: recipe.title });

      const remove = this.createIconButton(
        item,
        "x",
        t("guestSettings.removeFavoriteRecipe", {
          recipe: recipe.title,
          name: person.name,
        }),
      );
      remove.addClass("cookbook-guest-favorite-remove");

      remove.addEventListener("click", () => {
        void this.removeFavoriteRecipe(person, recipe.id);
      });
    }

    if (this.recipes.length === 0) {
      section.createEl("small", {
        cls: "setting-item-description",
        text: t("guestSettings.noRecipesFound"),
      });
      return;
    }

    const addControls = section.createDiv("cookbook-guest-favorite-add");
    const selectedRecipeIds = new Set(person.favoriteRecipeIds);
    const availableRecipes = [...this.recipes]
      .filter((recipe) => !selectedRecipeIds.has(recipe.id))
      .sort((a, b) => a.title.localeCompare(b.title));

    if (availableRecipes.length === 0) {
      addControls.createEl("small", {
        text: t("guestSettings.allRecipesAlreadyFavorites"),
      });
      return;
    }

    const recipeSelect = addControls.createEl("select", {
      attr: {
        "aria-label": t("guestSettings.favoriteRecipeFor", {
          name: person.name,
        }),
      },
    });

    for (const recipe of availableRecipes) {
      recipeSelect.createEl("option", {
        text: recipe.title,
        value: recipe.id,
      });
    }

    const add = addControls.createEl("button", {
      text: t("guestSettings.add"),
    });

    add.addEventListener("click", () => {
      void this.addFavoriteRecipe(person, recipeSelect.value);
    });
  }

  private async addFavoriteRecipe(
    person: CookbookPerson,
    recipeId: string,
  ): Promise<void> {
    if (person.favoriteRecipeIds.includes(recipeId)) {
      this.plugin.notice(
        t("guestSettings.favoriteRecipeAlreadyExists"),
      );
      return;
    }

    person.favoriteRecipeIds.push(recipeId);
    await this.saveLibraryAndNotify();
    await this.render();
  }

  private async removeFavoriteRecipe(
    person: CookbookPerson,
    recipeId: string,
  ): Promise<void> {
    person.favoriteRecipeIds = person.favoriteRecipeIds.filter(
      (id) => id !== recipeId,
    );

    await this.saveLibraryAndNotify();
    await this.render();
  }

  private async saveLibraryAndNotify(): Promise<void> {
    if (!this.library) {
      return;
    }

    await this.plugin.saveLibrary(this.library);
    this.onChanged();
  }

  private renderAddGuestForm(library: CookbookLibrary): void {
    const section = this.contentEl.createDiv("cookbook-add-guest");
    section.createEl("h3", {
      text: t("guestSettings.addGuest"),
    });

    const fields = section.createDiv("cookbook-add-guest-fields");

    const nameInput = fields.createEl("input", {
      attr: {
        type: "text",
        placeholder: t("guestSettings.name"),
        "aria-label": t("guestSettings.guestName"),
      },
    });

    const eaterWeightInput = fields.createEl("input", {
      attr: {
        type: "number",
        min: "0.1",
        step: "0.1",
        value: "1",
        "aria-label": t("guestSettings.portionUnits"),
      },
    });

    const colorInput = fields.createEl("input", {
      attr: {
        type: "color",
        value: getNextGuestColor(library.people),
        "aria-label": t("guestSettings.guestColor"),
      },
    });

    const addButton = fields.createEl("button", {
      text: t("guestSettings.addGuest"),
      cls: "mod-cta",
    });

    addButton.addEventListener("click", () => {
      void this.addGuest(
        nameInput.value,
        Number(eaterWeightInput.value),
        colorInput.value,
      );
    });

    nameInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        addButton.click();
      }
    });
  }

  private async updateImage(
    person: CookbookPerson,
    imagePath: string | undefined,
  ): Promise<void> {
    await this.plugin.setGuestButtonImage(person.id, imagePath);
    this.onChanged();
    await this.render();
  }

  private async moveGuest(personId: string, direction: -1 | 1): Promise<void> {
    await this.plugin.moveGuestButton(personId, direction);
    this.onChanged();
    await this.render();
  }

  private async addGuest(
    rawName: string,
    eaterWeight: number,
    color: string,
  ): Promise<void> {
    const name = rawName.trim();

    if (!name) {
      this.plugin.notice(t("guestSettings.nameRequired"));
      return;
    }

    if (!Number.isFinite(eaterWeight) || eaterWeight <= 0) {
      this.plugin.notice(t("guestSettings.invalidPortionSize"));
      return;
    }

    if (!this.library) {
      return;
    }

    const person: CookbookPerson = {
      id: createUniqueGuestId(name, this.library.people),
      name,
      color,
      eaterWeight,
      avoidances: [],
      favoriteRecipeIds: [],
    };

    this.library.people.push(person);
	this.expandedGuestIds.add(person.id);

    await this.plugin.saveLibrary(this.library);
    this.plugin.notice(t("guestSettings.guestAdded", { name }));
    this.onChanged();
    await this.render();
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

function createUniqueGuestId(
  name: string,
  people: CookbookPerson[],
): string {
  const base =
    name
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLocaleLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "guest";

  const usedIds = new Set(people.map((person) => person.id));

  if (!usedIds.has(base)) {
    return base;
  }

  let counter = 2;

  while (usedIds.has(`${base}-${counter}`)) {
    counter += 1;
  }

  return `${base}-${counter}`;
}

function getNextGuestColor(people: CookbookPerson[]): string {
  return DEFAULT_GUEST_COLORS[people.length % DEFAULT_GUEST_COLORS.length];
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
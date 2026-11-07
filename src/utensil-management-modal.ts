import { App, Modal, setIcon } from "obsidian";
import type CookbookPlugin from "./main";
import { t } from "./i18n";
import {
  hasValidUtensilDimensions,
  isCylindricalUtensilDimensions,
  isRectangularUtensilDimensions,
} from "./types";
import type {
  CookbookLibrary,
  CookbookUtensil,
  UtensilCategory,
  UtensilDimensions,
} from "./types";

export class UtensilManagementModal extends Modal {
  private library: CookbookLibrary | null = null;

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
    this.contentEl.addClass("cookbook-utensil-management-modal");

    try {
      this.library = await this.plugin.loadLibrary();
    } catch (error) {
      this.contentEl.createEl("h2", {
        text: t("utensilManagement.errorTitle"),
      });
      this.contentEl.createEl("p", {
        text:
          error instanceof Error
            ? error.message
            : t("utensilManagement.libraryLoadError"),
      });
      return;
    }

    const categories = this.library.utensilCategories ?? [];

    this.contentEl.createEl("h2", {
      text: t("utensilManagement.title"),
    });

    this.contentEl.createEl("p", {
      cls: "setting-item-description",
      text: t("utensilManagement.description"),
    });

    if (categories.length === 0) {
      this.contentEl.createDiv({
        cls: "cookbook-empty-state",
        text: t("utensilManagement.noCategories"),
      });
      return;
    }

    this.renderUtensilList(categories);
    this.renderAddUtensilForm(categories);
  }

  private renderUtensilList(
    categories: UtensilCategory[],
  ): void {
    const categoryById = new Map(
      categories.map((category) => [category.id, category]),
    );

    const list = this.contentEl.createDiv(
      "cookbook-utensil-management-list",
    );

    const utensils = [...this.plugin.settings.utensils].sort((a, b) =>
      a.name.localeCompare(b.name, "de"),
    );

    if (utensils.length === 0) {
      list.createEl("small", {
        cls: "setting-item-description",
        text: t("utensilManagement.empty"),
      });
      return;
    }

    for (const utensil of utensils) {
      this.renderUtensilEditor(
        list,
        utensil,
        categories,
        categoryById,
      );
    }
  }

  private renderUtensilEditor(
    parent: HTMLElement,
    utensil: CookbookUtensil,
    categories: UtensilCategory[],
    categoryById: Map<string, UtensilCategory>,
  ): void {
    const row = parent.createDiv("cookbook-utensil-management-row");

    const fields = row.createDiv("cookbook-utensil-management-fields");

    const nameInput = this.createTextField(
      fields,
      t("utensilManagement.name"),
      utensil.name,
    );

    const categoryLabel = fields.createEl("label", {
      cls: "cookbook-utensil-field",
      text: t("utensilManagement.category"),
    });

    const categorySelect = categoryLabel.createEl("select");

    for (const category of categories) {
      categorySelect.createEl("option", {
        value: category.id,
        text: category.name,
      });
    }

    categorySelect.value = categoryById.has(utensil.categoryId)
      ? utensil.categoryId
      : categories[0]?.id ?? "";

    const dimensionFields = fields.createDiv(
      "cookbook-utensil-management-dimension-fields",
    );

    let diameterInput: HTMLInputElement | null = null;
    let widthInput: HTMLInputElement | null = null;
    let lengthInput: HTMLInputElement | null = null;
    let heightInput: HTMLInputElement | null = null;

    const renderDimensionFields = (): void => {
      dimensionFields.empty();

      const category = categories.find(
        (entry) => entry.id === categorySelect.value,
      );

      if (!category) {
        return;
      }

      if (category.shape === "cylinder") {
        diameterInput = this.createNumberField(
          dimensionFields,
          t("utensilManagement.diameter"),
          isCylindricalUtensilDimensions(utensil)
            ? utensil.diameterCm
            : 0,
        );
        widthInput = null;
        lengthInput = null;
      } else {
        widthInput = this.createNumberField(
          dimensionFields,
          t("utensilManagement.width"),
          isRectangularUtensilDimensions(utensil)
            ? utensil.widthCm
            : 0,
        );
        lengthInput = this.createNumberField(
          dimensionFields,
          t("utensilManagement.length"),
          isRectangularUtensilDimensions(utensil)
            ? utensil.lengthCm
            : 0,
        );
        diameterInput = null;
      }

      heightInput = this.createNumberField(
        dimensionFields,
        t("utensilManagement.height"),
        utensil.heightCm,
      );
    };

    renderDimensionFields();
    categorySelect.addEventListener("change", renderDimensionFields);

    const actions = row.createDiv("cookbook-utensil-management-actions");

    const saveButton = actions.createEl("button", {
      text: t("utensilManagement.save"),
      cls: "mod-cta",
    });

    saveButton.addEventListener("click", () => {
      const category = categories.find(
        (entry) => entry.id === categorySelect.value,
      );

      if (!category || !heightInput) {
        this.plugin.notice(t("utensilManagement.invalidDimensions"));
        return;
      }

      if (
        category.shape === "cylinder" &&
        !diameterInput
      ) {
        this.plugin.notice(t("utensilManagement.invalidDimensions"));
        return;
      }

      if (
        category.shape === "rectangular" &&
        (!widthInput || !lengthInput)
      ) {
        this.plugin.notice(t("utensilManagement.invalidDimensions"));
        return;
      }

      const dimensions = this.createDimensions(
        category,
        diameterInput,
        widthInput,
        lengthInput,
        heightInput,
      );

      if (!dimensions) {
        this.plugin.notice(t("utensilManagement.invalidDimensions"));
        return;
      }

      void this.saveUtensil({
        id: utensil.id,
        name: nameInput.value.trim(),
        categoryId: category.id,
        ...dimensions,
      });
    });

    const deleteButton = actions.createEl("button", {
      cls: "clickable-icon",
      attr: {
        "aria-label": t("utensilManagement.delete", {
          name: utensil.name,
        }),
        title: t("utensilManagement.delete", {
          name: utensil.name,
        }),
      },
    });

    setIcon(deleteButton, "trash-2");

    deleteButton.addEventListener("click", () => {
      void this.deleteUtensil(utensil);
    });
  }

  private renderAddUtensilForm(
    categories: UtensilCategory[],
  ): void {
    const section = this.contentEl.createDiv(
      "cookbook-utensil-management-add",
    );

    section.createEl("h3", {
      text: t("utensilManagement.addHeading"),
    });

    const fields = section.createDiv(
      "cookbook-utensil-management-fields",
    );

    const nameInput = this.createTextField(
      fields,
      t("utensilManagement.name"),
      "",
      t("utensilManagement.namePlaceholder"),
    );

    const categoryLabel = fields.createEl("label", {
      cls: "cookbook-utensil-field",
      text: t("utensilManagement.category"),
    });

    const categorySelect = categoryLabel.createEl("select");

    for (const category of categories) {
      categorySelect.createEl("option", {
        value: category.id,
        text: category.name,
      });
    }

    const dimensionFields = fields.createDiv(
      "cookbook-utensil-management-dimension-fields",
    );

    let diameterInput: HTMLInputElement | null = null;
    let widthInput: HTMLInputElement | null = null;
    let lengthInput: HTMLInputElement | null = null;
    let heightInput: HTMLInputElement | null = null;

    const renderDimensionFields = (): void => {
      dimensionFields.empty();

      const category = categories.find(
        (entry) => entry.id === categorySelect.value,
      );

      if (!category) {
        return;
      }

      if (category.shape === "cylinder") {
        diameterInput = this.createNumberField(
          dimensionFields,
          t("utensilManagement.diameter"),
          0,
          "z. B. 21",
        );
        widthInput = null;
        lengthInput = null;
      } else {
        widthInput = this.createNumberField(
          dimensionFields,
          t("utensilManagement.width"),
          0,
          "z. B. 20",
        );
        lengthInput = this.createNumberField(
          dimensionFields,
          t("utensilManagement.length"),
          0,
          "z. B. 30",
        );
        diameterInput = null;
      }

      heightInput = this.createNumberField(
        dimensionFields,
        t("utensilManagement.height"),
        0,
        "z. B. 4",
      );
    };

    renderDimensionFields();
    categorySelect.addEventListener("change", renderDimensionFields);

    const addButton = section.createEl("button", {
      text: t("utensilManagement.add"),
      cls: "mod-cta",
    });

    const add = (): void => {
      const name = nameInput.value.trim();

      const category = categories.find(
        (entry) => entry.id === categorySelect.value,
      );

      if (!category) {
        this.plugin.notice(t("utensilManagement.invalidDimensions"));
        return;
      }

      if (!heightInput) {
        this.plugin.notice(t("utensilManagement.invalidDimensions"));
        return;
      }

      if (
        category.shape === "cylinder" &&
        !diameterInput
      ) {
        this.plugin.notice(t("utensilManagement.invalidDimensions"));
        return;
      }
	  
      if (
        category.shape === "rectangular" &&
        (!widthInput || !lengthInput)
      ) {
        this.plugin.notice(t("utensilManagement.invalidDimensions"));
        return;
      }

      const dimensions = this.createDimensions(
        category,
        diameterInput,
        widthInput,
        lengthInput,
        heightInput,
      );

      if (!dimensions) {
        this.plugin.notice(t("utensilManagement.invalidDimensions"));
        return;
      }

      const utensil: CookbookUtensil = {
        id: this.createUniqueUtensilId(name),
        name,
        categoryId: category.id,
        ...dimensions,
      };

      void this.addUtensil(utensil);
    };

    addButton.addEventListener("click", add);
    nameInput.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") {
        return;
      }

      event.preventDefault();
      add();
    });
  }

  private async addUtensil(
    utensil: CookbookUtensil,
  ): Promise<void> {
    if (!this.isValidUtensil(utensil)) {
      return;
    }

    await this.plugin.addUtensil(utensil);
    this.onChanged();
    await this.render();
  }

  private async saveUtensil(
    utensil: CookbookUtensil,
  ): Promise<void> {
    if (!this.isValidUtensil(utensil)) {
      return;
    }

    await this.plugin.updateUtensil(utensil);
    this.onChanged();
    await this.render();
  }

  private async deleteUtensil(
    utensil: CookbookUtensil,
  ): Promise<void> {
    await this.plugin.removeUtensil(utensil.id);
    this.onChanged();
    await this.render();
  }

  private isValidUtensil(utensil: CookbookUtensil): boolean {
    if (!utensil.name.trim()) {
      this.plugin.notice(t("utensilManagement.nameRequired"));
      return false;
    }

    const category = this.library?.utensilCategories?.find(
      (entry) => entry.id === utensil.categoryId,
    );

    if (
      !category ||
      !hasValidUtensilDimensions(category.shape, utensil)
    ) {
      this.plugin.notice(t("utensilManagement.invalidDimensions"));
      return false;
    }

    return true;
  }
  
  private createDimensions(
    category: UtensilCategory,
    diameterInput: HTMLInputElement | null,
    widthInput: HTMLInputElement | null,
    lengthInput: HTMLInputElement | null,
    heightInput: HTMLInputElement,
  ): UtensilDimensions | null {
    const heightCm = Number(heightInput.value);

    if (category.shape === "cylinder") {
      if (!diameterInput) {
        return null;
      }

      const dimensions: UtensilDimensions = {
        diameterCm: Number(diameterInput.value),
        heightCm,
      };

      return isCylindricalUtensilDimensions(dimensions)
        ? dimensions
        : null;
    }
	
    if (!widthInput || !lengthInput) {
      return null;
    }

    const dimensions: UtensilDimensions = {
      widthCm: Number(widthInput.value),
      lengthCm: Number(lengthInput.value),
      heightCm,
    };

    return isRectangularUtensilDimensions(dimensions)
      ? dimensions
      : null;
  }

  private createTextField(
    parent: HTMLElement,
    labelText: string,
    value: string,
    placeholder = "",
  ): HTMLInputElement {
    const label = parent.createEl("label", {
      cls: "cookbook-utensil-field",
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
	placeholder = "",
  ): HTMLInputElement {
    const label = parent.createEl("label", {
      cls: "cookbook-utensil-field",
      text: labelText,
    });

    return label.createEl("input", {
      attr: {
        type: "number",
        value: value > 0 ? String(value) : "",
        min: "0.1",
        step: "0.1",
		placeholder,
      },
    });
  }

  private createUniqueUtensilId(name: string): string {
    const base =
      name
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLocaleLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "utensil";

    const usedIds = new Set(
      this.plugin.settings.utensils.map((utensil) => utensil.id),
    );

    if (!usedIds.has(base)) {
      return base;
    }

    let suffix = 2;

    while (usedIds.has(`${base}-${suffix}`)) {
      suffix += 1;
    }

    return `${base}-${suffix}`;
  }
}
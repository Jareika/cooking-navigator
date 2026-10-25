import { App, Modal, setIcon } from "obsidian";
import type CookbookPlugin from "./main";
import type {
  CookbookLibrary,
  IngredientDefinition,
  Recipe,
  ResourcePriority,
  StoreDefinition,
} from "./types";

interface ScrollPosition {
  element: HTMLElement;
  top: number;
  left: number;
}

export class IngredientManagementModal extends Modal {
  private library: CookbookLibrary | null = null;
  private recipes: Recipe[] = [];
  private expandedIngredientIds = new Set<string>();
  private marketsExpanded = false;
  private marketManagementEl: HTMLElement | null = null;
  private ingredientManagementEl: HTMLElement | null = null;
  private addIngredientEl: HTMLElement | null = null;

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

  private async render(
    scrollPositions = this.captureScrollPositions(),
  ): Promise<void> {

    try {
      this.library = await this.plugin.loadLibrary();
      this.recipes = await this.plugin.database.loadRecipes();

      this.ensureModalLayout();
      this.refreshAllSections();
    } catch (error) {
      this.renderError(error);
    }

    this.restoreScrollPositions(scrollPositions);
  }
  
  /**
   * Der Rahmen des Modals bleibt dauerhaft im DOM. Dadurch verschwindet das
   * Modal bei kleinen Änderungen nicht kurz vollständig aus dem Bild.
   */
  private ensureModalLayout(): void {
    if (
      this.marketManagementEl &&
      this.ingredientManagementEl &&
      this.addIngredientEl
    ) {
      return;
    }

    this.contentEl.empty();
    this.contentEl.addClass("cookbook-ingredient-management-modal");

    this.contentEl.createEl("h2", {
      text: "Zutaten, Orte und Märkte verwalten",
    });

    this.contentEl.createEl("p", {
      cls: "setting-item-description",
      text:
        "Orte enthalten Supermärkte. Bei Zutaten wird festgelegt, in welchen Supermärkten sie erhältlich sind und welche Packungsgrößen verfügbar sind.",
    });

    this.marketManagementEl = this.contentEl.createDiv(
      "cookbook-ingredient-management-markets",
    );

    this.ingredientManagementEl = this.contentEl.createDiv(
      "cookbook-ingredient-management-ingredients",
    );

    this.addIngredientEl = this.contentEl.createDiv(
      "cookbook-ingredient-management-add",
    );
  }

  private renderError(error: unknown): void {
    this.marketManagementEl = null;
    this.ingredientManagementEl = null;
    this.addIngredientEl = null;

    this.contentEl.empty();
    this.contentEl.addClass("cookbook-ingredient-management-modal");
    this.contentEl.createEl("h2", { text: "Zutaten verwalten" });
    this.contentEl.createEl("p", {
      text:
        error instanceof Error
          ? error.message
          : "Die Cookbook-Bibliothek konnte nicht geladen werden.",
    });
  }

  /**
   * Aktualisiert alle dynamischen Bereiche, behält aber Kopf und Modal-DOM
   * stabil. Nötig bei Änderungen an Orten oder Märkten, weil diese auch die
   * Verfügbarkeitsauswahl jeder Zutat beeinflussen.
   */
  private refreshAllSections(): void {
    if (
      !this.library ||
      !this.marketManagementEl ||
      !this.ingredientManagementEl ||
      !this.addIngredientEl
    ) {
      return;
    }

    this.renderMarketManagement(this.marketManagementEl, this.library);
    this.renderIngredientManagement(
      this.ingredientManagementEl,
      this.library,
    );
    this.renderAddIngredient(this.addIngredientEl, this.library);
  }

  /**
   * Zutaten werden wesentlich häufiger bearbeitet als Orte oder Märkte.
   * Deshalb wird beim Aufklappen, Speichern oder Löschen nur dieser Bereich
   * aktualisiert.
   */
  private refreshIngredientManagement(
    scrollPositions = this.captureScrollPositions(),
  ): void {
    if (!this.library || !this.ingredientManagementEl) {
      return;
    }

    this.renderIngredientManagement(
      this.ingredientManagementEl,
      this.library,
    );

    this.restoreScrollPositions(scrollPositions);
  }

  private refreshIngredientAndAddSections(
    scrollPositions = this.captureScrollPositions(),
  ): void {
    if (
      !this.library ||
      !this.ingredientManagementEl ||
      !this.addIngredientEl
    ) {
      return;
    }

    this.renderIngredientManagement(
      this.ingredientManagementEl,
      this.library,
    );
    this.renderAddIngredient(this.addIngredientEl, this.library);

    this.restoreScrollPositions(scrollPositions);
  }

  private renderLocationManagement(
    parent: HTMLElement,
    library: CookbookLibrary,
  ): void {
    const section = parent.createDiv("cookbook-management-subsection");
    section.createEl("h3", { text: "Einkaufsorte" });

    const list = section.createDiv("cookbook-management-list");

    for (const location of library.shoppingLocations ?? []) {
      const row = list.createDiv("cookbook-management-row");
      row.createEl("strong", { text: location.name });

      const storeCount = (library.markets ?? []).filter(
        (market) => market.locationId === location.id,
      ).length;

      row.createEl("small", {
        text:
          storeCount === 1
            ? "1 Supermarkt"
            : `${storeCount} Supermärkte`,
      });

      const remove = this.createIconButton(
        row,
        "trash-2",
        `${location.name} löschen`,
      );

      remove.disabled = storeCount > 0;
      remove.addEventListener("click", () => {
        if (storeCount > 0) {
          this.plugin.notice(
            "Ein Ort kann erst gelöscht werden, wenn alle zugehörigen Supermärkte entfernt wurden.",
          );
          return;
        }

        library.shoppingLocations = (library.shoppingLocations ?? []).filter(
          (entry) => entry.id !== location.id,
        );

        void this.saveAndRefresh("all");
      });
    }

    const form = section.createDiv("cookbook-management-add-row");
    const nameInput = form.createEl("input", {
      attr: {
        type: "text",
        placeholder: "z. B. Haselünne",
        "aria-label": "Name des Einkaufsorts",
      },
    });

    const addButton = form.createEl("button", {
      text: "Ort hinzufügen",
    });

    addButton.addEventListener("click", () => {
      const name = nameInput.value.trim();

      if (!name) {
        this.plugin.notice("Bitte einen Ortsnamen eingeben.");
        return;
      }

      const locations = library.shoppingLocations ?? [];

      if (
        locations.some(
          (location) => location.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
        )
      ) {
        this.plugin.notice("Dieser Ort ist bereits vorhanden.");
        return;
      }

      locations.push({
        id: createUniqueId(name, locations.map((location) => location.id), "ort"),
        name,
      });

      library.shoppingLocations = locations;
      void this.saveAndRefresh("all");
    });
  }

  private renderMarketManagement(
    parent: HTMLElement,
    library: CookbookLibrary,
  ): void {
    parent.empty();

    const section = parent.createEl("details", {
      cls: [
        "cookbook-ingredient-management-section",
        "cookbook-management-collapsible",
      ],
    });

    section.open = this.marketsExpanded;
    section.addEventListener("toggle", () => {
      this.marketsExpanded = section.open;
    });

    const summary = section.createEl("summary", {
      cls: "cookbook-management-collapsible-summary",
    });

    summary.createEl("h3", { text: "Supermärkte" });
    summary.createSpan({
      cls: "cookbook-management-collapsible-hint",
      text: "Einträge anzeigen oder ausblenden",
    });

    const content = section.createDiv(
      "cookbook-management-collapsible-content",
    );
	
    this.renderLocationManagement(content, library);

    const marketSection = content.createDiv("cookbook-management-subsection");
    marketSection.createEl("h3", { text: "Supermärkte" });

    const locations = library.shoppingLocations ?? [];
    const markets = library.markets ?? [];
    const list = marketSection.createDiv("cookbook-management-list");

    for (const market of markets) {
      const row = list.createDiv("cookbook-management-row");
      const locationName =
        locations.find((location) => location.id === market.locationId)?.name ??
        "Kein Ort";

      row.createEl("strong", { text: market.name });
      row.createEl("small", { text: locationName });

      const remove = this.createIconButton(
        row,
        "trash-2",
        `${market.name} löschen`,
      );

      remove.addEventListener("click", () => {
        library.markets = markets.filter((entry) => entry.id !== market.id);

        for (const ingredient of library.ingredients) {
          if (ingredient.storeIds === undefined) {
            continue;
          }

          ingredient.storeIds = ingredient.storeIds.filter(
            (storeId) => storeId !== market.id,
          );

          if (ingredient.storePackageSizes) {
            delete ingredient.storePackageSizes[market.id];
          }
        }

        if (this.plugin.settings.favoriteStoreId === market.id) {
          this.plugin.settings.favoriteStoreId = undefined;
        }

        void this.saveAndRefresh("all");
      });
    }

    if (locations.length === 0) {
      marketSection.createEl("small", {
        text: "Lege zuerst mindestens einen Einkaufsort an.",
      });
      return;
    }

    const form = marketSection.createDiv("cookbook-management-add-row");
    const nameInput = form.createEl("input", {
      attr: {
        type: "text",
        placeholder: "z. B. ALDI",
        "aria-label": "Name des Supermarkts",
      },
    });

    const locationSelect = form.createEl("select", {
      attr: { "aria-label": "Ort des Supermarkts" },
    });

    for (const location of locations) {
      locationSelect.createEl("option", {
        value: location.id,
        text: location.name,
      });
    }

    const addButton = form.createEl("button", {
      text: "Supermarkt hinzufügen",
    });

    addButton.addEventListener("click", () => {
      const name = nameInput.value.trim();

      if (!name) {
        this.plugin.notice("Bitte einen Supermarktnamen eingeben.");
        return;
      }

      const locationId = locationSelect.value;

      if (
        markets.some(
          (market) =>
            market.locationId === locationId &&
            market.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
        )
      ) {
        this.plugin.notice("Dieser Supermarkt ist an dem Ort bereits vorhanden.");
        return;
      }

      markets.push({
        id: createUniqueId(
          `${locationId}-${name}`,
          markets.map((market) => market.id),
          "markt",
        ),
        name,
        locationId,
      });

      library.markets = markets;
      void this.saveAndRefresh("all");
    });
  }

  private renderIngredientManagement(
    parent: HTMLElement,
    library: CookbookLibrary,
  ): void {
    parent.empty();

    const section = parent.createDiv(
      "cookbook-ingredient-management-section",
    );
    section.createEl("h3", { text: "Zutaten" });

    const markets = library.markets ?? [];
    const list = section.createDiv("cookbook-ingredient-management-list");

    for (const ingredient of [...library.ingredients].sort((a, b) =>
      a.name.localeCompare(b.name, "de"),
    )) {
      const row = list.createDiv("cookbook-ingredient-management-row");
      const expanded = this.expandedIngredientIds.has(ingredient.id);

      const header = row.createDiv({
        cls: "cookbook-ingredient-management-header",
        attr: {
          role: "button",
          tabindex: "0",
          "aria-expanded": String(expanded),
          "aria-label": expanded
            ? `${ingredient.name} einklappen`
            : `${ingredient.name} bearbeiten`,
        },
      });

      header.createEl("strong", { text: ingredient.name });
      header.createEl("small", {
        text: ingredient.defaultUnitPlural
          ? `${ingredient.defaultUnit} / ${ingredient.defaultUnitPlural}`
          : ingredient.defaultUnit,
      });

      const toggleExpanded = (): void => {
        const scrollPositions = this.captureScrollPositions();

        if (this.expandedIngredientIds.has(ingredient.id)) {
          this.expandedIngredientIds.delete(ingredient.id);
        } else {
          this.expandedIngredientIds.add(ingredient.id);
        }

        this.refreshIngredientManagement(scrollPositions);
      };

      header.addEventListener("click", toggleExpanded);
      header.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") {
          return;
        }

        event.preventDefault();
        toggleExpanded();
      });

      if (!expanded) {
        continue;
      }

      this.renderIngredientEditor(row, ingredient, markets);
    }
  }

  private renderIngredientEditor(
    parent: HTMLElement,
    ingredient: IngredientDefinition,
    markets: StoreDefinition[],
  ): void {
    const editor = parent.createDiv("cookbook-ingredient-editor");

    const nameInput = this.createTextField(editor, "Name", ingredient.name);
    const singularInput = this.createTextField(
      editor,
      "Einheit (Singular)",
      ingredient.defaultUnit,
    );
    const pluralInput = this.createTextField(
      editor,
      "Einheit (Plural)",
      ingredient.defaultUnitPlural ?? "",
    );
    const packageInput = this.createTextField(
      editor,
      "Standard-Packungsgrößen",
      (ingredient.packageSizes ?? []).join(", "),
      "z. B. 200, 400, 500",
    );
	
    editor.createEl("small", {
      text:
        "Diese Größen gelten, sofern für einen Supermarkt keine eigene Überschreibung hinterlegt ist.",
    });

    const priorityLabel = editor.createEl("label", {
      cls: "cookbook-ingredient-field",
      text: "Ressourcenpriorität",
    });

    const prioritySelect = priorityLabel.createEl("select");
    const priorities: Array<[ResourcePriority, string]> = [
      ["none", "Keine"],
      ["primary", "Primär"],
      ["secondary", "Sekundär"],
    ];

    for (const [value, label] of priorities) {
      prioritySelect.createEl("option", { value, text: label });
    }

    prioritySelect.value = ingredient.resourcePriority;

    const availability = editor.createDiv("cookbook-ingredient-availability");
    availability.createEl("small", {
      text: "In diesen Supermärkten erhältlich",
    });

    const selectedStoreIds = new Set(
      ingredient.storeIds ?? markets.map((market) => market.id),
    );
	
    const storePackageSizeInputs = new Map<string, HTMLInputElement>();

    for (const market of markets) {
      const label = availability.createEl("label", {
        cls: "cookbook-ingredient-store-option",
      });

      const checkbox = label.createEl("input", {
        attr: {
          type: "checkbox",
          "aria-label": `${ingredient.name} ist bei ${market.name} erhältlich`,
        },
      });

      checkbox.checked = selectedStoreIds.has(market.id);
      label.createSpan({ text: market.name });
	  
      const packageSizeInput = label.createEl("input", {
        cls: "cookbook-ingredient-store-package-sizes",
        attr: {
          type: "text",
          placeholder: "Standard",
          value: (ingredient.storePackageSizes?.[market.id] ?? []).join(", "),
          "aria-label": `Packungsgrößen für ${ingredient.name} bei ${market.name}`,
        },
      });

      packageSizeInput.disabled = !checkbox.checked;
      storePackageSizeInputs.set(market.id, packageSizeInput);

      checkbox.addEventListener("change", () => {
        if (checkbox.checked) {
          selectedStoreIds.add(market.id);
        } else {
          selectedStoreIds.delete(market.id);
        }

        packageSizeInput.disabled = !checkbox.checked;	
      });
    }

    const actions = editor.createDiv("cookbook-ingredient-editor-actions");

    const saveButton = actions.createEl("button", {
      text: "Zutat speichern",
      cls: "mod-cta",
    });

    saveButton.addEventListener("click", () => {
      const name = nameInput.value.trim();
      const defaultUnit = singularInput.value.trim();
      const defaultUnitPlural = pluralInput.value.trim();
      const packageSizes = parsePackageSizes(packageInput.value);

      if (!name || !defaultUnit) {
        this.plugin.notice("Name und Einheit sind Pflichtfelder.");
        return;
      }

      if (packageSizes === null) {
        this.plugin.notice(
          "Packungsgrößen müssen positive Zahlen sein, getrennt durch Kommas.",
        );
        return;
      }
	  
      const storePackageSizes: Record<string, number[]> = {};

      for (const market of markets) {
        if (!selectedStoreIds.has(market.id)) {
          continue;
        }

        const input = storePackageSizeInputs.get(market.id);
        const sizes = parsePackageSizes(input?.value ?? "");

        if (sizes === null) {
          this.plugin.notice(
            `Ungültige Packungsgrößen für ${market.name}.`,
          );
          return;
        }

        if (sizes.length > 0) {
          storePackageSizes[market.id] = sizes;
        }
      }

      ingredient.name = name;
      ingredient.defaultUnit = defaultUnit;
      ingredient.defaultUnitPlural = defaultUnitPlural || undefined;
      ingredient.resourcePriority = prioritySelect.value as ResourcePriority;
      ingredient.packageSizes =
        packageSizes.length > 0 ? packageSizes : undefined;
		
      ingredient.storePackageSizes =
        Object.keys(storePackageSizes).length > 0
          ? storePackageSizes
          : undefined;

      /**
       * [] bedeutet absichtlich: keinem Markt zugeordnet.
       * undefined bedeutet: in allen Märkten erhältlich.
       * Nach einer expliziten Checkbox-Auswahl speichern wir immer [] bzw. IDs.
       */
      ingredient.storeIds = [...selectedStoreIds];

      void this.saveAndRefresh("ingredients");
    });

    const deleteButton = actions.createEl("button", {
      text: "Zutat löschen",
      cls: "mod-warning",
    });

    deleteButton.addEventListener("click", () => {
      if (this.isIngredientUsed(ingredient.id)) {
        this.plugin.notice(
          "Diese Zutat wird noch von mindestens einem Rezept verwendet und kann nicht gelöscht werden.",
        );
        return;
      }

      if (!this.library) {
        return;
      }

      this.library.ingredients = this.library.ingredients.filter(
        (entry) => entry.id !== ingredient.id,
      );

      void this.saveAndRefresh("ingredients");
    });
  }

  private renderAddIngredient(
    parent: HTMLElement,
    library: CookbookLibrary,
  ): void {
    parent.empty();

    const section = parent.createDiv(
      "cookbook-ingredient-management-section",
    );
    section.createEl("h3", { text: "Neue Zutat" });

    const form = section.createDiv("cookbook-ingredient-add-form");
    const nameInput = this.createTextField(form, "Name", "");
    const unitInput = this.createTextField(form, "Einheit", "");
    const pluralInput = this.createTextField(form, "Plural", "");

    const addButton = form.createEl("button", {
      text: "Zutat hinzufügen",
      cls: "mod-cta",
    });

    addButton.addEventListener("click", () => {
      const name = nameInput.value.trim();
      const defaultUnit = unitInput.value.trim();
      const defaultUnitPlural = pluralInput.value.trim();

      if (!name || !defaultUnit) {
        this.plugin.notice("Name und Einheit sind Pflichtfelder.");
        return;
      }

      const id = createUniqueId(
        name,
        library.ingredients.map((ingredient) => ingredient.id),
        "zutat",
      );

      library.ingredients.push({
        id,
        name,
        defaultUnit,
        defaultUnitPlural: defaultUnitPlural || undefined,
        resourcePriority: "none",
        storeIds: [],
      });

      this.expandedIngredientIds.add(id);
      void this.saveAndRefresh("ingredients-and-add");
    });
  }

  private createTextField(
    parent: HTMLElement,
    labelText: string,
    value: string,
    placeholder?: string,
  ): HTMLInputElement {
    const label = parent.createEl("label", {
      cls: "cookbook-ingredient-field",
      text: labelText,
    });

    return label.createEl("input", {
      attr: {
        type: "text",
        value,
        placeholder: placeholder ?? "",
      },
    });
  }

  private isIngredientUsed(ingredientId: string): boolean {
    return this.recipes.some(
      (recipe) =>
        recipe.ingredients.some(
          (ingredient) =>
            ingredient.ingredientId === ingredientId ||
            ingredient.alternativeIngredientId === ingredientId,
        ) ||
        recipe.steps.some((step) =>
          step.ingredients.some(
            (ingredient) =>
              ingredient.ingredientId === ingredientId ||
              ingredient.alternativeIngredientId === ingredientId,
          ),
        ),
    );
  }

  private async saveAndRefresh(
    scope: "all" | "ingredients" | "ingredients-and-add",
  ): Promise<void> {
    if (!this.library) {
      return;
    }
	
    const scrollPositions = this.captureScrollPositions();

    await this.plugin.saveLibrary(this.library);
    await this.plugin.saveSettings();
    this.onChanged();

    if (scope === "all") {
      this.refreshAllSections();
      this.restoreScrollPositions(scrollPositions);
      return;
    }

    if (scope === "ingredients") {
      this.refreshIngredientManagement(scrollPositions);
      return;
    }

    this.refreshIngredientAndAddSections(scrollPositions);
  }
  
  private captureScrollPositions(): ScrollPosition[] {
    const positions: ScrollPosition[] = [];
    let element: HTMLElement | null = this.contentEl;

    while (element) {
      positions.push({
        element,
        top: element.scrollTop,
        left: element.scrollLeft,
      });

      if (element.classList.contains("modal")) {
        break;
      }

      element = element.parentElement;
    }

    return positions;
  }

  private restoreScrollPositions(positions: ScrollPosition[]): void {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        for (const { element, top, left } of positions) {
          element.scrollTop = top;
          element.scrollLeft = left;
        }
      });
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

function parsePackageSizes(value: string): number[] | null {
  if (!value.trim()) {
    return [];
  }

  const parsed = value
    .split(",")
    .map((entry) => Number(entry.trim()))
    .filter((entry) => Number.isFinite(entry));

  if (parsed.length === 0 || parsed.some((entry) => entry <= 0)) {
    return null;
  }

  return [...new Set(parsed)].sort((a, b) => a - b);
}

function createUniqueId(
  value: string,
  usedValues: string[],
  fallback: string,
): string {
  const base =
    value
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLocaleLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || fallback;

  const used = new Set(usedValues);

  if (!used.has(base)) {
    return base;
  }

  let suffix = 2;

  while (used.has(`${base}-${suffix}`)) {
    suffix += 1;
  }

  return `${base}-${suffix}`;
}
import { App, Modal, setIcon } from "obsidian";
import type CookbookPlugin from "./main";
import type { CookbookLibrary, CookbookPerson } from "./types";

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
      this.contentEl.createEl("h2", { text: "Guests" });
      this.contentEl.createEl("p", {
        text:
          error instanceof Error
            ? error.message
            : "The cookbook library could not be loaded.",
      });
      return;
    }

    this.contentEl.createEl("h2", { text: "Manage guests" });
    this.contentEl.createEl("p", {
      cls: "setting-item-description",
      text:
        "Add guests, choose a square vault image and change the order of guest buttons.",
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

      const preview = row.createDiv("cookbook-guest-settings-preview");
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

      const details = row.createDiv("cookbook-guest-settings-details");
      details.createEl("strong", { text: person.name });
      details.createDiv({
        cls: "setting-item-description",
        text: `${formatNumber(person.eaterWeight)} eater units`,
      });
	  
	  this.renderAllergenControls(details, person, library);

      const imageSelect = row.createEl("select", {
        cls: "cookbook-guest-settings-image-select",
        attr: {
          "aria-label": `Image for ${person.name}`,
        },
      });

      imageSelect.createEl("option", {
        text: "No configured image",
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

      const moveUp = this.createIconButton(
        row,
        "chevron-up",
        `Move ${person.name} up`,
      );
      moveUp.disabled = this.plugin.getGuestButtonIndex(person.id) === 0;

      moveUp.addEventListener("click", () => {
        void this.moveGuest(person.id, -1);
      });

      const moveDown = this.createIconButton(
        row,
        "chevron-down",
        `Move ${person.name} down`,
      );
      moveDown.disabled =
        this.plugin.getGuestButtonIndex(person.id) >=
        this.plugin.settings.guestButtons.length - 1;

      moveDown.addEventListener("click", () => {
        void this.moveGuest(person.id, 1);
      });
    }
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
    controls.createEl("small", {
      text: "Unverträglichkeiten / Allergien",
    });

    const selectedIds = new Set(person.intoleranceAllergenIds ?? []);

    for (const allergen of allergens) {
      const label = controls.createEl("label", {
        cls: "cookbook-guest-allergen-option",
      });

      const input = label.createEl("input", {
        attr: {
          type: "checkbox",
          "aria-label": `${allergen.name} wird von ${person.name} nicht vertragen`,
        },
      });

      input.checked = selectedIds.has(allergen.id);
      label.appendText(` ${allergen.name}`);

      input.addEventListener("change", () => {
        void this.updateGuestAllergen(
          person,
          allergen.id,
          input.checked,
        );
      });
    }
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

    if (!this.library) {
      return;
    }

    await this.plugin.saveLibrary(this.library);
    this.onChanged();
  }

  private renderAddGuestForm(library: CookbookLibrary): void {
    const section = this.contentEl.createDiv("cookbook-add-guest");
    section.createEl("h3", { text: "Add guest" });

    const fields = section.createDiv("cookbook-add-guest-fields");

    const nameInput = fields.createEl("input", {
      attr: {
        type: "text",
        placeholder: "Name",
        "aria-label": "Guest name",
      },
    });

    const eaterWeightInput = fields.createEl("input", {
      attr: {
        type: "number",
        min: "0.1",
        step: "0.1",
        value: "1",
        "aria-label": "Eater units",
      },
    });

    const colorInput = fields.createEl("input", {
      attr: {
        type: "color",
        value: getNextGuestColor(library.people),
        "aria-label": "Guest color",
      },
    });

    const addButton = fields.createEl("button", {
      text: "Add guest",
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
      this.plugin.notice("Please enter a guest name.");
      return;
    }

    if (!Number.isFinite(eaterWeight) || eaterWeight <= 0) {
      this.plugin.notice("Eater units must be greater than zero.");
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

    await this.plugin.saveLibrary(this.library);
    this.plugin.notice(`Guest "${name}" was added.`);
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

function formatNumber(value: number): string {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 1,
  }).format(value);
}
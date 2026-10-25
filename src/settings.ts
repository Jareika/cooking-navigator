import {
  App,
  PluginSettingTab,
  TFile,
  type SettingDefinitionItem,
} from "obsidian";
import type CookbookPlugin from "./main";

export class CookbookSettingTab extends PluginSettingTab {
  constructor(
    app: App,
    private readonly plugin: CookbookPlugin,
  ) {
    super(app, plugin);
  }

  getControlValue(key: string): unknown {
    return getPath(
      this.plugin.settings as unknown as Record<string, unknown>,
      key,
    );
  }

  async setControlValue(key: string, value: unknown): Promise<void> {
    setPath(
      this.plugin.settings as unknown as Record<string, unknown>,
      key,
      value,
    );

    await this.plugin.saveSettings();

    if (key === "databaseFolder") {
      await this.plugin.refreshCategoryButtons();
    }
  }

  getSettingDefinitions(): SettingDefinitionItem<string>[] {
    const favoriteStoreOptions: Record<string, string> = {
      "": "Kein Favorit",
    };

    for (const market of this.plugin.getKnownMarkets(
      this.plugin.settings.shoppingLocationId,
    )) {
      favoriteStoreOptions[market.id] = market.name;
    }

    return [
      {
        name: "Cookbook folder",
        desc: "Folder containing cookbook-library.json and one or more recipes-*.json files.",
        control: {
          type: "folder" as const,
          key: "databaseFolder",
          includeRoot: true,
          validate: (value: string) =>
            value.trim().length > 0 ? undefined : "Please choose a folder.",
        },
      },
      {
        name: "Default recipe file",
        desc: "File created when generating the example database.",
        control: {
          type: "text" as const,
          key: "defaultRecipeFile",
          placeholder: "recipes-main.json",
          validate: (value: string) =>
            /^recipes-[a-z0-9-]+\.json$/i.test(value.trim())
              ? undefined
              : 'Use a name such as "recipes-main.json".',
        },
      },
      {
        name: "Create JSON backups",
        desc:
          "Erstellt rotierende Sicherungen für JSON-Dateien, die vom Plugin geschrieben werden. Fehlende Bibliotheken können aus der neuesten gültigen Sicherung wiederhergestellt werden.",
        control: {
          type: "toggle" as const,
          key: "enableJsonBackups",
        },
      },
      {
        name: "Anzahl der JSON-Sicherungen",
        desc:
          "Bei 2 Sicherungen werden die vorherigen Dateistände behalten. Ab 3 Sicherungen wird zusätzlich der aktuell gespeicherte Stand gesichert.",
        control: {
          type: "slider" as const,
          key: "jsonBackupCount",
          min: 2,
          max: 5,
          step: 1,
          disabled: () => !this.plugin.settings.enableJsonBackups,
        },
      },
      {
        name: "Cookbook backup folder",
        desc:
          "Folder for rotating JSON backups. The recommended default is a Backups folder inside the Cookbook folder.",
        control: {
          type: "folder" as const,
          key: "backupFolder",
          includeRoot: true,
          validate: (value: string) =>
            value.trim().length > 0
              ? undefined
              : "Please choose a backup folder.",
        },
      },
      {
        name: "Show package suggestions",
        desc: "Show the critical package amount that changed the final recipe scale.",
        control: {
          type: "toggle" as const,
          key: "showPackageSuggestions",
        },
      },
      {
        name: "Show allergen notices",
        desc:
          "Show declared allergens such as gluten, lactose, or egg below ingredients in cooking mode.",
        control: {
          type: "toggle" as const,
          key: "showIngredientAllergens",
        },
      },
      {
        name: "Keep cooking swipes inside Cookbook",
        desc: "Prevents horizontal swipes in cooking mode from opening Obsidian side panes on touch devices.",
        control: {
          type: "toggle" as const,
          key: "preventSidePaneSwipes",
        },
      },
      {
        type: "group" as const,
        heading: "Koch-Timer",
        items: [
          {
            name: "Klingelton",
            desc:
              "Optionale Sounddatei aus dem Vault. Sie wird abgespielt, wenn ein Koch-Timer abläuft.",
            control: {
              type: "file" as const,
              key: "timerAlarmSoundPath",
              placeholder: "Sounddatei auswählen…",
              filter: isAudioFile,
            },
          },
          {
            name: "Timer-Lautstärke",
            desc:
              "Lautstärke des Klingeltons. Bei gesperrten Mobilgeräten kann die Wiedergabe systembedingt eingeschränkt sein.",
            control: {
              type: "slider" as const,
              key: "timerAlarmVolume",
              min: 0,
              max: 1,
              step: 0.05,
            },
          },
        ],
      },
      {
        name: "Image for “All recipes” button",
        desc:
          "Optionally select a square vault image for the first category button in the recipe browser.",
        control: {
          type: "file" as const,
          key: "allRecipesButtonImagePath",
          placeholder: "Choose image…",
          filter: isImageFile,
        },
      },
      {
        type: "group" as const,
        heading: "Einkaufsliste",
        items: [
          {
            name: "Marktstrategie",
            desc:
              "Legt fest, ob der Favoritenmarkt bevorzugt, die kleinste Markt-Kombination gesucht oder Märkte direkt je Zutat angezeigt werden.",
            control: {
              type: "dropdown" as const,
              key: "shoppingStoreMode",
              options: {
                "favorite-first": "Favoritenmarkt zuerst",
                "fewest-stores": "Möglichst wenige Märkte",
                "ingredient-stores": "Märkte je Zutat anzeigen",
              },
            },
          },
          {
            name: "Bevorzugter Markt",
            desc:
              "Wird im Modus „Favoritenmarkt zuerst“ verwendet und bei gleich guten Markt-Kombinationen bevorzugt.",
            control: {
              type: "dropdown" as const,
              key: "favoriteStoreId",
              options: favoriteStoreOptions,
            },
          },
          {
            name: "Zutaten, Orte und Märkte verwalten",
            desc:
              "Verwaltet Zutaten, Packungsgrößen, Einkaufsorte, Supermärkte und die Marktverfügbarkeit einzelner Zutaten.",
            action: () => {
              this.plugin.openIngredientManagement(() => {
                void this.plugin.refreshCategoryButtons();
              });
            },
          },
          {
            name: "Empfänger für Einkaufslisten",
            desc:
              "Optional. Der Versand öffnet eine vorbereitete E-Mail in der Standard-Mail-App; das Plugin versendet keine E-Mails selbst.",
            control: {
              type: "text" as const,
              key: "shoppingListEmailRecipient",
              placeholder: "name@example.com",
              validate: (value: string) =>
                value.trim() === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
                  ? undefined
                  : "Bitte eine gültige E-Mail-Adresse eingeben.",
            },
          },
        ],
      },
      {
        type: "list" as const,
        heading: "Category buttons",
        emptyState:
          "No categories found yet. Create or select a cookbook database first.",
        onReorder: (oldIndex: number, newIndex: number) => {
          void this.reorderCategoryButtons(oldIndex, newIndex);
        },
        items: this.plugin.getOrderedCategories().map(
          ({ category }, index) => ({
            name: category.name,
            desc:
              "Drag this row to change the browser order. Optionally select a square category image from the vault.",
            searchable: false,
            control: {
              type: "file" as const,
              key: `categoryButtons.${index}.imagePath`,
              placeholder: "Choose category image…",
              filter: isImageFile,
            },
          }),
        ),
      },
      {
        type: "group" as const,
        heading: "Database",
        items: [
          {
            name: "Create example database",
            desc: "Creates example JSON files if they do not exist yet.",
            action: () => {
              void this.createExampleDatabase();
            },
          },
          {
            name: "Open cookbook",
            desc: "Reload the JSON database and open the recipe browser.",
            action: () => {
              void this.plugin.openCookbook();
            },
          },
        ],
      },
    ];
  }

  private async reorderCategoryButtons(
    oldIndex: number,
    newIndex: number,
  ): Promise<void> {
    const [moved] = this.plugin.settings.categoryButtons.splice(oldIndex, 1);

    if (!moved) {
      return;
    }

    this.plugin.settings.categoryButtons.splice(newIndex, 0, moved);
    await this.plugin.saveSettings();
  }

  private async createExampleDatabase(): Promise<void> {
    await this.plugin.createExampleDatabase();
    this.plugin.notice("Example cookbook database created.");
  }
}

function isImageFile(file: TFile): boolean {
  return [
    "avif",
    "gif",
    "jpeg",
    "jpg",
    "png",
    "svg",
    "webp",
  ].includes(file.extension.toLocaleLowerCase());
}

function isAudioFile(file: TFile): boolean {
  return [
    "aac",
    "flac",
    "m4a",
    "mp3",
    "oga",
    "ogg",
    "opus",
    "wav",
    "weba",
    "webm",
  ].includes(file.extension.toLocaleLowerCase());
}

function getPath(object: Record<string, unknown>, path: string): unknown {
  let current: unknown = object;

  for (const part of path.split(".")) {
    if (!current || typeof current !== "object") {
      return undefined;
    }

    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

function setPath(
  object: Record<string, unknown>,
  path: string,
  value: unknown,
): void {
  const parts = path.split(".");
  const lastPart = parts.pop();

  if (!lastPart) {
    return;
  }

  let current = object;

  for (const part of parts) {
    const next = current[part];

    if (!next || typeof next !== "object") {
      current[part] = {};
    }

    current = current[part] as Record<string, unknown>;
  }

  current[lastPart] = value;
}
import { App, PluginSettingTab, TFile } from "obsidian";
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

  getSettingDefinitions() {
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
        type: "list" as const,
        heading: "Category buttons",
        emptyState:
          "No categories found yet. Create or select a cookbook database first.",
        onReorder: async (oldIndex: number, newIndex: number) => {
          const [moved] = this.plugin.settings.categoryButtons.splice(
            oldIndex,
            1,
          );

          if (!moved) {
            return;
          }

          this.plugin.settings.categoryButtons.splice(newIndex, 0, moved);
          await this.plugin.saveSettings();
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
            action: async () => {
              await this.plugin.createExampleDatabase();
              this.plugin.notice("Example cookbook database created.");
            },
          },
          {
            name: "Open cookbook",
            desc: "Reload the JSON database and open the recipe browser.",
            action: async () => {
              await this.plugin.openCookbook();
            },
          },
        ],
      },
    ];
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
import {
  App,
  PluginSettingTab,
  TFile,
  type SettingDefinitionItem,
} from "obsidian";
import type CookbookPlugin from "./main";
import { t } from "./i18n";

export class CookbookSettingTab extends PluginSettingTab {
  private static readonly categoryButtonImageKeyPrefix =
    "categoryButtonImage.";

  constructor(
    app: App,
    private readonly plugin: CookbookPlugin,
  ) {
    super(app, plugin);
  }

  getControlValue(key: string): unknown {
    const categoryId = this.getCategoryButtonImageCategoryId(key);

    if (categoryId !== undefined) {
      return this.plugin.settings.categoryButtons.find(
        (button) => button.categoryId === categoryId,
      )?.imagePath;
    }

    return getPath(
      this.plugin.settings as unknown as Record<string, unknown>,
      key,
    );
  }

  async setControlValue(key: string, value: unknown): Promise<void> {
    const categoryId = this.getCategoryButtonImageCategoryId(key);

    if (categoryId !== undefined) {
      const button = this.plugin.settings.categoryButtons.find(
        (entry) => entry.categoryId === categoryId,
      );

      if (button) {
        button.imagePath =
          typeof value === "string" && value.trim().length > 0
            ? value
            : undefined;
      }

      await this.plugin.saveSettings();
      return;
    }

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
  
  private getCategoryButtonImageCategoryId(
    key: string,
  ): string | undefined {
    if (!key.startsWith(CookbookSettingTab.categoryButtonImageKeyPrefix)) {
      return undefined;
    }

    return decodeURIComponent(
      key.slice(CookbookSettingTab.categoryButtonImageKeyPrefix.length),
    );
  }

  getSettingDefinitions(): SettingDefinitionItem<string>[] {
    const favoriteStoreSettings = this.plugin
      .getKnownShoppingLocations()
      .map((location) => {
        const options: Record<string, string> = {
          "": t("settings.shopping.noFavoriteStore"),
        };

        for (const market of this.plugin.getKnownMarkets(location.id)) {
          options[market.id] = market.name;
        }

        return {
          name: location.name,
          desc: t("settings.shopping.favoriteStoreForLocation", {
            location: location.name,
          }),
          control: {
            type: "dropdown" as const,
            key: `favoriteStoreIdsByLocation.${location.id}`,
            options,
          },
        };
      });

    return [
      {
        name: t("settings.database.folder.name"),
        desc: t("settings.database.folder.description"),
        control: {
          type: "folder" as const,
          key: "databaseFolder",
          includeRoot: true,
          validate: (value: string) =>
            value.trim().length > 0
              ? undefined
              : t("settings.validation.folderRequired"),
        },
      },
      {
        name: t("settings.database.defaultRecipeFile.name"),
        desc: t("settings.database.defaultRecipeFile.description"),
        control: {
          type: "text" as const,
          key: "defaultRecipeFile",
          placeholder: t("settings.database.defaultRecipeFile.placeholder"),
          validate: (value: string) =>
            /^recipes-[a-z0-9-]+\.json$/i.test(value.trim())
              ? undefined
              : t("settings.validation.defaultRecipeFile"),
        },
      },
      {
        name: t("settings.database.enableJsonBackups.name"),
        desc: t("settings.database.enableJsonBackups.description"),
        control: {
          type: "toggle" as const,
          key: "enableJsonBackups",
        },
      },
      {
        name: t("settings.database.jsonBackupCount.name"),
        desc: t("settings.database.jsonBackupCount.description"),
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
        name: t("settings.database.backupFolder.name"),
        desc: t("settings.database.backupFolder.description"),
        control: {
          type: "folder" as const,
          key: "backupFolder",
          includeRoot: true,
          validate: (value: string) =>
            value.trim().length > 0
              ? undefined
              : t("settings.validation.backupFolderRequired"),
        },
      },
      {
        name: t("settings.cooking.showPackageSuggestions.name"),
        desc: t("settings.cooking.showPackageSuggestions.description"),
        control: {
          type: "toggle" as const,
          key: "showPackageSuggestions",
        },
      },
      {
        name: t("settings.cooking.showIngredientAllergens.name"),
        desc: t("settings.cooking.showIngredientAllergens.description"),
        control: {
          type: "toggle" as const,
          key: "showIngredientAllergens",
        },
      },
      {
        name: t("settings.cooking.preventSidePaneSwipes.name"),
        desc: t("settings.cooking.preventSidePaneSwipes.description"),
        control: {
          type: "toggle" as const,
          key: "preventSidePaneSwipes",
        },
      },
      {
        type: "group" as const,
        heading: t("settings.timer.heading"),
        items: [
          {
            name: t("settings.timer.alarmSound.name"),
            desc: t("settings.timer.alarmSound.description"),
            control: {
              type: "file" as const,
              key: "timerAlarmSoundPath",
              placeholder: t("settings.timer.alarmSound.placeholder"),
              filter: isAudioFile,
            },
          },
          {
            name: t("settings.timer.alarmVolume.name"),
            desc: t("settings.timer.alarmVolume.description"),
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
        name: t("settings.browser.allRecipesImage.name"),
        desc: t("settings.browser.allRecipesImage.description"),
        control: {
          type: "file" as const,
          key: "allRecipesButtonImagePath",
          placeholder: t("settings.browser.allRecipesImage.placeholder"),
          filter: isImageFile,
        },
      },
      {
        type: "group" as const,
        heading: t("settings.shopping.heading"),
        items: [
          {
            name: t("settings.shopping.storeMode.name"),
            desc: t("settings.shopping.storeMode.description"),
            control: {
              type: "dropdown" as const,
              key: "shoppingStoreMode",
              options: {
                "favorite-first": t("settings.shopping.storeMode.favoriteFirst"),
                "fewest-stores": t("settings.shopping.storeMode.fewestStores"),
                "ingredient-stores": t("settings.shopping.storeMode.ingredientStores"),
              },
            },
          },
          ...favoriteStoreSettings,
          {
            name: t("settings.shopping.manageIngredients.name"),
            desc: t("settings.shopping.manageIngredients.description"),
            action: () => {
              this.plugin.openIngredientManagement(() => {
                void this.plugin.refreshCategoryButtons();
              });
            },
          },
          {
            name: t("settings.shopping.emailRecipient.name"),
            desc: t("settings.shopping.emailRecipient.description"),
            control: {
              type: "text" as const,
              key: "shoppingListEmailRecipient",
              placeholder: t("settings.shopping.emailRecipient.placeholder"),
              validate: (value: string) =>
                value.trim() === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
                  ? undefined
                  : t("settings.validation.email"),
            },
          },
        ],
      },
      {
        type: "list" as const,
        heading: t("settings.categoryButtons.heading"),
        emptyState: t("settings.categoryButtons.emptyState"),
        onReorder: (oldIndex: number, newIndex: number) => {
          void this.reorderCategoryButtons(oldIndex, newIndex);
        },
        items: this.plugin.getOrderedCategories().map(
          ({ category }) => ({
            name: category.name,
            desc: t("settings.categoryButtons.description"),
            searchable: false,
            control: {
              type: "file" as const,
              key:
                `${CookbookSettingTab.categoryButtonImageKeyPrefix}` +
                encodeURIComponent(category.id),
              placeholder: t("settings.categoryButtons.imagePlaceholder"),
              filter: isImageFile,
            },
          }),
        ),
      },
      {
        name: t("settings.browser.allRecipesButtonPlacement.name"),
        desc: t("settings.browser.allRecipesButtonPlacement.description"),
        control: {
          type: "dropdown" as const,
          key: "allRecipesButtonPlacement",
          options: {
            start: t(
              "settings.browser.allRecipesButtonPlacement.start",
            ),
            end: t(
              "settings.browser.allRecipesButtonPlacement.end",
            ),
            hidden: t(
              "settings.browser.allRecipesButtonPlacement.hidden",
            ),
          },
        },
      },
      {
        type: "group" as const,
        heading: t("settings.database.actionsHeading"),
        items: [
          {
            name: t("settings.database.createExample.name"),
            desc: t("settings.database.createExample.description"),
            action: () => {
              void this.createExampleDatabase();
            },
          },
          {
            name: t("settings.database.openCookbook.name"),
            desc: t("settings.database.openCookbook.description"),
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
    this.plugin.notice(t("settings.notices.exampleDatabaseCreated"));
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
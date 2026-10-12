import { normalizePath, TFile, Vault } from "obsidian";
import type {
  CookbookLibrary,
  CookbookSettings,
  Recipe,
  RecipeDocument,
} from "./types";

const LIBRARY_FILE = "cookbook-library.json";
const RECIPE_FILE_PREFIX = "recipes-";

export class CookbookDatabase {
  constructor(
    private readonly vault: Vault,
    private readonly getSettings: () => CookbookSettings,
  ) {}

  get folder(): string {
    return normalizePath(this.getSettings().databaseFolder);
  }

  get libraryPath(): string {
    return normalizePath(`${this.folder}/${LIBRARY_FILE}`);
  }

  async ensureFolder(): Promise<void> {
    const adapter = this.vault.adapter;

    if (!(await adapter.exists(this.folder))) {
      await adapter.mkdir(this.folder);
    }
  }

  async loadLibrary(): Promise<CookbookLibrary> {
    await this.ensureFolder();

    const file = this.vault.getAbstractFileByPath(this.libraryPath);

    if (!(file instanceof TFile)) {
      throw new Error(
        `Cookbook library not found. Create "${this.libraryPath}" first.`,
      );
    }

    return JSON.parse(await this.vault.read(file)) as CookbookLibrary;
  }

  async saveLibrary(library: CookbookLibrary): Promise<void> {
    await this.ensureFolder();
    await this.writeJson(this.libraryPath, library);
  }

  async loadRecipes(): Promise<Recipe[]> {
    await this.ensureFolder();

    const prefix = normalizePath(`${this.folder}/${RECIPE_FILE_PREFIX}`);

    const recipeFiles = this.vault
      .getFiles()
      .filter(
        (file) =>
          file.path.startsWith(prefix) &&
          file.extension.toLocaleLowerCase() === "json",
      )
      .sort((a, b) => a.path.localeCompare(b.path));

    const documents = await Promise.all(
      recipeFiles.map(async (file) => {
        const content = await this.vault.read(file);
        return JSON.parse(content) as RecipeDocument;
      }),
    );

    return documents.flatMap((document) => document.recipes);
  }

  async createExampleDatabase(
    library: CookbookLibrary,
    recipes: RecipeDocument,
  ): Promise<void> {
    await this.ensureFolder();

    if (!(await this.vault.adapter.exists(this.libraryPath))) {
      await this.writeJson(this.libraryPath, library);
    }

    const recipePath = normalizePath(
      `${this.folder}/${this.getSettings().defaultRecipeFile}`,
    );

    if (!(await this.vault.adapter.exists(recipePath))) {
      await this.writeJson(recipePath, recipes);
    }
  }

  private async writeJson(path: string, value: unknown): Promise<void> {
    await this.vault.adapter.write(path, JSON.stringify(value, null, 2));
  }
}
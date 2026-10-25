import { normalizePath, Vault } from "obsidian";
import type {
  CookbookLibrary,
  CookbookSettings,
  Recipe,
  RecipeDocument,
} from "./types";

const LIBRARY_FILE = "cookbook-library.json";
const RECIPE_FILE_PREFIX = "recipes-";
const MIN_BACKUP_SLOT_COUNT = 2;
const MAX_BACKUP_SLOT_COUNT = 5;

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
  
  get backupFolder(): string {
    return normalizePath(this.getSettings().backupFolder);
  }

  async ensureFolder(): Promise<void> {
    const adapter = this.vault.adapter;

    if (!(await adapter.exists(this.folder))) {
      await adapter.mkdir(this.folder);
    }
  }

  async loadLibrary(): Promise<CookbookLibrary> {
    await this.ensureFolder();

    const content = await this.readJsonFile(this.libraryPath);

    if (content === null) {
      throw new Error(
        `Cookbook library "${this.libraryPath}" was not found. ` +
          "It was not restored automatically to avoid overwriting data during vault startup.",
      );
    }

    return JSON.parse(content) as CookbookLibrary;
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
        const content = await this.readJsonFile(file.path);

        if (content === null) {
          throw new Error(
            `Recipe file "${file.path}" could not be restored.`,
          );
        }

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

  /**
   * Fügt ein neu erstelltes Rezept zur konfigurierten Standard-Rezeptdatei
   * hinzu. Existiert diese Datei noch nicht, wird sie als gültiges
   * RecipeDocument angelegt.
   */
  async createRecipe(recipe: Recipe): Promise<void> {
    await this.ensureFolder();

    const recipePath = normalizePath(
      `${this.folder}/${this.getSettings().defaultRecipeFile}`,
    );

    const content = await this.readJsonFile(recipePath);
    const document =
      content === null
        ? ({
            version: 1,
            recipes: [],
          } satisfies RecipeDocument)
        : (JSON.parse(content) as RecipeDocument);

    if (document.recipes.some((entry) => entry.id === recipe.id)) {
      throw new Error(
        `A recipe with the ID "${recipe.id}" already exists in "${recipePath}".`,
      );
    }

    document.recipes.push(recipe);
    await this.writeJson(recipePath, document);
  }

  private async writeJson(path: string, value: unknown): Promise<void> {
    const nextContent = JSON.stringify(value, null, 2);

    JSON.parse(nextContent);

    await this.backupCurrentFile(path);

    await this.vault.adapter.write(path, nextContent);

    /**
     * Ab drei Sicherungen wird zusätzlich der gerade erfolgreich geschriebene
     * Zustand gesichert. Bei zwei Slots bleibt das bisherige Verhalten:
     * Es existieren ausschließlich vorherige Dateistände als Sicherung.
     */
    if (
      this.getSettings().enableJsonBackups &&
      this.backupSlotCount >= 3
    ) {
      await this.backupContent(path, nextContent);
    }
  }

  private async readJsonFile(path: string): Promise<string | null> {
    const adapter = this.vault.adapter;

    if (!(await adapter.exists(path))) {
      return null;
    }

    return adapter.read(path);
  }

  async restoreLibraryFromBackup(): Promise<boolean> {
    await this.ensureFolder();
    return this.restoreNewestBackup(this.libraryPath, true);
  }

  private async backupCurrentFile(originalPath: string): Promise<void> {
    if (!this.getSettings().enableJsonBackups) {
      return;
    }
	
    const adapter = this.vault.adapter;

    if (!(await adapter.exists(originalPath))) {
      return;
    }

    const currentContent = await adapter.read(originalPath);

    JSON.parse(currentContent);

    await this.backupContent(originalPath, currentContent);
  }

  /**
   * Speichert einen JSON-Stand in einem rotierenden Backup-Slot.
   *
   * Wenn der neueste gültige Slot bereits exakt denselben Inhalt enthält,
   * wird kein Duplikat angelegt. Das verhindert insbesondere bei drei oder
   * mehr Slots doppelte Einträge: Der vorherige aktuelle Stand wurde bereits
   * nach seinem letzten Speichervorgang gesichert.
   */
  private async backupContent(
    originalPath: string,
    content: string,
  ): Promise<void> {
    JSON.parse(content);

    await this.ensureBackupFolder();

    const newestBackup = await this.getNewestValidBackup(originalPath);

    if (newestBackup?.content === content) {
      return;
    }

    const targetPath = await this.getOldestBackupPath(originalPath);
    await this.vault.adapter.write(targetPath, content);
  }

  private async restoreNewestBackup(
    originalPath: string,
    explicitlyRequested = false,
  ): Promise<boolean> {
    if (
      !explicitlyRequested &&
      !this.getSettings().enableJsonBackups
    ) {
		
      return false;
    }

    const backup = await this.getNewestValidBackup(originalPath);

    if (!backup) {
      return false;
    }

    await this.vault.adapter.write(originalPath, backup.content);
    return true;
  }

  private async ensureBackupFolder(): Promise<void> {
    const adapter = this.vault.adapter;

    if (!(await adapter.exists(this.backupFolder))) {
      await adapter.mkdir(this.backupFolder);
    }
  }

  private getBackupPaths(originalPath: string): string[] {
    const fileName = originalPath.split("/").pop();

    if (!fileName) {
      throw new Error(`Could not determine file name for "${originalPath}".`);
    }

    return Array.from(
      { length: this.backupSlotCount },
      (_, index) =>
        normalizePath(
          `${this.backupFolder}/${fileName}.backup-${index + 1}.json`,
        ),
    );
  }
  
  /**
   * Settings können auch durch alte oder manuell bearbeitete Daten ungültige
   * Werte enthalten. Die Datenbank erzwingt daher unabhängig vom UI immer
   * den erlaubten Bereich von zwei bis fünf Sicherungen.
   */
  private get backupSlotCount(): number {
    const configuredCount = this.getSettings().jsonBackupCount;

    if (!Number.isFinite(configuredCount)) {
      return MIN_BACKUP_SLOT_COUNT;
    }

    return Math.max(
      MIN_BACKUP_SLOT_COUNT,
      Math.min(
        MAX_BACKUP_SLOT_COUNT,
        Math.round(configuredCount),
      ),
    );
  }

  private async getOldestBackupPath(originalPath: string): Promise<string> {
    const adapter = this.vault.adapter;
    const backupPaths = this.getBackupPaths(originalPath);

    for (const path of backupPaths) {
      if (!(await adapter.exists(path))) {
        return path;
      }
    }

    const backupStats = await Promise.all(
      backupPaths.map(async (path) => ({
        path,
        stat: await adapter.stat(path),
      })),
    );

    return backupStats.reduce((oldest, current) =>
      (current.stat?.mtime ?? 0) < (oldest.stat?.mtime ?? 0)
        ? current
        : oldest,
    ).path;
  }

  private async getNewestValidBackup(
    originalPath: string,
  ): Promise<{ path: string; content: string } | null> {
    const adapter = this.vault.adapter;
    const validBackups: Array<{
      path: string;
      content: string;
      mtime: number;
    }> = [];

    for (const path of this.getBackupPaths(originalPath)) {
      if (!(await adapter.exists(path))) {
        continue;
      }

      try {
        const content = await adapter.read(path);
        JSON.parse(content);

        validBackups.push({
          path,
          content,
          mtime: (await adapter.stat(path))?.mtime ?? 0,
        });
      } catch {
        // A broken backup must never prevent trying the other backup slot.
      }
    }

    validBackups.sort((a, b) => b.mtime - a.mtime);

    const newest = validBackups[0];

    return newest
      ? {
          path: newest.path,
          content: newest.content,
        }
      : null;
  }
}
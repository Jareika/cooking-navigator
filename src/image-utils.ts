import { normalizePath, TFile, Vault } from "obsidian";

export function resolveImageUrl(vault: Vault, imageUrl: string): string {
  if (/^(?:https?:|data:|blob:|app:)/i.test(imageUrl)) {
    return imageUrl;
  }

  const file = vault.getAbstractFileByPath(normalizePath(imageUrl));

  if (file instanceof TFile) {
    return vault.getResourcePath(file);
  }

  return imageUrl;
}
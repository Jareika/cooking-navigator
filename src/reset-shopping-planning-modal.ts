import { App, Modal } from "obsidian";

export class ResetShoppingPlanningModal extends Modal {
  private dontAskAgain = false;

  constructor(
    app: App,
    private readonly onConfirm: (dontAskAgain: boolean) => Promise<void>,
  ) {
    super(app);
  }

  onOpen(): void {
    this.contentEl.empty();
    this.contentEl.addClass("cookbook-reset-shopping-planning-modal");

    this.contentEl.createEl("h2", {
      text: "Einkaufsplanung zurücksetzen?",
    });

    this.contentEl.createEl("p", {
      text:
        "Die Einkaufsliste, ausgewählte Gäste, manuelle Skalierungen, " +
        "als zuhause markierte Zutaten und der Einkaufsort werden gelöscht.",
    });

    const checkboxLabel = this.contentEl.createEl("label", {
      cls: "cookbook-reset-shopping-planning-option",
    });

    const checkbox = checkboxLabel.createEl("input", {
      attr: {
        type: "checkbox",
      },
    });

    checkboxLabel.createSpan({
      text: "Nicht erneut nachfragen",
    });

    checkbox.addEventListener("change", () => {
      this.dontAskAgain = checkbox.checked;
    });

    const actions = this.contentEl.createDiv(
      "cookbook-reset-shopping-planning-actions",
    );

    const cancelButton = actions.createEl("button", {
      text: "Abbrechen",
    });

    cancelButton.addEventListener("click", () => {
      this.close();
    });

    const confirmButton = actions.createEl("button", {
      text: "Zurücksetzen",
      cls: "mod-warning",
    });

    confirmButton.addEventListener("click", () => {
      void this.confirm();
    });
  }

  private async confirm(): Promise<void> {
    await this.onConfirm(this.dontAskAgain);
    this.close();
  }
}
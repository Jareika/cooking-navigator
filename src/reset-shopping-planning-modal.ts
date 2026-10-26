import { App, Modal } from "obsidian";
import { t } from "./i18n";

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
      text: t("resetShoppingPlanning.title"),
    });

    this.contentEl.createEl("p", {
      text: t("resetShoppingPlanning.description"),
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
      text: t("resetShoppingPlanning.dontAskAgain"),
    });

    checkbox.addEventListener("change", () => {
      this.dontAskAgain = checkbox.checked;
    });

    const actions = this.contentEl.createDiv(
      "cookbook-reset-shopping-planning-actions",
    );

    const cancelButton = actions.createEl("button", {
      text: t("resetShoppingPlanning.cancel"),
    });

    cancelButton.addEventListener("click", () => {
      this.close();
    });

    const confirmButton = actions.createEl("button", {
      text: t("resetShoppingPlanning.confirm"),
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
import { App, Modal } from "obsidian";
import type CookbookPlugin from "./main";
import { buildRecipePlan, type RecipePlanOptions } from "./recipe-engine";
import type {
  CookbookPerson,
  Recipe,
  ScaledIngredient,
} from "./types";

export class RecipeScaleModal extends Modal {
  private selectedIngredientIndex = 0;

  constructor(
    app: App,
    private readonly plugin: CookbookPlugin,
    private readonly recipe: Recipe,
    private readonly selectedPeople: CookbookPerson[],
    private readonly planOptions: RecipePlanOptions,
    private readonly onChanged: () => void,
  ) {
    super(app);
  }

  onOpen(): void {
    void this.render();
  }

  private async render(): Promise<void> {
    this.contentEl.empty();
    this.contentEl.addClass("cookbook-recipe-scale-modal");

    try {
      const library = await this.plugin.loadLibrary();
      const override = this.plugin.getRecipeScaleOverride(this.recipe.id);
      const plan = buildRecipePlan(
        this.recipe,
        library,
        this.selectedPeople,
        {
          ...this.planOptions,
          manualScaleFactor: override?.scaleFactor,
        },
      );

      this.contentEl.createEl("h2", {
        text: `${this.recipe.title} skalieren`,
      });

      this.contentEl.createEl("p", {
        cls: "setting-item-description",
        text:
          "Wähle eine Hauptzutat und gib die gewünschte Menge ein. Die manuelle Skalierung wird gespeichert und hat Vorrang vor Gäste-, Markt- und Packungsgrößen-Automatik.",
      });

      if (this.recipe.ingredients.length === 0) {
        this.contentEl.createEl("p", {
          text: "Dieses Rezept enthält keine Hauptzutaten zum Skalieren.",
        });
        return;
      }

      const ingredientList = this.contentEl.createDiv(
        "cookbook-recipe-scale-ingredient-list",
      );

      const selectedRecipeIngredient =
        this.recipe.ingredients[this.selectedIngredientIndex] ??
        this.recipe.ingredients[0];

      if (!selectedRecipeIngredient) {
        return;
      }

      const selectedScaledIngredient =
        plan.ingredients[this.selectedIngredientIndex] ??
        plan.ingredients[0];

      for (const [index, item] of plan.ingredients.entries()) {
        this.renderIngredientButton(
          ingredientList,
          item,
          index,
          index === this.selectedIngredientIndex,
        );
      }

      const selectedName = [
        selectedScaledIngredient.ingredient.name,
        selectedScaledIngredient.Suffix,
      ]
        .filter(Boolean)
        .join(" ");

      const unit = getIngredientUnit(selectedScaledIngredient);
      const targetAmount =
        override?.ingredientId === selectedRecipeIngredient.ingredientId
          ? override.targetAmount
          : selectedScaledIngredient.scaledAmount;

      const valueLabel = this.contentEl.createEl("label", {
        cls: "cookbook-recipe-scale-value-field",
        text: `Gewünschte Menge für ${selectedName}`,
      });

      const amountInput = valueLabel.createEl("input", {
        attr: {
          type: "number",
          min: "0.1",
          step: "0.1",
          value: String(targetAmount),
          "aria-label": `Gewünschte Menge für ${selectedName}`,
        },
      });

      valueLabel.createEl("small", { text: unit });

      const actions = this.contentEl.createDiv(
        "cookbook-recipe-scale-actions",
      );

      const saveButton = actions.createEl("button", {
        text: "Manuelle Skalierung speichern",
        cls: "mod-cta",
      });

      saveButton.addEventListener("click", () => {
        void this.saveOverride(
          selectedRecipeIngredient.ingredientId,
          selectedRecipeIngredient.amount,
          unit,
          Number(amountInput.value),
        );
      });

      const resetButton = actions.createEl("button", {
        text: "Automatik verwenden",
      });

      resetButton.disabled = !override;

      resetButton.addEventListener("click", () => {
        void this.resetOverride();
      });

      if (override) {
        this.contentEl.createEl("small", {
          cls: "cookbook-recipe-scale-active-hint",
          text:
            "Eine gespeicherte manuelle Skalierung ist aktiv. Gäste, Märkte und Packungsgrößen bestimmen die Menge derzeit nicht automatisch.",
        });
      }
    } catch (error) {
      this.contentEl.createEl("h2", { text: "Rezept skalieren" });
      this.contentEl.createEl("p", {
        text:
          error instanceof Error
            ? error.message
            : "Die Rezeptdaten konnten nicht geladen werden.",
      });
    }
  }

  private renderIngredientButton(
    parent: HTMLElement,
    item: ScaledIngredient,
    index: number,
    selected: boolean,
  ): void {
    const button = parent.createEl("button", {
      cls: [
        "cookbook-recipe-scale-ingredient",
        selected ? "is-selected" : "",
      ],
    });

    button.createEl("strong", {
      text: [item.ingredient.name, item.Suffix].filter(Boolean).join(" "),
    });

    button.createSpan({
      text: `${formatNumber(item.displayAmount)} ${getIngredientUnit(item)}`,
    });

    button.addEventListener("click", () => {
      this.selectedIngredientIndex = index;
      void this.render();
    });
  }

  private async saveOverride(
    ingredientId: string,
    baseAmount: number,
    unit: string,
    targetAmount: number,
  ): Promise<void> {
    if (
      !Number.isFinite(targetAmount) ||
      targetAmount <= 0 ||
      !Number.isFinite(baseAmount) ||
      baseAmount <= 0
    ) {
      this.plugin.notice(
        "Die gewünschte Menge muss größer als null sein.",
      );
      return;
    }

    await this.plugin.setRecipeScaleOverride(this.recipe.id, {
      ingredientId,
      targetAmount,
      unit,
      scaleFactor: targetAmount / baseAmount,
    });

    this.plugin.notice(
      `"${this.recipe.title}" wurde manuell skaliert.`,
    );

    this.onChanged();
    this.close();
  }

  private async resetOverride(): Promise<void> {
    await this.plugin.clearRecipeScaleOverride(this.recipe.id);

    this.plugin.notice(
      `Die automatische Skalierung für "${this.recipe.title}" ist wieder aktiv.`,
    );

    this.onChanged();
    this.close();
  }
}

function getIngredientUnit(item: ScaledIngredient): string {
  const singularUnit = item.unit ?? item.ingredient.defaultUnit;
  const pluralUnit = item.unitPlural ?? item.ingredient.defaultUnitPlural;

  if (Math.abs(item.displayAmount - 1) < 0.0001 || !pluralUnit) {
    return singularUnit;
  }

  return pluralUnit;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 1,
  }).format(value);
}
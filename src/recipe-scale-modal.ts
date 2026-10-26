import { App, Modal } from "obsidian";
import type CookbookPlugin from "./main";
import { buildRecipePlan, type RecipePlanOptions } from "./recipe-engine";
import type {
  CookbookPerson,
  Recipe,
  ScaledIngredient,
} from "./types";
import { getLocale, t } from "./i18n";

export class RecipeScaleModal extends Modal {
  private selectedIngredientIndex = 0;
  private ingredientListEl: HTMLElement | null = null;
  private statusEl: HTMLElement | null = null;
  private libraryLoaded = false;

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
    void this.initialize();
  }

  private async initialize(): Promise<void> {
    this.contentEl.empty();
    this.contentEl.addClass("cookbook-recipe-scale-modal");
	
    this.contentEl.createEl("h2", {
      text: t("recipeScale.title", { title: this.recipe.title }),
    });

    this.contentEl.createEl("p", {
      cls: "setting-item-description",
      text: t("recipeScale.description"),
    });

    this.statusEl = this.contentEl.createDiv(
      "cookbook-recipe-scale-status",
    );

    this.ingredientListEl = this.contentEl.createDiv(
      "cookbook-recipe-scale-ingredient-list",
    );

    try {
      await this.plugin.loadLibrary();
      this.libraryLoaded = true;

      const override = this.plugin.getRecipeScaleOverride(this.recipe.id);

      if (this.recipe.ingredients.length === 0) {
        this.statusEl.createEl("p", {
          text: t("recipeScale.noIngredients"),
        });
        return;
      }

      const overrideIngredientIndex = this.recipe.ingredients.findIndex(
        (ingredient) => ingredient.ingredientId === override?.ingredientId,
      );

      if (overrideIngredientIndex >= 0) {
        this.selectedIngredientIndex = overrideIngredientIndex;
      }

      this.refreshIngredientList();
    } catch (error) {
      this.statusEl.empty();
      this.statusEl.createEl("p", {
        text:
          error instanceof Error
            ? error.message
            : t("recipeScale.loadError"),
      });
    }
  }
  
  private refreshIngredientList(): void {
    if (!this.ingredientListEl || !this.libraryLoaded) {
      return;
    }

    const scrollTop = this.contentEl.scrollTop;
    void this.renderIngredientList(scrollTop);
  }

  private async renderIngredientList(scrollTop: number): Promise<void> {
    if (!this.ingredientListEl) {
      return;
    }

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

      const ingredientList = this.ingredientListEl;
      ingredientList.empty();

      const selectedRecipeIngredient =
        this.recipe.ingredients[this.selectedIngredientIndex] ??
        this.recipe.ingredients[0];
      const selectedScaledIngredient =
        plan.ingredients[this.selectedIngredientIndex] ??
        plan.ingredients[0];

      if (!selectedRecipeIngredient || !selectedScaledIngredient) {
        return;
      }

      for (const [index, item] of plan.ingredients.entries()) {
        this.renderIngredientButton(
          ingredientList,
          item,
          index,
          index === this.selectedIngredientIndex,
        );

        if (index === this.selectedIngredientIndex) {
          this.renderScaleEditor(
            ingredientList,
            selectedRecipeIngredient,
            selectedScaledIngredient,
            override,
          );
        }
      }
    } catch (error) {
      this.statusEl?.empty();
      this.statusEl?.createEl("p", {
        text:
          error instanceof Error
            ? error.message
            : t("recipeScale.loadError"),
      });
    } finally {
      window.requestAnimationFrame(() => {
        this.contentEl.scrollTop = scrollTop;
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
      this.refreshIngredientList();
    });
  }
  
  private renderScaleEditor(
    parent: HTMLElement,
    recipeIngredient: Recipe["ingredients"][number],
    scaledIngredient: ScaledIngredient,
    override: ReturnType<CookbookPlugin["getRecipeScaleOverride"]>,
  ): void {
    const editor = parent.createDiv("cookbook-recipe-scale-editor");
    const selectedName = [
      scaledIngredient.ingredient.name,
      scaledIngredient.Suffix,
    ]
      .filter(Boolean)
      .join(" ");

    const unit = getIngredientUnit(scaledIngredient);
    const targetAmount =
      override?.ingredientId === recipeIngredient.ingredientId
        ? override.targetAmount
        : scaledIngredient.scaledAmount;

    const valueLabel = editor.createEl("label", {
      cls: "cookbook-recipe-scale-value-field",
      text: t("recipeScale.targetAmountFor", {
        name: selectedName,
      }),
    });

    const amountInput = valueLabel.createEl("input", {
      attr: {
        type: "number",
        min: "0.1",
        step: "0.1",
        value: String(targetAmount),
        "aria-label": t("recipeScale.targetAmountFor", {
          name: selectedName,
        }),
      },
    });

    valueLabel.createEl("small", { text: unit });

    const actions = editor.createDiv("cookbook-recipe-scale-actions");

    const saveButton = actions.createEl("button", {
      text: t("recipeScale.saveManual"),
      cls: "mod-cta",
    });

    saveButton.addEventListener("click", () => {
      void this.saveOverride(
        recipeIngredient.ingredientId,
        recipeIngredient.amount,
        unit,
        Number(amountInput.value),
      );
    });

    const resetButton = actions.createEl("button", {
      text: t("recipeScale.useAutomatic"),
    });

    resetButton.disabled = !override;
    resetButton.addEventListener("click", () => {
      void this.resetOverride();
    });

    if (override) {
      editor.createEl("small", {
        cls: "cookbook-recipe-scale-active-hint",
        text: t("recipeScale.manualScalingActive"),
      });
    }
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
        t("recipeScale.invalidTargetAmount"),
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
      t("recipeScale.saved", {
        title: this.recipe.title,
      }),
    );

    this.onChanged();
    this.close();
  }

  private async resetOverride(): Promise<void> {
    await this.plugin.clearRecipeScaleOverride(this.recipe.id);

    this.plugin.notice(
      t("recipeScale.automaticRestored", {
        title: this.recipe.title,
      }),
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
  return new Intl.NumberFormat(getLocale(), {
    maximumFractionDigits: 1,
  }).format(value);
}
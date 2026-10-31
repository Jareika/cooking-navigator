export const en = {
  app: {
    cookbook: "Cookbook",
    openCookbook: "Open cookbook",
    reloadCookbook: "Reload cookbook",
    closeObsidian: "Close Obsidian",
    settings: "Cooking Navigator settings",
  },
  actions: {
    backToRecipeBrowser: "Back to recipe browser",
    selectGuests: "Select guests",
    openShoppingList: "Open shopping list",
    resetShoppingPlanning: "Reset shopping planning",
    createRecipe: "Create recipe",
	openSettings: "Open Cooking Navigator settings",
	scaleRecipe: "Scale recipe manually",
    manageIngredients: "Manage ingredients, shopping locations, and stores",
    manageGuests: "Manage guests",
    showAllergens: "Show allergen notices",
    hideAllergens: "Hide allergen notices",
    enableFocusMode: "Bring Cookbook to the foreground",
    disableFocusMode: "Exit Cookbook focus mode",
  },
  browser: {
    allRecipes: "All recipes",
    noRecipesMatch:
      "No recipes match the selected guests and category.",
    noTimeInformation: "No time information",
    preparation: "{{minutes}} min prep",
    cooking: "{{minutes}} min cook",
    baking: "{{minutes}} min bake",
  },
  guests: {
    title: "Select guests",
    description:
      "Selected guests determine recipe restrictions, favourites, and portion sizes.",
  },
  guestSettings: {
    errorTitle: "Guests",
    libraryLoadError: "The cookbook library could not be loaded.",
    title: "Manage guests",
    description:
      "Expand guests to edit their image, portion size, allergens, ingredient avoidances, and favourite recipes.",
    moveUp: "Move {{name}} up",
    moveDown: "Move {{name}} down",
    collapse: "Collapse {{name}}",
    edit: "Edit {{name}}",
    portionSize: "Portion size",
    portionSizeFor: "Portion size for {{name}}",
    image: "Image",
    imageFor: "Image for {{name}}",
    noConfiguredImage: "No configured image",
    allergenNotTolerated: "{{name}} does not tolerate {{allergen}}",
    avoidances: "Avoid ingredients",
    allowIngredientAgain: "Allow {{ingredient}} for {{name}} again",
    scopeFor: "Restriction scope for {{name}}",
    ingredientFor: "Ingredient for {{name}}",
    add: "Add",
    invalidPortionSize: "The portion size must be greater than zero.",
    avoidanceAlreadyExists:
      "This ingredient is already configured as an avoidance.",
    favoriteRecipes: "Favourite recipes",
    removeFavoriteRecipe:
      "Remove {{recipe}} from {{name}}'s favourite recipes",
    noRecipesFound: "No recipes found.",
    allRecipesAlreadyFavorites:
      "All available recipes are already marked as favourites.",
    favoriteRecipeFor: "Favourite recipe for {{name}}",
    favoriteRecipeAlreadyExists:
      "This recipe is already configured as a favourite.",
    addGuest: "Add guest",
    name: "Name",
    guestName: "Guest name",
    portionUnits: "Eater units",
    guestColor: "Guest color",
    nameRequired: "Please enter a guest name.",
    guestAdded: "Guest \"{{name}}\" was added.",
  },
  shopping: {
    title: "Shopping list",
    location: "Shopping location",
    selectLocation: "Please select a location",
    empty: "Your shopping list is still empty.",
    recipes: "Recipes",
    preparationRecipes: "Prepare yourself",
    prepareRecipeAriaLabel: "Prepare “{{title}}” yourself",
    preparedRecipeTitle: "{{title}} (prepared)",
    preparationScaling:
      "{{requiredAmount}} {{unit}} needed · recipe yield: {{yieldAmount}} {{unit}} · factor {{scale}}",
    preparationUsedFor: "Used in: {{recipes}}",
    noRecipesSelected: "No recipes selected yet.",
    removeRecipe: "Remove {{title}} from shopping list",
    addRecipe: "Add {{title}} to shopping list",
    recipeIngredientOverlap:
      "{{matching}} of {{total}} ingredients are already on the shopping list",
    noIngredients: "No ingredients available",
    alreadyAtHome: "Already at home",
    markAsAtHome: "Mark {{name}} as already available at home",
	markAsAtHomeTitle: "Already available at home",
    buyAgain: "Buy again",
    recommendedStores: "Recommended stores: {{stores}}",
    favoriteStoreInsufficient:
      "Your favourite store is not sufficient. Recommended stores: {{stores}}",
    unavailableAtLocation:
      "Not available or not assigned at the selected location: {{ingredients}}",
    unavailableWithoutLocation:
      "No store assignment: {{ingredients}}",
    unavailableAtSelectedLocation:
      "Not available at the selected location",
    selectLocationAriaLabel: "Select shopping location",
    manualScaling:
      "Manually scaled using {{ingredient}}: {{amount}} {{unit}}",
    automaticScaling:
      "Automatically scaled using {{ingredient}}: {{amount}} {{unit}}",
    scalingForEaters: "Scaling for {{count}} eater units",
    email: "Open shopping list by email",
    emailSubject: "Shopping list",
    emailRecipes: "Recipes:",
    emailIngredients: "Ingredients:",
    emailManualItems: "Added manually:",
    emailRecipientMissing:
      "Please set a recipient address for shopping lists in the settings first.",
    manual: {
      title: "Add manually",
      name: "Item name",
      namePlaceholder: "e.g. washing-up liquid",
      amount: "Amount, optional",
      unit: "Unit, optional",
	  unitPlaceholder: "e.g. pieces",
      add: "Add",
      items: "Manual items",
      remove: "Remove {{name}} from shopping list",
      nameRequired: "Please enter an item name.",
      invalidAmount:
        "The amount must be a number greater than or equal to zero.",
    },
  },
  cooking: {
    forEaters: "For {{count}} eater units",
    baseRecipe: "Base recipe for {{count}} eater units",
    packageHint:
      "{{ingredient}}: scaled to {{amount}} {{unit}} because it is a critical resource.",
    previous: "Previous",
    next: "Next",
    finish: "Finish",
    backToBrowser: "Back to browser",
    step: "Step {{number}}",
    activeTimers: "Active timers",
    imageLoadError: "Recipe image could not be loaded.",
    openPreparationRecipe: "Open",
    preparationRecipeNotFound:
      "The preparation recipe “{{recipeId}}” could not be found.",
  },
  timer: {
    title: "Cooking timer",
    ready: "Ready: {{duration}}",
    running: "Running: {{duration}} remaining",
    paused: "Paused: {{duration}} remaining",
    finished: "Timer finished.",
    start: "Start timer · {{duration}}",
    pause: "Pause",
    resume: "Resume",
    restart: "Restart",
    addMinute: "+1 min.",
    cancel: "Cancel",
    addMinuteTitle: "Add one minute",
    addMinuteToTimer: "Add one minute to {{label}}",
    cancelTitle: "Cancel timer",
    cancelTimer: "Cancel {{label}}",
    expiredNotice: "Timer finished: {{label}}",
    soundFailed:
      "The timer finished, but the alarm sound could not be played.",
  },
  errors: {
    cookbookNotConfigured: "Cookbook is not configured yet",
    unknownDatabaseError: "Unknown database error.",
    createExampleDatabase: "Create example database",
    restoreLibraryBackup: "Restore library from backup",
    libraryFileMissing:
      "The Cookbook library \"{{path}}\" was not found. " +
      "It was not restored automatically during vault startup to avoid overwriting existing data.",
    recipeFileCouldNotBeRead:
      "The recipe file \"{{path}}\" could not be read.",
    recipeIdAlreadyExists:
      "A recipe with the ID \"{{id}}\" already exists in \"{{path}}\".",
    backupFileNameCouldNotBeDetermined:
      "The file name for \"{{path}}\" could not be determined.",
    recipeReferencesUnknownIngredient:
      "The recipe \"{{title}}\" references the unknown ingredient \"{{ingredientId}}\".",
    guestReferencesUnknownAllergen:
      "The guest \"{{name}}\" references the unknown allergen \"{{allergenId}}\".",
    recipeIncompatibleWithGuests:
      "The recipe \"{{title}}\" is not compatible with the selected guests.",
    ingredientReferencesUnknownAllergen:
      "The ingredient \"{{name}}\" references the unknown allergen \"{{allergenId}}\".",
    preparationRecipeNotFound:
      "The preparation recipe \"{{recipeId}}\" for \"{{ingredient}}\" could not be found.",
    preparationRecipeOutputMissing:
      "The preparation recipe \"{{title}}\" requires a valid produces declaration with an output amount.",
    preparationRecipeProducesWrongIngredient:
      "The preparation recipe \"{{title}}\" does not produce the required ingredient \"{{ingredient}}\".",
    preparationRecipeUnitMismatch:
      "The preparation recipe \"{{title}}\" uses an incompatible unit: expected \"{{expectedUnit}}\", received \"{{actualUnit}}\".",
    preparationRecipeCycle:
      "Cyclic preparation recipes are not allowed: {{title}}.",
  },
  resetShoppingPlanning: {
    title: "Reset shopping planning?",
    description:
      "The shopping list, selected guests, manual scaling, ingredients " +
      "marked as already available at home, prepared recipes, and the shopping location will be cleared.",
    dontAskAgain: "Don't ask again",
    cancel: "Cancel",
    confirm: "Reset",
  },
  notices: {
    exampleDatabaseAvailable:
      "Cookbook files are available in \"{{folder}}\".",
    recipeAddedToShoppingList:
      "\"{{title}}\" was added to the shopping list.",
    recipeRemovedFromShoppingList:
      "\"{{title}}\" was removed from the shopping list.",
    shoppingPlanningReset: "Shopping planning was reset.",
    libraryRestored:
      "The Cookbook library was restored from the newest valid backup.",
    noLibraryBackup:
      "No valid Cookbook library backup was found.",
  },
  ingredient: {
    alternativeFor: "Alternative for {{name}}",
    contains: "Contains: {{allergens}}",
  },
  recipeScale: {
    title: "Scale {{title}}",
    description:
      "Choose a main ingredient and enter the desired amount. The manual scale is saved and takes precedence over guest, store, and package-size automation.",
    noIngredients:
      "This recipe does not contain any main ingredients to scale.",
    loadError: "The recipe data could not be loaded.",
    targetAmountFor: "Desired amount for {{name}}",
    saveManual: "Save manual scaling",
    useAutomatic: "Use automatic scaling",
    manualScalingActive:
      "A saved manual scale is active. Guests, stores, and package sizes currently do not determine the amount automatically.",
    invalidTargetAmount:
      "The desired amount must be greater than zero.",
    saved: "\"{{title}}\" was manually scaled.",
    automaticRestored:
      "Automatic scaling for \"{{title}}\" is active again.",
  },
  recipeEditor: {
    title: "Create recipe",
    errorTitle: "Create recipe",
    description:
      "First add the ingredients for the shopping list, then optionally assign them to individual cooking steps.",
    loadError: "The Cookbook data could not be loaded.",
    saveError: "The recipe could not be saved.",
    general: {
      heading: "General information",
      recipeName: "Recipe name",
      recipeNamePlaceholder: "e.g. Potato soup",
      eaterUnits: "Eater units",
      preparationMinutes: "Preparation (min.)",
      cookingMinutes: "Cooking (min.)",
      bakingMinutes: "Baking (min.)",
      recipeImage: "Recipe image",
      noImage: "No image",
      imagePlacement: "Image placement",
      imageBeforeIngredients: "Before ingredients",
      imageAfterIngredients: "After ingredients",
      categories: "Categories",
      restrictionScopes: "Restriction scopes",
    },
    produces: {
      enabled: "This recipe produces an ingredient",
      ingredient: "Produced ingredient",
      amount: "Produced amount",
      unit: "Output unit",
    },
    categories: {
      placeholder: "New category, e.g. Casseroles",
      nameAriaLabel: "New category name",
      add: "Create category",
      nameRequired: "Please enter a category name.",
      alreadyExists: "This category already exists.",
      created: "Category \"{{name}}\" was created.",
      saveError: "The category could not be saved.",
    },
    ingredients: {
      heading: "Ingredients for shopping list",
      description:
        "This list determines the ingredient overview and shopping list. Ingredients in steps additionally serve as cooking guidance.",
      add: "Add ingredient",
      empty: "No ingredients added yet.",
      ingredient: "Ingredient",
      amount: "Amount",
      alternative: "Alternative",
      noAlternative: "No alternative",
      preparationRecipe: "Preparation recipe",
      noPreparationRecipe: "Buy ingredient / no preparation recipe",
      suffix: "Addition",
      suffixPlaceholder: "e.g. chopped",
      note: "Note",
      notePlaceholder: "e.g. for serving",
      remove: "Remove ingredient",
    },
    steps: {
      heading: "Cooking steps",
      add: "Add step",
      step: "Step {{number}}",
      remove: "Remove step {{number}}",
      title: "Heading",
      timerMinutes: "Timer (min., optional)",
      instructions: "Instructions (one line = one list item)",
      instructionsPlaceholder:
        "Prepare ingredient\nHeat in a pot\nServe",
      ingredients: "Ingredients in this step",
      assignIngredient: "Assign ingredient",
    },
    actions: {
      cancel: "Cancel",
      save: "Save recipe",
    },
    validation: {
      nameRequired: "Please enter a recipe name.",
      invalidEaterUnits: "The eater units must be greater than zero.",
      ingredientsRequired:
        "Please add at least one ingredient to the shopping list.",
      invalidIngredient:
        "Every ingredient needs a valid selection and an amount greater than zero.",
      invalidProducedAmount:
        "The produced ingredient needs an ingredient, an amount greater than zero, and a unit.",
      stepIngredientNotAssigned:
        "Cooking steps may only use ingredients assigned to the recipe.",
      stepsRequired:
        "Please create at least one cooking step with an instruction.",
      createIngredientFirst:
        "First create at least one ingredient in ingredient management.",
      addRecipeIngredientFirst:
        "First add an ingredient to the recipe ingredient list.",
    },
    notices: {
      created: "\"{{title}}\" was created.",
    },
  },
  ingredientManagement: {
    title: "Manage ingredients, locations, and stores",
    description:
      "Locations contain stores. For each ingredient, you can define the stores where it is available and the available package sizes.",
    errorTitle: "Manage ingredients",
    libraryLoadError: "The Cookbook library could not be loaded.",
    locations: {
      heading: "Shopping locations",
      storeCountOne: "1 store",
      storeCountMany: "{{count}} stores",
      delete: "Delete {{name}}",
      cannotDelete:
        "A location can only be deleted after all associated stores have been removed.",
      namePlaceholder: "e.g. Haselünne",
      nameAriaLabel: "Shopping location name",
      add: "Add location",
      nameRequired: "Please enter a location name.",
      alreadyExists: "This location already exists.",
    },
    markets: {
      heading: "Stores",
      toggleHint: "Show or hide entries",
      noLocation: "No location",
      delete: "Delete {{name}}",
      locationRequired: "Create at least one shopping location first.",
      namePlaceholder: "e.g. ALDI",
      nameAriaLabel: "Store name",
      locationAriaLabel: "Store location",
      add: "Add store",
      nameRequired: "Please enter a store name.",
      alreadyExists: "This store already exists at that location.",
    },
    ingredients: {
      heading: "Ingredients",
      collapse: "Collapse {{name}}",
      edit: "Edit {{name}}",
    },
    editor: {
      name: "Name",
      singularUnit: "Unit (singular)",
      pluralUnit: "Unit (plural)",
      packageSizes: "Default package sizes",
      packageSizesPlaceholder: "e.g. 200, 400, 500",
      packageSizesHint:
        "These sizes apply unless a store-specific override has been configured.",
      resourcePriority: "Resource priority",
      priorityNone: "None",
      priorityPrimary: "Primary",
      prioritySecondary: "Secondary",
      availability: "Available in these stores",
      availableAtMarket: "{{ingredient}} is available at {{market}}",
      storePackageSizesPlaceholder: "Default",
      storePackageSizesAriaLabel:
        "Package sizes for {{ingredient}} at {{market}}",
      save: "Save ingredient",
      nameAndUnitRequired: "Name and unit are required fields.",
      invalidPackageSizes:
        "Package sizes must be positive numbers separated by commas.",
      invalidStorePackageSizes:
        "Invalid package sizes for {{market}}.",
      delete: "Delete ingredient",
      cannotDeleteInUse:
        "This ingredient is still used by at least one recipe and cannot be deleted.",
    },
    addIngredient: {
      heading: "New ingredient",
      name: "Name",
      unit: "Unit",
      plural: "Plural",
      add: "Add ingredient",
    },
  },
  settings: {
    validation: {
      folderRequired: "Please choose a folder.",
      backupFolderRequired: "Please choose a backup folder.",
      defaultRecipeFile: 'Use a name such as "recipes-main.json".',
      email: "Please enter a valid email address.",
    },
    database: {
      folder: {
        name: "Cookbook folder",
        description:
          "Folder containing cookbook-library.json and one or more recipes-*.json files.",
      },
      defaultRecipeFile: {
        name: "Default recipe file",
        description: "File created when generating the example database.",
        placeholder: "recipes-main.json",
      },
      enableJsonBackups: {
        name: "Create JSON backups",
        description:
          "Creates rotating backups for JSON files written by the plugin. Missing libraries can be restored from the newest valid backup.",
      },
      jsonBackupCount: {
        name: "Number of JSON backups",
        description:
          "With two backups, previous file states are retained. With three or more backups, the newly saved current state is retained as well.",
      },
      backupFolder: {
        name: "Cookbook backup folder",
        description:
          "Folder for rotating JSON backups. The recommended default is a Backups folder inside the Cookbook folder.",
      },
      actionsHeading: "Database",
      createExample: {
        name: "Create example database",
        description: "Creates example JSON files if they do not exist yet.",
      },
      openCookbook: {
        name: "Open cookbook",
        description: "Reload the JSON database and open the recipe browser.",
      },
    },
    cooking: {
      showPackageSuggestions: {
        name: "Show package suggestions",
        description:
          "Show the critical package amount that changed the final recipe scale.",
      },
      showIngredientAllergens: {
        name: "Show allergen notices",
        description:
          "Show declared allergens such as gluten, lactose, or egg below ingredients in cooking mode.",
      },
      preventSidePaneSwipes: {
        name: "Keep cooking swipes inside Cookbook",
        description:
          "Prevents horizontal swipes in cooking mode from opening Obsidian side panes on touch devices.",
      },
    },
    timer: {
      heading: "Cooking timer",
      alarmSound: {
        name: "Alarm sound",
        description:
          "Optional sound file from the vault. It is played when a cooking timer expires.",
        placeholder: "Choose sound file…",
      },
      alarmVolume: {
        name: "Timer volume",
        description:
          "Volume of the alarm sound. Playback may be restricted by the operating system on locked mobile devices.",
      },
    },
    browser: {
      allRecipesImage: {
        name: "Image for “All recipes” button",
        description:
          "Optionally select a square vault image for the first category button in the recipe browser.",
        placeholder: "Choose image…",
      },
      allRecipesButtonPlacement: {
        name: "“All recipes” button position",
        description:
          "Choose whether the button is shown before or after the categories, or hidden completely. When hidden, clicking the active category clears the filter again.",
        start: "Before categories",
        end: "After categories",
        hidden: "Hide",
      },
    },
    shopping: {
      heading: "Shopping list",
      noFavoriteStore: "No favourite",
      storeMode: {
        name: "Store strategy",
        description:
          "Choose whether the favourite store is preferred, the smallest store combination is found, or stores are shown for each ingredient.",
        favoriteFirst: "Favourite store first",
        fewestStores: "Use as few stores as possible",
        ingredientStores: "Show stores per ingredient",
      },
      favoriteStores: {
        heading: "Preferred stores by shopping location",
      },
      favoriteStoreForLocation:
        "Preferred for {{location}} when using “Favourite store first” mode.",
      manageIngredients: {
        name: "Manage ingredients, locations, and stores",
        description:
          "Manage ingredients, package sizes, shopping locations, stores, and ingredient availability by store.",
      },
      emailRecipient: {
        name: "Shopping-list recipient",
        description:
          "Optional. Sending opens a prepared email in the default mail app; the plugin does not send emails itself.",
        placeholder: "name@example.com",
      },
    },
    categoryButtons: {
      heading: "Category buttons",
      emptyState:
        "No categories found yet. Create or select a cookbook database first.",
      description:
        "Drag this row to change the browser order. Optionally select a square category image from the vault.",
      imagePlaceholder: "Choose category image…",
    },
    notices: {
      exampleDatabaseCreated: "Example cookbook database created.",
    },
  },
} as const;

type TranslationSchema<T> = {
  [Key in keyof T]: T[Key] extends string
    ? string
    : TranslationSchema<T[Key]>;
};

export type TranslationDictionary = TranslationSchema<typeof en>;
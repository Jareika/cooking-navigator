import type { TranslationDictionary } from "./en";

export const de: TranslationDictionary = {
  app: {
    cookbook: "Kochbuch",
    openCookbook: "Kochbuch öffnen",
    reloadCookbook: "Kochbuch neu laden",
    closeObsidian: "Obsidian schließen",
    settings: "Cooking-Navigator-Einstellungen",
  },
  actions: {
    backToRecipeBrowser: "Zur Rezeptübersicht",
    selectGuests: "Gäste auswählen",
    openShoppingList: "Einkaufsliste öffnen",
    resetShoppingPlanning: "Einkaufsplanung zurücksetzen",
    createRecipe: "Neues Rezept erstellen",
	openSettings: "Cooking-Navigator-Einstellungen öffnen",
	scaleRecipe: "Rezept manuell skalieren",
    manageIngredients:
      "Zutaten, Einkaufsorte und Supermärkte verwalten",
    manageGuests: "Gäste verwalten",
    showAllergens: "Allergenhinweise anzeigen",
    hideAllergens: "Allergenhinweise ausblenden",
    enableFocusMode: "Cookbook in den Vordergrund bringen",
    disableFocusMode: "Cookbook-Fokusmodus beenden",
  },
  browser: {
    allRecipes: "Alle Rezepte",
    noRecipesMatch:
      "Keine Rezepte passen zu den ausgewählten Gästen und der Kategorie.",
    noTimeInformation: "Keine Zeitangabe",
    preparation: "{{minutes}} Min. Vorbereitung",
    cooking: "{{minutes}} Min. Kochen",
    baking: "{{minutes}} Min. Backen",
  },
  guests: {
    title: "Gäste auswählen",
    description:
      "Ausgewählte Gäste bestimmen Rezept-Einschränkungen, Favoriten und Portionsgrößen.",
  },
  guestSettings: {
    errorTitle: "Gäste",
    libraryLoadError: "Die Cookbook-Bibliothek konnte nicht geladen werden.",
    title: "Gäste verwalten",
    description:
      "Klappe Gäste auf, um Bild, Portionsgröße, Allergene, Zutaten-Avoidances und Lieblingsrezepte zu bearbeiten.",
    moveUp: "{{name}} nach oben verschieben",
    moveDown: "{{name}} nach unten verschieben",
    collapse: "{{name}} einklappen",
    edit: "{{name}} bearbeiten",
    portionSize: "Portionsgröße",
    portionSizeFor: "Portionsgröße für {{name}}",
    image: "Bild",
    imageFor: "Bild für {{name}}",
    noConfiguredImage: "Kein konfiguriertes Bild",
    allergenNotTolerated: "{{name}} verträgt {{allergen}} nicht",
    avoidances: "Zutaten vermeiden",
    allowIngredientAgain: "{{ingredient}} für {{name}} wieder erlauben",
    scopeFor: "Geltungsbereich für {{name}}",
    ingredientFor: "Zutat für {{name}}",
    add: "Hinzufügen",
    invalidPortionSize: "Die Portionsgröße muss größer als null sein.",
    avoidanceAlreadyExists:
      "Diese Zutat ist bereits als Avoidance eingetragen.",
    favoriteRecipes: "Lieblingsrezepte",
    removeFavoriteRecipe:
      "{{recipe}} aus den Lieblingsrezepten von {{name}} entfernen",
    noRecipesFound: "Keine Rezepte gefunden.",
    allRecipesAlreadyFavorites:
      "Alle vorhandenen Rezepte sind bereits als Favoriten markiert.",
    favoriteRecipeFor: "Lieblingsrezept für {{name}}",
    favoriteRecipeAlreadyExists:
      "Dieses Rezept ist bereits als Lieblingsrezept eingetragen.",
    addGuest: "Gast hinzufügen",
    name: "Name",
    guestName: "Name des Gasts",
    portionUnits: "Portionseinheiten",
    guestColor: "Farbe des Gasts",
    nameRequired: "Bitte gib einen Gastnamen ein.",
    guestAdded: "Gast „{{name}}“ wurde hinzugefügt.",
  },
  shopping: {
    title: "Einkaufsliste",
    location: "Einkaufsort",
    selectLocation: "Bitte einen Ort auswählen",
    empty: "Deine Einkaufsliste ist noch leer.",
    recipes: "Rezepte",
    preparationRecipes: "Selbst zubereiten",
    prepareRecipeAriaLabel: "„{{title}}“ selbst zubereiten",
    preparedRecipeTitle: "{{title}} (selbst zubereitet)",
    preparationScaling:
      "{{requiredAmount}} {{unit}} benötigt · Ausgaberezept: {{yieldAmount}} {{unit}} · Faktor {{scale}}",
    preparationUsedFor: "Verwendet in: {{recipes}}",
    noRecipesSelected: "Noch keine Rezepte ausgewählt.",
    removeRecipe: "{{title}} aus der Einkaufsliste entfernen",
    addRecipe: "{{title}} zur Einkaufsliste hinzufügen",
    recipeIngredientOverlap:
      "{{matching}} von {{total}} Zutaten liegen bereits in der Einkaufsliste",
    noIngredients: "Keine Zutaten vorhanden",
    alreadyAtHome: "Bereits zuhause",
    markAsAtHome: "{{name}} als zuhause vorhanden markieren",
	markAsAtHomeTitle: "Habe ich zuhause",
    buyAgain: "Wieder einkaufen",
    recommendedStores: "Empfohlene Märkte: {{stores}}",
    favoriteStoreInsufficient:
      "Dein Favoritenmarkt reicht nicht aus. Empfohlene Märkte: {{stores}}",
    unavailableAtLocation:
      "Am gewählten Ort nicht verfügbar oder nicht zugeordnet: {{ingredients}}",
    unavailableWithoutLocation:
      "Ohne Marktzuordnung: {{ingredients}}",
    unavailableAtSelectedLocation: "Am gewählten Ort nicht verfügbar",
    selectLocationAriaLabel: "Einkaufsort auswählen",
    manualScaling:
      "Manuell skaliert über {{ingredient}}: {{amount}} {{unit}}",
    automaticScaling:
      "Automatisch skaliert über {{ingredient}}: {{amount}} {{unit}}",
    scalingForEaters: "Skalierung für {{count}} Portionseinheiten",
    email: "Einkaufsliste per E-Mail öffnen",
    emailSubject: "Einkaufsliste",
    emailRecipes: "Rezepte:",
    emailIngredients: "Zutaten:",
    emailManualItems: "Manuell hinzugefügt:",
    emailRecipientMissing:
      "Bitte zuerst unter Einstellungen eine Empfängeradresse für Einkaufslisten hinterlegen.",
    manual: {
      title: "Manuell hinzufügen",
      name: "Artikelname",
	  namePlaceholder: "z. B. Spülmittel",
      amount: "Menge, optional",
      unit: "Einheit, optional",
	  unitPlaceholder: "z. B. Stück",
      add: "Hinzufügen",
      items: "Manuelle Positionen",
      remove: "{{name}} aus der Einkaufsliste entfernen",
      nameRequired: "Bitte gib einen Artikelnamen ein.",
      invalidAmount:
        "Die Menge muss eine Zahl größer oder gleich null sein.",
    },
  },
  cooking: {
    forEaters: "Für {{count}} Portionseinheiten",
    baseRecipe: "Grundrezept für {{count}} Portionseinheiten",
    packageHint:
      "{{ingredient}}: Auf {{amount}} {{unit}} skaliert, da dies eine kritische Ressource ist.",
    previous: "Zurück",
    next: "Weiter",
    finish: "Fertig",
    backToBrowser: "Zur Rezeptübersicht",
    step: "Schritt {{number}}",
    activeTimers: "Aktive Timer",
    imageLoadError: "Rezeptbild konnte nicht geladen werden.",
    openPreparationRecipe: "Zubereitungsrezept öffnen",
    preparationRecipeNotFound:
      "Das Zubereitungsrezept „{{recipeId}}“ wurde nicht gefunden.",
  },
  timer: {
    title: "Koch-Timer",
    ready: "Bereit: {{duration}}",
    running: "Läuft: noch {{duration}}",
    paused: "Pausiert: noch {{duration}}",
    finished: "Timer abgelaufen.",
    start: "Timer starten · {{duration}}",
    pause: "Pausieren",
    resume: "Fortsetzen",
    restart: "Erneut starten",
    addMinute: "+1 Min.",
    cancel: "Abbrechen",
    addMinuteTitle: "Eine Minute hinzufügen",
    addMinuteToTimer: "{{label}}: eine Minute hinzufügen",
    cancelTitle: "Timer abbrechen",
    cancelTimer: "{{label}} abbrechen",
    expiredNotice: "Timer abgelaufen: {{label}}",
    soundFailed:
      "Der Timer ist abgelaufen, aber der Klingelton konnte nicht abgespielt werden.",
  },
  errors: {
    cookbookNotConfigured: "Cookbook ist noch nicht eingerichtet",
    unknownDatabaseError: "Unbekannter Datenbankfehler.",
    createExampleDatabase: "Beispieldatenbank erstellen",
    restoreLibraryBackup: "Bibliothek aus Sicherung wiederherstellen",
    libraryFileMissing:
      "Die Cookbook-Bibliothek „{{path}}“ wurde nicht gefunden. " +
      "Sie wurde beim Start des Vaults nicht automatisch wiederhergestellt, " +
      "damit keine vorhandenen Daten überschrieben werden.",
    recipeFileCouldNotBeRead:
      "Die Rezeptdatei „{{path}}“ konnte nicht gelesen werden.",
    recipeIdAlreadyExists:
      "Ein Rezept mit der ID „{{id}}“ existiert bereits in „{{path}}“.",
    backupFileNameCouldNotBeDetermined:
      "Der Dateiname für „{{path}}“ konnte nicht bestimmt werden.",
    recipeReferencesUnknownIngredient:
      "Das Rezept „{{title}}“ verweist auf die unbekannte Zutat „{{ingredientId}}“.",
    guestReferencesUnknownAllergen:
      "Der Gast „{{name}}“ verweist auf das unbekannte Allergen „{{allergenId}}“.",
    recipeIncompatibleWithGuests:
      "Das Rezept „{{title}}“ ist nicht mit den ausgewählten Gästen kompatibel.",
    ingredientReferencesUnknownAllergen:
      "Die Zutat „{{name}}“ verweist auf das unbekannte Allergen „{{allergenId}}“.",
    preparationRecipeNotFound:
      "Für „{{ingredient}}“ wurde das Zubereitungsrezept „{{recipeId}}“ nicht gefunden.",
    preparationRecipeOutputMissing:
      "Das Zubereitungsrezept „{{title}}“ benötigt eine gültige Angabe „produces“ mit Ausgabemenge.",
    preparationRecipeProducesWrongIngredient:
      "Das Zubereitungsrezept „{{title}}“ produziert nicht die benötigte Zutat „{{ingredient}}“.",
    preparationRecipeUnitMismatch:
      "Das Zubereitungsrezept „{{title}}“ verwendet eine inkompatible Einheit: erwartet „{{expectedUnit}}“, erhalten „{{actualUnit}}“.",
    preparationRecipeCycle:
      "Zyklische Zubereitungsrezepte sind nicht erlaubt: {{title}}.",
  },
  resetShoppingPlanning: {
    title: "Einkaufsplanung zurücksetzen?",
    description:
      "Die Einkaufsliste, ausgewählte Gäste, manuelle Skalierungen, " +
      "als zuhause markierte Zutaten, Selbstzubereitungen und der Einkaufsort werden gelöscht.",
    dontAskAgain: "Nicht erneut nachfragen",
    cancel: "Abbrechen",
    confirm: "Zurücksetzen",
  },
  notices: {
    exampleDatabaseAvailable:
      "Cookbook-Dateien wurden in „{{folder}}“ bereitgestellt.",
    recipeAddedToShoppingList:
      "\"{{title}}\" wurde zur Einkaufsliste hinzugefügt.",
    recipeRemovedFromShoppingList:
      "\"{{title}}\" wurde aus der Einkaufsliste entfernt.",
    shoppingPlanningReset: "Die Einkaufsplanung wurde zurückgesetzt.",
    libraryRestored:
      "Die Cookbook-Bibliothek wurde aus dem neuesten gültigen Backup wiederhergestellt.",
    noLibraryBackup:
      "Kein gültiges Backup der Cookbook-Bibliothek wurde gefunden.",
  },
  ingredient: {
    alternativeFor: "Alternative für {{name}}",
    contains: "Enthält: {{allergens}}",
  },
  recipeScale: {
    title: "{{title}} skalieren",
    description:
      "Wähle eine Hauptzutat und gib die gewünschte Menge ein. Die manuelle Skalierung wird gespeichert und hat Vorrang vor Gäste-, Markt- und Packungsgrößen-Automatik.",
    noIngredients:
      "Dieses Rezept enthält keine Hauptzutaten zum Skalieren.",
    loadError: "Die Rezeptdaten konnten nicht geladen werden.",
    targetAmountFor: "Gewünschte Menge für {{name}}",
    saveManual: "Manuelle Skalierung speichern",
    useAutomatic: "Automatik verwenden",
    manualScalingActive:
      "Eine gespeicherte manuelle Skalierung ist aktiv. Gäste, Märkte und Packungsgrößen bestimmen die Menge derzeit nicht automatisch.",
    invalidTargetAmount:
      "Die gewünschte Menge muss größer als null sein.",
    saved: "„{{title}}“ wurde manuell skaliert.",
    automaticRestored:
      "Die automatische Skalierung für „{{title}}“ ist wieder aktiv.",
  },
  recipeEditor: {
    title: "Neues Rezept erstellen",
    errorTitle: "Rezept erstellen",
    description:
      "Lege zuerst die Zutaten für die Einkaufsliste an und ordne sie anschließend optional den einzelnen Kochschritten zu.",
    loadError: "Die Cookbook-Daten konnten nicht geladen werden.",
    saveError: "Das Rezept konnte nicht gespeichert werden.",
    general: {
      heading: "Grunddaten",
      recipeName: "Rezeptname",
      recipeNamePlaceholder: "z. B. Kartoffelsuppe",
      eaterUnits: "Portionseinheiten",
      preparationMinutes: "Vorbereitung (Min.)",
      cookingMinutes: "Kochen (Min.)",
      bakingMinutes: "Backen (Min.)",
      recipeImage: "Rezeptbild",
      noImage: "Kein Bild",
      imagePlacement: "Bildposition",
      imageBeforeIngredients: "Vor den Zutaten",
      imageAfterIngredients: "Nach den Zutaten",
      categories: "Kategorien",
      restrictionScopes: "Einschränkungsbereiche",
    },
    produces: {
      enabled: "Dieses Rezept stellt eine Zutat her",
      ingredient: "Hergestellte Zutat",
      amount: "Erzeugte Menge",
      unit: "Einheit der Ausgabemenge",
    },
    categories: {
      placeholder: "Neue Kategorie, z. B. Aufläufe",
      nameAriaLabel: "Name der neuen Kategorie",
      add: "Kategorie anlegen",
      nameRequired: "Bitte gib einen Kategorienamen ein.",
      alreadyExists: "Diese Kategorie ist bereits vorhanden.",
      created: "Kategorie „{{name}}“ wurde angelegt.",
      saveError: "Die Kategorie konnte nicht gespeichert werden.",
    },
    ingredients: {
      heading: "Zutaten für Einkaufsliste",
      description:
        "Diese Liste bestimmt die Zutatenübersicht und die Einkaufsliste. Zutaten in Schritten dienen zusätzlich als Kochhilfe.",
      add: "Zutat hinzufügen",
      empty: "Noch keine Zutaten hinzugefügt.",
      ingredient: "Zutat",
      amount: "Menge",
      alternative: "Alternative",
      noAlternative: "Keine Alternative",
      preparationRecipe: "Zubereitungsrezept",
      noPreparationRecipe: "Zutat kaufen / kein Zubereitungsrezept",
      suffix: "Zusatz",
      suffixPlaceholder: "z. B. gehackt",
      note: "Hinweis",
      notePlaceholder: "z. B. zum Servieren",
      remove: "Zutat entfernen",
    },
    steps: {
      heading: "Kochschritte",
      add: "Schritt hinzufügen",
      step: "Schritt {{number}}",
      remove: "Schritt {{number}} entfernen",
      title: "Überschrift",
      timerMinutes: "Timer (Min., optional)",
      instructions: "Anweisungen (eine Zeile = ein Listenpunkt)",
      instructionsPlaceholder:
        "Zutat vorbereiten\nIm Topf erhitzen\nServieren",
      ingredients: "Zutaten in diesem Schritt",
      assignIngredient: "Zutat zuordnen",
    },
    actions: {
      cancel: "Abbrechen",
      save: "Rezept speichern",
    },
    validation: {
      nameRequired: "Bitte gib einen Rezeptnamen ein.",
      invalidEaterUnits:
        "Die Portionseinheiten müssen größer als null sein.",
      ingredientsRequired:
        "Bitte füge mindestens eine Zutat für die Einkaufsliste hinzu.",
      invalidIngredient:
        "Jede Zutat benötigt eine gültige Auswahl und eine Menge größer als null.",
      invalidProducedAmount:
        "Für die hergestellte Zutat müssen Zutat, Menge größer als null und Einheit angegeben werden.",
      stepIngredientNotAssigned:
        "Kochschritte dürfen nur Zutaten verwenden, die dem Rezept zugeordnet wurden.",
      stepsRequired:
        "Bitte erstelle mindestens einen Kochschritt mit einer Anweisung.",
      createIngredientFirst:
        "Lege zuerst im Zutatenmanagement mindestens eine Zutat an.",
      addRecipeIngredientFirst:
        "Füge zuerst eine Zutat zur Rezept-Zutatenliste hinzu.",
    },
    notices: {
      created: "„{{title}}“ wurde erstellt.",
    },
  },
  ingredientManagement: {
    title: "Zutaten, Orte und Märkte verwalten",
    description:
      "Orte enthalten Supermärkte. Bei Zutaten wird festgelegt, in welchen Supermärkten sie erhältlich sind und welche Packungsgrößen verfügbar sind.",
    errorTitle: "Zutaten verwalten",
    libraryLoadError: "Die Cookbook-Bibliothek konnte nicht geladen werden.",
    locations: {
      heading: "Einkaufsorte",
      storeCountOne: "1 Supermarkt",
      storeCountMany: "{{count}} Supermärkte",
      delete: "{{name}} löschen",
      cannotDelete:
        "Ein Ort kann erst gelöscht werden, wenn alle zugehörigen Supermärkte entfernt wurden.",
      namePlaceholder: "z. B. Haselünne",
      nameAriaLabel: "Name des Einkaufsorts",
      add: "Ort hinzufügen",
      nameRequired: "Bitte einen Ortsnamen eingeben.",
      alreadyExists: "Dieser Ort ist bereits vorhanden.",
    },
    markets: {
      heading: "Supermärkte",
      toggleHint: "Einträge anzeigen oder ausblenden",
      noLocation: "Kein Ort",
      delete: "{{name}} löschen",
      locationRequired: "Lege zuerst mindestens einen Einkaufsort an.",
      namePlaceholder: "z. B. ALDI",
      nameAriaLabel: "Name des Supermarkts",
      locationAriaLabel: "Ort des Supermarkts",
      add: "Supermarkt hinzufügen",
      nameRequired: "Bitte einen Supermarktnamen eingeben.",
      alreadyExists: "Dieser Supermarkt ist an dem Ort bereits vorhanden.",
    },
    ingredients: {
      heading: "Zutaten",
      collapse: "{{name}} einklappen",
      edit: "{{name}} bearbeiten",
    },
    editor: {
      name: "Name",
      singularUnit: "Einheit (Singular)",
      pluralUnit: "Einheit (Plural)",
      packageSizes: "Standard-Packungsgrößen",
      packageSizesPlaceholder: "z. B. 200, 400, 500",
      packageSizesHint:
        "Diese Größen gelten, sofern für einen Supermarkt keine eigene Überschreibung hinterlegt ist.",
      resourcePriority: "Ressourcenpriorität",
      priorityNone: "Keine",
      priorityPrimary: "Primär",
      prioritySecondary: "Sekundär",
      availability: "In diesen Supermärkten erhältlich",
      availableAtMarket: "{{ingredient}} ist bei {{market}} erhältlich",
      storePackageSizesPlaceholder: "Standard",
      storePackageSizesAriaLabel:
        "Packungsgrößen für {{ingredient}} bei {{market}}",
      save: "Zutat speichern",
      nameAndUnitRequired: "Name und Einheit sind Pflichtfelder.",
      invalidPackageSizes:
        "Packungsgrößen müssen positive Zahlen sein, getrennt durch Kommas.",
      invalidStorePackageSizes:
        "Ungültige Packungsgrößen für {{market}}.",
      delete: "Zutat löschen",
      cannotDeleteInUse:
        "Diese Zutat wird noch von mindestens einem Rezept verwendet und kann nicht gelöscht werden.",
    },
    addIngredient: {
      heading: "Neue Zutat",
      name: "Name",
      unit: "Einheit",
      plural: "Plural",
      add: "Zutat hinzufügen",
    },
  },
  settings: {
    validation: {
      folderRequired: "Bitte wähle einen Ordner aus.",
      backupFolderRequired: "Bitte wähle einen Sicherungsordner aus.",
      defaultRecipeFile:
        'Verwende einen Dateinamen wie „recipes-main.json“.',
      email: "Bitte gib eine gültige E-Mail-Adresse ein.",
    },
    database: {
      folder: {
        name: "Kochbuchordner",
        description:
          "Ordner mit cookbook-library.json und einer oder mehreren recipes-*.json-Dateien.",
      },
      defaultRecipeFile: {
        name: "Standard-Rezeptdatei",
        description:
          "Diese Datei wird beim Erstellen der Beispieldatenbank angelegt.",
        placeholder: "recipes-main.json",
      },
      enableJsonBackups: {
        name: "JSON-Sicherungen erstellen",
        description:
          "Erstellt rotierende Sicherungen für JSON-Dateien, die vom Plugin geschrieben werden. Fehlende Bibliotheken können aus der neuesten gültigen Sicherung wiederhergestellt werden.",
      },
      jsonBackupCount: {
        name: "Anzahl der JSON-Sicherungen",
        description:
          "Bei zwei Sicherungen werden vorherige Dateistände behalten. Ab drei Sicherungen wird zusätzlich der gerade gespeicherte aktuelle Stand gesichert.",
      },
      backupFolder: {
        name: "Kochbuch-Sicherungsordner",
        description:
          "Ordner für rotierende JSON-Sicherungen. Empfohlen ist ein Backups-Ordner innerhalb des Kochbuchordners.",
      },
      actionsHeading: "Datenbank",
      createExample: {
        name: "Beispieldatenbank erstellen",
        description:
          "Erstellt JSON-Beispieldateien, sofern diese noch nicht vorhanden sind.",
      },
      openCookbook: {
        name: "Kochbuch öffnen",
        description:
          "Lädt die JSON-Datenbank neu und öffnet die Rezeptübersicht.",
      },
    },
    cooking: {
      showPackageSuggestions: {
        name: "Packungsvorschläge anzeigen",
        description:
          "Zeigt die kritische Packungsmenge an, welche die endgültige Rezeptskalierung verändert hat.",
      },
      showIngredientAllergens: {
        name: "Allergenhinweise anzeigen",
        description:
          "Zeigt deklarierte Allergene wie Gluten, Laktose oder Ei unter den Zutaten im Kochmodus an.",
      },
      preventSidePaneSwipes: {
        name: "Wischgesten im Kochbuch halten",
        description:
          "Verhindert, dass horizontale Wischgesten im Kochmodus auf Touch-Geräten die Seitenleisten von Obsidian öffnen.",
      },
    },
    timer: {
      heading: "Koch-Timer",
      alarmSound: {
        name: "Klingelton",
        description:
          "Optionale Sounddatei aus dem Vault. Sie wird abgespielt, wenn ein Koch-Timer abläuft.",
        placeholder: "Sounddatei auswählen…",
      },
      alarmVolume: {
        name: "Timer-Lautstärke",
        description:
          "Lautstärke des Klingeltons. Bei gesperrten Mobilgeräten kann die Wiedergabe systembedingt eingeschränkt sein.",
      },
    },
    browser: {
      allRecipesImage: {
        name: "Bild für den Button „Alle Rezepte“",
        description:
          "Optional kann ein quadratisches Bild aus dem Vault für den ersten Kategorie-Button in der Rezeptübersicht ausgewählt werden.",
        placeholder: "Bild auswählen…",
      },
    },
    shopping: {
      heading: "Einkaufsliste",
      noFavoriteStore: "Kein Favorit",
      storeMode: {
        name: "Marktstrategie",
        description:
          "Legt fest, ob der Favoritenmarkt bevorzugt, die kleinste Markt-Kombination gesucht oder Märkte direkt je Zutat angezeigt werden.",
        favoriteFirst: "Favoritenmarkt zuerst",
        fewestStores: "Möglichst wenige Märkte",
        ingredientStores: "Märkte je Zutat anzeigen",
      },
      favoriteStores: {
        heading: "Bevorzugte Märkte je Einkaufsort",
      },
      favoriteStoreForLocation:
        "Wird für „{{location}}“ im Modus „Favoritenmarkt zuerst“ bevorzugt.",
      manageIngredients: {
        name: "Zutaten, Orte und Märkte verwalten",
        description:
          "Verwaltet Zutaten, Packungsgrößen, Einkaufsorte, Supermärkte und die Marktverfügbarkeit einzelner Zutaten.",
      },
      emailRecipient: {
        name: "Empfänger für Einkaufslisten",
        description:
          "Optional. Der Versand öffnet eine vorbereitete E-Mail in der Standard-Mail-App; das Plugin versendet keine E-Mails selbst.",
        placeholder: "name@example.com",
      },
    },
    categoryButtons: {
      heading: "Kategorie-Buttons",
      emptyState:
        "Noch keine Kategorien gefunden. Erstelle oder wähle zuerst eine Kochbuchdatenbank aus.",
      description:
        "Ziehe diese Zeile, um die Reihenfolge in der Rezeptübersicht zu ändern. Optional kann ein quadratisches Kategorienbild aus dem Vault ausgewählt werden.",
      imagePlaceholder: "Kategorienbild auswählen…",
    },
    notices: {
      exampleDatabaseCreated: "Cookbook-Beispieldatenbank wurde erstellt.",
    },
  },
};
Cooking Navigator for Obsidian!

# No AI readme part (for those of you who care about):

This is my cooking plugin to personalize my cookbooks.

This is not a easy cooking plugin be aware:)

First off it can do the most things other cookbook plugins can do but you can't give your recipe stars (just delete them if you don't like them).

Under personalize I mean you can manage your guests and your shopping behavior.

- So I set up my guests, I mean all people I cook for. How much do a person eat, is one serving enough or are 2 better. Does anyone have avoidances or is allergic. Are there favorite dishes?
  - When it comes to choose the recipes I can activate guests and the cookbook applies all the values. It scales the recipes so all eaters have anough, it highlights recipes that are actually favorites and it only show recipes that doesn't hurt anyone for some reason.
- For my shopping behavior I can set favorite markets and I can give the ingredients some properties. What package sizes are available in wich stores or are there any. Is a ingredient a primary or secondary ressource wich means that you can choose a treshold and the recipe get scaled up or down because of the available package sizes. The treshold is meant to be the border where you mean your guests gets still satisfied or you choose they can starve a little bit.
 - When it comes to the shopping list it tells me if I can buy my ingredients in my favorite market or if I had to go elsewhere.

To set up a shopping list just hit the button next to the recipe.
- When you have a recipe in your shopping list you can have a look at the list.
  - You can also mark ingredients then that you have them at home and they are moved from the shopping list to a at home section beneath.
  - You can add manually things to the shopping list.
- In the settings you can set up a email adress and when in the shopping list you can hit send with email. It opens your favorite email programm and fills out the desired adress and adds the shopping list. You only need to send it now.

It is all JSON, sorry no messy thousand recipe files for you, but wait...you still can:(
- There is the cookbook-library.json it is the source for categories, guests and ingredients.
- And there are recipe-*.json files.
  - You can choose to only have one recipe JSON file but you can also have for every recipe a file.
    - And if you really like a messy file system then also choose to have 5 backups in the settings it is up to you. (See backup)
	
Backup is a setting that creates backups of your json files but only when you create or edit the files in the plugin itself.
- I personally let the AI write the JSON files. I give it 10 recipes and it writes the JSON for me but a browser AI is actually a bit tricky because the context window is really small and you have to show the scheme from the JSON and best also the cookbook-library.json so it knows wich ingredients are already available.

If this is still too easy for you:
- You have also to create your own category buttons. And your own guest buttons.

Why do I write like this do you ask?
- Because good things do need a pinch effort.

[![Cooking Navigator Demo]https://youtu.be/y_vmBqQTn-4]

---

# AI readme part (for those of you who care about):

## Cooking Navigator

**Cooking Navigator** is an Obsidian cookbook plugin for managing recipes, guests, ingredient restrictions, portions, shopping lists, supermarkets, and cooking timers.

It is designed for households where recipes need to adapt to the people eating them and to the stores where ingredients are bought.

### Features

#### Recipe browser and cooking mode

- Browse recipes by category.
- Configure custom category images and category order.
- Add recipe images before or after the ingredient overview.
- Open recipes in a distraction-reduced step-by-step cooking mode.
- Navigate cooking pages with buttons, swipe gestures, mouse dragging, or pen input.
- Show preparation, cooking, and baking durations.
- Create recipes directly inside Obsidian.
- Create new categories while creating a recipe.

#### Guest profiles and dietary restrictions

- Create and manage guest profiles.
- Configure portion weights per person.
- Add ingredient avoidances for specific recipe scopes, such as cooked dishes, baking, desserts, or drinks.
- Configure allergen intolerances, for example gluten, lactose, or egg.
- Select active guests before choosing recipes.
- Automatically hide recipes that are incompatible with selected guests.
- Define alternative ingredients that are automatically used when the original ingredient is unsuitable.
- Mark favourite recipes for guests; favourites are highlighted in the recipe browser.

#### Adaptive recipe scaling

- Scale recipes automatically based on the combined portion weights of selected guests.
- Define primary and secondary critical ingredients.
- Configure package sizes and rounding thresholds for ingredients.
- Let package sizes influence recipe scaling, for example when minced meat is only available in 400 g or 500 g packages.
- Override automatic scaling manually for individual recipes.
- Display the active scaling source in the shopping list.

#### Shopping planning

- Add or remove recipes from a persistent shopping list.
- See how many ingredients a recipe already shares with the current shopping list.
- Combine equal ingredients automatically.
- Mark ingredients as already available at home without removing their recipes.
- Add arbitrary manual shopping-list items.
- Select a shopping location.
- Define supermarkets for each location.
- Configure ingredient availability per supermarket.
- Configure store-specific package sizes.
- Choose between different shopping strategies:
  - favourite store first;
  - smallest possible store combination;
  - show available stores for every ingredient.
- Send the generated shopping list through your default email application.

#### Preparation recipes

Preparation recipes allow recipes to produce ingredients that can be used by other recipes.

Examples:

- simple syrup for cocktails;
- dough for pizza or bread;
- sauces, stocks, dressings, dips, or marinades;
- homemade cocktail ingredients.

When an ingredient has a linked preparation recipe, the shopping list can either include the finished product or expand it into the correctly scaled ingredients needed to prepare it yourself.

#### Cooking timers

- Add timers to recipe steps.
- Start, pause, resume, restart, extend, or cancel timers.
- Run multiple timers in parallel.
- Keep active timers visible while navigating between cooking pages.
- Optionally configure an alarm sound from your vault.
- Timer duration is calculated using an absolute end time to reduce countdown drift.

#### Backups

The plugin can create rotating JSON backups for files it writes itself.

- Configure between two and five backup slots.
- Invalid backup files are ignored safely.
- Restore the newest valid `cookbook-library.json` backup from the Cookbook error screen.
- Backups are only created when content is changed through the plugin. Editing JSON files manually is not automatically backed up by Cooking Navigator.

---

## Data storage

All Cookbook data is stored as JSON files inside your Obsidian vault.

### `cookbook-library.json`

The library file contains shared data:

- recipe categories;
- restriction scopes;
- allergens;
- ingredient definitions;
- guests;
- shopping locations;
- supermarkets.

### `recipes-*.json`

Recipes are loaded from every JSON file whose filename starts with `recipes-`.

You can keep all recipes in one file, for example:

```text
Cookbook/recipes-main.json
```

Or split them across multiple files:

```text
Cookbook/recipes-drinks.json
Cookbook/recipes-desserts.json
Cookbook/recipes-main-dishes.json
```

---

## Getting started

1. Install or copy the plugin into your Obsidian plugins directory.
2. Enable **Cooking Navigator** in Obsidian.
3. Open the plugin settings.
4. Choose the folder containing your cookbook JSON files.
5. Either:
   - create the included example database; or
   - add your own `cookbook-library.json` and `recipes-*.json` files.
6. Open the Cookbook from the ribbon icon or the command palette.

---

## Development

Install dependencies:

```bash
npm install
```

Start development mode:

```bash
npm run dev
```

Create a production build:

```bash
npm run build
```

Run the TypeScript check:

```bash
npm run check
```

Run ESLint:

```bash
npm run lint
```

---

## Notes

- Cooking Navigator is intentionally JSON-first. Your recipes remain normal vault files that can be versioned, edited manually, or generated externally.
- The built-in recipe editor is useful for creating recipes directly in Obsidian, while manual JSON editing remains fully supported.
- When manually editing the library, make sure IDs remain unique. Ingredient IDs, recipe IDs, category IDs, guest IDs, market IDs, and location IDs are used as references throughout the plugin.
- The plugin currently supports English and German and follows Obsidian’s configured interface language.

 ---
 
## JSON schema

The following schemas document every currently supported field in
`cookbook-library.json` and `recipes-*.json`.

They use **JSON Schema Draft 2020-12** and can be used by editors or CI tools
that support JSON Schema validation.

> [!NOTE]
> JSON Schema validates structure, data types, and simple value constraints.
> It cannot fully validate cross-file rules of Cooking Navigator. In
> particular, make sure manually that:
>
> - IDs are unique within their respective collections;
> - recipe ingredient IDs refer to existing library ingredients;
> - category, restriction-scope, allergen, location, and market IDs refer to
>   existing library entries;
> - `produces.ingredientId` matches the ingredient used by recipes that link
>   to this recipe through `preparationRecipeId`;
> - preparation recipes do not form cycles.

### `cookbook-library.json`

```json
{
  "title": "Cooking Navigator library",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "version",
    "categories",
    "restrictionScopes",
    "ingredients",
    "people"
  ],
  "properties": {
    "version": {
      "const": 1
    },
    "categories": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/category"
      }
    },
    "restrictionScopes": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/restrictionScope"
      }
    },
    "allergens": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/allergen"
      }
    },
    "shoppingLocations": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/shoppingLocation"
      }
    },
    "markets": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/market"
      }
    },
    "ingredients": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/ingredient"
      }
    },
    "people": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/person"
      }
    }
  },
  "$defs": {
    "id": {
      "type": "string",
      "minLength": 1
    },
    "color": {
      "type": "string",
      "minLength": 1
    },
    "positiveNumber": {
      "type": "number",
      "exclusiveMinimum": 0
    },
    "category": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "id",
        "name"
      ],
      "properties": {
        "id": {
          "$ref": "#/$defs/id"
        },
        "name": {
          "type": "string",
          "minLength": 1
        },
        "color": {
          "$ref": "#/$defs/color"
        }
      }
    },
    "restrictionScope": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "id",
        "name"
      ],
      "properties": {
        "id": {
          "$ref": "#/$defs/id"
        },
        "name": {
          "type": "string",
          "minLength": 1
        },
        "description": {
          "type": "string"
        }
      }
    },
    "allergen": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "id",
        "name"
      ],
      "properties": {
        "id": {
          "$ref": "#/$defs/id"
        },
        "name": {
          "type": "string",
          "minLength": 1
        }
      }
    },
    "shoppingLocation": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "id",
        "name"
      ],
      "properties": {
        "id": {
          "$ref": "#/$defs/id"
        },
        "name": {
          "type": "string",
          "minLength": 1
        }
      }
    },
    "market": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "id",
        "name"
      ],
      "properties": {
        "id": {
          "$ref": "#/$defs/id"
        },
        "name": {
          "type": "string",
          "minLength": 1
        },
        "locationId": {
          "$ref": "#/$defs/id"
        },
        "color": {
          "$ref": "#/$defs/color"
        }
      }
    },
    "ingredient": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "id",
        "name",
        "defaultUnit",
        "resourcePriority"
      ],
      "properties": {
        "id": {
          "$ref": "#/$defs/id"
        },
        "name": {
          "type": "string",
          "minLength": 1
        },
        "defaultUnit": {
          "type": "string",
          "minLength": 1
        },
        "defaultUnitPlural": {
          "type": "string",
          "minLength": 1
        },
        "resourcePriority": {
          "enum": [
            "none",
            "primary",
            "secondary"
          ]
        },
        "allergenIds": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/id"
          }
        },
        "storeIds": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/id"
          }
        },
        "packageSizes": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/positiveNumber"
          }
        },
        "storePackageSizes": {
          "type": "object",
          "additionalProperties": {
            "type": "array",
            "items": {
              "$ref": "#/$defs/positiveNumber"
            }
          }
        },
        "packageRoundUpThreshold": {
          "type": "number",
          "minimum": 0,
          "maximum": 1
        }
      }
    },
    "avoidance": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "scopeId",
        "ingredientIds"
      ],
      "properties": {
        "scopeId": {
          "$ref": "#/$defs/id"
        },
        "ingredientIds": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/id"
          }
        }
      }
    },
    "person": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "id",
        "name",
        "color",
        "eaterWeight",
        "avoidances",
        "favoriteRecipeIds"
      ],
      "properties": {
        "id": {
          "$ref": "#/$defs/id"
        },
        "name": {
          "type": "string",
          "minLength": 1
        },
        "avatarUrl": {
          "type": "string",
          "minLength": 1
        },
        "color": {
          "$ref": "#/$defs/color"
        },
        "eaterWeight": {
          "$ref": "#/$defs/positiveNumber"
        },
        "avoidances": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/avoidance"
          }
        },
        "intoleranceAllergenIds": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/id"
          }
        },
        "favoriteRecipeIds": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/id"
          }
        }
      }
    }
  }
}
```

### `recipes-*.json`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Cooking Navigator recipe document",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "version",
    "recipes"
  ],
  "properties": {
    "version": {
      "const": 1
    },
    "recipes": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/recipe"
      }
    }
  },
  "$defs": {
    "id": {
      "type": "string",
      "minLength": 1
    },
    "positiveNumber": {
      "type": "number",
      "exclusiveMinimum": 0
    },
    "ingredient": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "ingredientId",
        "amount"
      ],
      "properties": {
        "ingredientId": {
          "$ref": "#/$defs/id"
        },
        "preparationRecipeId": {
          "$ref": "#/$defs/id"
        },
        "alternativeIngredientId": {
          "$ref": "#/$defs/id"
        },
        "amount": {
          "$ref": "#/$defs/positiveNumber"
        },
        "unit": {
          "type": "string",
          "minLength": 1
        },
        "unitPlural": {
          "type": "string",
          "minLength": 1
        },
        "Suffix": {
          "type": "string",
          "minLength": 1,
          "description": "Recipe-specific text appended to the ingredient name."
        },
        "note": {
          "type": "string",
          "minLength": 1
        }
      }
    },
    "step": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "ingredients",
        "instructions"
      ],
      "properties": {
        "title": {
          "type": "string",
          "minLength": 1
        },
        "ingredients": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/ingredient"
          }
        },
        "instructions": {
          "type": "array",
          "items": {
            "type": "string",
            "minLength": 1
          }
        },
        "timerMinutes": {
          "$ref": "#/$defs/positiveNumber"
        }
      }
    },
    "produces": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "ingredientId",
        "amount"
      ],
      "properties": {
        "ingredientId": {
          "$ref": "#/$defs/id"
        },
        "amount": {
          "$ref": "#/$defs/positiveNumber"
        },
        "unit": {
          "type": "string",
          "minLength": 1
        }
      }
    },
    "recipe": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "id",
        "title",
        "categoryIds",
        "baseEaters",
        "restrictionScopeIds",
        "ingredients",
        "steps"
      ],
      "properties": {
        "id": {
          "$ref": "#/$defs/id"
        },
        "title": {
          "type": "string",
          "minLength": 1
        },
        "categoryIds": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/id"
          }
        },
        "baseEaters": {
          "$ref": "#/$defs/positiveNumber"
        },
        "produces": {
          "$ref": "#/$defs/produces"
        },
        "restrictionScopeIds": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/id"
          }
        },
        "imageUrl": {
          "type": "string",
          "minLength": 1
        },
        "imagePlacement": {
          "enum": [
            "cover",
            "after-ingredients"
          ]
        },
        "prepMinutes": {
          "$ref": "#/$defs/positiveNumber"
        },
        "cookMinutes": {
          "$ref": "#/$defs/positiveNumber"
        },
        "bakeMinutes": {
          "$ref": "#/$defs/positiveNumber"
        },
        "ingredients": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/ingredient"
          }
        },
        "steps": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/step"
          }
        }
      }
    }
  }
}
```

`Suffix` intentionally starts with an uppercase `S` because this is the
existing JSON field name used by Cooking Navigator. It is kept for backwards
compatibility.

---
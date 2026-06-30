# Widget Setup Guide

This guide explains how to create and manage widgets in the widgets repository.

## What is This?

This repository provides a system for managing widget configurations. Each widget is defined by:
- A `widget.json` configuration file with metadata (title, description, version, etc.)
- A `dist/content.html` entry file containing the widget's complete content (HTML, CSS, and JavaScript). The **service pulls only the directory at `source.path`** (e.g. `dist/`), so only that directory is shipped—source code can stay outside it.
- Optional additional files (for React widgets, build configurations, etc.)

**Important**: The `content.html` file must be completely self-contained. All HTML, CSS, and JavaScript must be included directly in this file. **Relative file references** (such as `<link rel="stylesheet" href="styles.css">` or `<script src="script.js">`) will not work, as the widget system only serves the `content.html` file itself. However, **publicly available endpoints** (absolute URLs like `https://cdn.example.com/style.css` or `https://fonts.googleapis.com/css2?family=...`) are accessible and can be used.

**Embedding Requirement**: Widgets are embedded into existing HTML pages, so the `content.html` file must be an HTML fragment. Do not include `<html>`, `<head>`, or `<body>` tags, as these will conflict with the host page structure.

The build script automatically scans all widgets, validates their configurations, and generates a unified `widget_registry.json` file that can be consumed by applications that need to display or manage these widgets.

## Overview

The widget registry system uses individual configuration files for each widget, which are then automatically merged into a single `widget_registry.json` file using the `bin/build-registry.sh` script. This approach provides:

- **Centralized Management**: All widgets are organized in the `widgets/` directory
- **Automatic Validation**: The build script ensures all configurations are valid
- **Version Control**: Each widget can be versioned independently
- **Easy Maintenance**: Add, update, or remove widgets without manually editing the registry

## File Structure

```
widgets-repo-template/
├── bin/
│   └── build-registry.sh    # Script to build widget_registry.json (defaults at top of file)
├── widget_registry.json     # Generated registry (DO NOT EDIT MANUALLY)
└── widgets/
    ├── WIDGET_SETUP.md      # This documentation file
    ├── my_widget/
    │   ├── widget.json      # Widget-specific configuration
    │   └── dist/
    │       └── content.html # Widget HTML entry (service pulls only dist/)
    └── another_widget/
        ├── widget.json
        └── dist/
            └── content.html
```

## Prerequisites

Before creating widgets, ensure you have:

- `jq` installed for JSON processing
  - macOS: `brew install jq`
  - Linux: `sudo apt-get install jq` or `sudo yum install jq`
- Basic knowledge of HTML/CSS/JavaScript (depending on your widget type)
- Git (for version control, if using)

## Content File Requirements

### content.html

The `content.html` file is the single source of truth for your widget's content. **All HTML, CSS, and JavaScript must be included directly in this file.**

**Critical Requirements:**
- **HTML Fragment**: Widgets are embedded into existing pages, so do not include `<html>`, `<head>`, or `<body>` tags
- **Self-contained**: All styles must be in `<style>` tags within the HTML fragment, or use publicly available CDN resources
- **Inline JavaScript**: All scripts must be in `<script>` tags within the HTML fragment, or use publicly available CDN resources
- **No relative file references**: Relative file references (e.g., `href="styles.css"`, `src="./script.js"`, `src="../lib.js"`) will not work, as the widget system only serves the `content.html` file itself
- **Public endpoints are accessible**: Absolute URLs to publicly available resources (e.g., `https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css`, `https://fonts.googleapis.com/css2?family=...`) will work and can be used

**Example of correct structure (with inline styles/scripts):**
```html
<style>
  .my-widget {
    color: blue;
    padding: 20px;
  }
</style>
<div class="my-widget">
  <h1>My Widget</h1>
</div>
<script>
  console.log('Widget loaded');
</script>
```

**Example using publicly available resources:**
```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap">
<style>
  .my-widget {
    font-family: 'Roboto', sans-serif;
    color: blue;
    padding: 20px;
  }
</style>
<div class="my-widget">
  <h1>My Widget</h1>
</div>
<script src="https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js"></script>
<script>
  console.log('Widget loaded with lodash:', _.VERSION);
</script>
```

**For React/Modern Frameworks:**
If you're using a build tool (like Vite, Webpack, etc.), ensure your build process bundles all dependencies and outputs a single, self-contained HTML fragment. The build output should include all CSS and JavaScript inline or embedded, not as separate files. The output must be an HTML fragment (no `<html>`, `<head>`, or `<body>` tags) that can be embedded into existing pages.

## Configuration File

### Defaults (in build script)

All defaults live at the top of `bin/build-registry.sh`: a **widget template** (containers, widgetsLibrary, settings) and **content-block defaults** (method, requiresAuthentication, cacheStrategy) for widgets that use a `content` block. The build script deep-merges each widget's `widget.json` over this template, so you can override any default at any depth (e.g. only `settings.movable`). There is no external defaults file.

### widget.json

Widget-specific configuration. Each `widget.json` must include either a **`source`** block (for repo-hosted content) or a **`content`** block (for external URLs). Paths in `source` and `imageSrc` are relative to the widget's directory; the build script resolves them to repository-root-relative paths in `widget_registry.json`. Use **only one** of `imageSrc` or `imageName` per widget; if both are set, the build fails.

**Required fields:**
- `version` - Semantic version (e.g., "1.0.0")
- `title` - Display name of the widget
- `description` - Brief description of the widget
- `source` or `content` - Exactly one is required (see below)

**Source block (repo-hosted):**
```json
{
  "version": "1.0.0",
  "title": "My Widget",
  "description": "Description of what this widget does",
  "category": "Demo",
  "imageName": "my_widget",
  "source": {
    "path": "dist",
    "entry": "content.html"
  }
}
```
- `source.path` - Directory containing the entry file, relative to this widget's directory. Use `"dist"` so the service pulls only that directory (recommended); the entry file then lives at `dist/content.html`.
- `source.entry` - **Required.** HTML entry file name, relative to `path` (e.g. `"content.html"`).

**Content block (external):** Use `"content": { "endpoint": "https://...", "method": "GET", ... }` for widgets served from an external URL. The build script merges defaults for `method`, `requiresAuthentication`, and `cacheStrategy` when not set.

**Optional fields:**
- `category` - Widget category
- `imageName` or `imageSrc` - **Only one allowed.** `imageName` is a built-in thumbnail identifier (e.g. `banner`). `imageSrc` is a custom thumbnail: either an absolute URL or a path relative to the widget directory (e.g. `preview.png` or `./images/preview.png`). Relative paths are resolved to repo-root-relative in the registry; the build script validates that the file exists and is 512 KB or smaller.
- `configuration` - Schema for user-configurable properties (see [Dynamic Widget Configuration](#dynamic-widget-configuration))
- `defaultConfig` - Default values for configurable properties
- Any other widget template field (containers, widgetsLibrary, settings, etc.) can be overridden; widget.json is deep-merged over the script defaults

## Dynamic Widget Configuration

Widgets can define configurable properties that allow users to customize widget behavior and appearance when adding the widget to a page. This is done through the `configuration` and `defaultConfig` fields in `widget.json`.

### Configuration Schema

The `configuration` field defines the blueprint for customizable properties:

```json
{
  "configuration": {
    "properties": [
      {
        "name": "propertyName",
        "label": "Display Label",
        "type": "text",
        "description": "Optional description",
        "defaultValue": "default value",
        "rules": {
          "required": true,
          "minLength": 1
        }
      }
    ]
  },
  "defaultConfig": {
    "propertyName": "default value"
  }
}
```

**Configuration Fields:**
- `properties` - An array of ConfigField definitions

**ConfigField Required Properties:**
- `name` - The property identifier used in `content.html` template variables
- `label` - Display label shown in the configuration UI
- `type` - The field type (see supported types below)

**ConfigField Optional Properties:**
- `description` - Helper text for the configuration UI
- `defaultValue` - Default value shown in the configuration UI
- `rules` - Validation rules such as `required`, `minLength`, `maxLength`, `minimum`, and `maximum`
- `options` - Required for `select` fields, array of `{ "value", "label" }`

**defaultConfig:**
- Initial default values for widget configuration properties
- Applied automatically when a new widget instance is added to a layout
- Values must match the field names defined in `configuration.properties`

### Supported ConfigField Types

| Type | Description |
|------|-------------|
| `text` | Single line text input |
| `number` | Numeric input field |
| `color` | Color picker |
| `date` | Date picker |
| `boolean` | Checkbox or toggle |
| `select` | Select dropdown |

### Template Variables in content.html

When a widget has configuration properties, you can use template variables in `content.html` to render dynamic content. Template variables use double curly brace syntax: `{{ variable_name }}`.

**Example content.html with template variables:**
```html
<style>
  .banner {
    background-color: {{ background_color }};
    color: {{ text_color }};
    padding: 20px;
  }
</style>
<div class="banner">
  <h1>{{ title }}</h1>
  <p>{{ subtitle }}</p>
</div>
```

The host application will replace these template variables with the actual configuration values when rendering the widget.

### Complete Configurable Widget Example

**widget.json:**
```json
{
  "version": "1.0.0",
  "title": "Card Grid",
  "description": "A configurable card grid with dynamic layout and styling",
  "category": "Content",
  "imageName": "card_grid",
  "configuration": {
    "properties": [
      {
        "name": "cards_per_row",
        "label": "Cards Per Row",
        "type": "number",
        "defaultValue": 3,
        "rules": {
          "required": true,
          "minimum": 1,
          "maximum": 6
        }
      },
      {
        "name": "card_background",
        "label": "Card Background",
        "type": "color",
        "defaultValue": "#ffffff"
      },
      {
        "name": "accent_color",
        "label": "Accent Color",
        "type": "color",
        "defaultValue": "#3b82f6"
      },
      {
        "name": "card_style",
        "label": "Card Style",
        "type": "select",
        "defaultValue": "shadow",
        "options": [
          { "value": "flat", "label": "Flat" },
          { "value": "shadow", "label": "Shadow" },
          { "value": "bordered", "label": "Bordered" }
        ]
      }
    ]
  },
  "defaultConfig": {
    "cards_per_row": 3,
    "card_background": "#ffffff",
    "accent_color": "#3b82f6",
    "card_style": "shadow"
  }
}
```

**content.html:**
```html
<style>
  .card-grid {
    display: grid;
    grid-template-columns: repeat({{ cards_per_row }}, 1fr);
    gap: 20px;
  }

  .card {
    background-color: {{ card_background }};
    padding: 24px;
    border-radius: 8px;
  }

  .card-style-shadow .card {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
  .card-style-bordered .card {
    border: 2px solid {{ accent_color }};
  }
</style>

<div class="card-grid card-style-{{ card_style }}">
  <div class="card">Card 1</div>
  <div class="card">Card 2</div>
  <div class="card">Card 3</div>
</div>
```

## Creating a New Widget

1. **Create a new directory** in `widgets/`:
   ```bash
   mkdir widgets/my_new_widget
   ```

2. **Create `widget.json`** with your widget configuration (use `"path": "dist"` so the service pulls only the dist directory):
   ```bash
   cat > widgets/my_new_widget/widget.json << 'EOF'
   {
     "version": "1.0.0",
     "title": "My New Widget",
     "description": "A widget that does amazing things",
     "category": "Demo",
     "imageName": "my_new_widget",
     "source": { "path": "dist", "entry": "content.html" }
   }
   EOF
   ```

3. **Create `dist/content.html`** with your widget HTML fragment (including all CSS and JavaScript):
   ```bash
   mkdir -p widgets/my_new_widget/dist
   cat > widgets/my_new_widget/dist/content.html << 'EOF'
   <style>
     .my-widget {
       padding: 20px;
       background-color: #f0f0f0;
     }
   </style>
   <div class="my-widget">
     <h1>My New Widget</h1>
     <p>Widget content goes here</p>
   </div>
   <script>
     console.log('Widget initialized');
   </script>
   EOF
   ```
   
   **Remember**: 
   - Relative file references (e.g., `href="styles.css"`, `src="./script.js"`) will not work
   - Publicly available endpoints (absolute URLs like `https://cdn.example.com/style.css`) are accessible and can be used
   - Do not include `<html>`, `<head>`, or `<body>` tags, as widgets are embedded into existing pages

4. **Build the registry**:
   ```bash
   ./bin/build-registry.sh
   ```

5. **Commit your changes**:
   ```bash
   git add widgets/my_new_widget/
   git commit -m "Add my_new_widget"
   git push
   ```

## Updating an Existing Widget

1. **Edit the widget files**:
   - Modify `widgets/my_widget/widget.json` (don't forget to bump version!)
   - Or modify `widgets/my_widget/dist/content.html`

2. **Rebuild the registry**:
   ```bash
   ./bin/build-registry.sh
   ```

3. **Commit your changes**:
   ```bash
   git add widgets/my_widget/
   git add widget_registry.json
   git commit -m "Update my_widget to v1.0.1"
   git push
   ```

## Build Script Usage

The `bin/build-registry.sh` script supports several options:

### Standard Build
```bash
./bin/build-registry.sh
```
Generates `widget_registry.json` from all widget configurations.

### Dry Run
```bash
./bin/build-registry.sh --dry-run
```
Preview the output without writing to the file.

### Validate
```bash
./bin/build-registry.sh --validate
```
Validates the existing `widget_registry.json` file.

### Help
```bash
./bin/build-registry.sh --help
```
Display usage information.

## How It Works

1. **Uses** built-in defaults at the top of `bin/build-registry.sh` (widget template and content-block defaults)
2. **Scans** the `widgets/` directory for subdirectories
3. **Reads** each widget's `widget.json` configuration
4. **Deep-merges** each widget over the default template, then sets `type`, resolved `source` or `content`, and (when set) resolved `imageSrc`; the registry output has at most one of `imageSrc` or `imageName`
5. **Validates** required fields (including `source.entry` when a widget has a `source` block), mutual exclusivity of `imageSrc` and `imageName`, and for relative `imageSrc` that the thumbnail file exists and is ≤512 KB
6. **Generates** the final `widget_registry.json`

### Auto-Generated and Resolved Fields

- `type`: Derived from the directory name (e.g., `my_widget`)
- `source.path` and `source.entry`: Resolved from widget.json (widget-dir-relative) to repository-root-relative. For example, `"path": "dist"` and `"entry": "content.html"` in `widgets/demo_widget/widget.json` become `"path": "widgets/demo_widget/dist"`, `"entry": "content.html"` in the registry.
- `imageSrc`: If set in widget.json, either kept as-is (absolute URL) or resolved to a repo-root-relative path (relative to widget dir). The registry never has both `imageSrc` and `imageName`; when `imageSrc` is set, `imageName` is omitted.

## Validation Rules

The build script validates:

- Required files exist (`widget.json`, and for `source` widgets the entry file at `source.path`/`source.entry`, e.g. `dist/content.html`)
- JSON is valid
- Required fields are present (`version`, `title`, `description`, and either `source` or `content`)
- At most one of `imageSrc` or `imageName` is set in widget.json (build fails if both are set)
- Paths in `source.path` and `imageSrc` do not contain `..` or start with `/`
- For relative `imageSrc`, the thumbnail file exists and is 512 KB or smaller
- Generated registry is valid JSON

## Troubleshooting

### Script fails with "jq: command not found"

The build script requires `jq` for JSON processing. Install it:

- **macOS**: `brew install jq`
- **Linux**: `sudo apt-get install jq` or `sudo yum install jq`
- **Windows**: Download from [jq's official website](https://stedolan.github.io/jq/download/)

### Script fails with "Missing required field"

Ensure your `widget.json` includes all required fields:
- `version`
- `title`
- `description`

### Widget not showing up in registry

1. Check directory structure is correct (e.g. `dist/content.html` under the widget directory)
2. Verify `widget.json` exists and is valid JSON
3. Verify the entry file exists at `source.path`/`source.entry` (e.g. `dist/content.html`)
4. Run with `--dry-run` to see detailed error messages

## Best Practices

1. **Always bump version** when making changes to a widget
2. **Use semantic versioning** (MAJOR.MINOR.PATCH)
3. **Run the build script** before committing
4. **Don't edit `widget_registry.json` manually** - it will be overwritten
5. **Keep widget names simple** - they become the `type` field (use lowercase, underscores)
6. **Test locally** with `--dry-run` before pushing
7. **Keep the entry file (e.g. dist/content.html) self-contained** - Include all CSS and JavaScript inline, or use publicly available CDN resources; avoid relative file references
8. **Use HTML fragments only** - Do not include `<html>`, `<head>`, or `<body>` tags, as widgets are embedded into existing pages
9. **Use absolute URLs for external resources** - Relative file references won't work, but publicly available endpoints (CDNs, fonts, etc.) are accessible

## Examples

See the existing widgets in the `widgets/` directory for examples:

- `widgets/demo_widget/` - A simple widget example with basic HTML content
  - Demonstrates the minimal required structure: `widget.json` and `dist/content.html` with `source.path` set to `"dist"`
  - Good starting point for understanding the basic widget format

- `widgets/react_hello_world/` - A React-based widget example using Vite
  - Shows how to integrate a modern JavaScript framework
  - Build outputs to `dist/content.html`; includes build configuration (`vite.config.ts`, `package.json`)
  - Demonstrates how to bundle React components into a widget

- `widgets/card_grid/` - A configurable card grid widget with dynamic layout and styling
  - Demonstrates the `configuration` and `defaultConfig` fields
  - Shows how to use template variables (`{{ variable_name }}`) in the entry file (dist/content.html)
  - Includes multiple configuration types: number, color, and select
  - Well-commented HTML showing exactly how each config variable is used


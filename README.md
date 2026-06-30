# Widgets Repository Template

A template repository for managing and organizing widget configurations with automated registry generation. This system allows you to maintain individual widget configurations that are automatically merged into a single `widget_registry.json` file for easy consumption.

## Features

- **Automated Registry Generation** - Build `widget_registry.json` from individual widget configs
- **Validation** - Built-in validation ensures configs are correct
- **Relative Path Endpoints** - Generates relative paths for widget content files
- **Version Control** - Each widget can be versioned independently
- **Easy Maintenance** - Add, update, or remove widgets without manual registry editing

## Quick Start

1. **Install dependencies** (if needed):
   ```bash
   # macOS
   brew install jq
   
   # Linux
   sudo apt-get install jq  # or: sudo yum install jq
   ```

2. **Build the registry**:
   ```bash
   ./bin/build-registry.sh
   ```

3. **View examples**:
   - Check `widgets/demo_widget/` for a simple HTML widget
   - Check `widgets/react_hello_world/` for a React-based widget

## Documentation

For complete documentation on creating widgets, configuration, and usage, see [widgets/WIDGET_SETUP.md](widgets/WIDGET_SETUP.md).

## Files

- `bin/build-registry.sh` - Registry build script (defaults at top of file; no external config)
- `widgets/WIDGET_SETUP.md` - Complete setup and usage documentation
- `widget_registry.json` - Generated registry (auto-updated, do not edit manually)
- `widgets/` - Individual widget directories; each widget has `widget.json` and `dist/content.html` (the service pulls only the `dist/` directory per widget)

## Requirements

- `jq` for JSON processing
  - macOS: `brew install jq`
  - Linux: `apt-get install jq` or `yum install jq`

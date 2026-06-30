#!/bin/bash

# build-registry.sh
# Generates widget_registry.json by deep-merging the default widget template
# with each widgets/<name>/widget.json, resolving paths from widget-dir-relative
# to repository-root-relative. Each widget.json must include either a "source"
# block (repo-hosted) or a "content" block (external).

set -e

# -----------------------------------------------------------------------------
# Defaults (widget template + content-block). Edit here; no external config file.
# -----------------------------------------------------------------------------

DEFAULT_CONTAINERS='["Full width"]'
DEFAULT_WIDGETS_LIBRARY="true"
DEFAULT_SETTINGS='{"configurable":true,"editable":true,"removable":true,"shared":false,"movable":false}'

CONTENT_DEFAULT_METHOD="GET"
CONTENT_DEFAULT_REQUIRES_AUTH="false"
CONTENT_DEFAULT_CACHE_STRATEGY="no-cache"

# -----------------------------------------------------------------------------

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

WIDGETS_DIR="widgets"
OUTPUT_FILE="widget_registry.json"

DRY_RUN=false
VALIDATE_ONLY=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --validate)
      VALIDATE_ONLY=true
      shift
      ;;
    --help)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --dry-run    Preview the output without writing to file"
      echo "  --validate   Validate existing widget_registry.json"
      echo "  --help       Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Run '$0 --help' for usage information"
      exit 1
      ;;
  esac
done

error() {
  echo -e "${RED}ERROR:${NC} $1" >&2
}

success() {
  echo -e "${GREEN}SUCCESS:${NC} $1"
}

warning() {
  echo -e "${YELLOW}WARNING:${NC} $1"
}

if ! command -v jq &> /dev/null; then
  error "jq is required but not installed. Please install it:"
  echo "  macOS: brew install jq"
  echo "  Linux: apt-get install jq or yum install jq"
  exit 1
fi

if [ "$VALIDATE_ONLY" = true ]; then
  if [ ! -f "$OUTPUT_FILE" ]; then
    error "File $OUTPUT_FILE does not exist"
    exit 1
  fi
  if ! jq empty "$OUTPUT_FILE" 2>/dev/null; then
    error "Invalid JSON in $OUTPUT_FILE"
    exit 1
  fi
  widget_count=$(jq '.widgets | length' "$OUTPUT_FILE")
  bad=0
  for i in $(seq 0 $((widget_count - 1))); do
    w=$(jq -c ".widgets[$i]" "$OUTPUT_FILE")
    has_source=$(echo "$w" | jq 'has("source")')
    has_content=$(echo "$w" | jq 'has("content")')
    if [ "$has_source" = "true" ] && [ "$has_content" = "true" ]; then
      error "Widget at index $i has both source and content"
      bad=1
    elif [ "$has_source" != "true" ] && [ "$has_content" != "true" ]; then
      error "Widget at index $i has neither source nor content"
      bad=1
    fi
    if [ "$has_source" = "true" ]; then
      sp=$(echo "$w" | jq -r '.source.path')
      if [ "$sp" != "null" ] && [ -n "$sp" ]; then
        if [[ "$sp" == *".."* ]] || [[ "$sp" == /* ]]; then
          error "Widget at index $i has invalid source.path: $sp"
          bad=1
        fi
      fi
    fi
  done
  if [ $bad -eq 1 ]; then
    exit 1
  fi
  success "Valid JSON in $OUTPUT_FILE"
  success "Found $widget_count widgets in registry"
  exit 0
fi

if [ ! -d "$WIDGETS_DIR" ]; then
  error "Widgets directory $WIDGETS_DIR not found"
  exit 1
fi

DEFAULT_BASE=$(jq -n -c \
  --argjson containers "$DEFAULT_CONTAINERS" \
  --argjson widgetsLibrary "$DEFAULT_WIDGETS_LIBRARY" \
  --argjson settings "$DEFAULT_SETTINGS" \
  '{containers: $containers, widgetsLibrary: $widgetsLibrary, settings: $settings}')
success "Using built-in defaults"

normalize_widget_path() {
  local raw="$1"
  local name="$2"
  if [[ "$raw" == *".."* ]] || [[ "$raw" == /* ]]; then
    echo ""
    return 1
  fi
  raw="${raw#/}"
  raw="${raw%/}"
  if [ -z "$raw" ] || [ "$raw" = "." ]; then
    echo "${WIDGETS_DIR}/${name}"
  else
    echo "${WIDGETS_DIR}/${name}/${raw}"
  fi
}

WIDGETS_JSON="[]"
widget_count=0
error_count=0

for widget_dir in "$WIDGETS_DIR"/*; do
  [ -d "$widget_dir" ] || continue
  widget_name=$(basename "$widget_dir")
  widget_config="$widget_dir/widget.json"

  echo ""
  echo "Processing widget: $widget_name"

  if [ ! -f "$widget_config" ]; then
    error "  Missing widget.json in $widget_dir"
    ((error_count++))
    continue
  fi

  if ! jq empty "$widget_config" 2>/dev/null; then
    error "  Invalid JSON in $widget_config"
    ((error_count++))
    continue
  fi

  version=$(jq -r '.version // empty' "$widget_config")
  title=$(jq -r '.title // empty' "$widget_config")
  description=$(jq -r '.description // empty' "$widget_config")

  if [ -z "$version" ]; then
    error "  Missing required field: version"
    ((error_count++))
    continue
  fi
  if [ -z "$title" ]; then
    error "  Missing required field: title"
    ((error_count++))
    continue
  fi
  if [ -z "$description" ]; then
    error "  Missing required field: description"
    ((error_count++))
    continue
  fi

  has_source=$(jq 'if .source != null then true else false end' "$widget_config")
  has_content=$(jq 'if .content != null and (.content.endpoint | type == "string") and (.content.endpoint | startswith("http")) then true else false end' "$widget_config")

  if [ "$has_source" = "true" ] && [ "$has_content" = "true" ]; then
    error "  widget.json must not have both source and content"
    ((error_count++))
    continue
  fi

  if [ "$has_source" != "true" ] && [ "$has_content" != "true" ]; then
    error "  widget.json must include either source or content"
    ((error_count++))
    continue
  fi

  image_src=$(jq -r '.imageSrc // empty' "$widget_config")
  image_name=$(jq -r '.imageName // empty' "$widget_config")
  [ "$image_src" = "null" ] && image_src=""
  [ "$image_name" = "null" ] && image_name=""
  if [ -n "$image_src" ] && [ -n "$image_name" ]; then
    error "  Widget has both imageSrc and imageName; only one is allowed"
    ((error_count++))
    continue
  fi

  image_src_resolved=""
  if [ -n "$image_src" ]; then
    if [[ "$image_src" == http://* ]] || [[ "$image_src" == https://* ]]; then
      image_src_resolved="$image_src"
    else
      if [[ "$image_src" == *".."* ]] || [[ "$image_src" == /* ]]; then
        error "  Invalid imageSrc (no .. or leading /): $image_src"
        ((error_count++))
        continue
      fi
      image_src_normalized="${image_src#./}"
      image_src_resolved="${WIDGETS_DIR}/${widget_name}/${image_src_normalized}"
      if [ ! -f "$image_src_resolved" ]; then
        error "  Thumbnail file not found: $image_src_resolved"
        ((error_count++))
        continue
      fi
      size_bytes=$(stat -f%z "$image_src_resolved" 2>/dev/null || stat -c%s "$image_src_resolved" 2>/dev/null)
      if [ -n "$size_bytes" ] && [ "$size_bytes" -gt 524288 ]; then
        error "  Thumbnail exceeds 512 KB: $image_src_resolved"
        ((error_count++))
        continue
      fi
    fi
  fi

  if [ "$has_source" = "true" ]; then
    src_path=$(jq -r '.source.path // "."' "$widget_config")
    src_entry=$(jq -r '.source.entry // empty' "$widget_config")
    if [ -z "$src_entry" ] || [ "$src_entry" = "null" ]; then
      error "  source.entry is required when source block is present"
      ((error_count++))
      continue
    fi

    repo_path=$(normalize_widget_path "$src_path" "$widget_name") || true
    if [ -z "$repo_path" ]; then
      error "  Invalid source.path (no .. or leading /): $src_path"
      ((error_count++))
      continue
    fi

    if [ "$src_path" = "." ] || [ -z "$src_path" ] || [ "$src_path" = "./" ]; then
      check_dir="$widget_dir"
      entry_file="$widget_dir/$src_entry"
    else
      check_dir="$widget_dir/$src_path"
      entry_file="$widget_dir/$src_path/$src_entry"
    fi

    if [ ! -d "$check_dir" ]; then
      error "  Source directory does not exist: $check_dir"
      ((error_count++))
      continue
    fi
    if [ ! -f "$entry_file" ]; then
      error "  Entry file does not exist: $entry_file"
      ((error_count++))
      continue
    fi

    widget=$(jq -n \
      --argjson default_base "$DEFAULT_BASE" \
      --slurpfile widget "$widget_config" \
      --arg type "$widget_name" \
      --arg repo_path "$repo_path" \
      --arg entry "$src_entry" \
      --arg image_src_resolved "$image_src_resolved" \
      '
      def deep_merge(a; b):
        if b == null then a
        elif (a | type) != "object" or (b | type) != "object" then b
        else (a | keys) + (b | keys) | unique
        | map(. as $k | { ($k): (deep_merge(a[$k]; b[$k])) })
        | add
        end;
      ($widget[0] | del(.source, .content, .imageSrc)) as $w
      | deep_merge($default_base; $w)
      | . + { "type": $type, "source": { "path": $repo_path, "entry": $entry } }
      | if $image_src_resolved != "" then . + {"imageSrc": $image_src_resolved} | del(.imageName) else . end
      | del(.configuration | nulls) | del(.defaultConfig | nulls)
      ')
  else
    content_endpoint=$(jq -r '.content.endpoint' "$widget_config")
    content_method=$(jq -r '.content.method // empty' "$widget_config")
    [ -z "$content_method" ] || [ "$content_method" = "null" ] && content_method="$CONTENT_DEFAULT_METHOD"
    content_auth=$(jq -c '.content.requiresAuthentication // empty' "$widget_config")
    [ -z "$content_auth" ] || [ "$content_auth" = "null" ] && content_auth="$CONTENT_DEFAULT_REQUIRES_AUTH"
    content_cache=$(jq -r '.content.cacheStrategy // empty' "$widget_config")
    [ -z "$content_cache" ] || [ "$content_cache" = "null" ] && content_cache="$CONTENT_DEFAULT_CACHE_STRATEGY"

    requires_auth_json="$content_auth"
    widget=$(jq -n \
      --argjson default_base "$DEFAULT_BASE" \
      --slurpfile widget "$widget_config" \
      --arg type "$widget_name" \
      --arg endpoint "$content_endpoint" \
      --arg method "$content_method" \
      --arg requires_auth_str "$requires_auth_json" \
      --arg cacheStrategy "$content_cache" \
      --arg image_src_resolved "$image_src_resolved" \
      '
      def deep_merge(a; b):
        if b == null then a
        elif (a | type) != "object" or (b | type) != "object" then b
        else (a | keys) + (b | keys) | unique
        | map(. as $k | { ($k): (deep_merge(a[$k]; b[$k])) })
        | add
        end;
      ($widget[0] | del(.source, .content, .imageSrc)) as $w
      | deep_merge($default_base; $w)
      | . + {
          "type": $type,
          "content": {
            "endpoint": $endpoint,
            "method": $method,
            "requiresAuthentication": ($requires_auth_str | fromjson),
            "cacheStrategy": $cacheStrategy
          }
        }
      | if $image_src_resolved != "" then . + {"imageSrc": $image_src_resolved} | del(.imageName) else . end
      | del(.configuration | nulls) | del(.defaultConfig | nulls)
      ')
  fi

  WIDGETS_JSON=$(echo "$WIDGETS_JSON" | jq --argjson widget "$widget" '. + [$widget]')
  success "  Processed: $title (v$version)"
  ((widget_count++))
done

echo ""
echo "================================"

if [ $error_count -gt 0 ]; then
  error "Failed to process $error_count widget(s)"
  exit 1
fi

if [ $widget_count -eq 0 ]; then
  error "No widgets found to process"
  exit 1
fi

success "Successfully processed $widget_count widget(s)"

REGISTRY_JSON=$(jq -n --argjson widgets "$WIDGETS_JSON" '{widgets: $widgets}')

if [ "$DRY_RUN" = true ]; then
  echo ""
  warning "DRY RUN MODE - No files will be written"
  echo ""
  echo "$REGISTRY_JSON" | jq .
else
  echo "$REGISTRY_JSON" | jq . > "$OUTPUT_FILE"
  success "Written to $OUTPUT_FILE"
fi

echo ""
success "Build complete!"

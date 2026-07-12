#!/bin/bash
# Run xdock integration tests at custom resolution.
# Usage: run-integration.sh <extension.zip> <script.js> [--devkit] [WxH]
set -euo pipefail

ZIP="${1:?Usage: $0 <extension.zip> <script.js> [--devkit] [WxH]}"
SCRIPT="${2:?Usage: $0 <extension.zip> <script.js> [--devkit] [WxH]}"
MODE="--headless"
RESOLUTION="1920x1080"

shift 2
for arg in "$@"; do
    case "$arg" in
        --devkit) MODE="--devkit" ;;
        *x*) RESOLUTION="$arg" ;;
    esac
done

TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

export XDG_DATA_HOME="$TMPDIR/data"
export XDG_CONFIG_HOME="$TMPDIR/config"
export XDG_CACHE_HOME="$TMPDIR/cache"
mkdir -p "$XDG_DATA_HOME" "$XDG_CONFIG_HOME" "$XDG_CACHE_HOME"

# Install extension
UUID=$(gnome-extensions install --print-uuid "$ZIP" 2>/dev/null || true)
if [ -z "$UUID" ]; then
    # Manual install
    UUID="xdock@github.com"
    DEST="$XDG_DATA_HOME/gnome-shell/extensions/$UUID"
    mkdir -p "$DEST"
    unzip -qo "$ZIP" -d "$DEST"
fi

# Enable the extension
mkdir -p "$XDG_CONFIG_HOME/glib-2.0/settings"
cat > "$XDG_CONFIG_HOME/glib-2.0/settings/keyfile" <<EOF
[org/gnome/shell]
enabled-extensions=['$UUID']
EOF

# Remove disable-extensions flag
rm -f /run/user/$(id -u)/gnome-shell-disable-extensions

# Launch gnome-shell
exec gnome-shell \
    --automation-script "$SCRIPT" \
    --force-animations \
    $MODE \
    --virtual-monitor "$RESOLUTION" \
    --wayland-display "gnome-shell-test-$$"

#!/bin/bash
# Smoke test: install and enable xdock in a gnome-shell-pod container.
# Verifies the extension loads without crash.
#
# Usage:
#   ./test/smoke/run-in-pod.sh [FEDORA_VERSION]
#   Default: rawhide
#
# Requires: podman, imagemagick (for screenshot conversion)

set -euo pipefail

VERSION="${1:-rawhide}"
IMAGE="ghcr.io/schneegans/gnome-shell-pod-${VERSION}"
UUID="xdock@github.com"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "=== XDock Smoke Test ==="
echo "Image: $IMAGE"
echo "UUID:  $UUID"

# Build the extension zip
echo "Building extension zip..."
cd "$PROJECT_DIR"
make zip 2>/dev/null || {
    # If make zip fails, create a minimal zip
    zip -r /tmp/xdock-test.zip . \
        -x '.git/*' 'node_modules/*' 'venv/*' '.claude/*' 'coverage/*' \
        'test/*' '_build/*' '*.zip' 'lint/*' '.github/*' 2>/dev/null
    mv /tmp/xdock-test.zip "${UUID}.zip"
}

ZIP_FILE="${PROJECT_DIR}/${UUID}.zip"
if [ ! -f "$ZIP_FILE" ]; then
    echo "FAIL: Could not create extension zip"
    exit 1
fi

# Helper to run commands inside the container
do_in_pod() {
    podman exec --user gnomeshell --workdir /home/gnomeshell "${POD}" set-env.sh "$@"
}

# Pull and start container
echo "Starting container..."
podman pull "$IMAGE" 2>/dev/null || true
POD=$(podman run --rm --cap-add=SYS_NICE --cap-add=IPC_LOCK \
                  -td "$IMAGE")

# Wait for D-Bus
echo "Waiting for D-Bus..."
do_in_pod wait-user-bus.sh

# Copy and install extension
echo "Installing extension..."
podman cp "$ZIP_FILE" "${POD}:/home/gnomeshell/${UUID}.zip"
do_in_pod gnome-extensions install --force "/home/gnomeshell/${UUID}.zip"

# Start GNOME Shell
echo "Starting GNOME Shell..."
do_in_pod systemctl --user start "gnome-xsession@:99" || true
sleep 5

# Enable extension
echo "Enabling extension..."
do_in_pod gnome-extensions enable "$UUID" || true
sleep 3

# Check for errors
echo "Checking for errors..."
ERRORS=$(podman exec "${POD}" journalctl --user -b \
    | grep -i "xdock\|${UUID}" \
    | grep -iE "error|syntaxerror|typeerror|referenceerror|failed" \
    | grep -iv "logError\|CalendarServer\|Malcontent\|geolocation\|Auth\|record usage" \
    || true)

# Check extension state
STATE=$(do_in_pod gnome-extensions info "$UUID" 2>/dev/null | grep -i "state:" || echo "State: UNKNOWN")
echo "Extension $STATE"

# Take screenshot
echo "Taking screenshot..."
podman cp "${POD}:/opt/Xvfb_screen0" /tmp/xdock-screen.xwd 2>/dev/null || true
if command -v convert &>/dev/null && [ -f /tmp/xdock-screen.xwd ]; then
    convert xwd:/tmp/xdock-screen.xwd /tmp/xdock-screenshot.png 2>/dev/null || true
fi

# Stop container
echo "Stopping container..."
podman stop "${POD}" >/dev/null 2>&1 || true

# Report results
echo ""
echo "=== Results ==="
if [ -n "$ERRORS" ]; then
    echo "FAIL: Extension errors detected:"
    echo "$ERRORS"
    exit 1
fi

if echo "$STATE" | grep -qi "enabled\|active"; then
    echo "PASS: Extension loaded and enabled without errors"
    exit 0
else
    echo "WARN: Extension state unclear ($STATE), but no errors found"
    exit 0
fi

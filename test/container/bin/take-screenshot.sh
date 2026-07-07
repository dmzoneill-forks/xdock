#!/bin/bash
# Take a screenshot via GNOME Shell D-Bus API.
# Works on both X11 and headless Wayland sessions.
#
# Usage: take-screenshot.sh [OUTPUT_PATH]

OUTPUT="${1:-/tmp/screenshot.png}"

export DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/$(id -u)/bus"

# Try GNOME Shell Screenshot D-Bus API
if dbus-send --session --type=method_call --print-reply \
    --dest=org.gnome.Shell.Screenshot \
    /org/gnome/Shell/Screenshot \
    org.gnome.Shell.Screenshot.Screenshot \
    boolean:false boolean:true "string:${OUTPUT}" 2>/dev/null; then
    echo "Screenshot saved to ${OUTPUT}"
    exit 0
fi

# Fallback: try gnome-screenshot
if command -v gnome-screenshot &>/dev/null; then
    gnome-screenshot -f "${OUTPUT}" 2>/dev/null && exit 0
fi

echo "Screenshot capture failed"
exit 1

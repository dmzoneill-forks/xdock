#!/bin/bash
# Start GNOME Shell in headless mode with a virtual monitor.
# Used in CI containers where X11/Xvfb is not available (Fedora 42+).
#
# Usage: start-gnome-headless.sh [WIDTHxHEIGHT]

set -euo pipefail

RESOLUTION="${1:-1920x1080}"

export DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/$(id -u)/bus"
export MUTTER_DEBUG_DUMMY_MODE_SPECS="${RESOLUTION}"
export LIBGL_ALWAYS_SOFTWARE=1

# Start gnome-shell headless in background
gnome-shell --headless --no-x11 --virtual-monitor "${RESOLUTION}" &
SHELL_PID=$!

echo "gnome-shell headless started (PID ${SHELL_PID}, ${RESOLUTION})"
echo "${SHELL_PID}" > /tmp/gnome-shell-headless.pid

# Wait for shell to be ready
for i in $(seq 1 30); do
    if dbus-send --session --print-reply \
        --dest=org.gnome.Shell \
        /org/gnome/Shell \
        org.freedesktop.DBus.Properties.Get \
        string:org.gnome.Shell string:ShellVersion 2>/dev/null | grep -q 'string'; then
        echo "gnome-shell ready after ${i}s"
        exit 0
    fi
    sleep 1
done

echo "Warning: gnome-shell may not be fully ready"

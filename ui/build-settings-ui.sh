#!/bin/bash
# Assemble Settings.ui from parts in ui/.
# Usage: bash ui/build-settings-ui.sh > Settings.ui
#
# Parts:
#   adjustments.xml       — GtkAdjustment + dialog frame objects
#   tab-position.xml      — Position and size tab
#   tab-applications.xml  — Applications tab
#   tab-behavior.xml      — Behavior tab
#   tab-appearance.xml    — Appearance tab
#   tab-features.xml      — Features tab
#   tab-profiles.xml      — Profiles tab
#   tab-about.xml         — About tab
#   dialogs.xml           — Popup dialog frames

set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"

cat << 'HEADER'
<?xml version="1.0" encoding="UTF-8"?>
<interface>
HEADER

cat "$DIR/adjustments.xml"

cat << 'NOTEBOOK'
  <object class="GtkNotebook" id="settings_notebook">
    <property name="margin_start">6</property>
    <property name="margin_end">6</property>
    <property name="margin_top">6</property>
    <property name="margin_bottom">6</property>
NOTEBOOK

for tab in position applications behavior appearance features profiles about; do
    cat "$DIR/tab-${tab}.xml"
done

echo '  </object>'

cat "$DIR/dialogs.xml"

echo '</interface>'

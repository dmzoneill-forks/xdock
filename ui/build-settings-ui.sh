#!/bin/bash
# Assemble Settings.ui from parts in ui/.
# Usage: bash ui/build-settings-ui.sh > Settings.ui
#
# Parts:
#   adjustments.xml       — GtkAdjustment + dialog frame objects
#   tab-position.xml      — Position and size page
#   tab-applications.xml  — Applications page
#   tab-behavior.xml      — Behavior page
#   tab-appearance.xml    — Appearance page
#   tab-features.xml      — Features page
#   tab-profiles.xml      — Profiles page
#   tab-about.xml         — About page
#   dialogs.xml           — Popup dialog frames

set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"

cat << 'HEADER'
<?xml version="1.0" encoding="UTF-8"?>
<interface>
HEADER

cat "$DIR/adjustments.xml"

cat << 'STACK_OPEN'
  <object class="GtkBox" id="settings_root">
    <property name="orientation">horizontal</property>
    <child>
      <object class="GtkStackSidebar">
        <property name="stack">settings_stack</property>
        <property name="width_request">180</property>
      </object>
    </child>
    <child>
      <object class="GtkScrolledWindow">
        <property name="hexpand">1</property>
        <property name="vexpand">1</property>
        <property name="hscrollbar_policy">never</property>
        <child>
          <object class="GtkStack" id="settings_stack">
            <property name="transition_type">crossfade</property>
STACK_OPEN

for tab in position applications behavior appearance features profiles about; do
    cat "$DIR/tab-${tab}.xml"
done

cat << 'STACK_CLOSE'
          </object>
        </child>
      </object>
    </child>
  </object>
STACK_CLOSE

cat "$DIR/dialogs.xml"

echo '</interface>'

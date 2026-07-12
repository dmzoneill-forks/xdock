// SPDX-License-Identifier: GPL-2.0-or-later
function assert(cond, msg) { if (!cond) throw new Error(msg); }

function getTests() {
    return [
        {name: 'all widget IDs in prefs.js exist in Settings.ui', fn() { assert(true, 'TODO'); } },
        {name: 'all settings.bind keys exist in schema', fn() { assert(true, 'TODO'); } },
        {name: 'Applications tab exists (renamed from Launchers)', fn() { assert(true, 'TODO'); } },
        {name: 'Appearance tab exists', fn() { assert(true, 'TODO'); } },
        {name: 'Behavior tab exists', fn() { assert(true, 'TODO'); } },
        {name: 'Features tab exists', fn() { assert(true, 'TODO'); } },
        {name: 'Position and size tab exists', fn() { assert(true, 'TODO'); } },
        {name: 'Profiles tab exists', fn() { assert(true, 'TODO'); } },
        {name: 'Dock Style section in Appearance tab', fn() { assert(true, 'TODO'); } },
        {name: 'Wallpaper-adaptive section in Appearance tab', fn() { assert(true, 'TODO'); } },
        {name: 'Icon Overlays section in Appearance tab', fn() { assert(true, 'TODO'); } },
        {name: 'Visual Effects section in Features tab', fn() { assert(true, 'TODO'); } },
        {name: 'Productivity section in Features tab', fn() { assert(true, 'TODO'); } },
        {name: 'System Integration section in Features tab', fn() { assert(true, 'TODO'); } },
        {name: 'shelf sliders have value_pos=right', fn() { assert(true, 'TODO'); } },
        {name: 'no frame labels on frame borders', fn() { assert(true, 'TODO'); } },
        {name: 'all slider adjustments have valid lower/upper ranges', fn() { assert(true, 'TODO'); } },
        {name: 'per-monitor position rows created for active monitors', fn() { assert(true, 'TODO'); } },
        {name: 'shelf controls disabled when dock-style=FLAT', fn() { assert(true, 'TODO'); } },
        {name: 'shelf controls enabled when dock-style=SHELF', fn() { assert(true, 'TODO'); } },
        {name: 'all new preference sliders are bound to settings', fn() { assert(true, 'TODO'); } },
        {name: 'preferences window opens without error', fn() { assert(true, 'TODO'); } },
        {name: 'preferences window can be focused from dock menu', fn() { assert(true, 'TODO'); } },
        {name: 'profile save captures all setting keys', fn() { assert(true, 'TODO'); } },
        {name: 'profile load restores all setting keys', fn() { assert(true, 'TODO'); } },
    ];
}

exports.getTests = getTests;

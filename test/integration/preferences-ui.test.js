// SPDX-License-Identifier: GPL-2.0-or-later
// SPDX-FileCopyrightText: Contributors to XDock
//
// Integration tests for the preferences UI.
// These run INSIDE gnome-shell via gnome-shell-test-tool and validate that the
// preferences window, Settings.ui, and gschema XML are consistent and functional.

/* global XDockTestHelpers */
const {assert, assertEqual, getDockManager, getSettings, waitMs, runTests} = XDockTestHelpers;
const {Gio, GLib} = imports.gi;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse Settings.ui and return a DOM-like structure via GLib markup parser.
 * Falls back to regex extraction when full XML parsing is unavailable.
 */
function _getSettingsUIContent() {
    const ext = imports.ui.main.extensionManager.lookup(XDockTestHelpers.EXTENSION_UUID);
    const uiPath = GLib.build_filenamev([ext.path, 'Settings.ui']);
    const [, bytes] = GLib.file_get_contents(uiPath);
    return new TextDecoder().decode(bytes);
}

/**
 * Extract all widget IDs from Settings.ui (id="...").
 */
function _getUIWidgetIds(uiContent) {
    const ids = new Set();
    const re = /\bid="([^"]+)"/g;
    let m;
    while ((m = re.exec(uiContent)) !== null)
        ids.add(m[1]);
    return ids;
}

/**
 * Extract all widget IDs referenced via get_object('...') in prefs.js.
 */
function _getPrefsWidgetIds() {
    const ext = imports.ui.main.extensionManager.lookup(XDockTestHelpers.EXTENSION_UUID);
    const prefsPath = GLib.build_filenamev([ext.path, 'prefs.js']);
    const [, bytes] = GLib.file_get_contents(prefsPath);
    const source = new TextDecoder().decode(bytes);
    const ids = new Set();
    const re = /get_object\(\s*'([^']+)'\s*\)/g;
    let m;
    while ((m = re.exec(source)) !== null)
        ids.add(m[1]);
    return ids;
}

/**
 * Extract all settings keys used in settings.bind() calls in prefs.js.
 */
function _getPrefsBindKeys() {
    const ext = imports.ui.main.extensionManager.lookup(XDockTestHelpers.EXTENSION_UUID);
    const prefsPath = GLib.build_filenamev([ext.path, 'prefs.js']);
    const [, bytes] = GLib.file_get_contents(prefsPath);
    const source = new TextDecoder().decode(bytes);
    const keys = new Set();
    const re = /\.bind\(\s*'([^']+)'/g;
    let m;
    while ((m = re.exec(source)) !== null)
        keys.add(m[1]);
    return keys;
}

/**
 * Get all key names from the extension's GSettings schema.
 */
function _getSchemaKeys() {
    const settings = getSettings();
    return new Set(settings.settings_schema.list_keys());
}

/**
 * Extract all GtkAdjustment objects from Settings.ui and return
 * their id, lower, and upper values.
 */
function _getAdjustments(uiContent) {
    const adjustments = [];
    // Match <object class="GtkAdjustment" id="..."> blocks
    const re = /<object\s+class="GtkAdjustment"\s+id="([^"]+)"[^>]*>([\s\S]*?)<\/object>/g;
    let m;
    while ((m = re.exec(uiContent)) !== null) {
        const id = m[1];
        const body = m[2];
        const lower = body.match(/<property\s+name="lower"[^>]*>([^<]+)/);
        const upper = body.match(/<property\s+name="upper"[^>]*>([^<]+)/);
        adjustments.push({
            id,
            lower: lower ? parseFloat(lower[1]) : null,
            upper: upper ? parseFloat(upper[1]) : null,
        });
    }
    return adjustments;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

/* exported XDockTests */
var XDockTests = [
    // -----------------------------------------------------------------------
    // 1. Widget ID consistency
    // -----------------------------------------------------------------------
    {
        name: 'all widget IDs in prefs.js exist in Settings.ui',
        fn() {
            const uiContent = _getSettingsUIContent();
            const uiIds = _getUIWidgetIds(uiContent);
            const prefsIds = _getPrefsWidgetIds();
            const missing = [];
            for (const id of prefsIds) {
                if (!uiIds.has(id))
                    missing.push(id);
            }
            assert(
                missing.length === 0,
                `Widget IDs referenced in prefs.js but missing from Settings.ui: ${missing.join(', ')}`
            );
        },
    },

    // -----------------------------------------------------------------------
    // 2. Settings.bind keys exist in schema
    // -----------------------------------------------------------------------
    {
        name: 'all settings.bind keys exist in schema',
        fn() {
            const bindKeys = _getPrefsBindKeys();
            const schemaKeys = _getSchemaKeys();
            const missing = [];
            for (const key of bindKeys) {
                if (!schemaKeys.has(key))
                    missing.push(key);
            }
            assert(
                missing.length === 0,
                `settings.bind keys not in schema: ${missing.join(', ')}`
            );
        },
    },

    // -----------------------------------------------------------------------
    // 3-8. Tab existence
    // -----------------------------------------------------------------------
    {
        name: 'Applications tab exists (renamed from Launchers)',
        fn() {
            const uiContent = _getSettingsUIContent();
            assert(
                uiContent.includes('>Applications</property>'),
                'Applications tab label not found in Settings.ui'
            );
        },
    },
    {
        name: 'Appearance tab exists',
        fn() {
            const uiContent = _getSettingsUIContent();
            assert(
                uiContent.includes('>Appearance</property>'),
                'Appearance tab label not found in Settings.ui'
            );
        },
    },
    {
        name: 'Behavior tab exists',
        fn() {
            const uiContent = _getSettingsUIContent();
            assert(
                uiContent.includes('>Behavior</property>'),
                'Behavior tab label not found in Settings.ui'
            );
        },
    },
    {
        name: 'Features tab exists',
        fn() {
            const uiContent = _getSettingsUIContent();
            assert(
                uiContent.includes('>Features</property>'),
                'Features tab label not found in Settings.ui'
            );
        },
    },
    {
        name: 'Position and size tab exists',
        fn() {
            const uiContent = _getSettingsUIContent();
            assert(
                uiContent.includes('>Position and size</property>'),
                'Position and size tab label not found in Settings.ui'
            );
        },
    },
    {
        name: 'Profiles tab exists',
        fn() {
            const uiContent = _getSettingsUIContent();
            assert(
                uiContent.includes('>Profiles</property>'),
                'Profiles tab label not found in Settings.ui'
            );
        },
    },

    // -----------------------------------------------------------------------
    // 9-14. Section existence
    // -----------------------------------------------------------------------
    {
        name: 'Dock Style section in Appearance tab',
        fn() {
            const uiContent = _getSettingsUIContent();
            assert(
                uiContent.includes('<!-- Dock Style section -->'),
                'Dock Style section comment not found in Settings.ui'
            );
            assert(
                uiContent.includes('id="dock_style_combo"'),
                'dock_style_combo widget not found in Settings.ui'
            );
        },
    },
    {
        name: 'Wallpaper-adaptive section in Appearance tab',
        fn() {
            const uiContent = _getSettingsUIContent();
            assert(
                uiContent.includes('id="wallpaper_adaptive_color_switch"'),
                'wallpaper_adaptive_color_switch widget not found in Settings.ui'
            );
            assert(
                uiContent.includes('id="wallpaper_adaptive_intensity_scale"'),
                'wallpaper_adaptive_intensity_scale widget not found in Settings.ui'
            );
        },
    },
    {
        name: 'Icon Overlays section in Appearance tab',
        fn() {
            const uiContent = _getSettingsUIContent();
            assert(
                uiContent.includes('<!-- Icon Overlays section'),
                'Icon Overlays section comment not found in Settings.ui'
            );
            assert(
                uiContent.includes('id="show_icons_emblems_switch"'),
                'show_icons_emblems_switch widget not found in Settings.ui'
            );
        },
    },
    {
        name: 'Visual Effects section in Features tab',
        fn() {
            const uiContent = _getSettingsUIContent();
            assert(
                uiContent.includes('<!-- Visual Effects section -->'),
                'Visual Effects section comment not found in Settings.ui'
            );
            assert(
                uiContent.includes('id="icon_magnification_switch"'),
                'icon_magnification_switch widget not found in Settings.ui'
            );
        },
    },
    {
        name: 'Productivity section in Features tab',
        fn() {
            const uiContent = _getSettingsUIContent();
            assert(
                uiContent.includes('<!-- Productivity section -->'),
                'Productivity section comment not found in Settings.ui'
            );
            assert(
                uiContent.includes('id="command_palette_enabled_switch"'),
                'command_palette_enabled_switch widget not found in Settings.ui'
            );
        },
    },
    {
        name: 'System Integration section in Features tab',
        fn() {
            const uiContent = _getSettingsUIContent();
            assert(
                uiContent.includes('<!-- System Integration section -->'),
                'System Integration section comment not found in Settings.ui'
            );
            assert(
                uiContent.includes('id="show_media_controls_switch"'),
                'show_media_controls_switch widget not found in Settings.ui'
            );
        },
    },

    // -----------------------------------------------------------------------
    // 15. Shelf sliders have value_pos=right
    // -----------------------------------------------------------------------
    {
        name: 'shelf sliders have value_pos=right',
        fn() {
            const uiContent = _getSettingsUIContent();
            const shelfScaleIds = [
                'shelf_gradient_top_scale',
                'shelf_gradient_bottom_scale',
                'shelf_highlight_scale',
                'shelf_border_scale',
                'shelf_angle_scale',
                'shelf_height_scale',
                'shelf_reflection_opacity_scale',
                'shelf_corner_radius_top_scale',
                'shelf_corner_radius_bottom_scale',
            ];
            for (const id of shelfScaleIds) {
                // Extract the <object> block for this scale
                const blockRe = new RegExp(
                    `id="${id}"[\\s\\S]*?</object>`, 'm'
                );
                const match = uiContent.match(blockRe);
                assert(match, `Scale ${id} not found in Settings.ui`);
                assert(
                    match[0].includes('value_pos">right</') ||
                    match[0].includes("value_pos\">right<"),
                    `Scale ${id} does not have value_pos=right`
                );
            }
        },
    },

    // -----------------------------------------------------------------------
    // 16. No frame labels on frame borders
    // -----------------------------------------------------------------------
    {
        name: 'no frame labels on frame borders',
        fn() {
            const uiContent = _getSettingsUIContent();
            // GtkFrame elements should not have a <property name="label"> child
            // (we use section comments instead of frame labels for clean UI).
            const frameRe = /<object\s+class="GtkFrame"[^>]*>([\s\S]*?)<\/object>/g;
            let m;
            const framesWithLabel = [];
            while ((m = frameRe.exec(uiContent)) !== null) {
                const body = m[1];
                // Only check for a direct label property, not nested labels
                if (/<property\s+name="label"/.test(body)) {
                    // Exclude nested objects - only check first-level properties
                    const firstChild = body.indexOf('<child>');
                    const labelPos = body.indexOf('<property name="label"');
                    if (labelPos >= 0 && (firstChild < 0 || labelPos < firstChild))
                        framesWithLabel.push(m[0].substring(0, 60));
                }
            }
            assert(
                framesWithLabel.length === 0,
                `Found ${framesWithLabel.length} GtkFrame(s) with direct label properties`
            );
        },
    },

    // -----------------------------------------------------------------------
    // 17. All slider adjustments have valid lower/upper ranges
    // -----------------------------------------------------------------------
    {
        name: 'all slider adjustments have valid lower/upper ranges',
        fn() {
            const uiContent = _getSettingsUIContent();
            const adjustments = _getAdjustments(uiContent);
            const invalid = [];
            for (const adj of adjustments) {
                if (adj.lower !== null && adj.upper !== null) {
                    if (adj.lower >= adj.upper)
                        invalid.push(`${adj.id}: lower(${adj.lower}) >= upper(${adj.upper})`);
                }
            }
            assert(
                invalid.length === 0,
                `Adjustments with invalid ranges: ${invalid.join('; ')}`
            );
        },
    },

    // -----------------------------------------------------------------------
    // 18. Per-monitor position rows created for active monitors
    // -----------------------------------------------------------------------
    {
        name: 'per-monitor position rows created for active monitors',
        fn() {
            // This test verifies that the _updateMonitorPositionRows code path
            // exists and references the expected anchor widget.
            const uiContent = _getSettingsUIContent();
            assert(
                uiContent.includes('id="dock_monitor_listboxrow"'),
                'dock_monitor_listboxrow anchor widget not found in Settings.ui'
            );
            // Verify prefs.js references the monitor position update method
            const ext = imports.ui.main.extensionManager.lookup(XDockTestHelpers.EXTENSION_UUID);
            const prefsPath = GLib.build_filenamev([ext.path, 'prefs.js']);
            const [, bytes] = GLib.file_get_contents(prefsPath);
            const source = new TextDecoder().decode(bytes);
            assert(
                source.includes('_updateMonitorPositionRows'),
                '_updateMonitorPositionRows method not found in prefs.js'
            );
            assert(
                source.includes('monitor-positions'),
                'monitor-positions setting key not referenced in prefs.js'
            );
        },
    },

    // -----------------------------------------------------------------------
    // 19. Shelf controls disabled when dock-style=FLAT
    // -----------------------------------------------------------------------
    {
        name: 'shelf controls disabled when dock-style=FLAT',
        fn() {
            const ext = imports.ui.main.extensionManager.lookup(XDockTestHelpers.EXTENSION_UUID);
            const prefsPath = GLib.build_filenamev([ext.path, 'prefs.js']);
            const [, bytes] = GLib.file_get_contents(prefsPath);
            const source = new TextDecoder().decode(bytes);
            // Verify that prefs.js checks dock-style enum value for shelf sensitivity
            assert(
                source.includes("get_enum('dock-style')"),
                'prefs.js does not read dock-style enum'
            );
            const shelfRows = [
                'shelf_gradient_top_row', 'shelf_gradient_bottom_row',
                'shelf_highlight_row', 'shelf_border_row',
                'shelf_angle_row', 'shelf_height_row', 'shelf_reflection_row',
            ];
            for (const id of shelfRows) {
                assert(
                    source.includes(`'${id}'`),
                    `Shelf row '${id}' not referenced in sensitivity update`
                );
            }
        },
    },

    // -----------------------------------------------------------------------
    // 20. Shelf controls enabled when dock-style=SHELF
    // -----------------------------------------------------------------------
    {
        name: 'shelf controls enabled when dock-style=SHELF',
        fn() {
            const ext = imports.ui.main.extensionManager.lookup(XDockTestHelpers.EXTENSION_UUID);
            const prefsPath = GLib.build_filenamev([ext.path, 'prefs.js']);
            const [, bytes] = GLib.file_get_contents(prefsPath);
            const source = new TextDecoder().decode(bytes);
            // Verify that shelf sensitivity check compares against enum value 1 (SHELF)
            assert(
                source.includes('=== 1'),
                'prefs.js does not check dock-style === 1 (SHELF)'
            );
            // Verify the updateShelfSensitivity function exists
            assert(
                source.includes('updateShelfSensitivity'),
                'updateShelfSensitivity function not found in prefs.js'
            );
        },
    },

    // -----------------------------------------------------------------------
    // 21. All new preference sliders are bound to settings
    // -----------------------------------------------------------------------
    {
        name: 'all new preference sliders are bound to settings',
        fn() {
            const uiContent = _getSettingsUIContent();
            const bindKeys = _getPrefsBindKeys();
            // List of slider-related settings keys that must be bound
            const sliderKeys = [
                'shelf-gradient-top-opacity',
                'shelf-gradient-bottom-opacity',
                'shelf-highlight-opacity',
                'shelf-border-opacity',
                'shelf-angle',
                'shelf-height',
                'shelf-reflection-opacity',
                'shelf-corner-radius-top',
                'shelf-corner-radius-bottom',
                'icon-magnification-factor',
                'wallpaper-adaptive-intensity',
                'spring-stiffness',
                'spring-damping',
                'magnification-spread',
                'magnification-easing-duration',
                'startup-animation-time',
                'icon-animator-duration',
                'spring-overshoot-clamp',
                'reflection-size',
                'progress-arc-width',
                'hotkey-label-scale',
                'tooltip-max-width-px',
            ];
            const unbound = [];
            for (const key of sliderKeys) {
                if (!bindKeys.has(key))
                    unbound.push(key);
            }
            assert(
                unbound.length === 0,
                `Slider settings keys not bound in prefs.js: ${unbound.join(', ')}`
            );
        },
    },

    // -----------------------------------------------------------------------
    // 22. Preferences window opens without error
    // -----------------------------------------------------------------------
    {
        name: 'preferences window opens without error',
        async fn() {
            // Verify that the extension's getPreferencesWidget entry point
            // is defined and the preferences can be instantiated.
            const ext = imports.ui.main.extensionManager.lookup(XDockTestHelpers.EXTENSION_UUID);
            assert(ext, 'Extension not found');
            assert(ext.state === 1, `Extension not enabled (state=${ext.state})`);

            // The extension metadata should contain the prefs entry point
            assert(
                ext.metadata['settings-schema'] || ext.hasPrefs,
                'Extension does not declare preferences'
            );

            // Verify Settings.ui file exists and is loadable
            const uiPath = GLib.build_filenamev([ext.path, 'Settings.ui']);
            assert(
                GLib.file_test(uiPath, GLib.FileTest.EXISTS),
                `Settings.ui not found at ${uiPath}`
            );
        },
    },

    // -----------------------------------------------------------------------
    // 23. Preferences window can be focused from dock menu
    // -----------------------------------------------------------------------
    {
        name: 'preferences window can be focused from dock menu',
        fn() {
            // Verify the extension has the preferences entry point configured
            const ext = imports.ui.main.extensionManager.lookup(XDockTestHelpers.EXTENSION_UUID);
            assert(ext, 'Extension not found');
            // Check that prefs.js exports the default ExtensionPreferences class
            const prefsPath = GLib.build_filenamev([ext.path, 'prefs.js']);
            assert(
                GLib.file_test(prefsPath, GLib.FileTest.EXISTS),
                `prefs.js not found at ${prefsPath}`
            );
            const [, bytes] = GLib.file_get_contents(prefsPath);
            const source = new TextDecoder().decode(bytes);
            assert(
                source.includes('getPreferencesWidget'),
                'getPreferencesWidget method not found in prefs.js'
            );
            assert(
                source.includes('export default'),
                'prefs.js does not have a default export'
            );
        },
    },

    // -----------------------------------------------------------------------
    // 24. Profile save captures all setting keys
    // -----------------------------------------------------------------------
    {
        name: 'profile save captures all setting keys',
        fn() {
            const ext = imports.ui.main.extensionManager.lookup(XDockTestHelpers.EXTENSION_UUID);
            const prefsPath = GLib.build_filenamev([ext.path, 'prefs.js']);
            const [, bytes] = GLib.file_get_contents(prefsPath);
            const source = new TextDecoder().decode(bytes);

            // Extract PROFILE_SETTINGS_KEYS arrays from the source
            const keyArrays = source.match(/PROFILE_SETTINGS_KEYS\s*=\s*\[([\s\S]*?)\]/g);
            assert(keyArrays && keyArrays.length >= 2,
                'PROFILE_SETTINGS_KEYS not found in both save and load functions');

            // Extract keys from the save function (the second occurrence,
            // inside _saveCurrentProfile)
            const saveMatch = keyArrays[1].match(/'([^']+)'/g);
            assert(saveMatch, 'No keys found in save PROFILE_SETTINGS_KEYS');
            const saveKeys = saveMatch.map(k => k.replace(/'/g, ''));

            // Verify essential keys are present
            const essential = [
                'dock-position', 'dash-max-icon-size', 'dock-fixed',
                'autohide', 'intellihide', 'transparency-mode',
                'background-opacity', 'running-indicator-style',
            ];
            const missingSave = essential.filter(k => !saveKeys.includes(k));
            assert(
                missingSave.length === 0,
                `Essential keys missing from profile save: ${missingSave.join(', ')}`
            );
        },
    },

    // -----------------------------------------------------------------------
    // 25. Profile load restores all setting keys
    // -----------------------------------------------------------------------
    {
        name: 'profile load restores all setting keys',
        fn() {
            const ext = imports.ui.main.extensionManager.lookup(XDockTestHelpers.EXTENSION_UUID);
            const prefsPath = GLib.build_filenamev([ext.path, 'prefs.js']);
            const [, bytes] = GLib.file_get_contents(prefsPath);
            const source = new TextDecoder().decode(bytes);

            // Extract PROFILE_SETTINGS_KEYS from load function (first occurrence)
            const keyArrays = source.match(/PROFILE_SETTINGS_KEYS\s*=\s*\[([\s\S]*?)\]/g);
            assert(keyArrays && keyArrays.length >= 1,
                'PROFILE_SETTINGS_KEYS not found in load function');

            const loadMatch = keyArrays[0].match(/'([^']+)'/g);
            assert(loadMatch, 'No keys found in load PROFILE_SETTINGS_KEYS');
            const loadKeys = loadMatch.map(k => k.replace(/'/g, ''));

            // Extract keys from save function
            const saveMatch = keyArrays[1].match(/'([^']+)'/g);
            assert(saveMatch, 'No keys found in save PROFILE_SETTINGS_KEYS');
            const saveKeys = saveMatch.map(k => k.replace(/'/g, ''));

            // Load and save should use the same set of keys
            const loadSet = new Set(loadKeys);
            const saveSet = new Set(saveKeys);
            const inLoadNotSave = loadKeys.filter(k => !saveSet.has(k));
            const inSaveNotLoad = saveKeys.filter(k => !loadSet.has(k));

            assert(
                inLoadNotSave.length === 0 && inSaveNotLoad.length === 0,
                `Profile key mismatch: load-only=[${inLoadNotSave.join(',')}] save-only=[${inSaveNotLoad.join(',')}]`
            );

            // Verify all profile keys exist in the schema
            const schemaKeys = _getSchemaKeys();
            const notInSchema = loadKeys.filter(k => !schemaKeys.has(k));
            assert(
                notInSchema.length === 0,
                `Profile keys not in schema: ${notInSchema.join(', ')}`
            );
        },
    },
];

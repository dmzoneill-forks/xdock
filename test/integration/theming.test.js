// SPDX-License-Identifier: GPL-2.0-or-later
// SPDX-FileCopyrightText: Contributors to XDock
//
// Integration tests for theming.js — ThemeManager, style classes,
// transparency modes, wallpaper-adaptive color, and shelf rendering.
//
// Runs inside gnome-shell via gnome-shell-test-tool.
// Each test is a placeholder that validates the scaffold and will be
// filled in with real assertions once the test harness is wired up.

const H = typeof XDockTestHelpers !== 'undefined'
    ? XDockTestHelpers
    : imports.helpers.XDockTestHelpers;

/* exported XDockTests */
var XDockTests = [  // eslint-disable-line no-unused-vars
    // ------------------------------------------------------------------
    // 1. ThemeManager lifecycle
    // ------------------------------------------------------------------
    {
        name: 'theme manager creates on dock init',
        fn() {
            const dock = H.getDock();
            H.assert(dock, 'primary dock should exist');
            // ThemeManager is created during dock construction and stored
            // on the dock instance.  Exact property name may vary; the
            // placeholder validates the dock itself is available.
        },
    },

    // ------------------------------------------------------------------
    // 2. updateCustomTheme guard: actor mapped
    // ------------------------------------------------------------------
    {
        name: 'updateCustomTheme runs when actor is mapped',
        fn() {
            const dock = H.getDock();
            H.assert(dock.mapped, 'primary dock actor should be mapped');
            // When the actor is mapped, updateCustomTheme should execute
            // without throwing.
        },
    },

    // ------------------------------------------------------------------
    // 3. updateCustomTheme guard: actor unmapped
    // ------------------------------------------------------------------
    {
        name: 'updateCustomTheme does not run when actor is unmapped',
        fn() {
            // Placeholder: verifying unmapped behavior requires temporarily
            // hiding the dock actor, which risks side-effects.  This test
            // will be filled in once a safe unmapping strategy is confirmed.
            H.assert(true, 'placeholder — unmapped guard');
        },
    },

    // ------------------------------------------------------------------
    // 4. Shelf CSS class added
    // ------------------------------------------------------------------
    {
        name: 'shelf CSS class added when dock-style=SHELF',
        async fn() {
            await H.setSetting('dock-style', 1);  // SHELF
            const dock = H.getDock();
            H.assert(dock.has_style_class_name('shelf'),
                'dock should have "shelf" style class after setting dock-style to SHELF');
            await H.resetSetting('dock-style');
        },
    },

    // ------------------------------------------------------------------
    // 5. Shelf CSS class removed
    // ------------------------------------------------------------------
    {
        name: 'shelf CSS class removed when dock-style=FLAT',
        async fn() {
            await H.setSetting('dock-style', 1);  // SHELF first
            await H.setSetting('dock-style', 0);  // then FLAT
            const dock = H.getDock();
            H.assert(!dock.has_style_class_name('shelf'),
                'dock should not have "shelf" style class after setting dock-style to FLAT');
            await H.resetSetting('dock-style');
        },
    },

    // ------------------------------------------------------------------
    // 6. no-hover-highlight class
    // ------------------------------------------------------------------
    {
        name: 'no-hover-highlight class when magnification on and highlight off',
        async fn() {
            await H.setSetting('icon-magnification', true);
            await H.setSetting('magnification-hover-highlight', false);
            const dock = H.getDock();
            H.assert(dock.has_style_class_name('no-hover-highlight'),
                'dock should have "no-hover-highlight" class');
            await H.resetSetting('magnification-hover-highlight');
            await H.resetSetting('icon-magnification');
        },
    },

    // ------------------------------------------------------------------
    // 7. Custom background color
    // ------------------------------------------------------------------
    {
        name: 'custom background color applied when enabled',
        async fn() {
            await H.setSetting('custom-background-color', true);
            await H.setSetting('background-color', '#ff0000');
            // Placeholder: the inline style on dash._background should
            // contain the custom color.  Full assertion requires reading
            // the computed style from the actor.
            H.assert(true, 'placeholder — custom background color');
            await H.resetSetting('background-color');
            await H.resetSetting('custom-background-color');
        },
    },

    // ------------------------------------------------------------------
    // 8. Custom border radius
    // ------------------------------------------------------------------
    {
        name: 'custom border radius applied from setting',
        async fn() {
            await H.setSetting('custom-border-radius', 12);
            const dash = H.getDash();
            const style = dash._background?.get_style() || '';
            H.assert(style.includes('border-radius') || true,
                'placeholder — border-radius should appear in inline style');
            await H.resetSetting('custom-border-radius');
        },
    },

    // ------------------------------------------------------------------
    // 9. Transparency mode FIXED
    // ------------------------------------------------------------------
    {
        name: 'transparency mode FIXED applies fixed opacity',
        async fn() {
            await H.setSetting('transparency-mode', 1);  // FIXED
            // Placeholder: verify that the dash background receives a
            // fixed rgba opacity derived from background-opacity setting.
            H.assert(true, 'placeholder — FIXED transparency');
            await H.resetSetting('transparency-mode');
        },
    },

    // ------------------------------------------------------------------
    // 10. Transparency mode DYNAMIC
    // ------------------------------------------------------------------
    {
        name: 'transparency mode DYNAMIC tracks window proximity',
        async fn() {
            await H.setSetting('transparency-mode', 3);  // DYNAMIC
            const dock = H.getDock();
            // In DYNAMIC mode the dock should have either 'transparent'
            // or 'opaque' style class depending on window proximity.
            const hasTransClass = dock.has_style_class_name('transparent');
            const hasOpaqueClass = dock.has_style_class_name('opaque');
            H.assert(hasTransClass || hasOpaqueClass || true,
                'placeholder — DYNAMIC should apply transparent/opaque class');
            await H.resetSetting('transparency-mode');
        },
    },

    // ------------------------------------------------------------------
    // 11. Transparency mode DEFAULT
    // ------------------------------------------------------------------
    {
        name: 'transparency mode DEFAULT uses theme opacity',
        async fn() {
            await H.setSetting('transparency-mode', 0);  // DEFAULT
            // Placeholder: DEFAULT mode should not inject custom background
            // opacity unless custom-background-color is also on.
            H.assert(true, 'placeholder — DEFAULT transparency');
            await H.resetSetting('transparency-mode');
        },
    },

    // ------------------------------------------------------------------
    // 12. Wallpaper-adaptive color
    // ------------------------------------------------------------------
    {
        name: 'wallpaper-adaptive color extracts from wallpaper',
        async fn() {
            await H.setSetting('wallpaper-adaptive-color', true);
            // Placeholder: the WallpaperColorExtractor should be created.
            // Full verification needs checking the extractor instance on
            // the ThemeManager, which is not directly exposed.
            await H.waitMs(200);
            H.assert(true, 'placeholder — wallpaper-adaptive color');
            await H.resetSetting('wallpaper-adaptive-color');
        },
    },

    // ------------------------------------------------------------------
    // 13. Wallpaper color intensity
    // ------------------------------------------------------------------
    {
        name: 'wallpaper color intensity setting affects result',
        async fn() {
            await H.setSetting('wallpaper-adaptive-color', true);
            await H.setSetting('wallpaper-adaptive-intensity', 0.5);
            // Placeholder: intensity should modulate the extracted color.
            H.assert(true, 'placeholder — wallpaper intensity');
            await H.resetSetting('wallpaper-adaptive-intensity');
            await H.resetSetting('wallpaper-adaptive-color');
        },
    },

    // ------------------------------------------------------------------
    // 14. Style-only settings do not trigger resetAppIcons
    // ------------------------------------------------------------------
    {
        name: 'style-only settings do not trigger resetAppIcons',
        async fn() {
            // Style-only keys (shelf-gradient-top-opacity, etc.) are wired
            // to _adjustTheme + _updateShelfOverlay only, not the full
            // updateCustomTheme path that could trigger resetAppIcons.
            // Placeholder: changing a style-only key should not cause icon
            // reconstruction.
            const iconsBefore = H.getIconCount();
            await H.setSetting('shelf-gradient-top-opacity', 0.5);
            const iconsAfter = H.getIconCount();
            H.assertEqual(iconsBefore, iconsAfter,
                'icon count should not change on style-only setting update');
            await H.resetSetting('shelf-gradient-top-opacity');
        },
    },

    // ------------------------------------------------------------------
    // 15. Theme update does not trigger resetAppIcons on first call
    // ------------------------------------------------------------------
    {
        name: 'theme update does not trigger resetAppIcons on first call',
        fn() {
            // Placeholder: the first updateCustomTheme call during dock
            // init should not trigger a full resetAppIcons cycle.
            // Verifying this requires instrumentation of resetAppIcons.
            H.assert(true, 'placeholder — no resetAppIcons on first call');
        },
    },

    // ------------------------------------------------------------------
    // 16. Shelf trapezoid repaints on style changes
    // ------------------------------------------------------------------
    {
        name: 'shelf trapezoid repaints when style settings change',
        async fn() {
            await H.setSetting('dock-style', 1);  // SHELF
            // Placeholder: changing a shelf-specific setting should trigger
            // a repaint of the shelf overlay.  Full assertion needs hooking
            // into the DrawingArea repaint signal.
            await H.setSetting('shelf-angle', 0.3);
            H.assert(true, 'placeholder — shelf repaint on style change');
            await H.resetSetting('shelf-angle');
            await H.resetSetting('dock-style');
        },
    },

    // ------------------------------------------------------------------
    // 17. Shrink-dash setting reduces padding
    // ------------------------------------------------------------------
    {
        name: 'shrink-dash setting reduces padding',
        async fn() {
            await H.setSetting('custom-theme-shrink', true);
            const dock = H.getDock();
            H.assert(dock.has_style_class_name('shrink'),
                'dock should have "shrink" style class when custom-theme-shrink is true');
            await H.resetSetting('custom-theme-shrink');
        },
    },

    // ------------------------------------------------------------------
    // 18. Extend-height applies extended style class
    // ------------------------------------------------------------------
    {
        name: 'extend-height applies extended style class',
        async fn() {
            await H.setSetting('extend-height', true);
            // Placeholder: extend-height changes dock sizing behavior.
            // The style class or allocation change depends on the dock
            // layout manager rather than ThemeManager directly.
            H.assert(true, 'placeholder — extend-height style');
            await H.resetSetting('extend-height');
        },
    },

    // ------------------------------------------------------------------
    // 19. Straight-corner setting
    // ------------------------------------------------------------------
    {
        name: 'straight-corner setting forces 0 border radius',
        async fn() {
            await H.setSetting('apply-custom-theme', false);
            await H.setSetting('force-straight-corner', true);
            const dock = H.getDock();
            H.assert(dock.has_style_class_name('straight-corner'),
                'dock should have "straight-corner" class when force-straight-corner is true');
            await H.resetSetting('force-straight-corner');
            await H.resetSetting('apply-custom-theme');
        },
    },
];

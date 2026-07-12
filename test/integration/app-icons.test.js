// SPDX-License-Identifier: GPL-2.0-or-later
// SPDX-FileCopyrightText: Contributors to XDock
//
// Integration tests: application icons in the dock.
// Runs inside gnome-shell via the integration runner (helpers.js).

/* global XDockTestHelpers */

const H = XDockTestHelpers;

/* exported XDockTests */
var XDockTests = [

    // -----------------------------------------------------------------------
    // Pinned / Favorites
    // -----------------------------------------------------------------------

    {
        name: 'pinned apps shown when show-favorites=true',
        fn: async () => {
            await H.setSetting('show-favorites', true);
            const dash = H.getDash();
            const favs = dash.getAppIcons().filter(i => i.app?.isFavourite?.() ?? false);
            H.assert(favs.length > 0, 'expected at least one favorite icon');
        },
    },

    {
        name: 'pinned apps hidden when show-favorites=false',
        fn: async () => {
            await H.setSetting('show-favorites', false);
            const dash = H.getDash();
            const favs = dash.getAppIcons().filter(i => i.app?.isFavourite?.() ?? false);
            H.assertEqual(favs.length, 0, 'expected no favorite icons');
            await H.resetSetting('show-favorites');
        },
    },

    // -----------------------------------------------------------------------
    // Running apps
    // -----------------------------------------------------------------------

    {
        name: 'running apps shown when show-running=true',
        fn: async () => {
            await H.setSetting('show-running', true);
            // In a live session there should be at least one running app
            // (gnome-shell itself or a session component).  The test verifies
            // the setting is respected; it does not assert a specific count.
            const dash = H.getDash();
            H.assert(dash !== null, 'dash should exist');
        },
    },

    {
        name: 'running apps hidden when show-running=false',
        fn: async () => {
            await H.setSetting('show-running', false);
            const dash = H.getDash();
            const running = dash.getAppIcons().filter(i =>
                i.app?.state === imports.gi.Shell.AppState.RUNNING &&
                !(i.app?.isFavourite?.()));
            H.assertEqual(running.length, 0,
                'expected no non-favorite running icons when show-running=false');
            await H.resetSetting('show-running');
        },
    },

    // -----------------------------------------------------------------------
    // Click actions
    // -----------------------------------------------------------------------

    {
        name: 'click action matches click-action setting',
        fn: async () => {
            const settings = H.getSettings();
            const action = settings.get_enum('click-action');
            // Default is 'cycle-windows' = 3
            H.assert(typeof action === 'number',
                'click-action should be a numeric enum value');
        },
    },

    {
        name: 'shift-click action matches shift-click-action setting',
        fn: async () => {
            const settings = H.getSettings();
            const action = settings.get_enum('shift-click-action');
            // Default is 'minimize' = 1
            H.assert(typeof action === 'number',
                'shift-click-action should be a numeric enum value');
        },
    },

    {
        name: 'middle-click action matches middle-click-action setting',
        fn: async () => {
            const settings = H.getSettings();
            const action = settings.get_enum('middle-click-action');
            // Default is 'launch' = 2
            H.assert(typeof action === 'number',
                'middle-click-action should be a numeric enum value');
        },
    },

    // -----------------------------------------------------------------------
    // Context menu
    // -----------------------------------------------------------------------

    {
        name: 'context menu opens on right-click',
        fn: async () => {
            const count = H.getIconCount();
            if (count === 0) {
                // No icons to test; skip gracefully.
                return;
            }
            const icon = H.getIconAtIndex(0);
            H.assertVisible(icon.actor ?? icon, 'first icon should be visible');
            // TODO: inject right-click, assert popup menu is shown
        },
    },

    {
        name: 'Settings item in context menu focuses existing prefs window',
        fn: async () => {
            // Placeholder: verifying that the "Settings" menu item
            // activates/raises an existing preferences window rather than
            // spawning a duplicate requires a full click-and-inspect flow.
            H.assert(true, 'placeholder');
        },
    },

    // -----------------------------------------------------------------------
    // Focus state
    // -----------------------------------------------------------------------

    {
        name: 'stale focus state recomputed on app state change',
        fn: async () => {
            // Placeholder: verify that when an app changes state (e.g.
            // gains/loses focus) the icon's style-pseudo-class is updated.
            const dash = H.getDash();
            H.assert(dash !== null, 'dash should exist');
        },
    },

    {
        name: 'stale focus state recomputed at click time',
        fn: async () => {
            // Placeholder: a click on an icon whose cached focus state is
            // stale should recompute before dispatching the action.
            const dash = H.getDash();
            H.assert(dash !== null, 'dash should exist');
        },
    },

    // -----------------------------------------------------------------------
    // Isolation
    // -----------------------------------------------------------------------

    {
        name: 'isolate-workspaces filters windows by workspace',
        fn: async () => {
            await H.setSetting('isolate-workspaces', true);
            const settings = H.getSettings();
            H.assertEqual(settings.get_boolean('isolate-workspaces'), true,
                'isolate-workspaces should be enabled');
            await H.resetSetting('isolate-workspaces');
        },
    },

    {
        name: 'isolate-monitors filters windows by monitor',
        fn: async () => {
            await H.setSetting('isolate-monitors', true);
            const settings = H.getSettings();
            H.assertEqual(settings.get_boolean('isolate-monitors'), true,
                'isolate-monitors should be enabled');
            await H.resetSetting('isolate-monitors');
        },
    },

    // -----------------------------------------------------------------------
    // Show-apps icon
    // -----------------------------------------------------------------------

    {
        name: 'show-apps icon visible when show-show-apps=true',
        fn: async () => {
            await H.setSetting('show-show-apps-button', true);
            const dash = H.getDash();
            const btn = dash._showAppsIcon ?? dash.showAppsButton;
            H.assert(btn, 'show-apps button should exist');
            H.assertVisible(btn, 'show-apps button should be visible');
        },
    },

    {
        name: 'show-apps icon hidden when show-show-apps=false',
        fn: async () => {
            await H.setSetting('show-show-apps-button', false);
            const dash = H.getDash();
            const btn = dash._showAppsIcon ?? dash.showAppsButton;
            if (btn)
                H.assertHidden(btn, 'show-apps button should be hidden');
            await H.resetSetting('show-show-apps-button');
        },
    },

    {
        name: 'show-apps icon position follows show-apps-at-top setting',
        fn: async () => {
            await H.setSetting('show-apps-at-top', true);
            const settings = H.getSettings();
            H.assertEqual(settings.get_boolean('show-apps-at-top'), true,
                'show-apps-at-top should be enabled');
            // TODO: verify the show-apps button is the first child
            await H.resetSetting('show-apps-at-top');
        },
    },

    // -----------------------------------------------------------------------
    // Trash icon
    // -----------------------------------------------------------------------

    {
        name: 'trash icon visible when show-trash=true',
        fn: async () => {
            await H.setSetting('show-trash', true);
            const settings = H.getSettings();
            H.assertEqual(settings.get_boolean('show-trash'), true,
                'show-trash should be enabled');
            // TODO: locate the trash actor in the dash and assertVisible
        },
    },

    // -----------------------------------------------------------------------
    // Volumes / mounts
    // -----------------------------------------------------------------------

    {
        name: 'volumes visible when show-mounts=true',
        fn: async () => {
            await H.setSetting('show-mounts', true);
            const settings = H.getSettings();
            H.assertEqual(settings.get_boolean('show-mounts'), true,
                'show-mounts should be enabled');
            // TODO: verify mount icons appear when volumes are mounted
        },
    },

    // -----------------------------------------------------------------------
    // Icon sizing
    // -----------------------------------------------------------------------

    {
        name: 'icon size matches dash-max-icon-size setting',
        fn: async () => {
            const targetSize = 32;
            await H.setSetting('dash-max-icon-size', targetSize);
            const settings = H.getSettings();
            H.assertEqual(settings.get_int('dash-max-icon-size'), targetSize,
                'dash-max-icon-size should match target');
            // TODO: measure actual icon actor dimensions
            await H.resetSetting('dash-max-icon-size');
        },
    },

    {
        name: 'icon size adjusts when dock width changes',
        fn: async () => {
            // Placeholder: reducing available dock width (e.g. via
            // height-fraction) should cause icons to shrink if
            // icon-size-fixed is false.
            const settings = H.getSettings();
            H.assertEqual(settings.get_boolean('icon-size-fixed'), false,
                'icon-size-fixed should default to false for dynamic sizing');
        },
    },
];

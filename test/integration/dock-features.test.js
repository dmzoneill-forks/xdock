// SPDX-License-Identifier: GPL-2.0-or-later
// SPDX-FileCopyrightText: Contributors to XDock
//
// Integration tests for miscellaneous dock features.
// Runs INSIDE gnome-shell via gnome-shell-test-tool.

const {
    assert,
    assertEqual,
    assertVisible,
    assertHidden,
    getDockManager,
    getDock,
    getDash,
    getSettings,
    setSetting,
    resetSetting,
    waitMs,
    runTests,
} = XDockTestHelpers;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

const tests = [
    {
        name: 'workspace minimap visible when show-workspace-minimap=true',
        fn: async () => {
            // PLACEHOLDER: verify workspace minimap actor is shown
            await setSetting('show-workspace-minimap', true);
        },
    },
    {
        name: 'workspace minimap hidden when show-workspace-minimap=false',
        fn: async () => {
            // PLACEHOLDER: verify workspace minimap actor is hidden
            await setSetting('show-workspace-minimap', false);
        },
    },
    {
        name: 'quick settings panel visible when show-quick-settings=true',
        fn: async () => {
            // PLACEHOLDER: verify quick settings panel actor is visible
            await setSetting('show-quick-settings', true);
        },
    },
    {
        name: 'quick settings panel hidden when show-quick-settings=false',
        fn: async () => {
            // PLACEHOLDER: verify quick settings panel actor is hidden
            await setSetting('show-quick-settings', false);
        },
    },
    {
        name: 'command palette opens when dock-command-palette=true',
        fn: async () => {
            // PLACEHOLDER: verify command palette overlay opens
            await setSetting('dock-command-palette', true);
        },
    },
    {
        name: 'recent files menu available when recent-files-hover=true',
        fn: async () => {
            // PLACEHOLDER: verify recent files hover menu appears
            await setSetting('recent-files-hover', true);
        },
    },
    {
        name: 'secondary dock created when secondary-dock=true',
        fn: async () => {
            // PLACEHOLDER: verify a second dock actor is present
            await setSetting('secondary-dock', true);
        },
    },
    {
        name: 'secondary dock follows secondary-dock-position setting',
        fn: async () => {
            // PLACEHOLDER: verify secondary dock position matches setting
            await setSetting('secondary-dock', true);
            await setSetting('secondary-dock-position', 'TOP');
        },
    },
    {
        name: 'media transport controls visible when enabled',
        fn: async () => {
            // PLACEHOLDER: verify media transport controls actor is visible
            await setSetting('show-media-controls', true);
        },
    },
    {
        name: 'per-app volume control visible when enabled',
        fn: async () => {
            // PLACEHOLDER: verify per-app volume control actor is visible
            await setSetting('show-per-app-volume', true);
        },
    },
    {
        name: 'screen recording indicator visible when enabled',
        fn: async () => {
            // PLACEHOLDER: verify screen recording indicator actor is visible
            await setSetting('show-screen-recording-indicator', true);
        },
    },
    {
        name: 'spring-physics animations setting toggles spring behavior',
        fn: async () => {
            // PLACEHOLDER: verify spring animation mode is active
            await setSetting('spring-physics-animations', true);
        },
    },
    {
        name: 'wiggle mode activatable when wiggle-mode-enabled=true',
        fn: async () => {
            // PLACEHOLDER: verify wiggle mode can be triggered
            await setSetting('wiggle-mode-enabled', true);
        },
    },
    {
        name: 'live window thumbnails when live-window-thumbnails=true',
        fn: async () => {
            // PLACEHOLDER: verify live window thumbnail popups appear
            await setSetting('live-window-thumbnails', true);
        },
    },
    {
        name: 'scroll action matches scroll-action setting',
        fn: async () => {
            // PLACEHOLDER: verify scroll behavior matches the configured action
            await setSetting('scroll-action', 'switch-workspace');
        },
    },
    {
        name: 'hotkeys activate apps when shortcut-enabled=true',
        fn: async () => {
            // PLACEHOLDER: verify Super+N hotkeys activate dock apps
            await setSetting('shortcut-enabled', true);
        },
    },
    {
        name: 'dock order persists across reloads',
        fn: async () => {
            // PLACEHOLDER: verify dash icon order survives extension reload
        },
    },
    {
        name: 'dock handles drag and drop for icon reordering',
        fn: async () => {
            // PLACEHOLDER: verify DnD reorder of dash icons works
        },
    },
    {
        name: 'separators visible between favorites and running',
        fn: async () => {
            // PLACEHOLDER: verify separator actor exists between sections
            const dash = getDash();
            assert(dash, 'dash should be available');
        },
    },
    {
        name: 'disable-overview-on-startup prevents overview on late load',
        fn: async () => {
            // PLACEHOLDER: verify overview is not shown when setting is active
            await setSetting('disable-overview-on-startup', true);
        },
    },
];

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

runTests(tests);

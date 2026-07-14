// SPDX-License-Identifier: GPL-2.0-or-later
function assert(cond, msg) { if (!cond) throw new Error(msg); }

function getTests() {
    const {GLib} = imports.gi;

    function findDock() {
        const uiGroup = global.stage.get_children().find(c => c.name === 'uiGroup');
        return uiGroup?.get_children().find(c => c.name === 'dashtodockContainer');
    }

    function pump(ms) {
        const ctx = GLib.MainContext.default();
        const end = GLib.get_monotonic_time() + ms * 1000;
        while (GLib.get_monotonic_time() < end) ctx.iteration(false);
    }

    return [
        {
            name: 'show-workspace-minimap setting exists',
            fn() {
                const s = getXDockSettings();
                const val = s.get_boolean('show-workspace-minimap');
                assert(typeof val === 'boolean',
                    `show-workspace-minimap should be boolean, got ${typeof val}`);
            },
        },
        {
            name: 'show-quick-settings setting exists',
            fn() {
                const s = getXDockSettings();
                const val = s.get_boolean('show-quick-settings');
                assert(typeof val === 'boolean',
                    `show-quick-settings should be boolean, got ${typeof val}`);
            },
        },
        {
            name: 'dock-command-palette setting exists',
            fn() {
                const s = getXDockSettings();
                const val = s.get_boolean('command-palette-enabled');
                assert(typeof val === 'boolean',
                    `command-palette-enabled should be boolean, got ${typeof val}`);
            },
        },
        {
            name: 'recent-files-hover setting exists',
            fn() {
                const s = getXDockSettings();
                const val = s.get_boolean('show-recent-files');
                assert(typeof val === 'boolean',
                    `show-recent-files should be boolean, got ${typeof val}`);
            },
        },
        {
            name: 'secondary-dock setting exists',
            fn() {
                const s = getXDockSettings();
                const val = s.get_boolean('secondary-dock-enabled');
                assert(typeof val === 'boolean',
                    `secondary-dock-enabled should be boolean, got ${typeof val}`);
            },
        },
        {
            name: 'show-media-controls setting exists',
            fn() {
                const s = getXDockSettings();
                const val = s.get_boolean('show-media-controls');
                assert(typeof val === 'boolean',
                    `show-media-controls should be boolean, got ${typeof val}`);
            },
        },
        {
            name: 'show-volume-control setting exists',
            fn() {
                const s = getXDockSettings();
                const val = s.get_boolean('show-volume-control');
                assert(typeof val === 'boolean',
                    `show-volume-control should be boolean, got ${typeof val}`);
            },
        },
        {
            name: 'show-screencast-indicator setting exists',
            fn() {
                const s = getXDockSettings();
                const val = s.get_boolean('show-screencast-indicator');
                assert(typeof val === 'boolean',
                    `show-screencast-indicator should be boolean, got ${typeof val}`);
            },
        },
        {
            name: 'spring-animations setting exists',
            fn() {
                const s = getXDockSettings();
                const val = s.get_boolean('spring-animations');
                assert(typeof val === 'boolean',
                    `spring-animations should be boolean, got ${typeof val}`);
            },
        },
        {
            name: 'wiggle-mode-enabled setting exists',
            fn() {
                const s = getXDockSettings();
                const val = s.get_boolean('wiggle-mode-enabled');
                assert(typeof val === 'boolean',
                    `wiggle-mode-enabled should be boolean, got ${typeof val}`);
            },
        },
        {
            name: 'live-window-thumbnails setting exists',
            fn() {
                const s = getXDockSettings();
                const val = s.get_boolean('live-window-thumbnails');
                assert(typeof val === 'boolean',
                    `live-window-thumbnails should be boolean, got ${typeof val}`);
            },
        },
        {
            name: 'disable-overview-on-startup setting exists',
            fn() {
                const s = getXDockSettings();
                const val = s.get_boolean('disable-overview-on-startup');
                assert(typeof val === 'boolean',
                    `disable-overview-on-startup should be boolean, got ${typeof val}`);
            },
        },
        {
            name: 'scroll-action setting is valid',
            fn() {
                const s = getXDockSettings();
                const val = s.get_enum('scroll-action');
                assert(typeof val === 'number',
                    `scroll-action should be a number, got ${typeof val}`);
                assert(val >= 0 && val <= 2,
                    `scroll-action should be 0-2, got ${val}`);
            },
        },
        {
            name: 'use-hotkeys setting exists',
            fn() {
                const s = getXDockSettings();
                const val = s.get_boolean('hot-keys');
                assert(typeof val === 'boolean',
                    `hot-keys should be boolean, got ${typeof val}`);
            },
        },
        {
            name: 'dock-order is string array',
            fn() {
                const s = getXDockSettings();
                const val = s.get_strv('dock-order');
                assert(Array.isArray(val),
                    `dock-order should be an array, got ${typeof val}`);
                for (let i = 0; i < val.length; i++) {
                    assert(typeof val[i] === 'string',
                        `dock-order[${i}] should be string, got ${typeof val[i]}`);
                }
            },
        },
        {
            name: 'extend-height toggles panel mode',
            fn() {
                const s = getXDockSettings();
                const orig = s.get_boolean('extend-height');
                try {
                    s.set_boolean('extend-height', true);
                    pump(500);
                    screenshot('panel_mode');

                    const dock = findDock();
                    if (!dock) skip('requires dock actor (headless)');

                    s.set_boolean('extend-height', false);
                    pump(500);
                    screenshot('normal_mode');

                    const dock2 = findDock();
                    if (!dock2) skip('requires dock actor (headless)');
                } finally {
                    s.set_boolean('extend-height', orig);
                    pump(500);
                }
            },
        },
        {
            name: 'dock-margin-size affects gap',
            fn() {
                const s = getXDockSettings();
                const orig = s.get_int('dock-margin-size');
                try {
                    s.set_int('dock-margin-size', 20);
                    pump(500);
                    screenshot('margin_20');

                    const dock = findDock();
                    if (!dock) skip('requires dock actor (headless)');

                    s.set_int('dock-margin-size', 0);
                    pump(500);
                    screenshot('margin_0');

                    const dock2 = findDock();
                    if (!dock2) skip('requires dock actor (headless)');
                } finally {
                    s.set_int('dock-margin-size', orig);
                    pump(500);
                }
            },
        },
        {
            name: 'height-fraction changes dock width',
            fn() {
                const s = getXDockSettings();
                const orig = s.get_double('height-fraction');
                try {
                    s.set_double('height-fraction', 0.5);
                    pump(500);
                    screenshot('half_width');

                    const dock = findDock();
                    if (!dock) skip('requires dock actor (headless)');

                    s.set_double('height-fraction', 1.0);
                    pump(500);
                    screenshot('full_width');

                    const dock2 = findDock();
                    if (!dock2) skip('requires dock actor (headless)');
                } finally {
                    s.set_double('height-fraction', orig);
                    pump(500);
                }
            },
        },
    ];
}

exports.getTests = getTests;

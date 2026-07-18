// SPDX-License-Identifier: GPL-2.0-or-later
function assert(cond, msg) { if (!cond) throw new Error(msg); }

function getTests() {
    const {GLib, Gio, Clutter, St} = imports.gi;

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
            name: 'dock-position enum exists',
            fn() {
                const settings = getXDockSettings();
                const val = settings.get_enum('dock-position');
                assert(val >= 0 && val <= 3,
                    `dock-position enum value ${val} not in range 0-3`);
            },
        },
        {
            name: 'dock-style enum exists',
            fn() {
                const settings = getXDockSettings();
                const val = settings.get_enum('dock-style');
                assert(val >= 0 && val <= 1,
                    `dock-style enum value ${val} not in range 0-1`);
            },
        },
        {
            name: 'transparency-mode enum exists',
            fn() {
                const settings = getXDockSettings();
                const val = settings.get_enum('transparency-mode');
                assert(val === 0 || val === 1 || val === 3,
                    `transparency-mode enum value ${val} not one of 0, 1, 3`);
            },
        },
        {
            name: 'running-indicator-style enum exists',
            fn() {
                const settings = getXDockSettings();
                const val = settings.get_enum('running-indicator-style');
                assert(val >= 0 && val <= 10,
                    `running-indicator-style enum value ${val} not in range 0-10`);
            },
        },
        {
            name: 'click-action enum exists',
            fn() {
                const settings = getXDockSettings();
                const val = settings.get_enum('click-action');
                assert(val >= 0 && val <= 12,
                    `click-action enum value ${val} not in range 0-12`);
            },
        },
        {
            name: 'scroll-action enum exists',
            fn() {
                const settings = getXDockSettings();
                const val = settings.get_enum('scroll-action');
                assert(val >= 0 && val <= 2,
                    `scroll-action enum value ${val} not in range 0-2`);
            },
        },
        {
            name: 'all double settings are in valid range',
            fn() {
                const settings = getXDockSettings();
                const ranges = {
                    'background-opacity': [0, 1],
                    'min-alpha': [0, 1],
                    'max-alpha': [0, 1],
                    'height-fraction': [0, 1],
                    'shelf-angle': [0, 0.5],
                    'shelf-height': [0.1, 0.8],
                    'hotkey-label-scale': [0.1, 0.6],
                    'spring-overshoot-clamp': [1.0, 1.5],
                };
                for (const [key, [lo, hi]] of Object.entries(ranges)) {
                    const val = settings.get_double(key);
                    assert(val >= lo && val <= hi,
                        `${key} value ${val} not in range [${lo}, ${hi}]`);
                }
            },
        },
        {
            name: 'all int settings are positive',
            fn() {
                const settings = getXDockSettings();
                const keys = [
                    'dash-max-icon-size',
                    'magnification-spread',
                    'preview-max-height',
                    'pressure-show-timeout',
                    'magnification-easing-duration',
                    'startup-animation-time',
                    'icon-animator-duration',
                    'preview-animation-duration',
                    'preview-hover-enter-timeout',
                    'preview-hover-leave-timeout',
                    'aero-peek-opacity',
                    'aero-peek-duration',
                    'intellihide-check-interval',
                    'scroll-cycle-debounce',
                    'scroll-workspace-deadtime',
                    'wiggle-long-press-timeout',
                    'window-cycle-memory-time',
                    'dock-edge-dwell-width',
                    'dock-dwell-check-interval',
                    'shelf-corner-radius-top',
                    'shelf-corner-radius-bottom',
                    'reflection-size',
                    'progress-arc-width',
                    'tooltip-max-width-px',
                    'tooltip-max-width-percent',
                ];
                for (const key of keys) {
                    const val = settings.get_int(key);
                    assert(val > 0,
                        `${key} value ${val} is not positive`);
                }
            },
        },
        {
            name: 'all boolean settings are readable',
            fn() {
                const settings = getXDockSettings();
                const keys = [
                    'disable-overview-on-startup',
                    'custom-background-color',
                    'customize-alphas',
                    'running-indicator-dominant-color',
                    'manualhide',
                    'intellihide',
                    'autohide',
                    'require-pressure-to-show',
                    'autohide-in-fullscreen',
                    'show-dock-urgent-notify',
                    'dock-fixed',
                    'icon-size-fixed',
                    'apply-custom-theme',
                    'custom-theme-shrink',
                    'custom-theme-customize-running-dots',
                    'show-running',
                    'group-apps',
                    'isolate-workspaces',
                    'workspace-agnostic-urgent-windows',
                    'isolate-monitors',
                    'scroll-to-focused-application',
                    'show-windows-preview',
                    'default-windows-preview-to-open',
                    'show-favorites',
                    'show-trash',
                    'show-mounts',
                    'show-mounts-only-mounted',
                    'show-mounts-network',
                    'isolate-locations',
                    'dance-urgent-applications',
                    'bounce-icons',
                    'show-show-apps-button',
                    'show-apps-at-top',
                    'show-apps-always-in-the-edge',
                    'extend-height',
                    'always-center-icons',
                    'multi-monitor',
                    'hot-keys',
                    'hotkeys-show-dock',
                    'hotkeys-overlay',
                    'force-straight-corner',
                    'unity-backlit-items',
                    'apply-glossy-effect',
                    'hide-tooltip',
                    'show-icons-emblems',
                    'show-icons-notifications-counter',
                    'application-counter-overrides-notifications',
                    'clear-notifications-on-focus',
                    'spring-animations',
                    'show-pinned-commands',
                    'dock-tiling-enabled',
                    'show-previews-hover',
                    'show-workspace-minimap',
                    'show-recent-files',
                    'show-quick-settings',
                    'drag-to-focus',
                    'show-screencast-indicator',
                    'show-media-controls',
                    'wiggle-mode-enabled',
                    'wallpaper-adaptive-color',
                    'icon-magnification',
                    'icon-magnification-all',
                    'magnification-hover-highlight',
                    'show-volume-control',
                    'command-palette-enabled',
                    'live-window-thumbnails',
                    'shelf-reflection',
                    'secondary-dock-enabled',
                ];
                for (const key of keys) {
                    const val = settings.get_boolean(key);
                    assert(typeof val === 'boolean',
                        `${key} did not return a boolean, got ${typeof val}`);
                }
            },
        },
        {
            name: 'dock-style change to SHELF adds shelf class',
            fn() {
                const settings = getXDockSettings();
                const orig = settings.get_enum('dock-style');
                try {
                    settings.set_enum('dock-style', 1); // SHELF
                    pump(500);
                    const dock = findDock();
                    if (!dock) skip('requires dock actor (headless)');
                    const classes = dock.get_style_class_name() || '';
                    assert(classes.includes('shelf'),
                        `Expected "shelf" class after dock-style=SHELF, got: "${classes}"`);
                    screenshot('prefs_shelf');
                } finally {
                    settings.set_enum('dock-style', orig);
                    pump(500);
                }
            },
        },
        {
            name: 'dock-style change to FLAT removes shelf class',
            fn() {
                const settings = getXDockSettings();
                const orig = settings.get_enum('dock-style');
                try {
                    // First ensure shelf is set so we can verify removal
                    settings.set_enum('dock-style', 1); // SHELF
                    pump(500);
                    settings.set_enum('dock-style', 0); // FLAT
                    pump(500);
                    const dock = findDock();
                    if (!dock) skip('requires dock actor (headless)');
                    const classes = dock.get_style_class_name() || '';
                    assert(!classes.includes('shelf'),
                        `Expected no "shelf" class after dock-style=FLAT, got: "${classes}"`);
                    screenshot('prefs_flat');
                } finally {
                    settings.set_enum('dock-style', orig);
                    pump(500);
                }
            },
        },
        {
            name: 'extend-height toggles extended class',
            fn() {
                const settings = getXDockSettings();
                const orig = settings.get_boolean('extend-height');
                try {
                    settings.set_boolean('extend-height', true);
                    pump(500);
                    const dock = findDock();
                    if (!dock) skip('requires dock actor (headless)');
                    const classes = dock.get_style_class_name() || '';
                    assert(classes.includes('extended'),
                        `Expected "extended" class after extend-height=true, got: "${classes}"`);
                    screenshot('prefs_extended');
                } finally {
                    settings.set_boolean('extend-height', orig);
                    pump(500);
                }
            },
        },
        {
            name: 'custom-theme-shrink toggles shrink class',
            fn() {
                const settings = getXDockSettings();
                const orig = settings.get_boolean('custom-theme-shrink');
                try {
                    settings.set_boolean('custom-theme-shrink', true);
                    pump(500);
                    const dock = findDock();
                    if (!dock) skip('requires dock actor (headless)');
                    const classes = dock.get_style_class_name() || '';
                    assert(classes.includes('shrink'),
                        `Expected "shrink" class after custom-theme-shrink=true, got: "${classes}"`);
                    screenshot('prefs_shrink');
                } finally {
                    settings.set_boolean('custom-theme-shrink', orig);
                    pump(500);
                }
            },
        },
        {
            name: 'force-straight-corner toggles straight-corner class',
            fn() {
                const settings = getXDockSettings();
                const origStraight = settings.get_boolean('force-straight-corner');
                const origCustom = settings.get_boolean('apply-custom-theme');
                try {
                    // force-straight-corner only applies when apply-custom-theme is OFF
                    settings.set_boolean('apply-custom-theme', false);
                    settings.set_boolean('force-straight-corner', true);
                    pump(500);
                    const dock = findDock();
                    if (!dock) skip('requires dock actor (headless)');
                    const classes = dock.get_style_class_name() || '';
                    assert(classes.includes('straight-corner'),
                        `Expected "straight-corner" class after force-straight-corner=true, got: "${classes}"`);
                    screenshot('prefs_straight');
                } finally {
                    settings.set_boolean('force-straight-corner', origStraight);
                    settings.set_boolean('apply-custom-theme', origCustom);
                    pump(500);
                }
            },
        },
        {
            name: 'apply-custom-theme toggles dashtodock class',
            fn() {
                const settings = getXDockSettings();
                const orig = settings.get_boolean('apply-custom-theme');
                try {
                    settings.set_boolean('apply-custom-theme', true);
                    pump(500);
                    const dock = findDock();
                    if (!dock) skip('requires dock actor (headless)');
                    const classes = dock.get_style_class_name() || '';
                    assert(classes.includes('dashtodock'),
                        `Expected "dashtodock" class after apply-custom-theme=true, got: "${classes}"`);
                } finally {
                    settings.set_boolean('apply-custom-theme', orig);
                    pump(500);
                }
            },
        },
    ];
}

exports.getTests = getTests;

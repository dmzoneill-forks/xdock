// SPDX-License-Identifier: GPL-2.0-or-later
// SPDX-FileCopyrightText: Contributors to XDock
//
// Integration tests: icon indicators and overlays.
// Runs INSIDE GNOME Shell headless via new Function('exports', 'getXDockSettings', 'screenshot', source).

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

    function getSettings() {
        return getXDockSettings();
    }

    return [
        // 1. running-indicator-style default is valid (enum 0-10)
        {name: 'running-indicator-style default is valid', fn() {
            const settings = getSettings();
            const style = settings.get_enum('running-indicator-style');
            assert(typeof style === 'number',
                'running-indicator-style should be a number, got ' + typeof style);
            assert(style >= 0 && style <= 10,
                'running-indicator-style should be 0-10, got ' + style);
            // Default is DEFAULT (0)
            assert(style === 0,
                'running-indicator-style default should be 0 (DEFAULT), got ' + style);
        }},

        // 2. running-indicator-style can be changed
        {name: 'running-indicator-style can be changed', fn() {
            const settings = getSettings();
            const original = settings.get_enum('running-indicator-style');
            try {
                // Set to DOTS (1)
                settings.set_enum('running-indicator-style', 1);
                pump(500);
                const afterDots = settings.get_enum('running-indicator-style');
                assert(afterDots === 1,
                    'running-indicator-style should be 1 (DOTS) after set, got ' + afterDots);
                screenshot('dots_indicator');

                // Set to SOLID (5)
                settings.set_enum('running-indicator-style', 5);
                pump(500);
                const afterSolid = settings.get_enum('running-indicator-style');
                assert(afterSolid === 5,
                    'running-indicator-style should be 5 (SOLID) after set, got ' + afterSolid);
                screenshot('solid_indicator');
            } finally {
                settings.set_enum('running-indicator-style', original);
                pump(500);
            }
        }},

        // 3. progress-arc-width default is 3
        {name: 'progress-arc-width default is 3', fn() {
            const settings = getSettings();
            const width = settings.get_int('progress-arc-width');
            assert(typeof width === 'number',
                'progress-arc-width should be a number, got ' + typeof width);
            assert(width === 3,
                'progress-arc-width default should be 3, got ' + width);
        }},

        // 4. hotkey-label-scale default is 0.3
        {name: 'hotkey-label-scale default is 0.3', fn() {
            const settings = getSettings();
            const scale = settings.get_double('hotkey-label-scale');
            assert(typeof scale === 'number',
                'hotkey-label-scale should be a number, got ' + typeof scale);
            assert(Math.abs(scale - 0.3) < 0.001,
                'hotkey-label-scale default should be 0.3, got ' + scale);
        }},

        // 5. tooltip-max-width-px default is 700
        {name: 'tooltip-max-width-px default is 700', fn() {
            const settings = getSettings();
            const maxWidth = settings.get_int('tooltip-max-width-px');
            assert(typeof maxWidth === 'number',
                'tooltip-max-width-px should be a number, got ' + typeof maxWidth);
            assert(maxWidth === 700,
                'tooltip-max-width-px default should be 700, got ' + maxWidth);
        }},

        // 6. show-icons-emblems setting exists
        {name: 'show-icons-emblems setting exists', fn() {
            const settings = getSettings();
            const emblems = settings.get_boolean('show-icons-emblems');
            assert(typeof emblems === 'boolean',
                'show-icons-emblems should be a boolean, got ' + typeof emblems);
            // Default is true
            assert(emblems === true,
                'show-icons-emblems default should be true, got ' + emblems);
        }},

        // 7. show-icons-emblems toggles
        {name: 'show-icons-emblems toggles', fn() {
            const settings = getSettings();
            const original = settings.get_boolean('show-icons-emblems');
            try {
                // Set to false
                settings.set_boolean('show-icons-emblems', false);
                pump(500);
                const afterOff = settings.get_boolean('show-icons-emblems');
                assert(afterOff === false,
                    'show-icons-emblems should be false after set, got ' + afterOff);
                screenshot('emblems_off');

                // Set to true
                settings.set_boolean('show-icons-emblems', true);
                pump(500);
                const afterOn = settings.get_boolean('show-icons-emblems');
                assert(afterOn === true,
                    'show-icons-emblems should be true after set, got ' + afterOn);
                screenshot('emblems_on');
            } finally {
                settings.set_boolean('show-icons-emblems', original);
                pump(500);
            }
        }},

        // 8. scroll-cycle-debounce default is 250
        {name: 'scroll-cycle-debounce default is 250', fn() {
            const settings = getSettings();
            const debounce = settings.get_int('scroll-cycle-debounce');
            assert(typeof debounce === 'number',
                'scroll-cycle-debounce should be a number, got ' + typeof debounce);
            assert(debounce === 250,
                'scroll-cycle-debounce default should be 250, got ' + debounce);
        }},

        // 9. wiggle-long-press-timeout default is 500
        {name: 'wiggle-long-press-timeout default is 500', fn() {
            const settings = getSettings();
            const timeout = settings.get_int('wiggle-long-press-timeout');
            assert(typeof timeout === 'number',
                'wiggle-long-press-timeout should be a number, got ' + typeof timeout);
            assert(timeout === 500,
                'wiggle-long-press-timeout default should be 500, got ' + timeout);
        }},

        // 10. window-cycle-memory-time default is 3000
        {name: 'window-cycle-memory-time default is 3000', fn() {
            const settings = getSettings();
            const memTime = settings.get_int('window-cycle-memory-time');
            assert(typeof memTime === 'number',
                'window-cycle-memory-time should be a number, got ' + typeof memTime);
            assert(memTime === 3000,
                'window-cycle-memory-time default should be 3000, got ' + memTime);
        }},

        // 11. icon-animator-duration default is 3000
        {name: 'icon-animator-duration default is 3000', fn() {
            const settings = getSettings();
            const duration = settings.get_int('icon-animator-duration');
            assert(typeof duration === 'number',
                'icon-animator-duration should be a number, got ' + typeof duration);
            assert(duration === 3000,
                'icon-animator-duration default should be 3000, got ' + duration);
        }},

        // 12. running-indicator-dominant-color setting exists
        {name: 'running-indicator-dominant-color setting exists', fn() {
            const settings = getSettings();
            const domColor = settings.get_boolean('running-indicator-dominant-color');
            assert(typeof domColor === 'boolean',
                'running-indicator-dominant-color should be a boolean, got ' + typeof domColor);
            // Default is false
            assert(domColor === false,
                'running-indicator-dominant-color default should be false, got ' + domColor);
        }},

        // 13. custom-theme-running-dots setting exists
        {name: 'custom-theme-running-dots setting exists', fn() {
            const settings = getSettings();
            const customDots = settings.get_boolean('custom-theme-customize-running-dots');
            assert(typeof customDots === 'boolean',
                'custom-theme-customize-running-dots should be a boolean, got ' + typeof customDots);
            // Default is false
            assert(customDots === false,
                'custom-theme-customize-running-dots default should be false, got ' + customDots);
        }},
    ];
}

exports.getTests = getTests;

// SPDX-License-Identifier: GPL-2.0-or-later
// Visual change tests — verify screenshots capture real dock state changes.
// These tests mutate settings, wait for the dock to respond, and screenshot.

function assert(cond, msg) { if (!cond) throw new Error(msg); }

function getTests() {
    const {GLib, Gio, Clutter} = imports.gi;

    function findDock() {
        const uiGroup = global.stage.get_children().find(c => c.name === 'uiGroup');
        return uiGroup?.get_children().find(c => c.name === 'dashtodockContainer');
    }

    function pump(ms) {
        const ctx = GLib.MainContext.default();
        const end = GLib.get_monotonic_time() + ms * 1000;
        while (GLib.get_monotonic_time() < end)
            ctx.iteration(false);
    }

    return [
        {name: 'VISUAL: dock visible at bottom (baseline)', fn() {
            const dock = findDock();
            assert(dock !== null, 'dock exists');
            assert(dock.visible, 'dock visible');
            screenshot('visual_01_baseline');
            pump(200);
        }},

        {name: 'VISUAL: enable shelf mode', fn() {
            const s = getXDockSettings();
            s.set_enum('dock-style', 1); // SHELF
            pump(500);
            screenshot('visual_02_shelf_enabled');
            const dock = findDock();
            const classes = dock.get_style_class_name() || '';
            assert(classes.includes('shelf'), 'should have shelf class after enable');
        }},

        {name: 'VISUAL: change shelf angle to max', fn() {
            const s = getXDockSettings();
            s.set_double('shelf-angle', 0.5);
            pump(500);
            screenshot('visual_03_shelf_angle_max');
        }},

        {name: 'VISUAL: change shelf angle to min', fn() {
            const s = getXDockSettings();
            s.set_double('shelf-angle', 0.05);
            pump(500);
            screenshot('visual_04_shelf_angle_min');
        }},

        {name: 'VISUAL: restore shelf angle', fn() {
            const s = getXDockSettings();
            s.set_double('shelf-angle', 0.2);
            pump(300);
        }},

        {name: 'VISUAL: disable shelf mode (back to flat)', fn() {
            const s = getXDockSettings();
            s.set_enum('dock-style', 0); // FLAT
            pump(500);
            screenshot('visual_05_flat_restored');
            const dock = findDock();
            const classes = dock.get_style_class_name() || '';
            assert(!classes.includes('shelf'), 'should not have shelf class');
        }},

        {name: 'VISUAL: enable shelf mode again for remaining tests', fn() {
            const s = getXDockSettings();
            s.set_enum('dock-style', 1);
            pump(500);
            screenshot('visual_06_shelf_again');
        }},

        {name: 'VISUAL: change background opacity to 0.3', fn() {
            const s = getXDockSettings();
            s.set_double('background-opacity', 0.3);
            pump(500);
            screenshot('visual_07_opacity_low');
        }},

        {name: 'VISUAL: change background opacity to 1.0', fn() {
            const s = getXDockSettings();
            s.set_double('background-opacity', 1.0);
            pump(500);
            screenshot('visual_08_opacity_full');
        }},

        {name: 'VISUAL: restore opacity', fn() {
            const s = getXDockSettings();
            s.set_double('background-opacity', 0.8);
            pump(300);
        }},

        {name: 'VISUAL: extend dock to full width', fn() {
            const s = getXDockSettings();
            s.set_boolean('extend-height', true);
            pump(500);
            screenshot('visual_09_extended');
        }},

        {name: 'VISUAL: restore normal width', fn() {
            const s = getXDockSettings();
            s.set_boolean('extend-height', false);
            pump(500);
            screenshot('visual_10_normal_width');
        }},

        {name: 'VISUAL: shrink dash', fn() {
            const s = getXDockSettings();
            s.set_boolean('custom-theme-shrink', true);
            pump(500);
            screenshot('visual_11_shrunk');
        }},

        {name: 'VISUAL: unshrink dash', fn() {
            const s = getXDockSettings();
            s.set_boolean('custom-theme-shrink', false);
            pump(500);
            screenshot('visual_12_unshrunk');
        }},
    ];
}

exports.getTests = getTests;

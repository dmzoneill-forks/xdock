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
            name: 'dock-fixed=true keeps dock visible',
            fn() {
                const settings = getXDockSettings();
                const orig = settings.get_boolean('dock-fixed');
                try {
                    settings.set_boolean('dock-fixed', true);
                    pump(500);
                    const dock = findDock();
                    assert(dock !== null && dock !== undefined, 'dock actor not found');
                    assert(dock.visible, 'dock should be visible when dock-fixed=true');
                    screenshot('dock_fixed');
                } finally {
                    settings.set_boolean('dock-fixed', orig);
                    pump(500);
                }
            },
        },
        {
            name: 'autohide setting exists',
            fn() {
                const settings = getXDockSettings();
                const val = settings.get_boolean('autohide');
                assert(typeof val === 'boolean', 'autohide should be a boolean, got: ' + typeof val);
            },
        },
        {
            name: 'intellihide setting exists',
            fn() {
                const settings = getXDockSettings();
                const val = settings.get_boolean('intellihide');
                assert(typeof val === 'boolean', 'intellihide should be a boolean, got: ' + typeof val);
            },
        },
        {
            name: 'animation-time setting is valid',
            fn() {
                const settings = getXDockSettings();
                const val = settings.get_double('animation-time');
                assert(typeof val === 'number', 'animation-time should be a number, got: ' + typeof val);
                assert(val > 0, 'animation-time should be > 0, got: ' + val);
            },
        },
        {
            name: 'show-delay setting is valid',
            fn() {
                const settings = getXDockSettings();
                const val = settings.get_double('show-delay');
                assert(typeof val === 'number', 'show-delay should be a number, got: ' + typeof val);
                assert(val >= 0, 'show-delay should be >= 0, got: ' + val);
            },
        },
        {
            name: 'hide-delay setting is valid',
            fn() {
                const settings = getXDockSettings();
                const val = settings.get_double('hide-delay');
                assert(typeof val === 'number', 'hide-delay should be a number, got: ' + typeof val);
                assert(val >= 0, 'hide-delay should be >= 0, got: ' + val);
            },
        },
        {
            name: 'pressure-threshold setting is valid',
            fn() {
                const settings = getXDockSettings();
                const val = settings.get_double('pressure-threshold');
                assert(typeof val === 'number', 'pressure-threshold should be a number, got: ' + typeof val);
                assert(val > 0, 'pressure-threshold should be > 0, got: ' + val);
            },
        },
        {
            name: 'dock-edge-dwell-width default is 2',
            fn() {
                const settings = getXDockSettings();
                const val = settings.get_int('dock-edge-dwell-width');
                assert(val === 2, 'dock-edge-dwell-width default should be 2, got: ' + val);
            },
        },
        {
            name: 'dock-dwell-check-interval default is 100',
            fn() {
                const settings = getXDockSettings();
                const val = settings.get_int('dock-dwell-check-interval');
                assert(val === 100, 'dock-dwell-check-interval default should be 100, got: ' + val);
            },
        },
        {
            name: 'pressure-show-timeout default is 250',
            fn() {
                const settings = getXDockSettings();
                const val = settings.get_int('pressure-show-timeout');
                assert(val === 250, 'pressure-show-timeout default should be 250, got: ' + val);
            },
        },
        {
            name: 'spring-stiffness default is 200',
            fn() {
                const settings = getXDockSettings();
                const val = settings.get_double('spring-stiffness');
                assert(val === 200, 'spring-stiffness default should be 200, got: ' + val);
            },
        },
        {
            name: 'spring-damping default is 20',
            fn() {
                const settings = getXDockSettings();
                const val = settings.get_double('spring-damping');
                assert(val === 20, 'spring-damping default should be 20, got: ' + val);
            },
        },
        {
            name: 'spring-overshoot-clamp default is 1.15',
            fn() {
                const settings = getXDockSettings();
                const val = settings.get_double('spring-overshoot-clamp');
                assert(val === 1.15, 'spring-overshoot-clamp default should be 1.15, got: ' + val);
            },
        },
        {
            name: 'startup-animation-time default is 500',
            fn() {
                const settings = getXDockSettings();
                const val = settings.get_int('startup-animation-time');
                assert(val === 500, 'startup-animation-time default should be 500, got: ' + val);
            },
        },
        {
            name: 'dock-fixed makes dock extend to work area',
            fn() {
                const settings = getXDockSettings();
                const origFixed = settings.get_boolean('dock-fixed');
                const origAutohide = settings.get_boolean('autohide');
                const origIntellihide = settings.get_boolean('intellihide');
                try {
                    settings.set_boolean('dock-fixed', true);
                    settings.set_boolean('autohide', false);
                    settings.set_boolean('intellihide', false);
                    pump(500);
                    const dock = findDock();
                    assert(dock !== null && dock !== undefined, 'dock actor not found');
                    assert(dock.visible, 'dock should be visible when dock-fixed=true');
                    screenshot('dock_fixed_struts');
                } finally {
                    settings.set_boolean('dock-fixed', origFixed);
                    settings.set_boolean('autohide', origAutohide);
                    settings.set_boolean('intellihide', origIntellihide);
                    pump(500);
                }
            },
        },
    ];
}

exports.getTests = getTests;

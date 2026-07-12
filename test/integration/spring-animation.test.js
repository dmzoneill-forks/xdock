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
            name: 'spring-stiffness default is 200',
            fn() {
                const settings = getXDockSettings();
                const val = settings.get_double('spring-stiffness');
                screenshot('spring-stiffness-default');
                assert(val === 200, `expected spring-stiffness default 200, got ${val}`);
            },
        },
        {
            name: 'spring-damping default is 20',
            fn() {
                const settings = getXDockSettings();
                const val = settings.get_double('spring-damping');
                screenshot('spring-damping-default');
                assert(val === 20, `expected spring-damping default 20, got ${val}`);
            },
        },
        {
            name: 'spring-overshoot-clamp default is 1.15',
            fn() {
                const settings = getXDockSettings();
                const val = settings.get_double('spring-overshoot-clamp');
                screenshot('spring-overshoot-clamp-default');
                assert(val === 1.15, `expected spring-overshoot-clamp default 1.15, got ${val}`);
            },
        },
        {
            name: 'spring-stiffness can be changed',
            fn() {
                const settings = getXDockSettings();
                const original = settings.get_double('spring-stiffness');
                try {
                    settings.set_double('spring-stiffness', 100);
                    pump(500);
                    const val = settings.get_double('spring-stiffness');
                    screenshot('spring-stiffness-changed-to-100');
                    assert(val === 100, `expected spring-stiffness 100 after set, got ${val}`);
                } finally {
                    settings.set_double('spring-stiffness', original);
                    pump(500);
                }
            },
        },
        {
            name: 'spring-damping can be changed',
            fn() {
                const settings = getXDockSettings();
                const original = settings.get_double('spring-damping');
                try {
                    settings.set_double('spring-damping', 10);
                    pump(500);
                    const val = settings.get_double('spring-damping');
                    screenshot('spring-damping-changed-to-10');
                    assert(val === 10, `expected spring-damping 10 after set, got ${val}`);
                } finally {
                    settings.set_double('spring-damping', original);
                    pump(500);
                }
            },
        },
        {
            name: 'spring-overshoot-clamp can be changed',
            fn() {
                const settings = getXDockSettings();
                const original = settings.get_double('spring-overshoot-clamp');
                try {
                    settings.set_double('spring-overshoot-clamp', 1.3);
                    pump(500);
                    const val = settings.get_double('spring-overshoot-clamp');
                    screenshot('spring-overshoot-clamp-changed-to-1.3');
                    assert(val === 1.3, `expected spring-overshoot-clamp 1.3 after set, got ${val}`);
                } finally {
                    settings.set_double('spring-overshoot-clamp', original);
                    pump(500);
                }
            },
        },
        {
            name: 'spring-animations setting exists',
            fn() {
                const settings = getXDockSettings();
                const val = settings.get_boolean('spring-animations');
                screenshot('spring-animations-setting');
                assert(typeof val === 'boolean', `expected spring-animations to be boolean, got ${typeof val}`);
            },
        },
        {
            name: 'startup-animation-time default is 500',
            fn() {
                const settings = getXDockSettings();
                const val = settings.get_int('startup-animation-time');
                screenshot('startup-animation-time-default');
                assert(val === 500, `expected startup-animation-time default 500, got ${val}`);
            },
        },
        {
            name: 'startup-animation-time can be changed',
            fn() {
                const settings = getXDockSettings();
                const original = settings.get_int('startup-animation-time');
                try {
                    settings.set_int('startup-animation-time', 1000);
                    pump(500);
                    const val = settings.get_int('startup-animation-time');
                    screenshot('startup-animation-time-changed-to-1000');
                    assert(val === 1000, `expected startup-animation-time 1000 after set, got ${val}`);
                } finally {
                    settings.set_int('startup-animation-time', original);
                    pump(500);
                }
            },
        },
        {
            name: 'icon-animator-duration default is 3000',
            fn() {
                const settings = getXDockSettings();
                const val = settings.get_int('icon-animator-duration');
                screenshot('icon-animator-duration-default');
                assert(val === 3000, `expected icon-animator-duration default 3000, got ${val}`);
            },
        },
    ];
}

exports.getTests = getTests;

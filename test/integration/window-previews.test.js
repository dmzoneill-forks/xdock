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
            name: 'preview-max-height default is 150',
            fn() {
                const s = getXDockSettings();
                const val = s.get_int('preview-max-height');
                assert(val === 150, `expected 150, got ${val}`);
            },
        },
        {
            name: 'preview-animation-duration default is 250',
            fn() {
                const s = getXDockSettings();
                const val = s.get_int('preview-animation-duration');
                assert(val === 250, `expected 250, got ${val}`);
            },
        },
        {
            name: 'preview-hover-enter-timeout default is 300',
            fn() {
                const s = getXDockSettings();
                const val = s.get_int('preview-hover-enter-timeout');
                assert(val === 300, `expected 300, got ${val}`);
            },
        },
        {
            name: 'preview-hover-leave-timeout default is 300',
            fn() {
                const s = getXDockSettings();
                const val = s.get_int('preview-hover-leave-timeout');
                assert(val === 300, `expected 300, got ${val}`);
            },
        },
        {
            name: 'aero-peek-opacity default is 3',
            fn() {
                const s = getXDockSettings();
                const val = s.get_int('aero-peek-opacity');
                assert(val === 3, `expected 3, got ${val}`);
            },
        },
        {
            name: 'aero-peek-duration default is 200',
            fn() {
                const s = getXDockSettings();
                const val = s.get_int('aero-peek-duration');
                assert(val === 200, `expected 200, got ${val}`);
            },
        },
        {
            name: 'show-previews-hover setting exists',
            fn() {
                const s = getXDockSettings();
                const val = s.get_boolean('show-previews-hover');
                assert(typeof val === 'boolean', `expected boolean, got ${typeof val}`);
                screenshot('show-previews-hover-default');
            },
        },
        {
            name: 'preview-animation-style setting exists',
            fn() {
                const s = getXDockSettings();
                const val = s.get_int('preview-animation-style');
                assert(typeof val === 'number', `expected number, got ${typeof val}`);
                assert(val >= 0 && val <= 6, `expected 0-6, got ${val}`);
            },
        },
        {
            name: 'preview-max-height can be changed',
            fn() {
                const s = getXDockSettings();
                const original = s.get_int('preview-max-height');
                try {
                    s.set_int('preview-max-height', 200);
                    pump(500);
                    const val = s.get_int('preview-max-height');
                    assert(val === 200, `expected 200 after set, got ${val}`);
                    screenshot('preview-max-height-changed');
                } finally {
                    s.set_int('preview-max-height', original);
                    pump(500);
                }
            },
        },
        {
            name: 'preview-hover-enter-timeout can be changed',
            fn() {
                const s = getXDockSettings();
                const original = s.get_int('preview-hover-enter-timeout');
                try {
                    s.set_int('preview-hover-enter-timeout', 500);
                    pump(500);
                    const val = s.get_int('preview-hover-enter-timeout');
                    assert(val === 500, `expected 500 after set, got ${val}`);
                    screenshot('preview-hover-enter-timeout-changed');
                } finally {
                    s.set_int('preview-hover-enter-timeout', original);
                    pump(500);
                }
            },
        },
        {
            name: 'aero-peek-opacity can be changed',
            fn() {
                const s = getXDockSettings();
                const original = s.get_int('aero-peek-opacity');
                try {
                    s.set_int('aero-peek-opacity', 50);
                    pump(500);
                    const val = s.get_int('aero-peek-opacity');
                    assert(val === 50, `expected 50 after set, got ${val}`);
                    screenshot('aero-peek-opacity-changed');
                } finally {
                    s.set_int('aero-peek-opacity', original);
                    pump(500);
                }
            },
        },
        {
            name: 'show-windows-preview setting exists',
            fn() {
                const s = getXDockSettings();
                const val = s.get_boolean('show-windows-preview');
                assert(typeof val === 'boolean', `expected boolean, got ${typeof val}`);
                screenshot('show-windows-preview-default');
            },
        },
    ];
}

exports.getTests = getTests;

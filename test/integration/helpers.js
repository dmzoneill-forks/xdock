// SPDX-License-Identifier: GPL-2.0-or-later
// SPDX-FileCopyrightText: Contributors to XDock
//
// Integration test helpers for xdock.
// Runs INSIDE gnome-shell via gnome-shell-test-tool — has access to
// imports.gi.*, imports.ui.main, etc.  This is NOT a Node/ESM module.

const {Clutter, Gio, GLib, Meta, Shell, St} = imports.gi;
const Main = imports.ui.main;

const EXTENSION_UUID = 'xdock@github.com';
const SETTING_PROPAGATION_MS = 100;

// ---------------------------------------------------------------------------
// Extension accessors
// ---------------------------------------------------------------------------

/**
 * Return the DockManager singleton from the running extension.
 * Throws if the extension is not enabled or DockManager is unavailable.
 */
function getDockManager() {
    const ext = Main.extensionManager.lookup(EXTENSION_UUID);
    if (!ext || ext.state !== 1)
        throw new Error(`Extension ${EXTENSION_UUID} is not enabled (state=${ext?.state})`);

    // The extension object exposes dockManager on its stateObj (the module).
    const dm = ext.stateObj?.dockManager ?? ext.imports?.dockManager ?? null;
    if (dm)
        return dm;

    // Fallback: DockManager keeps a singleton accessible via getDefault().
    // We need to reach into the extension's module scope.  gnome-shell stores
    // the loaded ESM namespace on ext.stateObj when using Extension base class.
    if (ext.stateObj) {
        // For the newer Extension-based pattern, the module-level `dockManager`
        // export is on the extension's module namespace.  Try the Docking import.
        try {
            const Docking = ext.stateObj.imports
                ? ext.stateObj.imports.docking
                : null;
            if (Docking?.DockManager?.getDefault)
                return Docking.DockManager.getDefault();
        } catch (_e) {
            // ignore
        }
    }

    throw new Error('Could not locate DockManager instance');
}

/**
 * Return the primary DockedDash (the first dock).
 */
function getDock() {
    return getDockManager().mainDock;
}

/**
 * Return the DockDash widget from the primary dock.
 */
function getDash() {
    const dock = getDock();
    if (!dock)
        throw new Error('No primary dock available');
    return dock.dash;
}

/**
 * Return the GSettings object for the extension.
 */
function getSettings() {
    return getDockManager().settings;
}

/**
 * Count visible application icons in the primary dash.
 */
function getIconCount() {
    const dash = getDash();
    return dash.getAppIcons().length;
}

/**
 * Get the i-th application icon actor from the primary dash.
 * @param {number} i - Zero-based index.
 * @returns {Clutter.Actor} The icon actor.
 */
function getIconAtIndex(i) {
    const icons = getDash().getAppIcons();
    if (i < 0 || i >= icons.length)
        throw new Error(`Icon index ${i} out of range (have ${icons.length} icons)`);
    return icons[i];
}

// ---------------------------------------------------------------------------
// Assertions
// ---------------------------------------------------------------------------

/**
 * Assert that a condition is truthy.
 * @param {*} condition
 * @param {string} [message]
 */
function assert(condition, message) {
    if (!condition)
        throw new Error(`Assertion failed: ${message || 'condition is falsy'}`);
}

/**
 * Assert strict equality.
 * @param {*} a
 * @param {*} b
 * @param {string} [message]
 */
function assertEqual(a, b, message) {
    if (a !== b) {
        throw new Error(
            `Assertion failed: ${message || 'values are not equal'} ` +
            `(got ${JSON.stringify(a)} !== ${JSON.stringify(b)})`
        );
    }
}

/**
 * Assert that a numeric value falls within [min, max] inclusive.
 * @param {number} val
 * @param {number} min
 * @param {number} max
 * @param {string} [message]
 */
function assertRange(val, min, max, message) {
    if (val < min || val > max) {
        throw new Error(
            `Assertion failed: ${message || 'value out of range'} ` +
            `(${val} not in [${min}, ${max}])`
        );
    }
}

/**
 * Assert that an actor is visible and attached to the stage.
 * @param {Clutter.Actor} actor
 * @param {string} [message]
 */
function assertVisible(actor, message) {
    if (!actor)
        throw new Error(`Assertion failed: ${message || 'actor is null/undefined'}`);
    if (!actor.visible)
        throw new Error(`Assertion failed: ${message || 'actor is not visible'}`);
    if (!actor.get_stage())
        throw new Error(`Assertion failed: ${message || 'actor is not on stage'}`);
}

/**
 * Assert that an actor is hidden (not visible).
 * @param {Clutter.Actor} actor
 * @param {string} [message]
 */
function assertHidden(actor, message) {
    if (!actor)
        return; // null/destroyed actors count as hidden
    if (actor.visible && actor.get_stage()) {
        throw new Error(
            `Assertion failed: ${message || 'actor is visible but should be hidden'}`
        );
    }
}

// ---------------------------------------------------------------------------
// Async utilities
// ---------------------------------------------------------------------------

/**
 * Return a Promise that resolves after the given number of milliseconds.
 * @param {number} ms - Delay in milliseconds.
 * @returns {Promise<void>}
 */
function waitMs(ms) {
    return new Promise(resolve => {
        GLib.timeout_add(GLib.PRIORITY_DEFAULT, ms, () => {
            resolve();
            return GLib.SOURCE_REMOVE;
        });
    });
}

// ---------------------------------------------------------------------------
// Settings helpers
// ---------------------------------------------------------------------------

/**
 * Change a GSettings value and wait briefly for signal propagation.
 * Supports boolean, int, double, string, and string-array types by
 * inspecting the schema key.
 *
 * @param {string} key - The GSettings key name.
 * @param {*} value - The value to set.
 */
async function setSetting(key, value) {
    const settings = getSettings();
    const schemaKey = settings.settings_schema.get_key(key);
    const vtype = schemaKey.get_value_type().dup_string();

    switch (vtype) {
    case 'b':
        settings.set_boolean(key, value);
        break;
    case 'i':
        settings.set_int(key, value);
        break;
    case 'd':
        settings.set_double(key, value);
        break;
    case 's':
        settings.set_string(key, value);
        break;
    case 'as':
        settings.set_strv(key, value);
        break;
    default:
        // Fall back to GVariant for enum / flags / other types
        if (typeof value === 'number') {
            // Enums are stored as 'i' in the schema but the key type
            // reports the enum range type.  Try set_enum first.
            try {
                settings.set_enum(key, value);
            } catch (_e) {
                settings.set_int(key, value);
            }
        } else {
            settings.set_value(key, value);
        }
        break;
    }

    await waitMs(SETTING_PROPAGATION_MS);
}

/**
 * Reset a GSettings key to its default value and wait for propagation.
 * @param {string} key - The GSettings key name.
 */
async function resetSetting(key) {
    getSettings().reset(key);
    await waitMs(SETTING_PROPAGATION_MS);
}

// ---------------------------------------------------------------------------
// Input injection
// ---------------------------------------------------------------------------

/**
 * Synthesize a pointer motion event at the given stage coordinates.
 * @param {Clutter.Actor} actor - The actor to target (used for the stage).
 * @param {number} x - Stage X coordinate.
 * @param {number} y - Stage Y coordinate.
 */
function injectMotion(actor, x, y) {
    const seat = Clutter.get_default_backend().get_default_seat();
    const device = seat.get_pointer();
    const event = new Clutter.Event(Clutter.EventType.MOTION);

    event.set_stage(actor.get_stage());
    event.set_device(device);
    event.set_coords(x, y);
    event.set_time(GLib.get_monotonic_time() / 1000);

    event.put();
}

/**
 * Synthesize a click (button press + release) on an actor.
 * The click targets the actor's center.
 *
 * @param {Clutter.Actor} actor - The actor to click.
 * @param {number} [button=1] - Mouse button (1=left, 2=middle, 3=right).
 */
function injectClick(actor, button = 1) {
    const [ok, x, y] = actor.transform_stage_point(
        actor.width / 2, actor.height / 2);
    const [sx, sy] = ok ? [x, y] : [actor.x + actor.width / 2,
                                      actor.y + actor.height / 2];

    const seat = Clutter.get_default_backend().get_default_seat();
    const device = seat.get_pointer();
    const stage = actor.get_stage();
    const now = GLib.get_monotonic_time() / 1000;

    // Compute center in stage coordinates
    let stageX = sx;
    let stageY = sy;
    if (ok) {
        // transform_stage_point gives local coords; we need stage coords
        const [, cx, cy] = actor.get_transformed_position();
        stageX = cx + actor.width / 2;
        stageY = cy + actor.height / 2;
    }

    for (const type of [Clutter.EventType.BUTTON_PRESS,
                         Clutter.EventType.BUTTON_RELEASE]) {
        const event = new Clutter.Event(type);
        event.set_stage(stage);
        event.set_device(device);
        event.set_coords(stageX, stageY);
        event.set_button(button);
        event.set_time(now);
        event.put();
    }
}

// ---------------------------------------------------------------------------
// Screenshots
// ---------------------------------------------------------------------------

/**
 * Take a screenshot via the GNOME Shell Screenshot D-Bus interface and
 * save it to /tmp/xdock-test-{name}.png.
 *
 * @param {string} name - A short identifier for the screenshot file.
 * @returns {Promise<string>} The path to the saved screenshot.
 */
function screenshot(name) {
    return new Promise((resolve, reject) => {
        const path = `/tmp/xdock-test-${name}.png`;
        const proxy = new Gio.DBusProxy.new_for_bus_sync(
            Gio.BusType.SESSION,
            Gio.DBusProxyFlags.NONE,
            null,
            'org.gnome.Shell.Screenshot',
            '/org/gnome/Shell/Screenshot',
            'org.gnome.Shell.Screenshot',
            null
        );

        proxy.call(
            'Screenshot',
            new GLib.Variant('(bbs)', [false, true, path]),
            Gio.DBusCallFlags.NONE,
            5000,
            null,
            (_proxy, result) => {
                try {
                    const reply = proxy.call_finish(result);
                    const [ok] = reply.deep_unpack();
                    if (ok) {
                        print(`[XDOCK-TEST] Screenshot saved: ${path}`);
                        resolve(path);
                    } else {
                        reject(new Error(`Screenshot call returned false for ${path}`));
                    }
                } catch (e) {
                    // Screenshots may not be available in headless mode —
                    // log but do not fail the test.
                    print(`[XDOCK-TEST] Screenshot unavailable: ${e.message}`);
                    resolve(path);
                }
            }
        );
    });
}

// ---------------------------------------------------------------------------
// Test runner
// ---------------------------------------------------------------------------

/**
 * Run an array of test cases with try/catch isolation.
 *
 * @param {Array<{name: string, fn: function}>} tests - Test descriptors.
 *   Each `fn` may be sync or async (returns a Promise).
 * @returns {Promise<number>} Exit code: 0 if all pass, 1 if any fail.
 */
async function runTests(tests) {
    let passed = 0;
    let failed = 0;
    const failures = [];

    print(`[XDOCK-TEST] Running ${tests.length} test(s)...`);
    print('[XDOCK-TEST] ' + '='.repeat(60));

    for (const test of tests) {
        const label = test.name || '(unnamed)';
        try {
            print(`[XDOCK-TEST] RUN  ${label}`);
            const result = test.fn();
            // Await if the test returns a thenable (async test)
            if (result && typeof result.then === 'function')
                await result;
            print(`[XDOCK-TEST] PASS ${label}`);
            passed++;
        } catch (e) {
            print(`[XDOCK-TEST] FAIL ${label}: ${e.message}`);
            if (e.stack)
                print(`  ${e.stack}`);
            failed++;
            failures.push(label);
        }
    }

    print('[XDOCK-TEST] ' + '='.repeat(60));
    print(`[XDOCK-TEST] Results: ${passed} passed, ${failed} failed, ${tests.length} total`);

    if (failures.length > 0) {
        print('[XDOCK-TEST] Failed tests:');
        for (const f of failures)
            print(`[XDOCK-TEST]   - ${f}`);
    }

    return failed > 0 ? 1 : 0;
}

// ---------------------------------------------------------------------------
// Exports — this is a plain GJS script, so we attach to a global namespace
// that runner.js and test files can reference.
// ---------------------------------------------------------------------------

/* exported XDockTestHelpers */
var XDockTestHelpers = {  // eslint-disable-line no-unused-vars
    // Extension accessors
    getDockManager,
    getDock,
    getDash,
    getSettings,
    getIconCount,
    getIconAtIndex,

    // Assertions
    assert,
    assertEqual,
    assertRange,
    assertVisible,
    assertHidden,

    // Async
    waitMs,

    // Settings
    setSetting,
    resetSetting,

    // Input
    injectMotion,
    injectClick,

    // Screenshots
    screenshot,

    // Runner
    runTests,

    // Constants
    EXTENSION_UUID,
};

// SPDX-License-Identifier: GPL-2.0-or-later
// SPDX-FileCopyrightText: Contributors to XDock
//
// Integration test runner for xdock.
// Entry point for: gnome-shell-test-tool --headless --extension . test/integration/runner.js
//
// 1. Waits for GNOME Shell startup to complete.
// 2. Waits for the xdock extension to be enabled.
// 3. Discovers and loads all *.test.js files from the integration directory.
// 4. Runs all tests via helpers.runTests() and reports results.

const {Gio, GLib} = imports.gi;
const Main = imports.ui.main;

// Load the helpers module (lives next to this script).
const _thisDir = (() => {
    // Resolve the directory containing this script.  When run via
    // gnome-shell-test-tool the script path is passed as argv, but
    // imports.searchPath may not include it.  We use a stack-trace
    // trick as a robust fallback.
    try {
        const stack = new Error().stack;
        // Stack lines look like:  @/path/to/runner.js:NN:NN
        const match = stack.match(/@(.*?)runner\.js/);
        if (match)
            return match[1];
    } catch (_e) {
        // ignore
    }
    return './test/integration/';
})();

// Ensure the integration directory is on the import search path so that
// helpers.js and test files can be loaded via imports.
if (typeof imports.searchPath !== 'undefined' &&
    imports.searchPath.indexOf(_thisDir) === -1)
    imports.searchPath.unshift(_thisDir);

// Import helpers — after adjusting the search path, the file is available
// as a plain GJS module.
let helpers;
try {
    helpers = imports.helpers.XDockTestHelpers;
} catch (e) {
    // If the import path approach fails, try a direct evaluation.
    // This is a last-resort fallback for unusual gnome-shell-test-tool setups.
    print(`[XDOCK-TEST] Warning: could not import helpers via searchPath: ${e.message}`);
    print('[XDOCK-TEST] Attempting alternate import...');
    const helperPath = GLib.build_filenamev([_thisDir, 'helpers.js']);
    const [, source] = GLib.file_get_contents(helperPath);
    const decoder = new TextDecoder();
    eval(decoder.decode(source));  // defines XDockTestHelpers globally
    helpers = XDockTestHelpers;  // eslint-disable-line no-undef
}

const STARTUP_TIMEOUT_MS = 30000;
const EXTENSION_POLL_MS = 500;
const EXTENSION_TIMEOUT_MS = 20000;

// ---------------------------------------------------------------------------
// Startup waiters
// ---------------------------------------------------------------------------

/**
 * Wait for GNOME Shell to finish its startup sequence.
 * Resolves when Main.layoutManager._startingUp is false.
 */
function _waitForShellReady() {
    return new Promise((resolve, reject) => {
        if (!Main.layoutManager._startingUp) {
            resolve();
            return;
        }

        print('[XDOCK-TEST] Waiting for GNOME Shell startup to complete...');

        let signalId = 0;
        let timeoutId = 0;

        const cleanup = () => {
            if (signalId) {
                Main.layoutManager.disconnect(signalId);
                signalId = 0;
            }
            if (timeoutId) {
                GLib.source_remove(timeoutId);
                timeoutId = 0;
            }
        };

        signalId = Main.layoutManager.connect('startup-complete', () => {
            cleanup();
            print('[XDOCK-TEST] Shell startup complete.');
            resolve();
        });

        timeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, STARTUP_TIMEOUT_MS, () => {
            timeoutId = 0;
            cleanup();
            // If _startingUp is now false, the signal may have been missed
            if (!Main.layoutManager._startingUp) {
                resolve();
            } else {
                reject(new Error('Timed out waiting for GNOME Shell startup'));
            }
            return GLib.SOURCE_REMOVE;
        });
    });
}

/**
 * Wait for the xdock extension to reach ENABLED state (state === 1).
 */
function _waitForExtension() {
    return new Promise((resolve, reject) => {
        const manager = Main.extensionManager;
        if (!manager) {
            reject(new Error('No extension manager available'));
            return;
        }

        const ext = manager.lookup(helpers.EXTENSION_UUID);
        if (ext && ext.state === 1) {
            print('[XDOCK-TEST] Extension already enabled.');
            resolve();
            return;
        }

        print(`[XDOCK-TEST] Waiting for extension ${helpers.EXTENSION_UUID} to be enabled...`);

        let elapsed = 0;
        const pollId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, EXTENSION_POLL_MS, () => {
            elapsed += EXTENSION_POLL_MS;
            const e = manager.lookup(helpers.EXTENSION_UUID);
            if (e && e.state === 1) {
                print('[XDOCK-TEST] Extension enabled.');
                resolve();
                return GLib.SOURCE_REMOVE;
            }
            if (elapsed >= EXTENSION_TIMEOUT_MS) {
                reject(new Error(
                    `Timed out waiting for extension (state=${e?.state})`));
                return GLib.SOURCE_REMOVE;
            }
            return GLib.SOURCE_CONTINUE;
        });

        // Safety: if the promise is rejected we still want to remove the source.
        // The GLib source auto-removes on SOURCE_REMOVE, so this is just for clarity.
        void pollId;
    });
}

// ---------------------------------------------------------------------------
// Test discovery
// ---------------------------------------------------------------------------

/**
 * Find all *.test.js files in the integration test directory and return
 * a flat array of {name, fn} test descriptors from each.
 *
 * Each test file is expected to set a global `XDockTests` array (or
 * export one on `imports.<modulename>.XDockTests`).
 */
function _discoverTests() {
    const tests = [];
    const dir = Gio.File.new_for_path(_thisDir);

    if (!dir.query_exists(null)) {
        print(`[XDOCK-TEST] Warning: test directory not found: ${_thisDir}`);
        return tests;
    }

    const enumerator = dir.enumerate_children(
        'standard::name,standard::type',
        Gio.FileQueryInfoFlags.NONE,
        null
    );

    let info;
    while ((info = enumerator.next_file(null)) !== null) {
        const name = info.get_name();
        if (!name.endsWith('.test.js'))
            continue;

        const moduleName = name.replace(/\.js$/, '').replace(/\./g, '_');
        print(`[XDOCK-TEST] Loading test file: ${name}`);

        try {
            // Try the imports mechanism first (module name without .js,
            // dots replaced by underscores to form a valid identifier).
            let testModule = null;
            try {
                testModule = imports[moduleName];
            } catch (_e) {
                // Fall back to eval-based loading
                const filePath = GLib.build_filenamev([_thisDir, name]);
                const [, source] = GLib.file_get_contents(filePath);
                const decoder = new TextDecoder();
                // Reset the global XDockTests before each file eval so we
                // can detect what the file provides.
                globalThis.XDockTests = undefined;
                eval(decoder.decode(source));  // test file sets XDockTests
                testModule = {XDockTests: globalThis.XDockTests};
            }

            const fileTests = testModule?.XDockTests;
            if (Array.isArray(fileTests)) {
                for (const t of fileTests) {
                    tests.push({
                        name: `${name} > ${t.name || '(unnamed)'}`,
                        fn: t.fn,
                    });
                }
                print(`[XDOCK-TEST]   Found ${fileTests.length} test(s) in ${name}`);
            } else {
                print(`[XDOCK-TEST]   Warning: ${name} did not export XDockTests array`);
            }
        } catch (e) {
            print(`[XDOCK-TEST]   Error loading ${name}: ${e.message}`);
            // Register a failing test so the error is not silently lost
            tests.push({
                name: `${name} > LOAD ERROR`,
                fn: () => {
                    throw e;
                },
            });
        }
    }

    return tests;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function _main() {
    print('[XDOCK-TEST] ' + '='.repeat(60));
    print('[XDOCK-TEST] XDock Integration Test Runner');
    print('[XDOCK-TEST] ' + '='.repeat(60));

    try {
        await _waitForShellReady();
    } catch (e) {
        print(`[XDOCK-TEST] FATAL: ${e.message}`);
        return 1;
    }

    // Brief pause after shell startup for things to settle
    await helpers.waitMs(500);

    try {
        await _waitForExtension();
    } catch (e) {
        print(`[XDOCK-TEST] FATAL: ${e.message}`);
        return 1;
    }

    // Another brief pause for the dock to initialise
    await helpers.waitMs(1000);

    const tests = _discoverTests();
    if (tests.length === 0) {
        print('[XDOCK-TEST] No test files found (*.test.js). Nothing to run.');
        print('[XDOCK-TEST] Place test files in test/integration/ with a .test.js suffix.');
        return 0;
    }

    const exitCode = await helpers.runTests(tests);

    print('[XDOCK-TEST] ' + '='.repeat(60));
    if (exitCode === 0)
        print('[XDOCK-TEST] ALL TESTS PASSED');
    else
        print('[XDOCK-TEST] SOME TESTS FAILED');
    print('[XDOCK-TEST] ' + '='.repeat(60));

    return exitCode;
}

// Kick off the async main.  gnome-shell-test-tool expects the script to
// run synchronously in the main loop, so we just call the async function
// and let the GLib main loop drive the promises.
_main().then(code => {
    print(`[XDOCK-TEST] Exiting with code ${code}`);
    // In gnome-shell-test-tool the process exits when the script finishes.
    // If a Meta.exit or similar is available, use it; otherwise the tool
    // will pick up the printed exit code.
    if (typeof Meta !== 'undefined' && Meta.exit)
        Meta.exit(code === 0 ? Meta.ExitCode.SUCCESS : Meta.ExitCode.ERROR);
}).catch(e => {
    print(`[XDOCK-TEST] FATAL unhandled error: ${e.message}`);
    if (e.stack)
        print(e.stack);
});

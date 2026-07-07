// Smoke test automation script for gnome-shell-test-tool --headless --extension
// Verifies the extension loads and enables without crash.
// Usage: gnome-shell-test-tool --headless --extension /path/to/xdock test/smoke/load-extension.js

print('[XDOCK-SMOKE] Smoke test starting');

const {Shell} = imports.gi;
const Main = imports.ui.main;

function run() {
    const uuid = 'xdock@github.com';
    const manager = Main.extensionManager;

    if (!manager) {
        print('[XDOCK-SMOKE] FAIL: No extension manager');
        return;
    }

    const ext = manager.lookup(uuid);
    if (!ext) {
        print(`[XDOCK-SMOKE] FAIL: Extension ${uuid} not found`);
        return;
    }

    if (ext.state === 1) {
        print('[XDOCK-SMOKE] PASS: Extension loaded and enabled');
    } else {
        print(`[XDOCK-SMOKE] FAIL: Extension state is ${ext.state}, expected ENABLED (1)`);
    }
}

run();

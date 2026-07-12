// Smoke test: verify xdock loads and enables without crash.
// Run: make smoke-test

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

export function run(_argv) {
    print('[XDOCK-SMOKE] Smoke test starting');

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

    if (ext.state === 1)
        print('[XDOCK-SMOKE] PASS: Extension loaded and enabled');
    else
        print(`[XDOCK-SMOKE] FAIL: Extension state is ${ext.state}, expected ENABLED (1)`);
}

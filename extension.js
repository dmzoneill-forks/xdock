// SPDX-License-Identifier: GPL-2.0-or-later
// SPDX-FileCopyrightText: Contributors to XDock
// -*- mode: js; js-indent-level: 4; indent-tabs-mode: nil -*-

log('[XDOCK] CP01: extension.js module loading');

import {GLib, GObject, St} from './dependencies/gi.js';
import {Main} from './dependencies/shell/ui.js';
log('[XDOCK] CP02: gi imports done');

import * as OverviewControls from 'resource:///org/gnome/shell/ui/overviewControls.js';
log('[XDOCK] CP03: OverviewControls imported');

import {DockManager} from './docking.js';
log('[XDOCK] CP04: docking.js imported');

import {Extension} from './dependencies/shell/extensions/extension.js';
log('[XDOCK] CP05: Extension imported');

const _origRunStartupAnimation =
    OverviewControls.ControlsManager.prototype.runStartupAnimation;
OverviewControls.ControlsManager.prototype.runStartupAnimation =
    async function (...args) {
        log('[XDOCK] CP-STARTUP: runStartupAnimation called, _startingUp=' +
            Main.layoutManager._startingUp);
        if (!Main.layoutManager._startingUp) {
            log('[XDOCK] CP-STARTUP: startup already complete, skipping');
            return;
        }
        try {
            return await _origRunStartupAnimation.call(this, ...args);
        } catch (e) {
            log(`[XDOCK] CP-STARTUP: animation failed: ${e.message}`);
        }
    };

log('[XDOCK] CP06: module evaluation complete');

export let dockManager;
let _heartbeatId = 0;
let _heartbeatCount = 0;

export default class DashToDockExtension extends Extension.Extension {
    enable() {
        log('[XDOCK] CP07: enable() called');
        try {
            dockManager = new DockManager(this);
            log('[XDOCK] CP08: DockManager created');
        } catch (e) {
            logError(e, '[XDOCK] FATAL: DockManager constructor failed');
            dockManager = null;
        }

        // Heartbeat: proves the main loop is running
        _heartbeatId = GLib.timeout_add_seconds(GLib.PRIORITY_LOW, 2, () => {
            _heartbeatCount++;
            const overview = Main.overview;
            const lm = Main.layoutManager;
            log(`[XDOCK] HEARTBEAT #${_heartbeatCount} ` +
                `startingUp=${lm._startingUp} ` +
                `overview.visible=${overview?.visible} ` +
                `overview._shown=${overview?._shown} ` +
                `monitors=${lm.monitors?.length} ` +
                `docks=${dockManager?._allDocks?.length ?? 0}`);
            if (_heartbeatCount >= 5) {
                log('[XDOCK] HEARTBEAT stopping after 5 beats');
                return GLib.SOURCE_REMOVE;
            }
            return GLib.SOURCE_CONTINUE;
        });
    }

    disable() {
        log('[XDOCK] CP-DISABLE: disable() called');
        if (_heartbeatId) {
            GLib.source_remove(_heartbeatId);
            _heartbeatId = 0;
        }
        try {
            dockManager?.destroy();
        } catch (e) {
            logError(e, '[XDOCK] FATAL: DockManager destroy failed');
        }
        dockManager = null;
        OverviewControls.ControlsManager.prototype.runStartupAnimation =
            _origRunStartupAnimation;
    }
}

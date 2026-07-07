// SPDX-License-Identifier: GPL-2.0-or-later
// SPDX-FileCopyrightText: Contributors to XDock
// -*- mode: js; js-indent-level: 4; indent-tabs-mode: nil -*-

import {Main} from './dependencies/shell/ui.js';
import * as OverviewControls from 'resource:///org/gnome/shell/ui/overviewControls.js';
import {DockManager} from './docking.js';
import {Extension} from './dependencies/shell/extensions/extension.js';

const _origRunStartupAnimation =
    OverviewControls.ControlsManager.prototype.runStartupAnimation;
OverviewControls.ControlsManager.prototype.runStartupAnimation =
    async function (...args) {
        if (!Main.layoutManager._startingUp)
            return;
        try {
            await _origRunStartupAnimation.call(this, ...args);
        } catch {
            // Animation failed — non-fatal in devkit sessions
        }
    };

export let dockManager;

export default class DashToDockExtension extends Extension.Extension {
    enable() {
        // TODO: Remove this when upstream will disable extensions on shutdown
        // See: https://gitlab.gnome.org/GNOME/gnome-shell/-/merge_requests/4214
        this._shutdownID = global.connect('shutdown', () => this.disable());
        log('[XDOCK] CP07: enable() called');
        try {
            dockManager = new DockManager(this);
        } catch (e) {
            logError(e, 'XDock: Failed to initialize DockManager');
            dockManager = null;
        }
    }

    disable() {
        global.disconnect(this._shutdownID);
        delete this._shutdownID;
        log('[XDOCK] CP-DISABLE: disable() called');
        if (_heartbeatId) {
            GLib.source_remove(_heartbeatId);
            _heartbeatId = 0;
        }
        try {
            dockManager?.destroy();
        } catch (e) {
            logError(e, 'XDock: Failed to destroy DockManager');
        }
        dockManager = null;
        OverviewControls.ControlsManager.prototype.runStartupAnimation =
            _origRunStartupAnimation;
    }
}

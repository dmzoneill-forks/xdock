// SPDX-License-Identifier: GPL-2.0-or-later
// SPDX-FileCopyrightText: Contributors to XDock
// -*- mode: js; js-indent-level: 4; indent-tabs-mode: nil -*-

import GLib from 'gi://GLib';
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
        if (Main.layoutManager._startingUp) {
            this._startupCompleteId = Main.layoutManager.connect(
                'startup-complete', () => {
                    Main.layoutManager.disconnect(this._startupCompleteId);
                    this._startupCompleteId = 0;
                    this._initDockManager();
                });
            this._startupTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 10000, () => {
                this._startupTimeoutId = 0;
                if (this._startupCompleteId) {
                    Main.layoutManager.disconnect(this._startupCompleteId);
                    this._startupCompleteId = 0;
                }
                if (!dockManager)
                    this._initDockManager();
                return GLib.SOURCE_REMOVE;
            });
        } else {
            this._initDockManager();
        }
    }

    _initDockManager() {
        try {
            dockManager = new DockManager(this);
        } catch (e) {
            logError(e, 'XDock: Failed to initialize DockManager');
            dockManager = null;
        }

        // Keep the main loop alive for a few seconds after init.
        // In devkit/nested sessions the compositor stalls without
        // periodic activity, causing the overview animation to never
        // complete and the desktop to appear frozen.
        let ticks = 0;
        this._keepaliveId = GLib.timeout_add_seconds(GLib.PRIORITY_LOW, 2, () => {
            ticks++;
            if (ticks >= 5) {
                this._keepaliveId = 0;
                return GLib.SOURCE_REMOVE;
            }
            return GLib.SOURCE_CONTINUE;
        });
    }

    disable() {
        if (this._startupCompleteId) {
            Main.layoutManager.disconnect(this._startupCompleteId);
            this._startupCompleteId = 0;
        }
        if (this._startupTimeoutId) {
            GLib.source_remove(this._startupTimeoutId);
            this._startupTimeoutId = 0;
        }
        if (this._keepaliveId) {
            GLib.source_remove(this._keepaliveId);
            this._keepaliveId = 0;
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

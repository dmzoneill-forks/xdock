// SPDX-License-Identifier: GPL-2.0-or-later
// SPDX-FileCopyrightText: Contributors to XDock
// -*- mode: js; js-indent-level: 4; indent-tabs-mode: nil -*-

import {DockManager} from './docking.js';
import {Extension} from './dependencies/shell/extensions/extension.js';

// We export this so it can be accessed by other extensions
export let dockManager;

export default class DashToDockExtension extends Extension.Extension {
    enable() {
        try {
            dockManager = new DockManager(this);
        } catch (e) {
            // Catch initialization errors to prevent the extension from
            // crashing the entire GNOME Shell session (especially on
            // Wayland where a crash forces a full session restart).
            logError(e, 'XDock: Failed to initialize DockManager');
            dockManager = null;
        }
    }

    disable() {
        try {
            dockManager?.destroy();
        } catch (e) {
            logError(e, 'XDock: Failed to destroy DockManager');
        }
        dockManager = null;
    }
}

// -*- mode: js; js-indent-level: 4; indent-tabs-mode: nil -*-

import {DockManager} from './docking.js';
import {Extension} from './dependencies/shell/extensions/extension.js';

// We export this so it can be accessed by other extensions
export let dockManager;

export default class DashToDockExtension extends Extension.Extension {
    enable() {
        // TODO: Remove this when upstream will disable extensions on shutdown
        // See: https://gitlab.gnome.org/GNOME/gnome-shell/-/merge_requests/4214
        this._shutdownID = global.connect('shutdown', () => this.disable());
        try {
            dockManager = new DockManager(this);
        } catch (e) {
            // Prevent initialization errors from crashing the GNOME session.
            logError(e, 'Dash-2-X: Failed to initialize DockManager');
            dockManager = null;
        }
    }

    disable() {
        global.disconnect(this._shutdownID);
        delete this._shutdownID;
        try {
            dockManager?.destroy();
        } catch (e) {
            logError(e, 'Dash-2-X: Failed to destroy DockManager');
        }
        dockManager = null;
    }
}

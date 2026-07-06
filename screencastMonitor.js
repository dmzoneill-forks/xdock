// SPDX-License-Identifier: GPL-2.0-or-later
// SPDX-FileCopyrightText: Contributors to Dash 2 X
// -*- mode: js; js-indent-level: 4; indent-tabs-mode: nil -*-

import {Gio, GLib} from './dependencies/gi.js';

import {
    Docking,
    Utils,
} from './imports.js';

const {signals: Signals} = imports;

const SHELL_SCREENCAST_BUS_NAME = 'org.gnome.Shell.Screencast';
const SHELL_SCREENCAST_OBJECT_PATH = '/org/gnome/Shell/Screencast';
const SHELL_SCREENCAST_IFACE = `
<node>
  <interface name="org.gnome.Shell.Screencast">
    <property name="Screencast" type="b" access="read"/>
  </interface>
</node>`;

const MUTTER_SCREENCAST_BUS_NAME = 'org.gnome.Mutter.ScreenCast';
const MUTTER_SCREENCAST_OBJECT_PATH = '/org/gnome/Mutter/ScreenCast';
const MUTTER_SCREENCAST_IFACE = `
<node>
  <interface name="org.gnome.Mutter.ScreenCast">
    <method name="ListSessions">
      <arg name="sessions" direction="out" type="ao"/>
    </method>
  </interface>
</node>`;

export class ScreencastMonitor {
    constructor() {
        this._signalsHandler = new Utils.GlobalSignalsHandler(this);
        this._isRecording = false;
        this._shellProxy = null;
        this._mutterProxy = null;
        this._shellNameWatchId = 0;
        this._mutterNameWatchId = 0;
        this._pollTimeoutId = 0;

        this._isEnabled = Docking.DockManager.settings.showScreencastIndicator;

        this._signalsHandler.add(Docking.DockManager.settings,
            'changed::show-screencast-indicator', () => {
                this._isEnabled = Docking.DockManager.settings.showScreencastIndicator;
                this.emit('state-changed');
                if (this._isEnabled)
                    this._startMonitoring();
                else
                    this._stopMonitoring();
            });

        if (this._isEnabled)
            this._startMonitoring();
    }

    get isRecording() {
        return this._isRecording && this._isEnabled;
    }

    get enabled() {
        return this._isEnabled;
    }

    _startMonitoring() {
        this._setupShellScreencastProxy();
        this._setupMutterScreencastWatch();
    }

    _stopMonitoring() {
        if (this._shellNameWatchId) {
            Gio.bus_unwatch_name(this._shellNameWatchId);
            this._shellNameWatchId = 0;
        }

        if (this._mutterNameWatchId) {
            Gio.bus_unwatch_name(this._mutterNameWatchId);
            this._mutterNameWatchId = 0;
        }

        if (this._pollTimeoutId) {
            GLib.source_remove(this._pollTimeoutId);
            this._pollTimeoutId = 0;
        }

        this._shellProxy = null;
        this._mutterProxy = null;

        this._updateRecordingState(false);
    }

    _setupShellScreencastProxy() {
        this._shellNameWatchId = Gio.bus_watch_name(
            Gio.BusType.SESSION,
            SHELL_SCREENCAST_BUS_NAME,
            Gio.BusNameWatcherFlags.NONE,
            () => this._onShellScreencastAppeared(),
            () => this._onShellScreencastVanished()
        );
    }

    _onShellScreencastAppeared() {
        try {
            const ShellScreencastProxy = Gio.DBusProxy.makeProxyWrapper(SHELL_SCREENCAST_IFACE);
            this._shellProxy = new ShellScreencastProxy(
                Gio.DBus.session,
                SHELL_SCREENCAST_BUS_NAME,
                SHELL_SCREENCAST_OBJECT_PATH,
                (proxy, error) => {
                    if (error) {
                        this._shellProxy = null;
                        return;
                    }
                    this._signalsHandler.add(this._shellProxy,
                        'g-properties-changed', () => this._checkShellScreencast());
                    this._checkShellScreencast();
                }
            );
        } catch {
            this._shellProxy = null;
        }
    }

    _onShellScreencastVanished() {
        this._shellProxy = null;
        this._updateRecordingState(false);
    }

    _checkShellScreencast() {
        if (!this._shellProxy)
            return;

        try {
            const isActive = this._shellProxy.Screencast ?? false;
            this._updateRecordingState(isActive);
        } catch {
            // Property may not be available
        }
    }

    _setupMutterScreencastWatch() {
        this._mutterNameWatchId = Gio.bus_watch_name(
            Gio.BusType.SESSION,
            MUTTER_SCREENCAST_BUS_NAME,
            Gio.BusNameWatcherFlags.NONE,
            () => this._onMutterScreencastAppeared(),
            () => this._onMutterScreencastVanished()
        );
    }

    _onMutterScreencastAppeared() {
        this._startMutterPolling();
    }

    _onMutterScreencastVanished() {
        if (this._pollTimeoutId) {
            GLib.source_remove(this._pollTimeoutId);
            this._pollTimeoutId = 0;
        }

        // Don't clear recording state here -- Shell.Screencast proxy
        // is the primary source.  Mutter sessions are supplementary.
    }

    _startMutterPolling() {
        // Poll Mutter ScreenCast sessions every 2 seconds to detect
        // portal-based screen captures (e.g. OBS, Zoom screen share).
        if (this._pollTimeoutId)
            GLib.source_remove(this._pollTimeoutId);

        this._pollTimeoutId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 2, () => {
            this._checkMutterSessions();
            return GLib.SOURCE_CONTINUE;
        });
    }

    _checkMutterSessions() {
        try {
            const MutterScreencastProxy = Gio.DBusProxy.makeProxyWrapper(MUTTER_SCREENCAST_IFACE);
            const proxy = new MutterScreencastProxy(
                Gio.DBus.session,
                MUTTER_SCREENCAST_BUS_NAME,
                MUTTER_SCREENCAST_OBJECT_PATH
            );

            const sessions = proxy.ListSessionsSync();
            const hasSessions = sessions && sessions[0] && sessions[0].length > 0;

            // If the Shell screencast proxy already reports active, don't
            // override; only supplement when Shell says inactive.
            if (!this._shellRecording && hasSessions)
                this._updateRecordingState(true);
            else if (!this._shellRecording && !hasSessions)
                this._updateRecordingState(false);
        } catch {
            // D-Bus call failed -- service might not be available
        }
    }

    _updateRecordingState(recording) {
        // Track shell-level recording separately so mutter polling
        // doesn't incorrectly clear it.
        if (this._shellProxy) {
            try {
                this._shellRecording = this._shellProxy.Screencast ?? false;
            } catch {
                this._shellRecording = false;
            }
        }

        if (this._isRecording !== recording) {
            this._isRecording = recording;
            this.emit('state-changed');
        }
    }

    destroy() {
        this.emit('destroy');
        this._stopMonitoring();
        this._signalsHandler?.destroy();
        this._signalsHandler = null;
    }
}

Signals.addSignalMethods(ScreencastMonitor.prototype);

// SPDX-License-Identifier: GPL-2.0-or-later
// SPDX-FileCopyrightText: Contributors to XDock
//
// Integration tests for icon indicators, style classes, and related settings.

const H = XDockTestHelpers;

/* exported XDockTests */
var XDockTests = [
    // -----------------------------------------------------------------------
    // Running indicators
    // -----------------------------------------------------------------------
    {
        name: 'running indicator visible for running app',
        fn: async () => {
            // TODO: launch a test app, locate its dock icon, and assert that
            // the running indicator child actor is visible.
        },
    },
    {
        name: 'running indicator hidden for non-running app',
        fn: async () => {
            // TODO: find a favorite (non-running) icon and assert its running
            // indicator is hidden or absent.
        },
    },
    {
        name: 'running indicator style matches setting',
        fn: async () => {
            // TODO: cycle through running-indicator-style enum values (DOTS,
            // SQUARES, DASHES, etc.), set each via setSetting, and verify the
            // indicator actor updates accordingly.
        },
    },

    // -----------------------------------------------------------------------
    // Numeric / arc / overlay settings
    // -----------------------------------------------------------------------
    {
        name: 'progress-arc-width setting affects arc line width',
        fn: async () => {
            // TODO: set progress-arc-width to a non-default value, trigger a
            // progress update on an icon, and verify the arc's line-width
            // property reflects the setting.
        },
    },
    {
        name: 'hotkey-label-scale setting affects number overlay size',
        fn: async () => {
            // TODO: set hotkey-label-scale to e.g. 0.5, show the hotkey
            // overlay, and verify the label actor's scale or font size
            // changed proportionally.
        },
    },
    {
        name: 'tooltip-max-width-px setting limits tooltip width',
        fn: async () => {
            // TODO: set tooltip-max-width-px to a small value (e.g. 200),
            // hover an icon to trigger the tooltip, and assert the tooltip
            // actor's width does not exceed the configured maximum.
        },
    },

    // -----------------------------------------------------------------------
    // Style classes (.focused, .urgent)
    // -----------------------------------------------------------------------
    {
        name: 'focused app has .focused style class',
        fn: async () => {
            // TODO: focus a running app window, find its dock icon, and assert
            // the icon actor (or its container) has the 'focused' style class.
        },
    },
    {
        name: 'unfocused app does not have .focused class',
        fn: async () => {
            // TODO: with multiple running apps, verify the non-focused icon
            // does not carry the 'focused' style class.
        },
    },
    {
        name: 'urgent app has .urgent style class',
        fn: async () => {
            // TODO: set the urgent hint on a window (e.g. via X11/Wayland
            // protocol), then verify the dock icon actor gains the 'urgent'
            // style class.
        },
    },

    // -----------------------------------------------------------------------
    // Windows count
    // -----------------------------------------------------------------------
    {
        name: 'windows-count property tracks open windows',
        fn: async () => {
            // TODO: open N windows for an app, then verify the icon's
            // windows-count (or equivalent nWindows property) equals N.
        },
    },

    // -----------------------------------------------------------------------
    // Icon emblems
    // -----------------------------------------------------------------------
    {
        name: 'icon emblems visible when show-icons-emblems=true',
        fn: async () => {
            // TODO: set show-icons-emblems to true, trigger badge/progress on
            // an icon, and assert the emblem overlay actor is visible.
        },
    },
    {
        name: 'icon emblems hidden when show-icons-emblems=false',
        fn: async () => {
            // TODO: set show-icons-emblems to false and verify emblem overlay
            // actors are hidden or not present.
        },
    },

    // -----------------------------------------------------------------------
    // Notification badge
    // -----------------------------------------------------------------------
    {
        name: 'notification badge visible for unread notifications',
        fn: async () => {
            // TODO: simulate an unread notification for a running app and
            // verify the badge/counter actor becomes visible on the icon.
        },
    },

    // -----------------------------------------------------------------------
    // Timing / debounce settings
    // -----------------------------------------------------------------------
    {
        name: 'scroll-cycle-debounce setting affects scroll behavior',
        fn: async () => {
            // TODO: set scroll-cycle-debounce to a high value (e.g. 2000ms),
            // inject two rapid scroll events on an icon, and verify only one
            // cycle action fired (the second was debounced).
        },
    },
    {
        name: 'wiggle-long-press-timeout setting affects wiggle activation',
        fn: async () => {
            // TODO: set wiggle-long-press-timeout to a known value, simulate
            // a press shorter than that timeout, and verify wiggle mode did
            // not activate; then simulate a press longer than the timeout and
            // verify it did activate.
        },
    },
    {
        name: 'window-cycle-memory-time setting affects cycling memory',
        fn: async () => {
            // TODO: set window-cycle-memory-time to a short value, cycle
            // through windows, wait longer than the timeout, and verify the
            // cycle position resets.
        },
    },
    {
        name: 'icon-animator-duration setting affects bounce animation',
        fn: async () => {
            // TODO: set icon-animator-duration to a non-default value and
            // verify the launch bounce animation uses the configured duration
            // (inspect the transition or animation timeline).
        },
    },
];

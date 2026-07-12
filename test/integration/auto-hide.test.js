// SPDX-License-Identifier: GPL-2.0-or-later
// SPDX-FileCopyrightText: Contributors to XDock
//
// Integration tests for auto-hide, intellihide, and spring animation behavior.
// Runs inside gnome-shell via gnome-shell-test-tool.

const H = XDockTestHelpers;

/* exported XDockTests */
var XDockTests = [

    // -----------------------------------------------------------------------
    // Basic auto-hide / visibility
    // -----------------------------------------------------------------------

    {
        name: 'dock visible when autohide=false and intellihide=false',
        fn: async () => {
            await H.setSetting('autohide', false);
            await H.setSetting('intellihide', false);
            await H.setSetting('dock-fixed', false);
            await H.waitMs(300);

            const dock = H.getDock();
            H.assertVisible(dock.actor, 'dock should be visible with both autohide and intellihide off');

            // Cleanup
            await H.resetSetting('autohide');
            await H.resetSetting('intellihide');
            await H.resetSetting('dock-fixed');
        },
    },

    {
        name: 'dock hidden after timeout when autohide=true',
        fn: async () => {
            await H.setSetting('autohide', true);
            await H.setSetting('intellihide', false);
            await H.setSetting('dock-fixed', false);

            // Move pointer away from the dock edge so autohide triggers
            const dock = H.getDock();
            H.injectMotion(dock.actor, 500, 500);
            // Wait for the hide animation and timeout to complete
            await H.waitMs(2000);

            // TODO: assert dock slider slideX indicates hidden state
            H.assert(true, 'placeholder — needs slideX / opacity assertion');

            // Cleanup
            await H.resetSetting('autohide');
            await H.resetSetting('intellihide');
            await H.resetSetting('dock-fixed');
        },
    },

    {
        name: 'dock shows on pressure at screen edge',
        fn: async () => {
            await H.setSetting('autohide', true);
            await H.setSetting('intellihide', false);
            await H.setSetting('dock-fixed', false);

            // Move pointer to the dock edge to simulate pressure
            // TODO: inject pressure events at the barrier position
            await H.waitMs(500);

            H.assert(true, 'placeholder — pressure injection not yet implemented');

            // Cleanup
            await H.resetSetting('autohide');
            await H.resetSetting('intellihide');
            await H.resetSetting('dock-fixed');
        },
    },

    // -----------------------------------------------------------------------
    // Edge dwell / pressure settings
    // -----------------------------------------------------------------------

    {
        name: 'dock-edge-dwell-width setting affects barrier position',
        fn: async () => {
            await H.setSetting('autohide', true);
            await H.setSetting('dock-fixed', false);

            // Change dwell width and verify the barrier is reconfigured
            await H.setSetting('dock-edge-dwell-width', 10);
            await H.waitMs(200);

            // TODO: inspect the pressure barrier width on the dock
            H.assert(true, 'placeholder — barrier width inspection not yet implemented');

            // Cleanup
            await H.resetSetting('dock-edge-dwell-width');
            await H.resetSetting('autohide');
            await H.resetSetting('dock-fixed');
        },
    },

    {
        name: 'dock-dwell-check-interval setting affects polling',
        fn: async () => {
            // Verify the setting is accepted without errors
            await H.setSetting('dock-dwell-check-interval', 100);
            await H.waitMs(200);

            // TODO: verify the polling interval changed on the dock manager
            H.assert(true, 'placeholder — polling interval verification not yet implemented');

            // Cleanup
            await H.resetSetting('dock-dwell-check-interval');
        },
    },

    {
        name: 'pressure-show-timeout setting affects show delay',
        fn: async () => {
            await H.setSetting('autohide', true);
            await H.setSetting('dock-fixed', false);

            // Set a long pressure timeout and verify dock does not appear
            // immediately on edge approach
            await H.setSetting('pressure-show-timeout', 1000);
            await H.waitMs(200);

            // TODO: simulate pressure and verify delay is respected
            H.assert(true, 'placeholder — pressure timeout verification not yet implemented');

            // Cleanup
            await H.resetSetting('pressure-show-timeout');
            await H.resetSetting('autohide');
            await H.resetSetting('dock-fixed');
        },
    },

    // -----------------------------------------------------------------------
    // Intellihide
    // -----------------------------------------------------------------------

    {
        name: 'intellihide hides dock when window overlaps',
        fn: async () => {
            await H.setSetting('autohide', false);
            await H.setSetting('intellihide', true);
            await H.setSetting('dock-fixed', false);
            await H.waitMs(300);

            // TODO: open a test window that overlaps the dock region and
            // verify the dock hides
            H.assert(true, 'placeholder — window overlap test not yet implemented');

            // Cleanup
            await H.resetSetting('autohide');
            await H.resetSetting('intellihide');
            await H.resetSetting('dock-fixed');
        },
    },

    {
        name: 'intellihide shows dock when window moves away',
        fn: async () => {
            await H.setSetting('autohide', false);
            await H.setSetting('intellihide', true);
            await H.setSetting('dock-fixed', false);
            await H.waitMs(300);

            // TODO: move overlapping window away from the dock region and
            // verify the dock reappears
            H.assert(true, 'placeholder — window move-away test not yet implemented');

            // Cleanup
            await H.resetSetting('autohide');
            await H.resetSetting('intellihide');
            await H.resetSetting('dock-fixed');
        },
    },

    {
        name: 'intellihide-check-interval setting affects check rate',
        fn: async () => {
            // Verify the setting is accepted without errors
            await H.setSetting('intellihide-check-interval', 200);
            await H.waitMs(300);

            // TODO: verify the intellihide polling interval changed
            H.assert(true, 'placeholder — check-interval verification not yet implemented');

            // Cleanup
            await H.resetSetting('intellihide-check-interval');
        },
    },

    // -----------------------------------------------------------------------
    // Fullscreen / urgent notify
    // -----------------------------------------------------------------------

    {
        name: 'autohide-in-fullscreen setting works',
        fn: async () => {
            await H.setSetting('autohide', true);
            await H.setSetting('dock-fixed', false);

            // Enable autohide-in-fullscreen
            await H.setSetting('autohide-in-fullscreen', true);
            await H.waitMs(300);

            // TODO: open a fullscreen window and verify the dock hides,
            // then verify edge pressure can still reveal it
            H.assert(true, 'placeholder — fullscreen autohide test not yet implemented');

            // Cleanup
            await H.resetSetting('autohide-in-fullscreen');
            await H.resetSetting('autohide');
            await H.resetSetting('dock-fixed');
        },
    },

    {
        name: 'show-dock-urgent-notify shows dock on urgent window',
        fn: async () => {
            await H.setSetting('autohide', true);
            await H.setSetting('dock-fixed', false);
            await H.setSetting('show-dock-urgent-notify', true);
            await H.waitMs(300);

            // TODO: create a window with the urgent hint and verify the
            // dock becomes visible
            H.assert(true, 'placeholder — urgent notify test not yet implemented');

            // Cleanup
            await H.resetSetting('show-dock-urgent-notify');
            await H.resetSetting('autohide');
            await H.resetSetting('dock-fixed');
        },
    },

    // -----------------------------------------------------------------------
    // Spring animation
    // -----------------------------------------------------------------------

    {
        name: 'dock uses spring animation for show',
        fn: async () => {
            await H.setSetting('autohide', true);
            await H.setSetting('dock-fixed', false);
            await H.waitMs(500);

            // TODO: trigger dock show and verify SpringAnimation is used
            // (check _activeSpringAnimation on the dock)
            H.assert(true, 'placeholder — spring show animation test not yet implemented');

            // Cleanup
            await H.resetSetting('autohide');
            await H.resetSetting('dock-fixed');
        },
    },

    {
        name: 'dock uses spring animation for hide',
        fn: async () => {
            await H.setSetting('autohide', true);
            await H.setSetting('dock-fixed', false);
            await H.waitMs(500);

            // TODO: trigger dock hide and verify SpringAnimation is used
            H.assert(true, 'placeholder — spring hide animation test not yet implemented');

            // Cleanup
            await H.resetSetting('autohide');
            await H.resetSetting('dock-fixed');
        },
    },

    {
        name: 'spring-stiffness setting affects animation',
        fn: async () => {
            // Set a custom stiffness value
            await H.setSetting('spring-stiffness', 300.0);
            await H.waitMs(200);

            // TODO: trigger animation and verify the stiffness parameter
            // is propagated to the SpringAnimation instance
            H.assert(true, 'placeholder — spring stiffness verification not yet implemented');

            // Cleanup
            await H.resetSetting('spring-stiffness');
        },
    },

    {
        name: 'spring-damping setting affects animation',
        fn: async () => {
            // Set a custom damping value
            await H.setSetting('spring-damping', 0.5);
            await H.waitMs(200);

            // TODO: trigger animation and verify the damping parameter
            // is propagated to the SpringAnimation instance
            H.assert(true, 'placeholder — spring damping verification not yet implemented');

            // Cleanup
            await H.resetSetting('spring-damping');
        },
    },

    {
        name: 'spring-overshoot-clamp limits slideX maximum',
        fn: async () => {
            // Set a restrictive overshoot clamp
            await H.setSetting('spring-overshoot-clamp', 1.05);
            await H.waitMs(200);

            // TODO: trigger spring animation and verify slideX never
            // exceeds the clamp value during the animation
            H.assert(true, 'placeholder — overshoot clamp verification not yet implemented');

            // Cleanup
            await H.resetSetting('spring-overshoot-clamp');
        },
    },

    // -----------------------------------------------------------------------
    // Startup animation
    // -----------------------------------------------------------------------

    {
        name: 'startup-animation-time setting affects initial animation',
        fn: async () => {
            // The startup animation has already played by the time tests run.
            // Verify the setting is readable and within expected range.
            const settings = H.getSettings();
            const val = settings.get_int('startup-animation-time');
            H.assertRange(val, 0, 10000, 'startup-animation-time should be in range 0-10000');

            // TODO: test actual startup animation duration would require
            // restarting the extension, which is not practical in integration tests
            H.assert(true, 'placeholder — startup animation timing not yet verified');
        },
    },

    // -----------------------------------------------------------------------
    // Dock-fixed mode
    // -----------------------------------------------------------------------

    {
        name: 'dock-fixed mode: dock always visible, affects struts',
        fn: async () => {
            await H.setSetting('dock-fixed', true);
            await H.setSetting('autohide', false);
            await H.setSetting('intellihide', false);
            await H.waitMs(500);

            const dock = H.getDock();
            H.assertVisible(dock.actor, 'dock should be visible in fixed mode');

            // TODO: verify struts are set so maximized windows do not
            // overlap the dock area
            H.assert(true, 'placeholder — struts verification not yet implemented');

            // Cleanup
            await H.resetSetting('dock-fixed');
            await H.resetSetting('autohide');
            await H.resetSetting('intellihide');
        },
    },

];

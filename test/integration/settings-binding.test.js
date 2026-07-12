// SPDX-License-Identifier: GPL-2.0-or-later
// SPDX-FileCopyrightText: Contributors to XDock
//
// Integration tests: verify new configurable settings read correctly from
// GSettings with expected defaults and propagate to DockManager.settings.

const H = XDockTestHelpers;  // provided by runner.js

/* exported XDockTests */
var XDockTests = [
    // -----------------------------------------------------------------------
    // Default-value checks (double-type keys)
    // -----------------------------------------------------------------------
    {
        name: 'spring-stiffness default is 200',
        fn() {
            const settings = H.getSettings();
            H.assertEqual(settings.get_double('spring-stiffness'), 200,
                'spring-stiffness default');
        },
    },
    {
        name: 'spring-damping default is 20',
        fn() {
            const settings = H.getSettings();
            H.assertEqual(settings.get_double('spring-damping'), 20,
                'spring-damping default');
        },
    },
    {
        name: 'hotkey-label-scale default is 0.3',
        fn() {
            const settings = H.getSettings();
            H.assertEqual(settings.get_double('hotkey-label-scale'), 0.3,
                'hotkey-label-scale default');
        },
    },
    {
        name: 'spring-overshoot-clamp default is 1.15',
        fn() {
            const settings = H.getSettings();
            H.assertEqual(settings.get_double('spring-overshoot-clamp'), 1.15,
                'spring-overshoot-clamp default');
        },
    },
    {
        name: 'shelf-angle default is 0.2',
        fn() {
            const settings = H.getSettings();
            H.assertEqual(settings.get_double('shelf-angle'), 0.2,
                'shelf-angle default');
        },
    },
    {
        name: 'shelf-height default is 0.45',
        fn() {
            const settings = H.getSettings();
            H.assertEqual(settings.get_double('shelf-height'), 0.45,
                'shelf-height default');
        },
    },

    // -----------------------------------------------------------------------
    // Default-value checks (integer-type keys)
    // -----------------------------------------------------------------------
    {
        name: 'magnification-spread default is 3',
        fn() {
            const settings = H.getSettings();
            H.assertEqual(settings.get_int('magnification-spread'), 3,
                'magnification-spread default');
        },
    },
    {
        name: 'magnification-easing-duration default is 100',
        fn() {
            const settings = H.getSettings();
            H.assertEqual(settings.get_int('magnification-easing-duration'), 100,
                'magnification-easing-duration default');
        },
    },
    {
        name: 'startup-animation-time default is 500',
        fn() {
            const settings = H.getSettings();
            H.assertEqual(settings.get_int('startup-animation-time'), 500,
                'startup-animation-time default');
        },
    },
    {
        name: 'icon-animator-duration default is 3000',
        fn() {
            const settings = H.getSettings();
            H.assertEqual(settings.get_int('icon-animator-duration'), 3000,
                'icon-animator-duration default');
        },
    },
    {
        name: 'preview-max-height default is 150',
        fn() {
            const settings = H.getSettings();
            H.assertEqual(settings.get_int('preview-max-height'), 150,
                'preview-max-height default');
        },
    },
    {
        name: 'preview-animation-duration default is 250',
        fn() {
            const settings = H.getSettings();
            H.assertEqual(settings.get_int('preview-animation-duration'), 250,
                'preview-animation-duration default');
        },
    },
    {
        name: 'preview-hover-enter-timeout default is 300',
        fn() {
            const settings = H.getSettings();
            H.assertEqual(settings.get_int('preview-hover-enter-timeout'), 300,
                'preview-hover-enter-timeout default');
        },
    },
    {
        name: 'preview-hover-leave-timeout default is 300',
        fn() {
            const settings = H.getSettings();
            H.assertEqual(settings.get_int('preview-hover-leave-timeout'), 300,
                'preview-hover-leave-timeout default');
        },
    },
    {
        name: 'aero-peek-opacity default is 3',
        fn() {
            const settings = H.getSettings();
            H.assertEqual(settings.get_int('aero-peek-opacity'), 3,
                'aero-peek-opacity default');
        },
    },
    {
        name: 'aero-peek-duration default is 200',
        fn() {
            const settings = H.getSettings();
            H.assertEqual(settings.get_int('aero-peek-duration'), 200,
                'aero-peek-duration default');
        },
    },
    {
        name: 'intellihide-check-interval default is 100',
        fn() {
            const settings = H.getSettings();
            H.assertEqual(settings.get_int('intellihide-check-interval'), 100,
                'intellihide-check-interval default');
        },
    },
    {
        name: 'scroll-cycle-debounce default is 250',
        fn() {
            const settings = H.getSettings();
            H.assertEqual(settings.get_int('scroll-cycle-debounce'), 250,
                'scroll-cycle-debounce default');
        },
    },
    {
        name: 'scroll-workspace-deadtime default is 250',
        fn() {
            const settings = H.getSettings();
            H.assertEqual(settings.get_int('scroll-workspace-deadtime'), 250,
                'scroll-workspace-deadtime default');
        },
    },
    {
        name: 'wiggle-long-press-timeout default is 500',
        fn() {
            const settings = H.getSettings();
            H.assertEqual(settings.get_int('wiggle-long-press-timeout'), 500,
                'wiggle-long-press-timeout default');
        },
    },
    {
        name: 'window-cycle-memory-time default is 3000',
        fn() {
            const settings = H.getSettings();
            H.assertEqual(settings.get_int('window-cycle-memory-time'), 3000,
                'window-cycle-memory-time default');
        },
    },
    {
        name: 'dock-edge-dwell-width default is 2',
        fn() {
            const settings = H.getSettings();
            H.assertEqual(settings.get_int('dock-edge-dwell-width'), 2,
                'dock-edge-dwell-width default');
        },
    },
    {
        name: 'dock-dwell-check-interval default is 100',
        fn() {
            const settings = H.getSettings();
            H.assertEqual(settings.get_int('dock-dwell-check-interval'), 100,
                'dock-dwell-check-interval default');
        },
    },
    {
        name: 'shelf-corner-radius-top default is 6',
        fn() {
            const settings = H.getSettings();
            H.assertEqual(settings.get_int('shelf-corner-radius-top'), 6,
                'shelf-corner-radius-top default');
        },
    },
    {
        name: 'shelf-corner-radius-bottom default is 12',
        fn() {
            const settings = H.getSettings();
            H.assertEqual(settings.get_int('shelf-corner-radius-bottom'), 12,
                'shelf-corner-radius-bottom default');
        },
    },
    {
        name: 'reflection-size default is 20',
        fn() {
            const settings = H.getSettings();
            H.assertEqual(settings.get_int('reflection-size'), 20,
                'reflection-size default');
        },
    },
    {
        name: 'progress-arc-width default is 3',
        fn() {
            const settings = H.getSettings();
            H.assertEqual(settings.get_int('progress-arc-width'), 3,
                'progress-arc-width default');
        },
    },
    {
        name: 'tooltip-max-width-px default is 700',
        fn() {
            const settings = H.getSettings();
            H.assertEqual(settings.get_int('tooltip-max-width-px'), 700,
                'tooltip-max-width-px default');
        },
    },
    {
        name: 'pressure-show-timeout default is 250',
        fn() {
            const settings = H.getSettings();
            H.assertEqual(settings.get_int('pressure-show-timeout'), 250,
                'pressure-show-timeout default');
        },
    },

    // -----------------------------------------------------------------------
    // Default-value check (dict-type key)
    // -----------------------------------------------------------------------
    {
        name: 'monitor-positions default is empty object',
        fn() {
            const settings = H.getSettings();
            const val = settings.get_value('monitor-positions').deep_unpack();
            H.assert(val instanceof Object, 'monitor-positions is an object');
            H.assertEqual(Object.keys(val).length, 0,
                'monitor-positions default is empty');
        },
    },

    // -----------------------------------------------------------------------
    // Propagation tests: changing a setting propagates to DockManager.settings
    // -----------------------------------------------------------------------
    {
        name: 'changing spring-stiffness propagates to DockManager.settings',
        async fn() {
            const original = H.getSettings().get_double('spring-stiffness');
            try {
                await H.setSetting('spring-stiffness', 300);
                const dm = H.getDockManager();
                H.assertEqual(dm.settings.get_double('spring-stiffness'), 300,
                    'DockManager.settings reflects updated spring-stiffness');
            } finally {
                await H.setSetting('spring-stiffness', original);
            }
        },
    },
    {
        name: 'changing magnification-spread propagates to DockManager.settings',
        async fn() {
            const original = H.getSettings().get_int('magnification-spread');
            try {
                await H.setSetting('magnification-spread', 5);
                const dm = H.getDockManager();
                H.assertEqual(dm.settings.get_int('magnification-spread'), 5,
                    'DockManager.settings reflects updated magnification-spread');
            } finally {
                await H.setSetting('magnification-spread', original);
            }
        },
    },
];

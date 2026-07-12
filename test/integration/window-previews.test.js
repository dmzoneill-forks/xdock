// SPDX-License-Identifier: GPL-2.0-or-later
// SPDX-FileCopyrightText: Contributors to XDock
//
// Integration tests for window preview functionality.
// Runs INSIDE gnome-shell via gnome-shell-test-tool.

const H = XDockTestHelpers;  // provided by runner.js

/* exported XDockTests */
var XDockTests = [
    {
        name: 'preview menu opens on hover when show-previews-hover=true',
        fn: async () => {
            // TODO: Enable show-previews-hover, hover an app icon with windows,
            //       verify preview menu actor becomes visible.
            await H.setSetting('show-previews-hover', true);
            H.assert(true, 'placeholder');
        },
    },
    {
        name: 'preview menu does not open when show-previews-hover=false',
        fn: async () => {
            // TODO: Disable show-previews-hover, hover an app icon with windows,
            //       verify preview menu does NOT appear.
            await H.setSetting('show-previews-hover', false);
            H.assert(true, 'placeholder');
            await H.resetSetting('show-previews-hover');
        },
    },
    {
        name: 'preview-hover-enter-timeout setting affects open delay',
        fn: async () => {
            // TODO: Set a known enter timeout, hover an icon, verify the preview
            //       does not appear before the timeout elapses and does appear after.
            await H.setSetting('preview-hover-enter-timeout', 500);
            H.assert(true, 'placeholder');
            await H.resetSetting('preview-hover-enter-timeout');
        },
    },
    {
        name: 'preview-hover-leave-timeout setting affects close delay',
        fn: async () => {
            // TODO: Open a preview, move mouse away, verify the preview stays
            //       visible for at least the leave-timeout duration before closing.
            await H.setSetting('preview-hover-leave-timeout', 500);
            H.assert(true, 'placeholder');
            await H.resetSetting('preview-hover-leave-timeout');
        },
    },
    {
        name: 'preview-max-height setting limits preview height',
        fn: async () => {
            // TODO: Set a small max height, open a preview, verify the preview
            //       actor's height does not exceed the configured limit.
            await H.setSetting('preview-max-height', 200);
            H.assert(true, 'placeholder');
            await H.resetSetting('preview-max-height');
        },
    },
    {
        name: 'preview-animation-duration setting affects animation',
        fn: async () => {
            // TODO: Set a known animation duration, open a preview, verify
            //       the transition duration on the preview actor matches.
            await H.setSetting('preview-animation-duration', 300);
            H.assert(true, 'placeholder');
            await H.resetSetting('preview-animation-duration');
        },
    },
    {
        name: 'aero-peek-opacity setting affects peek window opacity',
        fn: async () => {
            // TODO: Set aero-peek-opacity, trigger aero peek on a preview
            //       thumbnail, verify non-focused windows have the configured opacity.
            await H.setSetting('aero-peek-opacity', 50);
            H.assert(true, 'placeholder');
            await H.resetSetting('aero-peek-opacity');
        },
    },
    {
        name: 'aero-peek-duration setting affects peek animation',
        fn: async () => {
            // TODO: Set aero-peek-duration, trigger aero peek, verify the
            //       transition duration on affected window actors matches.
            await H.setSetting('aero-peek-duration', 200);
            H.assert(true, 'placeholder');
            await H.resetSetting('aero-peek-duration');
        },
    },
    {
        name: 'preview shows window thumbnails for running app',
        fn: async () => {
            // TODO: Open a preview for an app icon that has running windows,
            //       verify at least one thumbnail clone is present in the menu.
            H.assert(true, 'placeholder');
        },
    },
    {
        name: 'preview closes when mouse leaves',
        fn: async () => {
            // TODO: Open a preview via hover, move the pointer away from
            //       both the icon and the preview, verify it closes.
            H.assert(true, 'placeholder');
        },
    },
    {
        name: 'hovering different icon closes previous preview',
        fn: async () => {
            // TODO: Open preview on icon A, then hover icon B, verify icon A's
            //       preview closes and icon B's preview opens.
            H.assert(true, 'placeholder');
        },
    },
    {
        name: 'preview menu position follows dock position',
        fn: async () => {
            // TODO: For each dock position (bottom, left, right), verify the
            //       preview menu appears on the correct side of the dock.
            H.assert(true, 'placeholder');
        },
    },
    {
        name: 'click on preview activates corresponding window',
        fn: async () => {
            // TODO: Open a preview, click a thumbnail, verify the corresponding
            //       Meta.Window receives focus / is activated.
            H.assert(true, 'placeholder');
        },
    },
    {
        name: 'close button on preview closes window',
        fn: async () => {
            // TODO: Open a preview, click the close button on a thumbnail,
            //       verify the window is closed (removed from window list).
            H.assert(true, 'placeholder');
        },
    },
    {
        name: 'scroll in preview cycles windows',
        fn: async () => {
            // TODO: Open a preview for an app with multiple windows, emit a
            //       scroll event, verify focus shifts to the next/previous window.
            H.assert(true, 'placeholder');
        },
    },
];

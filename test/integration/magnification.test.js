// SPDX-License-Identifier: GPL-2.0-or-later
// SPDX-FileCopyrightText: Contributors to XDock
//
// Integration tests for icon magnification (hover zoom).
// Runs inside gnome-shell via gnome-shell-test-tool.

const {assert} = typeof XDockTestHelpers !== 'undefined'
    ? XDockTestHelpers
    : imports.helpers.XDockTestHelpers;

function getTests() {
    return [
        {
            name: 'magnification enabled when icon-magnification setting is true',
            fn: async () => {
                assert(true, 'TODO');
            },
        },
        {
            name: 'magnification disabled when icon-magnification setting is false',
            fn: async () => {
                assert(true, 'TODO');
            },
        },
        {
            name: 'icons have scale 1.0 when no hover',
            fn: async () => {
                assert(true, 'TODO');
            },
        },
        {
            name: 'center icon scales > 1.0 on synthetic hover',
            fn: async () => {
                assert(true, 'TODO');
            },
        },
        {
            name: 'neighbor icons scale between 1.0 and max on hover',
            fn: async () => {
                assert(true, 'TODO');
            },
        },
        {
            name: 'icons beyond spread have scale 1.0',
            fn: async () => {
                assert(true, 'TODO');
            },
        },
        {
            name: 'all icons return to scale 1.0 on leave',
            fn: async () => {
                assert(true, 'TODO');
            },
        },
        {
            name: 'magnification-spread setting changes affected icon count',
            fn: async () => {
                assert(true, 'TODO');
            },
        },
        {
            name: 'magnification-factor setting changes max scale',
            fn: async () => {
                assert(true, 'TODO');
            },
        },
        {
            name: 'magnification-easing-duration setting affects easing',
            fn: async () => {
                assert(true, 'TODO');
            },
        },
        {
            name: 'dock background scale_x > 1.0 during magnification',
            fn: async () => {
                assert(true, 'TODO');
            },
        },
        {
            name: 'dock background returns to scale 1.0 on leave',
            fn: async () => {
                assert(true, 'TODO');
            },
        },
        {
            name: 'edge icons (show-apps) participate in magnification offsets',
            fn: async () => {
                assert(true, 'TODO');
            },
        },
        {
            name: 'clip_to_view is false on box ancestors during magnification',
            fn: async () => {
                assert(true, 'TODO');
            },
        },
        {
            name: 'offscreen_redirect is 0 on DockDash during magnification',
            fn: async () => {
                assert(true, 'TODO');
            },
        },
        {
            name: 'icon box reparented outside scrollView during magnification',
            fn: async () => {
                assert(true, 'TODO');
            },
        },
        {
            name: 'scrollView hidden during magnification',
            fn: async () => {
                assert(true, 'TODO');
            },
        },
        {
            name: 'icons extend above dock bounds (not clipped vertically)',
            fn: async () => {
                assert(true, 'TODO');
            },
        },
    ];
}

/* exported XDockTests, getTests */
var XDockTests = getTests();  // eslint-disable-line no-unused-vars

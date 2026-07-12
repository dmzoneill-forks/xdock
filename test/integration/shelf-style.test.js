// SPDX-License-Identifier: GPL-2.0-or-later
// SPDX-FileCopyrightText: Contributors to XDock
//
// Integration tests for the shelf dock style.
// Runs INSIDE gnome-shell via gnome-shell-test-tool.

const {assert, assertEqual, assertVisible, assertHidden,
    getDock, getDash, getDockManager, getSettings,
    setSetting, resetSetting, waitMs} = XDockTestHelpers;

function getTests() {
    return [
        {
            name: 'flat style: no shelf overlay on background',
            fn: async () => {
                // TODO: implement
            },
        },
        {
            name: 'shelf style: DrawingArea overlay exists on background',
            fn: async () => {
                // TODO: implement
            },
        },
        {
            name: 'shelf style: overlay is visible',
            fn: async () => {
                // TODO: implement
            },
        },
        {
            name: 'shelf style: CSS background is transparent',
            fn: async () => {
                // TODO: implement
            },
        },
        {
            name: 'shelf-angle setting changes trapezoid slope',
            fn: async () => {
                // TODO: implement
            },
        },
        {
            name: 'shelf-height setting changes where shelf starts',
            fn: async () => {
                // TODO: implement
            },
        },
        {
            name: 'shelf-corner-radius-top setting affects top corners',
            fn: async () => {
                // TODO: implement
            },
        },
        {
            name: 'shelf-corner-radius-bottom setting affects bottom corners',
            fn: async () => {
                // TODO: implement
            },
        },
        {
            name: 'shelf-gradient-top-opacity setting updates overlay',
            fn: async () => {
                // TODO: implement
            },
        },
        {
            name: 'shelf-gradient-bottom-opacity setting updates overlay',
            fn: async () => {
                // TODO: implement
            },
        },
        {
            name: 'shelf-highlight-opacity setting updates overlay',
            fn: async () => {
                // TODO: implement
            },
        },
        {
            name: 'shelf-border-opacity setting updates overlay',
            fn: async () => {
                // TODO: implement
            },
        },
        {
            name: 'switching from shelf to flat removes overlay',
            fn: async () => {
                // TODO: implement
            },
        },
        {
            name: 'switching from flat to shelf creates overlay',
            fn: async () => {
                // TODO: implement
            },
        },
        {
            name: 'shelf reflection widget visible when shelf-reflection=true',
            fn: async () => {
                // TODO: implement
            },
        },
        {
            name: 'shelf reflection hidden when shelf-reflection=false',
            fn: async () => {
                // TODO: implement
            },
        },
        {
            name: 'shelf-reflection-opacity setting updates reflection style',
            fn: async () => {
                // TODO: implement
            },
        },
        {
            name: 'shelf background scales with magnification',
            fn: async () => {
                // TODO: implement
            },
        },
        {
            name: 'no 1px border line at top of dock in shelf mode',
            fn: async () => {
                // TODO: implement
            },
        },
        {
            name: 'shelf style class added to dock container',
            fn: async () => {
                // TODO: implement
            },
        },
    ];
}

/* exported XDockTests */
var XDockTests = getTests();  // eslint-disable-line no-unused-vars

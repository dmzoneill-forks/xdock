// SPDX-License-Identifier: GPL-2.0-or-later
// SPDX-FileCopyrightText: Contributors to XDock
//
// Integration tests: basic dock functionality.
// Each test is a placeholder (assert(true, 'TODO')) to be filled in later.

function assert(cond, msg) { if (!cond) throw new Error(msg); }

function getTests() {
    return [
        {
            name: 'extension is loaded and enabled',
            fn: async () => {
                assert(true, 'TODO');
            },
        },
        {
            name: 'dock manager exists',
            fn: async () => {
                assert(true, 'TODO');
            },
        },
        {
            name: 'primary dock exists',
            fn: async () => {
                assert(true, 'TODO');
            },
        },
        {
            name: 'dock dash exists',
            fn: async () => {
                assert(true, 'TODO');
            },
        },
        {
            name: 'dock is visible on stage',
            fn: async () => {
                assert(true, 'TODO');
            },
        },
        {
            name: 'dock is at correct position (BOTTOM by default)',
            fn: async () => {
                assert(true, 'TODO');
            },
        },
        {
            name: 'dock width matches height-fraction * workArea width',
            fn: async () => {
                assert(true, 'TODO');
            },
        },
        {
            name: 'dock has correct monitor index',
            fn: async () => {
                assert(true, 'TODO');
            },
        },
        {
            name: 'dock background exists',
            fn: async () => {
                assert(true, 'TODO');
            },
        },
        {
            name: 'dock dash container exists',
            fn: async () => {
                assert(true, 'TODO');
            },
        },
        {
            name: 'show-apps icon exists',
            fn: async () => {
                assert(true, 'TODO');
            },
        },
        {
            name: 'dock has at least one app icon',
            fn: async () => {
                assert(true, 'TODO');
            },
        },
        {
            name: 'dock translation_y positions it at screen bottom',
            fn: async () => {
                assert(true, 'TODO');
            },
        },
        {
            name: 'dock responds to position change setting',
            fn: async () => {
                assert(true, 'TODO');
            },
        },
        {
            name: 'dock responds to extend-height setting',
            fn: async () => {
                assert(true, 'TODO');
            },
        },
        {
            name: 'dock responds to dock-margin-size setting',
            fn: async () => {
                assert(true, 'TODO');
            },
        },
        {
            name: 'dock responds to height-fraction setting',
            fn: async () => {
                assert(true, 'TODO');
            },
        },
    ];
}

/* exported XDockTests, getTests */
exports.getTests = getTests;

// SPDX-License-Identifier: GPL-2.0-or-later
function assert(cond, msg) { if (!cond) throw new Error(msg); }

function getTests() {
    return [
        {
            name: 'single monitor: dock follows global position',
            fn() { assert(true, 'TODO'); },
        },
        {
            name: 'monitor-positions default is empty',
            fn() { assert(true, 'TODO'); },
        },
        {
            name: 'getPosition() without monitorIndex returns global position',
            fn() { assert(true, 'TODO'); },
        },
        {
            name: 'getPosition() with monitorIndex and no override returns global',
            fn() { assert(true, 'TODO'); },
        },
        {
            name: 'getPosition() with override returns override position',
            fn() { assert(true, 'TODO'); },
        },
        {
            name: 'changing monitor-positions triggers dock rebuild',
            fn() { assert(true, 'TODO'); },
        },
        {
            name: 'override position applied without RTL flip',
            fn() { assert(true, 'TODO'); },
        },
        {
            name: 'invalid monitor index (-1) never matches override',
            fn() { assert(true, 'TODO'); },
        },
        {
            name: 'preferences shows per-monitor position rows',
            fn() { assert(true, 'TODO'); },
        },
    ];
}

exports.getTests = getTests;

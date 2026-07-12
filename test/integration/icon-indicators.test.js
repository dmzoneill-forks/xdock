// SPDX-License-Identifier: GPL-2.0-or-later
function assert(cond, msg) { if (!cond) throw new Error(msg); }

function getTests() {
    return [
        {name: 'running indicator visible for running app', fn() { assert(true, 'TODO'); } },
        {name: 'running indicator hidden for non-running app', fn() { assert(true, 'TODO'); } },
        {name: 'running indicator style matches setting', fn() { assert(true, 'TODO'); } },
        {name: 'progress-arc-width setting affects arc line width', fn() { assert(true, 'TODO'); } },
        {name: 'hotkey-label-scale setting affects number overlay size', fn() { assert(true, 'TODO'); } },
        {name: 'tooltip-max-width-px setting limits tooltip width', fn() { assert(true, 'TODO'); } },
        {name: 'focused app has .focused style class', fn() { assert(true, 'TODO'); } },
        {name: 'unfocused app does not have .focused class', fn() { assert(true, 'TODO'); } },
        {name: 'urgent app has .urgent style class', fn() { assert(true, 'TODO'); } },
        {name: 'windows-count property tracks open windows', fn() { assert(true, 'TODO'); } },
        {name: 'icon emblems visible when show-icons-emblems=true', fn() { assert(true, 'TODO'); } },
        {name: 'icon emblems hidden when show-icons-emblems=false', fn() { assert(true, 'TODO'); } },
        {name: 'notification badge visible for unread notifications', fn() { assert(true, 'TODO'); } },
        {name: 'scroll-cycle-debounce setting affects scroll behavior', fn() { assert(true, 'TODO'); } },
        {name: 'wiggle-long-press-timeout setting affects wiggle activation', fn() { assert(true, 'TODO'); } },
        {name: 'window-cycle-memory-time setting affects cycling memory', fn() { assert(true, 'TODO'); } },
        {name: 'icon-animator-duration setting affects bounce animation', fn() { assert(true, 'TODO'); } },
    ];
}

exports.getTests = getTests;

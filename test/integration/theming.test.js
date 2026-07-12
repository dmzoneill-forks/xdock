// SPDX-License-Identifier: GPL-2.0-or-later
function assert(cond, msg) { if (!cond) throw new Error(msg); }

function getTests() {
    return [
        {name: 'theme manager creates on dock init', fn() { assert(true, 'TODO'); } },
        {name: 'updateCustomTheme runs when actor is mapped', fn() { assert(true, 'TODO'); } },
        {name: 'updateCustomTheme does not run when actor is unmapped', fn() { assert(true, 'TODO'); } },
        {name: 'shelf CSS class added when dock-style=SHELF', fn() { assert(true, 'TODO'); } },
        {name: 'shelf CSS class removed when dock-style=FLAT', fn() { assert(true, 'TODO'); } },
        {name: 'no-hover-highlight class when magnification on and highlight off', fn() { assert(true, 'TODO'); } },
        {name: 'custom background color applied when enabled', fn() { assert(true, 'TODO'); } },
        {name: 'custom border radius applied from setting', fn() { assert(true, 'TODO'); } },
        {name: 'transparency mode FIXED applies fixed opacity', fn() { assert(true, 'TODO'); } },
        {name: 'transparency mode DYNAMIC tracks window proximity', fn() { assert(true, 'TODO'); } },
        {name: 'transparency mode DEFAULT uses theme opacity', fn() { assert(true, 'TODO'); } },
        {name: 'wallpaper-adaptive color extracts from wallpaper', fn() { assert(true, 'TODO'); } },
        {name: 'wallpaper color intensity setting affects result', fn() { assert(true, 'TODO'); } },
        {name: 'style-only settings do not trigger resetAppIcons', fn() { assert(true, 'TODO'); } },
        {name: 'theme update does not trigger resetAppIcons on first call', fn() { assert(true, 'TODO'); } },
        {name: 'shelf trapezoid repaints when style settings change', fn() { assert(true, 'TODO'); } },
        {name: 'shrink-dash setting reduces padding', fn() { assert(true, 'TODO'); } },
        {name: 'extend-height applies extended style class', fn() { assert(true, 'TODO'); } },
        {name: 'straight-corner setting forces 0 border radius', fn() { assert(true, 'TODO'); } },
    ];
}

exports.getTests = getTests;

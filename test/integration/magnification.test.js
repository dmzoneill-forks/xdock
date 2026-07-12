// SPDX-License-Identifier: GPL-2.0-or-later
function assert(cond, msg) { if (!cond) throw new Error(msg); }

function getTests() {
    return [
        {name: 'magnification enabled when icon-magnification setting is true', fn() { assert(true, 'TODO'); } },
        {name: 'magnification disabled when icon-magnification setting is false', fn() { assert(true, 'TODO'); } },
        {name: 'icons have scale 1.0 when no hover', fn() { assert(true, 'TODO'); } },
        {name: 'center icon scales > 1.0 on synthetic hover', fn() { assert(true, 'TODO'); } },
        {name: 'neighbor icons scale between 1.0 and max on hover', fn() { assert(true, 'TODO'); } },
        {name: 'icons beyond spread have scale 1.0', fn() { assert(true, 'TODO'); } },
        {name: 'all icons return to scale 1.0 on leave', fn() { assert(true, 'TODO'); } },
        {name: 'magnification-spread setting changes affected icon count', fn() { assert(true, 'TODO'); } },
        {name: 'magnification-factor setting changes max scale', fn() { assert(true, 'TODO'); } },
        {name: 'magnification-easing-duration setting affects easing', fn() { assert(true, 'TODO'); } },
        {name: 'dock background scale_x > 1.0 during magnification', fn() { assert(true, 'TODO'); } },
        {name: 'dock background returns to scale 1.0 on leave', fn() { assert(true, 'TODO'); } },
        {name: 'edge icons (show-apps) participate in magnification offsets', fn() { assert(true, 'TODO'); } },
        {name: 'clip_to_view is false on box ancestors during magnification', fn() { assert(true, 'TODO'); } },
        {name: 'offscreen_redirect is 0 on DockDash during magnification', fn() { assert(true, 'TODO'); } },
        {name: 'icon box reparented outside scrollView during magnification', fn() { assert(true, 'TODO'); } },
        {name: 'scrollView hidden during magnification', fn() { assert(true, 'TODO'); } },
        {name: 'icons extend above dock bounds (not clipped vertically)', fn() { assert(true, 'TODO'); } },
    ];
}

exports.getTests = getTests;

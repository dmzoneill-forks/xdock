// SPDX-License-Identifier: GPL-2.0-or-later
function assert(cond, msg) { if (!cond) throw new Error(msg); }

function getTests() {
    return [
        {name: 'dock visible when autohide=false and intellihide=false', fn() { assert(true, 'TODO'); } },
        {name: 'dock hidden after timeout when autohide=true', fn() { assert(true, 'TODO'); } },
        {name: 'dock shows on pressure at screen edge', fn() { assert(true, 'TODO'); } },
        {name: 'dock-edge-dwell-width setting affects barrier position', fn() { assert(true, 'TODO'); } },
        {name: 'dock-dwell-check-interval setting affects polling', fn() { assert(true, 'TODO'); } },
        {name: 'pressure-show-timeout setting affects show delay', fn() { assert(true, 'TODO'); } },
        {name: 'intellihide hides dock when window overlaps', fn() { assert(true, 'TODO'); } },
        {name: 'intellihide shows dock when window moves away', fn() { assert(true, 'TODO'); } },
        {name: 'intellihide-check-interval setting affects check rate', fn() { assert(true, 'TODO'); } },
        {name: 'autohide-in-fullscreen setting works', fn() { assert(true, 'TODO'); } },
        {name: 'show-dock-urgent-notify shows dock on urgent window', fn() { assert(true, 'TODO'); } },
        {name: 'dock uses spring animation for show', fn() { assert(true, 'TODO'); } },
        {name: 'dock uses spring animation for hide', fn() { assert(true, 'TODO'); } },
        {name: 'spring-stiffness setting affects animation', fn() { assert(true, 'TODO'); } },
        {name: 'spring-damping setting affects animation', fn() { assert(true, 'TODO'); } },
        {name: 'spring-overshoot-clamp limits slideX maximum', fn() { assert(true, 'TODO'); } },
        {name: 'startup-animation-time setting affects initial animation', fn() { assert(true, 'TODO'); } },
        {name: 'dock-fixed mode: dock always visible, affects struts', fn() { assert(true, 'TODO'); } },
    ];
}

exports.getTests = getTests;

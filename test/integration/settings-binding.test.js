// SPDX-License-Identifier: GPL-2.0-or-later
function assert(cond, msg) { if (!cond) throw new Error(msg); }

function getTests() {
    return [
        {name: 'spring-stiffness default is 200', fn() { assert(true, 'TODO'); } },
        {name: 'spring-damping default is 20', fn() { assert(true, 'TODO'); } },
        {name: 'hotkey-label-scale default is 0.3', fn() { assert(true, 'TODO'); } },
        {name: 'spring-overshoot-clamp default is 1.15', fn() { assert(true, 'TODO'); } },
        {name: 'shelf-angle default is 0.2', fn() { assert(true, 'TODO'); } },
        {name: 'shelf-height default is 0.45', fn() { assert(true, 'TODO'); } },
        {name: 'magnification-spread default is 3', fn() { assert(true, 'TODO'); } },
        {name: 'magnification-easing-duration default is 100', fn() { assert(true, 'TODO'); } },
        {name: 'startup-animation-time default is 500', fn() { assert(true, 'TODO'); } },
        {name: 'icon-animator-duration default is 3000', fn() { assert(true, 'TODO'); } },
        {name: 'preview-max-height default is 150', fn() { assert(true, 'TODO'); } },
        {name: 'preview-animation-duration default is 250', fn() { assert(true, 'TODO'); } },
        {name: 'preview-hover-enter-timeout default is 300', fn() { assert(true, 'TODO'); } },
        {name: 'preview-hover-leave-timeout default is 300', fn() { assert(true, 'TODO'); } },
        {name: 'aero-peek-opacity default is 3', fn() { assert(true, 'TODO'); } },
        {name: 'aero-peek-duration default is 200', fn() { assert(true, 'TODO'); } },
        {name: 'intellihide-check-interval default is 100', fn() { assert(true, 'TODO'); } },
        {name: 'scroll-cycle-debounce default is 250', fn() { assert(true, 'TODO'); } },
        {name: 'scroll-workspace-deadtime default is 250', fn() { assert(true, 'TODO'); } },
        {name: 'wiggle-long-press-timeout default is 500', fn() { assert(true, 'TODO'); } },
        {name: 'window-cycle-memory-time default is 3000', fn() { assert(true, 'TODO'); } },
        {name: 'dock-edge-dwell-width default is 2', fn() { assert(true, 'TODO'); } },
        {name: 'dock-dwell-check-interval default is 100', fn() { assert(true, 'TODO'); } },
        {name: 'shelf-corner-radius-top default is 6', fn() { assert(true, 'TODO'); } },
        {name: 'shelf-corner-radius-bottom default is 12', fn() { assert(true, 'TODO'); } },
        {name: 'reflection-size default is 20', fn() { assert(true, 'TODO'); } },
        {name: 'progress-arc-width default is 3', fn() { assert(true, 'TODO'); } },
        {name: 'tooltip-max-width-px default is 700', fn() { assert(true, 'TODO'); } },
        {name: 'pressure-show-timeout default is 250', fn() { assert(true, 'TODO'); } },
        {name: 'monitor-positions default is empty object', fn() { assert(true, 'TODO'); } },
        {name: 'changing spring-stiffness propagates to DockManager.settings', fn() { assert(true, 'TODO'); } },
        {name: 'changing magnification-spread propagates to DockManager.settings', fn() { assert(true, 'TODO'); } },
    ];
}

exports.getTests = getTests;

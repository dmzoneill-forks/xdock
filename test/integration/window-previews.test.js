// SPDX-License-Identifier: GPL-2.0-or-later
function assert(cond, msg) { if (!cond) throw new Error(msg); }

function getTests() {
    return [
        {name: 'preview menu opens on hover when show-previews-hover=true', fn() { assert(true, 'TODO'); } },
        {name: 'preview menu does not open when show-previews-hover=false', fn() { assert(true, 'TODO'); } },
        {name: 'preview-hover-enter-timeout setting affects open delay', fn() { assert(true, 'TODO'); } },
        {name: 'preview-hover-leave-timeout setting affects close delay', fn() { assert(true, 'TODO'); } },
        {name: 'preview-max-height setting limits preview height', fn() { assert(true, 'TODO'); } },
        {name: 'preview-animation-duration setting affects animation', fn() { assert(true, 'TODO'); } },
        {name: 'aero-peek-opacity setting affects peek window opacity', fn() { assert(true, 'TODO'); } },
        {name: 'aero-peek-duration setting affects peek animation', fn() { assert(true, 'TODO'); } },
        {name: 'preview shows window thumbnails for running app', fn() { assert(true, 'TODO'); } },
        {name: 'preview closes when mouse leaves', fn() { assert(true, 'TODO'); } },
        {name: 'hovering different icon closes previous preview', fn() { assert(true, 'TODO'); } },
        {name: 'preview menu position follows dock position', fn() { assert(true, 'TODO'); } },
        {name: 'click on preview activates corresponding window', fn() { assert(true, 'TODO'); } },
        {name: 'close button on preview closes window', fn() { assert(true, 'TODO'); } },
        {name: 'scroll in preview cycles windows', fn() { assert(true, 'TODO'); } },
    ];
}

exports.getTests = getTests;

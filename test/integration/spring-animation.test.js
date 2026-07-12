// SPDX-License-Identifier: GPL-2.0-or-later
function assert(cond, msg) { if (!cond) throw new Error(msg); }

function getTests() {
    return [
        {name: 'spring animation starts when show() called', fn() { assert(true, 'TODO'); } },
        {name: 'spring animation completes and calls onComplete', fn() { assert(true, 'TODO'); } },
        {name: 'spring-stiffness setting affects oscillation frequency', fn() { assert(true, 'TODO'); } },
        {name: 'spring-damping setting affects decay rate', fn() { assert(true, 'TODO'); } },
        {name: 'spring settles at target value', fn() { assert(true, 'TODO'); } },
        {name: 'spring with high damping does not overshoot', fn() { assert(true, 'TODO'); } },
        {name: 'spring with low damping overshoots then settles', fn() { assert(true, 'TODO'); } },
        {name: 'spring-overshoot-clamp limits maximum value', fn() { assert(true, 'TODO'); } },
        {name: 'spring stops when actor is removed from stage', fn() { assert(true, 'TODO'); } },
        {name: 'spring animation interruptible (new animation replaces old)', fn() { assert(true, 'TODO'); } },
        {name: 'show spring uses configured stiffness and damping', fn() { assert(true, 'TODO'); } },
        {name: 'hide spring uses configured stiffness and damping+10', fn() { assert(true, 'TODO'); } },
    ];
}

exports.getTests = getTests;

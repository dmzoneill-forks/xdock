// SPDX-License-Identifier: GPL-2.0-or-later
// SPDX-FileCopyrightText: Contributors to XDock
//
// Integration tests for spring-physics animations.
// Runs INSIDE gnome-shell via gnome-shell-test-tool.

const {Clutter, GLib} = imports.gi;
const H = XDockTestHelpers;  // provided by runner.js

/* exported XDockTests */
var XDockTests = [
    // ------------------------------------------------------------------
    // 1. spring animation starts when show() called
    // ------------------------------------------------------------------
    {
        name: 'spring animation starts when show() called',
        fn: async () => {
            // TODO: Enable spring-animations, trigger dock show, assert
            //       that the SpringAnimation instance is created and running.
        },
    },

    // ------------------------------------------------------------------
    // 2. spring animation completes and calls onComplete
    // ------------------------------------------------------------------
    {
        name: 'spring animation completes and calls onComplete',
        fn: async () => {
            // TODO: Start a spring animation and wait for it to settle.
            //       Verify onComplete callback is invoked and the animation
            //       is no longer running.
        },
    },

    // ------------------------------------------------------------------
    // 3. spring-stiffness setting affects oscillation frequency
    // ------------------------------------------------------------------
    {
        name: 'spring-stiffness setting affects oscillation frequency',
        fn: async () => {
            // TODO: Run two spring animations with different stiffness values
            //       (e.g. 100 vs 400).  Record the time to first zero-crossing
            //       or peak.  Higher stiffness should produce a shorter period
            //       (higher oscillation frequency).
        },
    },

    // ------------------------------------------------------------------
    // 4. spring-damping setting affects decay rate
    // ------------------------------------------------------------------
    {
        name: 'spring-damping setting affects decay rate',
        fn: async () => {
            // TODO: Run two spring animations with different damping values.
            //       Measure how many frames/time before the spring settles.
            //       Higher damping should settle faster.
        },
    },

    // ------------------------------------------------------------------
    // 5. spring settles at target value
    // ------------------------------------------------------------------
    {
        name: 'spring settles at target value',
        fn: async () => {
            // TODO: Create a spring with initial=0.0 and target=1.0.
            //       Wait for onComplete.  Assert that final position === target.
        },
    },

    // ------------------------------------------------------------------
    // 6. spring with high damping does not overshoot
    // ------------------------------------------------------------------
    {
        name: 'spring with high damping does not overshoot',
        fn: async () => {
            // TODO: Create a critically/over-damped spring (e.g. damping=50).
            //       Record all onUpdate values.  Assert none exceed the target
            //       value (no overshoot).
        },
    },

    // ------------------------------------------------------------------
    // 7. spring with low damping overshoots then settles
    // ------------------------------------------------------------------
    {
        name: 'spring with low damping overshoots then settles',
        fn: async () => {
            // TODO: Create an underdamped spring (e.g. damping=5, stiffness=200).
            //       Record all onUpdate values.  Assert that at least one value
            //       exceeds the target (overshoot) and that the spring still
            //       settles at the target.
        },
    },

    // ------------------------------------------------------------------
    // 8. spring-overshoot-clamp limits maximum value
    // ------------------------------------------------------------------
    {
        name: 'spring-overshoot-clamp limits maximum value',
        fn: async () => {
            // TODO: Set spring-overshoot-clamp to e.g. 1.1 in settings.
            //       Trigger a dock show with an underdamped spring.  Assert
            //       that the slider value never exceeds the clamp.
        },
    },

    // ------------------------------------------------------------------
    // 9. spring stops when actor is removed from stage
    // ------------------------------------------------------------------
    {
        name: 'spring stops when actor is removed from stage',
        fn: async () => {
            // TODO: Create a spring with an actor.  Remove the actor from
            //       its parent (stage) before starting.  Assert that start()
            //       calls onComplete immediately without running the timeline.
        },
    },

    // ------------------------------------------------------------------
    // 10. spring timeline uses actor's frame clock when provided
    // ------------------------------------------------------------------
    {
        name: "spring timeline uses actor's frame clock when provided",
        fn: async () => {
            // TODO: Create a spring with an actor parameter.  Start it and
            //       verify that the underlying Clutter.Timeline was
            //       constructed with the actor property set.
        },
    },

    // ------------------------------------------------------------------
    // 11. spring animation interruptible (new animation replaces old)
    // ------------------------------------------------------------------
    {
        name: 'spring animation interruptible (new animation replaces old)',
        fn: async () => {
            // TODO: Start a dock show spring animation.  Before it settles,
            //       trigger a dock hide.  Assert the first animation is
            //       destroyed and the second one takes over cleanly.
        },
    },

    // ------------------------------------------------------------------
    // 12. show spring uses configured stiffness and damping
    // ------------------------------------------------------------------
    {
        name: 'show spring uses configured stiffness and damping',
        fn: async () => {
            // TODO: Set spring-stiffness and spring-damping via GSettings.
            //       Trigger a dock show.  Inspect the active spring animation
            //       to verify it was constructed with the configured values.
        },
    },

    // ------------------------------------------------------------------
    // 13. hide spring uses configured stiffness and damping+10
    // ------------------------------------------------------------------
    {
        name: 'hide spring uses configured stiffness and damping+10',
        fn: async () => {
            // TODO: Set spring-damping to e.g. 15 via GSettings.  Trigger a
            //       dock hide.  Verify the spring was created with damping=25
            //       (configured value + 10), matching _animateOut() behaviour.
        },
    },
];

import {jest} from '@jest/globals';
import {Clutter, GLib} from '../dependencies/gi.js';

// ---------------------------------------------------------------------------
// Import real module
// ---------------------------------------------------------------------------
let SpringAnimation;
beforeAll(async () => {
    const mod = await import('../springAnimation.js');
    SpringAnimation = mod.SpringAnimation;
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a mock actor with a configurable get_stage */
function makeMockActor(hasStage = true) {
    return {
        get_stage: () => hasStage ? {} : null,
    };
}

/** Monotonic time counter to simulate frame progression */
let monotonicTime;
function resetMonotonicTime(start = 0) {
    monotonicTime = start;
    GLib.get_monotonic_time = () => monotonicTime;
}

function advanceTime(microseconds) {
    monotonicTime += microseconds;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SpringAnimation', () => {
    beforeEach(() => {
        resetMonotonicTime(1000000); // start at 1 second in microseconds
    });

    // --- Constructor ---

    describe('constructor', () => {
        test('sets default parameters', () => {
            const spring = new SpringAnimation({});
            expect(spring._stiffness).toBe(200);
            expect(spring._damping).toBe(20);
            expect(spring._mass).toBe(1);
            expect(spring._target).toBe(0);
            expect(spring._position).toBe(0);
            expect(spring._velocity).toBe(0);
            expect(spring._actor).toBeNull();
            expect(spring._onUpdate).toBeUndefined();
            expect(spring._onComplete).toBeUndefined();
            expect(spring._timeline).toBeNull();
            expect(spring._lastFrameTime).toBe(-1);
            expect(spring._running).toBe(false);
            expect(spring._positionThreshold).toBeCloseTo(0.0005);
            expect(spring._velocityThreshold).toBeCloseTo(0.0005);
        });

        test('accepts custom parameters', () => {
            const onUpdate = jest.fn();
            const onComplete = jest.fn();
            const actor = makeMockActor();
            const spring = new SpringAnimation({
                stiffness: 300,
                damping: 30,
                mass: 2,
                target: 1,
                initial: 0.5,
                actor,
                onUpdate,
                onComplete,
            });
            expect(spring._stiffness).toBe(300);
            expect(spring._damping).toBe(30);
            expect(spring._mass).toBe(2);
            expect(spring._target).toBe(1);
            expect(spring._position).toBe(0.5);
            expect(spring._velocity).toBe(0);
            expect(spring._actor).toBe(actor);
            expect(spring._onUpdate).toBe(onUpdate);
            expect(spring._onComplete).toBe(onComplete);
        });

        test('actor defaults to null when not provided', () => {
            const spring = new SpringAnimation({});
            expect(spring._actor).toBeNull();
        });
    });

    // --- Properties (getters) ---

    describe('running getter', () => {
        test('returns false initially', () => {
            const spring = new SpringAnimation({});
            expect(spring.running).toBe(false);
        });

        test('returns true after start()', () => {
            const spring = new SpringAnimation({initial: 1, target: 0});
            spring.start();
            expect(spring.running).toBe(true);
        });
    });

    describe('position getter', () => {
        test('returns initial position', () => {
            const spring = new SpringAnimation({initial: 0.7});
            expect(spring.position).toBeCloseTo(0.7);
        });
    });

    // --- setTarget ---

    describe('setTarget', () => {
        test('updates the target value', () => {
            const spring = new SpringAnimation({target: 0});
            spring.setTarget(1);
            expect(spring._target).toBe(1);
        });

        test('can be called while running', () => {
            const spring = new SpringAnimation({initial: 0, target: 1});
            spring.start();
            spring.setTarget(2);
            expect(spring._target).toBe(2);
        });
    });

    // --- start ---

    describe('start', () => {
        test('creates a timeline and starts it', () => {
            const spring = new SpringAnimation({initial: 1, target: 0});
            spring.start();
            expect(spring._running).toBe(true);
            expect(spring._timeline).not.toBeNull();
            expect(spring._lastFrameTime).toBe(-1);
        });

        test('does nothing if already running', () => {
            const spring = new SpringAnimation({initial: 1, target: 0});
            spring.start();
            const timeline1 = spring._timeline;
            spring.start(); // second call should be no-op
            expect(spring._timeline).toBe(timeline1);
        });

        test('calls onComplete immediately when actor has no stage', () => {
            const onComplete = jest.fn();
            const actor = makeMockActor(false); // no stage
            const spring = new SpringAnimation({
                initial: 1,
                target: 0,
                actor,
                onComplete,
            });
            spring.start();
            expect(onComplete).toHaveBeenCalledTimes(1);
            expect(spring._running).toBe(false);
            expect(spring._timeline).toBeNull();
        });

        test('does not throw when actor has no stage and no onComplete', () => {
            const actor = makeMockActor(false);
            const spring = new SpringAnimation({
                initial: 1,
                target: 0,
                actor,
            });
            // should not throw
            spring.start();
            expect(spring._running).toBe(false);
        });

        test('passes actor to timeline params when actor exists', () => {
            const actor = makeMockActor(true);
            const spring = new SpringAnimation({
                initial: 1,
                target: 0,
                actor,
            });
            spring.start();
            expect(spring._timeline).not.toBeNull();
            expect(spring._running).toBe(true);
        });

        test('creates timeline without actor when no actor', () => {
            const spring = new SpringAnimation({initial: 1, target: 0});
            spring.start();
            expect(spring._timeline).not.toBeNull();
            expect(spring._running).toBe(true);
        });

        test('connects new-frame and completed signals', () => {
            const spring = new SpringAnimation({initial: 1, target: 0});
            spring.start();
            expect(spring._newFrameId).toBeTruthy();
            expect(spring._completedId).toBeTruthy();
        });
    });

    // --- _step ---

    describe('_step', () => {
        test('does nothing when not running', () => {
            const onUpdate = jest.fn();
            const spring = new SpringAnimation({initial: 1, target: 0, onUpdate});
            // _running is false, _step should bail out
            spring._step();
            expect(onUpdate).not.toHaveBeenCalled();
        });

        test('first frame records time and emits initial value', () => {
            const onUpdate = jest.fn();
            const spring = new SpringAnimation({initial: 0.5, target: 0, onUpdate});
            spring.start();
            // _lastFrameTime is -1 at start, simulate first new-frame
            spring._step();
            expect(onUpdate).toHaveBeenCalledWith(0.5);
            expect(spring._lastFrameTime).toBe(monotonicTime);
        });

        test('first frame without onUpdate does not throw', () => {
            const spring = new SpringAnimation({initial: 0.5, target: 0});
            spring.start();
            spring._step(); // should not throw
            expect(spring._lastFrameTime).toBe(monotonicTime);
        });

        test('second frame performs Euler integration', () => {
            const onUpdate = jest.fn();
            const spring = new SpringAnimation({
                initial: 1,
                target: 0,
                stiffness: 200,
                damping: 20,
                mass: 1,
                onUpdate,
            });
            spring.start();

            // First frame: record time
            spring._step();
            expect(onUpdate).toHaveBeenCalledWith(1);
            onUpdate.mockClear();

            // Advance by 16ms (16000 microseconds, ~60fps)
            advanceTime(16000);

            // Second frame: should integrate
            spring._step();
            expect(onUpdate).toHaveBeenCalledTimes(1);
            const newPos = onUpdate.mock.calls[0][0];
            // With displacement=1, acceleration = (-200*1 - 20*0)/1 = -200
            // velocity = 0 + (-200)*0.016 = -3.2
            // position = 1 + (-3.2)*0.016 = 1 - 0.0512 = 0.9488
            expect(newPos).toBeCloseTo(0.9488, 3);
        });

        test('clamps dt to 0.05 for large time gaps', () => {
            const onUpdate = jest.fn();
            const spring = new SpringAnimation({
                initial: 1,
                target: 0,
                stiffness: 200,
                damping: 20,
                mass: 1,
                onUpdate,
            });
            spring.start();

            // First frame
            spring._step();
            onUpdate.mockClear();

            // Advance by 200ms (200000 microseconds) - should be clamped to 50ms
            advanceTime(200000);

            spring._step();
            const posWithClamp = onUpdate.mock.calls[0][0];

            // Reset and try with exactly 50ms
            onUpdate.mockClear();
            const spring2 = new SpringAnimation({
                initial: 1,
                target: 0,
                stiffness: 200,
                damping: 20,
                mass: 1,
                onUpdate,
            });
            resetMonotonicTime(5000000);
            spring2.start();
            spring2._step(); // first frame
            onUpdate.mockClear();
            advanceTime(50000); // exactly 50ms = 50000us
            spring2._step();
            const posWithout = onUpdate.mock.calls[0][0];

            // Both should give same result since 200ms is clamped to 50ms
            expect(posWithClamp).toBeCloseTo(posWithout, 10);
        });

        test('returns early when dt <= 0', () => {
            const onUpdate = jest.fn();
            const spring = new SpringAnimation({
                initial: 1,
                target: 0,
                onUpdate,
            });
            spring.start();
            spring._step(); // first frame
            onUpdate.mockClear();

            // Don't advance time (dt = 0)
            spring._step();
            expect(onUpdate).not.toHaveBeenCalled();
        });

        test('settles when displacement and velocity are below threshold', () => {
            const onUpdate = jest.fn();
            const onComplete = jest.fn();
            const spring = new SpringAnimation({
                initial: 0.0001, // very close to target
                target: 0,
                stiffness: 200,
                damping: 200, // high damping to prevent oscillation
                mass: 1,
                onUpdate,
                onComplete,
            });
            spring.start();

            // First frame
            spring._step();
            onUpdate.mockClear();

            // The displacement is 0.0001 which is < positionThreshold (0.0005)
            // but velocity is 0 which is < velocityThreshold
            // So after first integration step with tiny displacement, it may settle
            advanceTime(16000);
            spring._step();

            // After one step with such small displacement, the velocity will be tiny
            // displacement = 0.0001, acceleration = (-200 * 0.0001 - 200 * 0) / 1 = -0.02
            // velocity = 0 + (-0.02 * 0.016) = -0.00032
            // position = 0.0001 + (-0.00032 * 0.016) = 0.00999488
            // displacement = 0.00999488 which is > threshold
            // Let's run many steps to settle
            for (let i = 0; i < 500; i++) {
                if (!spring._running)
                    break;
                advanceTime(16000);
                spring._step();
            }
            expect(spring._running).toBe(false);
            expect(onComplete).toHaveBeenCalled();
            expect(spring._position).toBe(0); // snapped to target
        });

        test('calls onUpdate each frame during integration', () => {
            const onUpdate = jest.fn();
            const spring = new SpringAnimation({
                initial: 1,
                target: 0,
                stiffness: 200,
                damping: 20,
                mass: 1,
                onUpdate,
            });
            spring.start();

            // First frame
            spring._step();
            onUpdate.mockClear();

            // Run 5 frames
            for (let i = 0; i < 5; i++) {
                advanceTime(16000);
                spring._step();
            }
            expect(onUpdate).toHaveBeenCalledTimes(5);
        });

        test('does not call onUpdate during integration when not set', () => {
            const spring = new SpringAnimation({
                initial: 1,
                target: 0,
                stiffness: 200,
                damping: 20,
                mass: 1,
            });
            spring.start();

            // First frame
            spring._step();

            // Normal frame - should not throw
            advanceTime(16000);
            spring._step();
        });
    });

    // --- _settle ---

    describe('_settle', () => {
        test('snaps position to target', () => {
            const spring = new SpringAnimation({initial: 0.5, target: 1});
            spring.start();
            spring._settle();
            expect(spring._position).toBe(1);
        });

        test('sets velocity to 0', () => {
            const spring = new SpringAnimation({initial: 0.5, target: 1});
            spring.start();
            spring._velocity = 5;
            spring._settle();
            expect(spring._velocity).toBe(0);
        });

        test('sets running to false', () => {
            const spring = new SpringAnimation({initial: 0.5, target: 1});
            spring.start();
            expect(spring._running).toBe(true);
            spring._settle();
            expect(spring._running).toBe(false);
        });

        test('calls onUpdate with target value', () => {
            const onUpdate = jest.fn();
            const spring = new SpringAnimation({initial: 0.5, target: 1, onUpdate});
            spring.start();
            spring._settle();
            expect(onUpdate).toHaveBeenCalledWith(1);
        });

        test('calls onComplete', () => {
            const onComplete = jest.fn();
            const spring = new SpringAnimation({initial: 0.5, target: 1, onComplete});
            spring.start();
            spring._settle();
            expect(onComplete).toHaveBeenCalledTimes(1);
        });

        test('cleans up timeline', () => {
            const spring = new SpringAnimation({initial: 0.5, target: 1});
            spring.start();
            expect(spring._timeline).not.toBeNull();
            spring._settle();
            expect(spring._timeline).toBeNull();
        });

        test('works without onUpdate or onComplete', () => {
            const spring = new SpringAnimation({initial: 0.5, target: 1});
            spring.start();
            // should not throw
            spring._settle();
            expect(spring._position).toBe(1);
            expect(spring._running).toBe(false);
        });
    });

    // --- stop ---

    describe('stop', () => {
        test('sets running to false', () => {
            const spring = new SpringAnimation({initial: 1, target: 0});
            spring.start();
            expect(spring._running).toBe(true);
            spring.stop();
            expect(spring._running).toBe(false);
        });

        test('cleans up timeline', () => {
            const spring = new SpringAnimation({initial: 1, target: 0});
            spring.start();
            expect(spring._timeline).not.toBeNull();
            spring.stop();
            expect(spring._timeline).toBeNull();
        });

        test('does not call onComplete', () => {
            const onComplete = jest.fn();
            const spring = new SpringAnimation({initial: 1, target: 0, onComplete});
            spring.start();
            spring.stop();
            expect(onComplete).not.toHaveBeenCalled();
        });

        test('safe to call when not running', () => {
            const spring = new SpringAnimation({});
            // should not throw
            spring.stop();
            expect(spring._running).toBe(false);
        });
    });

    // --- _cleanupTimeline ---

    describe('_cleanupTimeline', () => {
        test('disconnects signal handlers', () => {
            const spring = new SpringAnimation({initial: 1, target: 0});
            spring.start();
            const timeline = spring._timeline;
            const disconnectSpy = jest.spyOn(timeline, 'disconnect');
            spring._cleanupTimeline();
            expect(disconnectSpy).toHaveBeenCalledTimes(2);
        });

        test('stops the timeline', () => {
            const spring = new SpringAnimation({initial: 1, target: 0});
            spring.start();
            const timeline = spring._timeline;
            const stopSpy = jest.spyOn(timeline, 'stop');
            spring._cleanupTimeline();
            expect(stopSpy).toHaveBeenCalledTimes(1);
        });

        test('nullifies the timeline reference', () => {
            const spring = new SpringAnimation({initial: 1, target: 0});
            spring.start();
            spring._cleanupTimeline();
            expect(spring._timeline).toBeNull();
        });

        test('does nothing when timeline is null', () => {
            const spring = new SpringAnimation({});
            // should not throw when no timeline
            spring._cleanupTimeline();
            expect(spring._timeline).toBeNull();
        });

        test('handles case where newFrameId is 0', () => {
            const spring = new SpringAnimation({initial: 1, target: 0});
            spring.start();
            spring._newFrameId = 0;
            // should still work
            spring._cleanupTimeline();
            expect(spring._timeline).toBeNull();
        });

        test('handles case where completedId is 0', () => {
            const spring = new SpringAnimation({initial: 1, target: 0});
            spring.start();
            spring._completedId = 0;
            spring._cleanupTimeline();
            expect(spring._timeline).toBeNull();
        });

        test('sets signal IDs to 0 after disconnecting', () => {
            const spring = new SpringAnimation({initial: 1, target: 0});
            spring.start();
            spring._cleanupTimeline();
            expect(spring._newFrameId).toBe(0);
            expect(spring._completedId).toBe(0);
        });
    });

    // --- destroy ---

    describe('destroy', () => {
        test('stops the animation', () => {
            const spring = new SpringAnimation({initial: 1, target: 0});
            spring.start();
            spring.destroy();
            expect(spring._running).toBe(false);
            expect(spring._timeline).toBeNull();
        });

        test('nullifies callbacks', () => {
            const onUpdate = jest.fn();
            const onComplete = jest.fn();
            const spring = new SpringAnimation({
                initial: 1,
                target: 0,
                onUpdate,
                onComplete,
            });
            spring.start();
            spring.destroy();
            expect(spring._onUpdate).toBeNull();
            expect(spring._onComplete).toBeNull();
        });

        test('safe to call multiple times', () => {
            const spring = new SpringAnimation({initial: 1, target: 0});
            spring.start();
            spring.destroy();
            spring.destroy(); // should not throw
            expect(spring._running).toBe(false);
        });

        test('safe to call when never started', () => {
            const spring = new SpringAnimation({});
            spring.destroy();
            expect(spring._running).toBe(false);
            expect(spring._onUpdate).toBeNull();
            expect(spring._onComplete).toBeNull();
        });
    });

    // --- Signal-driven behavior: new-frame and completed ---

    describe('signal-driven behavior', () => {
        test('new-frame signal triggers _step', () => {
            const onUpdate = jest.fn();
            const spring = new SpringAnimation({
                initial: 1,
                target: 0,
                onUpdate,
            });
            spring.start();

            // Emit the 'new-frame' signal on the timeline
            spring._timeline.emit('new-frame', 0);

            // The first _step call should record time and call onUpdate
            expect(onUpdate).toHaveBeenCalledWith(1);
        });

        test('completed signal triggers _settle', () => {
            const onComplete = jest.fn();
            const onUpdate = jest.fn();
            const spring = new SpringAnimation({
                initial: 1,
                target: 0,
                onUpdate,
                onComplete,
            });
            spring.start();

            // Emit the 'completed' signal (timeline max duration reached)
            spring._timeline.emit('completed');

            expect(spring._running).toBe(false);
            expect(spring._position).toBe(0); // snapped to target
            expect(onComplete).toHaveBeenCalledTimes(1);
            expect(onUpdate).toHaveBeenCalledWith(0); // settled value
        });
    });

    // --- Integration test: full spring simulation ---

    describe('full simulation', () => {
        test('spring with high damping settles quickly', () => {
            const updates = [];
            const onUpdate = jest.fn(val => updates.push(val));
            const onComplete = jest.fn();

            const spring = new SpringAnimation({
                initial: 1,
                target: 0,
                stiffness: 200,
                damping: 100, // critically damped
                mass: 1,
                onUpdate,
                onComplete,
            });

            resetMonotonicTime(0);
            spring.start();

            // Simulate frames at ~60fps for up to 5 seconds
            for (let i = 0; i < 300; i++) {
                if (!spring.running)
                    break;
                advanceTime(16000);
                spring._step();
            }

            expect(spring.running).toBe(false);
            expect(spring.position).toBe(0);
            expect(onComplete).toHaveBeenCalledTimes(1);
            expect(updates.length).toBeGreaterThan(2);
        });

        test('spring oscillates with low damping', () => {
            const updates = [];
            const onUpdate = jest.fn(val => updates.push(val));

            const spring = new SpringAnimation({
                initial: 1,
                target: 0,
                stiffness: 200,
                damping: 5, // underdamped
                mass: 1,
                onUpdate,
            });

            resetMonotonicTime(0);
            spring.start();

            // Run 50 frames
            for (let i = 0; i < 50; i++) {
                advanceTime(16000);
                spring._step();
            }

            // With low damping, the position should cross below 0 (overshoot)
            const hasNegative = updates.some(v => v < 0);
            expect(hasNegative).toBe(true);
        });

        test('setTarget mid-animation changes rest point', () => {
            const onUpdate = jest.fn();
            const onComplete = jest.fn();

            const spring = new SpringAnimation({
                initial: 0,
                target: 1,
                stiffness: 200,
                damping: 100,
                mass: 1,
                onUpdate,
                onComplete,
            });

            resetMonotonicTime(0);
            spring.start();

            // Run 10 frames towards target=1
            for (let i = 0; i < 10; i++) {
                advanceTime(16000);
                spring._step();
            }

            // Change target mid-animation
            spring.setTarget(2);

            // Run until settled
            for (let i = 0; i < 500; i++) {
                if (!spring.running)
                    break;
                advanceTime(16000);
                spring._step();
            }

            expect(spring.running).toBe(false);
            expect(spring.position).toBe(2); // settled at new target
        });

        test('mass affects spring behavior', () => {
            const updates1 = [];
            const updates2 = [];

            // Light mass
            const spring1 = new SpringAnimation({
                initial: 1, target: 0,
                stiffness: 200, damping: 20, mass: 0.5,
                onUpdate: v => updates1.push(v),
            });

            // Heavy mass
            const spring2 = new SpringAnimation({
                initial: 1, target: 0,
                stiffness: 200, damping: 20, mass: 5,
                onUpdate: v => updates2.push(v),
            });

            resetMonotonicTime(0);
            spring1.start();
            spring1._step(); // first frame

            resetMonotonicTime(0);
            spring2.start();
            spring2._step(); // first frame

            // Run 1 frame for each
            advanceTime(16000);
            resetMonotonicTime(16000);

            // For spring1
            spring1._lastFrameTime = 0;
            GLib.get_monotonic_time = () => 16000;
            spring1._step();

            // For spring2
            spring2._lastFrameTime = 0;
            spring2._step();

            // Light mass should move more than heavy mass in same time
            const pos1 = updates1[updates1.length - 1];
            const pos2 = updates2[updates2.length - 1];
            // Both start at 1, moving toward 0 -- lighter mass moves faster
            expect(pos1).toBeLessThan(pos2);
        });
    });

    // --- Edge cases ---

    describe('edge cases', () => {
        test('initial equals target does not need settling', () => {
            const onUpdate = jest.fn();
            const onComplete = jest.fn();
            const spring = new SpringAnimation({
                initial: 0,
                target: 0,
                onUpdate,
                onComplete,
            });
            spring.start();

            // First frame: displacement is 0, velocity is 0 -- within threshold
            spring._step(); // records time and emits initial
            onUpdate.mockClear();

            advanceTime(16000);
            spring._step(); // dt > 0, displacement=0, velocity=0 -> settle

            expect(spring._running).toBe(false);
            expect(onComplete).toHaveBeenCalled();
        });

        test('negative target values work', () => {
            const onUpdate = jest.fn();
            const spring = new SpringAnimation({
                initial: 0,
                target: -1,
                stiffness: 200,
                damping: 20,
                mass: 1,
                onUpdate,
            });
            spring.start();

            // First frame
            spring._step();
            onUpdate.mockClear();

            // Second frame
            advanceTime(16000);
            spring._step();

            // Position should move towards -1
            const pos = onUpdate.mock.calls[0][0];
            expect(pos).toBeLessThan(0);
        });

        test('very high stiffness produces fast movement', () => {
            const onUpdate = jest.fn();
            const spring = new SpringAnimation({
                initial: 1,
                target: 0,
                stiffness: 10000,
                damping: 100,
                mass: 1,
                onUpdate,
            });
            spring.start();
            spring._step();
            onUpdate.mockClear();

            advanceTime(16000);
            spring._step();

            const pos = onUpdate.mock.calls[0][0];
            // High stiffness should move position significantly
            expect(pos).toBeLessThan(0.9);
        });

        test('stop then start again works', () => {
            const spring = new SpringAnimation({initial: 1, target: 0});
            spring.start();
            expect(spring.running).toBe(true);
            spring.stop();
            expect(spring.running).toBe(false);
            // Can restart
            spring.start();
            expect(spring.running).toBe(true);
            spring.stop();
        });
    });
});

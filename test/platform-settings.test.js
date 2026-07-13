// Proof of concept: unit testing with platform abstraction layer.
// This test demonstrates the pattern — import from platform/settings.js,
// Jest auto-resolves to test/__mocks__/platform/settings.js.

import {jest} from '@jest/globals';
import * as Settings from '../platform/settings.js';

describe('Platform Settings Mock', () => {
    beforeEach(() => {
        Settings._reset();
    });

    test('get returns default values', () => {
        expect(Settings.get('spring-stiffness')).toBe(200);
        expect(Settings.get('spring-damping')).toBe(20);
        expect(Settings.get('magnification-spread')).toBe(3);
        expect(Settings.get('dock-position')).toBe(2);
    });

    test('set overrides default', () => {
        Settings.set('spring-stiffness', 100);
        expect(Settings.get('spring-stiffness')).toBe(100);
    });

    test('set fires connected listeners', () => {
        const callback = jest.fn();
        Settings.connect('spring-stiffness', callback);
        Settings.set('spring-stiffness', 100);
        expect(callback).toHaveBeenCalledTimes(1);
    });

    test('disconnect stops listener', () => {
        const callback = jest.fn();
        const id = Settings.connect('spring-stiffness', callback);
        Settings.disconnect(id);
        Settings.set('spring-stiffness', 100);
        expect(callback).not.toHaveBeenCalled();
    });

    test('_setMany sets multiple values', () => {
        Settings._setMany({
            'spring-stiffness': 50,
            'spring-damping': 5,
            'dock-position': 0,
        });
        expect(Settings.get('spring-stiffness')).toBe(50);
        expect(Settings.get('spring-damping')).toBe(5);
        expect(Settings.get('dock-position')).toBe(0);
    });

    test('_reset restores defaults', () => {
        Settings.set('spring-stiffness', 50);
        Settings._reset();
        expect(Settings.get('spring-stiffness')).toBe(200);
    });

    test('unknown key returns undefined', () => {
        expect(Settings.get('nonexistent-key')).toBeUndefined();
    });
});

describe('Simulated extension logic using Settings', () => {
    beforeEach(() => {
        Settings._reset();
    });

    // This is what real extension code would look like with the platform layer:
    function computeMagnificationSpread() {
        const spread = Settings.get('magnification-spread');
        const iconSize = Settings.get('dash-max-icon-size');
        return iconSize * spread;
    }

    function shouldEnableMagnification() {
        return Settings.get('icon-magnification') &&
               Settings.get('icon-magnification-factor') > 1.0;
    }

    function getSpringParams() {
        return {
            stiffness: Settings.get('spring-stiffness'),
            damping: Settings.get('spring-damping'),
            overshootClamp: Settings.get('spring-overshoot-clamp'),
        };
    }

    test('magnification spread uses icon size and spread count', () => {
        expect(computeMagnificationSpread()).toBe(48 * 3); // 144
        Settings.set('magnification-spread', 5);
        expect(computeMagnificationSpread()).toBe(48 * 5); // 240
    });

    test('magnification enabled when setting true and factor > 1', () => {
        expect(shouldEnableMagnification()).toBe(true);
    });

    test('magnification disabled when factor is 1.0', () => {
        Settings.set('icon-magnification-factor', 1.0);
        expect(shouldEnableMagnification()).toBe(false);
    });

    test('magnification disabled when setting false', () => {
        Settings.set('icon-magnification', false);
        expect(shouldEnableMagnification()).toBe(false);
    });

    test('spring params from settings', () => {
        const params = getSpringParams();
        expect(params.stiffness).toBe(200);
        expect(params.damping).toBe(20);
        expect(params.overshootClamp).toBe(1.15);
    });

    test('spring params update when settings change', () => {
        Settings._setMany({
            'spring-stiffness': 100,
            'spring-damping': 10,
            'spring-overshoot-clamp': 1.3,
        });
        const params = getSpringParams();
        expect(params.stiffness).toBe(100);
        expect(params.damping).toBe(10);
        expect(params.overshootClamp).toBe(1.3);
    });
});

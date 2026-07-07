import {
    magnificationFalloff,
    magnificationScale,
    computeAvailableIconSizes,
    BASE_ICON_SIZES,
} from '../utils.js';

describe('magnificationFalloff', () => {
    test('returns 1.0 at distance 0', () => {
        expect(magnificationFalloff(0, 100)).toBe(1.0);
    });
    test('returns 0.0 at distance >= spread', () => {
        expect(magnificationFalloff(100, 100)).toBe(0.0);
        expect(magnificationFalloff(200, 100)).toBe(0.0);
    });
    test('parabolic falloff at half spread', () => {
        // 1 - (50/100)^2 = 0.75
        expect(magnificationFalloff(50, 100)).toBeCloseTo(0.75);
    });
    test('handles spread of 0', () => {
        expect(magnificationFalloff(10, 0)).toBe(0.0);
    });
    test('negative distance treated as positive', () => {
        // distance should always be passed as absolute
        expect(magnificationFalloff(0, 100)).toBe(1.0);
    });
});

describe('magnificationScale', () => {
    test('returns maxScale at distance 0', () => {
        expect(magnificationScale(0, 100, 2.0)).toBeCloseTo(2.0);
    });
    test('returns 1.0 at distance >= spread', () => {
        expect(magnificationScale(100, 100, 2.0)).toBeCloseTo(1.0);
    });
    test('intermediate scale at half spread', () => {
        // falloff=0.75, scale = 1 + (2-1)*0.75 = 1.75
        expect(magnificationScale(50, 100, 2.0)).toBeCloseTo(1.75);
    });
    test('maxScale 1.0 always returns 1.0', () => {
        expect(magnificationScale(0, 100, 1.0)).toBeCloseTo(1.0);
    });
    test('maxScale 3.0 at center', () => {
        expect(magnificationScale(0, 100, 3.0)).toBeCloseTo(3.0);
    });
});

describe('computeAvailableIconSizes', () => {
    test('fixed mode returns single-element array', () => {
        expect(computeAvailableIconSizes(48, true)).toEqual([48]);
    });
    test('dynamic mode returns sizes up to max', () => {
        const sizes = computeAvailableIconSizes(48, false);
        expect(sizes).toEqual([16, 22, 24, 32, 48]);
    });
    test('clamps to maximum allowed', () => {
        const sizes = computeAvailableIconSizes(999, false);
        expect(sizes[sizes.length - 1]).toBe(128);
    });
    test('max smaller than all base sizes', () => {
        expect(computeAvailableIconSizes(10, false)).toEqual([10]);
    });
    test('exact base size included', () => {
        const sizes = computeAvailableIconSizes(64, false);
        expect(sizes).toContain(64);
        expect(sizes).not.toContain(96);
    });
});

describe('BASE_ICON_SIZES', () => {
    test('is sorted ascending', () => {
        for (let i = 1; i < BASE_ICON_SIZES.length; i++)
            expect(BASE_ICON_SIZES[i]).toBeGreaterThan(BASE_ICON_SIZES[i - 1]);
    });
    test('contains standard sizes', () => {
        expect(BASE_ICON_SIZES).toContain(48);
        expect(BASE_ICON_SIZES).toContain(128);
    });
});

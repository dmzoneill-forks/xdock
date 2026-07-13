import {jest} from '@jest/globals';
import * as Settings from '../platform/settings.js';
import {St} from '../dependencies/gi.js';

// GJS globals not available in Node.js
globalThis.logError = globalThis.logError ?? (() => {});
globalThis.log = globalThis.log ?? (() => {});

beforeEach(() => {
    Settings._reset();
});

// ---------------------------------------------------------------------------
// Reflection visibility logic
// ---------------------------------------------------------------------------
// Extracted from DockDash._updateReflection: visibility depends on
// dock-style === 1 (SHELF) AND shelf-reflection being true.
function computeReflectionVisible() {
    const dockStyle = Settings.get('dock-style');
    const shelfReflection = Settings.get('shelf-reflection');
    return dockStyle === 1 && shelfReflection;
}

describe('reflection visibility', () => {
    test('hidden when dock-style is FLAT (0)', () => {
        Settings.set('dock-style', 0);
        Settings.set('shelf-reflection', true);
        expect(computeReflectionVisible()).toBe(false);
    });

    test('hidden when shelf-reflection is false', () => {
        Settings.set('dock-style', 1);
        Settings.set('shelf-reflection', false);
        expect(computeReflectionVisible()).toBe(false);
    });

    test('visible when dock-style is SHELF (1) and shelf-reflection is true', () => {
        Settings.set('dock-style', 1);
        Settings.set('shelf-reflection', true);
        expect(computeReflectionVisible()).toBe(true);
    });

    test('hidden when both are off', () => {
        Settings.set('dock-style', 0);
        Settings.set('shelf-reflection', false);
        expect(computeReflectionVisible()).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// Reflection style string
// ---------------------------------------------------------------------------
// Extracted from DockDash._updateReflection: the CSS style string uses
// the shelf-reflection-opacity and an orientation-dependent gradient direction.
function buildReflectionStyle(isHorizontal) {
    const op = Settings.get('shelf-reflection-opacity');
    const dir = isHorizontal ? 'to bottom' : 'to right';
    return (
        `background-image: linear-gradient(${dir}, ` +
        `rgba(255,255,255,${op}) 0%, transparent 100%); ` +
        'border-radius: 0 0 12px 12px;'
    );
}

describe('reflection style string', () => {
    test('horizontal uses "to bottom" direction', () => {
        Settings.set('shelf-reflection-opacity', 0.5);
        const style = buildReflectionStyle(true);
        expect(style).toContain('to bottom');
        expect(style).toContain('rgba(255,255,255,0.5)');
    });

    test('vertical uses "to right" direction', () => {
        Settings.set('shelf-reflection-opacity', 0.3);
        const style = buildReflectionStyle(false);
        expect(style).toContain('to right');
        expect(style).toContain('rgba(255,255,255,0.3)');
    });

    test('opacity value is interpolated correctly', () => {
        Settings.set('shelf-reflection-opacity', 0.0);
        const style = buildReflectionStyle(true);
        expect(style).toContain('rgba(255,255,255,0)');
    });

    test('style always includes border-radius', () => {
        Settings.set('shelf-reflection-opacity', 0.5);
        const style = buildReflectionStyle(true);
        expect(style).toContain('border-radius: 0 0 12px 12px');
    });
});

// ---------------------------------------------------------------------------
// Magnification pivot by dock position
// ---------------------------------------------------------------------------
// Extracted from DockDash._getMagnificationPivot
function getMagnificationPivot(position) {
    switch (position) {
    case St.Side.BOTTOM:
        return [0.5, 1.0];
    case St.Side.TOP:
        return [0.5, 0.0];
    case St.Side.LEFT:
        return [0.0, 0.5];
    case St.Side.RIGHT:
        return [1.0, 0.5];
    default:
        return [0.5, 1.0];
    }
}

describe('magnification pivot', () => {
    test('BOTTOM pivot is center-bottom (0.5, 1.0)', () => {
        expect(getMagnificationPivot(St.Side.BOTTOM)).toEqual([0.5, 1.0]);
    });

    test('TOP pivot is center-top (0.5, 0.0)', () => {
        expect(getMagnificationPivot(St.Side.TOP)).toEqual([0.5, 0.0]);
    });

    test('LEFT pivot is left-center (0.0, 0.5)', () => {
        expect(getMagnificationPivot(St.Side.LEFT)).toEqual([0.0, 0.5]);
    });

    test('RIGHT pivot is right-center (1.0, 0.5)', () => {
        expect(getMagnificationPivot(St.Side.RIGHT)).toEqual([1.0, 0.5]);
    });

    test('unknown position defaults to BOTTOM', () => {
        expect(getMagnificationPivot(999)).toEqual([0.5, 1.0]);
    });
});

// ---------------------------------------------------------------------------
// maxScale clamping
// ---------------------------------------------------------------------------
// Extracted from _onMagnificationMotion: maxScale is clamped to [1.0, 3.0]
function clampMaxScale(factor) {
    return Math.max(1.0, Math.min(3.0, factor));
}

describe('maxScale clamping', () => {
    test('factor within range is unchanged', () => {
        expect(clampMaxScale(2.0)).toBe(2.0);
    });

    test('factor below 1.0 is clamped to 1.0', () => {
        expect(clampMaxScale(0.5)).toBe(1.0);
    });

    test('factor above 3.0 is clamped to 3.0', () => {
        expect(clampMaxScale(5.0)).toBe(3.0);
    });

    test('boundary value 1.0', () => {
        expect(clampMaxScale(1.0)).toBe(1.0);
    });

    test('boundary value 3.0', () => {
        expect(clampMaxScale(3.0)).toBe(3.0);
    });

    test('negative factor is clamped to 1.0', () => {
        expect(clampMaxScale(-1.0)).toBe(1.0);
    });
});

// ---------------------------------------------------------------------------
// Spread computation
// ---------------------------------------------------------------------------
// Extracted from _onMagnificationMotion: spread = iconSize * magnificationSpread
function computeSpread(iconSize) {
    const spreadIcons = Settings.get('magnification-spread');
    return iconSize * spreadIcons;
}

describe('spread computation', () => {
    test('default spread multiplied by icon size', () => {
        Settings.set('magnification-spread', 3);
        expect(computeSpread(48)).toBe(144);
    });

    test('spread of 1 equals icon size', () => {
        Settings.set('magnification-spread', 1);
        expect(computeSpread(64)).toBe(64);
    });

    test('fractional spread', () => {
        Settings.set('magnification-spread', 2.5);
        expect(computeSpread(48)).toBe(120);
    });

    test('spread of 0 means no magnification zone', () => {
        Settings.set('magnification-spread', 0);
        expect(computeSpread(48)).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// Toggle magnification dispatch
// ---------------------------------------------------------------------------
// Extracted from DockDash._toggleMagnification: dispatches to enable or
// disable based on the icon-magnification setting.
describe('toggle magnification dispatch', () => {
    test('calls enable when icon-magnification is true', () => {
        Settings.set('icon-magnification', true);
        const enable = jest.fn();
        const disable = jest.fn();

        if (Settings.get('icon-magnification'))
            enable();
        else
            disable();

        expect(enable).toHaveBeenCalled();
        expect(disable).not.toHaveBeenCalled();
    });

    test('calls disable when icon-magnification is false', () => {
        Settings.set('icon-magnification', false);
        const enable = jest.fn();
        const disable = jest.fn();

        if (Settings.get('icon-magnification'))
            enable();
        else
            disable();

        expect(disable).toHaveBeenCalled();
        expect(enable).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// Toggle preview hover dispatch
// ---------------------------------------------------------------------------
describe('toggle preview hover dispatch', () => {
    test('enables hover when show-previews-hover is true', () => {
        Settings.set('show-previews-hover', true);
        const enable = jest.fn();
        const disable = jest.fn();

        if (Settings.get('show-previews-hover'))
            enable();
        else
            disable();

        expect(enable).toHaveBeenCalled();
        expect(disable).not.toHaveBeenCalled();
    });

    test('disables hover when show-previews-hover is false', () => {
        Settings.set('show-previews-hover', false);
        const enable = jest.fn();
        const disable = jest.fn();

        if (Settings.get('show-previews-hover'))
            enable();
        else
            disable();

        expect(disable).toHaveBeenCalled();
        expect(enable).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// Magnification offset computation
// ---------------------------------------------------------------------------
// Extracted from _onMagnificationMotion: computes per-child offsets so
// that magnified icons expand symmetrically from the center.
function computeMagnificationOffsets(childExtras) {
    const totalExtra = childExtras.reduce((sum, extra) => sum + extra, 0);
    const centerShift = totalExtra / 2;

    let accumulated = 0;
    const offsets = childExtras.map(extra => {
        const o = accumulated - centerShift + extra / 2;
        accumulated += extra;
        return o;
    });

    return {offsets, totalExtra};
}

describe('magnification offset computation', () => {
    test('single element with no extra has zero offset', () => {
        const {offsets, totalExtra} = computeMagnificationOffsets([0]);
        expect(totalExtra).toBe(0);
        expect(offsets).toEqual([0]);
    });

    test('single magnified element is centered', () => {
        const {offsets, totalExtra} = computeMagnificationOffsets([20]);
        expect(totalExtra).toBe(20);
        // offset = 0 - 10 + 10 = 0 (centered)
        expect(offsets[0]).toBeCloseTo(0);
    });

    test('two elements expand symmetrically', () => {
        const {offsets} = computeMagnificationOffsets([10, 10]);
        // Total = 20, centerShift = 10
        // [0]: 0 - 10 + 5 = -5
        // [1]: 10 - 10 + 5 = 5
        expect(offsets[0]).toBeCloseTo(-5);
        expect(offsets[1]).toBeCloseTo(5);
    });

    test('three elements: center one has zero offset', () => {
        const {offsets} = computeMagnificationOffsets([10, 20, 10]);
        // Total = 40, centerShift = 20
        // [0]: 0 - 20 + 5 = -15
        // [1]: 10 - 20 + 10 = 0
        // [2]: 30 - 20 + 5 = 15
        expect(offsets[0]).toBeCloseTo(-15);
        expect(offsets[1]).toBeCloseTo(0);
        expect(offsets[2]).toBeCloseTo(15);
    });

    test('no magnification means all offsets are zero', () => {
        const {offsets, totalExtra} = computeMagnificationOffsets([0, 0, 0]);
        expect(totalExtra).toBe(0);
        expect(offsets).toEqual([0, 0, 0]);
    });

    test('asymmetric magnification shifts center', () => {
        const {offsets} = computeMagnificationOffsets([30, 0, 0]);
        // Total = 30, centerShift = 15
        // [0]: 0 - 15 + 15 = 0
        // [1]: 30 - 15 + 0 = 15
        // [2]: 30 - 15 + 0 = 15
        expect(offsets[0]).toBeCloseTo(0);
        expect(offsets[1]).toBeCloseTo(15);
        expect(offsets[2]).toBeCloseTo(15);
    });
});

// ---------------------------------------------------------------------------
// Background scale computation
// ---------------------------------------------------------------------------
// Extracted from _onMagnificationMotion: the background is scaled to
// accommodate the total extra width from magnified icons.
function computeBackgroundScale(bgWidth, totalExtra) {
    return (bgWidth + totalExtra) / bgWidth;
}

describe('background scale computation', () => {
    test('no extra means scale of 1.0', () => {
        expect(computeBackgroundScale(400, 0)).toBe(1.0);
    });

    test('extra equal to width doubles the scale', () => {
        expect(computeBackgroundScale(400, 400)).toBe(2.0);
    });

    test('partial extra scales proportionally', () => {
        expect(computeBackgroundScale(400, 100)).toBe(1.25);
    });

    test('small background with large extra', () => {
        expect(computeBackgroundScale(100, 300)).toBe(4.0);
    });
});

// ---------------------------------------------------------------------------
// Icon size initialization (available sizes)
// ---------------------------------------------------------------------------
// Mirrors DockDash._initializeIconSize logic
const baseIconSizes = [16, 22, 24, 32, 48, 64, 96, 128];

function initializeIconSizes(maxSize, iconSizeFixed) {
    const maxAllowed = baseIconSizes[baseIconSizes.length - 1];
    maxSize = Math.min(maxSize, maxAllowed);

    if (iconSizeFixed) {
        return [maxSize];
    } else {
        const sizes = baseIconSizes.filter(val => val < maxSize);
        sizes.push(maxSize);
        return sizes;
    }
}

describe('icon size initialization', () => {
    test('fixed mode returns single size', () => {
        expect(initializeIconSizes(48, true)).toEqual([48]);
    });

    test('dynamic mode returns sizes up to max', () => {
        expect(initializeIconSizes(48, false)).toEqual([16, 22, 24, 32, 48]);
    });

    test('max above largest base size is clamped', () => {
        const sizes = initializeIconSizes(256, false);
        expect(sizes[sizes.length - 1]).toBe(128);
    });

    test('max smaller than smallest base size', () => {
        expect(initializeIconSizes(10, false)).toEqual([10]);
    });

    test('exact base size includes that size', () => {
        const sizes = initializeIconSizes(64, false);
        expect(sizes).toContain(64);
        expect(sizes).not.toContain(96);
    });

    test('fixed mode with max above limit still clamps', () => {
        expect(initializeIconSizes(256, true)).toEqual([128]);
    });
});

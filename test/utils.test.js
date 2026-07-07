import {jest} from '@jest/globals';
import {
    ColorUtils, clamp, clampDouble, getPosition, getSecondaryPosition,
} from '../utils.js';
import {Clutter, St} from '../dependencies/gi.js';
import {Docking} from '../imports.js';

describe('clamp', () => {
    test('value within range is unchanged', () => {
        expect(clamp(5, 0, 10)).toBe(5);
    });
    test('value below min is clamped', () => {
        expect(clamp(-3, 0, 10)).toBe(0);
    });
    test('value above max is clamped', () => {
        expect(clamp(15, 0, 10)).toBe(10);
    });
    test('boundary values', () => {
        expect(clamp(0, 0, 10)).toBe(0);
        expect(clamp(10, 0, 10)).toBe(10);
    });
});

describe('clampDouble', () => {
    test('clamps to 0-1 range', () => {
        expect(clampDouble(-0.5)).toBe(0);
        expect(clampDouble(1.5)).toBe(1);
        expect(clampDouble(0.5)).toBe(0.5);
    });
});

describe('ColorUtils._decimalToHex', () => {
    test('converts with padding', () => {
        expect(ColorUtils._decimalToHex(255, 2)).toBe('ff');
        expect(ColorUtils._decimalToHex(0, 2)).toBe('00');
        expect(ColorUtils._decimalToHex(15, 2)).toBe('0f');
    });
});

describe('ColorUtils.ColorLuminance', () => {
    test('zero dlum returns same color', () => {
        expect(ColorUtils.ColorLuminance(128, 128, 128, 0)).toBe('#808080');
    });
    test('positive dlum brightens', () => {
        const result = ColorUtils.ColorLuminance(100, 100, 100, 0.5);
        expect(result).toBe('#969696');
    });
});

describe('ColorUtils.HSVtoRGB', () => {
    test('red (h=0, s=1, v=1)', () => {
        expect(ColorUtils.HSVtoRGB(0, 1, 1)).toEqual({r: 255, g: 0, b: 0});
    });
    test('black (v=0)', () => {
        expect(ColorUtils.HSVtoRGB(0, 0, 0)).toEqual({r: 0, g: 0, b: 0});
    });
    test('white (s=0, v=1)', () => {
        expect(ColorUtils.HSVtoRGB(0, 0, 1)).toEqual({r: 255, g: 255, b: 255});
    });
});

describe('ColorUtils.RGBtoHSV', () => {
    test('pure red', () => {
        const result = ColorUtils.RGBtoHSV(255, 0, 0);
        expect(result.h).toBeCloseTo(0);
        expect(result.s).toBeCloseTo(1);
        expect(result.v).toBeCloseTo(1);
    });
    test('black', () => {
        const result = ColorUtils.RGBtoHSV(0, 0, 0);
        expect(result.s).toBe(0);
        expect(result.v).toBe(0);
    });
    test('round-trip fidelity', () => {
        const hsv = ColorUtils.RGBtoHSV(120, 80, 200);
        const rgb = ColorUtils.HSVtoRGB(hsv);
        expect(rgb.r).toBeCloseTo(120, 0);
        expect(rgb.g).toBeCloseTo(80, 0);
        expect(rgb.b).toBeCloseTo(200, 0);
    });
});

describe('getPosition', () => {
    test('returns dock position in LTR mode', () => {
        Docking.DockManager.settings.dockPosition = St.Side.BOTTOM;
        Clutter.get_default_text_direction = () => Clutter.TextDirection.LTR;
        expect(getPosition()).toBe(St.Side.BOTTOM);
    });

    test('swaps LEFT/RIGHT in RTL mode', () => {
        Docking.DockManager.settings.dockPosition = St.Side.LEFT;
        Clutter.get_default_text_direction = () => Clutter.TextDirection.RTL;
        expect(getPosition()).toBe(St.Side.RIGHT);

        Docking.DockManager.settings.dockPosition = St.Side.RIGHT;
        expect(getPosition()).toBe(St.Side.LEFT);
    });
});

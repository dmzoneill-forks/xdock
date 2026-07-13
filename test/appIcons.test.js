import {jest} from '@jest/globals';
import * as Settings from '../platform/settings.js';

// ---------------------------------------------------------------------------
// Set up global.workspace_manager before importing appIcons (it runs
// module-level code that may reference `global`).
// ---------------------------------------------------------------------------
const mockActiveWorkspace = {index: () => 0};
globalThis.global = globalThis.global ?? {};
globalThis.global.workspace_manager = {
    get_active_workspace: () => mockActiveWorkspace,
    get_active_workspace_index: () => 0,
};
globalThis.global.display = {focus_window: null};
globalThis.global.stage = {};
globalThis.global.settings = {is_writable: () => true};
globalThis.global.get_current_time = () => 0;

// Import the functions under test
import {
    clickAction,
    scrollAction,
    isWindowUrgent,
    getInterestingWindows,
    resolveClickSettingsKey,
    computeHotkeyLabelStyle,
    computeTooltipMaxWidth,
} from '../appIcons.js';

beforeEach(() => {
    Settings._reset();
});

// ---------------------------------------------------------------------------
// isWindowUrgent
// ---------------------------------------------------------------------------
describe('isWindowUrgent', () => {
    test('returns true when window.urgent is true', () => {
        expect(isWindowUrgent({urgent: true, demandsAttention: false})).toBe(true);
    });

    test('returns true when window.demandsAttention is true', () => {
        expect(isWindowUrgent({urgent: false, demandsAttention: true})).toBe(true);
    });

    test('returns true when window._manualUrgency is true', () => {
        expect(isWindowUrgent({urgent: false, demandsAttention: false, _manualUrgency: true})).toBe(true);
    });

    test('returns false when no urgency flags are set', () => {
        expect(isWindowUrgent({urgent: false, demandsAttention: false})).toBeFalsy();
    });

    test('returns false for plain object with no flags', () => {
        expect(isWindowUrgent({})).toBeFalsy();
    });
});

// ---------------------------------------------------------------------------
// resolveClickSettingsKey
// ---------------------------------------------------------------------------
describe('resolveClickSettingsKey', () => {
    test('primary click without shift returns click-action', () => {
        expect(resolveClickSettingsKey(1, false)).toBe('click-action');
    });

    test('primary click with shift returns shift-click-action', () => {
        expect(resolveClickSettingsKey(1, true)).toBe('shift-click-action');
    });

    test('middle click without shift returns middle-click-action', () => {
        expect(resolveClickSettingsKey(2, false)).toBe('middle-click-action');
    });

    test('middle click with shift returns shift-middle-click-action', () => {
        expect(resolveClickSettingsKey(2, true)).toBe('shift-middle-click-action');
    });

    test('unknown button returns null', () => {
        expect(resolveClickSettingsKey(3, false)).toBeNull();
        expect(resolveClickSettingsKey(0, false)).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// computeHotkeyLabelStyle
// ---------------------------------------------------------------------------
describe('computeHotkeyLabelStyle', () => {
    test('basic calculation at scale factor 1', () => {
        const result = computeHotkeyLabelStyle(100, 1, 0.3, 48);
        // 0.3 * 100 = 30, max(12, 30) = 30, / 1 = 30
        expect(result.fontSize).toBe(30);
        // size = round(30 * 1.2) = 36
        expect(result.size).toBe(36);
        expect(result.style).toContain('font-size: 30px');
        expect(result.style).toContain('border-radius: 48px');
        expect(result.style).toContain('width: 36px');
        expect(result.style).toContain('height: 36px');
    });

    test('enforces minimum font size of 12', () => {
        // labelScale * natWidth = 0.1 * 10 = 1, max(12, 1) = 12
        const result = computeHotkeyLabelStyle(10, 1, 0.1, 16);
        expect(result.fontSize).toBe(12);
    });

    test('accounts for HiDPI scale factor', () => {
        // 0.3 * 100 = 30, max(12, 30) = 30, / 2 = 15
        const result = computeHotkeyLabelStyle(100, 2, 0.3, 48);
        expect(result.fontSize).toBe(15);
    });

    test('large label scale produces larger font', () => {
        // 0.5 * 200 = 100, max(12, 100) = 100, / 1 = 100
        const result = computeHotkeyLabelStyle(200, 1, 0.5, 64);
        expect(result.fontSize).toBe(100);
        expect(result.size).toBe(120);
    });

    test('zero label scale falls back to minimum', () => {
        // 0 * 100 = 0, max(12, 0) = 12
        const result = computeHotkeyLabelStyle(100, 1, 0, 48);
        expect(result.fontSize).toBe(12);
    });
});

// ---------------------------------------------------------------------------
// computeTooltipMaxWidth
// ---------------------------------------------------------------------------
describe('computeTooltipMaxWidth', () => {
    test('basic percentage calculation', () => {
        // 60% of 1920 = 1152, min(1152, 700) = 700
        expect(computeTooltipMaxWidth(1920, 60, 700)).toBe(700);
    });

    test('large monitor where percentage is smaller than px limit', () => {
        // 30% of 1920 = 576, min(576, 700) = 576
        expect(computeTooltipMaxWidth(1920, 30, 700)).toBe(576);
    });

    test('clamps percent to minimum 20', () => {
        // percent = max(20, min(100, 10)) = 20
        // 20% of 1000 = 200, min(200, 700) = 200
        expect(computeTooltipMaxWidth(1000, 10, 700)).toBe(200);
    });

    test('clamps percent to maximum 100', () => {
        // percent = max(20, min(100, 150)) = 100
        // 100% of 1000 = 1000, min(1000, 700) = 700
        expect(computeTooltipMaxWidth(1000, 150, 700)).toBe(700);
    });

    test('treats 0 percent as 60 (fallback)', () => {
        // 0 || 60 = 60, 60% of 2000 = 1200, min(1200, 800) = 800
        expect(computeTooltipMaxWidth(2000, 0, 800)).toBe(800);
    });

    test('treats undefined percent as 60 (fallback)', () => {
        // undefined || 60 = 60
        expect(computeTooltipMaxWidth(2000, undefined, 800)).toBe(800);
    });

    test('small px limit constrains result', () => {
        // 60% of 1920 = 1152, min(1152, 300) = 300
        expect(computeTooltipMaxWidth(1920, 60, 300)).toBe(300);
    });

    test('very large px limit lets percentage through', () => {
        // 50% of 1920 = 960, min(960, 9999) = 960
        expect(computeTooltipMaxWidth(1920, 50, 9999)).toBe(960);
    });
});

// ---------------------------------------------------------------------------
// getInterestingWindows
// ---------------------------------------------------------------------------
describe('getInterestingWindows', () => {
    function makeWindow({workspace = mockActiveWorkspace, monitor = 0, skipTaskbar = false,
        urgent = false, demandsAttention = false} = {}) {
        return {
            get_workspace: () => workspace,
            get_monitor: () => monitor,
            skipTaskbar,
            urgent,
            demandsAttention,
        };
    }

    test('filters out skipTaskbar windows', () => {
        Settings.set('isolate-workspaces', false);
        Settings.set('isolate-monitors', false);
        const w1 = makeWindow();
        const w2 = makeWindow({skipTaskbar: true});
        expect(getInterestingWindows([w1, w2], 0)).toEqual([w1]);
    });

    test('returns all non-skipTaskbar windows when isolation is off', () => {
        Settings.set('isolate-workspaces', false);
        Settings.set('isolate-monitors', false);
        const w1 = makeWindow();
        const w2 = makeWindow({monitor: 1});
        expect(getInterestingWindows([w1, w2], 0)).toEqual([w1, w2]);
    });

    test('workspace isolation filters windows on other workspaces', () => {
        Settings.set('isolate-workspaces', true);
        Settings.set('isolate-monitors', false);
        Settings.set('workspace-agnostic-urgent-windows', false);

        const otherWs = {index: () => 1};
        const w1 = makeWindow(); // on active workspace
        const w2 = makeWindow({workspace: otherWs}); // on different workspace
        const result = getInterestingWindows([w1, w2], 0);
        expect(result).toEqual([w1]);
    });

    test('workspace isolation keeps urgent windows from other workspaces when agnostic enabled', () => {
        Settings.set('isolate-workspaces', true);
        Settings.set('isolate-monitors', false);
        Settings.set('workspace-agnostic-urgent-windows', true);

        const otherWs = {index: () => 1};
        const w1 = makeWindow();
        const w2 = makeWindow({workspace: otherWs, urgent: true});
        const result = getInterestingWindows([w1, w2], 0);
        expect(result).toEqual([w1, w2]);
    });

    test('workspace isolation hides urgent windows from other workspaces when agnostic disabled', () => {
        Settings.set('isolate-workspaces', true);
        Settings.set('isolate-monitors', false);
        Settings.set('workspace-agnostic-urgent-windows', false);

        const otherWs = {index: () => 1};
        const w1 = makeWindow();
        const w2 = makeWindow({workspace: otherWs, urgent: true});
        const result = getInterestingWindows([w1, w2], 0);
        expect(result).toEqual([w1]);
    });

    test('monitor isolation filters windows on other monitors', () => {
        Settings.set('isolate-workspaces', false);
        Settings.set('isolate-monitors', true);
        const w1 = makeWindow({monitor: 0});
        const w2 = makeWindow({monitor: 1});
        expect(getInterestingWindows([w1, w2], 0)).toEqual([w1]);
    });

    test('monitor isolation is skipped when monitorIndex is negative', () => {
        Settings.set('isolate-workspaces', false);
        Settings.set('isolate-monitors', true);
        const w1 = makeWindow({monitor: 0});
        const w2 = makeWindow({monitor: 1});
        // monitorIndex -1 means "don't filter by monitor"
        expect(getInterestingWindows([w1, w2], -1)).toEqual([w1, w2]);
    });

    test('both workspace and monitor isolation combined', () => {
        Settings.set('isolate-workspaces', true);
        Settings.set('isolate-monitors', true);
        Settings.set('workspace-agnostic-urgent-windows', false);

        const otherWs = {index: () => 1};
        const w1 = makeWindow({monitor: 0}); // active ws, monitor 0
        const w2 = makeWindow({monitor: 1}); // active ws, monitor 1
        const w3 = makeWindow({workspace: otherWs, monitor: 0}); // other ws, monitor 0
        expect(getInterestingWindows([w1, w2, w3], 0)).toEqual([w1]);
    });

    test('returns empty array when all windows are skipTaskbar', () => {
        Settings.set('isolate-workspaces', false);
        Settings.set('isolate-monitors', false);
        const w1 = makeWindow({skipTaskbar: true});
        const w2 = makeWindow({skipTaskbar: true});
        expect(getInterestingWindows([w1, w2], 0)).toEqual([]);
    });

    test('returns empty array for empty input', () => {
        Settings.set('isolate-workspaces', false);
        Settings.set('isolate-monitors', false);
        expect(getInterestingWindows([], 0)).toEqual([]);
    });
});

// ---------------------------------------------------------------------------
// clickAction and scrollAction enums
// ---------------------------------------------------------------------------
describe('clickAction enum', () => {
    test('has expected values', () => {
        expect(clickAction.SKIP).toBe(0);
        expect(clickAction.MINIMIZE).toBe(1);
        expect(clickAction.LAUNCH).toBe(2);
        expect(clickAction.CYCLE_WINDOWS).toBe(3);
        expect(clickAction.PREVIEWS).toBe(5);
        expect(clickAction.QUIT).toBe(12);
    });

    test('is frozen', () => {
        expect(Object.isFrozen(clickAction)).toBe(true);
    });
});

describe('scrollAction enum', () => {
    test('has expected values', () => {
        expect(scrollAction.DO_NOTHING).toBe(0);
        expect(scrollAction.CYCLE_WINDOWS).toBe(1);
        expect(scrollAction.SWITCH_WORKSPACE).toBe(2);
    });

    test('is frozen', () => {
        expect(Object.isFrozen(scrollAction)).toBe(true);
    });
});

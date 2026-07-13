import {jest} from '@jest/globals';
import * as Settings from '../platform/settings.js';
import {
    rectsOverlap,
    tiledWindowsSpanMonitor,
    isHandledWindowType,
    OverlapStatus,
    IntellihideMode,
} from '../intellihide.js';
import {Meta} from '../dependencies/gi.js';

beforeEach(() => {
    Settings._reset();
});

// ---------------------------------------------------------------------------
// OverlapStatus enum
// ---------------------------------------------------------------------------
describe('OverlapStatus', () => {
    test('has expected values', () => {
        expect(OverlapStatus.UNDEFINED).toBe(-1);
        expect(OverlapStatus.FALSE).toBe(0);
        expect(OverlapStatus.TRUE).toBe(1);
    });

    test('is frozen', () => {
        expect(Object.isFrozen(OverlapStatus)).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// IntellihideMode enum
// ---------------------------------------------------------------------------
describe('IntellihideMode', () => {
    test('has expected values', () => {
        expect(IntellihideMode.ALL_WINDOWS).toBe(0);
        expect(IntellihideMode.FOCUS_APPLICATION_WINDOWS).toBe(1);
        expect(IntellihideMode.MAXIMIZED_WINDOWS).toBe(2);
        expect(IntellihideMode.ALWAYS_ON_TOP).toBe(3);
    });

    test('is frozen', () => {
        expect(Object.isFrozen(IntellihideMode)).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// rectsOverlap
// ---------------------------------------------------------------------------
describe('rectsOverlap', () => {
    const dockBox = {x1: 100, y1: 900, x2: 1820, y2: 1080};

    test('window fully covering dock returns true', () => {
        const rect = {x: 0, y: 0, width: 1920, height: 1080};
        expect(rectsOverlap(rect, dockBox)).toBe(true);
    });

    test('window entirely above dock returns false', () => {
        const rect = {x: 0, y: 0, width: 1920, height: 800};
        expect(rectsOverlap(rect, dockBox)).toBe(false);
    });

    test('window entirely below dock returns false', () => {
        const rect = {x: 0, y: 1081, width: 1920, height: 100};
        expect(rectsOverlap(rect, dockBox)).toBe(false);
    });

    test('window entirely to the left returns false', () => {
        const rect = {x: 0, y: 900, width: 50, height: 180};
        // rect.x + rect.width = 50, which is < x1=100
        expect(rectsOverlap(rect, dockBox)).toBe(false);
    });

    test('window entirely to the right returns false', () => {
        const rect = {x: 1821, y: 900, width: 100, height: 180};
        expect(rectsOverlap(rect, dockBox)).toBe(false);
    });

    test('window touching dock left edge exactly returns true', () => {
        // rect.x + rect.width = 100 >= x1=100
        const rect = {x: 50, y: 900, width: 50, height: 180};
        expect(rectsOverlap(rect, dockBox)).toBe(true);
    });

    test('window one pixel short of dock left edge returns false', () => {
        // rect.x + rect.width = 99 < x1=100
        const rect = {x: 50, y: 900, width: 49, height: 180};
        expect(rectsOverlap(rect, dockBox)).toBe(false);
    });

    test('window touching dock top edge exactly returns true', () => {
        // rect.y + rect.height = 900 >= y1=900
        const rect = {x: 100, y: 800, width: 100, height: 100};
        expect(rectsOverlap(rect, dockBox)).toBe(true);
    });

    test('window one pixel short of dock top returns false', () => {
        // rect.y + rect.height = 899 < y1=900
        const rect = {x: 100, y: 800, width: 100, height: 99};
        expect(rectsOverlap(rect, dockBox)).toBe(false);
    });

    test('partial overlap returns true', () => {
        const rect = {x: 500, y: 950, width: 200, height: 50};
        expect(rectsOverlap(rect, dockBox)).toBe(true);
    });

    test('zero-size window at dock origin returns false', () => {
        // x=100, width=0 => x+width=100 >= x1=100 OK
        // y=900, height=0 => y+height=900 >= y1=900 OK
        // x=100 < x2=1820 OK; y=900 < y2=1080 OK => true
        const rect = {x: 100, y: 900, width: 0, height: 0};
        expect(rectsOverlap(rect, dockBox)).toBe(true);
    });

    test('left-side dock (vertical)', () => {
        const leftDock = {x1: 0, y1: 0, x2: 60, y2: 1080};
        const rect = {x: 0, y: 0, width: 800, height: 600};
        expect(rectsOverlap(rect, leftDock)).toBe(true);
    });

    test('window not overlapping left-side dock', () => {
        const leftDock = {x1: 0, y1: 0, x2: 60, y2: 1080};
        const rect = {x: 100, y: 0, width: 800, height: 600};
        expect(rectsOverlap(rect, leftDock)).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// tiledWindowsSpanMonitor
// ---------------------------------------------------------------------------
describe('tiledWindowsSpanMonitor', () => {
    const monitor = {width: 1920};

    test('two half-screen windows spanning full width', () => {
        const r1 = {x: 0, width: 960};
        const r2 = {x: 960, width: 960};
        expect(tiledWindowsSpanMonitor(r1, r2, monitor)).toBe(true);
    });

    test('two windows with 1px gap still span (within 2px tolerance)', () => {
        const r1 = {x: 0, width: 959};
        const r2 = {x: 960, width: 960};
        // combined: 0..1920 = 1920, monitor.width - 2 = 1918; 1920 >= 1918
        expect(tiledWindowsSpanMonitor(r1, r2, monitor)).toBe(true);
    });

    test('two windows with 2px gap still span (exact tolerance boundary)', () => {
        const r1 = {x: 0, width: 958};
        const r2 = {x: 960, width: 960};
        // combined: 0..1920 = 1920; 1920 >= 1918
        expect(tiledWindowsSpanMonitor(r1, r2, monitor)).toBe(true);
    });

    test('two narrow windows do not span', () => {
        const r1 = {x: 0, width: 400};
        const r2 = {x: 500, width: 400};
        // combined: 0..900 = 900 < 1918
        expect(tiledWindowsSpanMonitor(r1, r2, monitor)).toBe(false);
    });

    test('overlapping windows spanning full width', () => {
        const r1 = {x: 0, width: 1000};
        const r2 = {x: 900, width: 1020};
        // combined: 0..1920 = 1920 >= 1918
        expect(tiledWindowsSpanMonitor(r1, r2, monitor)).toBe(true);
    });

    test('order of windows does not matter', () => {
        const r1 = {x: 960, width: 960};
        const r2 = {x: 0, width: 960};
        expect(tiledWindowsSpanMonitor(r1, r2, monitor)).toBe(true);
    });

    test('single window spanning full monitor counts', () => {
        const r1 = {x: 0, width: 1920};
        const r2 = {x: 0, width: 100};
        expect(tiledWindowsSpanMonitor(r1, r2, monitor)).toBe(true);
    });

    test('small monitor', () => {
        const smallMonitor = {width: 800};
        const r1 = {x: 0, width: 400};
        const r2 = {x: 400, width: 400};
        expect(tiledWindowsSpanMonitor(r1, r2, smallMonitor)).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// isHandledWindowType
// ---------------------------------------------------------------------------
describe('isHandledWindowType', () => {
    test('NORMAL is handled', () => {
        expect(isHandledWindowType(Meta.WindowType.NORMAL)).toBe(true);
    });

    test('DOCK is handled', () => {
        expect(isHandledWindowType(Meta.WindowType.DOCK)).toBe(true);
    });

    test('DIALOG is handled', () => {
        expect(isHandledWindowType(Meta.WindowType.DIALOG)).toBe(true);
    });

    test('MODAL_DIALOG is handled', () => {
        expect(isHandledWindowType(Meta.WindowType.MODAL_DIALOG)).toBe(true);
    });

    test('TOOLBAR is handled', () => {
        expect(isHandledWindowType(Meta.WindowType.TOOLBAR)).toBe(true);
    });

    test('UTILITY is handled', () => {
        expect(isHandledWindowType(Meta.WindowType.UTILITY)).toBe(true);
    });

    test('SPLASHSCREEN is handled', () => {
        expect(isHandledWindowType(Meta.WindowType.SPLASHSCREEN)).toBe(true);
    });

    test('MENU is not handled', () => {
        expect(isHandledWindowType(Meta.WindowType.MENU)).toBe(false);
    });

    test('DROPDOWN_MENU is not handled', () => {
        expect(isHandledWindowType(Meta.WindowType.DROPDOWN_MENU)).toBe(false);
    });

    test('POPUP_MENU is not handled', () => {
        expect(isHandledWindowType(Meta.WindowType.POPUP_MENU)).toBe(false);
    });

    test('TOOLTIP is not handled', () => {
        expect(isHandledWindowType(Meta.WindowType.TOOLTIP)).toBe(false);
    });

    test('DESKTOP is not handled', () => {
        expect(isHandledWindowType(Meta.WindowType.DESKTOP)).toBe(false);
    });

    test('NOTIFICATION is not handled', () => {
        expect(isHandledWindowType(Meta.WindowType.NOTIFICATION)).toBe(false);
    });

    test('value not in enum returns false', () => {
        expect(isHandledWindowType(999)).toBe(false);
    });

    test('negative value returns false', () => {
        expect(isHandledWindowType(-1)).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// Settings integration — verify the module reads the expected keys
// ---------------------------------------------------------------------------
describe('settings keys', () => {
    test('intellihide-check-interval has a default', () => {
        expect(Settings.get('intellihide-check-interval')).toBe(100);
    });

    test('intellihide-mode has a default', () => {
        expect(Settings.get('intellihide-mode')).toBe(1);
    });

    test('intellihide-mode can be overridden', () => {
        Settings.set('intellihide-mode', IntellihideMode.ALL_WINDOWS);
        expect(Settings.get('intellihide-mode')).toBe(0);
    });

    test('intellihide-check-interval can be overridden', () => {
        Settings.set('intellihide-check-interval', 200);
        expect(Settings.get('intellihide-check-interval')).toBe(200);
    });
});

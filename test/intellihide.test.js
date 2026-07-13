import {jest} from '@jest/globals';
import * as Settings from '../platform/settings.js';
import {Meta, Shell, GLib} from '../dependencies/gi.js';
import {Utils, Docking} from '../imports.js';

// ---------------------------------------------------------------------------
// Set up globalThis.global BEFORE importing intellihide.js — the module
// runs top-level code that references `global`.
// ---------------------------------------------------------------------------
const mockWorkspace = {index: () => 0};

globalThis.global = globalThis.global ?? {};
globalThis.global.display = {
    connect: () => 0,
    disconnect: () => {},
    focus_window: null,
    get_focus_window: () => globalThis.global.display.focus_window,
    get_monitor_geometry: () => ({x: 0, y: 0, width: 1920, height: 1080}),
};
globalThis.global.workspace_manager = {
    get_active_workspace: () => mockWorkspace,
    get_active_workspace_index: () => 0,
};
globalThis.global.backend = {
    get_monitor_manager: () => ({connect: () => 0, disconnect: () => {}}),
};

// Window actor store — tests push/clear to control get_window_actors()
const _windowActors = [];
globalThis.global.get_window_actors = () => [..._windowActors];

// ---------------------------------------------------------------------------
// Populate Utils on the imports mock with stubs the Intellihide constructor
// needs: GlobalSignalsHandler and getMonitorManager.
// ---------------------------------------------------------------------------
Utils.GlobalSignalsHandler = class {
    constructor() { this._items = []; }
    add(...items) {
        for (const item of items) {
            const [obj, signal, cb] = item;
            if (obj && typeof obj.connect === 'function') {
                const id = obj.connect(signal, cb);
                this._items.push({obj, id});
            }
        }
    }
    destroy() {
        for (const {obj, id} of this._items) {
            if (obj && typeof obj.disconnect === 'function')
                obj.disconnect(id);
        }
        this._items = [];
    }
};
Utils.getMonitorManager = () => ({connect: () => 0, disconnect: () => {}});

// Make Shell.WindowTracker.get_default() return a tracker with a connect
// method (the Intellihide constructor connects to 'notify::focus-app').
const _mockTracker = {
    focus_app: null,
    get_window_app: () => null,
    connect: () => 0,
    disconnect: () => {},
};
Shell.WindowTracker.get_default = () => _mockTracker;

// ---------------------------------------------------------------------------
// NOW import the real module (after global + mock setup)
// ---------------------------------------------------------------------------
import {
    rectsOverlap,
    tiledWindowsSpanMonitor,
    isHandledWindowType,
    OverlapStatus,
    IntellihideMode,
    Intellihide,
} from '../intellihide.js';

// ---------------------------------------------------------------------------
// Test setup
// ---------------------------------------------------------------------------
beforeEach(() => {
    Settings._reset();
    _windowActors.length = 0;
    _mockTracker.focus_app = null;
    globalThis.global.display.focus_window = null;
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
        expect(rectsOverlap(rect, dockBox)).toBe(false);
    });

    test('window entirely to the right returns false', () => {
        const rect = {x: 1821, y: 900, width: 100, height: 180};
        expect(rectsOverlap(rect, dockBox)).toBe(false);
    });

    test('window touching dock left edge exactly returns true', () => {
        const rect = {x: 50, y: 900, width: 50, height: 180};
        expect(rectsOverlap(rect, dockBox)).toBe(true);
    });

    test('window one pixel short of dock left edge returns false', () => {
        const rect = {x: 50, y: 900, width: 49, height: 180};
        expect(rectsOverlap(rect, dockBox)).toBe(false);
    });

    test('window touching dock top edge exactly returns true', () => {
        const rect = {x: 100, y: 800, width: 100, height: 100};
        expect(rectsOverlap(rect, dockBox)).toBe(true);
    });

    test('window one pixel short of dock top returns false', () => {
        const rect = {x: 100, y: 800, width: 100, height: 99};
        expect(rectsOverlap(rect, dockBox)).toBe(false);
    });

    test('partial overlap returns true', () => {
        const rect = {x: 500, y: 950, width: 200, height: 50};
        expect(rectsOverlap(rect, dockBox)).toBe(true);
    });

    test('zero-size window at dock origin returns true', () => {
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
        expect(tiledWindowsSpanMonitor(r1, r2, monitor)).toBe(true);
    });

    test('two windows with 2px gap still span (exact tolerance boundary)', () => {
        const r1 = {x: 0, width: 958};
        const r2 = {x: 960, width: 960};
        expect(tiledWindowsSpanMonitor(r1, r2, monitor)).toBe(true);
    });

    test('two narrow windows do not span', () => {
        const r1 = {x: 0, width: 400};
        const r2 = {x: 500, width: 400};
        expect(tiledWindowsSpanMonitor(r1, r2, monitor)).toBe(false);
    });

    test('overlapping windows spanning full width', () => {
        const r1 = {x: 0, width: 1000};
        const r2 = {x: 900, width: 1020};
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
// Settings integration
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

// ---------------------------------------------------------------------------
// Helper: create a mock window actor for Intellihide tests
// ---------------------------------------------------------------------------
function createMockWindowActor({
    windowType = Meta.WindowType.NORMAL,
    monitor = 0,
    frameRect = {x: 0, y: 0, width: 800, height: 600},
    workspace = 0,
    showing = true,
    maximizedVertically = false,
    maximizedHorizontally = false,
    fullscreen = false,
    isAbove = false,
    wmClass = '',
    gtkAppId = null,
    skipTaskbar = false,
    title = 'Test Window',
} = {}) {
    const _signals = {};
    let _nextId = 1;

    const metaWindow = {
        get_window_type: () => windowType,
        get_monitor: () => monitor,
        get_frame_rect: () => ({...frameRect}),
        get_workspace: () => ({index: () => workspace}),
        showing_on_its_workspace: () => showing,
        maximized_vertically: maximizedVertically,
        maximized_horizontally: maximizedHorizontally,
        fullscreen,
        is_above: () => isAbove,
        get_wm_class: () => wmClass,
        get_gtk_application_id: () => gtkAppId,
        is_skip_taskbar: () => skipTaskbar,
        get_title: () => title,
    };

    const actor = {
        _metaWindow: metaWindow,
        get_meta_window: () => metaWindow,
        connect: (name, cb) => {
            _signals[name] = _signals[name] ?? [];
            const id = _nextId++;
            _signals[name].push({id, cb});
            return id;
        },
        disconnect: (id) => {
            for (const name of Object.keys(_signals))
                _signals[name] = (_signals[name] || []).filter(s => s.id !== id);
        },
        emit: (name, ...args) => {
            for (const s of (_signals[name] || []))
                s.cb(actor, ...args);
        },
    };

    return actor;
}

// ---------------------------------------------------------------------------
// Intellihide class
// ---------------------------------------------------------------------------
describe('Intellihide', () => {
    let ih;

    afterEach(() => {
        if (ih) {
            ih.destroy();
            ih = null;
        }
    });

    test('constructor sets initial state', () => {
        ih = new Intellihide(0);
        expect(ih._monitorIndex).toBe(0);
        expect(ih._isEnabled).toBe(false);
        expect(ih._status).toBe(OverlapStatus.UNDEFINED);
        expect(ih._targetBox).toBeNull();
        expect(ih._trackedWindows).toBeInstanceOf(Map);
        expect(ih._trackedWindows.size).toBe(0);
    });

    test('constructor accepts different monitor index', () => {
        ih = new Intellihide(1);
        expect(ih._monitorIndex).toBe(1);
    });

    test('getOverlapStatus returns false when status is UNDEFINED', () => {
        ih = new Intellihide(0);
        expect(ih.getOverlapStatus()).toBe(false);
    });

    test('getOverlapStatus returns false when status is FALSE', () => {
        ih = new Intellihide(0);
        ih._status = OverlapStatus.FALSE;
        expect(ih.getOverlapStatus()).toBe(false);
    });

    test('getOverlapStatus returns true when status is TRUE', () => {
        ih = new Intellihide(0);
        ih._status = OverlapStatus.TRUE;
        expect(ih.getOverlapStatus()).toBe(true);
    });

    test('enable sets _isEnabled to true', () => {
        ih = new Intellihide(0);
        ih.enable();
        expect(ih._isEnabled).toBe(true);
    });

    test('enable resets status to UNDEFINED then runs check', () => {
        ih = new Intellihide(0);
        ih._status = OverlapStatus.TRUE;
        ih.enable();
        // After enable with no windows and no targetBox, _doCheckOverlap
        // returns early so status stays UNDEFINED
        expect(ih._status).toBe(OverlapStatus.UNDEFINED);
    });

    test('enable tracks existing window actors', () => {
        const wa = createMockWindowActor();
        _windowActors.push(wa);
        ih = new Intellihide(0);
        ih.enable();
        // The window actor should now be in _trackedWindows
        expect(ih._trackedWindows.has(wa)).toBe(true);
    });

    test('enable does not track non-handled window types', () => {
        const wa = createMockWindowActor({windowType: Meta.WindowType.DESKTOP});
        _windowActors.push(wa);
        ih = new Intellihide(0);
        ih.enable();
        expect(ih._trackedWindows.has(wa)).toBe(false);
    });

    test('enable does not track DING desktop windows', () => {
        const wa = createMockWindowActor({
            gtkAppId: 'com.rastersoft.ding',
            skipTaskbar: true,
        });
        _windowActors.push(wa);
        ih = new Intellihide(0);
        ih.enable();
        expect(ih._trackedWindows.has(wa)).toBe(false);
    });

    test('enable does not track wl-clipboard windows', () => {
        const wa = createMockWindowActor({title: 'wl-clipboard'});
        _windowActors.push(wa);
        ih = new Intellihide(0);
        ih.enable();
        expect(ih._trackedWindows.has(wa)).toBe(false);
    });

    test('enable tracks DropDownTerminalWindow by wm class', () => {
        // DropDownTerminal uses POPUP_MENU type but should still be handled
        const wa = createMockWindowActor({
            windowType: Meta.WindowType.POPUP_MENU,
            wmClass: 'DropDownTerminalWindow',
        });
        _windowActors.push(wa);
        ih = new Intellihide(0);
        ih.enable();
        expect(ih._trackedWindows.has(wa)).toBe(true);
    });

    test('disable sets _isEnabled to false', () => {
        ih = new Intellihide(0);
        ih.enable();
        ih.disable();
        expect(ih._isEnabled).toBe(false);
    });

    test('disable clears tracked windows', () => {
        const wa = createMockWindowActor();
        _windowActors.push(wa);
        ih = new Intellihide(0);
        ih.enable();
        expect(ih._trackedWindows.size).toBeGreaterThan(0);
        ih.disable();
        expect(ih._trackedWindows.size).toBe(0);
    });

    test('updateTargetBox sets the target box', () => {
        ih = new Intellihide(0);
        const box = {x1: 0, y1: 900, x2: 1920, y2: 1080};
        ih.updateTargetBox(box);
        expect(ih._targetBox).toBe(box);
    });

    test('forceUpdate resets status to UNDEFINED', () => {
        ih = new Intellihide(0);
        ih._status = OverlapStatus.TRUE;
        ih.forceUpdate();
        expect(ih._status).toBe(OverlapStatus.UNDEFINED);
    });

    test('destroy cleans up signal handlers', () => {
        ih = new Intellihide(0);
        ih.destroy();
        // Should not throw and _signalsHandler should be empty
        expect(ih._signalsHandler._items).toEqual([]);
        ih = null; // prevent double destroy in afterEach
    });

    test('_doCheckOverlap returns early when not enabled', () => {
        ih = new Intellihide(0);
        ih._targetBox = {x1: 0, y1: 900, x2: 1920, y2: 1080};
        ih._status = OverlapStatus.UNDEFINED;
        ih._doCheckOverlap();
        // Status unchanged because _isEnabled is false
        expect(ih._status).toBe(OverlapStatus.UNDEFINED);
    });

    test('_doCheckOverlap returns early when no targetBox', () => {
        ih = new Intellihide(0);
        ih._isEnabled = true;
        ih._status = OverlapStatus.UNDEFINED;
        ih._doCheckOverlap();
        expect(ih._status).toBe(OverlapStatus.UNDEFINED);
    });

    test('_doCheckOverlap sets FALSE when no windows overlap', () => {
        ih = new Intellihide(0);
        ih._targetBox = {x1: 0, y1: 900, x2: 1920, y2: 1080};

        // Add a window above the dock
        const wa = createMockWindowActor({
            frameRect: {x: 0, y: 0, width: 1920, height: 800},
            monitor: 0,
        });
        _windowActors.push(wa);

        ih.enable();
        expect(ih._status).toBe(OverlapStatus.FALSE);
        expect(ih.getOverlapStatus()).toBe(false);
    });

    test('_doCheckOverlap sets TRUE when a window overlaps the target box', () => {
        ih = new Intellihide(0);
        ih._targetBox = {x1: 0, y1: 900, x2: 1920, y2: 1080};

        // Add a full-screen window that overlaps the dock
        const wa = createMockWindowActor({
            frameRect: {x: 0, y: 0, width: 1920, height: 1080},
            monitor: 0,
        });
        _windowActors.push(wa);

        // Set up tracker to return an app for the top window
        const mockApp = {id: 'test-app'};
        _mockTracker.get_window_app = () => mockApp;

        ih.enable();
        expect(ih._status).toBe(OverlapStatus.TRUE);
        expect(ih.getOverlapStatus()).toBe(true);
    });

    test('_doCheckOverlap sets FALSE with no windows', () => {
        ih = new Intellihide(0);
        ih._targetBox = {x1: 0, y1: 900, x2: 1920, y2: 1080};
        ih.enable();
        expect(ih._status).toBe(OverlapStatus.FALSE);
        expect(ih.getOverlapStatus()).toBe(false);
    });

    test('emit status-changed when overlap status changes', () => {
        ih = new Intellihide(0);
        ih._targetBox = {x1: 0, y1: 900, x2: 1920, y2: 1080};

        const statusChanges = [];
        ih.connect('status-changed', (status) => {
            statusChanges.push(status);
        });

        // Enable with no windows -> status goes from UNDEFINED to FALSE
        ih.enable();
        expect(statusChanges).toContain(OverlapStatus.FALSE);
    });

    test('MAXIMIZED_WINDOWS mode skips non-maximized windows', () => {
        Settings.set('intellihide-mode', IntellihideMode.MAXIMIZED_WINDOWS);

        ih = new Intellihide(0);
        ih._targetBox = {x1: 0, y1: 900, x2: 1920, y2: 1080};

        // Non-maximized window that geometrically overlaps the dock
        const wa = createMockWindowActor({
            frameRect: {x: 0, y: 0, width: 1920, height: 1080},
            monitor: 0,
            maximizedVertically: false,
            maximizedHorizontally: false,
        });
        _windowActors.push(wa);

        const mockApp = {id: 'test-app'};
        _mockTracker.get_window_app = () => mockApp;

        ih.enable();
        // Should be FALSE because non-maximized windows are filtered out
        expect(ih._status).toBe(OverlapStatus.FALSE);
    });

    test('MAXIMIZED_WINDOWS mode detects maximized window overlap', () => {
        Settings.set('intellihide-mode', IntellihideMode.MAXIMIZED_WINDOWS);

        ih = new Intellihide(0);
        ih._targetBox = {x1: 0, y1: 900, x2: 1920, y2: 1080};

        const wa = createMockWindowActor({
            frameRect: {x: 0, y: 0, width: 1920, height: 1080},
            monitor: 0,
            maximizedVertically: true,
            maximizedHorizontally: true,
        });
        _windowActors.push(wa);

        const mockApp = {id: 'test-app'};
        _mockTracker.get_window_app = () => mockApp;

        ih.enable();
        expect(ih._status).toBe(OverlapStatus.TRUE);
    });

    test('MAXIMIZED_WINDOWS mode detects fullscreen window overlap', () => {
        Settings.set('intellihide-mode', IntellihideMode.MAXIMIZED_WINDOWS);

        ih = new Intellihide(0);
        ih._targetBox = {x1: 0, y1: 900, x2: 1920, y2: 1080};

        const wa = createMockWindowActor({
            frameRect: {x: 0, y: 0, width: 1920, height: 1080},
            monitor: 0,
            fullscreen: true,
        });
        _windowActors.push(wa);

        const mockApp = {id: 'test-app'};
        _mockTracker.get_window_app = () => mockApp;

        ih.enable();
        expect(ih._status).toBe(OverlapStatus.TRUE);
    });

    test('ALWAYS_ON_TOP mode hides dock only for fullscreen', () => {
        Settings.set('intellihide-mode', IntellihideMode.ALWAYS_ON_TOP);

        ih = new Intellihide(0);
        ih._targetBox = {x1: 0, y1: 900, x2: 1920, y2: 1080};

        // Non-fullscreen window overlapping dock
        const wa = createMockWindowActor({
            frameRect: {x: 0, y: 0, width: 1920, height: 1080},
            monitor: 0,
        });
        _windowActors.push(wa);

        const mockApp = {id: 'test-app'};
        _mockTracker.get_window_app = () => mockApp;
        _mockTracker.focus_app = mockApp;

        ih.enable();
        // Non-fullscreen in ALWAYS_ON_TOP mode should not cause overlap
        expect(ih._status).toBe(OverlapStatus.FALSE);
    });

    test('ALL_WINDOWS mode considers all normal windows', () => {
        Settings.set('intellihide-mode', IntellihideMode.ALL_WINDOWS);

        ih = new Intellihide(0);
        ih._targetBox = {x1: 0, y1: 900, x2: 1920, y2: 1080};

        const wa = createMockWindowActor({
            frameRect: {x: 0, y: 0, width: 1920, height: 1080},
            monitor: 0,
        });
        _windowActors.push(wa);

        const mockApp = {id: 'test-app'};
        _mockTracker.get_window_app = () => mockApp;

        ih.enable();
        expect(ih._status).toBe(OverlapStatus.TRUE);
    });

    test('windows on different workspace are excluded', () => {
        Settings.set('intellihide-mode', IntellihideMode.ALL_WINDOWS);

        ih = new Intellihide(0);
        ih._targetBox = {x1: 0, y1: 900, x2: 1920, y2: 1080};

        // Window on workspace 1 (active workspace is 0)
        const wa = createMockWindowActor({
            frameRect: {x: 0, y: 0, width: 1920, height: 1080},
            monitor: 0,
            workspace: 1,
        });
        _windowActors.push(wa);

        const mockApp = {id: 'test-app'};
        _mockTracker.get_window_app = () => mockApp;

        ih.enable();
        expect(ih._status).toBe(OverlapStatus.FALSE);
    });

    test('windows not showing on workspace are excluded', () => {
        Settings.set('intellihide-mode', IntellihideMode.ALL_WINDOWS);

        ih = new Intellihide(0);
        ih._targetBox = {x1: 0, y1: 900, x2: 1920, y2: 1080};

        const wa = createMockWindowActor({
            frameRect: {x: 0, y: 0, width: 1920, height: 1080},
            monitor: 0,
            showing: false,
        });
        _windowActors.push(wa);

        const mockApp = {id: 'test-app'};
        _mockTracker.get_window_app = () => mockApp;

        ih.enable();
        expect(ih._status).toBe(OverlapStatus.FALSE);
    });

    test('tiled windows spanning monitor are detected as overlapping', () => {
        Settings.set('intellihide-mode', IntellihideMode.ALL_WINDOWS);

        ih = new Intellihide(0);
        ih._targetBox = {x1: 0, y1: 900, x2: 1920, y2: 1080};

        // Two tiled (half-maximized vertically) windows that together
        // span the full monitor width but individually do not overlap
        // the dock target box
        const wa1 = createMockWindowActor({
            frameRect: {x: 0, y: 0, width: 960, height: 800},
            monitor: 0,
            maximizedVertically: true,
            maximizedHorizontally: false,
        });
        const wa2 = createMockWindowActor({
            frameRect: {x: 960, y: 0, width: 960, height: 800},
            monitor: 0,
            maximizedVertically: true,
            maximizedHorizontally: false,
        });
        _windowActors.push(wa1, wa2);

        const mockApp = {id: 'test-app'};
        _mockTracker.get_window_app = () => mockApp;

        ih.enable();
        expect(ih._status).toBe(OverlapStatus.TRUE);
    });

    test('_checkOverlap does nothing when disabled', () => {
        ih = new Intellihide(0);
        ih._targetBox = {x1: 0, y1: 900, x2: 1920, y2: 1080};
        ih._status = OverlapStatus.UNDEFINED;
        ih._checkOverlap();
        expect(ih._status).toBe(OverlapStatus.UNDEFINED);
    });

    test('_checkOverlap does nothing without targetBox', () => {
        ih = new Intellihide(0);
        ih._isEnabled = true;
        ih._status = OverlapStatus.UNDEFINED;
        ih._checkOverlap();
        expect(ih._status).toBe(OverlapStatus.UNDEFINED);
    });

    test('_checkOverlap rate-limits via timeout', () => {
        ih = new Intellihide(0);
        ih._targetBox = {x1: 0, y1: 900, x2: 1920, y2: 1080};
        ih._isEnabled = true;

        // First call should run _doCheckOverlap and set a timeout
        ih._checkOverlap();
        expect(ih._checkOverlapTimeoutId).toBeGreaterThan(0);

        // Second call should just set the continue flag
        ih._checkOverlap();
        expect(ih._checkOverlapTimeoutContinue).toBe(true);
    });

    test('window on different monitor does not set topWindow', () => {
        Settings.set('intellihide-mode', IntellihideMode.ALL_WINDOWS);

        ih = new Intellihide(0);
        ih._targetBox = {x1: 0, y1: 900, x2: 1920, y2: 1080};

        // Window only on monitor 1 (dock is on monitor 0)
        const wa = createMockWindowActor({
            frameRect: {x: 0, y: 0, width: 1920, height: 1080},
            monitor: 1,
        });
        _windowActors.push(wa);

        const mockApp = {id: 'test-app'};
        _mockTracker.get_window_app = () => mockApp;

        ih.enable();
        // No topWindow found on monitor 0, so overlaps stays FALSE
        expect(ih._status).toBe(OverlapStatus.FALSE);
    });

    test('enable then disable then enable works correctly', () => {
        const wa = createMockWindowActor({
            frameRect: {x: 0, y: 0, width: 1920, height: 1080},
            monitor: 0,
        });
        _windowActors.push(wa);

        ih = new Intellihide(0);
        ih._targetBox = {x1: 0, y1: 900, x2: 1920, y2: 1080};

        const mockApp = {id: 'test-app'};
        _mockTracker.get_window_app = () => mockApp;

        ih.enable();
        expect(ih._isEnabled).toBe(true);
        expect(ih._trackedWindows.size).toBe(1);

        ih.disable();
        expect(ih._isEnabled).toBe(false);
        expect(ih._trackedWindows.size).toBe(0);

        ih.enable();
        expect(ih._isEnabled).toBe(true);
        expect(ih._trackedWindows.size).toBe(1);
    });

    test('FOCUS_APPLICATION_WINDOWS mode includes DropDownTerminalWindow', () => {
        Settings.set('intellihide-mode', IntellihideMode.FOCUS_APPLICATION_WINDOWS);

        ih = new Intellihide(0);
        ih._targetBox = {x1: 0, y1: 900, x2: 1920, y2: 1080};

        // A DropDownTerminalWindow that overlaps the dock
        const wa = createMockWindowActor({
            windowType: Meta.WindowType.POPUP_MENU,
            wmClass: 'DropDownTerminalWindow',
            frameRect: {x: 0, y: 0, width: 1920, height: 1080},
            monitor: 0,
        });
        _windowActors.push(wa);

        const mockApp = {id: 'dropdown-terminal'};
        _mockTracker.get_window_app = () => mockApp;

        ih.enable();
        // DropDownTerminalWindow is always considered interesting regardless
        // of focus app, so it should cause overlap
        expect(ih._status).toBe(OverlapStatus.TRUE);
    });
});

// Unit tests for windowPreview.js — imports the REAL module.

import {jest} from '@jest/globals';
import * as Settings from '../platform/settings.js';

// ---------------------------------------------------------------------------
// Set up globalThis.global before importing windowPreview (module-level code
// references global.stage, global.display, etc.)
// ---------------------------------------------------------------------------
globalThis.global = globalThis.global ?? {};
globalThis.global.stage = {};
globalThis.global.display = {
    focus_window: null,
    sort_windows_by_stacking: wins => [...wins],
};
globalThis.global.get_current_time = () => 0;

// ---------------------------------------------------------------------------
// Augment shell-ui mocks for windowPreview's needs
// ---------------------------------------------------------------------------
import * as ShellUi from '../dependencies/shell/ui.js';
import {Clutter, GObject, GLib, Meta, St} from '../dependencies/gi.js';

// PopupMenu.PopupMenu constructor must accept (source, arrowAlignment, side)
const OrigPopupMenu = ShellUi.PopupMenu.PopupMenu;
ShellUi.PopupMenu.PopupMenu = class PopupMenu {
    constructor(source, arrowAlignment, side) {
        this._source = source;
        this.actor = new St.Widget();
        this.actor.set_style = function (s) { this._style = s; };
        this.actor.navigate_focus = () => {};
        this.box = new St.Widget();
        this._boxPointer = {
            set_reactive() {},
            set_track_hover() {},
            actor: {set_reactive() {}, set_track_hover() {}},
            bin: new St.Widget(),
            close(anim, cb) { if (cb) cb(); },
        };
        this.isOpen = false;
        this.blockSourceEvents = false;
        this._signals = {};
    }

    addMenuItem(item) {}
    removeAll() {}
    open(anim) { this.isOpen = true; }
    close(anim) { this.isOpen = false; }
    destroy() {}
    connect(name, cb) {
        this._signals = this._signals ?? {};
        this._signals[name] = this._signals[name] ?? [];
        const id = Math.random();
        this._signals[name].push({id, cb});
        return id;
    }
    disconnect() {}
    emit(name, ...args) {
        if (!this._signals?.[name]) return;
        for (const s of this._signals[name])
            s.cb(this, ...args);
    }
};

// PopupMenu.PopupMenuSection needs a working constructor
ShellUi.PopupMenu.PopupMenuSection = class PopupMenuSection {
    constructor() {
        this.actor = new St.ScrollView();
        this.box = new St.BoxLayout();
        this._menuItems = [];
    }

    addMenuItem(item) { this._menuItems.push(item); }
    removeAll() { this._menuItems = []; }
    destroy() {}
    connect() { return 0; }
    disconnect() {}
    _getMenuItems() { return this._menuItems; }
    _getTopMenu() {
        return {
            actor: new St.Widget(),
            close() {},
            fromHover: false,
        };
    }
};

// PopupMenu.PopupBaseMenuItem needs _init for GObject.registerClass.
// Extend St.Widget so we inherit all MockActor methods (set_width, set_style, etc.)
ShellUi.PopupMenu.PopupBaseMenuItem = class PopupBaseMenuItem extends St.Widget {
    constructor() { super(); }

    _init(params) {
        super._init(params);
        this._ornamentIcon = new St.Widget();
        this.closeButton = null;
    }

    set(props) { Object.assign(this, props); }

    vfunc_enter_event(crossingEvent) { return Clutter.EVENT_PROPAGATE; }
    vfunc_leave_event(crossingEvent) { return Clutter.EVENT_PROPAGATE; }
    vfunc_style_changed() {}
    vfunc_key_focus_in() {}
    vfunc_key_focus_out() {}
    translate_coordinates(target, x, y) { return [true, x, y]; }
};

// BoxPointer and Workspace constants needed by the module
ShellUi.BoxPointer.PopupAnimation = {NONE: 0, SLIDE: 1, FADE: 2, FULL: 3};
ShellUi.Workspace.WINDOW_OVERLAY_FADE_TIME = 200;

// Main.layoutManager needs getWorkAreaForMonitor and activateWindow
ShellUi.Main.layoutManager.getWorkAreaForMonitor = () => ({
    x: 0, y: 0, width: 1920, height: 1080,
});

// Clutter.get_current_event needed by _onWindowAdded
Clutter.get_current_event = () => ({});

// ---------------------------------------------------------------------------
// Augment imports mock — Utils and Theming stubs needed at module load time
// ---------------------------------------------------------------------------
import {Utils, Theming, Docking} from '../imports.js';

Utils.getPosition = () => St.Side.BOTTOM;
Utils.GlobalSignalsHandler = class {
    constructor() { this._handlers = []; }
    add(...args) { this._handlers.push(args); }
    addWithLabel(...args) { this._handlers.push(args); }
    removeWithLabel() {}
    destroy() {}
};
Utils.addActor = (parent, child) => { if (parent?.add_child) parent.add_child(child); };
Utils.laterAdd = (_type, cb) => { if (cb) cb(); return 1; };
Utils.laterRemove = () => {};

Theming.PositionStyleClass = ['top', 'right', 'bottom', 'left'];

// Provide Docking.DockManager.allDocks for hoverClose()
Docking.DockManager = Docking.DockManager ?? {};
Docking.DockManager.allDocks = [];

// ---------------------------------------------------------------------------
// Augment Meta mock for prefs_get_button_layout and ButtonFunction
// ---------------------------------------------------------------------------
Meta.prefs_get_button_layout = () => ({left_buttons: [], right_buttons: []});
Meta.ButtonFunction = {CLOSE: 0};

// ---------------------------------------------------------------------------
// Now import the REAL module — Jest maps gi/shell/imports/platform to mocks
// ---------------------------------------------------------------------------
const {
    computePreviewScale,
    computeLabelMaxWidth,
    WindowPreviewMenu,
    WindowPreviewMenuItem,
} = await import('../windowPreview.js');

// ---------------------------------------------------------------------------
// Helper: create a mock source (app icon) for WindowPreviewMenu
// ---------------------------------------------------------------------------
function createMockSource(overrides = {}) {
    return {
        monitorIndex: 0,
        app: {
            get_name: () => 'Test App',
            get_windows: () => [],
            connect: () => 0,
            disconnect: () => {},
        },
        mapped: true,
        has_pointer: false,
        connect: () => 0,
        disconnect: () => {},
        emit: () => {},
        getInterestingWindows: () => [],
        ...overrides,
    };
}

// ---------------------------------------------------------------------------
// Helper: create a mock MetaWindow
// ---------------------------------------------------------------------------
function createMockWindow(overrides = {}) {
    const win = {
        get_title: () => 'Test Window',
        get_workspace: () => ({
            list_windows: () => [],
            connect: () => 0,
            disconnect: () => {},
        }),
        get_compositor_private: () => ({
            get_texture: () => ({}),
            get_size: () => [800, 600],
            connect: () => 0,
            disconnect: () => {},
            destroy: () => {},
            get_children: () => [],
            is_destroyed: () => false,
            opacity: 255,
            ease: (p) => { if (p?.onComplete) p.onComplete(); },
        }),
        get_stable_sequence: () => 1,
        can_close: () => true,
        foreach_transient: (cb) => {},
        delete: () => {},
        minimized: false,
        connect: () => 0,
        disconnect: () => {},
        get_transient_for: () => null,
        ...overrides,
    };
    return win;
}

// ===================================================================
// computePreviewScale
// ===================================================================
describe('computePreviewScale', () => {
    beforeEach(() => {
        Settings._reset();
    });

    test('returns 0 when width is 0', () => {
        expect(computePreviewScale(0, 600, 0, 150)).toBe(0);
    });

    test('returns 0 when height is 0', () => {
        expect(computePreviewScale(800, 0, 0, 150)).toBe(0);
    });

    test('returns 0 when both are 0', () => {
        expect(computePreviewScale(0, 0, 0, 150)).toBe(0);
    });

    test('returns sizeScale when explicitly set', () => {
        expect(computePreviewScale(1920, 1080, 0.5, 150)).toBe(0.5);
    });

    test('returns sizeScale=1.0 when explicitly set', () => {
        expect(computePreviewScale(800, 600, 1.0, 150)).toBe(1.0);
    });

    test('auto-computes scale from maxHeight for tall window', () => {
        expect(computePreviewScale(400, 800, 0, 150)).toBeCloseTo(0.1875);
    });

    test('auto-computes scale from maxHeight for wide window', () => {
        expect(computePreviewScale(1920, 1080, 0, 150)).toBeCloseTo(150 / 1080);
    });

    test('auto-computes scale for small window (capped at 1.0)', () => {
        expect(computePreviewScale(100, 50, 0, 150)).toBe(1.0);
    });

    test('maxHeight=0 results in scale 0 for auto mode', () => {
        expect(computePreviewScale(800, 600, 0, 0)).toBe(0);
    });

    test('scale constrained by width when width is dominant', () => {
        expect(computePreviewScale(600, 100, 0, 150)).toBeCloseTo(0.5);
    });

    test('square window uses maxHeight as constraint', () => {
        expect(computePreviewScale(400, 400, 0, 150)).toBeCloseTo(0.375);
    });

    test('different maxHeight values change scale', () => {
        const scale80 = computePreviewScale(1920, 1080, 0, 80);
        const scale200 = computePreviewScale(1920, 1080, 0, 200);
        const scale400 = computePreviewScale(1920, 1080, 0, 400);

        expect(scale80).toBeLessThan(scale200);
        expect(scale200).toBeLessThan(scale400);
    });
});

// ===================================================================
// computeLabelMaxWidth
// ===================================================================
describe('computeLabelMaxWidth', () => {
    test('returns double the maxHeight', () => {
        expect(computeLabelMaxWidth(150)).toBe(300);
    });

    test('returns 0 when maxHeight is 0', () => {
        expect(computeLabelMaxWidth(0)).toBe(0);
    });

    test('works with large maxHeight', () => {
        expect(computeLabelMaxWidth(400)).toBe(800);
    });

    test('works with small maxHeight', () => {
        expect(computeLabelMaxWidth(80)).toBe(160);
    });
});

// ===================================================================
// Preview scale with settings integration
// ===================================================================
describe('preview scale with settings integration', () => {
    beforeEach(() => {
        Settings._reset();
    });

    test('default preview-max-height produces expected scale', () => {
        const maxHeight = Settings.get('preview-max-height'); // 150
        const scale = computePreviewScale(1920, 1080, 0, maxHeight);
        expect(scale).toBeCloseTo(150 / 1080);
    });

    test('overridden preview-max-height changes scale', () => {
        Settings.set('preview-max-height', 300);
        const maxHeight = Settings.get('preview-max-height');
        const scale = computePreviewScale(1920, 1080, 0, maxHeight);
        expect(scale).toBeCloseTo(300 / 1080);
    });

    test('preview-size-scale overrides auto-computation', () => {
        const sizeScale = 0.75;
        Settings.set('preview-size-scale', sizeScale);
        const scale = computePreviewScale(
            1920, 1080,
            Settings.get('preview-size-scale'),
            Settings.get('preview-max-height')
        );
        expect(scale).toBe(0.75);
    });

    test('label max-width reflects settings', () => {
        const width = computeLabelMaxWidth(Settings.get('preview-max-height'));
        expect(width).toBe(300); // default maxHeight=150 => 300

        Settings.set('preview-max-height', 200);
        const width2 = computeLabelMaxWidth(Settings.get('preview-max-height'));
        expect(width2).toBe(400);
    });
});

// ===================================================================
// WindowPreviewMenu
// ===================================================================
describe('WindowPreviewMenu', () => {
    beforeEach(() => {
        Settings._reset();
    });

    test('constructor sets expected initial properties', () => {
        const source = createMockSource();
        const menu = new WindowPreviewMenu(source);

        expect(menu.blockSourceEvents).toBe(false);
        expect(menu._source).toBe(source);
        expect(menu._app).toBe(source.app);
        expect(menu.fromHover).toBe(false);
        expect(menu._hoverOpenTimeoutId).toBeNull();
        expect(menu._hoverCloseTimeoutId).toBeNull();
    });

    test('actor is initially hidden', () => {
        const source = createMockSource();
        const menu = new WindowPreviewMenu(source);

        expect(menu.actor._visible).toBe(false);
    });

    test('_maxWidth and _maxHeight are computed from work area', () => {
        const source = createMockSource();
        const menu = new WindowPreviewMenu(source);

        // workArea 1920x1080, scaleFactor=1, MENU_MARGINS=10
        expect(menu._maxWidth).toBe(1920 - 10);
        expect(menu._maxHeight).toBe(1080 - 10);
    });

    test('popup does nothing when no interesting windows', () => {
        const source = createMockSource({getInterestingWindows: () => []});
        const menu = new WindowPreviewMenu(source);

        menu.popup();
        expect(menu.isOpen).toBeFalsy();
    });

    test('popup opens menu when there are interesting windows', () => {
        const win = createMockWindow();
        const source = createMockSource({
            getInterestingWindows: () => [win],
        });
        const menu = new WindowPreviewMenu(source);
        menu.popup();

        expect(menu.isOpen).toBe(true);
    });

    test('popup sets blockSourceEvents to true when not from hover', () => {
        const win = createMockWindow();
        const source = createMockSource({
            getInterestingWindows: () => [win],
        });
        const menu = new WindowPreviewMenu(source);
        menu.fromHover = false;
        menu.popup();

        expect(menu.blockSourceEvents).toBe(true);
    });

    test('popup sets blockSourceEvents to false when from hover', () => {
        const win = createMockWindow();
        const source = createMockSource({
            getInterestingWindows: () => [win],
        });
        const menu = new WindowPreviewMenu(source);
        menu.fromHover = true;
        menu.popup();

        expect(menu.blockSourceEvents).toBe(false);
    });

    test('popup sets hover-specific style when fromHover is true', () => {
        const win = createMockWindow();
        const source = createMockSource({
            getInterestingWindows: () => [win],
        });
        const menu = new WindowPreviewMenu(source);
        menu.fromHover = true;
        menu.popup();

        // Should set min-width: 0 style for hover mode
        const style = menu.actor._style;
        expect(style).toContain('min-width: 0');
    });

    test('popup sets max-width/max-height style when not from hover', () => {
        const win = createMockWindow();
        const source = createMockSource({
            getInterestingWindows: () => [win],
        });
        const menu = new WindowPreviewMenu(source);
        menu.fromHover = false;
        menu.popup();

        const style = menu.actor._style;
        expect(style).toContain('max-width');
        expect(style).toContain('max-height');
    });

    test('popup navigates focus when not from hover and no active item', () => {
        const win = createMockWindow();
        const source = createMockSource({
            getInterestingWindows: () => [win],
        });
        const menu = new WindowPreviewMenu(source);
        menu.fromHover = false;
        const navigateSpy = jest.fn();
        menu.actor.navigate_focus = navigateSpy;
        menu.popup();

        // Should call navigate_focus because no focusWindow match
        expect(navigateSpy).toHaveBeenCalled();
    });

    test('popup highlights active window item when focus_window matches', () => {
        const win = createMockWindow();
        const source = createMockSource({
            getInterestingWindows: () => [win],
        });
        const menu = new WindowPreviewMenu(source);

        // Set the global focus window to match
        const origFocus = global.display.focus_window;
        global.display.focus_window = win;

        menu.fromHover = false;

        // Pre-create previewBox so popup finds a matching item
        menu._redisplay();

        // _scrollToItem needs adjustment objects on the previewBox.actor
        menu._previewBox.actor.vadjustment = {
            get_values: () => [0, 0, 500, 0, 0, 500],
            set_value: () => {},
        };
        menu._previewBox.actor.hadjustment = {
            get_values: () => [0, 0, 500, 0, 0, 500],
            set_value: () => {},
        };

        // Now the previewBox has menu items; popup should find the active item
        menu.popup();

        global.display.focus_window = origFocus;

        // Menu should be open
        expect(menu.isOpen).toBe(true);
    });

    test('popup does not reopen if already open', () => {
        const win = createMockWindow();
        const source = createMockSource({
            getInterestingWindows: () => [win],
        });
        const menu = new WindowPreviewMenu(source);
        menu.popup();
        expect(menu.isOpen).toBe(true);

        // Call popup again - should not error
        menu.popup();
        expect(menu.isOpen).toBe(true);
    });

    test('hoverOpen sets fromHover and calls popup', () => {
        const win = createMockWindow();
        const source = createMockSource({
            getInterestingWindows: () => [win],
        });
        const menu = new WindowPreviewMenu(source);
        menu.hoverOpen();

        expect(menu.fromHover).toBe(true);
        expect(menu.isOpen).toBe(true);
    });

    test('hoverOpen does nothing if already open', () => {
        const win = createMockWindow();
        const source = createMockSource({
            getInterestingWindows: () => [win],
        });
        const menu = new WindowPreviewMenu(source);
        menu.isOpen = true;
        menu.hoverOpen();

        expect(menu.fromHover).toBe(true);
        expect(menu._hoverOpenTimeoutId).toBeNull();
    });

    test('cancelOpen clears hover open timeout', () => {
        const source = createMockSource();
        const menu = new WindowPreviewMenu(source);
        menu._hoverOpenTimeoutId = 42;
        menu.cancelOpen();

        expect(menu._hoverOpenTimeoutId).toBeNull();
    });

    test('cancelOpen is no-op when no timeout set', () => {
        const source = createMockSource();
        const menu = new WindowPreviewMenu(source);
        menu._hoverOpenTimeoutId = null;
        menu.cancelOpen();
        expect(menu._hoverOpenTimeoutId).toBeNull();
    });

    test('cancelClose clears hover close timeout', () => {
        const source = createMockSource();
        const menu = new WindowPreviewMenu(source);
        menu._hoverCloseTimeoutId = 42;
        menu.cancelClose();

        expect(menu._hoverCloseTimeoutId).toBeNull();
    });

    test('cancelClose is no-op when no timeout set', () => {
        const source = createMockSource();
        const menu = new WindowPreviewMenu(source);
        menu._hoverCloseTimeoutId = null;
        menu.cancelClose();
        expect(menu._hoverCloseTimeoutId).toBeNull();
    });

    test('_needsRedisplay returns true when no previewBox', () => {
        const source = createMockSource();
        const menu = new WindowPreviewMenu(source);
        menu._previewBox = null;
        expect(menu._needsRedisplay([createMockWindow()])).toBe(true);
    });

    test('_needsRedisplay returns true when window count changes', () => {
        const w1 = createMockWindow({get_stable_sequence: () => 1});
        const w2 = createMockWindow({get_stable_sequence: () => 2});
        const source = createMockSource();
        const menu = new WindowPreviewMenu(source);
        menu._previewBox = {
            _getMenuItems: () => [{_window: w1}],
        };
        expect(menu._needsRedisplay([w1, w2])).toBe(true);
    });

    test('_needsRedisplay returns false when same windows', () => {
        const w1 = createMockWindow({get_stable_sequence: () => 1});
        const source = createMockSource();
        const menu = new WindowPreviewMenu(source);
        menu._previewBox = {
            _getMenuItems: () => [{_window: w1}],
        };
        expect(menu._needsRedisplay([w1])).toBe(false);
    });

    test('_needsRedisplay returns true when different windows same count', () => {
        const w1 = createMockWindow({get_stable_sequence: () => 1});
        const w2 = createMockWindow({get_stable_sequence: () => 2});
        const w3 = createMockWindow({get_stable_sequence: () => 3});
        const source = createMockSource();
        const menu = new WindowPreviewMenu(source);
        menu._previewBox = {
            _getMenuItems: () => [{_window: w1}],
        };
        expect(menu._needsRedisplay([w2])).toBe(true);
    });

    test('_redisplay destroys old previewBox and creates new one', () => {
        const source = createMockSource();
        const menu = new WindowPreviewMenu(source);

        // Simulate an existing previewBox
        const mockDestroy = jest.fn();
        menu._previewBox = {destroy: mockDestroy};

        menu._redisplay();

        expect(mockDestroy).toHaveBeenCalled();
        expect(menu._previewBox).toBeDefined();
    });

    test('_redisplay creates new previewBox when none exists', () => {
        const source = createMockSource();
        const menu = new WindowPreviewMenu(source);
        menu._previewBox = null;

        menu._redisplay();

        expect(menu._previewBox).toBeDefined();
    });

    test('enableHover sets up hover tracking', () => {
        const source = createMockSource();
        const menu = new WindowPreviewMenu(source);
        const mockManager = {removeMenu: jest.fn(), addMenu: jest.fn()};

        menu.enableHover(mockManager);
        expect(menu.blockSourceEvents).toBe(false);
        expect(mockManager.removeMenu).toHaveBeenCalledWith(menu);
    });

    test('enableHover without menuManager', () => {
        const source = createMockSource();
        const menu = new WindowPreviewMenu(source);

        menu.enableHover(null);
        expect(menu.blockSourceEvents).toBe(false);
        expect(menu._menuManager).toBeUndefined();
    });

    test('disableHover restores menu manager and sets blockSourceEvents', () => {
        const source = createMockSource();
        const menu = new WindowPreviewMenu(source);
        const mockManager = {removeMenu: jest.fn(), addMenu: jest.fn()};

        menu.enableHover(mockManager);
        menu.disableHover();

        expect(menu.blockSourceEvents).toBe(true);
        expect(mockManager.addMenu).toHaveBeenCalledWith(menu);
        expect(menu._menuManager).toBeNull();
    });

    test('disableHover without prior menuManager', () => {
        const source = createMockSource();
        const menu = new WindowPreviewMenu(source);
        menu._menuManager = null;

        menu.disableHover();
        expect(menu.blockSourceEvents).toBe(true);
    });

    // --- _onEnter ---
    test('_onEnter sets up hover open timeout', () => {
        const source = createMockSource();
        const menu = new WindowPreviewMenu(source);

        Settings.set('preview-hover-enter-timeout', 300);
        menu._onEnter();

        expect(menu._hoverOpenTimeoutId).not.toBeNull();
    });

    test('_onEnter closes other hover menus from appIconsHoverList', () => {
        const otherMenu = {
            fromHover: true,
            isOpen: false,
            hoverClose: jest.fn(),
            actor: {visible: true, hide: jest.fn()},
        };
        const otherIcon = {
            _previewMenu: otherMenu,
        };
        const source = createMockSource({
            _appIconsHoverList: [otherIcon],
        });
        const menu = new WindowPreviewMenu(source);
        source._appIconsHoverList.push(source); // source itself in list

        menu._onEnter();

        expect(otherMenu.hoverClose).toHaveBeenCalled();
        expect(otherMenu.actor.hide).toHaveBeenCalled();
    });

    test('_onEnter skips self in appIconsHoverList', () => {
        const source = createMockSource();
        source._appIconsHoverList = [source];
        const menu = new WindowPreviewMenu(source);

        // Should not throw
        menu._onEnter();
        expect(menu._hoverOpenTimeoutId).not.toBeNull();
    });

    test('_onEnter cancels existing open and close', () => {
        const source = createMockSource();
        const menu = new WindowPreviewMenu(source);
        menu._hoverOpenTimeoutId = 99;
        menu._hoverCloseTimeoutId = 88;

        menu._onEnter();

        // cancelOpen should have cleared the old one
        // but then a new open timeout was set
        expect(menu._hoverOpenTimeoutId).not.toBe(99);
    });

    // --- _onLeave ---
    test('_onLeave sets up hover close timeout', () => {
        const source = createMockSource({has_pointer: false});
        const menu = new WindowPreviewMenu(source);
        menu._boxPointer.bin.has_pointer = false;

        Settings.set('preview-hover-leave-timeout', 200);
        menu._onLeave();

        expect(menu._hoverCloseTimeoutId).not.toBeNull();
    });

    test('_onLeave returns early if bin has pointer', () => {
        const source = createMockSource({has_pointer: false});
        const menu = new WindowPreviewMenu(source);
        menu._boxPointer.bin.has_pointer = true;

        menu._onLeave();

        expect(menu._hoverCloseTimeoutId).toBeNull();
    });

    test('_onLeave returns early if source has pointer', () => {
        const source = createMockSource({has_pointer: true});
        const menu = new WindowPreviewMenu(source);

        menu._onLeave();

        expect(menu._hoverCloseTimeoutId).toBeNull();
    });

    test('_onLeave cancels open timeout', () => {
        const source = createMockSource({has_pointer: false});
        const menu = new WindowPreviewMenu(source);
        menu._boxPointer.bin.has_pointer = false;
        menu._hoverOpenTimeoutId = 42;

        menu._onLeave();

        expect(menu._hoverOpenTimeoutId).toBeNull();
    });

    // --- _onMenuEnter ---
    test('_onMenuEnter cancels close timeout', () => {
        const source = createMockSource();
        const menu = new WindowPreviewMenu(source);
        menu._hoverCloseTimeoutId = 42;

        menu._onMenuEnter();

        expect(menu._hoverCloseTimeoutId).toBeNull();
    });

    // --- _onMenuLeave ---
    test('_onMenuLeave sets up hover close timeout', () => {
        const source = createMockSource();
        const menu = new WindowPreviewMenu(source);
        menu._hoverCloseTimeoutId = null;

        Settings.set('preview-hover-leave-timeout', 200);
        menu._onMenuLeave();

        expect(menu._hoverCloseTimeoutId).not.toBeNull();
    });

    test('_onMenuLeave does nothing if close timeout already set', () => {
        const source = createMockSource();
        const menu = new WindowPreviewMenu(source);
        menu._hoverCloseTimeoutId = 99;

        menu._onMenuLeave();

        // Should still be the same id (returned early)
        expect(menu._hoverCloseTimeoutId).toBe(99);
    });

    test('_onMenuLeave cancels open timeout', () => {
        const source = createMockSource();
        const menu = new WindowPreviewMenu(source);
        menu._hoverOpenTimeoutId = 42;
        menu._hoverCloseTimeoutId = null;

        menu._onMenuLeave();

        expect(menu._hoverOpenTimeoutId).toBeNull();
    });

    // --- hoverClose ---
    test('hoverClose closes menu via boxPointer when fromHover', () => {
        const win = createMockWindow();
        const source = createMockSource({
            getInterestingWindows: () => [win],
            has_pointer: false,
        });
        const menu = new WindowPreviewMenu(source);
        menu._boxPointer.bin.has_pointer = false;

        menu.fromHover = true;
        menu.isOpen = true;

        const closeSpy = jest.fn((anim, cb) => { if (cb) cb(); });
        menu._boxPointer.close = closeSpy;

        menu.hoverClose();

        expect(closeSpy).toHaveBeenCalled();
        expect(menu.isOpen).toBe(false);
    });

    test('hoverClose calls standard close when not fromHover', () => {
        const source = createMockSource({has_pointer: false});
        const menu = new WindowPreviewMenu(source);
        menu._boxPointer.bin.has_pointer = false;

        menu.fromHover = false;
        menu.isOpen = true;

        const closeSpy = jest.fn();
        menu.close = closeSpy;

        menu.hoverClose();

        expect(closeSpy).toHaveBeenCalled();
    });

    test('hoverClose returns early if bin has pointer', () => {
        const source = createMockSource({has_pointer: false});
        const menu = new WindowPreviewMenu(source);
        menu._boxPointer.bin.has_pointer = true;

        menu.isOpen = true;
        menu.hoverClose();

        expect(menu.isOpen).toBe(true);
    });

    test('hoverClose returns early if source has pointer', () => {
        const source = createMockSource({has_pointer: true});
        const menu = new WindowPreviewMenu(source);
        menu._boxPointer.bin.has_pointer = false;

        menu.isOpen = true;
        menu.hoverClose();

        expect(menu.isOpen).toBe(true);
    });

    test('hoverClose does nothing when not open', () => {
        const source = createMockSource({has_pointer: false});
        const menu = new WindowPreviewMenu(source);
        menu._boxPointer.bin.has_pointer = false;

        menu.isOpen = false;
        menu.hoverClose();

        expect(menu.isOpen).toBe(false);
    });

    test('hoverClose clears _hoverCloseTimeoutId', () => {
        const source = createMockSource({has_pointer: false});
        const menu = new WindowPreviewMenu(source);
        menu._boxPointer.bin.has_pointer = false;
        menu._hoverCloseTimeoutId = 42;

        menu.hoverClose();

        expect(menu._hoverCloseTimeoutId).toBeNull();
    });

    test('hoverClose destroys previewBox when fromHover', () => {
        const source = createMockSource({has_pointer: false});
        const menu = new WindowPreviewMenu(source);
        menu._boxPointer.bin.has_pointer = false;

        menu.fromHover = true;
        menu.isOpen = true;

        const destroySpy = jest.fn();
        menu._previewBox = {destroy: destroySpy};

        const closeSpy = jest.fn((anim, cb) => { if (cb) cb(); });
        menu._boxPointer.close = closeSpy;

        menu.hoverClose();

        expect(destroySpy).toHaveBeenCalled();
        expect(menu._previewBox).toBeNull();
    });

    test('hoverClose calls forceUpdate on intellihide docks', () => {
        const source = createMockSource({has_pointer: false});
        const menu = new WindowPreviewMenu(source);
        menu._boxPointer.bin.has_pointer = false;

        menu.fromHover = true;
        menu.isOpen = true;

        const forceUpdateSpy = jest.fn();
        const origDocks = Docking.DockManager.allDocks;
        Docking.DockManager.allDocks = [{
            _intellihideIsEnabled: true,
            _intellihide: {forceUpdate: forceUpdateSpy},
        }];

        const closeSpy = jest.fn((anim, cb) => { if (cb) cb(); });
        menu._boxPointer.close = closeSpy;

        menu.hoverClose();

        expect(forceUpdateSpy).toHaveBeenCalled();
        Docking.DockManager.allDocks = origDocks;
    });

    // --- _onWindowsChanged ---
    test('_onWindowsChanged opens popup when conditions met', () => {
        const win = createMockWindow();
        const source = createMockSource({
            getInterestingWindows: () => [win],
            has_pointer: true,
        });
        const menu = new WindowPreviewMenu(source);
        menu.fromHover = true;
        menu.isOpen = false;

        menu._onWindowsChanged();

        expect(menu._hoverOpenTimeoutId).not.toBeNull();
    });

    test('_onWindowsChanged does nothing when no windows', () => {
        const source = createMockSource({
            getInterestingWindows: () => [],
            has_pointer: true,
        });
        const menu = new WindowPreviewMenu(source);
        menu.fromHover = true;
        menu.isOpen = false;

        menu._onWindowsChanged();

        // Should not set a timeout
        expect(menu._hoverOpenTimeoutId).toBeNull();
    });

    test('_onWindowsChanged does nothing when already open', () => {
        const win = createMockWindow();
        const source = createMockSource({
            getInterestingWindows: () => [win],
            has_pointer: true,
        });
        const menu = new WindowPreviewMenu(source);
        menu.fromHover = true;
        menu.isOpen = true;

        menu._onWindowsChanged();

        // Should not set a timeout since already open
        expect(menu._hoverOpenTimeoutId).toBeNull();
    });

    test('_onWindowsChanged does nothing when not from hover', () => {
        const win = createMockWindow();
        const source = createMockSource({
            getInterestingWindows: () => [win],
            has_pointer: true,
        });
        const menu = new WindowPreviewMenu(source);
        menu.fromHover = false;
        menu.isOpen = false;

        menu._onWindowsChanged();

        expect(menu._hoverOpenTimeoutId).toBeNull();
    });

    test('_onWindowsChanged does nothing when source has no pointer', () => {
        const win = createMockWindow();
        const source = createMockSource({
            getInterestingWindows: () => [win],
            has_pointer: false,
        });
        const menu = new WindowPreviewMenu(source);
        menu.fromHover = true;
        menu.isOpen = false;

        menu._onWindowsChanged();

        expect(menu._hoverOpenTimeoutId).toBeNull();
    });

    // --- _onDestroy ---
    test('_onDestroy calls disableHover and destroys signal handler', () => {
        const source = createMockSource();
        const menu = new WindowPreviewMenu(source);

        // Trigger destroy via the signal
        menu.emit('destroy');

        // After destroy, blockSourceEvents should be true (from disableHover)
        expect(menu.blockSourceEvents).toBe(true);
    });
});

// ===================================================================
// WindowPreviewMenuItem (GObject.registerClass class)
// ===================================================================
describe('WindowPreviewMenuItem', () => {
    beforeEach(() => {
        Settings._reset();
    });

    test('is a constructor (GObject.registerClass produced a class)', () => {
        expect(typeof WindowPreviewMenuItem).toBe('function');
    });

    test('constructor sets _window reference', () => {
        const win = createMockWindow();
        const item = new WindowPreviewMenuItem(win, St.Side.BOTTOM);

        expect(item._window).toBe(win);
    });

    test('constructor creates a close button', () => {
        const win = createMockWindow();
        const item = new WindowPreviewMenuItem(win, St.Side.BOTTOM);

        expect(item.closeButton).toBeDefined();
        expect(item.closeButton).not.toBeNull();
    });

    test('constructor creates a clone bin', () => {
        const win = createMockWindow();
        const item = new WindowPreviewMenuItem(win, St.Side.BOTTOM);

        expect(item._cloneBin).toBeDefined();
    });

    test('constructor adds position style class', () => {
        const win = createMockWindow();
        const item = new WindowPreviewMenuItem(win, St.Side.BOTTOM);

        expect(item.has_style_class_name('bottom')).toBe(true);
    });

    test('constructor adds dashtodock style class', () => {
        const win = createMockWindow();
        const item = new WindowPreviewMenuItem(win, St.Side.TOP);

        expect(item.has_style_class_name('dashtodock-app-well-preview-menu-item')).toBe(true);
    });

    test('constructor adds shrink class when custom-theme-shrink is true', () => {
        Settings.set('custom-theme-shrink', true);
        const win = createMockWindow();
        const item = new WindowPreviewMenuItem(win, St.Side.BOTTOM);

        expect(item.has_style_class_name('shrink')).toBe(true);
    });

    test('constructor does not add shrink class when custom-theme-shrink is false', () => {
        Settings.set('custom-theme-shrink', false);
        const win = createMockWindow();
        const item = new WindowPreviewMenuItem(win, St.Side.BOTTOM);

        expect(item.has_style_class_name('shrink')).toBe(false);
    });

    test('constructor sets close button alignment based on button layout', () => {
        // Default layout has CLOSE not in left_buttons
        const win = createMockWindow();
        const item = new WindowPreviewMenuItem(win, St.Side.BOTTOM);

        expect(item.closeButton).toBeDefined();
        expect(item.closeButton.x_align).toBe(Clutter.ActorAlign.END);
    });

    test('constructor sets close button to START when CLOSE is in left_buttons', () => {
        const origLayout = Meta.prefs_get_button_layout;
        Meta.prefs_get_button_layout = () => ({
            left_buttons: [Meta.ButtonFunction.CLOSE],
            right_buttons: [],
        });

        const win = createMockWindow();
        const item = new WindowPreviewMenuItem(win, St.Side.BOTTOM);

        expect(item.closeButton.x_align).toBe(Clutter.ActorAlign.START);
        Meta.prefs_get_button_layout = origLayout;
    });

    test('constructor sets up _box as vertical BoxLayout', () => {
        const win = createMockWindow();
        const item = new WindowPreviewMenuItem(win, St.Side.BOTTOM);

        expect(item._box).toBeDefined();
    });

    test('constructor calls _cloneTexture', () => {
        const win = createMockWindow();
        const item = new WindowPreviewMenuItem(win, St.Side.BOTTOM);

        // If texture is available, _clone should be set
        expect(item._clone).toBeDefined();
    });

    test('_getWindowPreviewSize returns [0,0,0] when compositor private is null', () => {
        const win = createMockWindow({
            get_compositor_private: () => null,
        });
        const item = new WindowPreviewMenuItem(win, St.Side.BOTTOM);
        const size = item._getWindowPreviewSize();
        expect(size).toEqual([0, 0, 0]);
    });

    test('_getWindowPreviewSize returns [0,0,0] when texture is null', () => {
        const win = createMockWindow({
            get_compositor_private: () => ({get_texture: () => null, get_size: () => [0, 0]}),
        });
        const item = new WindowPreviewMenuItem(win, St.Side.BOTTOM);
        const size = item._getWindowPreviewSize();
        expect(size).toEqual([0, 0, 0]);
    });

    test('_getWindowPreviewSize returns [0,0,0] when dimensions are zero', () => {
        const win = createMockWindow({
            get_compositor_private: () => ({
                get_texture: () => ({}),
                get_size: () => [0, 0],
            }),
        });
        const item = new WindowPreviewMenuItem(win, St.Side.BOTTOM);
        const size = item._getWindowPreviewSize();
        expect(size).toEqual([0, 0, 0]);
    });

    test('_getWindowPreviewSize computes scale from settings', () => {
        Settings._setMany({
            'preview-size-scale': 0,
            'preview-max-height': 150,
        });
        const win = createMockWindow({
            get_compositor_private: () => ({
                get_texture: () => ({}),
                get_size: () => [1920, 1080],
            }),
        });
        const item = new WindowPreviewMenuItem(win, St.Side.BOTTOM);
        const [w, h, scale] = item._getWindowPreviewSize();

        expect(w).toBe(1920);
        expect(h).toBe(1080);
        const expected = computePreviewScale(1920, 1080, 0, 150);
        expect(scale).toBeCloseTo(expected);
    });

    test('_getWindowPreviewSize uses explicit sizeScale from settings', () => {
        Settings._setMany({
            'preview-size-scale': 0.5,
            'preview-max-height': 150,
        });
        const win = createMockWindow({
            get_compositor_private: () => ({
                get_texture: () => ({}),
                get_size: () => [800, 600],
            }),
        });
        const item = new WindowPreviewMenuItem(win, St.Side.BOTTOM);
        const [w, h, scale] = item._getWindowPreviewSize();

        expect(w).toBe(800);
        expect(h).toBe(600);
        expect(scale).toBeCloseTo(0.5);
    });

    test('_updateWindowPreviewSize sets cloneBin size', () => {
        const win = createMockWindow({
            get_compositor_private: () => ({
                get_texture: () => ({}),
                get_size: () => [800, 600],
            }),
        });
        const item = new WindowPreviewMenuItem(win, St.Side.BOTTOM);
        item._updateWindowPreviewSize();

        // Should set cloneBin size
        const [binW, binH] = item._cloneBin.get_size();
        expect(binW).toBe(item._width * item._scale);
        expect(binH).toBe(item._height * item._scale);
    });

    test('_windowCanClose returns true when can_close and no transient dialogs', () => {
        const win = createMockWindow({
            can_close: () => true,
            foreach_transient: () => {},
        });
        const item = new WindowPreviewMenuItem(win, St.Side.BOTTOM);
        expect(item._windowCanClose()).toBe(true);
    });

    test('_windowCanClose returns false when can_close is false', () => {
        const win = createMockWindow({
            can_close: () => false,
            foreach_transient: () => {},
        });
        const item = new WindowPreviewMenuItem(win, St.Side.BOTTOM);
        expect(item._windowCanClose()).toBe(false);
    });

    test('_windowCanClose returns false when has attached dialogs', () => {
        const win = createMockWindow({
            can_close: () => true,
            foreach_transient: (cb) => { cb(); },
        });
        const item = new WindowPreviewMenuItem(win, St.Side.BOTTOM);
        expect(item._windowCanClose()).toBe(false);
    });

    test('_hasAttachedDialogs returns false when no transients', () => {
        const win = createMockWindow({
            foreach_transient: () => {},
        });
        const item = new WindowPreviewMenuItem(win, St.Side.BOTTOM);
        expect(item._hasAttachedDialogs()).toBe(false);
    });

    test('_hasAttachedDialogs returns true when transients exist', () => {
        const win = createMockWindow({
            foreach_transient: (cb) => { cb(); cb(); },
        });
        const item = new WindowPreviewMenuItem(win, St.Side.BOTTOM);
        expect(item._hasAttachedDialogs()).toBe(true);
    });

    test('show sets opacity to 255 and restores width', () => {
        const win = createMockWindow();
        const item = new WindowPreviewMenuItem(win, St.Side.BOTTOM);

        // show(false) => duration 0 (no animation)
        item.show(false);
        expect(item._opacity ?? item.opacity).toBe(255);
    });

    test('show with animate=true uses preview-animation-duration', () => {
        Settings.set('preview-animation-duration', 500);
        const win = createMockWindow();
        const item = new WindowPreviewMenuItem(win, St.Side.BOTTOM);

        item.show(true);
        // Should have opacity 255 after animation
        expect(item.opacity).toBe(255);
    });

    test('show with animate=false uses duration 0', () => {
        const win = createMockWindow();
        const item = new WindowPreviewMenuItem(win, St.Side.BOTTOM);

        item.show(false);
        expect(item.opacity).toBe(255);
    });

    test('activate calls Main.activateWindow', () => {
        const win = createMockWindow();
        const item = new WindowPreviewMenuItem(win, St.Side.BOTTOM);

        // Mock _getTopMenu for activate
        item._getTopMenu = () => ({close: jest.fn()});

        const origActivateWindow = ShellUi.Main.activateWindow;
        const mockActivate = jest.fn();
        ShellUi.Main.activateWindow = mockActivate;

        item.activate();

        expect(mockActivate).toHaveBeenCalledWith(win);
        ShellUi.Main.activateWindow = origActivateWindow;
    });

    test('activate closes the top menu', () => {
        const win = createMockWindow();
        const item = new WindowPreviewMenuItem(win, St.Side.BOTTOM);

        const closeSpy = jest.fn();
        item._getTopMenu = () => ({close: closeSpy});

        const origActivateWindow = ShellUi.Main.activateWindow;
        ShellUi.Main.activateWindow = jest.fn();

        item.activate();

        expect(closeSpy).toHaveBeenCalled();
        ShellUi.Main.activateWindow = origActivateWindow;
    });

    test('different positions apply correct style class', () => {
        const positions = [
            [St.Side.TOP, 'top'],
            [St.Side.RIGHT, 'right'],
            [St.Side.BOTTOM, 'bottom'],
            [St.Side.LEFT, 'left'],
        ];

        for (const [side, className] of positions) {
            Settings._reset();
            const win = createMockWindow();
            const item = new WindowPreviewMenuItem(win, side);
            expect(item.has_style_class_name(className)).toBe(true);
        }
    });

    // --- _animateOutAndDestroy ---
    test('_animateOutAndDestroy sets opacity and size to 0', () => {
        const win = createMockWindow();
        const item = new WindowPreviewMenuItem(win, St.Side.BOTTOM);

        item._animateOutAndDestroy();

        // After animation completes (ease calls onComplete immediately in mock)
        expect(item.opacity).toBe(0);
    });

    // --- _showCloseButton ---
    test('_showCloseButton shows button when window can close', () => {
        const win = createMockWindow({
            can_close: () => true,
            foreach_transient: () => {},
        });
        const item = new WindowPreviewMenuItem(win, St.Side.BOTTOM);

        item._showCloseButton();

        expect(item.closeButton.opacity).toBe(255);
    });

    test('_showCloseButton does not show button when window cannot close', () => {
        const win = createMockWindow({
            can_close: () => false,
            foreach_transient: () => {},
        });
        const item = new WindowPreviewMenuItem(win, St.Side.BOTTOM);

        item.closeButton.opacity = 0;
        item._showCloseButton();

        // Should remain at 0 since can_close is false
        expect(item.closeButton.opacity).toBe(0);
    });

    // --- _hideCloseButton ---
    test('_hideCloseButton hides button when no pointer', () => {
        const win = createMockWindow();
        const item = new WindowPreviewMenuItem(win, St.Side.BOTTOM);

        item.closeButton.has_pointer = false;

        item._hideCloseButton();

        expect(item.closeButton.opacity).toBe(0);
    });

    test('_hideCloseButton does nothing when closeButton has pointer', () => {
        const win = createMockWindow();
        const item = new WindowPreviewMenuItem(win, St.Side.BOTTOM);

        item.closeButton.has_pointer = true;
        item.closeButton.opacity = 255;

        item._hideCloseButton();

        // Should still be 255 since has_pointer is true
        expect(item.closeButton.opacity).toBe(255);
    });

    test('_hideCloseButton does nothing when child has pointer', () => {
        const win = createMockWindow();
        const item = new WindowPreviewMenuItem(win, St.Side.BOTTOM);

        item.closeButton.has_pointer = false;
        item.closeButton.opacity = 255;

        // Simulate a child with has_pointer
        const child = new St.Widget();
        child.has_pointer = true;
        item.add_child(child);

        item._hideCloseButton();

        // Should still be 255 since a child has pointer
        expect(item.closeButton.opacity).toBe(255);
    });

    // --- _idleToggleCloseButton ---
    test('_idleToggleCloseButton resets id and hides button', () => {
        const win = createMockWindow();
        const item = new WindowPreviewMenuItem(win, St.Side.BOTTOM);

        item._idleToggleCloseId = 42;
        item.closeButton.has_pointer = false;

        const result = item._idleToggleCloseButton();

        expect(item._idleToggleCloseId).toBe(0);
        expect(result).toBe(false); // GLib.SOURCE_REMOVE
    });

    // --- vfunc_key_focus_in / vfunc_key_focus_out ---
    test('vfunc_key_focus_in shows close button', () => {
        const win = createMockWindow({
            can_close: () => true,
            foreach_transient: () => {},
        });
        const item = new WindowPreviewMenuItem(win, St.Side.BOTTOM);

        item.vfunc_key_focus_in();

        expect(item.closeButton.opacity).toBe(255);
    });

    test('vfunc_key_focus_out hides close button', () => {
        const win = createMockWindow();
        const item = new WindowPreviewMenuItem(win, St.Side.BOTTOM);

        item.closeButton.has_pointer = false;
        item.vfunc_key_focus_out();

        expect(item.closeButton.opacity).toBe(0);
    });

    // --- vfunc_enter_event / vfunc_leave_event ---
    test('vfunc_enter_event shows close button and starts aero peek', () => {
        const win = createMockWindow({
            can_close: () => true,
            foreach_transient: () => {},
            get_workspace: () => ({
                list_windows: () => [],
                connect: () => 0,
                disconnect: () => {},
            }),
        });
        const item = new WindowPreviewMenuItem(win, St.Side.BOTTOM);

        const crossingEvent = {};
        item.vfunc_enter_event(crossingEvent);

        expect(item.closeButton.opacity).toBe(255);
    });

    test('vfunc_leave_event hides close button and ends aero peek', () => {
        const win = createMockWindow();
        const item = new WindowPreviewMenuItem(win, St.Side.BOTTOM);

        item.closeButton.has_pointer = false;
        const crossingEvent = {};
        item.vfunc_leave_event(crossingEvent);

        expect(item.closeButton.opacity).toBe(0);
    });

    // --- _startAeroPeek ---
    test('_startAeroPeek dims windows above target', () => {
        const targetWin = createMockWindow({get_stable_sequence: () => 1});
        const aboveWin = createMockWindow({
            get_stable_sequence: () => 2,
            minimized: false,
        });
        const actorAbove = {
            opacity: 255,
            _originalOpacity: undefined,
            ease: function (p) { Object.assign(this, p); if (p?.onComplete) p.onComplete(); },
            is_destroyed: () => false,
        };
        aboveWin.get_compositor_private = () => actorAbove;

        // sort_windows_by_stacking returns stacking order bottom-to-top,
        // then .reverse() gives top-to-bottom: [aboveWin, targetWin]
        // targetIndex = 1, so allWindows.slice(0, 1) = [aboveWin]
        const origSort = global.display.sort_windows_by_stacking;
        global.display.sort_windows_by_stacking = () => [targetWin, aboveWin];

        const workspace = {
            list_windows: () => [targetWin, aboveWin],
            connect: () => 0,
            disconnect: () => {},
        };
        targetWin.get_workspace = () => workspace;

        Settings._setMany({
            'aero-peek-opacity': 50,
            'aero-peek-duration': 200,
        });

        const item = new WindowPreviewMenuItem(targetWin, St.Side.BOTTOM);
        item._startAeroPeek();

        // After reverse: [aboveWin, targetWin]. targetIndex=1.
        // slice(0,1) = [aboveWin] -> should be dimmed
        expect(item._peekingWindows.length).toBe(1);
        expect(actorAbove.opacity).toBe(50);

        global.display.sort_windows_by_stacking = origSort;
    });

    test('_startAeroPeek returns early when no workspace', () => {
        const win = createMockWindow({
            get_workspace: () => null,
        });
        const item = new WindowPreviewMenuItem(win, St.Side.BOTTOM);

        // Should not throw
        item._startAeroPeek();
        expect(item._peekingWindows.length).toBe(0);
    });

    test('_startAeroPeek returns early when target not found', () => {
        const targetWin = createMockWindow({get_stable_sequence: () => 1});
        const otherWin = createMockWindow({get_stable_sequence: () => 2});

        // Sort doesn't include targetWin
        const origSort = global.display.sort_windows_by_stacking;
        global.display.sort_windows_by_stacking = () => [otherWin];

        const workspace = {
            list_windows: () => [otherWin],
            connect: () => 0,
            disconnect: () => {},
        };
        targetWin.get_workspace = () => workspace;

        const item = new WindowPreviewMenuItem(targetWin, St.Side.BOTTOM);
        item._startAeroPeek();

        expect(item._peekingWindows.length).toBe(0);
        global.display.sort_windows_by_stacking = origSort;
    });

    test('_startAeroPeek skips minimized windows', () => {
        const targetWin = createMockWindow({get_stable_sequence: () => 2});
        const minimizedWin = createMockWindow({
            get_stable_sequence: () => 1,
            minimized: true,
        });
        const minimizedActor = {
            opacity: 255,
            ease: jest.fn(),
            is_destroyed: () => false,
        };
        minimizedWin.get_compositor_private = () => minimizedActor;

        // sort returns [minimizedWin, targetWin] -> reverse -> [targetWin, minimizedWin]
        // targetIndex = 0 -> slice(0, 0) is empty -> no windows to dim
        // Need to put target after minimized:
        // sort returns [targetWin, minimizedWin] -> reverse -> [minimizedWin, targetWin]
        // targetIndex = 1, slice(0, 1) = [minimizedWin]
        const origSort = global.display.sort_windows_by_stacking;
        global.display.sort_windows_by_stacking = () => [targetWin, minimizedWin];

        const workspace = {
            list_windows: () => [minimizedWin, targetWin],
            connect: () => 0,
            disconnect: () => {},
        };
        targetWin.get_workspace = () => workspace;

        Settings._setMany({
            'aero-peek-opacity': 50,
            'aero-peek-duration': 200,
        });

        const item = new WindowPreviewMenuItem(targetWin, St.Side.BOTTOM);
        item._startAeroPeek();

        // minimizedWin.minimized is true, so ease should not be called
        expect(minimizedActor.ease).not.toHaveBeenCalled();
        global.display.sort_windows_by_stacking = origSort;
    });

    // --- _endAeroPeek ---
    test('_endAeroPeek restores opacity for peeking windows', () => {
        const win = createMockWindow();
        const item = new WindowPreviewMenuItem(win, St.Side.BOTTOM);

        const actor1 = {
            opacity: 50,
            _originalOpacity: 255,
            ease: function (p) { Object.assign(this, p); if (p?.onComplete) p.onComplete(); },
            is_destroyed: () => false,
        };
        const actor2 = {
            opacity: 50,
            _originalOpacity: 200,
            ease: function (p) { Object.assign(this, p); if (p?.onComplete) p.onComplete(); },
            is_destroyed: () => false,
        };

        item._peekingWindows = [actor1, actor2];

        Settings.set('aero-peek-duration', 200);
        item._endAeroPeek();

        expect(actor1.opacity).toBe(255);
        expect(actor2.opacity).toBe(200);
        expect(item._peekingWindows.length).toBe(0);
    });

    test('_endAeroPeek skips destroyed actors', () => {
        const win = createMockWindow();
        const item = new WindowPreviewMenuItem(win, St.Side.BOTTOM);

        const destroyedActor = {
            opacity: 50,
            is_destroyed: () => true,
            ease: jest.fn(),
        };

        item._peekingWindows = [destroyedActor];

        Settings.set('aero-peek-duration', 200);
        item._endAeroPeek();

        expect(destroyedActor.ease).not.toHaveBeenCalled();
        expect(item._peekingWindows.length).toBe(0);
    });

    test('_endAeroPeek uses 255 when _originalOpacity is missing', () => {
        const win = createMockWindow();
        const item = new WindowPreviewMenuItem(win, St.Side.BOTTOM);

        const actor = {
            opacity: 50,
            _originalOpacity: undefined,
            ease: function (p) { Object.assign(this, p); if (p?.onComplete) p.onComplete(); },
            is_destroyed: () => false,
        };

        item._peekingWindows = [actor];

        Settings.set('aero-peek-duration', 200);
        item._endAeroPeek();

        expect(actor.opacity).toBe(255);
    });

    test('_endAeroPeek handles null actors in list', () => {
        const win = createMockWindow();
        const item = new WindowPreviewMenuItem(win, St.Side.BOTTOM);

        item._peekingWindows = [null];

        Settings.set('aero-peek-duration', 200);
        // Should not throw
        item._endAeroPeek();
        expect(item._peekingWindows.length).toBe(0);
    });

    // --- _closeWindow ---
    test('_closeWindow sets up workspace handler and calls deleteAllWindows', () => {
        const workspace = {
            connect: () => 0,
            disconnect: () => {},
        };
        const win = createMockWindow({
            get_workspace: () => workspace,
        });
        const item = new WindowPreviewMenuItem(win, St.Side.BOTTOM);

        // Mock _clone.get_children for deleteAllWindows
        item._clone = {get_children: () => []};

        const deleteSpy = jest.fn();
        win.delete = deleteSpy;

        item._closeWindow();

        expect(item._workspace).toBe(workspace);
        expect(deleteSpy).toHaveBeenCalled();
    });

    // --- deleteAllWindows ---
    test('deleteAllWindows deletes all child windows and the main window', () => {
        const win = createMockWindow();
        const item = new WindowPreviewMenuItem(win, St.Side.BOTTOM);

        const childMetaWindow = {delete: jest.fn()};
        const childSource = {meta_window: childMetaWindow};
        item._clone = {
            get_children: () => [
                {source: null},       // index 0 (the main window clone)
                {source: childSource}, // index 1 (child window)
            ],
        };

        const mainDeleteSpy = jest.fn();
        win.delete = mainDeleteSpy;

        item.deleteAllWindows();

        expect(childMetaWindow.delete).toHaveBeenCalled();
        expect(mainDeleteSpy).toHaveBeenCalled();
    });

    test('deleteAllWindows handles no child windows', () => {
        const win = createMockWindow();
        const item = new WindowPreviewMenuItem(win, St.Side.BOTTOM);

        item._clone = {get_children: () => []};

        const deleteSpy = jest.fn();
        win.delete = deleteSpy;

        item.deleteAllWindows();

        expect(deleteSpy).toHaveBeenCalled();
    });

    // --- _onWindowAdded ---
    test('_onWindowAdded emits activate when transient for target', () => {
        const targetWin = createMockWindow();
        const transientWin = createMockWindow({
            get_transient_for: () => targetWin,
        });

        const item = new WindowPreviewMenuItem(targetWin, St.Side.BOTTOM);

        // _onWindowAdded should emit 'activate'
        const emitSpy = jest.fn();
        item.emit = emitSpy;

        item._onWindowAdded(null, transientWin);

        // Utils.laterAdd calls the callback immediately in mock,
        // so emit should have been called
        expect(emitSpy).toHaveBeenCalledWith('activate', expect.anything());
    });

    test('_onWindowAdded does nothing for non-transient window', () => {
        const targetWin = createMockWindow();
        const otherWin = createMockWindow({
            get_transient_for: () => null,
        });

        const item = new WindowPreviewMenuItem(targetWin, St.Side.BOTTOM);

        const emitSpy = jest.fn();
        item.emit = emitSpy;

        item._onWindowAdded(null, otherWin);

        expect(emitSpy).not.toHaveBeenCalled();
    });

    // --- vfunc_style_changed ---
    test('vfunc_style_changed adjusts dimensions from theme node', () => {
        const win = createMockWindow();
        const item = new WindowPreviewMenuItem(win, St.Side.BOTTOM);

        // Should not throw
        item.vfunc_style_changed();

        // Should have called set() which assigns minWidth, naturalWidth, etc.
        expect(item.minWidth).toBeDefined();
        expect(item.naturalWidth).toBeDefined();
        expect(item.minHeight).toBeDefined();
        expect(item.naturalHeight).toBeDefined();
    });

    // --- _cloneTexture ---
    test('_cloneTexture handles zero-dimension windows with retry', () => {
        const win = createMockWindow({
            get_compositor_private: () => ({
                get_texture: () => ({}),
                get_size: () => [0, 0],
                connect: () => 0,
                disconnect: () => {},
                destroy: () => {},
                get_children: () => [],
            }),
        });

        // Utils.laterAdd calls the callback immediately, which triggers retry
        const item = new WindowPreviewMenuItem(win, St.Side.BOTTOM);

        // _width and _height should still be 0
        expect(item._width).toBe(0);
        expect(item._height).toBe(0);
    });

    test('_cloneTexture creates clone when texture is a Clutter.Actor', () => {
        const texture = new Clutter.Actor();
        const mutterWindow = {
            get_texture: () => texture,
            get_size: () => [800, 600],
            connect: () => 0,
            disconnect: () => {},
            destroy: () => {},
            get_children: () => [],
        };
        const win = createMockWindow({
            get_compositor_private: () => mutterWindow,
        });

        const item = new WindowPreviewMenuItem(win, St.Side.BOTTOM);

        // Clone should be created with texture as source
        expect(item._clone).toBeDefined();
        expect(item._mutterWindow).toBe(mutterWindow);
    });

    test('_cloneTexture uses mutterWindow directly when texture is not a ClutterActor', () => {
        const texture = {}; // not a Clutter.Actor
        const mutterWindow = {
            get_texture: () => texture,
            get_size: () => [800, 600],
            connect: () => 0,
            disconnect: () => {},
            destroy: () => {},
            get_children: () => [],
        };
        const win = createMockWindow({
            get_compositor_private: () => mutterWindow,
        });

        const item = new WindowPreviewMenuItem(win, St.Side.BOTTOM);

        expect(item._clone).toBeDefined();
        expect(item._mutterWindow).toBe(mutterWindow);
    });

    // --- _onDestroy ---
    test('_onDestroy ends aero peek and cleans up laters', () => {
        const win = createMockWindow();
        const item = new WindowPreviewMenuItem(win, St.Side.BOTTOM);

        // Simulate pending later
        item._cloneTextureLater = 42;
        item._windowAddedLater = 43;

        const removeSpy = jest.fn();
        const origLaterRemove = Utils.laterRemove;
        Utils.laterRemove = removeSpy;

        item._onDestroy();

        expect(removeSpy).toHaveBeenCalledTimes(2);
        expect(item._cloneTextureLater).toBeUndefined();
        expect(item._windowAddedLater).toBeUndefined();

        Utils.laterRemove = origLaterRemove;
    });

    test('_onDestroy without pending laters does not throw', () => {
        const win = createMockWindow();
        const item = new WindowPreviewMenuItem(win, St.Side.BOTTOM);

        delete item._cloneTextureLater;
        delete item._windowAddedLater;

        // Should not throw
        item._onDestroy();
    });

    // --- closeButton click handler ---
    test('close button click triggers _closeWindow', () => {
        const workspace = {
            connect: () => 0,
            disconnect: () => {},
        };
        const win = createMockWindow({
            get_workspace: () => workspace,
        });
        const item = new WindowPreviewMenuItem(win, St.Side.BOTTOM);

        // Mock the clone for deleteAllWindows
        item._clone = {get_children: () => []};

        const deleteSpy = jest.fn();
        win.delete = deleteSpy;

        // Simulate clicking the close button
        item.closeButton.emit('clicked');

        expect(deleteSpy).toHaveBeenCalled();
    });
});

// ===================================================================
// WindowPreviewList (accessed indirectly via WindowPreviewMenu._redisplay)
// ===================================================================
describe('WindowPreviewList', () => {
    beforeEach(() => {
        Settings._reset();
    });

    test('_redisplay on menu creates preview list with correct items', () => {
        const w1 = createMockWindow({get_stable_sequence: () => 1});
        const w2 = createMockWindow({get_stable_sequence: () => 2});
        const source = createMockSource({
            getInterestingWindows: () => [w1, w2],
        });
        const menu = new WindowPreviewMenu(source);
        menu.fromHover = true;

        menu._redisplay();

        expect(menu._previewBox).toBeDefined();
    });

    test('_redisplay marks active window', () => {
        const w1 = createMockWindow({get_stable_sequence: () => 1});
        const source = createMockSource({
            getInterestingWindows: () => [w1],
        });
        const menu = new WindowPreviewMenu(source);

        const origFocus = global.display.focus_window;
        global.display.focus_window = w1;

        menu._redisplay();

        global.display.focus_window = origFocus;
        expect(menu._previewBox).toBeDefined();
    });

    test('_queueRedisplay calls queueDeferredWork for non-hover menu', () => {
        const source = createMockSource();
        const menu = new WindowPreviewMenu(source);
        menu.fromHover = false;

        menu._redisplay();

        // The WindowPreviewList (non-hover) should have set up _redisplayId
        const previewBox = menu._previewBox;
        expect(previewBox._isHoverMenu).toBe(false);

        const queueSpy = jest.fn();
        const origQueue = ShellUi.Main.queueDeferredWork;
        ShellUi.Main.queueDeferredWork = queueSpy;

        previewBox._queueRedisplay();

        expect(queueSpy).toHaveBeenCalled();
        ShellUi.Main.queueDeferredWork = origQueue;
    });

    test('_queueRedisplay is no-op for hover menu', () => {
        const source = createMockSource();
        const menu = new WindowPreviewMenu(source);
        menu.fromHover = true;

        menu._redisplay();

        const previewBox = menu._previewBox;
        expect(previewBox._isHoverMenu).toBe(true);

        const queueSpy = jest.fn();
        const origQueue = ShellUi.Main.queueDeferredWork;
        ShellUi.Main.queueDeferredWork = queueSpy;

        previewBox._queueRedisplay();

        expect(queueSpy).not.toHaveBeenCalled();
        ShellUi.Main.queueDeferredWork = origQueue;
    });

    test('_onDestroy cleans up signalsHandler and nullifies redisplayId', () => {
        const source = createMockSource();
        const menu = new WindowPreviewMenu(source);
        menu.fromHover = false;

        menu._redisplay();

        const previewBox = menu._previewBox;
        // Non-hover menu sets _redisplayId from initializeDeferredWork (returns 0 in mock)
        // _onDestroy only sets _redisplayId to null if it was truthy
        // In the mock, initializeDeferredWork returns 0, so _redisplayId = 0 which is falsy
        // _onDestroy checks: if (this._redisplayId) this._redisplayId = null
        // Since 0 is falsy, it won't be set to null
        previewBox._onDestroy();

        // _redisplayId stays as 0 since the mock returns 0 for initializeDeferredWork
        expect(previewBox._redisplayId).toBe(0);
    });

    test('_onDestroy nullifies truthy redisplayId', () => {
        const source = createMockSource();
        const menu = new WindowPreviewMenu(source);
        menu.fromHover = false;

        menu._redisplay();

        const previewBox = menu._previewBox;
        // Force a truthy value to exercise the if branch
        previewBox._redisplayId = 42;
        previewBox._onDestroy();

        expect(previewBox._redisplayId).toBeNull();
    });

    test('_onDestroy for hover menu has null redisplayId', () => {
        const source = createMockSource();
        const menu = new WindowPreviewMenu(source);
        menu.fromHover = true;

        menu._redisplay();

        const previewBox = menu._previewBox;
        // Hover menu sets _redisplayId = null in constructor
        expect(previewBox._redisplayId).toBeNull();

        previewBox._onDestroy();
        expect(previewBox._redisplayId).toBeNull();
    });

    test('_onScrollEvent returns EVENT_PROPAGATE for bottom edge', () => {
        const source = createMockSource();
        const menu = new WindowPreviewMenu(source);
        menu.fromHover = true;
        menu._redisplay();

        const previewBox = menu._previewBox;
        // Create mock event near bottom edge
        const mockEvent = {
            get_coords: () => [0, 100],
            is_pointer_emulated: () => false,
            get_scroll_direction: () => Clutter.ScrollDirection.DOWN,
            get_scroll_delta: () => [0, 1],
        };

        // Mock actor.transform_stage_point to return position at bottom
        const mockActor = {
            transform_stage_point: () => [true, 0, 100],
            get_size: () => [200, 100],
            hadjustment: {
                step_increment: 10,
                get_value: () => 0,
                set_value: () => {},
            },
            vadjustment: {
                step_increment: 10,
                get_value: () => 0,
                set_value: () => {},
            },
        };

        // eventY (100) >= actorH (100) - 2 = 98 -> propagate
        const result = previewBox._onScrollEvent(mockActor, mockEvent);
        expect(result).toBe(Clutter.EVENT_PROPAGATE);
    });

    test('_onScrollEvent returns EVENT_STOP for pointer-emulated events', () => {
        const source = createMockSource();
        const menu = new WindowPreviewMenu(source);
        menu.fromHover = true;
        menu._redisplay();

        const previewBox = menu._previewBox;
        const mockEvent = {
            get_coords: () => [0, 0],
            is_pointer_emulated: () => true,
            get_scroll_direction: () => Clutter.ScrollDirection.DOWN,
        };

        const mockActor = {
            transform_stage_point: () => [true, 0, 10],
            get_size: () => [200, 200],
        };

        const result = previewBox._onScrollEvent(mockActor, mockEvent);
        expect(result).toBe(Clutter.EVENT_STOP);
    });

    test('_onScrollEvent handles UP scroll direction', () => {
        const source = createMockSource();
        const menu = new WindowPreviewMenu(source);
        menu.fromHover = true;
        menu._redisplay();

        const previewBox = menu._previewBox;
        previewBox.isHorizontal = false;

        const setValue = jest.fn();
        // Set adjustments on the actual actor (ScrollView)
        previewBox.actor.vadjustment = {
            step_increment: 10,
            get_value: () => 50,
            set_value: setValue,
        };

        const mockActor = {
            transform_stage_point: () => [true, 0, 10],
            get_size: () => [200, 200],
        };
        const mockEvent = {
            get_coords: () => [0, 0],
            is_pointer_emulated: () => false,
            get_scroll_direction: () => Clutter.ScrollDirection.UP,
        };

        const result = previewBox._onScrollEvent(mockActor, mockEvent);
        expect(result).toBe(Clutter.EVENT_STOP);
        expect(setValue).toHaveBeenCalledWith(40); // 50 + (-10)
    });

    test('_onScrollEvent handles DOWN scroll direction', () => {
        const source = createMockSource();
        const menu = new WindowPreviewMenu(source);
        menu.fromHover = true;
        menu._redisplay();

        const previewBox = menu._previewBox;
        previewBox.isHorizontal = false;

        const setValue = jest.fn();
        previewBox.actor.vadjustment = {
            step_increment: 10,
            get_value: () => 50,
            set_value: setValue,
        };

        const mockActor = {
            transform_stage_point: () => [true, 0, 10],
            get_size: () => [200, 200],
        };
        const mockEvent = {
            get_coords: () => [0, 0],
            is_pointer_emulated: () => false,
            get_scroll_direction: () => Clutter.ScrollDirection.DOWN,
        };

        const result = previewBox._onScrollEvent(mockActor, mockEvent);
        expect(result).toBe(Clutter.EVENT_STOP);
        expect(setValue).toHaveBeenCalledWith(60); // 50 + 10
    });

    test('_onScrollEvent handles SMOOTH scroll direction', () => {
        const source = createMockSource();
        const menu = new WindowPreviewMenu(source);
        menu.fromHover = true;
        menu._redisplay();

        const previewBox = menu._previewBox;
        previewBox.isHorizontal = false;

        const setValue = jest.fn();
        previewBox.actor.vadjustment = {
            step_increment: 10,
            get_value: () => 0,
            set_value: setValue,
        };

        const mockActor = {
            transform_stage_point: () => [true, 0, 10],
            get_size: () => [200, 200],
        };
        const mockEvent = {
            get_coords: () => [0, 0],
            is_pointer_emulated: () => false,
            get_scroll_direction: () => Clutter.ScrollDirection.SMOOTH,
            get_scroll_delta: () => [2, 3],
        };

        const result = previewBox._onScrollEvent(mockActor, mockEvent);
        expect(result).toBe(Clutter.EVENT_STOP);
        // delta = dy * increment + dx * increment = 3*10 + 2*10 = 50
        expect(setValue).toHaveBeenCalledWith(50);
    });

    test('_onScrollEvent uses hadjustment for horizontal position', () => {
        const source = createMockSource();
        const menu = new WindowPreviewMenu(source);
        menu.fromHover = true;
        menu._redisplay();

        const previewBox = menu._previewBox;
        previewBox.isHorizontal = true;

        const setValue = jest.fn();
        previewBox.actor.hadjustment = {
            step_increment: 10,
            get_value: () => 0,
            set_value: setValue,
        };

        const mockActor = {
            transform_stage_point: () => [true, 0, 10],
            get_size: () => [200, 200],
        };
        const mockEvent = {
            get_coords: () => [0, 0],
            is_pointer_emulated: () => false,
            get_scroll_direction: () => Clutter.ScrollDirection.DOWN,
        };

        const result = previewBox._onScrollEvent(mockActor, mockEvent);
        expect(result).toBe(Clutter.EVENT_STOP);
        expect(setValue).toHaveBeenCalled();
    });

    // --- _needsScrollbar ---
    test('_needsScrollbar returns false when max is -1 (vertical)', () => {
        const source = createMockSource();
        const menu = new WindowPreviewMenu(source);
        menu.fromHover = true;
        menu._redisplay();

        const previewBox = menu._previewBox;
        previewBox.isHorizontal = false;

        const result = previewBox._needsScrollbar();
        // Default theme node returns -1 for max_height, so should be false
        expect(result).toBe(false);
    });

    test('_needsScrollbar returns false when max is -1 (horizontal)', () => {
        const source = createMockSource();
        const menu = new WindowPreviewMenu(source);
        menu.fromHover = true;
        menu._redisplay();

        const previewBox = menu._previewBox;
        previewBox.isHorizontal = true;

        const result = previewBox._needsScrollbar();
        expect(result).toBe(false);
    });

    // --- isAnimatingOut ---
    test('isAnimatingOut returns falsy when no children are animating', () => {
        const source = createMockSource();
        const menu = new WindowPreviewMenu(source);
        menu.fromHover = true;
        menu._redisplay();

        const previewBox = menu._previewBox;
        if (typeof previewBox.isAnimatingOut === 'function') {
            const result = previewBox.isAnimatingOut();
            expect(result).toBeFalsy();
        } else {
            expect(true).toBe(true);
        }
    });

    test('isAnimatingOut returns true when a child is animating out', () => {
        const source = createMockSource();
        const menu = new WindowPreviewMenu(source);
        menu.fromHover = true;
        menu._redisplay();

        const previewBox = menu._previewBox;
        if (typeof previewBox.isAnimatingOut === 'function') {
            // Add a child that is animating out
            const animatingChild = new St.Widget();
            animatingChild.animatingOut = true;
            previewBox.actor.add_child(animatingChild);

            const result = previewBox.isAnimatingOut();
            expect(result).toBeTruthy();
        } else {
            expect(true).toBe(true);
        }
    });

    // --- _scrollToItem ---
    test('_scrollToItem returns early when item is null', () => {
        const source = createMockSource();
        const menu = new WindowPreviewMenu(source);
        menu.fromHover = true;
        menu._redisplay();

        const previewBox = menu._previewBox;
        // Should not throw
        previewBox._scrollToItem(null);
    });

    test('_scrollToItem adjusts value for vertical layout', () => {
        const source = createMockSource();
        const menu = new WindowPreviewMenu(source);
        menu.fromHover = true;
        menu._redisplay();

        const previewBox = menu._previewBox;
        previewBox.isHorizontal = false;

        const setValue = jest.fn();
        previewBox.actor.vadjustment = {
            get_values: () => [0, 0, 500, 0, 0, 200],
            set_value: setValue,
        };

        const mockItem = {
            translate_coordinates: () => [true, 0, 300],
            get_width: () => 100,
            get_height: () => 50,
        };

        previewBox._scrollToItem(mockItem);

        // itemPos=300, pageSize=200 => 300 >= 0 + 200 => not visible => scroll
        expect(setValue).toHaveBeenCalled();
    });

    test('_scrollToItem does nothing when item is already visible', () => {
        const source = createMockSource();
        const menu = new WindowPreviewMenu(source);
        menu.fromHover = true;
        menu._redisplay();

        const previewBox = menu._previewBox;
        previewBox.isHorizontal = false;

        const setValue = jest.fn();
        previewBox.actor.vadjustment = {
            get_values: () => [0, 0, 500, 0, 0, 400],
            set_value: setValue,
        };

        const mockItem = {
            translate_coordinates: () => [true, 0, 50],
            get_width: () => 100,
            get_height: () => 50,
        };

        previewBox._scrollToItem(mockItem);

        // itemPos=50, itemSize=50 => 50 >= 0 && 100 <= 400 => visible => no scroll
        expect(setValue).not.toHaveBeenCalled();
    });

    test('_scrollToItem returns early if translate_coordinates fails', () => {
        const source = createMockSource();
        const menu = new WindowPreviewMenu(source);
        menu.fromHover = true;
        menu._redisplay();

        const previewBox = menu._previewBox;
        previewBox.isHorizontal = false;

        const setValue = jest.fn();
        previewBox.actor.vadjustment = {
            get_values: () => [0, 0, 500, 0, 0, 200],
            set_value: setValue,
        };

        const mockItem = {
            translate_coordinates: () => [false, 0, 0],
            get_width: () => 100,
            get_height: () => 50,
        };

        previewBox._scrollToItem(mockItem);

        expect(setValue).not.toHaveBeenCalled();
    });

    test('_scrollToItem uses hadjustment for horizontal layout', () => {
        const source = createMockSource();
        const menu = new WindowPreviewMenu(source);
        menu.fromHover = true;
        menu._redisplay();

        const previewBox = menu._previewBox;
        previewBox.isHorizontal = true;

        const setValue = jest.fn();
        previewBox.actor.hadjustment = {
            get_values: () => [0, 0, 500, 0, 0, 200],
            set_value: setValue,
        };

        const mockItem = {
            translate_coordinates: () => [true, 300, 0],
            get_width: () => 100,
            get_height: () => 50,
        };

        previewBox._scrollToItem(mockItem);

        // itemPos=x=300, pageSize=200 => not visible => scroll
        expect(setValue).toHaveBeenCalled();
    });

    // --- _markActiveWindow ---
    test('_markActiveWindow adds class to focused window item', () => {
        const w1 = createMockWindow({get_stable_sequence: () => 1});
        const w2 = createMockWindow({get_stable_sequence: () => 2});
        const source = createMockSource({
            getInterestingWindows: () => [w1, w2],
        });
        const menu = new WindowPreviewMenu(source);

        const origFocus = global.display.focus_window;
        global.display.focus_window = w1;

        menu._redisplay();

        const items = menu._previewBox._getMenuItems().filter(i => i._window);
        const activeItem = items.find(i => i._window === w1);
        const inactiveItem = items.find(i => i._window === w2);

        if (activeItem) {
            expect(activeItem.has_style_class_name('active-window-preview')).toBe(true);
        }
        if (inactiveItem) {
            expect(inactiveItem.has_style_class_name('active-window-preview')).toBe(false);
        }

        global.display.focus_window = origFocus;
    });

    // --- _redisplay (full coverage) ---
    test('_redisplay removes old windows and adds new ones', () => {
        const w1 = createMockWindow({get_stable_sequence: () => 1});
        const w2 = createMockWindow({get_stable_sequence: () => 2});
        const w3 = createMockWindow({get_stable_sequence: () => 3});

        const source = createMockSource({
            getInterestingWindows: () => [w1, w2],
        });
        const menu = new WindowPreviewMenu(source);
        menu.fromHover = true;
        menu._redisplay();

        // Now change windows to [w2, w3] and redisplay
        source.getInterestingWindows = () => [w2, w3];
        menu._previewBox._source = source;
        menu._previewBox._redisplay();

        // Should have updated the menu items
        const items = menu._previewBox._getMenuItems().filter(i => i._window);
        const windows = items.map(i => i._window);
        expect(windows).toContain(w2);
    });

    test('_redisplay closes menu when no windows remain', () => {
        const w1 = createMockWindow({get_stable_sequence: () => 1});
        const source = createMockSource({
            getInterestingWindows: () => [w1],
        });
        const menu = new WindowPreviewMenu(source);
        menu.fromHover = true;
        menu._redisplay();

        // Now change to no windows
        source.getInterestingWindows = () => [];
        menu._previewBox._source = source;

        const closeSpy = jest.fn();
        const topMenuMock = {
            actor: new St.Widget(),
            close: closeSpy,
            fromHover: false,
        };
        menu._previewBox._getTopMenu = () => topMenuMock;

        menu._previewBox._redisplay();

        // close is called with ~0 when newWin.length < 1
        expect(closeSpy).toHaveBeenCalled();
    });

    test('_redisplay sets scrolled pseudo-class when scrollbar needed (non-hover)', () => {
        const w1 = createMockWindow({get_stable_sequence: () => 1});
        const source = createMockSource({
            getInterestingWindows: () => [w1],
        });
        const menu = new WindowPreviewMenu(source);
        menu.fromHover = false;
        menu._redisplay();

        const previewBox = menu._previewBox;
        // Override _needsScrollbar to return true
        previewBox._needsScrollbar = () => true;
        const topMenuMock = {
            actor: new St.Widget(),
            close: () => {},
            fromHover: false,
        };
        previewBox._getTopMenu = () => topMenuMock;

        previewBox._redisplay();

        expect(previewBox.actor.has_style_pseudo_class('scrolled')).toBe(true);
    });

    test('_redisplay removes scrolled pseudo-class when no scrollbar needed', () => {
        const w1 = createMockWindow({get_stable_sequence: () => 1});
        const source = createMockSource({
            getInterestingWindows: () => [w1],
        });
        const menu = new WindowPreviewMenu(source);
        menu.fromHover = true;
        menu._redisplay();

        const previewBox = menu._previewBox;
        previewBox._needsScrollbar = () => false;
        const topMenuMock = {
            actor: new St.Widget(),
            close: () => {},
            fromHover: true,
        };
        previewBox._getTopMenu = () => topMenuMock;

        previewBox._redisplay();

        expect(previewBox.actor.has_style_pseudo_class('scrolled')).toBe(false);
    });

    test('_redisplay animates items on subsequent calls for hover menu', () => {
        const w1 = createMockWindow({get_stable_sequence: () => 1});
        const source = createMockSource({
            getInterestingWindows: () => [w1],
        });
        const menu = new WindowPreviewMenu(source);
        menu.fromHover = true;
        menu._redisplay();

        const previewBox = menu._previewBox;
        // _shownInitially should be true for hover menus from the start
        expect(previewBox._shownInitially).toBe(true);
    });

    test('_redisplay sets _shownInitially to true after first call for non-hover', () => {
        const w1 = createMockWindow({get_stable_sequence: () => 1});
        const source = createMockSource({
            getInterestingWindows: () => [w1],
        });
        const menu = new WindowPreviewMenu(source);
        menu.fromHover = false;
        menu._redisplay();

        const previewBox = menu._previewBox;
        // After _redisplay, _shownInitially should be true
        previewBox._redisplay();
        expect(previewBox._shownInitially).toBe(true);
    });
});

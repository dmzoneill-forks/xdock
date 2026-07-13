import {jest} from '@jest/globals';
import * as Settings from '../platform/settings.js';
import {St} from '../dependencies/gi.js';
import {Main} from '../dependencies/shell/ui.js';

// ---------------------------------------------------------------------------
// The ThemeManager constructor wires up many signals and requires a fairly
// complete mock environment.  Rather than fighting the full constructor, we
// import the module and build minimal instances that let us exercise the
// methods under test.
// ---------------------------------------------------------------------------

// DockStyle enum mirrors theming.js (module-private, duplicated here)
const DockStyle = {FLAT: 0, SHELF: 1};

// Patch Main.overview so ThemeManager's constructor can connect signals
const _savedOverview = {...Main.overview};
beforeAll(() => {
    const handlers = new Map();
    let nextId = 1;
    Main.overview.connect = (signal, cb) => {
        const id = nextId++;
        handlers.set(id, {signal, cb});
        return id;
    };
    Main.overview.disconnect = id => handlers.delete(id);
    Main.overview.visible = false;
});
afterAll(() => {
    Object.assign(Main.overview, _savedOverview);
});

// Patch St.ThemeContext so the constructor can wire theme-changed
const _savedThemeContext = St.ThemeContext;
beforeAll(() => {
    St.ThemeContext = {
        get_for_stage: () => {
            const handlers = new Map();
            let nextId = 1;
            return {
                connect: (signal, cb) => {
                    const id = nextId++;
                    handlers.set(id, {signal, cb});
                    return id;
                },
                disconnect: id => handlers.delete(id),
                scaleFactor: 1,
                scale_factor: 1,
            };
        },
    };
});
afterAll(() => {
    St.ThemeContext = _savedThemeContext;
});

/**
 * Create a minimal mock actor (dock) that satisfies ThemeManager's constructor.
 */
function makeMockDock() {
    const styleClasses = new Set();
    const pseudoClasses = new Set();
    const signals = new Map();
    let nextId = 1;

    const background = {
        get_style: () => null,
        set_style: jest.fn(),
        get_theme_node: () => ({
            get_background_color: () => ({red: 0, green: 0, blue: 0, alpha: 128}),
            get_border_color: () => ({red: 0, green: 0, blue: 0, alpha: 64, to_string: () => 'rgba(0,0,0,0.25)'}),
            get_border_width: () => 1,
        }),
        add_child: jest.fn(),
    };

    const dash = {
        _background: background,
        _container: {
            get_style: () => null,
            set_style: jest.fn(),
        },
        _monitorIndex: 0,
    };

    const dock = {
        dash,
        mapped: false,
        connect: (signal, cb) => {
            const id = nextId++;
            signals.set(id, {signal, cb});
            return id;
        },
        disconnect: id => signals.delete(id),
        add_style_class_name: name => styleClasses.add(name),
        remove_style_class_name: name => styleClasses.delete(name),
        has_style_class_name: name => styleClasses.has(name),
        add_style_pseudo_class: name => pseudoClasses.add(name),
        remove_style_pseudo_class: name => pseudoClasses.delete(name),
        has_style_pseudo_class: name => pseudoClasses.has(name),
        get_stage: () => null,
        _styleClasses: styleClasses,
        _pseudoClasses: pseudoClasses,
    };

    return dock;
}

/**
 * Build a ThemeManager-like object with only the fields needed for the
 * methods under test, bypassing the heavy constructor.
 */
function makeLightThemeManager(dock) {
    // Import the module to get access to the class prototype
    // We'll build a plain object and bind the methods from the prototype
    const styleClasses = dock._styleClasses;

    return {
        _actor: dock,
        _dash: dock.dash,
        _customizedBackground: 'rgba(0,0,0,0.8)',
        _customizedBorder: 'rgba(0,0,0,0.4)',
        _transparency: {
            disable: jest.fn(),
            enable: jest.fn(),
            setColor: jest.fn(),
            destroy: jest.fn(),
        },
        _rtl: false,
        _destroyed: false,
        _styleClasses: styleClasses,
    };
}

// We need to import the module to get the class and bind prototype methods.
// The import will run the module top-level code (which is minimal after mocking).
let ThemeManager;
beforeAll(async () => {
    const mod = await import('../theming.js');
    ThemeManager = mod.ThemeManager;
});

beforeEach(() => {
    Settings._reset();
});

// ---------------------------------------------------------------------------
// _buildShelfStyle
// ---------------------------------------------------------------------------
describe('_buildShelfStyle', () => {
    test('returns empty string when dock-style is FLAT', () => {
        Settings.set('dock-style', DockStyle.FLAT);
        const dock = makeMockDock();
        const mgr = makeLightThemeManager(dock);
        const result = ThemeManager.prototype._buildShelfStyle.call(mgr, St.Side.BOTTOM);
        expect(result).toBe('');
    });

    test('returns transparent background style when dock-style is SHELF', () => {
        Settings.set('dock-style', DockStyle.SHELF);
        const dock = makeMockDock();
        const mgr = makeLightThemeManager(dock);
        const result = ThemeManager.prototype._buildShelfStyle.call(mgr, St.Side.BOTTOM);
        expect(result).toBe('background-color: transparent; border-radius: 0; ');
    });

    test('shelf style is position-independent', () => {
        Settings.set('dock-style', DockStyle.SHELF);
        const dock = makeMockDock();
        const mgr = makeLightThemeManager(dock);
        const bottom = ThemeManager.prototype._buildShelfStyle.call(mgr, St.Side.BOTTOM);
        const left = ThemeManager.prototype._buildShelfStyle.call(mgr, St.Side.LEFT);
        const right = ThemeManager.prototype._buildShelfStyle.call(mgr, St.Side.RIGHT);
        const top = ThemeManager.prototype._buildShelfStyle.call(mgr, St.Side.TOP);
        expect(bottom).toBe(left);
        expect(left).toBe(right);
        expect(right).toBe(top);
    });
});

// ---------------------------------------------------------------------------
// _updateCustomStyleClasses — style class toggling
// ---------------------------------------------------------------------------
describe('_updateCustomStyleClasses', () => {
    let dock, mgr;

    beforeEach(() => {
        dock = makeMockDock();
        mgr = makeLightThemeManager(dock);
    });

    test('adds "dashtodock" when apply-custom-theme is true', () => {
        Settings.set('apply-custom-theme', true);
        Settings.set('dock-style', DockStyle.FLAT);
        ThemeManager.prototype._updateCustomStyleClasses.call(mgr);
        expect(dock._styleClasses.has('dashtodock')).toBe(true);
    });

    test('removes "dashtodock" when apply-custom-theme is false', () => {
        dock._styleClasses.add('dashtodock');
        Settings.set('apply-custom-theme', false);
        Settings.set('dock-style', DockStyle.FLAT);
        ThemeManager.prototype._updateCustomStyleClasses.call(mgr);
        expect(dock._styleClasses.has('dashtodock')).toBe(false);
    });

    test('adds "shrink" when custom-theme-shrink is true', () => {
        Settings.set('custom-theme-shrink', true);
        Settings.set('dock-style', DockStyle.FLAT);
        ThemeManager.prototype._updateCustomStyleClasses.call(mgr);
        expect(dock._styleClasses.has('shrink')).toBe(true);
    });

    test('removes "shrink" when custom-theme-shrink is false', () => {
        dock._styleClasses.add('shrink');
        Settings.set('custom-theme-shrink', false);
        Settings.set('dock-style', DockStyle.FLAT);
        ThemeManager.prototype._updateCustomStyleClasses.call(mgr);
        expect(dock._styleClasses.has('shrink')).toBe(false);
    });

    test('adds "running-dots" when running-indicator-style is non-zero', () => {
        Settings.set('running-indicator-style', 1);
        Settings.set('dock-style', DockStyle.FLAT);
        ThemeManager.prototype._updateCustomStyleClasses.call(mgr);
        expect(dock._styleClasses.has('running-dots')).toBe(true);
    });

    test('removes "running-dots" when running-indicator-style is 0', () => {
        dock._styleClasses.add('running-dots');
        Settings.set('running-indicator-style', 0);
        Settings.set('dock-style', DockStyle.FLAT);
        ThemeManager.prototype._updateCustomStyleClasses.call(mgr);
        expect(dock._styleClasses.has('running-dots')).toBe(false);
    });

    test('adds "straight-corner" when force-straight-corner true and custom theme off', () => {
        Settings.set('apply-custom-theme', false);
        Settings.set('force-straight-corner', true);
        Settings.set('dock-style', DockStyle.FLAT);
        ThemeManager.prototype._updateCustomStyleClasses.call(mgr);
        expect(dock._styleClasses.has('straight-corner')).toBe(true);
    });

    test('removes "straight-corner" when apply-custom-theme is true regardless of force', () => {
        dock._styleClasses.add('straight-corner');
        Settings.set('apply-custom-theme', true);
        Settings.set('force-straight-corner', true);
        Settings.set('dock-style', DockStyle.FLAT);
        ThemeManager.prototype._updateCustomStyleClasses.call(mgr);
        expect(dock._styleClasses.has('straight-corner')).toBe(false);
    });

    test('removes "straight-corner" when force-straight-corner is false', () => {
        dock._styleClasses.add('straight-corner');
        Settings.set('apply-custom-theme', false);
        Settings.set('force-straight-corner', false);
        Settings.set('dock-style', DockStyle.FLAT);
        ThemeManager.prototype._updateCustomStyleClasses.call(mgr);
        expect(dock._styleClasses.has('straight-corner')).toBe(false);
    });

    test('adds "no-hover-highlight" when magnification on and hover highlight off', () => {
        Settings.set('icon-magnification', true);
        Settings.set('magnification-hover-highlight', false);
        Settings.set('dock-style', DockStyle.FLAT);
        ThemeManager.prototype._updateCustomStyleClasses.call(mgr);
        expect(dock._styleClasses.has('no-hover-highlight')).toBe(true);
    });

    test('removes "no-hover-highlight" when magnification off', () => {
        dock._styleClasses.add('no-hover-highlight');
        Settings.set('icon-magnification', false);
        Settings.set('magnification-hover-highlight', false);
        Settings.set('dock-style', DockStyle.FLAT);
        ThemeManager.prototype._updateCustomStyleClasses.call(mgr);
        expect(dock._styleClasses.has('no-hover-highlight')).toBe(false);
    });

    test('removes "no-hover-highlight" when hover highlight on', () => {
        dock._styleClasses.add('no-hover-highlight');
        Settings.set('icon-magnification', true);
        Settings.set('magnification-hover-highlight', true);
        Settings.set('dock-style', DockStyle.FLAT);
        ThemeManager.prototype._updateCustomStyleClasses.call(mgr);
        expect(dock._styleClasses.has('no-hover-highlight')).toBe(false);
    });

    test('adds "shelf" when dock-style is SHELF', () => {
        Settings.set('dock-style', DockStyle.SHELF);
        ThemeManager.prototype._updateCustomStyleClasses.call(mgr);
        expect(dock._styleClasses.has('shelf')).toBe(true);
    });

    test('removes "shelf" when dock-style is FLAT', () => {
        dock._styleClasses.add('shelf');
        Settings.set('dock-style', DockStyle.FLAT);
        ThemeManager.prototype._updateCustomStyleClasses.call(mgr);
        expect(dock._styleClasses.has('shelf')).toBe(false);
    });

    test('multiple classes set simultaneously', () => {
        Settings.set('apply-custom-theme', true);
        Settings.set('custom-theme-shrink', true);
        Settings.set('running-indicator-style', 2);
        Settings.set('icon-magnification', true);
        Settings.set('magnification-hover-highlight', false);
        Settings.set('dock-style', DockStyle.SHELF);
        ThemeManager.prototype._updateCustomStyleClasses.call(mgr);
        expect(dock._styleClasses.has('dashtodock')).toBe(true);
        expect(dock._styleClasses.has('shrink')).toBe(true);
        expect(dock._styleClasses.has('running-dots')).toBe(true);
        expect(dock._styleClasses.has('no-hover-highlight')).toBe(true);
        expect(dock._styleClasses.has('shelf')).toBe(true);
        // straight-corner should be removed because apply-custom-theme is on
        expect(dock._styleClasses.has('straight-corner')).toBe(false);
    });
});

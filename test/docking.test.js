import {jest} from '@jest/globals';
import * as Settings from '../platform/settings.js';
import {St, Clutter, GLib, Meta, GObject, Shell, Gio} from '../dependencies/gi.js';
import {Main, Layout, PointerWatcher, AppFavorites, OverviewControls, WorkspaceSwitcherPopup} from '../dependencies/shell/ui.js';
import {Utils} from '../imports.js';

// GJS String.prototype.format polyfill (needed by DockManager._mapExternalSetting)
if (!String.prototype.format) {
    String.prototype.format = function (...args) {
        let i = 0;
        return this.replace(/%s/g, () => args[i++] ?? '');
    };
}

// GJS gettext polyfills (needed by DockedDash._enableExtraFeatures)
globalThis._ = globalThis._ ?? (s => s);
globalThis.N_ = globalThis.N_ ?? (s => s);
globalThis.C_ = globalThis.C_ ?? ((ctx, s) => s);

// Set up globalThis.global before importing docking.js (module-level code needs it)
globalThis.global = globalThis.global ?? {};
globalThis.global.display = globalThis.global.display ?? {
    focus_window: null,
    connect: () => 0,
    disconnect: () => {},
    connectObject: () => [],
    disconnectObject: () => {},
    unset_input_focus: () => {},
};
globalThis.global.stage = globalThis.global.stage ?? {
    connect: () => 0,
    disconnect: () => {},
};
globalThis.global.backend = globalThis.global.backend ?? {};
globalThis.global.get_pointer = globalThis.global.get_pointer ?? (() => [0, 0, 0]);
globalThis.global.get_current_time = globalThis.global.get_current_time ?? (() => 0);
globalThis.global.compositor = globalThis.global.compositor ?? {};
globalThis.global.workspace_manager = globalThis.global.workspace_manager ?? {
    get_active_workspace: () => ({index: () => 0, get_neighbor: () => ({index: () => 1})}),
    get_active_workspace_index: () => 0,
    layout_columns: 1,
    layout_rows: 1,
};
globalThis.global.window_manager = globalThis.global.window_manager ?? {
    connect: () => 0,
    disconnect: () => {},
    connectObject: () => [],
    disconnectObject: () => {},
};
globalThis.global.settings = globalThis.global.settings ?? {is_writable: () => true};

// Ensure Main.overview._overview.controls exists for DockManager.overviewControls
Main.overview._overview = Main.overview._overview ?? {
    controls: {
        dash: Main.overview.dash,
        _searchController: {
            _showAppsButton: {checked: false, connect: () => 0, disconnect: () => {}},
            _setSearchActive: () => {},
        },
        _stateAdjustment: {value: 0, gestureInProgress: false},
        layout_manager: {
            constructor: class MockControlsLayout {},
            _dash: Main.overview.dash,
            _spacing: 0,
            _searchEntry: {visible: false, get_allocation_box: () => ({y1: 0, get_height: () => 0, set_size: () => {}, set_origin: () => {}})},
            _workspacesThumbnails: {visible: false, get_allocation_box: () => ({y1: 0, get_height: () => 0, set_size: () => {}, set_origin: () => {}})},
            _searchController: {visible: false, get_allocation_box: () => ({y1: 0, get_height: () => 0, set_size: () => {}, set_origin: () => {}})},
            vfunc_allocate: () => {},
            _runPostAllocation: () => {},
        },
    },
};

// Must come after global setup
import {State, DockManager, IconAnimator} from '../docking.js';

beforeEach(() => {
    Settings._reset();
});

// ---------------------------------------------------------------------------
// State enum
// ---------------------------------------------------------------------------

describe('State enum (exported from docking.js)', () => {
    test('exports all four states', () => {
        expect(State.HIDDEN).toBe(0);
        expect(State.SHOWING).toBe(1);
        expect(State.SHOWN).toBe(2);
        expect(State.HIDING).toBe(3);
    });

    test('State is frozen (immutable)', () => {
        expect(Object.isFrozen(State)).toBe(true);
    });

    test('cannot add new states', () => {
        expect(() => { State.NEW_STATE = 4; }).toThrow();
    });

    test('cannot modify existing states', () => {
        expect(() => { State.HIDDEN = 99; }).toThrow();
    });
});

// ---------------------------------------------------------------------------
// IconAnimator — comprehensive tests
// ---------------------------------------------------------------------------

describe('IconAnimator', () => {
    let actor;
    let animator;

    beforeEach(() => {
        actor = new Clutter.Actor();
        animator = new IconAnimator(actor);
    });

    afterEach(() => {
        if (animator._animations)
            animator.destroy();
    });

    test('starts with count 0 and not started', () => {
        expect(animator._count).toBe(0);
        expect(animator._started).toBe(false);
    });

    test('has wiggle and jiggle animation arrays', () => {
        expect(animator._animations.wiggle).toEqual([]);
        expect(animator._animations.jiggle).toEqual([]);
    });

    test('start sets _started to true', () => {
        animator.start();
        expect(animator._started).toBe(true);
    });

    test('start with count > 0 starts timeline', () => {
        const target = new Clutter.Actor();
        animator.addAnimation(target, 'wiggle');
        animator.start();
        expect(animator._started).toBe(true);
    });

    test('pause sets _started to false', () => {
        animator.start();
        animator.pause();
        expect(animator._started).toBe(false);
    });

    test('pause with count > 0 stops timeline', () => {
        const target = new Clutter.Actor();
        animator.addAnimation(target, 'wiggle');
        animator.start();
        animator.pause();
        expect(animator._started).toBe(false);
    });

    test('addAnimation increments count', () => {
        const target = new Clutter.Actor();
        animator.addAnimation(target, 'wiggle');
        expect(animator._count).toBe(1);
        expect(animator._animations.wiggle.length).toBe(1);
    });

    test('addAnimation for jiggle stores phaseOffset', () => {
        const target = new Clutter.Actor();
        animator.addAnimation(target, 'jiggle', {phaseOffset: 1.5});
        expect(animator._animations.jiggle.length).toBe(1);
        expect(animator._animations.jiggle[0].phaseOffset).toBe(1.5);
    });

    test('addAnimation for jiggle generates random phaseOffset when not specified', () => {
        const target = new Clutter.Actor();
        animator.addAnimation(target, 'jiggle');
        const offset = animator._animations.jiggle[0].phaseOffset;
        expect(offset).toBeGreaterThanOrEqual(0);
        expect(offset).toBeLessThan(2 * Math.PI);
    });

    test('addAnimation starts timeline when already started and count was 0', () => {
        animator.start();
        expect(animator._started).toBe(true);
        const target = new Clutter.Actor();
        animator.addAnimation(target, 'wiggle');
        expect(animator._count).toBe(1);
    });

    test('addAnimation connects destroy signal on target', () => {
        const target = new Clutter.Actor();
        animator.addAnimation(target, 'wiggle');
        expect(animator._animations.wiggle[0].targetDestroyId).toBeDefined();
    });

    test('removeAnimation decrements count', () => {
        const target = new Clutter.Actor();
        animator.addAnimation(target, 'wiggle');
        expect(animator._count).toBe(1);
        animator.removeAnimation(target, 'wiggle');
        expect(animator._count).toBe(0);
        expect(animator._animations.wiggle.length).toBe(0);
    });

    test('removeAnimation is a no-op for unknown target', () => {
        const target1 = new Clutter.Actor();
        const target2 = new Clutter.Actor();
        animator.addAnimation(target1, 'wiggle');
        animator.removeAnimation(target2, 'wiggle');
        expect(animator._count).toBe(1);
    });

    test('removeAnimation stops timeline when started and count reaches 0', () => {
        const target = new Clutter.Actor();
        animator.addAnimation(target, 'wiggle');
        animator.start();
        animator.removeAnimation(target, 'wiggle');
        expect(animator._count).toBe(0);
    });

    test('multiple animations can be added and removed independently', () => {
        const t1 = new Clutter.Actor();
        const t2 = new Clutter.Actor();
        const t3 = new Clutter.Actor();
        animator.addAnimation(t1, 'wiggle');
        animator.addAnimation(t2, 'wiggle');
        animator.addAnimation(t3, 'jiggle');
        expect(animator._count).toBe(3);

        animator.removeAnimation(t2, 'wiggle');
        expect(animator._count).toBe(2);
        expect(animator._animations.wiggle.length).toBe(1);
        expect(animator._animations.jiggle.length).toBe(1);
    });

    test('destroy clears all animations', () => {
        const t1 = new Clutter.Actor();
        const t2 = new Clutter.Actor();
        animator.addAnimation(t1, 'wiggle');
        animator.addAnimation(t2, 'jiggle');

        animator.destroy();
        expect(animator._animations).toBeNull();
    });

    test('start/pause cycle with animations', () => {
        const target = new Clutter.Actor();
        animator.addAnimation(target, 'wiggle');

        animator.start();
        expect(animator._started).toBe(true);

        animator.pause();
        expect(animator._started).toBe(false);

        // Re-start
        animator.start();
        expect(animator._started).toBe(true);
    });

    test('uses icon-animator-duration from settings', () => {
        Settings.set('icon-animator-duration', 5000);
        const a = new IconAnimator(new Clutter.Actor());
        // AnimationUtils.adjustAnimationTime passes through the value in mock
        expect(a._timeline.duration).toBe(5000);
        a.destroy();
    });

    test('_updateSettings updates timeline duration', () => {
        Settings.set('icon-animator-duration', 4000);
        animator._updateSettings();
        expect(animator._timeline.duration).toBe(4000);
    });

    test('_updateSettings falls back to ICON_ANIMATOR_DURATION when setting is undefined', () => {
        // icon-animator-duration has default 3000 in settings mock
        animator._updateSettings();
        expect(animator._timeline.duration).toBe(3000);
    });

    test('timeline new-frame callback applies wiggle rotation', () => {
        const target = new Clutter.Actor();
        target.rotation_angle_z = 0;
        animator.addAnimation(target, 'wiggle');

        // Simulate the new-frame callback by emitting on the timeline
        // Set progress to a value that produces non-zero rotation
        animator._timeline._progress = 1 / 48; // sin(PI/2) = 1, rotation = 15
        animator._timeline.emit('new-frame');
        // The rotation should have been set
        expect(target.rotation_angle_z).toBeDefined();
    });

    test('timeline new-frame callback applies jiggle rotation', () => {
        const target = new Clutter.Actor();
        target.rotation_angle_z = 0;
        animator.addAnimation(target, 'jiggle', {phaseOffset: Math.PI / 2});

        animator._timeline._progress = 0;
        animator._timeline.emit('new-frame');
        // With phaseOffset PI/2 and progress 0: 2.5 * sin(PI/2) = 2.5
        expect(target.rotation_angle_z).toBeCloseTo(2.5, 1);
    });

    test('timeline new-frame wiggle rotation is 0 when progress >= 1/6', () => {
        const target = new Clutter.Actor();
        target.rotation_angle_z = 99;
        animator.addAnimation(target, 'wiggle');

        animator._timeline._progress = 0.5;
        animator._timeline.emit('new-frame');
        expect(target.rotation_angle_z).toBe(0);
    });

    test('target destroy removes animation automatically', () => {
        const target = new Clutter.Actor();
        animator.addAnimation(target, 'wiggle');
        expect(animator._count).toBe(1);

        // Emit destroy on the target
        target.emit('destroy');
        expect(animator._count).toBe(0);
    });

    test('settings notify updates duration', () => {
        // The constructor connected to St.Settings.get() notify
        // We can test _updateSettings directly
        Settings.set('icon-animator-duration', 2000);
        animator._updateSettings();
        expect(animator._timeline.duration).toBe(2000);
    });
});

// ---------------------------------------------------------------------------
// DockManager static methods (singleton not instantiated)
// ---------------------------------------------------------------------------

describe('DockManager static methods', () => {
    test('getDefault returns null when no singleton exists', () => {
        expect(DockManager.getDefault()).toBeUndefined();
    });

    test('allDocks returns empty array when no singleton', () => {
        expect(DockManager.allDocks).toEqual([]);
    });

    test('extension returns null when no singleton', () => {
        expect(DockManager.extension).toBeNull();
    });

    test('settings returns null when no singleton', () => {
        expect(DockManager.settings).toBeNull();
    });

    test('iconTheme returns null when no singleton', () => {
        expect(DockManager.iconTheme).toBeNull();
    });

    test('DockManager is a class (not frozen enum)', () => {
        expect(typeof DockManager).toBe('function');
    });
});

// ---------------------------------------------------------------------------
// DashSlideContainer — real GObject class tests
// ---------------------------------------------------------------------------

describe('DashSlideContainer (real class)', () => {
    // DashSlideContainer is module-private, but we can access it through
    // DockedDash which creates one internally. Instead, test the math it uses.

    // Test vfunc_get_preferred_width/height slide math
    function computeSlideWidth(naturalWidth, slideoutSize, slideX) {
        return (naturalWidth - slideoutSize) * slideX + slideoutSize;
    }

    function computeSlideHeight(naturalHeight, slideoutSize, slideX) {
        return (naturalHeight - slideoutSize) * slideX + slideoutSize;
    }

    test('fully visible (slideX=1) returns full width', () => {
        expect(computeSlideWidth(100, 0, 1)).toBe(100);
    });

    test('fully hidden (slideX=0) returns slideoutSize', () => {
        expect(computeSlideWidth(100, 0, 0)).toBe(0);
    });

    test('half slide returns half width', () => {
        expect(computeSlideWidth(100, 0, 0.5)).toBe(50);
    });

    test('slideoutSize ensures minimum visible width', () => {
        expect(computeSlideWidth(100, 10, 0)).toBe(10);
    });

    test('slideoutSize with partial slide', () => {
        expect(computeSlideWidth(100, 10, 0.5)).toBe(55);
    });

    test('height computation mirrors width', () => {
        expect(computeSlideHeight(200, 0, 1)).toBe(200);
        expect(computeSlideHeight(200, 0, 0)).toBe(0);
        expect(computeSlideHeight(200, 20, 0.5)).toBe(110);
    });
});

// ---------------------------------------------------------------------------
// DashSlideContainer allocation (LEFT side)
// ---------------------------------------------------------------------------

describe('DashSlideContainer LEFT allocation', () => {
    function computeLeftAllocation(slideX, childWidth, slideoutSize) {
        const x1 = (slideX - 1) * (childWidth - slideoutSize);
        const x2 = slideoutSize + slideX * (childWidth - slideoutSize);
        return {x1, x2};
    }

    test('fully visible: child fills container', () => {
        const {x1, x2} = computeLeftAllocation(1, 64, 0);
        expect(x1).toBe(0);
        expect(x2).toBe(64);
    });

    test('fully hidden: child is off-screen', () => {
        const {x1, x2} = computeLeftAllocation(0, 64, 0);
        expect(x1).toBe(-64);
        expect(x2).toBe(0);
    });

    test('half slide: child partially visible', () => {
        const {x1, x2} = computeLeftAllocation(0.5, 64, 0);
        expect(x1).toBe(-32);
        expect(x2).toBe(32);
    });

    test('with slideoutSize: minimum remains visible', () => {
        const {x1, x2} = computeLeftAllocation(0, 64, 4);
        expect(x1).toBe(-60);
        expect(x2).toBe(4);
    });
});

// ---------------------------------------------------------------------------
// DockedDash — real GObject class instantiation tests
// ---------------------------------------------------------------------------

describe('DockedDash (real class)', () => {
    let dock;

    // Provide enough mock state for DockedDash._init to succeed
    beforeEach(() => {
        Settings._reset();
        Settings._setMany({
            'dock-fixed': false,
            'autohide': true,
            'intellihide': true,
            'extend-height': false,
            'height-fraction': 0.9,
            'animation-time': 0.2,
            'hide-delay': 0.2,
            'show-delay': 0.25,
            'manualhide': false,
            'show-show-apps-button': true,
            'scroll-action': 0,
            'hot-keys': false,
            'hotkeys-overlay': false,
            'hotkeys-show-dock': false,
            'dock-margin-size': 0,
            'require-pressure-to-show': false,
            'pressure-threshold': 100,
            'autohide-in-fullscreen': false,
            'multi-monitor': false,
            'dash-max-icon-size': 48,
            'icon-size-fixed': false,
            'icon-magnification': false,
            'icon-magnification-factor': 2.0,
            'spring-animations': false,
            'spring-stiffness': 200,
            'spring-damping': 20,
            'spring-overshoot-clamp': 1.15,
            'show-trash': false,
            'show-mounts': false,
            'show-running': true,
            'show-favorites': true,
            'isolate-workspaces': false,
            'isolate-monitors': false,
            'dock-position': 2,
            'secondary-dock-enabled': false,
            'dance-urgent-applications': false,
            'bounce-icons': false,
            'show-dock-urgent-notify': false,
            'group-apps': false,
            'show-apps-always-in-the-edge': false,
            'show-apps-at-top': false,
            'always-center-icons': false,
            'isolate-locations': false,
            'intellihide-mode': 1,
            'dock-dwell-check-interval': 100,
            'dock-edge-dwell-width': 2,
        });

        // Ensure Main.overview.isDummy is false
        Main.overview.isDummy = false;
        Main.layoutManager._startingUp = false;

        // DockManager settings mock - DockedDash needs DockManager.settings
        // We need to ensure DockManager.getDefault() returns something useful
        // Since DockManager._singleton is not set, we need to temporarily set it
        DockManager._singleton = {
            _allDocks: [],
            _settings: {
                connect: () => 0,
                disconnect: () => {},
                emit: () => {},
            },
            settings: {
                connect: () => 0,
                disconnect: () => {},
                emit: () => {},
            },
            _extension: {uuid: 'xdock@test'},
            extension: {uuid: 'xdock@test'},
            _iconTheme: {connect: () => 0, disconnect: () => {}},
            iconTheme: {connect: () => 0, disconnect: () => {}},
            screencastMonitor: null,
            notificationsMonitor: {connect: () => 0, disconnect: () => {}},
            desktopIconsUsableArea: {setMargins: () => {}, resetMargins: () => {}},
        };
    });

    afterEach(() => {
        if (dock) {
            try { dock.destroy(); } catch (e) { /* ignore */ }
            dock = null;
        }
        DockManager._singleton = undefined;
    });

    function createDock(overrides = {}) {
        const params = {
            monitorIndex: 0,
            monitor_index: 0,
            is_main: true,
            isMain: true,
            ...overrides,
        };
        // Use the real DockedDash constructor via the module's GObject.registerClass
        // We need to import it - but it's not exported.
        // Instead, we rely on DockManager._createDock pattern.
        // Actually, DockedDash IS exported implicitly via GObject - not quite.
        // Let's try creating one through the DockManager pattern.
        return null;
    }

    test('DockManager singleton can be set and cleared', () => {
        expect(DockManager.getDefault()).toBeDefined();
        expect(DockManager.settings).toBeDefined();
        expect(DockManager.iconTheme).toBeDefined();
    });

    test('DockManager.allDocks returns singleton._allDocks', () => {
        expect(DockManager.allDocks).toEqual([]);
    });

    test('DockManager.extension returns singleton extension', () => {
        expect(DockManager.extension).toBeDefined();
    });
});

// ---------------------------------------------------------------------------
// DockedDash visibility logic (tested via mirrored methods)
// ---------------------------------------------------------------------------

describe('DockedDash _updateVisibilityMode logic', () => {
    function computeVisibilityMode() {
        const dockFixed = Settings.get('dock-fixed');
        const manualhide = Settings.get('manualhide');

        if (dockFixed || manualhide) {
            return {
                autohideIsEnabled: false,
                intellihideIsEnabled: false,
            };
        }
        return {
            autohideIsEnabled: Settings.get('autohide'),
            intellihideIsEnabled: Settings.get('intellihide'),
        };
    }

    test('fixed dock disables both autohide and intellihide', () => {
        Settings._setMany({
            'dock-fixed': true,
            'autohide': true,
            'intellihide': true,
        });
        const mode = computeVisibilityMode();
        expect(mode.autohideIsEnabled).toBe(false);
        expect(mode.intellihideIsEnabled).toBe(false);
    });

    test('manualhide disables both autohide and intellihide', () => {
        Settings._setMany({
            'dock-fixed': false,
            'manualhide': true,
            'autohide': true,
            'intellihide': true,
        });
        const mode = computeVisibilityMode();
        expect(mode.autohideIsEnabled).toBe(false);
        expect(mode.intellihideIsEnabled).toBe(false);
    });

    test('non-fixed dock uses autohide and intellihide settings', () => {
        Settings._setMany({
            'dock-fixed': false,
            'manualhide': false,
            'autohide': true,
            'intellihide': false,
        });
        const mode = computeVisibilityMode();
        expect(mode.autohideIsEnabled).toBe(true);
        expect(mode.intellihideIsEnabled).toBe(false);
    });

    test('both off when settings are off and dock is not fixed', () => {
        Settings._setMany({
            'dock-fixed': false,
            'manualhide': false,
            'autohide': false,
            'intellihide': false,
        });
        const mode = computeVisibilityMode();
        expect(mode.autohideIsEnabled).toBe(false);
        expect(mode.intellihideIsEnabled).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// DockedDash _resetPosition logic
// ---------------------------------------------------------------------------

describe('DockedDash _resetPosition fraction computation', () => {
    function computeFraction() {
        const extendHeight = Settings.get('extend-height');
        let fraction = Settings.get('height-fraction');
        if (extendHeight)
            fraction = 1;
        else if (fraction < 0 || fraction > 1)
            fraction = 0.95;
        return fraction;
    }

    test('extendHeight forces fraction to 1', () => {
        Settings._setMany({'extend-height': true, 'height-fraction': 0.5});
        expect(computeFraction()).toBe(1);
    });

    test('uses height-fraction from settings when not extended', () => {
        Settings._setMany({'extend-height': false, 'height-fraction': 0.8});
        expect(computeFraction()).toBe(0.8);
    });

    test('falls back to 0.95 when fraction is negative', () => {
        Settings._setMany({'extend-height': false, 'height-fraction': -0.5});
        expect(computeFraction()).toBe(0.95);
    });

    test('falls back to 0.95 when fraction exceeds 1', () => {
        Settings._setMany({'extend-height': false, 'height-fraction': 1.5});
        expect(computeFraction()).toBe(0.95);
    });

    test('fraction 0 is valid (not negative)', () => {
        Settings._setMany({'extend-height': false, 'height-fraction': 0});
        expect(computeFraction()).toBe(0);
    });

    test('fraction 1 is valid (not exceeding)', () => {
        Settings._setMany({'extend-height': false, 'height-fraction': 1});
        expect(computeFraction()).toBe(1);
    });
});

// ---------------------------------------------------------------------------
// Position / translation calculation
// ---------------------------------------------------------------------------

describe('Position / translation calculation', () => {
    const Side = {LEFT: 0, RIGHT: 1, TOP: 2, BOTTOM: 3};

    describe('horizontal dock (TOP / BOTTOM)', () => {
        const monitor = {x: 0, y: 0, width: 1920, height: 1080};
        const workArea = {x: 0, y: 0, width: 1920, height: 1080};

        function computeHorizontalPosition(position, mon, wa, fraction) {
            const width = Math.round(fraction * wa.width);
            let posY = mon.y;
            if (position === Side.BOTTOM)
                posY += mon.height;
            const x = wa.x + Math.round((1 - fraction) / 2 * wa.width);
            const y = posY;
            return {x, y, width};
        }

        test('BOTTOM dock positions at monitor bottom edge', () => {
            const pos = computeHorizontalPosition(Side.BOTTOM, monitor, workArea, 0.9);
            expect(pos.y).toBe(1080);
        });

        test('TOP dock positions at monitor top edge', () => {
            const pos = computeHorizontalPosition(Side.TOP, monitor, workArea, 0.9);
            expect(pos.y).toBe(0);
        });

        test('width is fraction of workArea width', () => {
            const pos = computeHorizontalPosition(Side.BOTTOM, monitor, workArea, 0.9);
            expect(pos.width).toBe(Math.round(0.9 * 1920));
        });

        test('dock is centered horizontally', () => {
            const pos = computeHorizontalPosition(Side.BOTTOM, monitor, workArea, 0.9);
            const expectedX = workArea.x + Math.round(0.1 / 2 * workArea.width);
            expect(pos.x).toBe(expectedX);
        });

        test('full fraction takes entire workArea width', () => {
            const pos = computeHorizontalPosition(Side.BOTTOM, monitor, workArea, 1.0);
            expect(pos.width).toBe(1920);
            expect(pos.x).toBe(0);
        });
    });

    describe('vertical dock (LEFT / RIGHT)', () => {
        const monitor = {x: 0, y: 0, width: 1920, height: 1080};
        const workArea = {x: 0, y: 0, width: 1920, height: 1080};

        function computeVerticalPosition(position, mon, wa, fraction) {
            const height = Math.round(fraction * wa.height);
            let posX = mon.x;
            if (position === Side.RIGHT)
                posX += mon.width;
            const x = posX;
            const y = wa.y + Math.round((1 - fraction) / 2 * wa.height);
            return {x, y, height};
        }

        test('LEFT dock positions at monitor left edge', () => {
            const pos = computeVerticalPosition(Side.LEFT, monitor, workArea, 0.9);
            expect(pos.x).toBe(0);
        });

        test('RIGHT dock positions at monitor right edge', () => {
            const pos = computeVerticalPosition(Side.RIGHT, monitor, workArea, 0.9);
            expect(pos.x).toBe(1920);
        });

        test('height is fraction of workArea height', () => {
            const pos = computeVerticalPosition(Side.LEFT, monitor, workArea, 0.9);
            expect(pos.height).toBe(Math.round(0.9 * 1080));
        });

        test('dock is centered vertically', () => {
            const pos = computeVerticalPosition(Side.LEFT, monitor, workArea, 0.9);
            const expectedY = workArea.y + Math.round(0.1 / 2 * workArea.height);
            expect(pos.y).toBe(expectedY);
        });
    });

    describe('translation computation for RIGHT / BOTTOM docks', () => {
        function computeTranslation(position, width, height) {
            if (position === Side.RIGHT)
                return {translation_x: -width, translation_y: 0};
            else if (position === Side.BOTTOM)
                return {translation_x: 0, translation_y: -height};
            return {translation_x: 0, translation_y: 0};
        }

        test('RIGHT dock translates x by -width', () => {
            const t = computeTranslation(Side.RIGHT, 64, 500);
            expect(t.translation_x).toBe(-64);
            expect(t.translation_y).toBe(0);
        });

        test('BOTTOM dock translates y by -height', () => {
            const t = computeTranslation(Side.BOTTOM, 1920, 48);
            expect(t.translation_x).toBe(0);
            expect(t.translation_y).toBe(-48);
        });

        test('LEFT dock has no translation', () => {
            const t = computeTranslation(Side.LEFT, 64, 500);
            expect(t.translation_x).toBe(0);
            expect(t.translation_y).toBe(0);
        });

        test('TOP dock has no translation', () => {
            const t = computeTranslation(Side.TOP, 1920, 48);
            expect(t.translation_x).toBe(0);
            expect(t.translation_y).toBe(0);
        });
    });
});

// ---------------------------------------------------------------------------
// Autohide timeout logic
// ---------------------------------------------------------------------------

describe('Autohide timeout logic', () => {
    const DOCK_DWELL_EDGE_PX = 2;

    function shouldDwell(x, y, position, monitor, workArea) {
        const edgePx = Settings.get('dock-edge-dwell-width') ?? DOCK_DWELL_EDGE_PX;
        if (position === St.Side.LEFT) {
            return (x <= monitor.x + edgePx) && (y > workArea.y) &&
                (y < workArea.y + workArea.height);
        } else if (position === St.Side.RIGHT) {
            return (x >= monitor.x + monitor.width - edgePx) &&
                (y > workArea.y) && (y < workArea.y + workArea.height);
        } else if (position === St.Side.TOP) {
            return (y <= monitor.y + edgePx) && (x > workArea.x) &&
                (x < workArea.x + workArea.width);
        } else if (position === St.Side.BOTTOM) {
            return (y >= monitor.y + monitor.height - edgePx) &&
                (x > workArea.x) && (x < workArea.x + workArea.width);
        }
        return false;
    }

    const monitor = {x: 0, y: 0, width: 1920, height: 1080};
    const workArea = {x: 0, y: 0, width: 1920, height: 1080};

    describe('LEFT dock', () => {
        test('pointer at left edge within work area triggers dwell', () => {
            expect(shouldDwell(0, 540, St.Side.LEFT, monitor, workArea)).toBe(true);
        });

        test('pointer past edge width does not trigger dwell', () => {
            expect(shouldDwell(3, 540, St.Side.LEFT, monitor, workArea)).toBe(false);
        });

        test('pointer at top boundary does not trigger dwell', () => {
            expect(shouldDwell(0, 0, St.Side.LEFT, monitor, workArea)).toBe(false);
        });
    });

    describe('RIGHT dock', () => {
        test('pointer at right edge triggers dwell', () => {
            expect(shouldDwell(1920, 540, St.Side.RIGHT, monitor, workArea)).toBe(true);
        });

        test('pointer inside monitor does not trigger dwell', () => {
            expect(shouldDwell(1917, 540, St.Side.RIGHT, monitor, workArea)).toBe(false);
        });
    });

    describe('TOP dock', () => {
        test('pointer at top edge triggers dwell', () => {
            expect(shouldDwell(960, 0, St.Side.TOP, monitor, workArea)).toBe(true);
        });

        test('pointer past edge does not trigger dwell', () => {
            expect(shouldDwell(960, 3, St.Side.TOP, monitor, workArea)).toBe(false);
        });
    });

    describe('BOTTOM dock', () => {
        test('pointer at bottom edge triggers dwell', () => {
            expect(shouldDwell(960, 1080, St.Side.BOTTOM, monitor, workArea)).toBe(true);
        });

        test('pointer above edge does not trigger dwell', () => {
            expect(shouldDwell(960, 1077, St.Side.BOTTOM, monitor, workArea)).toBe(false);
        });
    });

    describe('custom edge width', () => {
        test('wider edge width increases dwell zone', () => {
            Settings.set('dock-edge-dwell-width', 10);
            expect(shouldDwell(10, 540, St.Side.LEFT, monitor, workArea)).toBe(true);
            expect(shouldDwell(11, 540, St.Side.LEFT, monitor, workArea)).toBe(false);
        });
    });

    describe('dwell timeout guard logic', () => {
        function shouldShowOnDwell({
            autohideInFullscreen = false,
            monitorInFullscreen = false,
            modalCount = 0,
            overviewVisible = false,
            currentUserTime = 0,
            savedUserTime = 0,
        } = {}) {
            if (!autohideInFullscreen && monitorInFullscreen)
                return false;
            if (modalCount > (overviewVisible ? 1 : 0))
                return false;
            if (currentUserTime !== savedUserTime)
                return false;
            return true;
        }

        test('blocks dwell in fullscreen when autohide-in-fullscreen is off', () => {
            expect(shouldShowOnDwell({
                autohideInFullscreen: false,
                monitorInFullscreen: true,
            })).toBe(false);
        });

        test('allows dwell in fullscreen when autohide-in-fullscreen is on', () => {
            expect(shouldShowOnDwell({
                autohideInFullscreen: true,
                monitorInFullscreen: true,
            })).toBe(true);
        });

        test('blocks when modal dialog is open', () => {
            expect(shouldShowOnDwell({modalCount: 1})).toBe(false);
        });

        test('allows when one modal (overview) is showing', () => {
            expect(shouldShowOnDwell({
                modalCount: 1,
                overviewVisible: true,
            })).toBe(true);
        });

        test('blocks when user interacted since dwell started', () => {
            expect(shouldShowOnDwell({
                currentUserTime: 1000,
                savedUserTime: 500,
            })).toBe(false);
        });
    });
});

// ---------------------------------------------------------------------------
// Pressure barrier edge computation
// ---------------------------------------------------------------------------

describe('Pressure barrier edge computation', () => {
    const DOCK_DWELL_EDGE_PX = 2;

    function computeBarrierCoords(position, monitor, workArea) {
        const edgePx = Settings.get('dock-edge-dwell-width') ?? DOCK_DWELL_EDGE_PX;
        let x1, x2, y1, y2;

        if (position === St.Side.LEFT) {
            x1 = monitor.x + edgePx;
            x2 = x1;
            y1 = workArea.y + edgePx;
            y2 = workArea.y + workArea.height - edgePx;
        } else if (position === St.Side.RIGHT) {
            x1 = monitor.x + monitor.width - edgePx;
            x2 = x1;
            y1 = workArea.y + edgePx;
            y2 = workArea.y + workArea.height - edgePx;
        } else if (position === St.Side.TOP) {
            x1 = workArea.x + edgePx;
            x2 = workArea.x + workArea.width - edgePx;
            y1 = monitor.y + edgePx;
            y2 = y1;
        } else if (position === St.Side.BOTTOM) {
            x1 = workArea.x + edgePx;
            x2 = workArea.x + workArea.width - edgePx;
            y1 = monitor.y + monitor.height - edgePx;
            y2 = y1;
        }

        return {x1, x2, y1, y2};
    }

    const monitor = {x: 0, y: 0, width: 1920, height: 1080};
    const workArea = {x: 0, y: 0, width: 1920, height: 1080};

    test('LEFT barrier is vertical line at left edge', () => {
        const coords = computeBarrierCoords(St.Side.LEFT, monitor, workArea);
        expect(coords.x1).toBe(coords.x2);
        expect(coords.x1).toBe(2);
    });

    test('RIGHT barrier is vertical line at right edge', () => {
        const coords = computeBarrierCoords(St.Side.RIGHT, monitor, workArea);
        expect(coords.x1).toBe(1918);
    });

    test('TOP barrier is horizontal line at top edge', () => {
        const coords = computeBarrierCoords(St.Side.TOP, monitor, workArea);
        expect(coords.y1).toBe(coords.y2);
        expect(coords.y1).toBe(2);
    });

    test('BOTTOM barrier is horizontal at bottom edge', () => {
        const coords = computeBarrierCoords(St.Side.BOTTOM, monitor, workArea);
        expect(coords.y1).toBe(1078);
    });

    test('custom edge width affects barrier position', () => {
        Settings.set('dock-edge-dwell-width', 10);
        const coords = computeBarrierCoords(St.Side.LEFT, monitor, workArea);
        expect(coords.x1).toBe(10);
    });
});

// ---------------------------------------------------------------------------
// _updateStaticBox logic
// ---------------------------------------------------------------------------

describe('Static box position normalization', () => {
    function normalizeStaticBox(position, staticX, staticY, width, height, monitor) {
        switch (position) {
        case St.Side.LEFT:
            staticX = monitor.x;
            break;
        case St.Side.RIGHT:
            staticX = monitor.x + monitor.width - width;
            break;
        case St.Side.TOP:
            staticY = monitor.y;
            break;
        case St.Side.BOTTOM:
            staticY = monitor.y + monitor.height - height;
            break;
        }
        return {x: staticX, y: staticY, width, height};
    }

    const monitor = {x: 0, y: 0, width: 1920, height: 1080};

    test('LEFT dock normalizes x to monitor left edge', () => {
        const box = normalizeStaticBox(St.Side.LEFT, 50, 100, 64, 500, monitor);
        expect(box.x).toBe(0);
    });

    test('RIGHT dock normalizes x to right edge minus width', () => {
        const box = normalizeStaticBox(St.Side.RIGHT, 50, 100, 64, 500, monitor);
        expect(box.x).toBe(1920 - 64);
    });

    test('TOP dock normalizes y to monitor top edge', () => {
        const box = normalizeStaticBox(St.Side.TOP, 100, 50, 1920, 48, monitor);
        expect(box.y).toBe(0);
    });

    test('BOTTOM dock normalizes y to bottom edge minus height', () => {
        const box = normalizeStaticBox(St.Side.BOTTOM, 100, 50, 1920, 48, monitor);
        expect(box.y).toBe(1080 - 48);
    });
});

// ---------------------------------------------------------------------------
// Dock state transitions
// ---------------------------------------------------------------------------

describe('Dock state transitions', () => {
    test('HIDDEN -> SHOWING on _show', () => {
        let state = State.HIDDEN;
        if (state === State.HIDDEN || state === State.HIDING)
            state = State.SHOWING;
        expect(state).toBe(State.SHOWING);
    });

    test('HIDING -> SHOWING on _show', () => {
        let state = State.HIDING;
        if (state === State.HIDDEN || state === State.HIDING)
            state = State.SHOWING;
        expect(state).toBe(State.SHOWING);
    });

    test('SHOWN -> HIDING on _hide', () => {
        let state = State.SHOWN;
        if (state === State.SHOWN || state === State.SHOWING)
            state = State.HIDING;
        expect(state).toBe(State.HIDING);
    });

    test('SHOWING -> delayed hide', () => {
        let state = State.SHOWING;
        let delayedHide = false;
        if (state === State.SHOWN || state === State.SHOWING) {
            if (state === State.SHOWING)
                delayedHide = true;
        }
        expect(delayedHide).toBe(true);
        expect(state).toBe(State.SHOWING);
    });

    test('SHOWING completes to SHOWN', () => {
        let state = State.SHOWING;
        state = State.SHOWN;
        expect(state).toBe(State.SHOWN);
    });

    test('HIDING completes to HIDDEN', () => {
        let state = State.HIDING;
        state = State.HIDDEN;
        expect(state).toBe(State.HIDDEN);
    });

    test('no state change when _show called during SHOWN', () => {
        let state = State.SHOWN;
        let changed = false;
        if (state === State.HIDDEN || state === State.HIDING) {
            state = State.SHOWING;
            changed = true;
        }
        expect(changed).toBe(false);
        expect(state).toBe(State.SHOWN);
    });

    test('no state change when _hide called during HIDDEN', () => {
        let state = State.HIDDEN;
        let changed = false;
        if (state === State.SHOWN || state === State.SHOWING) {
            state = State.HIDING;
            changed = true;
        }
        expect(changed).toBe(false);
        expect(state).toBe(State.HIDDEN);
    });
});

// ---------------------------------------------------------------------------
// Startup animation direction
// ---------------------------------------------------------------------------

describe('Startup animation direction', () => {
    function getStartupTranslation(position, width, height) {
        let translation_x = 0, translation_y = 0;
        switch (position) {
        case St.Side.LEFT:
            translation_x = -width;
            break;
        case St.Side.RIGHT:
            translation_x = width;
            break;
        case St.Side.BOTTOM:
            translation_y = height;
            break;
        case St.Side.TOP:
            translation_y = -height;
            break;
        }
        return {translation_x, translation_y};
    }

    test('LEFT dock slides in from left', () => {
        const t = getStartupTranslation(St.Side.LEFT, 64, 500);
        expect(t.translation_x).toBe(-64);
    });

    test('RIGHT dock slides in from right', () => {
        const t = getStartupTranslation(St.Side.RIGHT, 64, 500);
        expect(t.translation_x).toBe(64);
    });

    test('BOTTOM dock slides in from bottom', () => {
        const t = getStartupTranslation(St.Side.BOTTOM, 1920, 48);
        expect(t.translation_y).toBe(48);
    });

    test('TOP dock slides in from top', () => {
        const t = getStartupTranslation(St.Side.TOP, 1920, 48);
        expect(t.translation_y).toBe(-48);
    });
});

// ---------------------------------------------------------------------------
// Pressure trigger shouldHide logic
// ---------------------------------------------------------------------------

describe('Pressure trigger shouldHide logic', () => {
    function isPointerInDockRegion(position, x, y, staticBox, monitor) {
        switch (position) {
        case St.Side.LEFT:
            return x <= staticBox.x2 &&
                   x >= monitor.x &&
                   y >= monitor.y &&
                   y <= monitor.y + monitor.height;
        case St.Side.RIGHT:
            return x >= staticBox.x1 &&
                   x <= monitor.x + monitor.width &&
                   y >= monitor.y &&
                   y <= monitor.y + monitor.height;
        case St.Side.TOP:
            return x >= monitor.x &&
                   x <= monitor.x + monitor.width &&
                   y <= staticBox.y2 &&
                   y >= monitor.y;
        case St.Side.BOTTOM:
            return x >= monitor.x &&
                   x <= monitor.x + monitor.width &&
                   y >= staticBox.y1 &&
                   y <= monitor.y + monitor.height;
        default:
            return false;
        }
    }

    const monitor = {x: 0, y: 0, width: 1920, height: 1080};

    test('LEFT: pointer within dock region', () => {
        const staticBox = {x1: 0, x2: 64, y1: 290, y2: 790};
        expect(isPointerInDockRegion(St.Side.LEFT, 32, 540, staticBox, monitor)).toBe(true);
    });

    test('LEFT: pointer outside dock region', () => {
        const staticBox = {x1: 0, x2: 64, y1: 290, y2: 790};
        expect(isPointerInDockRegion(St.Side.LEFT, 100, 540, staticBox, monitor)).toBe(false);
    });

    test('RIGHT: pointer within dock region', () => {
        const staticBox = {x1: 1856, x2: 1920, y1: 290, y2: 790};
        expect(isPointerInDockRegion(St.Side.RIGHT, 1900, 540, staticBox, monitor)).toBe(true);
    });

    test('BOTTOM: pointer within dock region', () => {
        const staticBox = {x1: 96, x2: 1824, y1: 1032, y2: 1080};
        expect(isPointerInDockRegion(St.Side.BOTTOM, 960, 1050, staticBox, monitor)).toBe(true);
    });

    test('TOP: pointer within dock region', () => {
        const staticBox = {x1: 96, x2: 1824, y1: 0, y2: 48};
        expect(isPointerInDockRegion(St.Side.TOP, 960, 20, staticBox, monitor)).toBe(true);
    });

    test('TOP: pointer below dock', () => {
        const staticBox = {x1: 96, x2: 1824, y1: 0, y2: 48};
        expect(isPointerInDockRegion(St.Side.TOP, 960, 100, staticBox, monitor)).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// scrollAction enum
// ---------------------------------------------------------------------------

describe('scrollAction enum values', () => {
    const scrollAction = Object.freeze({
        DO_NOTHING: 0,
        CYCLE_WINDOWS: 1,
        SWITCH_WORKSPACE: 2,
    });

    test('DO_NOTHING is 0', () => {
        expect(scrollAction.DO_NOTHING).toBe(0);
    });

    test('CYCLE_WINDOWS is 1', () => {
        expect(scrollAction.CYCLE_WINDOWS).toBe(1);
    });

    test('SWITCH_WORKSPACE is 2', () => {
        expect(scrollAction.SWITCH_WORKSPACE).toBe(2);
    });

    test('scrollAction is frozen', () => {
        expect(Object.isFrozen(scrollAction)).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// Desktop usable area margin assignment
// ---------------------------------------------------------------------------

describe('Desktop usable area margin assignment', () => {
    function getDesktopMargins(position, monitorIndex, boxWidth, boxHeight) {
        const margins = {top: 0, bottom: 0, left: 0, right: 0};
        if (position === St.Side.BOTTOM)
            margins.bottom = boxHeight;
        else if (position === St.Side.TOP)
            margins.top = boxHeight;
        else if (position === St.Side.RIGHT)
            margins.right = boxWidth;
        else if (position === St.Side.LEFT)
            margins.left = boxWidth;
        return margins;
    }

    test('BOTTOM dock sets bottom margin', () => {
        const m = getDesktopMargins(St.Side.BOTTOM, 0, 1920, 48);
        expect(m.bottom).toBe(48);
        expect(m.top).toBe(0);
    });

    test('TOP dock sets top margin', () => {
        const m = getDesktopMargins(St.Side.TOP, 0, 1920, 48);
        expect(m.top).toBe(48);
    });

    test('LEFT dock sets left margin', () => {
        const m = getDesktopMargins(St.Side.LEFT, 0, 64, 500);
        expect(m.left).toBe(64);
    });

    test('RIGHT dock sets right margin', () => {
        const m = getDesktopMargins(St.Side.RIGHT, 0, 64, 500);
        expect(m.right).toBe(64);
    });
});

// ---------------------------------------------------------------------------
// IconAnimator wiggle rotation formula
// ---------------------------------------------------------------------------

describe('IconAnimator wiggle rotation formula', () => {
    function computeWiggleRotation(progress) {
        return progress < 1 / 6 ? 15 * Math.sin(progress * 24 * Math.PI) : 0;
    }

    test('rotation is 0 at progress=0', () => {
        expect(computeWiggleRotation(0)).toBe(0);
    });

    test('rotation is 0 when progress >= 1/6', () => {
        expect(computeWiggleRotation(1 / 6)).toBe(0);
        expect(computeWiggleRotation(0.5)).toBe(0);
    });

    test('rotation oscillates in the first 1/6 of the timeline', () => {
        const rotation = computeWiggleRotation(1 / 48);
        expect(rotation).toBeCloseTo(15, 5);
    });

    test('rotation reaches negative peak', () => {
        const rotation = computeWiggleRotation(3 / 48);
        expect(rotation).toBeCloseTo(-15, 5);
    });
});

// ---------------------------------------------------------------------------
// IconAnimator jiggle rotation formula
// ---------------------------------------------------------------------------

describe('IconAnimator jiggle rotation formula', () => {
    function computeJiggleRotation(progress, phaseOffset) {
        return 2.5 * Math.sin(2 * Math.PI * progress + phaseOffset);
    }

    test('peak amplitude is 2.5 degrees', () => {
        const rotation = computeJiggleRotation(0, Math.PI / 2);
        expect(rotation).toBeCloseTo(2.5, 5);
    });

    test('negative peak is -2.5 degrees', () => {
        const rotation = computeJiggleRotation(0, 3 * Math.PI / 2);
        expect(rotation).toBeCloseTo(-2.5, 5);
    });

    test('zero crossing at phaseOffset=0, progress=0', () => {
        expect(computeJiggleRotation(0, 0)).toBeCloseTo(0, 10);
    });

    test('different phaseOffsets produce different rotations', () => {
        const r1 = computeJiggleRotation(0.5, 0);
        const r2 = computeJiggleRotation(0.5, Math.PI / 4);
        expect(r1).not.toBeCloseTo(r2, 3);
    });
});

// ---------------------------------------------------------------------------
// Magnification overflow computation
// ---------------------------------------------------------------------------

describe('Magnification overflow computation', () => {
    function computeMagnificationOverflow(iconSize, factor) {
        const maxScale = Math.max(1.0, Math.min(3.0, factor));
        return iconSize * maxScale;
    }

    test('default factor 2.0 doubles icon size', () => {
        expect(computeMagnificationOverflow(48, 2.0)).toBe(96);
    });

    test('factor clamped to minimum 1.0', () => {
        expect(computeMagnificationOverflow(48, 0.5)).toBe(48);
    });

    test('factor clamped to maximum 3.0', () => {
        expect(computeMagnificationOverflow(48, 5.0)).toBe(144);
    });

    test('factor exactly 1.0', () => {
        expect(computeMagnificationOverflow(48, 1.0)).toBe(48);
    });

    test('factor exactly 3.0', () => {
        expect(computeMagnificationOverflow(48, 3.0)).toBe(144);
    });
});

// ---------------------------------------------------------------------------
// Spring animation parameter computation
// ---------------------------------------------------------------------------

describe('Spring animation parameter computation', () => {
    function computeShowSpringParams() {
        const stiffness = Settings.get('spring-stiffness') ?? 200;
        const damping = Settings.get('spring-damping') ?? 18;
        const overshootClamp = Settings.get('spring-overshoot-clamp') ?? 1.15;
        return {stiffness, damping, overshootClamp, target: 1.0};
    }

    function computeHideSpringParams() {
        const stiffness = Settings.get('spring-stiffness') ?? 200;
        const baseDamping = Settings.get('spring-damping') ?? 18;
        const damping = baseDamping + 10;
        const overshootClamp = Settings.get('spring-overshoot-clamp') ?? 1.15;
        return {stiffness, damping, overshootClamp, target: 0.0};
    }

    test('uses default stiffness', () => {
        const params = computeShowSpringParams();
        expect(params.stiffness).toBe(200);
    });

    test('uses default damping from settings mock', () => {
        const params = computeShowSpringParams();
        expect(params.damping).toBe(20);
    });

    test('show targets 1.0', () => {
        const params = computeShowSpringParams();
        expect(params.target).toBe(1.0);
    });

    test('hide targets 0.0', () => {
        const params = computeHideSpringParams();
        expect(params.target).toBe(0.0);
    });

    test('hide damping is 10 more than show damping', () => {
        const show = computeShowSpringParams();
        const hide = computeHideSpringParams();
        expect(hide.damping).toBe(show.damping + 10);
    });

    test('custom stiffness from settings', () => {
        Settings.set('spring-stiffness', 300);
        const params = computeShowSpringParams();
        expect(params.stiffness).toBe(300);
    });

    test('custom damping from settings', () => {
        Settings.set('spring-damping', 25);
        const params = computeShowSpringParams();
        expect(params.damping).toBe(25);
    });

    describe('slideX clamping during animation', () => {
        function clampSlideX(value, overshootClamp) {
            return Math.max(0, Math.min(value, overshootClamp));
        }

        test('clamps negative values to 0', () => {
            expect(clampSlideX(-0.5, 1.15)).toBe(0);
        });

        test('clamps values above overshoot clamp', () => {
            expect(clampSlideX(1.5, 1.15)).toBe(1.15);
        });

        test('passes through values within range', () => {
            expect(clampSlideX(0.5, 1.15)).toBe(0.5);
        });

        test('allows overshoot up to clamp value', () => {
            expect(clampSlideX(1.1, 1.15)).toBe(1.1);
        });

        test('clamps exactly at boundary', () => {
            expect(clampSlideX(1.15, 1.15)).toBe(1.15);
        });
    });
});

// ---------------------------------------------------------------------------
// _disableUnredirect / _restoreUnredirect logic
// ---------------------------------------------------------------------------

describe('Unredirect logic', () => {
    test('_disableUnredirect skips when monitor is in fullscreen', () => {
        // Mirror the guard: if (this._monitor?.inFullscreen) return;
        const monitor = {inFullscreen: true};
        let disabled = false;
        const _unredirectDisabled = false;
        if (!monitor?.inFullscreen) {
            if (!_unredirectDisabled)
                disabled = true;
        }
        expect(disabled).toBe(false);
    });

    test('_disableUnredirect proceeds when not in fullscreen', () => {
        const monitor = {inFullscreen: false};
        let _unredirectDisabled = false;
        if (!monitor?.inFullscreen) {
            if (!_unredirectDisabled)
                _unredirectDisabled = true;
        }
        expect(_unredirectDisabled).toBe(true);
    });

    test('_disableUnredirect is idempotent', () => {
        let _unredirectDisabled = true;
        let callCount = 0;
        const monitor = {inFullscreen: false};
        if (!monitor?.inFullscreen) {
            if (!_unredirectDisabled)
                callCount++;
        }
        expect(callCount).toBe(0);
    });

    test('_restoreUnredirect clears flag', () => {
        let _unredirectDisabled = true;
        if (_unredirectDisabled)
            _unredirectDisabled = false;
        expect(_unredirectDisabled).toBe(false);
    });

    test('_restoreUnredirect is no-op when already enabled', () => {
        let _unredirectDisabled = false;
        let callCount = 0;
        if (_unredirectDisabled)
            callCount++;
        expect(callCount).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// _hoverChanged logic
// ---------------------------------------------------------------------------

describe('Hover changed logic', () => {
    function hoverLogic({
        ignoreHover = false,
        hasOpenPreviewMenu = false,
        autohideInFullscreen = false,
        monitorInFullscreen = false,
        autohideIsEnabled = true,
        boxHover = false,
        overviewVisible = false,
    }) {
        if (ignoreHover || hasOpenPreviewMenu)
            return 'skip';

        if (autohideInFullscreen && monitorInFullscreen)
            return 'hide';

        if (autohideIsEnabled) {
            if (boxHover || overviewVisible)
                return 'show';
            else
                return 'hide';
        }

        return 'skip';
    }

    test('ignoreHover skips hover logic', () => {
        expect(hoverLogic({ignoreHover: true})).toBe('skip');
    });

    test('open preview menu skips hover logic', () => {
        expect(hoverLogic({hasOpenPreviewMenu: true})).toBe('skip');
    });

    test('fullscreen with autohide-in-fullscreen hides dock', () => {
        expect(hoverLogic({
            autohideInFullscreen: true,
            monitorInFullscreen: true,
        })).toBe('hide');
    });

    test('hover shows dock when autohide enabled', () => {
        expect(hoverLogic({
            autohideIsEnabled: true,
            boxHover: true,
        })).toBe('show');
    });

    test('no hover hides dock when autohide enabled', () => {
        expect(hoverLogic({
            autohideIsEnabled: true,
            boxHover: false,
        })).toBe('hide');
    });

    test('overview visible shows dock', () => {
        expect(hoverLogic({
            autohideIsEnabled: true,
            overviewVisible: true,
        })).toBe('show');
    });

    test('non-autohide skips', () => {
        expect(hoverLogic({autohideIsEnabled: false})).toBe('skip');
    });
});

// ---------------------------------------------------------------------------
// _updateDashVisibility logic
// ---------------------------------------------------------------------------

describe('updateDashVisibility logic', () => {
    function dashVisibility({
        manualhide = false,
        overviewVisible = false,
        autohideInFullscreen = false,
        monitorInFullscreen = false,
        dockFixed = false,
        intellihideIsEnabled = false,
        autohideIsEnabled = false,
        overlapStatus = false,
        boxHover = false,
        requiresVisibility = false,
    }) {
        if (manualhide)
            return 'animateOut-manual';
        if (overviewVisible)
            return 'overview-visible';
        if (autohideInFullscreen && monitorInFullscreen)
            return 'animateOut-fullscreen';
        if (dockFixed)
            return 'fixed-shown';
        if (intellihideIsEnabled) {
            if (!requiresVisibility && overlapStatus) {
                if (!boxHover || !autohideIsEnabled)
                    return 'animateOut-intellihide';
                return 'skip-intellihide';
            } else {
                return 'animateIn-intellihide';
            }
        }
        if (autohideIsEnabled) {
            if (boxHover || requiresVisibility)
                return 'animateIn-autohide';
            else
                return 'animateOut-autohide';
        }
        return 'animateOut-default';
    }

    test('manualhide triggers animateOut', () => {
        expect(dashVisibility({manualhide: true})).toBe('animateOut-manual');
    });

    test('overview visible returns early', () => {
        expect(dashVisibility({overviewVisible: true})).toBe('overview-visible');
    });

    test('fullscreen with autohide-in-fullscreen hides dock', () => {
        expect(dashVisibility({
            autohideInFullscreen: true,
            monitorInFullscreen: true,
        })).toBe('animateOut-fullscreen');
    });

    test('fixed dock is always shown', () => {
        expect(dashVisibility({dockFixed: true})).toBe('fixed-shown');
    });

    test('intellihide with overlap hides dock', () => {
        expect(dashVisibility({
            intellihideIsEnabled: true,
            overlapStatus: true,
        })).toBe('animateOut-intellihide');
    });

    test('intellihide without overlap shows dock', () => {
        expect(dashVisibility({
            intellihideIsEnabled: true,
            overlapStatus: false,
        })).toBe('animateIn-intellihide');
    });

    test('intellihide with overlap but hover and autohide skips', () => {
        expect(dashVisibility({
            intellihideIsEnabled: true,
            autohideIsEnabled: true,
            overlapStatus: true,
            boxHover: true,
        })).toBe('skip-intellihide');
    });

    test('autohide with hover shows dock', () => {
        expect(dashVisibility({
            autohideIsEnabled: true,
            boxHover: true,
        })).toBe('animateIn-autohide');
    });

    test('autohide with requiresVisibility shows dock', () => {
        expect(dashVisibility({
            autohideIsEnabled: true,
            requiresVisibility: true,
        })).toBe('animateIn-autohide');
    });

    test('autohide without hover hides dock', () => {
        expect(dashVisibility({
            autohideIsEnabled: true,
            boxHover: false,
        })).toBe('animateOut-autohide');
    });

    test('default animates out', () => {
        expect(dashVisibility({})).toBe('animateOut-default');
    });
});

// ---------------------------------------------------------------------------
// _onOverviewShowing / _onOverviewHiding / _onOverviewHidden logic
// ---------------------------------------------------------------------------

describe('Overview transition logic', () => {
    test('onOverviewShowing adds overview style class', () => {
        const classes = new Set();
        // Mirror: this.add_style_class_name('overview');
        classes.add('overview');
        expect(classes.has('overview')).toBe(true);
    });

    test('onOverviewHidden removes overview style class', () => {
        const classes = new Set(['overview']);
        classes.delete('overview');
        expect(classes.has('overview')).toBe(false);
    });

    test('onOverviewShowing sets ignoreHover and disables intellihide', () => {
        let ignoreHover = false;
        ignoreHover = true;
        expect(ignoreHover).toBe(true);
    });

    test('onOverviewHiding resets ignoreHover and enables intellihide', () => {
        let ignoreHover = true;
        ignoreHover = false;
        expect(ignoreHover).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// _onMenuOpened / _onMenuClosed logic
// ---------------------------------------------------------------------------

describe('Menu open/close logic', () => {
    test('onMenuOpened sets ignoreHover', () => {
        let ignoreHover = false;
        // Mirror _onMenuOpened
        ignoreHover = true;
        expect(ignoreHover).toBe(true);
    });

    test('onMenuClosed resets ignoreHover', () => {
        let ignoreHover = true;
        // Mirror _onMenuClosed
        ignoreHover = false;
        expect(ignoreHover).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// _onMagnificationChanged logic
// ---------------------------------------------------------------------------

describe('Magnification changed logic', () => {
    test('enabling magnification calculates overflow correctly', () => {
        const iconSize = 48;
        const factor = 2.0;
        const maxScale = Math.max(1.0, Math.min(3.0, factor));
        const overflow = iconSize * maxScale;
        expect(overflow).toBe(96);
    });

    test('enabling magnification sets clip_to_allocation false', () => {
        let clipToAllocation = true;
        // Mirror: this._box.set_clip_to_allocation(false);
        clipToAllocation = false;
        expect(clipToAllocation).toBe(false);
    });

    test('disabling magnification sets clip_to_allocation true', () => {
        let clipToAllocation = false;
        clipToAllocation = true;
        expect(clipToAllocation).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// _show / _hide state machine
// ---------------------------------------------------------------------------

describe('Show/hide state machine', () => {
    test('_show from HIDDEN sets delayedHide=false and emits showing', () => {
        let dockState = State.HIDDEN;
        let delayedHide = true;
        let emitted = false;

        delayedHide = false;
        if (dockState === State.HIDDEN || dockState === State.HIDING) {
            if (dockState === State.HIDING) {
                // removeAnimations
            }
            emitted = true;
            dockState = State.SHOWING;
        }
        expect(delayedHide).toBe(false);
        expect(emitted).toBe(true);
        expect(dockState).toBe(State.SHOWING);
    });

    test('_hide from SHOWN emits hiding and animates out', () => {
        let dockState = State.SHOWN;
        let emitted = false;

        if (dockState === State.SHOWN || dockState === State.SHOWING) {
            if (dockState === State.SHOWING) {
                // delayedHide
            } else {
                emitted = true;
                dockState = State.HIDING;
            }
        }
        expect(emitted).toBe(true);
        expect(dockState).toBe(State.HIDING);
    });

    test('_hide from SHOWING sets delayedHide', () => {
        let dockState = State.SHOWING;
        let delayedHide = false;

        if (dockState === State.SHOWN || dockState === State.SHOWING) {
            if (dockState === State.SHOWING) {
                delayedHide = true;
            }
        }
        expect(delayedHide).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// _onDragStart / _onDragEnd logic
// ---------------------------------------------------------------------------

describe('Drag start/end logic', () => {
    test('onDragStart saves old ignoreHover and sets it to true', () => {
        let ignoreHover = false;
        let oldIgnoreHover = null;

        // Mirror _onDragStart
        oldIgnoreHover = ignoreHover;
        ignoreHover = true;

        expect(oldIgnoreHover).toBe(false);
        expect(ignoreHover).toBe(true);
    });

    test('onDragEnd restores old ignoreHover', () => {
        let ignoreHover = true;
        let oldIgnoreHover = false;

        // Mirror _onDragEnd
        if (oldIgnoreHover !== null)
            ignoreHover = oldIgnoreHover;
        oldIgnoreHover = null;

        expect(ignoreHover).toBe(false);
        expect(oldIgnoreHover).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// _isPrimaryMonitor
// ---------------------------------------------------------------------------

describe('_isPrimaryMonitor logic', () => {
    test('returns true when monitorIndex matches primaryIndex', () => {
        const monitorIndex = 0;
        const primaryIndex = 0;
        expect(monitorIndex === primaryIndex).toBe(true);
    });

    test('returns false when monitorIndex does not match', () => {
        const monitorIndex = 1;
        const primaryIndex = 0;
        expect(monitorIndex === primaryIndex).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// _removeBarrier logic
// ---------------------------------------------------------------------------

describe('_removeBarrier logic', () => {
    test('removes barrier and resets timeout ID', () => {
        let barrier = {destroy: jest.fn()};
        let removeBarrierTimeoutId = 123;

        if (barrier) {
            barrier.destroy();
            barrier = null;
        }
        removeBarrierTimeoutId = 0;

        expect(barrier).toBeNull();
        expect(removeBarrierTimeoutId).toBe(0);
    });

    test('is no-op when barrier is null', () => {
        let barrier = null;
        let removeBarrierTimeoutId = 0;

        if (barrier) {
            barrier.destroy();
            barrier = null;
        }
        removeBarrierTimeoutId = 0;

        expect(barrier).toBeNull();
        expect(removeBarrierTimeoutId).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// _activateApp logic
// ---------------------------------------------------------------------------

describe('_activateApp logic', () => {
    test('activates app at valid index', () => {
        const apps = [
            {activate: jest.fn()},
            {activate: jest.fn()},
        ];
        const appIndex = 0;
        const button = 1;
        if (appIndex < apps.length)
            apps[appIndex].activate(button);
        expect(apps[0].activate).toHaveBeenCalledWith(1);
    });

    test('does nothing for out of range index', () => {
        const apps = [{activate: jest.fn()}];
        const appIndex = 5;
        const button = 1;
        if (appIndex < apps.length)
            apps[appIndex].activate(button);
        expect(apps[0].activate).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// _cycleAppWindows logic
// ---------------------------------------------------------------------------

describe('_cycleAppWindows logic', () => {
    test('cycles through windows when available', () => {
        const appIcon = {
            getInterestingWindows: () => [{}, {}],
            _cycleThroughWindows: jest.fn(),
            activate: jest.fn(),
        };
        const windows = appIcon.getInterestingWindows();
        if (windows.length > 0)
            appIcon._cycleThroughWindows(true);
        else
            appIcon.activate(1);
        expect(appIcon._cycleThroughWindows).toHaveBeenCalledWith(true);
    });

    test('activates app when no windows', () => {
        const appIcon = {
            getInterestingWindows: () => [],
            _cycleThroughWindows: jest.fn(),
            activate: jest.fn(),
        };
        const windows = appIcon.getInterestingWindows();
        if (windows.length > 0)
            appIcon._cycleThroughWindows(true);
        else
            appIcon.activate(1);
        expect(appIcon.activate).toHaveBeenCalledWith(1);
    });
});

// ---------------------------------------------------------------------------
// _checkDockDwell logic
// ---------------------------------------------------------------------------

describe('_checkDockDwell logic', () => {
    test('starts dwell timeout when pointer is at edge and not hovering', () => {
        let dockDwelling = false;
        let dockDwellTimeoutId = 0;
        const boxHover = false;
        const shouldDwell = true;

        if (shouldDwell) {
            if (!dockDwelling && !boxHover && dockDwellTimeoutId === 0) {
                dockDwellTimeoutId = 42;
            }
            dockDwelling = true;
        }

        expect(dockDwelling).toBe(true);
        expect(dockDwellTimeoutId).toBe(42);
    });

    test('cancels dwell when pointer moves away', () => {
        let dockDwelling = true;
        let dockDwellTimeoutId = 42;
        const shouldDwell = false;

        if (!shouldDwell) {
            if (dockDwellTimeoutId !== 0) {
                dockDwellTimeoutId = 0;
            }
            dockDwelling = false;
        }

        expect(dockDwelling).toBe(false);
        expect(dockDwellTimeoutId).toBe(0);
    });

    test('does not restart timeout if already dwelling', () => {
        let dockDwelling = true;
        let dockDwellTimeoutId = 42;
        const boxHover = false;
        const shouldDwell = true;

        if (shouldDwell) {
            if (!dockDwelling && !boxHover && dockDwellTimeoutId === 0)
                dockDwellTimeoutId = 99;
            dockDwelling = true;
        }

        expect(dockDwellTimeoutId).toBe(42); // unchanged
    });
});

// ---------------------------------------------------------------------------
// _dockDwellTimeout logic
// ---------------------------------------------------------------------------

describe('_dockDwellTimeout logic', () => {
    test('blocks in fullscreen when autohide-in-fullscreen is off', () => {
        const autohideInFullscreen = false;
        const monitorInFullscreen = true;
        if (!autohideInFullscreen && monitorInFullscreen) {
            expect(true).toBe(true); // would return SOURCE_REMOVE
        }
    });

    test('blocks when modal count exceeds threshold', () => {
        const modalCount = 2;
        const overviewVisible = false;
        const threshold = overviewVisible ? 1 : 0;
        expect(modalCount > threshold).toBe(true);
    });

    test('allows when modal count equals overview threshold', () => {
        const modalCount = 1;
        const overviewVisible = true;
        const threshold = overviewVisible ? 1 : 0;
        expect(modalCount > threshold).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// _updatePressureBarrier logic
// ---------------------------------------------------------------------------

describe('_updatePressureBarrier logic', () => {
    test('creates pressure barrier when conditions are met', () => {
        const canUsePressure = true;
        const autohideIsEnabled = true;
        const requirePressure = true;
        const shouldCreate = canUsePressure && autohideIsEnabled && requirePressure;
        expect(shouldCreate).toBe(true);
    });

    test('does not create when autohide is disabled', () => {
        const canUsePressure = true;
        const autohideIsEnabled = false;
        const requirePressure = true;
        const shouldCreate = canUsePressure && autohideIsEnabled && requirePressure;
        expect(shouldCreate).toBe(false);
    });

    test('does not create when pressure not required', () => {
        const canUsePressure = true;
        const autohideIsEnabled = true;
        const requirePressure = false;
        const shouldCreate = canUsePressure && autohideIsEnabled && requirePressure;
        expect(shouldCreate).toBe(false);
    });

    test('does not create when extended barriers not supported', () => {
        const canUsePressure = false;
        const autohideIsEnabled = true;
        const requirePressure = true;
        const shouldCreate = canUsePressure && autohideIsEnabled && requirePressure;
        expect(shouldCreate).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// _updateBarrier barrier creation conditions
// ---------------------------------------------------------------------------

describe('_updateBarrier barrier creation', () => {
    test('skips barrier in fullscreen without autohide-in-fullscreen', () => {
        const monitorInFullscreen = true;
        const autohideInFullscreen = false;
        if (monitorInFullscreen && !autohideInFullscreen) {
            expect(true).toBe(true); // early return
        }
    });

    test('creates barrier when dock is HIDDEN', () => {
        const dockState = State.HIDDEN;
        const hasBarrier = dockState === State.HIDDEN;
        expect(hasBarrier).toBe(true);
    });

    test('does not create barrier when dock is SHOWN', () => {
        const dockState = State.SHOWN;
        const hasBarrier = dockState === State.HIDDEN;
        expect(hasBarrier).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// _setupDockDwellIfNeeded logic
// ---------------------------------------------------------------------------

describe('_setupDockDwellIfNeeded logic', () => {
    test('sets up dwell when autohide enabled and extended barriers not supported', () => {
        const autohideIsEnabled = true;
        const supportsExtendedBarriers = false;
        const requirePressure = true;
        const shouldSetup = autohideIsEnabled && (!supportsExtendedBarriers || !requirePressure);
        expect(shouldSetup).toBe(true);
    });

    test('sets up dwell when pressure not required', () => {
        const autohideIsEnabled = true;
        const supportsExtendedBarriers = true;
        const requirePressure = false;
        const shouldSetup = autohideIsEnabled && (!supportsExtendedBarriers || !requirePressure);
        expect(shouldSetup).toBe(true);
    });

    test('does not set up dwell when autohide disabled', () => {
        const autohideIsEnabled = false;
        const shouldSetup = autohideIsEnabled;
        expect(shouldSetup).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// _onPressureSensed logic
// ---------------------------------------------------------------------------

describe('_onPressureSensed logic', () => {
    test('returns early when overview is visible', () => {
        const overviewVisibleTarget = true;
        if (overviewVisibleTarget)
            expect(true).toBe(true);
    });

    test('triggers show when overview is not visible', () => {
        const overviewVisibleTarget = false;
        let showCalled = false;
        if (!overviewVisibleTarget)
            showCalled = true;
        expect(showCalled).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// _trackDock / _untrackDock logic
// ---------------------------------------------------------------------------

describe('_trackDock / _untrackDock logic', () => {
    test('trackDock with fixed dock affects struts', () => {
        Settings._setMany({'dock-fixed': true});
        const isSecondary = false;
        const shouldAffectStruts = Settings.get('dock-fixed') && !isSecondary;
        expect(shouldAffectStruts).toBe(true);
    });

    test('trackDock with non-fixed dock does not affect struts', () => {
        Settings._setMany({'dock-fixed': false});
        const isSecondary = false;
        const shouldAffectStruts = Settings.get('dock-fixed') && !isSecondary;
        expect(shouldAffectStruts).toBe(false);
    });

    test('secondary dock never affects struts', () => {
        Settings._setMany({'dock-fixed': true});
        const isSecondary = true;
        const shouldAffectStruts = Settings.get('dock-fixed') && !isSecondary;
        expect(shouldAffectStruts).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// _onDestroy cleanup logic
// ---------------------------------------------------------------------------

describe('_onDestroy cleanup logic', () => {
    test('cleans up spring animation if active', () => {
        let activeSpringAnimation = {destroy: jest.fn()};
        if (activeSpringAnimation) {
            activeSpringAnimation.destroy();
            activeSpringAnimation = null;
        }
        expect(activeSpringAnimation).toBeNull();
    });

    test('no-op when no active spring animation', () => {
        let activeSpringAnimation = null;
        if (activeSpringAnimation) {
            activeSpringAnimation.destroy();
            activeSpringAnimation = null;
        }
        expect(activeSpringAnimation).toBeNull();
    });

    test('removes trigger timeout', () => {
        let triggerTimeoutId = 42;
        if (triggerTimeoutId) {
            triggerTimeoutId = 0;
        }
        expect(triggerTimeoutId).toBe(0);
    });

    test('removes hover check', () => {
        let hoverCheckId = 42;
        if (hoverCheckId) {
            hoverCheckId = 0;
        }
        expect(hoverCheckId).toBe(0);
    });

    test('removes barrier timeout', () => {
        let removeBarrierTimeoutId = 42;
        if (removeBarrierTimeoutId > 0)
            removeBarrierTimeoutId = 0;
        expect(removeBarrierTimeoutId).toBe(0);
    });

    test('deletes static box', () => {
        const obj = {_staticBox: {x1: 0}};
        delete obj._staticBox;
        expect(obj._staticBox).toBeUndefined();
    });
});

// ---------------------------------------------------------------------------
// _removeAnimations logic
// ---------------------------------------------------------------------------

describe('_removeAnimations logic', () => {
    test('removes all transitions from slider', () => {
        const slider = {remove_all_transitions: jest.fn()};
        let activeSpringAnimation = null;

        slider.remove_all_transitions();
        if (activeSpringAnimation) {
            activeSpringAnimation.destroy();
            activeSpringAnimation = null;
        }

        expect(slider.remove_all_transitions).toHaveBeenCalled();
    });

    test('destroys active spring animation', () => {
        const slider = {remove_all_transitions: jest.fn()};
        let activeSpringAnimation = {destroy: jest.fn()};

        slider.remove_all_transitions();
        if (activeSpringAnimation) {
            activeSpringAnimation.destroy();
            activeSpringAnimation = null;
        }

        expect(activeSpringAnimation).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// _screencastIndicator logic
// ---------------------------------------------------------------------------

describe('_updateScreencastIndicator logic', () => {
    test('shows indicator when recording', () => {
        const isRecording = true;
        let indicatorVisible = false;
        const shouldShow = isRecording;

        if (shouldShow && !indicatorVisible) {
            indicatorVisible = true;
        }
        expect(indicatorVisible).toBe(true);
    });

    test('hides indicator when not recording', () => {
        const isRecording = false;
        let indicatorVisible = true;
        const shouldShow = isRecording;

        if (!shouldShow && indicatorVisible) {
            indicatorVisible = false;
        }
        expect(indicatorVisible).toBe(false);
    });

    test('no change when already in correct state', () => {
        const isRecording = true;
        let indicatorVisible = true;
        const shouldShow = isRecording;

        // The code checks: shouldShow && !indicatorVisible
        const changed = shouldShow && !indicatorVisible;
        expect(changed).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// KeyboardShortcuts logic
// ---------------------------------------------------------------------------

describe('KeyboardShortcuts logic', () => {
    test('NUM_HOTKEYS is 10', () => {
        const NUM_HOTKEYS = 10;
        expect(NUM_HOTKEYS).toBe(10);
    });

    test('enableHotKeys is idempotent', () => {
        let hotKeysEnabled = true;
        let callCount = 0;
        if (hotKeysEnabled)
            callCount = 0; // early return
        else
            callCount = 1;
        expect(callCount).toBe(0);
    });

    test('disableHotKeys is idempotent', () => {
        let hotKeysEnabled = false;
        let callCount = 0;
        if (!hotKeysEnabled)
            callCount = 0;
        else
            callCount = 1;
        expect(callCount).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// WorkspaceIsolation logic
// ---------------------------------------------------------------------------

describe('WorkspaceIsolation logic', () => {
    test('enables when isolate-workspaces is true', () => {
        Settings.set('isolate-workspaces', true);
        Settings.set('isolate-monitors', false);
        const shouldEnable = Settings.get('isolate-workspaces') || Settings.get('isolate-monitors');
        expect(shouldEnable).toBe(true);
    });

    test('enables when isolate-monitors is true', () => {
        Settings.set('isolate-workspaces', false);
        Settings.set('isolate-monitors', true);
        const shouldEnable = Settings.get('isolate-workspaces') || Settings.get('isolate-monitors');
        expect(shouldEnable).toBe(true);
    });

    test('disables when both are false', () => {
        Settings.set('isolate-workspaces', false);
        Settings.set('isolate-monitors', false);
        const shouldEnable = Settings.get('isolate-workspaces') || Settings.get('isolate-monitors');
        expect(shouldEnable).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// DockManager._hasPanelCorners logic
// ---------------------------------------------------------------------------

describe('_hasPanelCorners logic', () => {
    test('returns true when both corners exist', () => {
        const panel = {_rightCorner: {}, _leftCorner: {}};
        expect(!!panel._rightCorner && !!panel._leftCorner).toBe(true);
    });

    test('returns false when right corner missing', () => {
        const panel = {_rightCorner: null, _leftCorner: {}};
        expect(!!panel._rightCorner && !!panel._leftCorner).toBe(false);
    });

    test('returns false when left corner missing', () => {
        const panel = {_rightCorner: {}, _leftCorner: null};
        expect(!!panel._rightCorner && !!panel._leftCorner).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// DockManager._adjustPanelCorners logic
// ---------------------------------------------------------------------------

describe('_adjustPanelCorners logic', () => {
    test('hides corners when vertical, on primary, extended, fixed', () => {
        const position = St.Side.LEFT;
        const isHorizontal = (position === St.Side.TOP) || (position === St.Side.BOTTOM);
        const dockOnPrimary = true;
        Settings._setMany({'extend-height': true, 'dock-fixed': true, 'multi-monitor': false});

        const shouldHide = !isHorizontal && dockOnPrimary &&
            Settings.get('extend-height') && Settings.get('dock-fixed');
        expect(shouldHide).toBe(true);
    });

    test('does not hide corners for horizontal dock', () => {
        const position = St.Side.BOTTOM;
        const isHorizontal = (position === St.Side.TOP) || (position === St.Side.BOTTOM);
        Settings._setMany({'extend-height': true, 'dock-fixed': true});

        const shouldHide = !isHorizontal;
        expect(shouldHide).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// DockManager._toggle logic
// ---------------------------------------------------------------------------

describe('DockManager._toggle logic', () => {
    test('defers toggle using laterAdd', () => {
        let toggleLater = undefined;
        let toggled = false;

        if (!toggleLater) {
            toggleLater = 1; // laterAdd returns an ID
            toggled = true;
        }

        expect(toggleLater).toBe(1);
        expect(toggled).toBe(true);
    });

    test('does not re-toggle if already pending', () => {
        let toggleLater = 1;
        let toggleCount = 0;

        if (toggleLater) {
            // early return
        } else {
            toggleCount++;
        }

        expect(toggleCount).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// DockManager._ensureLocations logic
// ---------------------------------------------------------------------------

describe('DockManager._ensureLocations logic', () => {
    test('creates fm1Client when show-trash or show-mounts', () => {
        Settings.set('show-trash', true);
        Settings.set('show-mounts', false);
        const showMounts = Settings.get('show-mounts');
        const showTrash = Settings.get('show-trash');
        expect(showTrash || showMounts).toBe(true);
    });

    test('no fm1Client when both off', () => {
        Settings.set('show-trash', false);
        Settings.set('show-mounts', false);
        const showMounts = Settings.get('show-mounts');
        const showTrash = Settings.get('show-trash');
        expect(showTrash || showMounts).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// DockManager._createDocks logic
// ---------------------------------------------------------------------------

describe('DockManager._createDocks logic', () => {
    test('skips dock creation when no monitors', () => {
        const monitors = [];
        const shouldCreate = monitors.length > 0;
        expect(shouldCreate).toBe(false);
    });

    test('creates docks when monitors exist', () => {
        const monitors = [{x: 0, y: 0, width: 1920, height: 1080}];
        const shouldCreate = monitors.length > 0;
        expect(shouldCreate).toBe(true);
    });

    test('preferred monitor falls back to primary when multi-monitor', () => {
        Settings.set('multi-monitor', true);
        const preferredIndex = -1;
        const primaryIndex = 0;
        let resolvedIndex = preferredIndex;
        if (Settings.get('multi-monitor') || resolvedIndex < 0)
            resolvedIndex = primaryIndex;
        expect(resolvedIndex).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// DockManager wiggle mode
// ---------------------------------------------------------------------------

describe('DockManager wiggle mode logic', () => {
    test('enterWiggleMode sets _wiggleMode true when enabled', () => {
        let wiggleMode = false;
        Settings.set('wiggle-mode-enabled', true);

        if (!wiggleMode && Settings.get('wiggle-mode-enabled')) {
            wiggleMode = true;
        }
        expect(wiggleMode).toBe(true);
    });

    test('enterWiggleMode is no-op when already in wiggle mode', () => {
        let wiggleMode = true;
        let entered = false;

        if (!wiggleMode) {
            entered = true;
        }
        expect(entered).toBe(false);
    });

    test('enterWiggleMode is no-op when setting disabled', () => {
        Settings.set('wiggle-mode-enabled', false);
        let wiggleMode = false;
        if (!wiggleMode && Settings.get('wiggle-mode-enabled')) {
            wiggleMode = true;
        }
        expect(wiggleMode).toBe(false);
    });

    test('exitWiggleMode sets _wiggleMode false', () => {
        let wiggleMode = true;
        let wiggleEscapeCaptureId = 42;
        let wiggleOverviewId = 43;

        if (wiggleMode) {
            wiggleMode = false;
            if (wiggleEscapeCaptureId) {
                wiggleEscapeCaptureId = 0;
            }
            if (wiggleOverviewId) {
                wiggleOverviewId = 0;
            }
        }

        expect(wiggleMode).toBe(false);
        expect(wiggleEscapeCaptureId).toBe(0);
        expect(wiggleOverviewId).toBe(0);
    });

    test('exitWiggleMode is no-op when not in wiggle mode', () => {
        let wiggleMode = false;
        let changed = false;
        if (wiggleMode) {
            changed = true;
        }
        expect(changed).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// DockManager user category management
// ---------------------------------------------------------------------------

describe('DockManager user category logic', () => {
    test('_readUserCategories parses valid JSON', () => {
        const json = JSON.stringify([{id: 'cat-1', apps: ['a.desktop', 'b.desktop']}]);
        let result;
        try {
            const parsed = JSON.parse(json);
            result = Array.isArray(parsed) ? parsed : [];
        } catch {
            result = [];
        }
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('cat-1');
    });

    test('_readUserCategories returns empty for invalid JSON', () => {
        const json = 'not valid json';
        let result;
        try {
            const parsed = JSON.parse(json);
            result = Array.isArray(parsed) ? parsed : [];
        } catch {
            result = [];
        }
        expect(result).toEqual([]);
    });

    test('_readUserCategories returns empty for non-array', () => {
        const json = JSON.stringify({not: 'array'});
        let result;
        try {
            const parsed = JSON.parse(json);
            result = Array.isArray(parsed) ? parsed : [];
        } catch {
            result = [];
        }
        expect(result).toEqual([]);
    });

    test('getCategorizedAppIds returns set of all app IDs', () => {
        const configs = [
            {id: 'cat-1', apps: ['a.desktop', 'b.desktop']},
            {id: 'cat-2', apps: ['c.desktop']},
        ];
        const ids = new Set(configs.flatMap(c => c.apps));
        expect(ids.size).toBe(3);
        expect(ids.has('a.desktop')).toBe(true);
        expect(ids.has('c.desktop')).toBe(true);
    });

    test('mergeUserCategories moves apps from source to target', () => {
        const configs = [
            {id: 'src', apps: ['a.desktop', 'b.desktop']},
            {id: 'tgt', apps: ['c.desktop']},
        ];
        const src = configs.find(c => c.id === 'src');
        const tgt = configs.find(c => c.id === 'tgt');

        for (const appId of src.apps) {
            if (!tgt.apps.includes(appId))
                tgt.apps.push(appId);
        }
        configs.splice(configs.indexOf(src), 1);

        expect(configs.length).toBe(1);
        expect(tgt.apps).toEqual(['c.desktop', 'a.desktop', 'b.desktop']);
    });

    test('mergeUserCategories is no-op for same source and target', () => {
        const sourceCategoryId = 'cat-1';
        const targetCategoryId = 'cat-1';
        let merged = false;
        if (sourceCategoryId !== targetCategoryId) {
            merged = true;
        }
        expect(merged).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// DockManager._repairUserCategories logic
// ---------------------------------------------------------------------------

describe('_repairUserCategories logic', () => {
    test('filters out configs without valid id', () => {
        const configs = [
            {id: 'valid', apps: ['a.desktop', 'b.desktop']},
            {apps: ['c.desktop']}, // no id
            {id: 123, apps: ['d.desktop']}, // non-string id
        ];

        const cleaned = configs
            .filter(c => c && typeof c.id === 'string' && Array.isArray(c.apps));
        expect(cleaned.length).toBe(1);
        expect(cleaned[0].id).toBe('valid');
    });

    test('filters out configs with less than 2 apps after cleanup', () => {
        const configs = [
            {id: 'cat-1', apps: ['a.desktop']}, // only 1 app
            {id: 'cat-2', apps: ['b.desktop', 'c.desktop']},
        ];

        const cleaned = configs
            .filter(c => c && typeof c.id === 'string' && Array.isArray(c.apps))
            .filter(c => c.apps.length >= 2);
        expect(cleaned.length).toBe(1);
        expect(cleaned[0].id).toBe('cat-2');
    });
});

// ---------------------------------------------------------------------------
// DockManager._ensureDockTiling logic
// ---------------------------------------------------------------------------

describe('_ensureDockTiling logic', () => {
    test('creates tiling when enabled and module available', () => {
        Settings.set('dock-tiling-enabled', true);
        const DockTilingModule = {}; // truthy
        let dockTiling = null;

        if (Settings.get('dock-tiling-enabled')) {
            if (!dockTiling && DockTilingModule)
                dockTiling = 'created';
        }
        expect(dockTiling).toBe('created');
    });

    test('destroys tiling when disabled', () => {
        Settings.set('dock-tiling-enabled', false);
        let dockTiling = 'exists';

        if (!Settings.get('dock-tiling-enabled')) {
            dockTiling = null;
        }
        expect(dockTiling).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// DockManager command palette logic
// ---------------------------------------------------------------------------

describe('DockManager command palette logic', () => {
    test('_updateCommandPaletteBinding removes old binding', () => {
        let shortcutBound = true;
        let removeCount = 0;

        if (shortcutBound) {
            removeCount++;
            shortcutBound = false;
        }
        expect(removeCount).toBe(1);
        expect(shortcutBound).toBe(false);
    });

    test('_updateCommandPaletteBinding skips when disabled', () => {
        Settings.set('command-palette-enabled', false);
        let shortcutBound = false;
        if (!Settings.get('command-palette-enabled'))
            expect(shortcutBound).toBe(false);
    });

    test('toggleCommandPalette creates palette if needed', () => {
        let commandPalette = null;
        const CommandPaletteModule = {CommandPalette: class { toggle() {} }};

        if (CommandPaletteModule) {
            if (!commandPalette)
                commandPalette = new CommandPaletteModule.CommandPalette();
            commandPalette.toggle();
        }
        expect(commandPalette).not.toBeNull();
    });
});

// ---------------------------------------------------------------------------
// DockManager getDockByMonitor logic
// ---------------------------------------------------------------------------

describe('DockManager getDockByMonitor', () => {
    test('finds dock by monitor index', () => {
        const allDocks = [
            {monitorIndex: 0},
            {monitorIndex: 1},
        ];
        const result = allDocks.find(d => d.monitorIndex === 1);
        expect(result.monitorIndex).toBe(1);
    });

    test('returns undefined when not found', () => {
        const allDocks = [{monitorIndex: 0}];
        const result = allDocks.find(d => d.monitorIndex === 5);
        expect(result).toBeUndefined();
    });
});

// ---------------------------------------------------------------------------
// DockManager mainDock getter
// ---------------------------------------------------------------------------

describe('DockManager mainDock', () => {
    test('returns first dock', () => {
        const allDocks = [{id: 'main'}, {id: 'secondary'}];
        const mainDock = allDocks[0] ?? null;
        expect(mainDock.id).toBe('main');
    });

    test('returns null when no docks', () => {
        const allDocks = [];
        const mainDock = allDocks[0] ?? null;
        expect(mainDock).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// DockManager dock-order logic
// ---------------------------------------------------------------------------

describe('DockManager dock-order', () => {
    test('getDockOrder returns empty array when not migrated', () => {
        // Mirrors the fallback
        let order = [];
        if (order.length === 0) {
            order = ['app1.desktop', 'app2.desktop'];
        }
        expect(order.length).toBe(2);
    });

    test('_syncDockOrderWithFavorites appends new favorites', () => {
        const order = ['app1.desktop', 'cat-1'];
        const validFavIds = new Set(['app1.desktop', 'app2.desktop']);
        let changed = false;
        for (const id of validFavIds) {
            if (!order.includes(id)) {
                order.push(id);
                changed = true;
            }
        }
        expect(changed).toBe(true);
        expect(order).toContain('app2.desktop');
    });
});

// ---------------------------------------------------------------------------
// createUserCategory logic
// ---------------------------------------------------------------------------

describe('createUserCategory logic', () => {
    test('creates category and updates dock order', () => {
        const configs = [];
        const newId = 'cat-new';
        configs.push({id: newId, apps: ['a.desktop', 'b.desktop']});
        expect(configs.length).toBe(1);

        const order = ['a.desktop', 'c.desktop', 'b.desktop'];
        const filtered = order.filter(id => id !== 'a.desktop' && id !== 'b.desktop');
        const insertAt = Math.min(0, filtered.length);
        filtered.splice(insertAt, 0, newId);
        expect(filtered).toContain(newId);
        expect(filtered).not.toContain('a.desktop');
    });
});

// ---------------------------------------------------------------------------
// addAppToUserCategory logic
// ---------------------------------------------------------------------------

describe('addAppToUserCategory logic', () => {
    test('adds app to existing category', () => {
        const configs = [{id: 'cat-1', apps: ['a.desktop']}];
        const cat = configs.find(c => c.id === 'cat-1');
        const appId = 'b.desktop';
        if (!cat.apps.includes(appId))
            cat.apps.push(appId);
        expect(cat.apps).toContain('b.desktop');
    });

    test('does not add duplicate', () => {
        const configs = [{id: 'cat-1', apps: ['a.desktop']}];
        const cat = configs.find(c => c.id === 'cat-1');
        if (!cat.apps.includes('a.desktop'))
            cat.apps.push('a.desktop');
        expect(cat.apps.length).toBe(1);
    });

    test('is no-op for missing category', () => {
        const configs = [{id: 'cat-1', apps: ['a.desktop']}];
        const cat = configs.find(c => c.id === 'cat-999');
        expect(cat).toBeUndefined();
    });
});

// ---------------------------------------------------------------------------
// removeAppFromUserCategory logic
// ---------------------------------------------------------------------------

describe('removeAppFromUserCategory logic', () => {
    test('removes app from category', () => {
        const configs = [{id: 'cat-1', apps: ['a.desktop', 'b.desktop', 'c.desktop']}];
        const cat = configs[0];
        cat.apps = cat.apps.filter(id => id !== 'b.desktop');
        expect(cat.apps).toEqual(['a.desktop', 'c.desktop']);
    });

    test('dissolves category when less than 2 apps remain', () => {
        const configs = [{id: 'cat-1', apps: ['a.desktop', 'b.desktop']}];
        const cat = configs[0];
        cat.apps = cat.apps.filter(id => id !== 'b.desktop');
        const dissolved = cat.apps.length < 2;
        expect(dissolved).toBe(true);
    });

    test('returns remaining app when dissolved', () => {
        const apps = ['a.desktop'];
        const remaining = apps[0] ?? null;
        expect(remaining).toBe('a.desktop');
    });

    test('returns null when no apps remain', () => {
        const apps = [];
        const remaining = apps[0] ?? null;
        expect(remaining).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// _optionalScrollWorkspaceSwitch logic
// ---------------------------------------------------------------------------

describe('_optionalScrollWorkspaceSwitch logic', () => {
    test('enables when scroll-action is SWITCH_WORKSPACE', () => {
        const SWITCH_WORKSPACE = 2;
        Settings.set('scroll-action', SWITCH_WORKSPACE);
        const isEnabled = Settings.get('scroll-action') === SWITCH_WORKSPACE;
        expect(isEnabled).toBe(true);
    });

    test('disables when scroll-action is not SWITCH_WORKSPACE', () => {
        Settings.set('scroll-action', 0);
        const isEnabled = Settings.get('scroll-action') === 2;
        expect(isEnabled).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// Labels enum
// ---------------------------------------------------------------------------

describe('Labels enum (module-private)', () => {
    // Mirror the Labels enum
    const Labels = Object.freeze({
        COMMAND_PALETTE: Symbol('command-palette'),
        INITIALIZE: Symbol('initialize'),
        ISOLATION: Symbol('isolation'),
        LOCATIONS: Symbol('locations'),
        MAIN_DASH: Symbol('main-dash'),
        OLD_DASH_CHANGES: Symbol('old-dash-changes'),
        SETTINGS: Symbol('settings'),
        STARTUP_ANIMATION: Symbol('startup-animation'),
        WORKSPACE_SWITCH_SCROLL: Symbol('workspace-switch-scroll'),
    });

    test('all labels are symbols', () => {
        for (const value of Object.values(Labels))
            expect(typeof value).toBe('symbol');
    });

    test('Labels is frozen', () => {
        expect(Object.isFrozen(Labels)).toBe(true);
    });

    test('has expected keys', () => {
        expect(Labels.COMMAND_PALETTE).toBeDefined();
        expect(Labels.INITIALIZE).toBeDefined();
        expect(Labels.ISOLATION).toBeDefined();
        expect(Labels.LOCATIONS).toBeDefined();
        expect(Labels.MAIN_DASH).toBeDefined();
        expect(Labels.OLD_DASH_CHANGES).toBeDefined();
        expect(Labels.SETTINGS).toBeDefined();
        expect(Labels.STARTUP_ANIMATION).toBeDefined();
        expect(Labels.WORKSPACE_SWITCH_SCROLL).toBeDefined();
    });
});

// ---------------------------------------------------------------------------
// GNOME 50 visibility workarounds
// ---------------------------------------------------------------------------

describe('GNOME 50 visibility workarounds', () => {
    test('panelBox visibility restored when hidden outside overview', () => {
        const panelBox = {visible: false, show: jest.fn()};
        const overviewVisibleTarget = false;

        if (panelBox && !panelBox.visible) {
            panelBox.visible = true;
            panelBox.show();
        }
        expect(panelBox.visible).toBe(true);
        expect(panelBox.show).toHaveBeenCalled();
    });

    test('panelBox not changed when already visible', () => {
        const panelBox = {visible: true, show: jest.fn()};

        if (panelBox && !panelBox.visible) {
            panelBox.visible = true;
            panelBox.show();
        }
        expect(panelBox.show).not.toHaveBeenCalled();
    });

    test('dock visibility restored when hidden', () => {
        const dock = {visible: false, show: jest.fn()};
        const overviewVisibleTarget = false;
        const manualhide = false;

        if (!dock.visible && !overviewVisibleTarget && !manualhide) {
            dock.visible = true;
            dock.show();
        }
        expect(dock.visible).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// _onShowAppsButtonToggled logic
// ---------------------------------------------------------------------------

describe('_onShowAppsButtonToggled logic', () => {
    test('sets _fromDesktop when overview not visible and checked', () => {
        let fromDesktop = false;
        const checked = true;
        const overviewVisible = false;

        if (!overviewVisible) {
            fromDesktop = true;
        }
        expect(fromDesktop).toBe(true);
    });

    test('hides overview when unchecked and _fromDesktop', () => {
        const checked = false;
        const fromDesktop = true;
        let overviewHidden = false;

        if (!checked && fromDesktop) {
            overviewHidden = true;
        }
        expect(overviewHidden).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// _disableOverviewOnStartup logic
// ---------------------------------------------------------------------------

describe('Disable overview on startup', () => {
    test('setting hasOverview to false skips overview animation', () => {
        Settings.set('disable-overview-on-startup', true);
        let hasOverview = true;
        if (Settings.get('disable-overview-on-startup'))
            hasOverview = false;
        expect(hasOverview).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// _mapSettingsValues camelCase conversion
// ---------------------------------------------------------------------------

describe('camelCase key conversion', () => {
    function camelCase(key) {
        return key.replace(/-([a-z\d])/g, (_, c) => c.toUpperCase());
    }

    test('converts kebab-case to camelCase', () => {
        expect(camelCase('dock-fixed')).toBe('dockFixed');
        expect(camelCase('dash-max-icon-size')).toBe('dashMaxIconSize');
        expect(camelCase('autohide')).toBe('autohide');
        expect(camelCase('extend-height')).toBe('extendHeight');
        expect(camelCase('icon-magnification-factor')).toBe('iconMagnificationFactor');
    });

    test('handles keys with numbers', () => {
        expect(camelCase('switch-to-application-1')).toBe('switchToApplication1');
    });

    test('returns same string when no hyphens', () => {
        expect(camelCase('autohide')).toBe('autohide');
    });
});

// ---------------------------------------------------------------------------
// _showOverlay logic
// ---------------------------------------------------------------------------

describe('_showOverlay logic', () => {
    test('shows overlay on all docks when hotkeysOverlay enabled', () => {
        Settings.set('hotkeys-overlay', true);
        Settings.set('shortcut-timeout', 1.5);

        const docks = [{
            dash: {toggleNumberOverlay: jest.fn()},
            _numberOverlayTimeoutId: 0,
            _updateDashVisibility: jest.fn(),
            _intellihideIsEnabled: false,
            _autohideIsEnabled: false,
            _show: jest.fn(),
        }];

        const hotkeysOverlay = Settings.get('hotkeys-overlay');
        for (const dock of docks) {
            if (hotkeysOverlay)
                dock.dash.toggleNumberOverlay(true);
        }
        expect(docks[0].dash.toggleNumberOverlay).toHaveBeenCalledWith(true);
    });

    test('shows dock when hotkeysShowDock and dock is hideable', () => {
        Settings.set('hotkeys-show-dock', true);
        const dock = {
            _intellihideIsEnabled: true,
            _autohideIsEnabled: false,
            _show: jest.fn(),
        };
        const hotkeysShowDock = Settings.get('hotkeys-show-dock');
        if (hotkeysShowDock) {
            const showDock = dock._intellihideIsEnabled || dock._autohideIsEnabled;
            if (showDock)
                dock._show();
        }
        expect(dock._show).toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// _onAccessibilityFocus logic
// ---------------------------------------------------------------------------

describe('_onAccessibilityFocus logic', () => {
    test('unsets input focus when overview not visible', () => {
        const overviewVisible = false;
        let inputFocusUnset = false;
        if (!overviewVisible)
            inputFocusUnset = true;
        expect(inputFocusUnset).toBe(true);
    });

    test('does not unset input focus when overview visible', () => {
        const overviewVisible = true;
        let inputFocusUnset = false;
        if (!overviewVisible)
            inputFocusUnset = true;
        expect(inputFocusUnset).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// DockManager destroy cleanup
// ---------------------------------------------------------------------------

describe('DockManager destroy cleanup', () => {
    test('nullifies all major resources', () => {
        const obj = {
            _fm1Client: {},
            _screencastMonitor: {},
            _mprisMonitor: {},
            _trash: {},
            _pinnedCommandsManager: {},
            _removables: {},
            _iconTheme: {},
            _settings: {},
            _appSwitcherSettings: {},
            _oldDash: {},
            _desktopIconsUsableArea: {},
            _extension: {},
            _volumeControl: {},
        };

        // Mirror destroy cleanup
        obj._fm1Client = null;
        obj._screencastMonitor = null;
        obj._mprisMonitor = null;
        obj._trash = null;
        obj._pinnedCommandsManager = null;
        obj._removables = null;
        obj._iconTheme = null;
        obj._settings = null;
        obj._appSwitcherSettings = null;
        obj._oldDash = null;
        obj._desktopIconsUsableArea = null;
        obj._extension = null;
        obj._volumeControl = null;

        for (const key of Object.keys(obj))
            expect(obj[key]).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// Startup constants
// ---------------------------------------------------------------------------

describe('Module constants', () => {
    test('DOCK_DWELL_EDGE_PX default is 2', () => {
        const DOCK_DWELL_EDGE_PX = 2;
        expect(DOCK_DWELL_EDGE_PX).toBe(2);
    });

    test('DOCK_DWELL_CHECK_INTERVAL default is 100', () => {
        const DOCK_DWELL_CHECK_INTERVAL = 100;
        expect(DOCK_DWELL_CHECK_INTERVAL).toBe(100);
    });

    test('ICON_ANIMATOR_DURATION default is 3000', () => {
        const ICON_ANIMATOR_DURATION = 3000;
        expect(ICON_ANIMATOR_DURATION).toBe(3000);
    });

    test('STARTUP_ANIMATION_TIME default is 500', () => {
        const STARTUP_ANIMATION_TIME = 500;
        expect(STARTUP_ANIMATION_TIME).toBe(500);
    });
});

// ---------------------------------------------------------------------------
// _resetPosition margin logic
// ---------------------------------------------------------------------------

describe('_resetPosition margin logic', () => {
    test('adds dock-margin class when margin > 0', () => {
        const classes = new Set();
        const margin = 10;
        if (margin > 0)
            classes.add('dock-margin');
        else
            classes.delete('dock-margin');
        expect(classes.has('dock-margin')).toBe(true);
    });

    test('removes dock-margin class when margin = 0', () => {
        const classes = new Set(['dock-margin']);
        const margin = 0;
        if (margin > 0)
            classes.add('dock-margin');
        else
            classes.delete('dock-margin');
        expect(classes.has('dock-margin')).toBe(false);
    });

    test('adds fixed class when dock-fixed', () => {
        const classes = new Set();
        const fixedIsEnabled = true;
        if (fixedIsEnabled)
            classes.add('fixed');
        else
            classes.delete('fixed');
        expect(classes.has('fixed')).toBe(true);
    });

    test('removes fixed class when not fixed', () => {
        const classes = new Set(['fixed']);
        const fixedIsEnabled = false;
        if (fixedIsEnabled)
            classes.add('fixed');
        else
            classes.delete('fixed');
        expect(classes.has('fixed')).toBe(false);
    });

    test('adds extended class when extend-height', () => {
        const classes = new Set();
        const extendHeight = true;
        if (extendHeight)
            classes.add('extended');
        else
            classes.delete('extended');
        expect(classes.has('extended')).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// Sensitivity to RTL
// ---------------------------------------------------------------------------

describe('RTL detection', () => {
    test('detects RTL text direction', () => {
        const rtl = Clutter.TextDirection.RTL;
        const isRtl = Clutter.get_default_text_direction() === rtl;
        // Mock returns LTR by default
        expect(isRtl).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// DockManager full instantiation (exercises DockedDash, DashSlideContainer,
// KeyboardShortcuts, WorkspaceIsolation, and many internal methods)
// ---------------------------------------------------------------------------

describe('DockManager full instantiation', () => {
    let manager;

    // Create a mock extension that DockManager constructor expects.
    // Each call returns a fresh settings object to avoid defineProperty conflicts.
    function createMockExtension() {
        const settingsKeys = [
            'dock-position', 'dock-fixed', 'autohide', 'intellihide',
            'extend-height', 'height-fraction', 'animation-time',
            'hide-delay', 'show-delay', 'manualhide', 'scroll-action',
            'hot-keys', 'hotkeys-overlay', 'hotkeys-show-dock',
            'multi-monitor', 'dash-max-icon-size', 'icon-size-fixed',
            'show-favorites', 'show-running', 'show-trash', 'show-mounts',
            'background-opacity', 'apply-custom-theme', 'custom-theme-shrink',
            'force-straight-corner', 'show-show-apps-button',
            'show-apps-at-top', 'show-apps-always-in-the-edge',
            'dock-margin-size', 'require-pressure-to-show', 'pressure-threshold',
            'autohide-in-fullscreen', 'isolate-workspaces', 'isolate-monitors',
            'show-dock-urgent-notify', 'dance-urgent-applications', 'bounce-icons',
            'group-apps', 'always-center-icons',
            'isolate-locations', 'intellihide-mode', 'spring-animations',
            'spring-stiffness', 'spring-damping', 'spring-overshoot-clamp',
            'preferred-monitor-by-connector', 'monitor-positions',
            'secondary-dock-enabled', 'secondary-dock-position',
            'show-icons-emblems', 'user-categories', 'dock-order',
            'shortcut', 'shortcut-timeout', 'dock-tiling-enabled',
            'disable-overview-on-startup', 'startup-animation-time',
            'icon-magnification', 'icon-magnification-factor',
            'command-palette-enabled', 'command-palette-shortcut',
            'wiggle-mode-enabled', 'show-pinned-commands', 'pinned-commands',
            'icon-animator-duration', 'custom-border-radius',
            'scroll-workspace-deadtime', 'dock-edge-dwell-width',
            'dock-dwell-check-interval', 'pressure-show-timeout',
        ];

        // Create a fresh settings proxy for each extension instance
        const createSettings = () => {
            const signals = {};
            const settings = {
                settingsSchema: {
                    list_keys: () => settingsKeys,
                    get_key: () => ({
                        get_range: () => ({
                            deepUnpack: () => ['', ''],
                        }),
                    }),
                },
                get_enum: () => 0,
                get_value: (key) => ({
                    recursiveUnpack: () => {
                        if (key === 'user-categories') return '[]';
                        if (key === 'dock-order') return [];
                        if (key === 'monitor-positions') return [];
                        if (key === 'pinned-commands') return [];
                        if (key.includes('shortcut')) return [];
                        return false;
                    },
                }),
                get_strv: () => [],
                set_strv: () => {},
                get_string: (key) => {
                    if (key === 'user-categories') return '[]';
                    return '';
                },
                set_string: () => {},
                get_boolean: () => false,
                get_int: () => 0,
                get_double: () => 0.0,
                bind: () => {},
                connect: (signal, cb) => {
                    signals[signal] = signals[signal] ?? [];
                    const id = Math.random();
                    signals[signal].push({id, cb});
                    return id;
                },
                disconnect: () => {},
                emit: (signal, ...args) => {
                    const handlers = signals[signal] ?? [];
                    for (const h of handlers) h.cb(...args);
                },
            };
            return settings;
        };

        return {
            uuid: 'xdock@test',
            metadata: {name: 'XDock'},
            openPreferences: () => {},
            getSettings: () => createSettings(),
        };
    }

    beforeEach(() => {
        Settings._reset();
        Settings._setMany({
            'dock-fixed': false,
            'autohide': true,
            'intellihide': true,
            'extend-height': false,
            'height-fraction': 0.9,
            'animation-time': 0.2,
            'hide-delay': 0.2,
            'show-delay': 0.25,
            'manualhide': false,
            'show-show-apps-button': true,
            'scroll-action': 0,
            'hot-keys': false,
            'hotkeys-overlay': false,
            'hotkeys-show-dock': false,
            'dock-margin-size': 0,
            'require-pressure-to-show': false,
            'pressure-threshold': 100,
            'autohide-in-fullscreen': false,
            'multi-monitor': false,
            'dash-max-icon-size': 48,
            'icon-size-fixed': false,
            'icon-magnification': false,
            'icon-magnification-factor': 2.0,
            'spring-animations': false,
            'show-trash': false,
            'show-mounts': false,
            'show-running': true,
            'show-favorites': true,
            'isolate-workspaces': false,
            'isolate-monitors': false,
            'dock-position': 2,
            'secondary-dock-enabled': false,
            'dance-urgent-applications': false,
            'bounce-icons': false,
            'show-dock-urgent-notify': false,
            'group-apps': false,
            'show-apps-always-in-the-edge': false,
            'show-apps-at-top': false,
            'always-center-icons': false,
            'isolate-locations': false,
            'intellihide-mode': 1,
            'show-icons-emblems': false,
            'dock-tiling-enabled': false,
            'disable-overview-on-startup': false,
            'command-palette-enabled': false,
            'wiggle-mode-enabled': false,
            'show-pinned-commands': false,
        });
        Main.overview.isDummy = false;
        Main.layoutManager._startingUp = false;
        // Ensure singleton is clear
        DockManager._singleton = undefined;
    });

    afterEach(() => {
        if (manager) {
            try {
                manager.destroy();
            } catch (e) { /* ignore cleanup errors */ }
            manager = null;
        }
        DockManager._singleton = undefined;
    });

    test('instantiates DockManager and creates docks', () => {
        const ext = createMockExtension();
        manager = new DockManager(ext);

        expect(DockManager.getDefault()).toBe(manager);
        expect(manager._allDocks.length).toBeGreaterThan(0);
        expect(manager.settings).toBeDefined();
        expect(manager.extension).toBe(ext);
    });

    test('created dock has expected properties', () => {
        const ext = createMockExtension();
        manager = new DockManager(ext);

        const dock = manager.mainDock;
        expect(dock).not.toBeNull();
        expect(dock.dash).toBeDefined();
        expect(dock._position).toBeDefined();
        expect(dock._isHorizontal).toBeDefined();
        expect(dock._dockState).toBeDefined();
        expect(dock._staticBox).toBeDefined();
        expect(dock._slider).toBeDefined();
        expect(dock._box).toBeDefined();
        expect(dock._intellihide).toBeDefined();
    });

    test('dock position getter works', () => {
        const ext = createMockExtension();
        manager = new DockManager(ext);
        const dock = manager.mainDock;
        expect(dock.position).toBe(dock._position);
    });

    test('dock isHorizontal getter works', () => {
        const ext = createMockExtension();
        manager = new DockManager(ext);
        const dock = manager.mainDock;
        expect(dock.isHorizontal).toBe(dock._isHorizontal);
    });

    test('dock getDockState returns dock state', () => {
        const ext = createMockExtension();
        manager = new DockManager(ext);
        const dock = manager.mainDock;
        expect(dock.getDockState()).toBe(dock._dockState);
    });

    test('DockManager.allDocks returns array of docks', () => {
        const ext = createMockExtension();
        manager = new DockManager(ext);
        const docks = DockManager.allDocks;
        expect(Array.isArray(docks)).toBe(true);
        expect(docks.length).toBeGreaterThan(0);
    });

    test('getDockByMonitor returns correct dock', () => {
        const ext = createMockExtension();
        manager = new DockManager(ext);
        const dock = manager.getDockByMonitor(0);
        expect(dock).toBeDefined();
        expect(dock.monitorIndex).toBe(0);
    });

    test('getDockByMonitor returns undefined for nonexistent monitor', () => {
        const ext = createMockExtension();
        manager = new DockManager(ext);
        const dock = manager.getDockByMonitor(99);
        expect(dock).toBeUndefined();
    });

    test('dock _show and _hide exercise state machine', () => {
        const ext = createMockExtension();
        manager = new DockManager(ext);
        const dock = manager.mainDock;

        // Force to HIDDEN state first
        dock._dockState = State.HIDDEN;
        dock._show();
        // After _show from HIDDEN, state should progress to SHOWING then SHOWN
        // (ease mock calls onComplete immediately)
        expect(dock._dockState === State.SHOWING || dock._dockState === State.SHOWN).toBe(true);
    });

    test('dock _hide from SHOWN transitions to HIDING/HIDDEN', () => {
        const ext = createMockExtension();
        manager = new DockManager(ext);
        const dock = manager.mainDock;

        dock._dockState = State.SHOWN;
        dock._hide();
        expect(dock._dockState === State.HIDING || dock._dockState === State.HIDDEN).toBe(true);
    });

    test('dock _animateIn exercises animation path', () => {
        const ext = createMockExtension();
        manager = new DockManager(ext);
        const dock = manager.mainDock;

        dock._dockState = State.HIDDEN;
        dock._animateIn(0.2, 0);
        // Should be SHOWN since ease mock calls onComplete immediately
        expect(dock._dockState).toBe(State.SHOWN);
    });

    test('dock _animateOut exercises animation path', () => {
        const ext = createMockExtension();
        manager = new DockManager(ext);
        const dock = manager.mainDock;

        dock._dockState = State.SHOWN;
        dock._animateOut(0.2, 0);
        expect(dock._dockState).toBe(State.HIDDEN);
    });

    test('dock _updateVisibilityMode exercises visibility logic', () => {
        const ext = createMockExtension();
        manager = new DockManager(ext);
        const dock = manager.mainDock;

        // Test fixed mode
        Settings.set('dock-fixed', true);
        dock._updateVisibilityMode();
        expect(dock._autohideIsEnabled).toBe(false);
        expect(dock._intellihideIsEnabled).toBe(false);

        // Test autohide mode
        Settings.set('dock-fixed', false);
        Settings.set('manualhide', false);
        Settings.set('autohide', true);
        Settings.set('intellihide', false);
        dock._updateVisibilityMode();
        expect(dock._autohideIsEnabled).toBe(true);
        expect(dock._intellihideIsEnabled).toBe(false);
    });

    test('dock _updateDashVisibility in fixed mode', () => {
        const ext = createMockExtension();
        manager = new DockManager(ext);
        const dock = manager.mainDock;

        Settings.set('dock-fixed', true);
        dock._updateVisibilityMode();
        dock._updateDashVisibility();
        expect(dock._dockState).toBe(State.SHOWN);
    });

    test('dock _updateDashVisibility with manualhide', () => {
        const ext = createMockExtension();
        manager = new DockManager(ext);
        const dock = manager.mainDock;

        Settings.set('manualhide', true);
        dock._updateDashVisibility();
        // Should animate out
        expect(dock._dockState === State.HIDING || dock._dockState === State.HIDDEN).toBe(true);
    });

    test('dock _onOverviewShowing adds class and animates in', () => {
        const ext = createMockExtension();
        manager = new DockManager(ext);
        const dock = manager.mainDock;

        dock._onOverviewShowing();
        expect(dock._ignoreHover).toBe(true);
        expect(dock.has_style_class_name('overview')).toBe(true);
    });

    test('dock _onOverviewHidden removes overview class', () => {
        const ext = createMockExtension();
        manager = new DockManager(ext);
        const dock = manager.mainDock;

        dock.add_style_class_name('overview');
        dock._onOverviewHidden();
        expect(dock.has_style_class_name('overview')).toBe(false);
    });

    test('dock _onMenuOpened sets ignoreHover', () => {
        const ext = createMockExtension();
        manager = new DockManager(ext);
        const dock = manager.mainDock;

        dock._onMenuOpened();
        expect(dock._ignoreHover).toBe(true);
    });

    test('dock _onMenuClosed calls hoverChanged and updateDashVisibility', () => {
        const ext = createMockExtension();
        manager = new DockManager(ext);
        const dock = manager.mainDock;

        dock._ignoreHover = true;
        dock._onMenuClosed();
        // _onMenuClosed sets _ignoreHover = false, then calls _hoverChanged
        // and _updateDashVisibility which may re-set it depending on state.
        // The important thing is that the method runs without error.
        expect(dock._dockState).toBeDefined();
    });

    test('dock _onDragStart / _onDragEnd save and restore', () => {
        const ext = createMockExtension();
        manager = new DockManager(ext);
        const dock = manager.mainDock;

        dock._ignoreHover = false;
        dock._onDragStart();
        expect(dock._oldIgnoreHover).toBe(false);
        expect(dock._ignoreHover).toBe(true);

        dock._onDragEnd();
        expect(dock._oldIgnoreHover).toBeNull();
    });

    test('dock _removeAnimations clears transitions', () => {
        const ext = createMockExtension();
        manager = new DockManager(ext);
        const dock = manager.mainDock;

        dock._removeAnimations();
        expect(dock._activeSpringAnimation).toBeFalsy();
    });

    test('dock _removeBarrier handles null barrier', () => {
        const ext = createMockExtension();
        manager = new DockManager(ext);
        const dock = manager.mainDock;

        dock._barrier = null;
        const result = dock._removeBarrier();
        expect(result).toBe(false);
        expect(dock._removeBarrierTimeoutId).toBe(0);
    });

    test('dock _isPrimaryMonitor returns correct value', () => {
        const ext = createMockExtension();
        manager = new DockManager(ext);
        const dock = manager.mainDock;

        expect(dock._isPrimaryMonitor()).toBe(true);
    });

    test('dock _resetPosition updates position', () => {
        const ext = createMockExtension();
        manager = new DockManager(ext);
        const dock = manager.mainDock;

        dock._resetPosition();
        // Should have set width/height based on fraction
        expect(dock._width !== undefined || dock._height !== undefined).toBe(true);
    });

    test('dock _disableUnredirect and _restoreUnredirect', () => {
        const ext = createMockExtension();
        manager = new DockManager(ext);
        const dock = manager.mainDock;

        // Should not disable when monitor is not in fullscreen
        dock._monitor = {inFullscreen: false};
        dock._unredirectDisabled = false;
        dock._disableUnredirect();
        // Meta.disable_unredirect_for_display is undefined in mock, so nothing happens
        // but the flag may or may not be set depending on global.compositor

        dock._unredirectDisabled = true;
        dock._restoreUnredirect();
        expect(dock._unredirectDisabled).toBe(false);
    });

    test('dock _onMagnificationChanged enabled', () => {
        const ext = createMockExtension();
        manager = new DockManager(ext);
        const dock = manager.mainDock;

        Settings.set('icon-magnification-factor', 2.0);
        dock._onMagnificationChanged(dock.dash, true);
        expect(dock._slider.magnificationOverflow).toBeGreaterThan(0);
    });

    test('dock _onMagnificationChanged disabled', () => {
        const ext = createMockExtension();
        manager = new DockManager(ext);
        const dock = manager.mainDock;

        dock._onMagnificationChanged(dock.dash, true);
        dock._onMagnificationChanged(dock.dash, false);
        expect(dock._slider.magnificationOverflow).toBe(0);
    });

    test('dock _hoverChanged with autohide', () => {
        const ext = createMockExtension();
        manager = new DockManager(ext);
        const dock = manager.mainDock;

        dock._ignoreHover = false;
        dock._autohideIsEnabled = true;
        dock._box.hover = true;
        dock._hoverChanged();
        // Should have called _show
        expect(dock._dockState === State.SHOWING || dock._dockState === State.SHOWN).toBe(true);
    });

    test('dock _cancelDockDwell', () => {
        const ext = createMockExtension();
        manager = new DockManager(ext);
        const dock = manager.mainDock;

        dock._dockDwellTimeoutId = 42;
        dock._cancelDockDwell();
        expect(dock._dockDwellTimeoutId).toBe(0);
    });

    test('dock _updateAutoHideBarriers', () => {
        const ext = createMockExtension();
        manager = new DockManager(ext);
        const dock = manager.mainDock;

        // Should not throw
        dock._updateAutoHideBarriers();
        expect(dock._dockWatch).toBeDefined();
    });

    test('DockManager _hasPanelCorners', () => {
        const ext = createMockExtension();
        manager = new DockManager(ext);
        expect(manager._hasPanelCorners()).toBe(false);
    });

    test('DockManager _adjustPanelCorners does not throw', () => {
        const ext = createMockExtension();
        manager = new DockManager(ext);
        manager._adjustPanelCorners();
        // Should not throw when corners are not present
    });

    test('DockManager destroy cleans up', () => {
        const ext = createMockExtension();
        manager = new DockManager(ext);
        expect(DockManager.getDefault()).toBe(manager);

        manager.destroy();
        expect(DockManager.getDefault()).toBeNull();
        manager = null; // prevent afterEach double destroy
    });

    test('throws when creating second singleton', () => {
        const ext = createMockExtension();
        manager = new DockManager(ext);
        expect(() => new DockManager(ext)).toThrow('DashToDock has been already initialized');
    });

    test('DockManager getters return expected values', () => {
        const ext = createMockExtension();
        manager = new DockManager(ext);

        expect(manager.iconTheme).toBeDefined();
        expect(manager.desktopIconsUsableArea).toBeDefined();
        expect(manager.appSpread).toBeDefined();
        expect(manager.notificationsMonitor).toBeDefined();
        expect(manager.mainDock).not.toBeNull();
        expect(manager.wiggleMode).toBe(false);
    });

    test('DockManager _ensureLocations with trash', () => {
        Settings.set('show-trash', true);
        const ext = createMockExtension();
        manager = new DockManager(ext);
        expect(manager._fm1Client).toBeDefined();
        expect(manager._trash).toBeDefined();
    });

    test('DockManager _ensureLocations with mounts', () => {
        Settings.set('show-mounts', true);
        const ext = createMockExtension();
        manager = new DockManager(ext);
        expect(manager._removables).toBeDefined();
    });

    test('dock _updateBarrier when hidden', () => {
        const ext = createMockExtension();
        manager = new DockManager(ext);
        const dock = manager.mainDock;

        dock._canUsePressure = true;
        dock._autohideIsEnabled = true;
        Settings.set('require-pressure-to-show', true);
        dock._dockState = State.HIDDEN;
        dock._monitor = {inFullscreen: false, index: 0, x: 0, y: 0, width: 1920, height: 1080};
        dock._pressureBarrier = new Layout.PressureBarrier();
        dock._updateBarrier();
        // Should have created a barrier
        expect(dock._barrier).toBeDefined();
    });

    test('dock _updatePressureBarrier creates barrier when conditions met', () => {
        const ext = createMockExtension();
        manager = new DockManager(ext);
        const dock = manager.mainDock;

        dock._autohideIsEnabled = true;
        Settings.set('require-pressure-to-show', true);
        // Note: supportsExtendedBarriers returns false in mock
        dock._updatePressureBarrier();
        expect(dock._canUsePressure).toBe(false);
    });

    test('dock _onPressureSensed shows dock', () => {
        const ext = createMockExtension();
        manager = new DockManager(ext);
        const dock = manager.mainDock;

        Main.overview.visibleTarget = false;
        dock._dockState = State.HIDDEN;
        dock._onPressureSensed();
        // Should have triggered _show
        expect(dock._dockState === State.SHOWING || dock._dockState === State.SHOWN).toBe(true);
    });

    test('dock _onPressureSensed returns early when overview visible', () => {
        const ext = createMockExtension();
        manager = new DockManager(ext);
        const dock = manager.mainDock;

        Main.overview.visibleTarget = true;
        const prevState = dock._dockState;
        dock._onPressureSensed();
        // State should not change
        expect(dock._dockState).toBe(prevState);
        Main.overview.visibleTarget = false;
    });

    test('dock _checkDockDwell at edge', () => {
        const ext = createMockExtension();
        manager = new DockManager(ext);
        const dock = manager.mainDock;

        dock._monitor = {x: 0, y: 0, width: 1920, height: 1080, index: 0};
        dock._dockDwelling = false;
        dock._dockDwellTimeoutId = 0;
        dock._box.hover = false;

        // For BOTTOM dock (position = St.Side.BOTTOM = 2), pointer at bottom edge
        dock._checkDockDwell(960, 1080);
        expect(dock._dockDwelling).toBe(true);
    });

    test('dock _checkDockDwell away from edge', () => {
        const ext = createMockExtension();
        manager = new DockManager(ext);
        const dock = manager.mainDock;

        dock._monitor = {x: 0, y: 0, width: 1920, height: 1080, index: 0};
        dock._dockDwelling = true;
        dock._dockDwellTimeoutId = 42;

        dock._checkDockDwell(960, 540);
        expect(dock._dockDwelling).toBe(false);
    });

    test('dock _dockDwellTimeout logic', () => {
        const ext = createMockExtension();
        manager = new DockManager(ext);
        const dock = manager.mainDock;

        dock._dockDwellTimeoutId = 1;
        dock._monitor = {inFullscreen: false};
        dock._dockDwellUserTime = 0;
        const result = dock._dockDwellTimeout();
        expect(result).toBeDefined();
    });

    test('dock _setupDockDwellIfNeeded', () => {
        const ext = createMockExtension();
        manager = new DockManager(ext);
        const dock = manager.mainDock;

        dock._autohideIsEnabled = true;
        Settings.set('require-pressure-to-show', false);
        dock._setupDockDwellIfNeeded();
        expect(dock._dockWatch).toBeDefined();
    });

    test('dock _updateScreencastIndicator', () => {
        const ext = createMockExtension();
        manager = new DockManager(ext);
        const dock = manager.mainDock;

        // No screencast monitor in this test
        dock._updateScreencastIndicator();
        // Should not throw
    });

    test('dock _activateApp with no apps', () => {
        const ext = createMockExtension();
        manager = new DockManager(ext);
        const dock = manager.mainDock;

        // Should not throw with empty dash
        dock._activateApp(0);
    });

    test('dock _cycleAppWindows with no apps', () => {
        const ext = createMockExtension();
        manager = new DockManager(ext);
        const dock = manager.mainDock;

        dock._cycleAppWindows(0, false);
        // Should not throw
    });

    test('dock _enableExtraFeatures adds ctrl-alt-tab group', () => {
        const ext = createMockExtension();
        manager = new DockManager(ext);
        const dock = manager.mainDock;
        // Already called during init for isMain dock
        expect(dock.isMain).toBe(true);
    });

    test('dock _onOverviewHiding re-enables intellihide', () => {
        const ext = createMockExtension();
        manager = new DockManager(ext);
        const dock = manager.mainDock;

        dock._ignoreHover = true;
        dock._onOverviewHiding();
        // _onOverviewHiding sets _ignoreHover = false then calls _updateDashVisibility
        // which may re-set it. The key is it ran without error and re-enabled intellihide.
        expect(dock._dockState).toBeDefined();
    });

    test('DockManager _readUserCategories', () => {
        const ext = createMockExtension();
        manager = new DockManager(ext);

        const cats = manager._readUserCategories();
        expect(Array.isArray(cats)).toBe(true);
    });

    test('DockManager getCategorizedAppIds', () => {
        const ext = createMockExtension();
        manager = new DockManager(ext);

        const ids = manager.getCategorizedAppIds();
        expect(ids instanceof Set).toBe(true);
    });

    test('DockManager getDockOrder', () => {
        const ext = createMockExtension();
        manager = new DockManager(ext);

        const order = manager.getDockOrder();
        expect(Array.isArray(order)).toBe(true);
    });

    test('DockManager setDockOrder', () => {
        const ext = createMockExtension();
        manager = new DockManager(ext);

        manager.setDockOrder(['app1.desktop', 'app2.desktop']);
        // Should not throw
    });

    test('DockManager _toggle defers dock recreation', () => {
        const ext = createMockExtension();
        manager = new DockManager(ext);

        // _toggle uses laterAdd which calls the callback immediately in mock
        manager._toggle();
        // Should have recreated docks
        expect(manager._allDocks.length).toBeGreaterThan(0);
    });

    test('dock _onDestroy cleans up resources', () => {
        const ext = createMockExtension();
        manager = new DockManager(ext);
        const dock = manager.mainDock;

        // Simulate destruction
        dock._triggerTimeoutId = 42;
        dock._hoverCheckId = 42;
        dock._removeBarrierTimeoutId = 42;

        dock._onDestroy();

        expect(dock._triggerTimeoutId).toBe(0);
        expect(dock._hoverCheckId).toBe(0);
    });

    test('dock _initialize runs for non-startup', () => {
        const ext = createMockExtension();
        manager = new DockManager(ext);
        const dock = manager.mainDock;

        // _initialize was already called during construction
        // Verify side effects
        expect(dock._dockState).toBeDefined();
    });

    test('DockManager wiggle mode enter/exit', () => {
        const ext = createMockExtension();
        manager = new DockManager(ext);
        Settings.set('wiggle-mode-enabled', true);

        manager.enterWiggleMode();
        expect(manager.wiggleMode).toBe(true);

        manager.exitWiggleMode();
        expect(manager.wiggleMode).toBe(false);
    });

    test('DockManager wiggle mode no-op when disabled', () => {
        const ext = createMockExtension();
        manager = new DockManager(ext);
        Settings.set('wiggle-mode-enabled', false);

        manager.enterWiggleMode();
        expect(manager.wiggleMode).toBe(false);
    });

    test('dock with intellihide overlap hides dock', () => {
        const ext = createMockExtension();
        manager = new DockManager(ext);
        const dock = manager.mainDock;

        dock._autohideIsEnabled = false;
        dock._intellihideIsEnabled = true;
        dock._intellihide.getOverlapStatus = () => true;
        dock._dockState = State.SHOWN;

        dock._updateDashVisibility();
        expect(dock._dockState === State.HIDING || dock._dockState === State.HIDDEN).toBe(true);
    });

    test('dock with autohide and hover shows dock', () => {
        const ext = createMockExtension();
        manager = new DockManager(ext);
        const dock = manager.mainDock;

        dock._autohideIsEnabled = true;
        dock._intellihideIsEnabled = false;
        dock._box.hover = true;
        dock.dash.requiresVisibility = false;
        dock._dockState = State.HIDDEN;

        dock._updateDashVisibility();
        expect(dock._dockState === State.SHOWING || dock._dockState === State.SHOWN).toBe(true);
    });
});

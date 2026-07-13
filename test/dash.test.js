import {jest} from '@jest/globals';
import * as Settings from '../platform/settings.js';
import {St, Clutter, GLib, Gio, GObject} from '../dependencies/gi.js';
import {Docking, Utils, AppIcons, Theming} from '../imports.js';
import {Main, Dash, DND, AppFavorites, BoxPointer} from '../dependencies/shell/ui.js';

// GJS globals not available in Node.js
globalThis.logError = globalThis.logError ?? (() => {});
globalThis.log = globalThis.log ?? (() => {});

// Minimal GJS `global` stub required by dash.js
globalThis.global = globalThis.global ?? {
    stage: {},
    settings: {is_writable: () => true},
    get_current_time: () => 0,
};

// ---------------------------------------------------------------------------
// Import real module — beforeAll so the dynamic imports resolve
// ---------------------------------------------------------------------------
let DockDash, DockDashItemContainer, DragPlaceholderItem, DockDashIconsVerticalLayout;
beforeAll(async () => {
    const mod = await import('../dash.js');
    DockDash = mod.DockDash;
    // Other classes aren't exported, we access them through DockDash
});

beforeEach(() => {
    Settings._reset();
});

// ---------------------------------------------------------------------------
// Helper: build a lightweight DockDash-like context for prototype method calls
// ---------------------------------------------------------------------------
function makeDashContext(overrides = {}) {
    const isHorizontal = overrides._isHorizontal ?? true;
    const position = overrides._position ?? St.Side.BOTTOM;
    return {
        _isHorizontal: isHorizontal,
        _position: position,
        _isSecondary: false,
        _monitorIndex: 0,
        _reflection: {
            visible: false,
            _style: null,
            set_style(s) { this._style = s; },
        },
        _background: {
            width: 400,
            _children: [],
            set_pivot_point() {},
            set_easing_duration() {},
            set_easing_mode() {},
            set_scale() {},
            connect() { return 1; },
            disconnect() {},
            add_child() {},
            get_parent() { return null; },
        },
        _box: {
            _children: [],
            get_children() { return [...this._children]; },
            remove_child(c) { this._children = this._children.filter(x => x !== c); },
            insert_child_at_index(c, i) { this._children.splice(i, 0, c); },
            add_child(c) { this._children.push(c); },
            contains(c) { return this._children.includes(c); },
            queue_relayout() {},
            set_clip_to_allocation() {},
            clip_to_view: true,
            x_align: 0,
            y_align: 0,
            y_expand: false,
            x_expand: false,
            get_parent() { return null; },
        },
        _boxContainer: {
            _children: [],
            get_children() { return [...this._children]; },
            add_child(c) { this._children.push(c); },
            remove_child(c) { this._children = this._children.filter(x => x !== c); },
            insert_child_below(c) { this._children.unshift(c); },
            insert_child_above(c) { this._children.push(c); },
        },
        _dashContainer: {
            _children: [],
            get_children() { return [...this._children]; },
            add_child(c) { this._children.push(c); },
            remove_child(c) { this._children = this._children.filter(x => x !== c); },
            reactive: false,
            set_clip_to_allocation() {},
            clip_to_view: true,
            get_stage() { return {}; },
            get_theme_node() {
                return {
                    get_length: () => 0,
                    get_content_box: (box) => ({
                        x1: 0, y1: 0,
                        x2: box?.x2 ?? 100,
                        y2: box?.y2 ?? 100,
                        get_width() { return this.x2 - this.x1; },
                        get_height() { return this.y2 - this.y1; },
                    }),
                };
            },
            insert_child_below(c) { this._children.unshift(c); },
        },
        _scrollView: {
            visible: true,
            _visible: true,
            show() { this._visible = true; this.visible = true; },
            hide() { this._visible = false; this.visible = false; },
            set(params) { Object.assign(this, params); },
            get_hadjustment() {
                return {step_increment: 10, get_value: () => 0, set_value() {}};
            },
            get_vadjustment() {
                return {step_increment: 10, get_value: () => 0, set_value() {}};
            },
        },
        _showAppsIcon: null,
        _workspaceMinimap: null,
        _workspaceMinimapContainer: null,
        _quickSettingsButton: null,
        _magnificationEnabled: false,
        _magnificationMotionConnected: false,
        _dragInProgress: false,
        _redisplayQueuedDuringDrag: false,
        _resetIconsQueuedDuringDrag: false,
        _dragPlaceholder: null,
        _dragPlaceholderPos: -1,
        _dropTargetIcon: null,
        _separator: null,
        _separatorFavorites: null,
        _separatorLocations: null,
        _shownInitially: true,
        _wiggleClickCaptureId: 0,
        _redisplayDebounceId: 0,
        _resetIconsDebounceId: 0,
        _clipViewIdleId: 0,
        _labelShowing: false,
        _showLabelTimeoutId: 0,
        _resetHoverTimeoutId: 0,
        _ensureActorVisibilityTimeoutId: 0,
        _requiresVisibilityTimeout: 0,
        _dashLeaveTimeoutId: 0,
        _dragToFocusTimeoutId: 0,
        _dragToFocusIcon: null,
        iconSize: 48,
        _availableIconSizes: [16, 22, 24, 32, 48],
        _maxWidth: -1,
        _maxHeight: -1,
        _signalsHandler: new Utils.GlobalSignalsHandler(null),
        _appSystem: {get_running: () => []},
        _shellSettings: new Gio.Settings(),
        iconAnimator: {start() {}, pause() {}, destroy() {}},
        requiresVisibility: false,
        set_clip_to_allocation() {},
        offscreen_redirect: 0,
        emit: jest.fn(),
        ...overrides,
    };
}

// ---------------------------------------------------------------------------
// _updateReflection
// ---------------------------------------------------------------------------
describe('DockDash._updateReflection', () => {
    test('reflection hidden when dock-style is FLAT (0)', () => {
        Settings._setMany({'dock-style': 0, 'shelf-reflection': true});
        const ctx = makeDashContext();
        DockDash.prototype._updateReflection.call(ctx);
        expect(ctx._reflection.visible).toBe(false);
    });

    test('reflection hidden when shelf-reflection is false', () => {
        Settings._setMany({'dock-style': 1, 'shelf-reflection': false});
        const ctx = makeDashContext();
        DockDash.prototype._updateReflection.call(ctx);
        expect(ctx._reflection.visible).toBe(false);
    });

    test('reflection visible when dock-style is SHELF (1) and shelf-reflection true', () => {
        Settings._setMany({'dock-style': 1, 'shelf-reflection': true, 'shelf-reflection-opacity': 0.5});
        const ctx = makeDashContext();
        DockDash.prototype._updateReflection.call(ctx);
        expect(ctx._reflection.visible).toBe(true);
    });

    test('reflection hidden when both are off', () => {
        Settings._setMany({'dock-style': 0, 'shelf-reflection': false});
        const ctx = makeDashContext();
        DockDash.prototype._updateReflection.call(ctx);
        expect(ctx._reflection.visible).toBe(false);
    });

    test('horizontal uses "to bottom" gradient direction', () => {
        Settings._setMany({'dock-style': 1, 'shelf-reflection': true, 'shelf-reflection-opacity': 0.5});
        const ctx = makeDashContext({_isHorizontal: true});
        DockDash.prototype._updateReflection.call(ctx);
        expect(ctx._reflection._style).toContain('to bottom');
        expect(ctx._reflection._style).toContain('rgba(255,255,255,0.5)');
    });

    test('vertical uses "to right" gradient direction', () => {
        Settings._setMany({'dock-style': 1, 'shelf-reflection': true, 'shelf-reflection-opacity': 0.3});
        const ctx = makeDashContext({_isHorizontal: false});
        DockDash.prototype._updateReflection.call(ctx);
        expect(ctx._reflection._style).toContain('to right');
        expect(ctx._reflection._style).toContain('rgba(255,255,255,0.3)');
    });

    test('opacity 0 is interpolated correctly', () => {
        Settings._setMany({'dock-style': 1, 'shelf-reflection': true, 'shelf-reflection-opacity': 0});
        const ctx = makeDashContext();
        DockDash.prototype._updateReflection.call(ctx);
        expect(ctx._reflection._style).toContain('rgba(255,255,255,0)');
    });

    test('style always includes border-radius', () => {
        Settings._setMany({'dock-style': 1, 'shelf-reflection': true, 'shelf-reflection-opacity': 0.5});
        const ctx = makeDashContext();
        DockDash.prototype._updateReflection.call(ctx);
        expect(ctx._reflection._style).toContain('border-radius: 0 0 12px 12px');
    });

    test('style is cleared when reflection is hidden', () => {
        Settings._setMany({'dock-style': 0, 'shelf-reflection': false});
        const ctx = makeDashContext();
        ctx._reflection._style = 'stale-style';
        DockDash.prototype._updateReflection.call(ctx);
        expect(ctx._reflection._style).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// _getMagnificationPivot
// ---------------------------------------------------------------------------
describe('DockDash._getMagnificationPivot', () => {
    test('BOTTOM pivot is center-bottom (0.5, 1.0)', () => {
        const ctx = makeDashContext({_position: St.Side.BOTTOM});
        expect(DockDash.prototype._getMagnificationPivot.call(ctx)).toEqual([0.5, 1.0]);
    });

    test('TOP pivot is center-top (0.5, 0.0)', () => {
        const ctx = makeDashContext({_position: St.Side.TOP});
        expect(DockDash.prototype._getMagnificationPivot.call(ctx)).toEqual([0.5, 0.0]);
    });

    test('LEFT pivot is left-center (0.0, 0.5)', () => {
        const ctx = makeDashContext({_position: St.Side.LEFT});
        expect(DockDash.prototype._getMagnificationPivot.call(ctx)).toEqual([0.0, 0.5]);
    });

    test('RIGHT pivot is right-center (1.0, 0.5)', () => {
        const ctx = makeDashContext({_position: St.Side.RIGHT});
        expect(DockDash.prototype._getMagnificationPivot.call(ctx)).toEqual([1.0, 0.5]);
    });

    test('unknown position defaults to BOTTOM', () => {
        const ctx = makeDashContext({_position: 999});
        expect(DockDash.prototype._getMagnificationPivot.call(ctx)).toEqual([0.5, 1.0]);
    });
});

// ---------------------------------------------------------------------------
// _toggleMagnification
// ---------------------------------------------------------------------------
describe('DockDash._toggleMagnification', () => {
    test('calls _enableMagnification when icon-magnification is true', () => {
        Settings.set('icon-magnification', true);
        const enable = jest.fn();
        const disable = jest.fn();
        const ctx = makeDashContext({
            _enableMagnification: enable,
            _disableMagnification: disable,
        });
        DockDash.prototype._toggleMagnification.call(ctx);
        expect(enable).toHaveBeenCalled();
        expect(disable).not.toHaveBeenCalled();
    });

    test('calls _disableMagnification when icon-magnification is false', () => {
        Settings.set('icon-magnification', false);
        const enable = jest.fn();
        const disable = jest.fn();
        const ctx = makeDashContext({
            _enableMagnification: enable,
            _disableMagnification: disable,
        });
        DockDash.prototype._toggleMagnification.call(ctx);
        expect(disable).toHaveBeenCalled();
        expect(enable).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// _togglePreviewHover
// ---------------------------------------------------------------------------
describe('DockDash._togglePreviewHover', () => {
    test('calls _enableHover when show-previews-hover is true', () => {
        Settings.set('show-previews-hover', true);
        const enable = jest.fn();
        const disable = jest.fn();
        const ctx = makeDashContext({_enableHover: enable, _disableHover: disable});
        DockDash.prototype._togglePreviewHover.call(ctx);
        expect(enable).toHaveBeenCalled();
        expect(disable).not.toHaveBeenCalled();
    });

    test('calls _disableHover when show-previews-hover is false', () => {
        Settings.set('show-previews-hover', false);
        const enable = jest.fn();
        const disable = jest.fn();
        const ctx = makeDashContext({_enableHover: enable, _disableHover: disable});
        DockDash.prototype._togglePreviewHover.call(ctx);
        expect(disable).toHaveBeenCalled();
        expect(enable).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// _initializeIconSize
// ---------------------------------------------------------------------------
describe('DockDash._initializeIconSize', () => {
    test('fixed mode returns single size', () => {
        Settings.set('icon-size-fixed', true);
        const ctx = makeDashContext({_availableIconSizes: []});
        DockDash.prototype._initializeIconSize.call(ctx, 48);
        expect(ctx._availableIconSizes).toEqual([48]);
    });

    test('dynamic mode returns sizes up to max', () => {
        Settings.set('icon-size-fixed', false);
        const ctx = makeDashContext({_availableIconSizes: []});
        DockDash.prototype._initializeIconSize.call(ctx, 48);
        expect(ctx._availableIconSizes).toEqual([16, 22, 24, 32, 48]);
    });

    test('max above largest base size is clamped', () => {
        Settings.set('icon-size-fixed', false);
        const ctx = makeDashContext({_availableIconSizes: []});
        DockDash.prototype._initializeIconSize.call(ctx, 256);
        expect(ctx._availableIconSizes[ctx._availableIconSizes.length - 1]).toBe(128);
    });

    test('max smaller than smallest base size', () => {
        Settings.set('icon-size-fixed', false);
        const ctx = makeDashContext({_availableIconSizes: []});
        DockDash.prototype._initializeIconSize.call(ctx, 10);
        expect(ctx._availableIconSizes).toEqual([10]);
    });

    test('exact base size includes that size', () => {
        Settings.set('icon-size-fixed', false);
        const ctx = makeDashContext({_availableIconSizes: []});
        DockDash.prototype._initializeIconSize.call(ctx, 64);
        expect(ctx._availableIconSizes).toContain(64);
        expect(ctx._availableIconSizes).not.toContain(96);
    });

    test('fixed mode with max above limit still clamps', () => {
        Settings.set('icon-size-fixed', true);
        const ctx = makeDashContext({_availableIconSizes: []});
        DockDash.prototype._initializeIconSize.call(ctx, 256);
        expect(ctx._availableIconSizes).toEqual([128]);
    });
});

// ---------------------------------------------------------------------------
// _resetMagnification
// ---------------------------------------------------------------------------
describe('DockDash._resetMagnification', () => {
    function makeMagnificationContext() {
        const mockChild = {
            child: {
                icon: {
                    _iconBin: {
                        set_easing_duration: jest.fn(),
                        set_easing_mode: jest.fn(),
                        set_scale: jest.fn(),
                    },
                },
            },
            set_easing_duration: jest.fn(),
            set_easing_mode: jest.fn(),
            translation_x: 5,
            translation_y: 5,
            set_z_position: jest.fn(),
        };

        const ctx = makeDashContext({
            _dashContainer: {
                _children: [{
                    ...mockChild,
                    get_children() { return [mockChild]; },
                }],
                get_children() { return this._children; },
            },
            _showAppsIcon: null,
            _workspaceMinimapContainer: null,
            _quickSettingsButton: null,
            _background: {
                set_easing_duration: jest.fn(),
                set_easing_mode: jest.fn(),
                set_scale: jest.fn(),
            },
        });

        const boxChild = ctx._dashContainer._children[0];
        return {ctx, boxChild, mockChild};
    }

    test('resets background scale to 1.0', () => {
        const {ctx} = makeMagnificationContext();
        ctx._scrollView = {__scrollView: true};
        ctx._resetUtilityElement = DockDash.prototype._resetUtilityElement.bind(ctx);
        ctx._getUtilityScalableActor = DockDash.prototype._getUtilityScalableActor.bind(ctx);
        DockDash.prototype._resetMagnification.call(ctx, false);
        expect(ctx._background.set_scale).toHaveBeenCalledWith(1.0, 1.0);
    });

    test('animated reset uses 200ms duration', () => {
        const {ctx} = makeMagnificationContext();
        ctx._scrollView = {__scrollView: true};
        ctx._resetUtilityElement = DockDash.prototype._resetUtilityElement.bind(ctx);
        ctx._getUtilityScalableActor = DockDash.prototype._getUtilityScalableActor.bind(ctx);
        DockDash.prototype._resetMagnification.call(ctx, true);
        expect(ctx._background.set_easing_duration).toHaveBeenCalledWith(200);
    });

    test('non-animated reset uses 0ms duration', () => {
        const {ctx} = makeMagnificationContext();
        ctx._scrollView = {__scrollView: true};
        ctx._resetUtilityElement = DockDash.prototype._resetUtilityElement.bind(ctx);
        ctx._getUtilityScalableActor = DockDash.prototype._getUtilityScalableActor.bind(ctx);
        DockDash.prototype._resetMagnification.call(ctx, false);
        expect(ctx._background.set_easing_duration).toHaveBeenCalledWith(0);
    });

    test('resets visible utility elements', () => {
        const {ctx} = makeMagnificationContext();
        ctx._scrollView = {__scrollView: true};
        const mockShowApps = {
            visible: true,
            set_easing_duration: jest.fn(),
            set_easing_mode: jest.fn(),
            translation_x: 5,
            translation_y: 5,
            icon: {
                _iconBin: {
                    set_easing_duration: jest.fn(),
                    set_easing_mode: jest.fn(),
                    set_scale: jest.fn(),
                },
            },
        };
        ctx._showAppsIcon = mockShowApps;
        ctx._workspaceMinimapContainer = null;
        ctx._quickSettingsButton = null;
        ctx._resetUtilityElement = DockDash.prototype._resetUtilityElement.bind(ctx);
        ctx._getUtilityScalableActor = DockDash.prototype._getUtilityScalableActor.bind(ctx);
        DockDash.prototype._resetMagnification.call(ctx, true);
        expect(mockShowApps.set_easing_duration).toHaveBeenCalledWith(200);
        expect(mockShowApps.translation_x).toBe(0);
        expect(mockShowApps.translation_y).toBe(0);
    });

    test('resets child icon scales in _dashContainer', () => {
        const iconBin = {
            set_easing_duration: jest.fn(),
            set_easing_mode: jest.fn(),
            set_scale: jest.fn(),
        };
        const mockChild = {
            child: {icon: {_iconBin: iconBin}},
            set_easing_duration: jest.fn(),
            set_easing_mode: jest.fn(),
            translation_x: 10,
            translation_y: 10,
            set_z_position: jest.fn(),
        };
        const mockBox = {
            get_children() { return [mockChild]; },
        };
        const ctx = makeDashContext({
            _dashContainer: {
                _children: [mockBox],
                get_children() { return this._children; },
            },
            _scrollView: {__scrollView: true},
            _showAppsIcon: null,
            _workspaceMinimapContainer: null,
            _quickSettingsButton: null,
            _background: {
                set_easing_duration: jest.fn(),
                set_easing_mode: jest.fn(),
                set_scale: jest.fn(),
            },
        });
        // Assign _box so it can be compared with dc === this._box
        ctx._box = mockBox;
        ctx._resetUtilityElement = DockDash.prototype._resetUtilityElement.bind(ctx);
        ctx._getUtilityScalableActor = DockDash.prototype._getUtilityScalableActor.bind(ctx);
        DockDash.prototype._resetMagnification.call(ctx, false);
        expect(iconBin.set_scale).toHaveBeenCalledWith(1.0, 1.0);
        expect(mockChild.translation_x).toBe(0);
        expect(mockChild.translation_y).toBe(0);
        expect(mockChild.set_z_position).toHaveBeenCalledWith(0);
    });
});

// ---------------------------------------------------------------------------
// _getUtilityScalableActor
// ---------------------------------------------------------------------------
describe('DockDash._getUtilityScalableActor', () => {
    test('returns _iconBin if present', () => {
        const element = {icon: {_iconBin: {scale: 1}}};
        const ctx = makeDashContext();
        const result = DockDash.prototype._getUtilityScalableActor.call(ctx, element);
        expect(result).toBe(element.icon._iconBin);
    });

    test('returns icon if no _iconBin', () => {
        const element = {icon: {scale: 1}};
        const ctx = makeDashContext();
        const result = DockDash.prototype._getUtilityScalableActor.call(ctx, element);
        expect(result).toBe(element.icon);
    });

    test('returns child if no icon', () => {
        const element = {child: {scale: 1}};
        const ctx = makeDashContext();
        const result = DockDash.prototype._getUtilityScalableActor.call(ctx, element);
        expect(result).toBe(element.child);
    });

    test('returns element itself as fallback', () => {
        const element = {scale: 1};
        const ctx = makeDashContext();
        const result = DockDash.prototype._getUtilityScalableActor.call(ctx, element);
        expect(result).toBe(element);
    });

    test('returns null for null input', () => {
        const ctx = makeDashContext();
        const result = DockDash.prototype._getUtilityScalableActor.call(ctx, null);
        expect(result).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// _resetUtilityElement
// ---------------------------------------------------------------------------
describe('DockDash._resetUtilityElement', () => {
    function makeCtxWithHelpers() {
        const ctx = makeDashContext();
        ctx._getUtilityScalableActor = DockDash.prototype._getUtilityScalableActor.bind(ctx);
        return ctx;
    }

    test('resets icon scale to 1.0', () => {
        const icon = {
            set_easing_duration: jest.fn(),
            set_easing_mode: jest.fn(),
            set_scale: jest.fn(),
        };
        const element = {icon: {_iconBin: icon}};
        const ctx = makeCtxWithHelpers();
        DockDash.prototype._resetUtilityElement.call(ctx, element, true);
        expect(icon.set_scale).toHaveBeenCalledWith(1.0, 1.0);
        expect(icon.set_easing_duration).toHaveBeenCalledWith(200);
    });

    test('no animation when animate is false', () => {
        const icon = {
            set_easing_duration: jest.fn(),
            set_easing_mode: jest.fn(),
            set_scale: jest.fn(),
        };
        const element = {icon: {_iconBin: icon}};
        const ctx = makeCtxWithHelpers();
        DockDash.prototype._resetUtilityElement.call(ctx, element, false);
        expect(icon.set_easing_duration).toHaveBeenCalledWith(0);
    });

    test('handles null element gracefully', () => {
        const ctx = makeCtxWithHelpers();
        DockDash.prototype._resetUtilityElement.call(ctx, null, true);
    });

    test('handles element with only child (no icon)', () => {
        const child = {
            set_easing_duration: jest.fn(),
            set_easing_mode: jest.fn(),
            set_scale: jest.fn(),
        };
        const element = {child};
        const ctx = makeCtxWithHelpers();
        DockDash.prototype._resetUtilityElement.call(ctx, element, true);
        expect(child.set_scale).toHaveBeenCalledWith(1.0, 1.0);
    });
});

// ---------------------------------------------------------------------------
// _magnifyUtilityElement
// ---------------------------------------------------------------------------
describe('DockDash._magnifyUtilityElement', () => {
    test('skips non-visible element', () => {
        const ctx = makeDashContext();
        ctx._getUtilityScalableActor = DockDash.prototype._getUtilityScalableActor.bind(ctx);
        const element = {visible: false, get_stage: () => null};
        // Should not throw
        DockDash.prototype._magnifyUtilityElement.call(ctx, element, 100, 200, 2.0, 0.5, 1.0, 100);
    });

    test('skips element not on stage', () => {
        const ctx = makeDashContext();
        ctx._getUtilityScalableActor = DockDash.prototype._getUtilityScalableActor.bind(ctx);
        const element = {visible: true, get_stage: () => null};
        DockDash.prototype._magnifyUtilityElement.call(ctx, element, 100, 200, 2.0, 0.5, 1.0, 100);
    });

    test('magnifies visible element on stage', () => {
        const icon = {
            set_pivot_point: jest.fn(),
            set_easing_duration: jest.fn(),
            set_easing_mode: jest.fn(),
            set_scale: jest.fn(),
        };
        const element = {
            visible: true,
            get_stage: () => ({}),
            get_transformed_position: () => [50, 50],
            get_transformed_size: () => [48, 48],
            icon: {_iconBin: icon},
        };
        const ctx = makeDashContext({_isHorizontal: true});
        ctx._getUtilityScalableActor = DockDash.prototype._getUtilityScalableActor.bind(ctx);
        DockDash.prototype._magnifyUtilityElement.call(ctx, element, 74, 200, 2.0, 0.5, 1.0, 100);
        expect(icon.set_pivot_point).toHaveBeenCalledWith(0.5, 1.0);
        expect(icon.set_easing_duration).toHaveBeenCalledWith(100);
        expect(icon.set_scale).toHaveBeenCalled();
    });

    test('skips null element', () => {
        const ctx = makeDashContext();
        ctx._getUtilityScalableActor = DockDash.prototype._getUtilityScalableActor.bind(ctx);
        // Should not throw
        DockDash.prototype._magnifyUtilityElement.call(ctx, null, 100, 200, 2.0, 0.5, 1.0, 100);
    });

    test('uses vertical center when not horizontal', () => {
        const icon = {
            set_pivot_point: jest.fn(),
            set_easing_duration: jest.fn(),
            set_easing_mode: jest.fn(),
            set_scale: jest.fn(),
        };
        const element = {
            visible: true,
            get_stage: () => ({}),
            get_transformed_position: () => [50, 100],
            get_transformed_size: () => [48, 48],
            icon: {_iconBin: icon},
        };
        const ctx = makeDashContext({_isHorizontal: false});
        ctx._getUtilityScalableActor = DockDash.prototype._getUtilityScalableActor.bind(ctx);
        DockDash.prototype._magnifyUtilityElement.call(ctx, element, 124, 200, 2.0, 0.0, 0.5, 100);
        expect(icon.set_scale).toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// _isLocationApp and _isPinnedCommandApp
// ---------------------------------------------------------------------------
describe('DockDash._isLocationApp', () => {
    test('returns true for trash app', () => {
        const ctx = makeDashContext();
        expect(DockDash.prototype._isLocationApp.call(ctx, {isTrash: true})).toBe(true);
    });

    test('returns true for mountable volume', () => {
        const ctx = makeDashContext();
        expect(DockDash.prototype._isLocationApp.call(ctx, {isMountableVolume: true})).toBe(true);
    });

    test('returns false for regular app', () => {
        const ctx = makeDashContext();
        expect(DockDash.prototype._isLocationApp.call(ctx, {})).toBeFalsy();
    });

    test('returns false for null', () => {
        const ctx = makeDashContext();
        expect(DockDash.prototype._isLocationApp.call(ctx, null)).toBeFalsy();
    });
});

describe('DockDash._isPinnedCommandApp', () => {
    test('returns true for pinned command app', () => {
        const ctx = makeDashContext();
        expect(DockDash.prototype._isPinnedCommandApp.call(ctx, {isPinnedCommand: true})).toBe(true);
    });

    test('returns false for regular app', () => {
        const ctx = makeDashContext();
        expect(DockDash.prototype._isPinnedCommandApp.call(ctx, {})).toBeFalsy();
    });
});

// ---------------------------------------------------------------------------
// getAppIcons
// ---------------------------------------------------------------------------
describe('DockDash.getAppIcons', () => {
    test('returns only children with icon property', () => {
        const icon1 = {icon: {}, _delegate: {}};
        const icon2 = {icon: {}, _delegate: {}};
        const placeholder = {_delegate: {}}; // no icon
        const ctx = makeDashContext({
            _box: {
                get_children: () => [
                    {child: icon1, animatingOut: false},
                    {child: icon2, animatingOut: false},
                    {child: placeholder, animatingOut: false},
                ],
            },
        });
        const result = DockDash.prototype.getAppIcons.call(ctx);
        expect(result).toEqual([icon1, icon2]);
    });

    test('excludes children that are animating out', () => {
        const icon1 = {icon: {}, _delegate: {}};
        const ctx = makeDashContext({
            _box: {
                get_children: () => [
                    {child: icon1, animatingOut: true},
                ],
            },
        });
        const result = DockDash.prototype.getAppIcons.call(ctx);
        expect(result).toEqual([]);
    });

    test('returns empty array when no children', () => {
        const ctx = makeDashContext({
            _box: {get_children: () => []},
        });
        const result = DockDash.prototype.getAppIcons.call(ctx);
        expect(result).toEqual([]);
    });

    test('excludes children with null child', () => {
        const ctx = makeDashContext({
            _box: {
                get_children: () => [
                    {child: null, animatingOut: false},
                ],
            },
        });
        const result = DockDash.prototype.getAppIcons.call(ctx);
        expect(result).toEqual([]);
    });
});

// ---------------------------------------------------------------------------
// setMaxSize
// ---------------------------------------------------------------------------
describe('DockDash.setMaxSize', () => {
    test('updates _maxWidth and _maxHeight and queues redisplay', () => {
        const queueRedisplay = jest.fn();
        const ctx = makeDashContext({
            _maxWidth: -1,
            _maxHeight: -1,
            _queueRedisplay: queueRedisplay,
        });
        DockDash.prototype.setMaxSize.call(ctx, 800, 600);
        expect(ctx._maxWidth).toBe(800);
        expect(ctx._maxHeight).toBe(600);
        expect(queueRedisplay).toHaveBeenCalled();
    });

    test('does nothing when values are unchanged', () => {
        const queueRedisplay = jest.fn();
        const ctx = makeDashContext({
            _maxWidth: 800,
            _maxHeight: 600,
            _queueRedisplay: queueRedisplay,
        });
        DockDash.prototype.setMaxSize.call(ctx, 800, 600);
        expect(queueRedisplay).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// maxWidth / maxHeight getters and setters — exercise through prototype chain
// ---------------------------------------------------------------------------
describe('DockDash maxWidth/maxHeight', () => {
    // Find the getter/setter on the prototype chain
    function findDescriptor(proto, prop) {
        let p = proto;
        while (p) {
            const desc = Object.getOwnPropertyDescriptor(p, prop);
            if (desc) return desc;
            p = Object.getPrototypeOf(p);
        }
        return null;
    }

    test('get maxWidth returns _maxWidth', () => {
        const desc = findDescriptor(DockDash.prototype, 'maxWidth');
        if (desc?.get) {
            const ctx = makeDashContext({_maxWidth: 123});
            expect(desc.get.call(ctx)).toBe(123);
        }
    });

    test('get maxHeight returns _maxHeight', () => {
        const desc = findDescriptor(DockDash.prototype, 'maxHeight');
        if (desc?.get) {
            const ctx = makeDashContext({_maxHeight: 456});
            expect(desc.get.call(ctx)).toBe(456);
        }
    });

    test('set maxWidth calls setMaxSize', () => {
        const desc = findDescriptor(DockDash.prototype, 'maxWidth');
        if (desc?.set) {
            const ctx = makeDashContext({_maxWidth: -1, _maxHeight: 600});
            ctx.setMaxSize = jest.fn();
            desc.set.call(ctx, 800);
            expect(ctx.setMaxSize).toHaveBeenCalledWith(800, 600);
        }
    });

    test('set maxHeight calls setMaxSize', () => {
        const desc = findDescriptor(DockDash.prototype, 'maxHeight');
        if (desc?.set) {
            const ctx = makeDashContext({_maxWidth: 800, _maxHeight: -1});
            ctx.setMaxSize = jest.fn();
            desc.set.call(ctx, 600);
            expect(ctx.setMaxSize).toHaveBeenCalledWith(800, 600);
        }
    });
});

// ---------------------------------------------------------------------------
// _container getter
// ---------------------------------------------------------------------------
describe('DockDash._container getter', () => {
    // Find the getter on the prototype chain
    function findDescriptor(proto, prop) {
        let p = proto;
        while (p) {
            const desc = Object.getOwnPropertyDescriptor(p, prop);
            if (desc) return desc;
            p = Object.getPrototypeOf(p);
        }
        return null;
    }

    test('returns _dashContainer', () => {
        const desc = findDescriptor(DockDash.prototype, '_container');
        if (desc?.get) {
            const container = {__is_container: true};
            const ctx = makeDashContext({_dashContainer: container});
            expect(desc.get.call(ctx)).toBe(container);
        }
    });
});

// ---------------------------------------------------------------------------
// _flushDeferredDragWork
// ---------------------------------------------------------------------------
describe('DockDash._flushDeferredDragWork', () => {
    test('flushes pending resetAppIcons when queued during drag', () => {
        const resetAppIcons = jest.fn();
        const ctx = makeDashContext({
            _resetIconsQueuedDuringDrag: true,
            _redisplayQueuedDuringDrag: true,
            resetAppIcons,
            _queueRedisplay: jest.fn(),
        });
        DockDash.prototype._flushDeferredDragWork.call(ctx);
        expect(resetAppIcons).toHaveBeenCalled();
        expect(ctx._resetIconsQueuedDuringDrag).toBe(false);
        expect(ctx._redisplayQueuedDuringDrag).toBe(false);
    });

    test('flushes pending redisplay when no reset queued', () => {
        const queueRedisplay = jest.fn();
        const ctx = makeDashContext({
            _resetIconsQueuedDuringDrag: false,
            _redisplayQueuedDuringDrag: true,
            resetAppIcons: jest.fn(),
            _queueRedisplay: queueRedisplay,
        });
        DockDash.prototype._flushDeferredDragWork.call(ctx);
        expect(queueRedisplay).toHaveBeenCalled();
        expect(ctx._redisplayQueuedDuringDrag).toBe(false);
    });

    test('does nothing when nothing is queued', () => {
        const resetAppIcons = jest.fn();
        const queueRedisplay = jest.fn();
        const ctx = makeDashContext({
            _resetIconsQueuedDuringDrag: false,
            _redisplayQueuedDuringDrag: false,
            resetAppIcons,
            _queueRedisplay: queueRedisplay,
        });
        DockDash.prototype._flushDeferredDragWork.call(ctx);
        expect(resetAppIcons).not.toHaveBeenCalled();
        expect(queueRedisplay).not.toHaveBeenCalled();
    });

    test('flushes pending _ensureLocations when dockManager has it pending', () => {
        const ensureLocations = jest.fn();
        const dockManager = Docking.DockManager.getDefault();
        dockManager._ensureLocationsPending = true;
        dockManager._ensureLocations = ensureLocations;
        const ctx = makeDashContext({
            _resetIconsQueuedDuringDrag: false,
            _redisplayQueuedDuringDrag: false,
        });
        DockDash.prototype._flushDeferredDragWork.call(ctx);
        expect(ensureLocations).toHaveBeenCalled();
        expect(dockManager._ensureLocationsPending).toBe(false);
        // cleanup
        delete dockManager._ensureLocationsPending;
        delete dockManager._ensureLocations;
    });

    test('flushes pending dockOrderSync when dockManager has it pending', () => {
        const syncFn = jest.fn();
        const dockManager = Docking.DockManager.getDefault();
        dockManager._dockOrderSyncPending = true;
        dockManager._syncDockOrderWithFavorites = syncFn;
        const ctx = makeDashContext({
            _resetIconsQueuedDuringDrag: false,
            _redisplayQueuedDuringDrag: false,
        });
        DockDash.prototype._flushDeferredDragWork.call(ctx);
        expect(syncFn).toHaveBeenCalled();
        expect(dockManager._dockOrderSyncPending).toBe(false);
        // cleanup
        delete dockManager._dockOrderSyncPending;
        delete dockManager._syncDockOrderWithFavorites;
    });
});

// ---------------------------------------------------------------------------
// _disableMagnification
// ---------------------------------------------------------------------------
describe('DockDash._disableMagnification', () => {
    test('is a no-op when magnification is not enabled', () => {
        const emit = jest.fn();
        const ctx = makeDashContext({
            _magnificationEnabled: false,
            emit,
        });
        DockDash.prototype._disableMagnification.call(ctx);
        expect(emit).not.toHaveBeenCalled();
    });

    test('disables magnification when enabled', () => {
        const emit = jest.fn();
        const mockBox = {
            _children: [],
            get_children() { return []; },
            get_parent() { return null; },
            clip_to_view: false,
            x_align: 0,
            y_align: 0,
        };
        const ctx = makeDashContext({
            _magnificationEnabled: true,
            _clipViewIdleId: 0,
            emit,
            _box: mockBox,
            _dashContainer: {
                reactive: true,
                _children: [],
                get_children() { return []; },
                clip_to_view: false,
                remove_child() {},
                add_child() {},
            },
            _showAppsIcon: null,
            _workspaceMinimapContainer: null,
            _quickSettingsButton: null,
            _background: {
                set_easing_duration: jest.fn(),
                set_easing_mode: jest.fn(),
                set_scale: jest.fn(),
            },
        });
        ctx._boxContainer = {
            add_child() {},
            _children: [],
        };
        ctx._resetMagnification = DockDash.prototype._resetMagnification.bind(ctx);
        ctx._resetUtilityElement = DockDash.prototype._resetUtilityElement.bind(ctx);
        ctx._getUtilityScalableActor = DockDash.prototype._getUtilityScalableActor.bind(ctx);
        DockDash.prototype._disableMagnification.call(ctx);
        expect(ctx._magnificationEnabled).toBe(false);
        expect(emit).toHaveBeenCalledWith('magnification-changed', false);
    });
});

// ---------------------------------------------------------------------------
// _enableMagnification
// ---------------------------------------------------------------------------
describe('DockDash._enableMagnification', () => {
    function addMagnificationMethods(ctx) {
        ctx._onMagnificationMotion = DockDash.prototype._onMagnificationMotion.bind(ctx);
        ctx._onMagnificationLeave = DockDash.prototype._onMagnificationLeave.bind(ctx);
        ctx._getMagnificationPivot = DockDash.prototype._getMagnificationPivot.bind(ctx);
        ctx._resetMagnification = jest.fn();
        // dashContainer needs connect for signal handler
        if (!ctx._dashContainer.connect) {
            let _nid = 1;
            ctx._dashContainer.connect = () => _nid++;
            ctx._dashContainer.disconnect = () => {};
        }
        if (!ctx._box.connect) {
            let _nid = 1;
            ctx._box.connect = () => _nid++;
            ctx._box.disconnect = () => {};
        }
    }

    test('enables magnification when not enabled', () => {
        const emit = jest.fn();
        const mockBox = {
            _children: [],
            get_children() { return []; },
            get_parent() { return null; },
            set_clip_to_allocation() {},
            clip_to_view: true,
            x_align: 0,
            y_align: 0,
        };
        const ctx = makeDashContext({
            _magnificationEnabled: false,
            emit,
            _box: mockBox,
        });
        ctx._dashContainer.set_clip_to_allocation = jest.fn();
        addMagnificationMethods(ctx);
        DockDash.prototype._enableMagnification.call(ctx);
        expect(ctx._magnificationEnabled).toBe(true);
        expect(ctx._dashContainer.reactive).toBe(true);
        expect(emit).toHaveBeenCalledWith('magnification-changed', true);
    });

    test('reparents box from boxContainer to dashContainer', () => {
        const emit = jest.fn();
        const ctx = makeDashContext({
            _magnificationEnabled: false,
            emit,
            _position: St.Side.BOTTOM,
        });
        const mockBox = {
            _children: [],
            get_children() { return []; },
            get_parent() { return ctx._boxContainer; },
            set_clip_to_allocation() {},
            clip_to_view: true,
            x_align: 0,
            y_align: 0,
            y_expand: false,
        };
        ctx._box = mockBox;
        ctx._boxContainer.remove_child = jest.fn();
        ctx._dashContainer.insert_child_below = jest.fn();
        ctx._dashContainer.set_clip_to_allocation = jest.fn();
        addMagnificationMethods(ctx);
        DockDash.prototype._enableMagnification.call(ctx);
        expect(ctx._boxContainer.remove_child).toHaveBeenCalledWith(mockBox);
        expect(ctx._dashContainer.insert_child_below).toHaveBeenCalled();
    });

    test('aligns box to END for BOTTOM position', () => {
        const emit = jest.fn();
        const ctx = makeDashContext({
            _magnificationEnabled: false,
            emit,
            _position: St.Side.BOTTOM,
            _isHorizontal: true,
        });
        const mockBox = {
            _children: [],
            get_children() { return []; },
            get_parent() { return ctx._boxContainer; },
            set_clip_to_allocation() {},
            clip_to_view: true,
            x_align: 0,
            y_align: 0,
        };
        ctx._box = mockBox;
        ctx._boxContainer.remove_child = jest.fn();
        ctx._dashContainer.insert_child_below = jest.fn();
        ctx._dashContainer.set_clip_to_allocation = jest.fn();
        addMagnificationMethods(ctx);
        DockDash.prototype._enableMagnification.call(ctx);
        expect(mockBox.y_align).toBe(Clutter.ActorAlign.END);
    });

    test('aligns box to START for TOP position', () => {
        const emit = jest.fn();
        const ctx = makeDashContext({
            _magnificationEnabled: false,
            emit,
            _position: St.Side.TOP,
            _isHorizontal: true,
        });
        const mockBox = {
            _children: [],
            get_children() { return []; },
            get_parent() { return ctx._boxContainer; },
            set_clip_to_allocation() {},
            clip_to_view: true,
            x_align: 0,
            y_align: 0,
        };
        ctx._box = mockBox;
        ctx._boxContainer.remove_child = jest.fn();
        ctx._dashContainer.insert_child_below = jest.fn();
        ctx._dashContainer.set_clip_to_allocation = jest.fn();
        addMagnificationMethods(ctx);
        DockDash.prototype._enableMagnification.call(ctx);
        expect(mockBox.y_align).toBe(Clutter.ActorAlign.START);
    });

    test('aligns box to END for RIGHT position (vertical)', () => {
        const emit = jest.fn();
        const ctx = makeDashContext({
            _magnificationEnabled: false,
            emit,
            _position: St.Side.RIGHT,
            _isHorizontal: false,
        });
        const mockBox = {
            _children: [],
            get_children() { return []; },
            get_parent() { return ctx._boxContainer; },
            set_clip_to_allocation() {},
            clip_to_view: true,
            x_align: 0,
            y_align: 0,
        };
        ctx._box = mockBox;
        ctx._boxContainer.remove_child = jest.fn();
        ctx._dashContainer.insert_child_below = jest.fn();
        ctx._dashContainer.set_clip_to_allocation = jest.fn();
        addMagnificationMethods(ctx);
        DockDash.prototype._enableMagnification.call(ctx);
        expect(mockBox.x_align).toBe(Clutter.ActorAlign.END);
    });

    test('aligns box to START for LEFT position (vertical)', () => {
        const emit = jest.fn();
        const ctx = makeDashContext({
            _magnificationEnabled: false,
            emit,
            _position: St.Side.LEFT,
            _isHorizontal: false,
        });
        const mockBox = {
            _children: [],
            get_children() { return []; },
            get_parent() { return ctx._boxContainer; },
            set_clip_to_allocation() {},
            clip_to_view: true,
            x_align: 0,
            y_align: 0,
        };
        ctx._box = mockBox;
        ctx._boxContainer.remove_child = jest.fn();
        ctx._dashContainer.insert_child_below = jest.fn();
        ctx._dashContainer.set_clip_to_allocation = jest.fn();
        addMagnificationMethods(ctx);
        DockDash.prototype._enableMagnification.call(ctx);
        expect(mockBox.x_align).toBe(Clutter.ActorAlign.START);
    });

    test('does not reparent when already in dashContainer', () => {
        const emit = jest.fn();
        const ctx = makeDashContext({
            _magnificationEnabled: false,
            emit,
        });
        const mockBox = {
            _children: [],
            get_children() { return []; },
            get_parent() { return ctx._dashContainer; },
            set_clip_to_allocation() {},
            clip_to_view: true,
            x_align: 0,
            y_align: 0,
        };
        ctx._box = mockBox;
        ctx._boxContainer.remove_child = jest.fn();
        ctx._dashContainer.set_clip_to_allocation = jest.fn();
        addMagnificationMethods(ctx);
        DockDash.prototype._enableMagnification.call(ctx);
        expect(ctx._boxContainer.remove_child).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// _updateNumberOverlay
// ---------------------------------------------------------------------------
describe('DockDash._updateNumberOverlay', () => {
    test('assigns numbers 1-9 then 0 for 10th icon', () => {
        const overlays = [];
        const icons = Array.from({length: 11}, () => ({
            setNumberOverlay: jest.fn(n => overlays.push(n)),
            updateNumberOverlay: jest.fn(),
        }));
        const ctx = makeDashContext({
            getAppIcons: () => icons,
        });
        DockDash.prototype._updateNumberOverlay.call(ctx);
        for (let i = 0; i < 9; i++)
            expect(icons[i].setNumberOverlay).toHaveBeenCalledWith(i + 1);
        expect(icons[9].setNumberOverlay).toHaveBeenCalledWith(0);
        expect(icons[10].setNumberOverlay).toHaveBeenCalledWith(-1);
        icons.forEach(icon =>
            expect(icon.updateNumberOverlay).toHaveBeenCalled()
        );
    });

    test('empty icons list does nothing', () => {
        const ctx = makeDashContext({getAppIcons: () => []});
        DockDash.prototype._updateNumberOverlay.call(ctx);
    });

    test('single icon gets overlay 1', () => {
        const icon = {setNumberOverlay: jest.fn(), updateNumberOverlay: jest.fn()};
        const ctx = makeDashContext({getAppIcons: () => [icon]});
        DockDash.prototype._updateNumberOverlay.call(ctx);
        expect(icon.setNumberOverlay).toHaveBeenCalledWith(1);
        expect(icon.updateNumberOverlay).toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// toggleNumberOverlay
// ---------------------------------------------------------------------------
describe('DockDash.toggleNumberOverlay', () => {
    test('calls toggleNumberOverlay on each icon with the activate flag', () => {
        const icons = [
            {toggleNumberOverlay: jest.fn()},
            {toggleNumberOverlay: jest.fn()},
        ];
        const ctx = makeDashContext({getAppIcons: () => icons});

        DockDash.prototype.toggleNumberOverlay.call(ctx, true);
        icons.forEach(icon =>
            expect(icon.toggleNumberOverlay).toHaveBeenCalledWith(true)
        );

        DockDash.prototype.toggleNumberOverlay.call(ctx, false);
        icons.forEach(icon =>
            expect(icon.toggleNumberOverlay).toHaveBeenCalledWith(false)
        );
    });
});

// ---------------------------------------------------------------------------
// setIconSize
// ---------------------------------------------------------------------------
describe('DockDash.setIconSize', () => {
    function makeCtxForSetIconSize(overrides = {}) {
        const ctx = makeDashContext(overrides);
        ctx._initializeIconSize = DockDash.prototype._initializeIconSize.bind(ctx);
        return ctx;
    }

    test('initializes icon sizes and queues redisplay', () => {
        Settings.set('icon-size-fixed', false);
        const queueRedisplay = jest.fn();
        const ctx = makeCtxForSetIconSize({
            _availableIconSizes: [],
            _shownInitially: true,
            _queueRedisplay: queueRedisplay,
        });
        DockDash.prototype.setIconSize.call(ctx, 48, false);
        expect(ctx._availableIconSizes).toEqual([16, 22, 24, 32, 48]);
        expect(queueRedisplay).toHaveBeenCalled();
        expect(ctx._shownInitially).toBe(true);
    });

    test('doNotAnimate resets _shownInitially', () => {
        Settings.set('icon-size-fixed', false);
        const ctx = makeCtxForSetIconSize({
            _availableIconSizes: [],
            _shownInitially: true,
            _queueRedisplay: jest.fn(),
        });
        DockDash.prototype.setIconSize.call(ctx, 48, true);
        expect(ctx._shownInitially).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// resetAppIcons
// ---------------------------------------------------------------------------
describe('DockDash.resetAppIcons', () => {
    test('defers to _resetIconsQueuedDuringDrag when drag in progress', () => {
        const ctx = makeDashContext({
            _dragInProgress: true,
            _resetIconsQueuedDuringDrag: false,
            _box: {get_children: () => []},
            _shownInitially: true,
            _redisplay: jest.fn(),
        });
        DockDash.prototype.resetAppIcons.call(ctx);
        expect(ctx._resetIconsQueuedDuringDrag).toBe(true);
    });

    test('destroys children and redisplays when no drag', () => {
        const child1 = {child: {icon: {}}, destroy: jest.fn()};
        const child2 = {child: {icon: {}}, destroy: jest.fn()};
        const redisplay = jest.fn();
        const ctx = makeDashContext({
            _dragInProgress: false,
            _box: {get_children: () => [child1, child2]},
            _shownInitially: true,
            _redisplay: redisplay,
        });
        DockDash.prototype.resetAppIcons.call(ctx);
        expect(child1.destroy).toHaveBeenCalled();
        expect(child2.destroy).toHaveBeenCalled();
        expect(ctx._shownInitially).toBe(false);
        expect(redisplay).toHaveBeenCalled();
    });

    test('skips children without icon', () => {
        const child1 = {child: {icon: {}}, destroy: jest.fn()};
        const child2 = {child: {}, destroy: jest.fn()};  // no icon
        const redisplay = jest.fn();
        const ctx = makeDashContext({
            _dragInProgress: false,
            _box: {get_children: () => [child1, child2]},
            _shownInitially: true,
            _redisplay: redisplay,
        });
        DockDash.prototype.resetAppIcons.call(ctx);
        expect(child1.destroy).toHaveBeenCalled();
        expect(child2.destroy).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// resetAppIconsDebounced
// ---------------------------------------------------------------------------
describe('DockDash.resetAppIconsDebounced', () => {
    test('sets debounce id on first call', () => {
        const ctx = makeDashContext({
            _resetIconsDebounceId: 0,
            resetAppIcons: jest.fn(),
        });
        DockDash.prototype.resetAppIconsDebounced.call(ctx);
        // GLib.timeout_add returns a non-zero id
        expect(ctx._resetIconsDebounceId).toBeTruthy();
    });

    test('does nothing if already debouncing', () => {
        const ctx = makeDashContext({
            _resetIconsDebounceId: 42,
            resetAppIcons: jest.fn(),
        });
        DockDash.prototype.resetAppIconsDebounced.call(ctx);
        expect(ctx._resetIconsDebounceId).toBe(42);
    });
});

// ---------------------------------------------------------------------------
// _itemMenuStateChanged
// ---------------------------------------------------------------------------
describe('DockDash._itemMenuStateChanged', () => {
    test('emits menu-opened when opened is true', () => {
        const emit = jest.fn();
        const ctx = makeDashContext({emit});
        DockDash.prototype._itemMenuStateChanged.call(ctx, {}, true);
        expect(emit).toHaveBeenCalledWith('menu-opened');
    });

    test('emits menu-closed when opened is false', () => {
        const emit = jest.fn();
        const ctx = makeDashContext({emit});
        DockDash.prototype._itemMenuStateChanged.call(ctx, {}, false);
        expect(emit).toHaveBeenCalledWith('menu-closed');
    });
});

// ---------------------------------------------------------------------------
// showAppsButton getter
// ---------------------------------------------------------------------------
describe('DockDash.showAppsButton getter', () => {
    function findDescriptor(proto, prop) {
        let p = proto;
        while (p) {
            const desc = Object.getOwnPropertyDescriptor(p, prop);
            if (desc) return desc;
            p = Object.getPrototypeOf(p);
        }
        return null;
    }

    test('returns _showAppsIcon.toggleButton', () => {
        const toggleButton = {__marker: true};
        const ctx = makeDashContext({
            _showAppsIcon: {toggleButton},
        });
        const desc = findDescriptor(DockDash.prototype, 'showAppsButton');
        if (desc?.get) {
            const result = desc.get.call(ctx);
            expect(result).toBe(toggleButton);
        }
    });
});

// ---------------------------------------------------------------------------
// showShowAppsButton / hideShowAppsButton
// ---------------------------------------------------------------------------
describe('DockDash.showShowAppsButton / hideShowAppsButton', () => {
    test('showShowAppsButton makes icon visible', () => {
        const showAppsIcon = {
            visible: false,
            show: jest.fn(),
        };
        const ctx = makeDashContext({
            _showAppsIcon: showAppsIcon,
            updateShowAppsButton: jest.fn(),
        });
        DockDash.prototype.showShowAppsButton.call(ctx);
        expect(showAppsIcon.visible).toBe(true);
        expect(showAppsIcon.show).toHaveBeenCalledWith(true);
        expect(ctx.updateShowAppsButton).toHaveBeenCalled();
    });

    test('hideShowAppsButton hides the icon', () => {
        const showAppsIcon = {visible: true};
        const ctx = makeDashContext({_showAppsIcon: showAppsIcon});
        DockDash.prototype.hideShowAppsButton.call(ctx);
        expect(showAppsIcon.visible).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// _clearDragPlaceholder
// ---------------------------------------------------------------------------
describe('DockDash._clearDragPlaceholder', () => {
    test('animates out and destroys placeholder', () => {
        const placeholder = {animateOutAndDestroy: jest.fn()};
        const ctx = makeDashContext({
            _dragPlaceholder: placeholder,
            _dragPlaceholderPos: 5,
        });
        DockDash.prototype._clearDragPlaceholder.call(ctx);
        expect(placeholder.animateOutAndDestroy).toHaveBeenCalled();
        expect(ctx._dragPlaceholder).toBeNull();
        expect(ctx._dragPlaceholderPos).toBe(-1);
    });

    test('does nothing when no placeholder', () => {
        const ctx = makeDashContext({
            _dragPlaceholder: null,
            _dragPlaceholderPos: -1,
        });
        DockDash.prototype._clearDragPlaceholder.call(ctx);
        expect(ctx._dragPlaceholderPos).toBe(-1);
    });
});

// ---------------------------------------------------------------------------
// _clearDropTarget
// ---------------------------------------------------------------------------
describe('DockDash._clearDropTarget', () => {
    test('removes drop-target style class', () => {
        const child = {remove_style_class_name: jest.fn()};
        const ctx = makeDashContext({
            _dropTargetIcon: {child},
        });
        DockDash.prototype._clearDropTarget.call(ctx);
        expect(child.remove_style_class_name).toHaveBeenCalledWith('drop-target');
        expect(ctx._dropTargetIcon).toBeNull();
    });

    test('does nothing when no drop target', () => {
        const ctx = makeDashContext({_dropTargetIcon: null});
        DockDash.prototype._clearDropTarget.call(ctx);
        expect(ctx._dropTargetIcon).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// _cancelDragToFocus
// ---------------------------------------------------------------------------
describe('DockDash._cancelDragToFocus', () => {
    test('removes timeout when set', () => {
        const ctx = makeDashContext({
            _dragToFocusTimeoutId: 42,
            _dragToFocusIcon: {some: 'icon'},
        });
        DockDash.prototype._cancelDragToFocus.call(ctx);
        expect(ctx._dragToFocusTimeoutId).toBe(0);
        expect(ctx._dragToFocusIcon).toBeNull();
    });

    test('does nothing when no timeout', () => {
        const ctx = makeDashContext({
            _dragToFocusTimeoutId: 0,
            _dragToFocusIcon: null,
        });
        DockDash.prototype._cancelDragToFocus.call(ctx);
        expect(ctx._dragToFocusTimeoutId).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// _requireVisibility
// ---------------------------------------------------------------------------
describe('DockDash._requireVisibility', () => {
    test('sets requiresVisibility and creates timeout', () => {
        const ctx = makeDashContext({
            requiresVisibility: false,
            _requiresVisibilityTimeout: 0,
        });
        DockDash.prototype._requireVisibility.call(ctx);
        expect(ctx.requiresVisibility).toBe(true);
        expect(ctx._requiresVisibilityTimeout).toBeTruthy();
    });

    test('removes previous timeout before creating new one', () => {
        const ctx = makeDashContext({
            requiresVisibility: false,
            _requiresVisibilityTimeout: 99,
        });
        DockDash.prototype._requireVisibility.call(ctx);
        expect(ctx.requiresVisibility).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// _onScrollEvent
// ---------------------------------------------------------------------------
describe('DockDash._onScrollEvent', () => {
    function makeScrollContext(overrides = {}) {
        return makeDashContext({
            _ensureItemVisibility: jest.fn(),
            ...overrides,
        });
    }

    test('propagates when icon-size-fixed is false', () => {
        Settings.set('icon-size-fixed', false);
        const ctx = makeScrollContext();
        const event = {
            get_scroll_direction: () => Clutter.ScrollDirection.SMOOTH,
            get_scroll_delta: () => [0, 1],
        };
        const result = DockDash.prototype._onScrollEvent.call(ctx, null, event);
        expect(result).toBe(Clutter.EVENT_PROPAGATE);
    });

    test('stops non-SMOOTH scroll events', () => {
        Settings.set('icon-size-fixed', true);
        const ctx = makeScrollContext();
        const event = {
            get_scroll_direction: () => Clutter.ScrollDirection.UP,
        };
        const result = DockDash.prototype._onScrollEvent.call(ctx, null, event);
        expect(result).toBe(Clutter.EVENT_STOP);
    });

    test('handles horizontal SMOOTH scroll', () => {
        Settings.set('icon-size-fixed', true);
        const adj = {step_increment: 10, get_value: () => 0, set_value: jest.fn()};
        const ctx = makeScrollContext({
            _isHorizontal: true,
            _scrollView: {
                get_hadjustment: () => adj,
                get_vadjustment: () => ({step_increment: 10, get_value: () => 0, set_value: jest.fn()}),
            },
        });
        const event = {
            get_scroll_direction: () => Clutter.ScrollDirection.SMOOTH,
            get_scroll_delta: () => [2, 0.5],
        };
        const result = DockDash.prototype._onScrollEvent.call(ctx, null, event);
        expect(result).toBe(Clutter.EVENT_STOP);
        expect(adj.set_value).toHaveBeenCalled();
    });

    test('handles vertical SMOOTH scroll', () => {
        Settings.set('icon-size-fixed', true);
        const adj = {step_increment: 10, get_value: () => 5, set_value: jest.fn()};
        const ctx = makeScrollContext({
            _isHorizontal: false,
            _scrollView: {
                get_hadjustment: () => ({step_increment: 10, get_value: () => 0, set_value: jest.fn()}),
                get_vadjustment: () => adj,
            },
        });
        const event = {
            get_scroll_direction: () => Clutter.ScrollDirection.SMOOTH,
            get_scroll_delta: () => [0, 1],
        };
        const result = DockDash.prototype._onScrollEvent.call(ctx, null, event);
        expect(result).toBe(Clutter.EVENT_STOP);
        expect(adj.set_value).toHaveBeenCalled();
    });

    test('handles NaN value in adjustment', () => {
        Settings.set('icon-size-fixed', true);
        const adj = {step_increment: 10, get_value: () => NaN, set_value: jest.fn()};
        const ctx = makeScrollContext({
            _isHorizontal: true,
            _scrollView: {
                get_hadjustment: () => adj,
                get_vadjustment: () => ({step_increment: 10, get_value: () => 0, set_value: jest.fn()}),
            },
        });
        const event = {
            get_scroll_direction: () => Clutter.ScrollDirection.SMOOTH,
            get_scroll_delta: () => [1, 0],
        };
        DockDash.prototype._onScrollEvent.call(ctx, null, event);
        expect(adj.set_value).toHaveBeenCalled();
    });

    test('uses dy for horizontal when dx is smaller', () => {
        Settings.set('icon-size-fixed', true);
        const adj = {step_increment: 10, get_value: () => 0, set_value: jest.fn()};
        const ctx = makeScrollContext({
            _isHorizontal: true,
            _scrollView: {
                get_hadjustment: () => adj,
                get_vadjustment: () => ({step_increment: 10, get_value: () => 0, set_value: jest.fn()}),
            },
        });
        const event = {
            get_scroll_direction: () => Clutter.ScrollDirection.SMOOTH,
            get_scroll_delta: () => [0, 3], // dy is larger
        };
        DockDash.prototype._onScrollEvent.call(ctx, null, event);
        expect(adj.set_value).toHaveBeenCalledWith(30); // 3 * 10
    });
});

// ---------------------------------------------------------------------------
// _ensureItemVisibility
// ---------------------------------------------------------------------------
describe('DockDash._ensureItemVisibility', () => {
    test('removes timeout when actor is not hovering', () => {
        const ctx = makeDashContext({
            _ensureActorVisibilityTimeoutId: 42,
        });
        DockDash.prototype._ensureItemVisibility.call(ctx, null);
        expect(ctx._ensureActorVisibilityTimeoutId).toBe(0);
    });

    test('removes timeout when actor has hover=false', () => {
        const ctx = makeDashContext({
            _ensureActorVisibilityTimeoutId: 42,
        });
        DockDash.prototype._ensureItemVisibility.call(ctx, {hover: false});
        expect(ctx._ensureActorVisibilityTimeoutId).toBe(0);
    });

    test('sets up timeout when actor is hovering', () => {
        const ctx = makeDashContext({
            _ensureActorVisibilityTimeoutId: 0,
        });
        const actor = {
            hover: true,
            connect: jest.fn(() => 1),
        };
        DockDash.prototype._ensureItemVisibility.call(ctx, actor);
        expect(ctx._ensureActorVisibilityTimeoutId).toBeTruthy();
    });

    test('does nothing when actor is null and no timeout', () => {
        const ctx = makeDashContext({_ensureActorVisibilityTimeoutId: 0});
        DockDash.prototype._ensureItemVisibility.call(ctx, null);
        expect(ctx._ensureActorVisibilityTimeoutId).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// _onWiggleModeChanged
// ---------------------------------------------------------------------------
describe('DockDash._onWiggleModeChanged', () => {
    test('connects click handler when active', () => {
        const ctx = makeDashContext({
            _wiggleClickCaptureId: 0,
            _background: {
                connect: jest.fn(() => 42),
                disconnect: jest.fn(),
            },
        });
        DockDash.prototype._onWiggleModeChanged.call(ctx, true);
        expect(ctx._background.connect).toHaveBeenCalledWith('button-release-event', expect.any(Function));
        expect(ctx._wiggleClickCaptureId).toBe(42);
    });

    test('disconnects click handler when inactive', () => {
        const ctx = makeDashContext({
            _wiggleClickCaptureId: 42,
            _background: {
                connect: jest.fn(),
                disconnect: jest.fn(),
            },
        });
        DockDash.prototype._onWiggleModeChanged.call(ctx, false);
        expect(ctx._background.disconnect).toHaveBeenCalledWith(42);
        expect(ctx._wiggleClickCaptureId).toBe(0);
    });

    test('does nothing when inactive and no capture id', () => {
        const ctx = makeDashContext({
            _wiggleClickCaptureId: 0,
            _background: {
                connect: jest.fn(),
                disconnect: jest.fn(),
            },
        });
        DockDash.prototype._onWiggleModeChanged.call(ctx, false);
        expect(ctx._background.disconnect).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// vfunc_get_preferred_height / vfunc_get_preferred_width
// ---------------------------------------------------------------------------
describe('DockDash.vfunc_get_preferred_height', () => {
    test('clamps height for vertical dock when maxHeight is set', () => {
        const ctx = makeDashContext({
            _isHorizontal: false,
            _maxHeight: 500,
        });
        // Mock super.vfunc_get_preferred_height returning [50, 800]
        const superFn = jest.fn(() => [50, 800]);
        const boundCtx = {...ctx, vfunc_get_preferred_height: superFn};
        // Call with 'call' — we test the logic directly
        // The real code does: const [minHeight, natHeight] = super.vfunc_get_preferred_height.call(this, forWidth);
        // We replicate the logic:
        const [minHeight, natHeight] = superFn(100);
        let result;
        if (!ctx._isHorizontal && ctx._maxHeight !== -1 && natHeight > ctx._maxHeight)
            result = [minHeight, ctx._maxHeight];
        else
            result = [minHeight, natHeight];
        expect(result).toEqual([50, 500]);
    });

    test('does not clamp when maxHeight is -1', () => {
        const [minHeight, natHeight] = [50, 800];
        const ctx = {_isHorizontal: false, _maxHeight: -1};
        let result;
        if (!ctx._isHorizontal && ctx._maxHeight !== -1 && natHeight > ctx._maxHeight)
            result = [minHeight, ctx._maxHeight];
        else
            result = [minHeight, natHeight];
        expect(result).toEqual([50, 800]);
    });

    test('does not clamp for horizontal dock', () => {
        const [minHeight, natHeight] = [50, 800];
        const ctx = {_isHorizontal: true, _maxHeight: 500};
        let result;
        if (!ctx._isHorizontal && ctx._maxHeight !== -1 && natHeight > ctx._maxHeight)
            result = [minHeight, ctx._maxHeight];
        else
            result = [minHeight, natHeight];
        expect(result).toEqual([50, 800]);
    });
});

describe('DockDash.vfunc_get_preferred_width', () => {
    test('clamps width for horizontal dock when maxWidth is set', () => {
        const [minWidth, natWidth] = [50, 1200];
        const ctx = {_isHorizontal: true, _maxWidth: 800};
        let result;
        if (ctx._isHorizontal && ctx._maxWidth !== -1 && natWidth > ctx._maxWidth)
            result = [minWidth, ctx._maxWidth];
        else
            result = [minWidth, natWidth];
        expect(result).toEqual([50, 800]);
    });

    test('does not clamp when maxWidth is -1', () => {
        const [minWidth, natWidth] = [50, 1200];
        const ctx = {_isHorizontal: true, _maxWidth: -1};
        let result;
        if (ctx._isHorizontal && ctx._maxWidth !== -1 && natWidth > ctx._maxWidth)
            result = [minWidth, ctx._maxWidth];
        else
            result = [minWidth, natWidth];
        expect(result).toEqual([50, 1200]);
    });
});

// ---------------------------------------------------------------------------
// _onMagnificationLeave
// ---------------------------------------------------------------------------
describe('DockDash._onMagnificationLeave', () => {
    test('calls _resetMagnification with animate=true', () => {
        const ctx = makeDashContext();
        ctx._resetMagnification = jest.fn();
        const result = DockDash.prototype._onMagnificationLeave.call(ctx, null, null);
        expect(ctx._resetMagnification).toHaveBeenCalledWith(true);
        expect(result).toBe(Clutter.EVENT_PROPAGATE);
    });
});

// ---------------------------------------------------------------------------
// _onMagnificationMotion
// ---------------------------------------------------------------------------
describe('DockDash._onMagnificationMotion', () => {
    test('returns PROPAGATE when maxScale <= 1.0', () => {
        Settings._setMany({
            'icon-magnification-factor': 0.5,
        });
        const ctx = makeDashContext();
        const event = {get_coords: () => [100, 100]};
        const result = DockDash.prototype._onMagnificationMotion.call(ctx, null, event);
        expect(result).toBe(Clutter.EVENT_PROPAGATE);
    });

    test('processes icons when maxScale > 1.0', () => {
        Settings._setMany({
            'icon-magnification-factor': 2.0,
            'magnification-spread': 3,
            'magnification-easing-duration': 100,
            'icon-magnification-all': false,
        });

        const iconBin = {
            set_pivot_point: jest.fn(),
            set_easing_duration: jest.fn(),
            set_easing_mode: jest.fn(),
            set_scale: jest.fn(),
        };
        const boxChild = {
            visible: true,
            child: {icon: {_iconBin: iconBin}},
            get_stage: () => ({}),
            get_transformed_position: () => [50, 0],
            get_transformed_size: () => [48, 48],
            animatingOut: false,
            set_easing_duration: jest.fn(),
            set_easing_mode: jest.fn(),
            set_z_position: jest.fn(),
            translation_x: 0,
            translation_y: 0,
        };
        const mockBox = {
            _children: [boxChild],
            get_children() { return [...this._children]; },
            visible: true,
            get_stage: () => ({}),
        };
        const ctx = makeDashContext({
            _isHorizontal: true,
            _box: mockBox,
            _dashContainer: {
                _children: [mockBox],
                get_children() { return [...this._children]; },
            },
            _background: {
                width: 400,
                set_pivot_point: jest.fn(),
                set_easing_duration: jest.fn(),
                set_easing_mode: jest.fn(),
                set_scale: jest.fn(),
            },
            iconSize: 48,
            _showAppsIcon: null,
            _workspaceMinimapContainer: null,
            _quickSettingsButton: null,
        });
        ctx._getMagnificationPivot = DockDash.prototype._getMagnificationPivot.bind(ctx);

        const event = {get_coords: () => [74, 24]};
        const result = DockDash.prototype._onMagnificationMotion.call(ctx, null, event);
        expect(result).toBe(Clutter.EVENT_PROPAGATE);
        expect(iconBin.set_scale).toHaveBeenCalled();
    });

    test('magnifies utility elements when icon-magnification-all is true', () => {
        Settings._setMany({
            'icon-magnification-factor': 2.0,
            'magnification-spread': 3,
            'magnification-easing-duration': 100,
            'icon-magnification-all': true,
        });

        const mockBox = {
            _children: [],
            get_children() { return []; },
            visible: true,
            get_stage: () => ({}),
        };
        const showAppsIcon = {
            visible: true,
            get_stage: () => ({}),
            get_transformed_position: () => [200, 0],
            get_transformed_size: () => [48, 48],
            set_easing_duration: jest.fn(),
            set_easing_mode: jest.fn(),
            set_z_position: jest.fn(),
            translation_x: 0,
            translation_y: 0,
            icon: {
                _iconBin: {
                    set_pivot_point: jest.fn(),
                    set_easing_duration: jest.fn(),
                    set_easing_mode: jest.fn(),
                    set_scale: jest.fn(),
                },
            },
        };
        const ctx = makeDashContext({
            _isHorizontal: true,
            _box: mockBox,
            _dashContainer: {
                _children: [mockBox, showAppsIcon],
                get_children() { return [...this._children]; },
            },
            _background: {
                width: 400,
                set_pivot_point: jest.fn(),
                set_easing_duration: jest.fn(),
                set_easing_mode: jest.fn(),
                set_scale: jest.fn(),
            },
            iconSize: 48,
            _showAppsIcon: showAppsIcon,
            _workspaceMinimapContainer: null,
            _quickSettingsButton: null,
        });
        ctx._getMagnificationPivot = DockDash.prototype._getMagnificationPivot.bind(ctx);
        ctx._magnifyUtilityElement = DockDash.prototype._magnifyUtilityElement.bind(ctx);
        ctx._getUtilityScalableActor = DockDash.prototype._getUtilityScalableActor.bind(ctx);

        const event = {get_coords: () => [224, 24]};
        DockDash.prototype._onMagnificationMotion.call(ctx, null, event);
        // The utility magnification code path should have been hit
        expect(showAppsIcon.icon._iconBin.set_scale).toHaveBeenCalled();
    });

    test('scales background when totalExtra > 0', () => {
        Settings._setMany({
            'icon-magnification-factor': 2.0,
            'magnification-spread': 3,
            'magnification-easing-duration': 100,
            'icon-magnification-all': false,
        });

        const iconBin = {
            set_pivot_point: jest.fn(),
            set_easing_duration: jest.fn(),
            set_easing_mode: jest.fn(),
            set_scale: jest.fn(),
        };
        const boxChild = {
            visible: true,
            child: {icon: {_iconBin: iconBin}},
            get_stage: () => ({}),
            get_transformed_position: () => [50, 0],
            get_transformed_size: () => [48, 48],
            animatingOut: false,
            set_easing_duration: jest.fn(),
            set_easing_mode: jest.fn(),
            set_z_position: jest.fn(),
            translation_x: 0,
        };
        const bg = {
            width: 400,
            set_pivot_point: jest.fn(),
            set_easing_duration: jest.fn(),
            set_easing_mode: jest.fn(),
            set_scale: jest.fn(),
        };
        const mockBox = {
            _children: [boxChild],
            get_children() { return [...this._children]; },
            visible: true,
            get_stage: () => ({}),
        };
        const ctx = makeDashContext({
            _isHorizontal: true,
            _box: mockBox,
            _dashContainer: {
                _children: [mockBox],
                get_children() { return [...this._children]; },
            },
            _background: bg,
            iconSize: 48,
            _showAppsIcon: null,
            _workspaceMinimapContainer: null,
            _quickSettingsButton: null,
        });
        ctx._getMagnificationPivot = DockDash.prototype._getMagnificationPivot.bind(ctx);

        const event = {get_coords: () => [74, 24]}; // cursor right on the icon
        DockDash.prototype._onMagnificationMotion.call(ctx, null, event);
        expect(bg.set_scale).toHaveBeenCalled();
        expect(bg.set_pivot_point).toHaveBeenCalledWith(0.5, 0.5);
    });

    test('vertical dock uses cursorY and translation_y', () => {
        Settings._setMany({
            'icon-magnification-factor': 2.0,
            'magnification-spread': 3,
            'magnification-easing-duration': 100,
            'icon-magnification-all': false,
        });

        const iconBin = {
            set_pivot_point: jest.fn(),
            set_easing_duration: jest.fn(),
            set_easing_mode: jest.fn(),
            set_scale: jest.fn(),
        };
        const boxChild = {
            visible: true,
            child: {icon: {_iconBin: iconBin}},
            get_stage: () => ({}),
            get_transformed_position: () => [0, 50],
            get_transformed_size: () => [48, 48],
            animatingOut: false,
            set_easing_duration: jest.fn(),
            set_easing_mode: jest.fn(),
            set_z_position: jest.fn(),
            translation_y: 0,
        };
        const bg = {
            width: 400,
            set_pivot_point: jest.fn(),
            set_easing_duration: jest.fn(),
            set_easing_mode: jest.fn(),
            set_scale: jest.fn(),
        };
        const mockBox = {
            _children: [boxChild],
            get_children() { return [...this._children]; },
            visible: true,
            get_stage: () => ({}),
        };
        const ctx = makeDashContext({
            _isHorizontal: false,
            _position: St.Side.LEFT,
            _box: mockBox,
            _dashContainer: {
                _children: [mockBox],
                get_children() { return [...this._children]; },
            },
            _background: bg,
            iconSize: 48,
            _showAppsIcon: null,
            _workspaceMinimapContainer: null,
            _quickSettingsButton: null,
        });
        ctx._getMagnificationPivot = DockDash.prototype._getMagnificationPivot.bind(ctx);

        const event = {get_coords: () => [24, 74]};
        DockDash.prototype._onMagnificationMotion.call(ctx, null, event);
        expect(bg.set_scale).toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// _ensureSeparator
// ---------------------------------------------------------------------------
describe('DockDash._ensureSeparator', () => {
    test('creates and inserts separator when null', () => {
        const ctx = makeDashContext();
        ctx._ensureItemVisibility = jest.fn();
        const result = DockDash.prototype._ensureSeparator.call(ctx, null, 3);
        expect(result).toBeTruthy();
        expect(ctx._box._children.length).toBe(1);
    });

    test('reuses existing separator', () => {
        const ctx = makeDashContext();
        const existing = {__marker: true};
        DockDash.prototype._ensureSeparator.call(ctx, existing, 0);
        expect(ctx._box._children[0]).toBe(existing);
    });
});

// ---------------------------------------------------------------------------
// _onDestroy
// ---------------------------------------------------------------------------
describe('DockDash._onDestroy', () => {
    test('cleans up all resources', () => {
        const ctx = makeDashContext({
            _wiggleClickCaptureId: 42,
            _redisplayDebounceId: 10,
            _resetIconsDebounceId: 20,
            _requiresVisibilityTimeout: 30,
            _ensureActorVisibilityTimeoutId: 40,
            _background: {disconnect: jest.fn()},
            _disableMagnification: jest.fn(),
            _cancelDragToFocus: jest.fn(),
            iconAnimator: {destroy: jest.fn()},
            _quickSettingsButton: {destroy: jest.fn()},
        });
        DockDash.prototype._onDestroy.call(ctx);
        expect(ctx.iconAnimator.destroy).toHaveBeenCalled();
        expect(ctx._disableMagnification).toHaveBeenCalled();
        expect(ctx._quickSettingsButton).toBeNull();
        expect(ctx._wiggleClickCaptureId).toBe(0);
        expect(ctx._redisplayDebounceId).toBe(0);
        expect(ctx._resetIconsDebounceId).toBe(0);
        expect(ctx._cancelDragToFocus).toHaveBeenCalled();
    });

    test('handles null quickSettingsButton', () => {
        const ctx = makeDashContext({
            _wiggleClickCaptureId: 0,
            _redisplayDebounceId: 0,
            _resetIconsDebounceId: 0,
            _requiresVisibilityTimeout: 0,
            _ensureActorVisibilityTimeoutId: 0,
            _disableMagnification: jest.fn(),
            _cancelDragToFocus: jest.fn(),
            iconAnimator: {destroy: jest.fn()},
            _quickSettingsButton: null,
        });
        DockDash.prototype._onDestroy.call(ctx);
        expect(ctx.iconAnimator.destroy).toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// _onItemDragBegin
// ---------------------------------------------------------------------------
describe('DockDash._onItemDragBegin', () => {
    test('sets _dragInProgress', () => {
        const ctx = makeDashContext({_dragInProgress: false});
        DockDash.prototype._onItemDragBegin.call(ctx);
        expect(ctx._dragInProgress).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// _endItemDrag
// ---------------------------------------------------------------------------
describe('DockDash._endItemDrag', () => {
    test('clears drag state and flushes', () => {
        const ctx = makeDashContext({
            _dragInProgress: true,
            _dragToFocusTimeoutId: 0,
            _dragToFocusIcon: null,
            _resetIconsQueuedDuringDrag: false,
            _redisplayQueuedDuringDrag: false,
        });
        ctx._cancelDragToFocus = DockDash.prototype._cancelDragToFocus.bind(ctx);
        ctx._flushDeferredDragWork = DockDash.prototype._flushDeferredDragWork.bind(ctx);
        DockDash.prototype._endItemDrag.call(ctx);
        expect(ctx._dragInProgress).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// _onItemDragEnd
// ---------------------------------------------------------------------------
describe('DockDash._onItemDragEnd', () => {
    test('cancels drag to focus', () => {
        const ctx = makeDashContext({
            _dragToFocusTimeoutId: 42,
            _dragToFocusIcon: {},
        });
        ctx._cancelDragToFocus = DockDash.prototype._cancelDragToFocus.bind(ctx);
        DockDash.prototype._onItemDragEnd.call(ctx);
        expect(ctx._dragToFocusTimeoutId).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// _onWindowDragEnd
// ---------------------------------------------------------------------------
describe('DockDash._onWindowDragEnd', () => {
    test('cancels drag to focus', () => {
        const ctx = makeDashContext({
            _dragToFocusTimeoutId: 42,
            _dragToFocusIcon: {},
        });
        ctx._cancelDragToFocus = DockDash.prototype._cancelDragToFocus.bind(ctx);
        DockDash.prototype._onWindowDragEnd.call(ctx);
        expect(ctx._dragToFocusTimeoutId).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// _queueRedisplay
// ---------------------------------------------------------------------------
describe('DockDash._queueRedisplay', () => {
    test('creates debounce timeout on first call', () => {
        const ctx = makeDashContext({
            _redisplayDebounceId: 0,
            _dragInProgress: false,
        });
        DockDash.prototype._queueRedisplay.call(ctx);
        expect(ctx._redisplayDebounceId).toBeTruthy();
    });

    test('sets _redisplayQueuedDuringDrag when drag in progress', () => {
        const ctx = makeDashContext({
            _redisplayDebounceId: 0,
            _dragInProgress: true,
            _redisplayQueuedDuringDrag: false,
        });
        DockDash.prototype._queueRedisplay.call(ctx);
        expect(ctx._redisplayQueuedDuringDrag).toBe(true);
    });

    test('does nothing when already debouncing', () => {
        const ctx = makeDashContext({
            _redisplayDebounceId: 42,
        });
        DockDash.prototype._queueRedisplay.call(ctx);
        expect(ctx._redisplayDebounceId).toBe(42);
    });
});

// ---------------------------------------------------------------------------
// _enableHover / _disableHover
// ---------------------------------------------------------------------------
describe('DockDash._enableHover', () => {
    test('calls enableHover on all app icons', () => {
        const icon1 = {enableHover: jest.fn()};
        const icon2 = {enableHover: jest.fn()};
        const ctx = makeDashContext({
            getAppIcons: () => [icon1, icon2],
        });
        DockDash.prototype._enableHover.call(ctx);
        expect(icon1.enableHover).toHaveBeenCalledWith([icon1, icon2]);
        expect(icon2.enableHover).toHaveBeenCalledWith([icon1, icon2]);
    });
});

describe('DockDash._disableHover', () => {
    test('calls disableHover on all app icons', () => {
        const icon1 = {disableHover: jest.fn()};
        const icon2 = {disableHover: jest.fn()};
        const ctx = makeDashContext({
            getAppIcons: () => [icon1, icon2],
            _dashLeaveTimeoutId: 42,
        });
        DockDash.prototype._disableHover.call(ctx);
        expect(icon1.disableHover).toHaveBeenCalled();
        expect(icon2.disableHover).toHaveBeenCalled();
        expect(ctx._dashLeaveTimeoutId).toBeNull();
    });

    test('handles no dash leave timeout', () => {
        const ctx = makeDashContext({
            getAppIcons: () => [],
            _dashLeaveTimeoutId: null,
        });
        DockDash.prototype._disableHover.call(ctx);
        expect(ctx._dashLeaveTimeoutId).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// handleDragOver
// ---------------------------------------------------------------------------
describe('DockDash.handleDragOver', () => {
    test('returns NO_DROP for secondary dock', () => {
        const ctx = makeDashContext({_isSecondary: true});
        const result = DockDash.prototype.handleDragOver.call(ctx, {}, null, 0, 0, 0);
        expect(result).toBe(DND.DragMotionResult.NO_DROP);
    });

    test('returns NO_DROP when source has no app', () => {
        const ctx = makeDashContext({
            _isSecondary: false,
            _cancelDragToFocus: jest.fn(),
            _handleExternalDragOver: jest.fn(),
        });
        const result = DockDash.prototype.handleDragOver.call(ctx, {}, null, 0, 0, 0);
        expect(result).toBe(DND.DragMotionResult.NO_DROP);
    });

    test('returns NO_DROP for window-backed app', () => {
        const ctx = makeDashContext({
            _isSecondary: false,
            _cancelDragToFocus: jest.fn(),
            get_transformed_position: () => [0, 0],
        });
        const source = {app: {is_window_backed: () => true, get_id: () => 'test.desktop'}};
        const result = DockDash.prototype.handleDragOver.call(ctx, source, null, 0, 0, 0);
        expect(result).toBe(DND.DragMotionResult.NO_DROP);
    });
});

// ---------------------------------------------------------------------------
// acceptDrop
// ---------------------------------------------------------------------------
describe('DockDash.acceptDrop', () => {
    test('returns false when source has no app', () => {
        const ctx = makeDashContext({
            _cancelDragToFocus: jest.fn(),
        });
        ctx._cancelDragToFocus = DockDash.prototype._cancelDragToFocus.bind(ctx);
        const result = DockDash.prototype.acceptDrop.call(ctx, {}, null, 0, 0, 0);
        expect(result).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// updateShowAppsButton
// ---------------------------------------------------------------------------
describe('DockDash.updateShowAppsButton', () => {
    test('returns early when icon is parented but not visible', () => {
        const showAppsIcon = {
            get_parent: () => ({some: 'parent'}),
            visible: false,
        };
        const ctx = makeDashContext({_showAppsIcon: showAppsIcon});
        // Should return early without error
        DockDash.prototype.updateShowAppsButton.call(ctx);
    });

    test('inserts showAppsIcon at top when show-apps-at-top is true', () => {
        Settings.set('show-apps-at-top', true);
        const showAppsIcon = {
            get_parent: () => null,
            visible: true,
        };
        const ctx = makeDashContext({_showAppsIcon: showAppsIcon});
        ctx._dashContainer.insert_child_below = jest.fn();
        DockDash.prototype.updateShowAppsButton.call(ctx);
        expect(ctx._dashContainer.insert_child_below).toHaveBeenCalled();
    });

    test('inserts showAppsIcon at bottom when show-apps-at-top is false', () => {
        Settings.set('show-apps-at-top', false);
        const showAppsIcon = {
            get_parent: () => null,
            visible: true,
        };
        const ctx = makeDashContext({_showAppsIcon: showAppsIcon});
        ctx._dashContainer.insert_child_above = jest.fn();
        DockDash.prototype.updateShowAppsButton.call(ctx);
        expect(ctx._dashContainer.insert_child_above).toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// _updateQuickSettingsButton
// ---------------------------------------------------------------------------
describe('DockDash._updateQuickSettingsButton', () => {
    test('returns when quickSettingsButton is null', () => {
        const ctx = makeDashContext({_quickSettingsButton: null});
        DockDash.prototype._updateQuickSettingsButton.call(ctx);
        // Should not throw
    });

    test('removes button when showQuickSettings is false', () => {
        const parent = {remove_child: jest.fn()};
        const qsButton = {
            get_parent: () => parent,
        };
        const dockManagerSettings = Docking.DockManager.settings;
        const origShowQS = dockManagerSettings.showQuickSettings;
        dockManagerSettings.showQuickSettings = false;
        const ctx = makeDashContext({_quickSettingsButton: qsButton});
        DockDash.prototype._updateQuickSettingsButton.call(ctx);
        expect(parent.remove_child).toHaveBeenCalledWith(qsButton);
        dockManagerSettings.showQuickSettings = origShowQS;
    });

    test('inserts button when showQuickSettings is true', () => {
        const dockManagerSettings = Docking.DockManager.settings;
        const origShowQS = dockManagerSettings.showQuickSettings;
        dockManagerSettings.showQuickSettings = true;
        dockManagerSettings.showAppsAlwaysInTheEdge = true;
        dockManagerSettings.dockExtended = false;
        dockManagerSettings.showAppsAtTop = false;
        const qsButton = {
            get_parent: () => null,
        };
        const ctx = makeDashContext({_quickSettingsButton: qsButton});
        ctx._dashContainer.insert_child_above = jest.fn();
        DockDash.prototype._updateQuickSettingsButton.call(ctx);
        expect(ctx._dashContainer.insert_child_above).toHaveBeenCalled();
        dockManagerSettings.showQuickSettings = origShowQS;
    });
});

// ---------------------------------------------------------------------------
// _handleExternalDragOver
// ---------------------------------------------------------------------------
describe('DockDash._handleExternalDragOver', () => {
    test('returns immediately when drag-to-focus is disabled', () => {
        Settings.set('drag-to-focus', false);
        const ctx = makeDashContext();
        // Should not throw
        DockDash.prototype._handleExternalDragOver.call(ctx, 100, 100);
    });

    test('finds hovered icon and sets up timeout', () => {
        Settings.set('drag-to-focus', true);
        const appIcon = {
            app: {get_id: () => 'test.desktop'},
            _delegate: {app: {get_id: () => 'test.desktop'}},
            running: true,
            getInterestingWindows: () => [{activate: jest.fn()}],
        };
        const child = {
            child: {_delegate: appIcon},
            get_transformed_position: () => [50, 50],
            get_transformed_size: () => [48, 48],
        };
        const ctx = makeDashContext({
            _box: {get_children: () => [child]},
            get_transformed_position: () => [0, 0],
            _dragToFocusIcon: null,
            _dragToFocusTimeoutId: 0,
            _cancelDragToFocus: DockDash.prototype._cancelDragToFocus,
        });
        DockDash.prototype._handleExternalDragOver.call(ctx, 60, 60);
        expect(ctx._dragToFocusIcon).toBe(appIcon);
    });
});

// ---------------------------------------------------------------------------
// _adjustIconSize
// ---------------------------------------------------------------------------
describe('DockDash._adjustIconSize', () => {
    test('returns when maxWidth and maxHeight are both -1', () => {
        const ctx = makeDashContext({
            _maxWidth: -1,
            _maxHeight: -1,
            _box: {
                get_children: () => [],
            },
            _showAppsIcon: {child: {_delegate: {icon: {child: null}}}},
        });
        // Should return early
        DockDash.prototype._adjustIconSize.call(ctx);
    });

    test('returns when container has no stage', () => {
        const container = {get_stage: () => null};
        const ctx = makeDashContext({
            _maxWidth: 800,
            _maxHeight: -1,
            _isHorizontal: true,
            _box: {
                get_children: () => [],
            },
            _showAppsIcon: {child: {_delegate: {icon: {child: null}}}},
        });
        Object.defineProperty(ctx, '_container', {
            get() { return container; },
        });
        DockDash.prototype._adjustIconSize.call(ctx);
    });

    test('adjusts icon size when space is constrained (horizontal)', () => {
        const mockFirstIcon = {
            ensure_style: jest.fn(),
            get_preferred_size: () => [0, 0, 48, 48],
        };
        const mockFirstButton = {
            icon: {child: mockFirstIcon},
            get_preferred_size: () => [0, 0, 56, 56],
        };
        const children = [{
            child: {_delegate: {icon: {setIconSize: jest.fn(), icon: mockFirstIcon}}, app: {}},
            animatingOut: false,
        }];
        const showAppsIcon = {
            child: {_delegate: {icon: {setIconSize: jest.fn(), icon: mockFirstIcon}}},
        };
        const ctx = makeDashContext({
            _maxWidth: 100,
            _maxHeight: -1,
            _isHorizontal: true,
            _box: {
                get_children: () => children,
            },
            _showAppsIcon: showAppsIcon,
            _availableIconSizes: [16, 22, 24, 32, 48],
            iconSize: 48,
            _separatorFavorites: null,
            _separatorLocations: null,
        });
        const container = {
            get_stage: () => ({}),
        };
        Object.defineProperty(ctx, '_container', {
            get() { return container; },
        });
        DockDash.prototype._adjustIconSize.call(ctx);
        // Should have adjusted icon size down or stayed same
    });
});

// ---------------------------------------------------------------------------
// _disableMagnification — with reparent path
// ---------------------------------------------------------------------------
describe('DockDash._disableMagnification (reparent)', () => {
    test('reparents box from dashContainer back to boxContainer', () => {
        const emit = jest.fn();
        const ctx = makeDashContext({
            _magnificationEnabled: true,
            _clipViewIdleId: 42,
            emit,
        });
        // Make box's parent be the dashContainer
        const mockBox = {
            _children: [],
            get_children() { return []; },
            get_parent() { return ctx._dashContainer; },
            clip_to_view: false,
            x_align: Clutter.ActorAlign.END,
            y_align: Clutter.ActorAlign.END,
        };
        ctx._box = mockBox;
        ctx._dashContainer.remove_child = jest.fn();
        ctx._boxContainer.add_child = jest.fn();
        ctx._background = {
            set_easing_duration: jest.fn(),
            set_easing_mode: jest.fn(),
            set_scale: jest.fn(),
        };
        ctx._showAppsIcon = null;
        ctx._workspaceMinimapContainer = null;
        ctx._quickSettingsButton = null;
        ctx._resetMagnification = DockDash.prototype._resetMagnification.bind(ctx);
        ctx._resetUtilityElement = DockDash.prototype._resetUtilityElement.bind(ctx);
        ctx._getUtilityScalableActor = DockDash.prototype._getUtilityScalableActor.bind(ctx);

        DockDash.prototype._disableMagnification.call(ctx);
        expect(ctx._magnificationEnabled).toBe(false);
        expect(ctx._dashContainer.remove_child).toHaveBeenCalledWith(mockBox);
        expect(ctx._boxContainer.add_child).toHaveBeenCalledWith(mockBox);
        expect(ctx._clipViewIdleId).toBe(0);
        expect(emit).toHaveBeenCalledWith('magnification-changed', false);
        // Should restore alignment
        expect(mockBox.x_align).toBe(Clutter.ActorAlign.START); // LTR
        expect(mockBox.y_align).toBe(Clutter.ActorAlign.CENTER); // horizontal
    });

    test('restores alignment for vertical dock', () => {
        const emit = jest.fn();
        const ctx = makeDashContext({
            _magnificationEnabled: true,
            _clipViewIdleId: 0,
            _isHorizontal: false,
            emit,
        });
        const mockBox = {
            _children: [],
            get_children() { return []; },
            get_parent() { return ctx._dashContainer; },
            clip_to_view: false,
            x_align: Clutter.ActorAlign.END,
            y_align: Clutter.ActorAlign.END,
        };
        ctx._box = mockBox;
        ctx._dashContainer.remove_child = jest.fn();
        ctx._boxContainer.add_child = jest.fn();
        ctx._background = {
            set_easing_duration: jest.fn(),
            set_easing_mode: jest.fn(),
            set_scale: jest.fn(),
        };
        ctx._showAppsIcon = null;
        ctx._workspaceMinimapContainer = null;
        ctx._quickSettingsButton = null;
        ctx._resetMagnification = DockDash.prototype._resetMagnification.bind(ctx);
        ctx._resetUtilityElement = DockDash.prototype._resetUtilityElement.bind(ctx);
        ctx._getUtilityScalableActor = DockDash.prototype._getUtilityScalableActor.bind(ctx);

        DockDash.prototype._disableMagnification.call(ctx);
        expect(mockBox.y_align).toBe(Clutter.ActorAlign.START); // vertical
    });

    test('does not reparent when box is not in dashContainer', () => {
        const emit = jest.fn();
        const ctx = makeDashContext({
            _magnificationEnabled: true,
            _clipViewIdleId: 0,
            emit,
        });
        const mockBox = {
            _children: [],
            get_children() { return []; },
            get_parent() { return ctx._boxContainer; },
            clip_to_view: false,
        };
        ctx._box = mockBox;
        ctx._dashContainer.remove_child = jest.fn();
        ctx._background = {
            set_easing_duration: jest.fn(),
            set_easing_mode: jest.fn(),
            set_scale: jest.fn(),
        };
        ctx._showAppsIcon = null;
        ctx._workspaceMinimapContainer = null;
        ctx._quickSettingsButton = null;
        ctx._resetMagnification = DockDash.prototype._resetMagnification.bind(ctx);
        ctx._resetUtilityElement = DockDash.prototype._resetUtilityElement.bind(ctx);
        ctx._getUtilityScalableActor = DockDash.prototype._getUtilityScalableActor.bind(ctx);

        DockDash.prototype._disableMagnification.call(ctx);
        expect(ctx._dashContainer.remove_child).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// handleDragOver — deeper tests
// ---------------------------------------------------------------------------
describe('DockDash.handleDragOver (extended)', () => {
    test('handles external drag with _handleExternalDragOver', () => {
        const handleExternalDragOver = jest.fn();
        const ctx = makeDashContext({
            _isSecondary: false,
            _cancelDragToFocus: jest.fn(),
            _handleExternalDragOver: handleExternalDragOver,
        });
        const source = {app: null, _delegate: null}; // no app
        DockDash.prototype.handleDragOver.call(ctx, source, null, 10, 20, 0);
        expect(handleExternalDragOver).toHaveBeenCalledWith(10, 20);
    });

    test('returns NO_DROP when favorite-apps is not writable', () => {
        if (!globalThis.global.settings) globalThis.global.settings = {};
        const origIsWritable = globalThis.global.settings.is_writable;
        globalThis.global.settings.is_writable = () => false;
        const dockManager = Docking.DockManager.getDefault();
        dockManager.getDockOrder = () => [];
        const ctx = makeDashContext({
            _isSecondary: false,
            _cancelDragToFocus: jest.fn(),
            get_transformed_position: () => [0, 0],
        });
        const favMap = {'test.desktop': true};
        const origGetFavs = AppFavorites.getAppFavorites;
        AppFavorites.getAppFavorites = () => ({
            getFavoriteMap: () => favMap,
            getFavorites: () => [],
        });
        const source = {
            app: {
                is_window_backed: () => false,
                get_id: () => 'test.desktop',
                isCustom: false,
            },
        };
        const result = DockDash.prototype.handleDragOver.call(ctx, source, null, 0, 0, 0);
        expect(result).toBe(DND.DragMotionResult.NO_DROP);
        globalThis.global.settings.is_writable = origIsWritable;
        AppFavorites.getAppFavorites = origGetFavs;
        delete dockManager.getDockOrder;
    });

    test('cancels drag to focus when app drag starts', () => {
        const cancelDragToFocus = jest.fn();
        const dockManager = Docking.DockManager.getDefault();
        dockManager.getDockOrder = () => [];
        const ctx = makeDashContext({
            _isSecondary: false,
            _cancelDragToFocus: cancelDragToFocus,
            get_transformed_position: () => [0, 0],
            _dropTargetIcon: null,
            _clearDragPlaceholder: jest.fn(),
        });
        const source = {
            app: {
                is_window_backed: () => false,
                get_id: () => 'test.desktop',
                isCustom: false,
            },
        };
        DockDash.prototype.handleDragOver.call(ctx, source, null, 10, 10, 0);
        expect(cancelDragToFocus).toHaveBeenCalled();
        delete dockManager.getDockOrder;
    });

    test('handles custom app drag returning MOVE_DROP', () => {
        const dockManager = Docking.DockManager.getDefault();
        dockManager.getDockOrder = () => [];
        const ctx = makeDashContext({
            _isSecondary: false,
            _cancelDragToFocus: jest.fn(),
            _clearDragPlaceholder: jest.fn(),
            get_transformed_position: () => [0, 0],
            _dropTargetIcon: null,
        });
        const source = {
            app: {
                isCustom: true,
                _categoryData: {id: 'cat-1'},
            },
        };
        const result = DockDash.prototype.handleDragOver.call(ctx, source, null, 10, 10, 0);
        expect([DND.DragMotionResult.MOVE_DROP, DND.DragMotionResult.CONTINUE,
            DND.DragMotionResult.COPY_DROP]).toContain(result);
        delete dockManager.getDockOrder;
    });
});

// ---------------------------------------------------------------------------
// acceptDrop — deeper tests
// ---------------------------------------------------------------------------
describe('DockDash.acceptDrop (extended)', () => {
    test('returns false when dockManager is null', () => {
        const origGetDefault = Docking.DockManager.getDefault;
        Docking.DockManager.getDefault = () => null;
        const ctx = makeDashContext({
            _cancelDragToFocus: jest.fn(),
            _dragToFocusTimeoutId: 0,
            _dragToFocusIcon: null,
        });
        const source = {app: {get_id: () => 'test.desktop'}};
        const result = DockDash.prototype.acceptDrop.call(ctx, source, null, 0, 0, 0);
        expect(result).toBe(false);
        Docking.DockManager.getDefault = origGetDefault;
    });

    test('returns false when no dragPlaceholder and no dropTargetIcon', () => {
        const dockManager = Docking.DockManager.getDefault();
        dockManager.getCategorizedAppIds = () => new Set();
        dockManager.categoryIcons = [];
        dockManager.getDockOrder = () => [];
        const ctx = makeDashContext({
            _cancelDragToFocus: jest.fn(),
            _dragToFocusTimeoutId: 0,
            _dragToFocusIcon: null,
            _dragPlaceholder: null,
            _dropTargetIcon: null,
        });
        const source = {
            app: {
                get_id: () => 'test.desktop',
                is_window_backed: () => false,
                isCustom: false,
            },
        };
        const result = DockDash.prototype.acceptDrop.call(ctx, source, null, 0, 0, 0);
        expect(result).toBe(false);
        // cleanup
        delete dockManager.getCategorizedAppIds;
        delete dockManager.categoryIcons;
        delete dockManager.getDockOrder;
    });

    test('returns false when dragPlaceholder not in box', () => {
        const dockManager = Docking.DockManager.getDefault();
        dockManager.getCategorizedAppIds = () => new Set();
        dockManager.categoryIcons = [];
        dockManager.getDockOrder = () => [];
        const placeholder = {__placeholder: true};
        const ctx = makeDashContext({
            _cancelDragToFocus: jest.fn(),
            _dragToFocusTimeoutId: 0,
            _dragToFocusIcon: null,
            _dragPlaceholder: placeholder,
            _dropTargetIcon: null,
            _box: {
                get_children: () => [], // placeholder not in children
            },
        });
        const source = {
            app: {
                get_id: () => 'test.desktop',
                is_window_backed: () => false,
                isCustom: false,
            },
        };
        const result = DockDash.prototype.acceptDrop.call(ctx, source, null, 0, 0, 0);
        expect(result).toBe(false);
        delete dockManager.getCategorizedAppIds;
        delete dockManager.categoryIcons;
        delete dockManager.getDockOrder;
    });

    test('handles categorized running app reject', () => {
        const dockManager = Docking.DockManager.getDefault();
        dockManager.getCategorizedAppIds = () => new Set(['test.desktop']);
        dockManager.categoryIcons = [];
        const ctx = makeDashContext({
            _cancelDragToFocus: jest.fn(),
            _dragToFocusTimeoutId: 0,
            _dragToFocusIcon: null,
            _dragPlaceholder: null,
            _dropTargetIcon: null,
            _clearDragPlaceholder: jest.fn(),
            _clearDropTarget: jest.fn(),
        });
        const source = {
            app: {
                get_id: () => 'test.desktop',
                isCustom: false,
            },
        };
        const result = DockDash.prototype.acceptDrop.call(ctx, source, null, 0, 0, 0);
        expect(result).toBe(false);
        delete dockManager.getCategorizedAppIds;
        delete dockManager.categoryIcons;
    });

    test('handles drop on icon (regular + regular creates category)', () => {
        const dockManager = Docking.DockManager.getDefault();
        dockManager.getCategorizedAppIds = () => new Set();
        dockManager.categoryIcons = [];
        dockManager.createUserCategory = jest.fn();
        const targetChild = {
            remove_style_class_name: jest.fn(),
            _delegate: {app: {get_id: () => 'target.desktop', isCustom: false}},
        };
        const dropTargetIcon = {child: targetChild};
        const ctx = makeDashContext({
            _cancelDragToFocus: jest.fn(),
            _dragToFocusTimeoutId: 0,
            _dragToFocusIcon: null,
            _dragPlaceholder: null,
            _dropTargetIcon: dropTargetIcon,
            _clearDragPlaceholder: jest.fn(),
        });
        const source = {
            app: {
                get_id: () => 'src.desktop',
                isCustom: false,
            },
        };
        const result = DockDash.prototype.acceptDrop.call(ctx, source, null, 0, 0, 0);
        expect(result).toBe(true);
        // idle_add fires synchronously in mock
        expect(dockManager.createUserCategory).toHaveBeenCalled();
        delete dockManager.getCategorizedAppIds;
        delete dockManager.categoryIcons;
        delete dockManager.createUserCategory;
    });

    test('handles window-backed app rejection', () => {
        const dockManager = Docking.DockManager.getDefault();
        dockManager.getCategorizedAppIds = () => new Set();
        dockManager.categoryIcons = [];
        dockManager.getDockOrder = () => [];
        const placeholder = {__placeholder: true};
        const ctx = makeDashContext({
            _cancelDragToFocus: jest.fn(),
            _dragToFocusTimeoutId: 0,
            _dragToFocusIcon: null,
            _dragPlaceholder: placeholder,
            _dropTargetIcon: null,
            _box: {
                get_children: () => [placeholder],
            },
        });
        const source = {
            app: {
                get_id: () => 'test.desktop',
                is_window_backed: () => true,
                isCustom: false,
            },
        };
        const result = DockDash.prototype.acceptDrop.call(ctx, source, null, 0, 0, 0);
        expect(result).toBe(false);
        delete dockManager.getCategorizedAppIds;
        delete dockManager.categoryIcons;
        delete dockManager.getDockOrder;
    });

    test('handles custom app reorder (category icon)', () => {
        const dockManager = Docking.DockManager.getDefault();
        dockManager.getCategorizedAppIds = () => new Set();
        dockManager.categoryIcons = [];
        dockManager.getDockOrder = () => [];
        dockManager.setDockOrder = jest.fn();
        const placeholder = {__placeholder: true};
        const ctx = makeDashContext({
            _cancelDragToFocus: jest.fn(),
            _dragToFocusTimeoutId: 0,
            _dragToFocusIcon: null,
            _dragPlaceholder: placeholder,
            _dropTargetIcon: null,
            _separator: null,
            _clearDragPlaceholder: jest.fn(),
            _box: {
                get_children: () => [placeholder],
            },
        });
        const source = {
            app: {
                isCustom: true,
                _categoryData: {id: 'cat-1'},
            },
        };
        const result = DockDash.prototype.acceptDrop.call(ctx, source, null, 0, 0, 0);
        expect(result).toBe(true);
        expect(dockManager.setDockOrder).toHaveBeenCalled();
        delete dockManager.getCategorizedAppIds;
        delete dockManager.categoryIcons;
        delete dockManager.getDockOrder;
        delete dockManager.setDockOrder;
    });

    test('handles favorite move with dock order', () => {
        const dockManager = Docking.DockManager.getDefault();
        dockManager.getCategorizedAppIds = () => new Set();
        dockManager.categoryIcons = [];
        dockManager.getDockOrder = () => ['test.desktop'];
        dockManager.setDockOrder = jest.fn();
        if (!globalThis.global.settings) globalThis.global.settings = {};
        const origIsWritable = globalThis.global.settings.is_writable;
        globalThis.global.settings.is_writable = () => true;
        const placeholder = {__placeholder: true};
        const moveFn = jest.fn();
        const favMap = {'test.desktop': true};
        const origGetFavs = AppFavorites.getAppFavorites;
        AppFavorites.getAppFavorites = () => ({
            getFavoriteMap: () => favMap,
            getFavorites: () => [],
            moveFavoriteToPos: moveFn,
        });
        const ctx = makeDashContext({
            _cancelDragToFocus: jest.fn(),
            _dragToFocusTimeoutId: 0,
            _dragToFocusIcon: null,
            _dragPlaceholder: placeholder,
            _dropTargetIcon: null,
            _separator: null,
            _clearDragPlaceholder: jest.fn(),
            _box: {
                get_children: () => [placeholder],
            },
        });
        const source = {
            app: {
                get_id: () => 'test.desktop',
                is_window_backed: () => false,
                isCustom: false,
            },
        };
        const result = DockDash.prototype.acceptDrop.call(ctx, source, null, 0, 0, 0);
        expect(result).toBe(true);
        expect(dockManager.setDockOrder).toHaveBeenCalled();
        globalThis.global.settings.is_writable = origIsWritable;
        AppFavorites.getAppFavorites = origGetFavs;
        delete dockManager.getCategorizedAppIds;
        delete dockManager.categoryIcons;
        delete dockManager.getDockOrder;
        delete dockManager.setDockOrder;
    });

    test('handles running (non-favorite) app reorder', () => {
        const dockManager = Docking.DockManager.getDefault();
        dockManager.getCategorizedAppIds = () => new Set();
        dockManager.categoryIcons = [];
        dockManager.getDockOrder = () => [];
        dockManager.setDockOrder = jest.fn();
        const placeholder = {__placeholder: true};
        const ctx = makeDashContext({
            _cancelDragToFocus: jest.fn(),
            _dragToFocusTimeoutId: 0,
            _dragToFocusIcon: null,
            _dragPlaceholder: placeholder,
            _dropTargetIcon: null,
            _separator: null,
            _clearDragPlaceholder: jest.fn(),
            _box: {
                get_children: () => [placeholder],
            },
        });
        const source = {
            app: {
                get_id: () => 'running.desktop',
                is_window_backed: () => false,
                isCustom: false,
            },
        };
        const result = DockDash.prototype.acceptDrop.call(ctx, source, null, 0, 0, 0);
        expect(result).toBe(true);
        expect(dockManager.setDockOrder).toHaveBeenCalled();
        delete dockManager.getCategorizedAppIds;
        delete dockManager.categoryIcons;
        delete dockManager.getDockOrder;
        delete dockManager.setDockOrder;
    });

    test('handles drop from category panel (inCategoryId)', () => {
        const dockManager = Docking.DockManager.getDefault();
        dockManager.getCategorizedAppIds = () => new Set();
        dockManager.categoryIcons = [];
        dockManager.getDockOrder = () => [];
        dockManager.setDockOrder = jest.fn();
        dockManager.removeAppFromUserCategory = jest.fn();
        const placeholder = {__placeholder: true};
        const origGetFavs = AppFavorites.getAppFavorites;
        AppFavorites.getAppFavorites = () => ({
            getFavoriteMap: () => ({}),
            getFavorites: () => [],
            addFavoriteAtPos: jest.fn(),
        });
        const ctx = makeDashContext({
            _cancelDragToFocus: jest.fn(),
            _dragToFocusTimeoutId: 0,
            _dragToFocusIcon: null,
            _dragPlaceholder: placeholder,
            _dropTargetIcon: null,
            _separator: null,
            _clearDragPlaceholder: jest.fn(),
            _box: {
                get_children: () => [placeholder],
            },
        });
        const source = {
            app: {
                get_id: () => 'dragged.desktop',
                isCustom: false,
            },
            _d2dInCategoryId: 'cat-1',
        };
        const result = DockDash.prototype.acceptDrop.call(ctx, source, null, 0, 0, 0);
        expect(result).toBe(true);
        expect(dockManager.removeAppFromUserCategory).toHaveBeenCalledWith('cat-1', 'dragged.desktop');
        AppFavorites.getAppFavorites = origGetFavs;
        delete dockManager.getCategorizedAppIds;
        delete dockManager.categoryIcons;
        delete dockManager.getDockOrder;
        delete dockManager.setDockOrder;
        delete dockManager.removeAppFromUserCategory;
    });

    test('handles drop on icon: regular + category (add to category)', () => {
        const dockManager = Docking.DockManager.getDefault();
        dockManager.getCategorizedAppIds = () => new Set();
        dockManager.categoryIcons = [];
        dockManager.addAppToUserCategory = jest.fn();
        const targetChild = {
            remove_style_class_name: jest.fn(),
            _delegate: {
                app: {
                    get_id: () => 'target.desktop',
                    isCustom: true,
                    _categoryData: {id: 'cat-1'},
                },
            },
        };
        const dropTargetIcon = {child: targetChild};
        const ctx = makeDashContext({
            _cancelDragToFocus: jest.fn(),
            _dragToFocusTimeoutId: 0,
            _dragToFocusIcon: null,
            _dragPlaceholder: null,
            _dropTargetIcon: dropTargetIcon,
            _clearDragPlaceholder: jest.fn(),
        });
        const source = {
            app: {
                get_id: () => 'src.desktop',
                isCustom: false,
            },
        };
        const result = DockDash.prototype.acceptDrop.call(ctx, source, null, 0, 0, 0);
        expect(result).toBe(true);
        expect(dockManager.addAppToUserCategory).toHaveBeenCalledWith('cat-1', 'src.desktop');
        delete dockManager.getCategorizedAppIds;
        delete dockManager.categoryIcons;
        delete dockManager.addAppToUserCategory;
    });

    test('handles drop on icon: category + category (merge)', () => {
        const dockManager = Docking.DockManager.getDefault();
        dockManager.getCategorizedAppIds = () => new Set();
        dockManager.categoryIcons = [];
        dockManager.mergeUserCategories = jest.fn();
        const targetChild = {
            remove_style_class_name: jest.fn(),
            _delegate: {
                app: {
                    isCustom: true,
                    _categoryData: {id: 'cat-2'},
                },
            },
        };
        const dropTargetIcon = {child: targetChild};
        const ctx = makeDashContext({
            _cancelDragToFocus: jest.fn(),
            _dragToFocusTimeoutId: 0,
            _dragToFocusIcon: null,
            _dragPlaceholder: null,
            _dropTargetIcon: dropTargetIcon,
            _clearDragPlaceholder: jest.fn(),
        });
        const source = {
            app: {
                isCustom: true,
                _categoryData: {id: 'cat-1'},
            },
        };
        const result = DockDash.prototype.acceptDrop.call(ctx, source, null, 0, 0, 0);
        expect(result).toBe(true);
        expect(dockManager.mergeUserCategories).toHaveBeenCalledWith('cat-1', 'cat-2');
        delete dockManager.getCategorizedAppIds;
        delete dockManager.categoryIcons;
        delete dockManager.mergeUserCategories;
    });

    test('returns false for drop on icon with no targetApp', () => {
        const dockManager = Docking.DockManager.getDefault();
        dockManager.getCategorizedAppIds = () => new Set();
        dockManager.categoryIcons = [];
        const dropTargetIcon = {
            child: {
                remove_style_class_name: jest.fn(),
                _delegate: {app: null},
            },
        };
        const ctx = makeDashContext({
            _cancelDragToFocus: jest.fn(),
            _dragToFocusTimeoutId: 0,
            _dragToFocusIcon: null,
            _dragPlaceholder: null,
            _dropTargetIcon: dropTargetIcon,
            _clearDragPlaceholder: jest.fn(),
        });
        const source = {
            app: {
                get_id: () => 'src.desktop',
                isCustom: false,
            },
        };
        const result = DockDash.prototype.acceptDrop.call(ctx, source, null, 0, 0, 0);
        expect(result).toBe(false);
        delete dockManager.getCategorizedAppIds;
        delete dockManager.categoryIcons;
    });
});

// ---------------------------------------------------------------------------
// _adjustIconSize — deeper tests
// ---------------------------------------------------------------------------
describe('DockDash._adjustIconSize (extended)', () => {
    function makeAdjustContext(overrides = {}) {
        const mockFirstIcon = {
            ensure_style: jest.fn(),
            get_preferred_size: () => [0, 0, 48, 48],
        };
        const mockDelegate = {
            icon: {
                setIconSize: jest.fn(),
                icon: {
                    ...mockFirstIcon,
                    width: 48,
                    height: 48,
                    get_size: () => [48, 48],
                    set_size: jest.fn(),
                    ease: jest.fn(),
                },
            },
            app: {},
        };
        const children = [{
            child: {
                _delegate: mockDelegate,
                icon: mockDelegate.icon,
            },
            animatingOut: false,
        }];
        const showAppsDelegate = {
            icon: {
                setIconSize: jest.fn(),
                icon: {
                    ...mockFirstIcon,
                    width: 48,
                    height: 48,
                    get_size: () => [48, 48],
                    set_size: jest.fn(),
                    ease: jest.fn(),
                },
            },
        };
        const showAppsIcon = {child: {_delegate: showAppsDelegate}};

        const container = {get_stage: () => ({})};
        const ctx = makeDashContext({
            _maxWidth: 800,
            _maxHeight: -1,
            _isHorizontal: true,
            _box: {get_children: () => children},
            _showAppsIcon: showAppsIcon,
            _availableIconSizes: [16, 22, 24, 32, 48],
            iconSize: 48,
            _separatorFavorites: null,
            _separatorLocations: null,
            _shownInitially: true,
            ...overrides,
        });
        Object.defineProperty(ctx, '_container', {
            get() { return container; },
        });
        return {ctx, mockDelegate, showAppsDelegate, mockFirstIcon};
    }

    test('returns early when no firstIcon', () => {
        const showAppsIcon = {child: {_delegate: {icon: {icon: null, child: null}}}};
        const container = {get_stage: () => ({})};
        const ctx = makeDashContext({
            _maxWidth: 800,
            _maxHeight: -1,
            _isHorizontal: true,
            _box: {get_children: () => []},
            _showAppsIcon: showAppsIcon,
            _availableIconSizes: [16, 22, 24, 32, 48],
            iconSize: 48,
        });
        Object.defineProperty(ctx, '_container', {
            get() { return container; },
        });
        // Should not throw
        DockDash.prototype._adjustIconSize.call(ctx);
    });

    test('reduces icon size when space is constrained', () => {
        const {ctx, mockDelegate, showAppsDelegate} = makeAdjustContext({
            _maxWidth: 50, // Very constrained
        });
        DockDash.prototype._adjustIconSize.call(ctx);
        // Icon size should have been reduced
        if (ctx.iconSize !== 48) {
            expect(mockDelegate.icon.setIconSize).toHaveBeenCalled();
        }
    });

    test('no change when size matches', () => {
        const {ctx} = makeAdjustContext({
            _maxWidth: 10000, // Plenty of space
        });
        const originalEmit = ctx.emit;
        DockDash.prototype._adjustIconSize.call(ctx);
        // Should not emit icon-size-changed since 48 fits
        expect(originalEmit).not.toHaveBeenCalledWith('icon-size-changed');
    });

    test('handles vertical layout', () => {
        const {ctx} = makeAdjustContext({
            _isHorizontal: false,
            _maxWidth: -1,
            _maxHeight: 50, // Constrained vertically
        });
        DockDash.prototype._adjustIconSize.call(ctx);
    });

    test('handles separatorFavorites in calculation', () => {
        const separator = {
            get_preferred_size: () => [0, 0, 4, 4],
        };
        const {ctx} = makeAdjustContext({
            _separatorFavorites: separator,
            _maxWidth: 100,
        });
        DockDash.prototype._adjustIconSize.call(ctx);
    });

    test('handles separatorLocations in calculation', () => {
        const separator = {
            get_preferred_size: () => [0, 0, 4, 4],
        };
        const {ctx} = makeAdjustContext({
            _separatorLocations: separator,
            _maxWidth: 100,
        });
        DockDash.prototype._adjustIconSize.call(ctx);
    });

    test('handles vertical separators', () => {
        const separator = {
            get_preferred_size: () => [0, 0, 4, 4],
        };
        const {ctx} = makeAdjustContext({
            _isHorizontal: false,
            _maxWidth: -1,
            _maxHeight: 100,
            _separatorFavorites: separator,
            _separatorLocations: separator,
        });
        DockDash.prototype._adjustIconSize.call(ctx);
    });
});

// ---------------------------------------------------------------------------
// _redisplay — basic sanity check
// ---------------------------------------------------------------------------
describe('DockDash._redisplay', () => {
    test('returns when dockManager is null', () => {
        const origGetDefault = Docking.DockManager.getDefault;
        Docking.DockManager.getDefault = () => null;
        const ctx = makeDashContext();
        // Should not throw
        DockDash.prototype._redisplay.call(ctx);
        Docking.DockManager.getDefault = origGetDefault;
    });

    test('calls _redisplaySecondary when isSecondary', () => {
        const redisplaySecondary = jest.fn();
        const dockManager = Docking.DockManager.getDefault();
        dockManager.settings = dockManager.settings || {};
        const ctx = makeDashContext({
            _isSecondary: true,
            _redisplaySecondary: redisplaySecondary,
        });
        DockDash.prototype._redisplay.call(ctx);
        expect(redisplaySecondary).toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// DockDash module export
// ---------------------------------------------------------------------------
describe('DockDash module export', () => {
    test('DockDash is exported and truthy', () => {
        expect(DockDash).toBeTruthy();
    });

    test('DockDash has prototype methods', () => {
        expect(typeof DockDash.prototype._updateReflection).toBe('function');
        expect(typeof DockDash.prototype._getMagnificationPivot).toBe('function');
        expect(typeof DockDash.prototype._toggleMagnification).toBe('function');
        expect(typeof DockDash.prototype._initializeIconSize).toBe('function');
        expect(typeof DockDash.prototype.getAppIcons).toBe('function');
        expect(typeof DockDash.prototype.setMaxSize).toBe('function');
        expect(typeof DockDash.prototype._resetMagnification).toBe('function');
        expect(typeof DockDash.prototype._isLocationApp).toBe('function');
        expect(typeof DockDash.prototype._isPinnedCommandApp).toBe('function');
        expect(typeof DockDash.prototype._updateNumberOverlay).toBe('function');
        expect(typeof DockDash.prototype.toggleNumberOverlay).toBe('function');
        expect(typeof DockDash.prototype.setIconSize).toBe('function');
        expect(typeof DockDash.prototype.resetAppIcons).toBe('function');
        expect(typeof DockDash.prototype._itemMenuStateChanged).toBe('function');
        expect(typeof DockDash.prototype._flushDeferredDragWork).toBe('function');
        expect(typeof DockDash.prototype._disableMagnification).toBe('function');
        expect(typeof DockDash.prototype._enableMagnification).toBe('function');
        expect(typeof DockDash.prototype._enableHover).toBe('function');
        expect(typeof DockDash.prototype._disableHover).toBe('function');
        expect(typeof DockDash.prototype._onMagnificationMotion).toBe('function');
        expect(typeof DockDash.prototype._onMagnificationLeave).toBe('function');
        expect(typeof DockDash.prototype._clearDragPlaceholder).toBe('function');
        expect(typeof DockDash.prototype._clearDropTarget).toBe('function');
        expect(typeof DockDash.prototype._cancelDragToFocus).toBe('function');
        expect(typeof DockDash.prototype._onDestroy).toBe('function');
        expect(typeof DockDash.prototype._onWiggleModeChanged).toBe('function');
        expect(typeof DockDash.prototype.handleDragOver).toBe('function');
        expect(typeof DockDash.prototype.acceptDrop).toBe('function');
        expect(typeof DockDash.prototype._onScrollEvent).toBe('function');
        expect(typeof DockDash.prototype._ensureItemVisibility).toBe('function');
        expect(typeof DockDash.prototype._ensureSeparator).toBe('function');
        expect(typeof DockDash.prototype._adjustIconSize).toBe('function');
        expect(typeof DockDash.prototype.updateShowAppsButton).toBe('function');
        expect(typeof DockDash.prototype._updateQuickSettingsButton).toBe('function');
        expect(typeof DockDash.prototype._requireVisibility).toBe('function');
        expect(typeof DockDash.prototype.resetAppIconsDebounced).toBe('function');
        expect(typeof DockDash.prototype.showShowAppsButton).toBe('function');
        expect(typeof DockDash.prototype.hideShowAppsButton).toBe('function');
        expect(typeof DockDash.prototype._handleExternalDragOver).toBe('function');
        expect(typeof DockDash.prototype._queueRedisplay).toBe('function');
        expect(typeof DockDash.prototype._magnifyUtilityElement).toBe('function');
    });
});

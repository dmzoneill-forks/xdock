// Unit tests for extractable logic in windowPreview.js.
//
// The window preview module is deeply tied to GNOME Shell UI classes
// (PopupMenu, GObject widgets, Clutter actors), so we test only the
// pure computation functions that were extracted for testability.

import {jest} from '@jest/globals';
import * as Settings from '../platform/settings.js';

// The full windowPreview module extends PopupMenu.PopupMenu and uses
// GObject.registerClass, which are hard to mock completely.  Extract
// the pure functions by importing the module source through a dynamic
// import after patching the mocks.  Since our Jest config already maps
// all GI/shell/imports paths to lightweight mocks, the module-level
// side-effects (GObject.registerClass, class extends PopupMenu.PopupMenu)
// need the mocks to provide minimal class stubs.

// Patch PopupMenu mock before importing windowPreview
import * as ShellUi from '../dependencies/shell/ui.js';

// Provide minimal class stubs so the module can load
ShellUi.PopupMenu.PopupMenu = class PopupMenu {
    constructor() {}
    addMenuItem() {}
    open() {}
    close() {}
    connect() { return 0; }
    emit() {}
};
ShellUi.PopupMenu.PopupMenuSection = class PopupMenuSection {
    constructor() {
        this.box = {set_vertical() {}, set_name() {}, x_expand: false, x_align: 0};
        this.actor = {};
    }

    addMenuItem() {}

    _getMenuItems() { return []; }

    _getTopMenu() { return {actor: {}, close() {}}; }
};
ShellUi.PopupMenu.PopupBaseMenuItem = class PopupBaseMenuItem {
    constructor() {
        this._ornamentIcon = {};
    }

    _init() {
        this._ornamentIcon = {};
    }

    remove_child() {}
    add_child() {}
    add_style_class_name() {}
    remove_style_class_name() {}
    connect() { return 0; }
    emit() {}
    set() {}
    get_theme_node() { return {adjust_preferred_width: (a, b) => [a, b], adjust_preferred_height: (a, b) => [a, b]}; }
};
ShellUi.BoxPointer.PopupAnimation = {FULL: 0, FADE: 1};
ShellUi.Workspace.WINDOW_OVERLAY_FADE_TIME = 200;

// Provide Utils stubs needed by module-level code
import {Utils} from '../imports.js';
Utils.getPosition = () => 2;
Utils.GlobalSignalsHandler = class {
    constructor() {}
    add() {}
    addWithLabel() {}
    removeWithLabel() {}
    destroy() {}
};
Utils.addActor = () => {};
Utils.laterAdd = () => 0;
Utils.laterRemove = () => {};

// Provide Meta.prefs_get_button_layout and Meta.ButtonFunction
import {Meta} from '../dependencies/gi.js';
Meta.prefs_get_button_layout = () => ({left_buttons: [], right_buttons: []});
Meta.ButtonFunction = {CLOSE: 0};

// Now import the module
const {computePreviewScale, computeLabelMaxWidth} = await import('../windowPreview.js');

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
        // Window: 400x800, maxHeight: 150, maxWidth: 300
        // scale = min(1.0, 300/400, 150/800)
        //       = min(1.0, 0.75, 0.1875) = 0.1875
        expect(computePreviewScale(400, 800, 0, 150)).toBeCloseTo(0.1875);
    });

    test('auto-computes scale from maxHeight for wide window', () => {
        // Window: 1920x1080, maxHeight: 150, maxWidth: 300
        // scale = min(1.0, 300/1920, 150/1080)
        //       = min(1.0, 0.15625, 0.13888...) = 0.13888...
        expect(computePreviewScale(1920, 1080, 0, 150)).toBeCloseTo(150 / 1080);
    });

    test('auto-computes scale for small window (capped at 1.0)', () => {
        // Window: 100x50, maxHeight: 150, maxWidth: 300
        // scale = min(1.0, 300/100, 150/50)
        //       = min(1.0, 3.0, 3.0) = 1.0
        expect(computePreviewScale(100, 50, 0, 150)).toBe(1.0);
    });

    test('maxHeight=0 results in scale 0 for auto mode', () => {
        // maxWidth=0, so 0/width=0, 0/height=0 => min(1.0,0,0)=0
        expect(computePreviewScale(800, 600, 0, 0)).toBe(0);
    });

    test('scale constrained by width when width is dominant', () => {
        // Window: 600x100, maxHeight: 150, maxWidth: 300
        // scale = min(1.0, 300/600, 150/100) = min(1.0, 0.5, 1.5) = 0.5
        expect(computePreviewScale(600, 100, 0, 150)).toBeCloseTo(0.5);
    });

    test('square window uses maxHeight as constraint', () => {
        // Window: 400x400, maxHeight: 150, maxWidth: 300
        // scale = min(1.0, 300/400, 150/400) = min(1.0, 0.75, 0.375) = 0.375
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

describe('preview scale with settings integration', () => {
    beforeEach(() => {
        Settings._reset();
    });

    test('default preview-max-height produces expected scale', () => {
        const maxHeight = Settings.get('preview-max-height'); // 150
        const scale = computePreviewScale(1920, 1080, 0, maxHeight);
        // min(1.0, 300/1920, 150/1080) = 150/1080
        expect(scale).toBeCloseTo(150 / 1080);
    });

    test('overridden preview-max-height changes scale', () => {
        Settings.set('preview-max-height', 300);
        const maxHeight = Settings.get('preview-max-height');
        const scale = computePreviewScale(1920, 1080, 0, maxHeight);
        // min(1.0, 600/1920, 300/1080) = 300/1080
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

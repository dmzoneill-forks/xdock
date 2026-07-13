import {jest} from '@jest/globals';
import * as Settings from '../platform/settings.js';

beforeEach(() => {
    Settings._reset();
});

// ---------------------------------------------------------------------------
// Spring animation parameter computation
// ---------------------------------------------------------------------------
// These tests verify the logic used in DockedDash._animateIn / _animateOut
// to compute spring parameters from settings with fallback defaults.
// ---------------------------------------------------------------------------

describe('Spring animation parameter computation', () => {
    /**
     * Mirrors the parameter logic from _animateIn.
     * Reads settings once, applies fallbacks.
     */
    function computeShowSpringParams() {
        const stiffness = Settings.get('spring-stiffness') ?? 200;
        const damping = Settings.get('spring-damping') ?? 18;
        const overshootClamp = Settings.get('spring-overshoot-clamp') ?? 1.15;
        return {stiffness, damping, overshootClamp, target: 1.0};
    }

    /**
     * Mirrors the parameter logic from _animateOut.
     * Hide uses increased damping (+10) for critical damping.
     */
    function computeHideSpringParams() {
        const stiffness = Settings.get('spring-stiffness') ?? 200;
        const baseDamping = Settings.get('spring-damping') ?? 18;
        const damping = baseDamping + 10;
        const overshootClamp = Settings.get('spring-overshoot-clamp') ?? 1.15;
        return {stiffness, damping, overshootClamp, target: 0.0};
    }

    test('uses default stiffness when setting is undefined', () => {
        const params = computeShowSpringParams();
        expect(params.stiffness).toBe(200);
    });

    test('uses mock default damping when setting is not overridden', () => {
        // Mock settings defaults to 20; the ?? 18 fallback only applies
        // when the setting is truly undefined (not in the mock store).
        const params = computeShowSpringParams();
        expect(params.damping).toBe(20);
    });

    test('uses default overshoot clamp when setting is undefined', () => {
        const params = computeShowSpringParams();
        expect(params.overshootClamp).toBe(1.15);
    });

    test('uses custom stiffness from settings', () => {
        Settings.set('spring-stiffness', 300);
        const params = computeShowSpringParams();
        expect(params.stiffness).toBe(300);
    });

    test('uses custom damping from settings', () => {
        Settings.set('spring-damping', 25);
        const params = computeShowSpringParams();
        expect(params.damping).toBe(25);
    });

    test('uses custom overshoot clamp from settings', () => {
        Settings.set('spring-overshoot-clamp', 1.3);
        const params = computeShowSpringParams();
        expect(params.overshootClamp).toBe(1.3);
    });

    test('show animation targets 1.0', () => {
        const params = computeShowSpringParams();
        expect(params.target).toBe(1.0);
    });

    test('hide animation targets 0.0', () => {
        const params = computeHideSpringParams();
        expect(params.target).toBe(0.0);
    });

    test('hide damping is 10 more than show damping (default)', () => {
        const show = computeShowSpringParams();
        const hide = computeHideSpringParams();
        expect(hide.damping).toBe(show.damping + 10);
    });

    test('hide damping is 10 more than show damping (custom)', () => {
        Settings.set('spring-damping', 30);
        const show = computeShowSpringParams();
        const hide = computeHideSpringParams();
        expect(show.damping).toBe(30);
        expect(hide.damping).toBe(40);
    });

    test('overshootClamp is identical for show and hide', () => {
        Settings.set('spring-overshoot-clamp', 1.5);
        const show = computeShowSpringParams();
        const hide = computeHideSpringParams();
        expect(show.overshootClamp).toBe(hide.overshootClamp);
    });

    describe('slideX clamping during animation', () => {
        /**
         * Mirrors the onUpdate callback clamping logic:
         *   Math.max(0, Math.min(value, overshootClamp))
         */
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

        test('zero overshoot clamp pins to 0', () => {
            expect(clampSlideX(0.5, 0)).toBe(0);
        });
    });
});

// ---------------------------------------------------------------------------
// Position / translation calculation
// ---------------------------------------------------------------------------
// Tests for the _resetPosition logic that computes dock dimensions and
// position from settings and monitor geometry.
// ---------------------------------------------------------------------------

describe('Position / translation calculation', () => {
    const Side = {LEFT: 0, RIGHT: 1, TOP: 2, BOTTOM: 3};

    /**
     * Mirrors the fraction computation from _resetPosition:
     *   let fraction = Settings.get('height-fraction');
     *   if (extendHeight) fraction = 1;
     *   else if (fraction < 0 || fraction > 1) fraction = 0.95;
     */
    function computeFraction() {
        const extendHeight = Settings.get('extend-height');
        let fraction = Settings.get('height-fraction');
        if (extendHeight)
            fraction = 1;
        else if (fraction < 0 || fraction > 1)
            fraction = 0.95;
        return fraction;
    }

    /**
     * Mirrors the horizontal dock position computation from _resetPosition.
     */
    function computeHorizontalPosition(position, monitor, workArea, fraction) {
        const width = Math.round(fraction * workArea.width);
        let posY = monitor.y;
        if (position === Side.BOTTOM)
            posY += monitor.height;
        const x = workArea.x + Math.round((1 - fraction) / 2 * workArea.width);
        const y = posY;
        return {x, y, width};
    }

    /**
     * Mirrors the vertical dock position computation from _resetPosition.
     */
    function computeVerticalPosition(position, monitor, workArea, fraction) {
        const height = Math.round(fraction * workArea.height);
        let posX = monitor.x;
        if (position === Side.RIGHT)
            posX += monitor.width;
        const x = posX;
        const y = workArea.y + Math.round((1 - fraction) / 2 * workArea.height);
        return {x, y, height};
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

    describe('horizontal dock (TOP / BOTTOM)', () => {
        const monitor = {x: 0, y: 0, width: 1920, height: 1080};
        const workArea = {x: 0, y: 0, width: 1920, height: 1080};

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

        test('dock is centered horizontally in workArea', () => {
            const pos = computeHorizontalPosition(Side.BOTTOM, monitor, workArea, 0.9);
            const expectedX = workArea.x + Math.round(0.1 / 2 * workArea.width);
            expect(pos.x).toBe(expectedX);
        });

        test('full fraction takes entire workArea width', () => {
            const pos = computeHorizontalPosition(Side.BOTTOM, monitor, workArea, 1.0);
            expect(pos.width).toBe(1920);
            expect(pos.x).toBe(0);
        });

        test('handles non-zero workArea origin', () => {
            const offsetWorkArea = {x: 100, y: 50, width: 1720, height: 980};
            const pos = computeHorizontalPosition(Side.BOTTOM, monitor, offsetWorkArea, 0.8);
            expect(pos.width).toBe(Math.round(0.8 * 1720));
            expect(pos.x).toBe(100 + Math.round(0.2 / 2 * 1720));
        });
    });

    describe('vertical dock (LEFT / RIGHT)', () => {
        const monitor = {x: 0, y: 0, width: 1920, height: 1080};
        const workArea = {x: 0, y: 0, width: 1920, height: 1080};

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

        test('dock is centered vertically in workArea', () => {
            const pos = computeVerticalPosition(Side.LEFT, monitor, workArea, 0.9);
            const expectedY = workArea.y + Math.round(0.1 / 2 * workArea.height);
            expect(pos.y).toBe(expectedY);
        });

        test('handles multi-monitor offset', () => {
            const monitor2 = {x: 1920, y: 0, width: 1920, height: 1080};
            const workArea2 = {x: 1920, y: 0, width: 1920, height: 1080};
            const pos = computeVerticalPosition(Side.RIGHT, monitor2, workArea2, 0.9);
            expect(pos.x).toBe(1920 + 1920);
        });
    });

    describe('translation computation for RIGHT / BOTTOM docks', () => {
        /**
         * Mirrors the translation logic from _initialize:
         *   RIGHT:  translation_x = -width
         *   BOTTOM: translation_y = -height
         */
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
// Tests for the _checkDockDwell / _dockDwellTimeout edge-detection logic.
// ---------------------------------------------------------------------------

describe('Autohide timeout logic', () => {
    const Side = {LEFT: 0, RIGHT: 1, TOP: 2, BOTTOM: 3};
    const DOCK_DWELL_EDGE_PX = 2;

    /**
     * Mirrors the shouldDwell logic from _checkDockDwell.
     * Determines whether the pointer is in the dwell zone for a given
     * dock position based on monitor geometry and work area.
     */
    function shouldDwell(x, y, position, monitor, workArea) {
        const edgePx = Settings.get('dock-edge-dwell-width') ?? DOCK_DWELL_EDGE_PX;
        if (position === Side.LEFT) {
            return (x <= monitor.x + edgePx) && (y > workArea.y) &&
                (y < workArea.y + workArea.height);
        } else if (position === Side.RIGHT) {
            return (x >= monitor.x + monitor.width - edgePx) &&
                (y > workArea.y) && (y < workArea.y + workArea.height);
        } else if (position === Side.TOP) {
            return (y <= monitor.y + edgePx) && (x > workArea.x) &&
                (x < workArea.x + workArea.width);
        } else if (position === Side.BOTTOM) {
            return (y >= monitor.y + monitor.height - edgePx) &&
                (x > workArea.x) && (x < workArea.x + workArea.width);
        }
        return false;
    }

    const monitor = {x: 0, y: 0, width: 1920, height: 1080};
    const workArea = {x: 0, y: 0, width: 1920, height: 1080};

    describe('LEFT dock', () => {
        test('pointer at left edge within work area triggers dwell', () => {
            expect(shouldDwell(0, 540, Side.LEFT, monitor, workArea)).toBe(true);
        });

        test('pointer at left edge at 1px triggers dwell', () => {
            expect(shouldDwell(1, 540, Side.LEFT, monitor, workArea)).toBe(true);
        });

        test('pointer at left edge at 2px triggers dwell', () => {
            expect(shouldDwell(2, 540, Side.LEFT, monitor, workArea)).toBe(true);
        });

        test('pointer past edge width does not trigger dwell', () => {
            expect(shouldDwell(3, 540, Side.LEFT, monitor, workArea)).toBe(false);
        });

        test('pointer at top boundary (y=0) of work area does not trigger dwell', () => {
            // y > workArea.y, so y=0 is excluded
            expect(shouldDwell(0, 0, Side.LEFT, monitor, workArea)).toBe(false);
        });

        test('pointer at bottom boundary of work area does not trigger dwell', () => {
            // y < workArea.y + workArea.height, so y=1080 is excluded
            expect(shouldDwell(0, 1080, Side.LEFT, monitor, workArea)).toBe(false);
        });

        test('pointer inside work area triggers dwell', () => {
            expect(shouldDwell(0, 1, Side.LEFT, monitor, workArea)).toBe(true);
        });
    });

    describe('RIGHT dock', () => {
        test('pointer at right edge triggers dwell', () => {
            expect(shouldDwell(1920, 540, Side.RIGHT, monitor, workArea)).toBe(true);
        });

        test('pointer at monitor.width - edgePx triggers dwell', () => {
            expect(shouldDwell(1918, 540, Side.RIGHT, monitor, workArea)).toBe(true);
        });

        test('pointer inside monitor does not trigger dwell', () => {
            expect(shouldDwell(1917, 540, Side.RIGHT, monitor, workArea)).toBe(false);
        });
    });

    describe('TOP dock', () => {
        test('pointer at top edge triggers dwell', () => {
            expect(shouldDwell(960, 0, Side.TOP, monitor, workArea)).toBe(true);
        });

        test('pointer at 2px from top triggers dwell', () => {
            expect(shouldDwell(960, 2, Side.TOP, monitor, workArea)).toBe(true);
        });

        test('pointer past edge does not trigger dwell', () => {
            expect(shouldDwell(960, 3, Side.TOP, monitor, workArea)).toBe(false);
        });

        test('pointer at left boundary (x=0) does not trigger dwell', () => {
            expect(shouldDwell(0, 0, Side.TOP, monitor, workArea)).toBe(false);
        });
    });

    describe('BOTTOM dock', () => {
        test('pointer at bottom edge triggers dwell', () => {
            expect(shouldDwell(960, 1080, Side.BOTTOM, monitor, workArea)).toBe(true);
        });

        test('pointer at monitor.height - edgePx triggers dwell', () => {
            expect(shouldDwell(960, 1078, Side.BOTTOM, monitor, workArea)).toBe(true);
        });

        test('pointer above edge does not trigger dwell', () => {
            expect(shouldDwell(960, 1077, Side.BOTTOM, monitor, workArea)).toBe(false);
        });
    });

    describe('custom edge width', () => {
        test('wider edge width increases dwell zone', () => {
            Settings.set('dock-edge-dwell-width', 10);
            // With edgePx=10, x <= 10 should trigger
            expect(shouldDwell(10, 540, Side.LEFT, monitor, workArea)).toBe(true);
            expect(shouldDwell(5, 540, Side.LEFT, monitor, workArea)).toBe(true);
            expect(shouldDwell(11, 540, Side.LEFT, monitor, workArea)).toBe(false);
        });

        test('zero edge width means only exact edge triggers', () => {
            Settings.set('dock-edge-dwell-width', 0);
            expect(shouldDwell(0, 540, Side.LEFT, monitor, workArea)).toBe(true);
            expect(shouldDwell(1, 540, Side.LEFT, monitor, workArea)).toBe(false);
        });
    });

    describe('multi-monitor offset', () => {
        const monitor2 = {x: 1920, y: 0, width: 1920, height: 1080};
        const workArea2 = {x: 1920, y: 0, width: 1920, height: 1080};

        test('LEFT dock on second monitor checks offset edge', () => {
            // monitor.x = 1920, edgePx = 2
            // x <= 1920 + 2 = 1922
            expect(shouldDwell(1921, 540, Side.LEFT, monitor2, workArea2)).toBe(true);
            expect(shouldDwell(1923, 540, Side.LEFT, monitor2, workArea2)).toBe(false);
        });

        test('RIGHT dock on second monitor checks far edge', () => {
            // x >= 1920 + 1920 - 2 = 3838
            expect(shouldDwell(3838, 540, Side.RIGHT, monitor2, workArea2)).toBe(true);
            expect(shouldDwell(3837, 540, Side.RIGHT, monitor2, workArea2)).toBe(false);
        });
    });

    describe('dwell timeout guard logic', () => {
        /**
         * Mirrors the _dockDwellTimeout guard logic.
         * Returns true if the dwell timeout should show the dock.
         */
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

        test('blocks when modal dialog is open (not in overview)', () => {
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

        test('allows when user time matches', () => {
            expect(shouldShowOnDwell({
                currentUserTime: 500,
                savedUserTime: 500,
            })).toBe(true);
        });
    });

    describe('visibility mode determination', () => {
        /**
         * Mirrors _updateVisibilityMode logic.
         */
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
});

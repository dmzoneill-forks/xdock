// Mock platform/settings.js for Jest unit tests.
// Provides a simple in-memory settings store with defaults.

const _defaults = {
    'dock-position': 2,
    'dock-style': 0,
    'icon-magnification': true,
    'icon-magnification-factor': 2.0,
    'magnification-spread': 3,
    'magnification-easing-duration': 100,
    'spring-stiffness': 200,
    'spring-damping': 20,
    'spring-overshoot-clamp': 1.15,
    'startup-animation-time': 500,
    'icon-animator-duration': 3000,
    'preview-max-height': 150,
    'preview-animation-duration': 250,
    'preview-hover-enter-timeout': 300,
    'preview-hover-leave-timeout': 300,
    'aero-peek-opacity': 3,
    'aero-peek-duration': 200,
    'intellihide-check-interval': 100,
    'scroll-cycle-debounce': 250,
    'scroll-workspace-deadtime': 250,
    'wiggle-long-press-timeout': 500,
    'window-cycle-memory-time': 3000,
    'dock-edge-dwell-width': 2,
    'dock-dwell-check-interval': 100,
    'shelf-corner-radius-top': 6,
    'shelf-corner-radius-bottom': 12,
    'shelf-angle': 0.2,
    'shelf-height': 0.45,
    'reflection-size': 20,
    'progress-arc-width': 3,
    'hotkey-label-scale': 0.3,
    'tooltip-max-width-px': 700,
    'pressure-show-timeout': 250,
    'height-fraction': 0.9,
    'dash-max-icon-size': 48,
    'autohide': true,
    'intellihide': true,
    'dock-fixed': false,
    'extend-height': false,
    'show-favorites': true,
    'show-running': true,
    'background-opacity': 0.8,
    'apply-custom-theme': true,
    'custom-theme-shrink': false,
    'force-straight-corner': false,
    'custom-border-radius': -1,
};

let _store = {};
const _listeners = new Map();
let _nextId = 1;

function _camelCase(key) {
    return key.replace(/-([a-z\d])/g, (_, c) => c.toUpperCase());
}

export function get(key) {
    if (key in _store)
        return _store[key];
    if (key in _defaults)
        return _defaults[key];
    const camel = _camelCase(key);
    if (camel in _store)
        return _store[camel];
    return undefined;
}

export function set(key, value) {
    _store[key] = value;
    // Fire listeners
    for (const [id, {k, cb}] of _listeners) {
        if (k === key)
            cb();
    }
}

export function connect(key, callback) {
    const id = _nextId++;
    _listeners.set(id, {k: key, cb: callback});
    return id;
}

export function disconnect(id) {
    _listeners.delete(id);
}

export function getGSettings() {
    return null;
}

export function init(_settingsObj) {
    // In tests, we use the in-memory store
}

export function destroy() {
    _store = {};
    _listeners.clear();
}

/**
 * Reset to defaults (call in beforeEach).
 */
export function _reset() {
    _store = {};
    _listeners.clear();
    _nextId = 1;
}

/**
 * Set multiple values at once (convenience for tests).
 */
export function _setMany(obj) {
    for (const [k, v] of Object.entries(obj))
        _store[k] = v;
}

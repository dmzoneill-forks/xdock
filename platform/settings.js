// Platform abstraction for GSettings access.
// Production: wraps Gio.Settings
// Tests: mock this module to control all settings without GI.

import Gio from 'gi://Gio';

let _instance = null;

/**
 * Get a setting value by key (auto-detects type).
 *
 * @param {string} key - GSettings key name
 * @returns {*} The setting value
 */
export function get(key) {
    return _instance?.[_camelCase(key)];
}

/**
 * Set a setting value by key.
 *
 * @param {string} key
 * @param {*} value
 */
export function set(key, value) {
    const s = getGSettings();
    const schemaKey = s.settings_schema.get_key(key);
    const type = schemaKey.get_value_type().dup_string();
    switch (type) {
    case 'b':
        s.set_boolean(key, value);
        break;
    case 'i':
        s.set_int(key, value);
        break;
    case 'd':
        s.set_double(key, value);
        break;
    case 's':
        s.set_string(key, value);
        break;
    default:
        s.set_value(key, value);
    }
}

/**
 * Connect to a setting change signal.
 *
 * @param {string} key
 * @param {Function} callback
 * @returns {number} signal handler id
 */
export function connect(key, callback) {
    return getGSettings().connect(`changed::${key}`, callback);
}

/**
 * Disconnect a signal handler.
 *
 * @param {number} id
 */
export function disconnect(id) {
    getGSettings().disconnect(id);
}

/**
 * Get the raw Gio.Settings object (for advanced use).
 *
 * @returns {Gio.Settings}
 */
export function getGSettings() {
    return _instance?._gioSettings ?? null;
}

/**
 * Initialize with the mapped settings object from DockManager.
 * Called once during extension enable.
 *
 * @param {object} settingsObj - The DockManager.settings wrapper
 */
export function init(settingsObj) {
    _instance = settingsObj;
}

/**
 * Clean up on extension disable.
 */
export function destroy() {
    _instance = null;
}

function _camelCase(key) {
    return key.replace(/-([a-z\d])/g, (_, c) => c.toUpperCase());
}

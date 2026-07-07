// Mock for ./dependencies/gi.js
// Provides minimal stubs of GI modules for Jest unit testing.

class _GObjectBase {}

export const GObject = {
    Object: _GObjectBase,
    registerClass: (a, b) => b ?? a,
    NotImplementedError: class extends Error {},
    signal_lookup: () => 0,
    ParamSpec: {
        boolean: () => ({}),
        int: () => ({}),
        uint: () => ({}),
        object: () => ({}),
    },
    ParamFlags: {READWRITE: 2, CONSTRUCT_ONLY: 4},
    BindingFlags: {SYNC_CREATE: 1},
    TypeFlags: {ABSTRACT: 1},
    TYPE_DOUBLE: 'gdouble',
};

export const Clutter = {
    TextDirection: {RTL: 1, LTR: 0},
    get_default_text_direction: () => Clutter.TextDirection.LTR,
    EVENT_PROPAGATE: 0,
    EVENT_STOP: 1,
    AnimationMode: {EASE_OUT_QUAD: 0, EASE_IN_QUAD: 1},
    ActorAlign: {CENTER: 0, START: 1, END: 2, FILL: 3},
    Orientation: {HORIZONTAL: 0, VERTICAL: 1},
    OffscreenRedirect: {ALWAYS: 1},
    BinLayout: class {},
};

export const St = {
    Side: {LEFT: 3, RIGHT: 1, TOP: 0, BOTTOM: 2},
    PolicyType: {NEVER: 0, EXTERNAL: 3},
    ThemeContext: {get_for_stage: () => ({scaleFactor: 1})},
    Widget: class {},
    BoxLayout: class {},
    Bin: class {},
    Button: class {},
    Label: class {},
    Icon: class {},
    ScrollView: class {},
};

export const Shell = {
    AppState: {STOPPED: 0, STARTING: 1, RUNNING: 2},
    WindowTracker: {get_default: () => ({})},
};

export const GLib = {
    idle_add: () => 0,
    timeout_add: () => 0,
    timeout_add_seconds: () => 0,
    source_remove: () => {},
    PRIORITY_DEFAULT: 0,
    PRIORITY_LOW: 300,
    PRIORITY_HIGH: -100,
    PRIORITY_DEFAULT_IDLE: 200,
    SOURCE_REMOVE: false,
    SOURCE_CONTINUE: true,
    MAXINT32: 2147483647,
    MAXUINT32: 4294967295,
    Source: {set_name_by_id: () => {}},
};

export const Gio = {
    Settings: class {
        constructor() { this._values = {}; }
        get_boolean() { return false; }
        get_int() { return 0; }
        get_string() { return ''; }
        bind() {}
    },
    Cancellable: class {
        connect() {}
        cancel() {}
        is_cancelled() { return false; }
    },
    DBus: {get: () => {}},
    BusType: {SESSION: 0},
};

export const Meta = {
    LaterType: {BEFORE_REDRAW: 0},
};

export const Pango = {
    EllipsizeMode: {END: 3},
};

export const Mtk = {};
export const Cogl = {Color: {from_string: () => [false, null]}};
export const Atk = {};
export const GdkPixbuf = {};

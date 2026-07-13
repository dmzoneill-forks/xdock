// Mock for ./dependencies/gi.js
// Provides minimal stubs of GI modules for Jest unit testing.

// GJS globals needed by utils.js
globalThis.logError = globalThis.logError ?? ((...args) => console.error(...args));
globalThis.log = globalThis.log ?? ((...args) => console.log(...args));

// GJS `imports` global — provide a minimal Signals stub for modules like intellihide.js
globalThis.imports = globalThis.imports ?? {
    signals: {
        addSignalMethods(proto) {
            proto.connect = function (name, cb) {
                this._signals = this._signals ?? {};
                this._signals[name] = this._signals[name] ?? [];
                const id = Math.random();
                this._signals[name].push({id, cb});
                return id;
            };
            proto.disconnect = function (id) {
                if (!this._signals) return;
                for (const name of Object.keys(this._signals))
                    this._signals[name] = this._signals[name].filter(s => s.id !== id);
            };
            proto.emit = function (name, ...args) {
                if (!this._signals?.[name]) return;
                for (const s of this._signals[name])
                    s.cb(...args);
            };
        },
    },
};

const _hookUpVfuncSym = Symbol('__GObject__hook_up_vfunc');
const _gobjectProtoSym = Symbol('__GObject__prototype');

class _GObjectBase {
    constructor() {
        // mimic GObject _init pattern
    }
}
_GObjectBase.prototype[_hookUpVfuncSym] = function (name, func) {
    this[`vfunc_${name}`] = func;
};
_GObjectBase.$gtype = 'GObject';

export const GObject = {
    Object: _GObjectBase,
    registerClass: (a, b) => {
        const klass = b ?? a;
        klass.prototype[_gobjectProtoSym] = klass.prototype;
        klass.$gtype = klass.name || 'GObject';
        // Wrap class so `new Klass(args)` calls `_init(args)` like GJS does
        const wrapped = class extends klass {
            constructor(...args) {
                super();
                if (this._init)
                    this._init(...args);
            }
        };
        Object.defineProperty(wrapped, 'name', {value: klass.name});
        wrapped.$gtype = klass.$gtype;
        wrapped.prototype[_gobjectProtoSym] = wrapped.prototype;
        return wrapped;
    },
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
    idle_add: (_priority, cb) => { if (cb) cb(); return 1; },
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
        constructor(params) {
            this._cancelled = false;
            this._handlers = new Map();
            this._nextId = 1;
            this.parent = params?.parent ?? null;
        }

        _init(params) {
            if (!this._handlers) {
                this._handlers = new Map();
                this._nextId = 1;
                this._cancelled = false;
            }
            if (params?.parent)
                this.parent = params.parent;
        }

        connect(cb) {
            const id = this._nextId++;
            this._handlers.set(id, cb);
            return id;
        }

        disconnect(id) {
            this._handlers.delete(id);
        }

        cancel() {
            this._cancelled = true;
            for (const cb of this._handlers.values())
                cb();
        }

        is_cancelled() {
            return this._cancelled;
        }
    },
    DBus: {get: () => {}},
    BusType: {SESSION: 0},
};
Gio.Cancellable.$gtype = 'GCancellable';

export const Meta = {
    LaterType: {BEFORE_REDRAW: 0},
    WindowType: {
        NORMAL: 0,
        DESKTOP: 1,
        DOCK: 2,
        DIALOG: 3,
        MODAL_DIALOG: 4,
        TOOLBAR: 5,
        MENU: 6,
        UTILITY: 7,
        SPLASHSCREEN: 8,
        DROPDOWN_MENU: 9,
        POPUP_MENU: 10,
        TOOLTIP: 11,
        NOTIFICATION: 12,
        COMBO: 13,
        DND: 14,
        OVERRIDE_OTHER: 15,
    },
};

export const Pango = {
    EllipsizeMode: {END: 3},
};

export const Mtk = {};
export const Cogl = {Color: {from_string: () => [false, null]}};
export const Atk = {};
export const GdkPixbuf = {};

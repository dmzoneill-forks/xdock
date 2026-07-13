// GJS globals not available in Node.js — must be set before any module imports
// In Jest ESM, globalThis modifications in setup files propagate to test modules
// but NOT to the source modules being tested (they're in separate VM contexts).
// We set these here for the test files; the __mocks__/gi.js sets them for source modules.
globalThis.logError = (...args) => console.error(...args);
globalThis.log = (...args) => console.log(...args);
globalThis.print = (...args) => console.log(...args);

// GJS `imports` global — provide a minimal stub for modules that use it
// (e.g. intellihide.js uses `const {signals: Signals} = imports;`).
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

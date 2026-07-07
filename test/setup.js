// GJS globals not available in Node.js — must be set before any module imports
// In Jest ESM, globalThis modifications in setup files propagate to test modules
// but NOT to the source modules being tested (they're in separate VM contexts).
// We set these here for the test files; the __mocks__/gi.js sets them for source modules.
globalThis.logError = (...args) => console.error(...args);
globalThis.log = (...args) => console.log(...args);
globalThis.print = (...args) => console.log(...args);

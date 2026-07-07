// Mock for ./dependencies/shell/extensions/extension.js
export const Extension = {
    Extension: class {
        getSettings() { return {}; }
    },
    gettext: (s) => s,
    ngettext: (s) => s,
};

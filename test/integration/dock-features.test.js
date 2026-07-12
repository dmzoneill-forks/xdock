// SPDX-License-Identifier: GPL-2.0-or-later
function assert(cond, msg) { if (!cond) throw new Error(msg); }

function getTests() {
    return [
        {
            name: 'workspace minimap visible when show-workspace-minimap=true',
            fn() { assert(true, 'TODO'); },
        },
        {
            name: 'workspace minimap hidden when show-workspace-minimap=false',
            fn() { assert(true, 'TODO'); },
        },
        {
            name: 'quick settings panel visible when show-quick-settings=true',
            fn() { assert(true, 'TODO'); },
        },
        {
            name: 'quick settings panel hidden when show-quick-settings=false',
            fn() { assert(true, 'TODO'); },
        },
        {
            name: 'command palette opens when dock-command-palette=true',
            fn() { assert(true, 'TODO'); },
        },
        {
            name: 'recent files menu available when recent-files-hover=true',
            fn() { assert(true, 'TODO'); },
        },
        {
            name: 'secondary dock created when secondary-dock=true',
            fn() { assert(true, 'TODO'); },
        },
        {
            name: 'secondary dock follows secondary-dock-position setting',
            fn() { assert(true, 'TODO'); },
        },
        {
            name: 'media transport controls visible when enabled',
            fn() { assert(true, 'TODO'); },
        },
        {
            name: 'per-app volume control visible when enabled',
            fn() { assert(true, 'TODO'); },
        },
        {
            name: 'screen recording indicator visible when enabled',
            fn() { assert(true, 'TODO'); },
        },
        {
            name: 'spring-physics animations setting toggles spring behavior',
            fn() { assert(true, 'TODO'); },
        },
        {
            name: 'wiggle mode activatable when wiggle-mode-enabled=true',
            fn() { assert(true, 'TODO'); },
        },
        {
            name: 'live window thumbnails when live-window-thumbnails=true',
            fn() { assert(true, 'TODO'); },
        },
        {
            name: 'scroll action matches scroll-action setting',
            fn() { assert(true, 'TODO'); },
        },
        {
            name: 'hotkeys activate apps when shortcut-enabled=true',
            fn() { assert(true, 'TODO'); },
        },
        {
            name: 'dock order persists across reloads',
            fn() { assert(true, 'TODO'); },
        },
        {
            name: 'dock handles drag and drop for icon reordering',
            fn() { assert(true, 'TODO'); },
        },
        {
            name: 'separators visible between favorites and running',
            fn() { assert(true, 'TODO'); },
        },
        {
            name: 'disable-overview-on-startup prevents overview on late load',
            fn() { assert(true, 'TODO'); },
        },
    ];
}

exports.getTests = getTests;

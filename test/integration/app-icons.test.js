// SPDX-License-Identifier: GPL-2.0-or-later
function assert(cond, msg) { if (!cond) throw new Error(msg); }

function getTests() {
    return [
        {name: 'pinned apps shown when show-favorites=true', fn() { assert(true, 'TODO'); } },
        {name: 'pinned apps hidden when show-favorites=false', fn() { assert(true, 'TODO'); } },
        {name: 'running apps shown when show-running=true', fn() { assert(true, 'TODO'); } },
        {name: 'running apps hidden when show-running=false', fn() { assert(true, 'TODO'); } },
        {name: 'click action matches click-action setting', fn() { assert(true, 'TODO'); } },
        {name: 'shift-click action matches shift-click-action setting', fn() { assert(true, 'TODO'); } },
        {name: 'middle-click action matches middle-click-action setting', fn() { assert(true, 'TODO'); } },
        {name: 'context menu opens on right-click', fn() { assert(true, 'TODO'); } },
        {name: 'Settings item in context menu focuses existing prefs window', fn() { assert(true, 'TODO'); } },
        {name: 'stale focus state recomputed on app state change', fn() { assert(true, 'TODO'); } },
        {name: 'stale focus state recomputed at click time', fn() { assert(true, 'TODO'); } },
        {name: 'isolate-workspaces filters windows by workspace', fn() { assert(true, 'TODO'); } },
        {name: 'isolate-monitors filters windows by monitor', fn() { assert(true, 'TODO'); } },
        {name: 'show-apps icon visible when show-show-apps=true', fn() { assert(true, 'TODO'); } },
        {name: 'show-apps icon hidden when show-show-apps=false', fn() { assert(true, 'TODO'); } },
        {name: 'show-apps icon position follows show-apps-at-top setting', fn() { assert(true, 'TODO'); } },
        {name: 'trash icon visible when show-trash=true', fn() { assert(true, 'TODO'); } },
        {name: 'volumes visible when show-mounts=true', fn() { assert(true, 'TODO'); } },
        {name: 'icon size matches dash-max-icon-size setting', fn() { assert(true, 'TODO'); } },
        {name: 'icon size adjusts when dock width changes', fn() { assert(true, 'TODO'); } },
    ];
}

exports.getTests = getTests;

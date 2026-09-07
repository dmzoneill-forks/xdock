export * as AppDisplay from 'resource:///org/gnome/shell/ui/appDisplay.js';
export * as AppMenu from 'resource:///org/gnome/shell/ui/appMenu.js';
export * as AppFavorites from 'resource:///org/gnome/shell/ui/appFavorites.js';
export * as BoxPointer from 'resource:///org/gnome/shell/ui/boxpointer.js';
export * as DND from 'resource:///org/gnome/shell/ui/dnd.js';
export * as Dash from 'resource:///org/gnome/shell/ui/dash.js';
export * as Layout from 'resource:///org/gnome/shell/ui/layout.js';
export * as Main from 'resource:///org/gnome/shell/ui/main.js';
export * as Overview from 'resource:///org/gnome/shell/ui/overview.js';
export * as OverviewControls from 'resource:///org/gnome/shell/ui/overviewControls.js';
import {GLib} from '../gi.js';

let PointerWatcherModule;
try {
    PointerWatcherModule = await import('resource:///org/gnome/shell/ui/pointerWatcher.js');
} catch {
    PointerWatcherModule = {
        getPointerWatcher() {
            return {
                addWatch(interval, callback) {
                    const id = GLib.timeout_add(GLib.PRIORITY_DEFAULT, interval, () => {
                        const [x, y] = global.get_pointer();
                        callback(x, y);
                        return GLib.SOURCE_CONTINUE;
                    });
                    return {id};
                },
                _removeWatch(watch) {
                    if (watch?.id) {
                        GLib.source_remove(watch.id);
                        watch.id = 0;
                    }
                },
            };
        },
    };
}
export {PointerWatcherModule as PointerWatcher};
export * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
export * as SearchController from 'resource:///org/gnome/shell/ui/searchController.js';
export * as ShellMountOperation from 'resource:///org/gnome/shell/ui/shellMountOperation.js';
export * as SwitcherPopup from 'resource:///org/gnome/shell/ui/switcherPopup.js';
export * as Workspace from 'resource:///org/gnome/shell/ui/workspace.js';
export * as WorkspaceSwitcherPopup from 'resource:///org/gnome/shell/ui/workspaceSwitcherPopup.js';
export * as WorkspaceThumbnail from 'resource:///org/gnome/shell/ui/workspaceThumbnail.js';
export * as WorkspacesView from 'resource:///org/gnome/shell/ui/workspacesView.js';

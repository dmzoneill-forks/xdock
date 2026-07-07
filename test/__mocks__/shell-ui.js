// Mock for ./dependencies/shell/ui.js
export const Main = {
    layoutManager: {
        _startingUp: false,
        monitors: [{x: 0, y: 0, width: 1920, height: 1080}],
        primaryIndex: 0,
        primaryMonitor: {x: 0, y: 0, width: 1920, height: 1080},
        addChrome: () => {},
        removeChrome: () => {},
        emit: () => {},
    },
    overview: {
        visible: false,
        isDummy: false,
        dash: {},
        hide: () => {},
        toggle: () => {},
    },
    panel: {},
    uiGroup: {add_child: () => {}},
    sessionMode: {hasOverview: true},
    wm: {},
    initializeDeferredWork: () => 0,
};
export const Dash = {
    Dash: class {},
    DashItemContainer: class {},
    DashIcon: class {},
    DASH_ANIMATION_TIME: 200,
    DASH_ITEM_LABEL_SHOW_TIME: 150,
};
export const DND = {DragMotionResult: {NO_DROP: 0, COPY_DROP: 1, MOVE_DROP: 2}};
export const PopupMenu = {};
export const AppFavorites = {
    getAppFavorites: () => ({getFavoriteMap: () => ({}), getFavorites: () => []}),
};
export const BoxPointer = {};
export const Layout = {};
export const Overview = {ANIMATION_TIME: 250};
export const OverviewControls = {};
export const AppDisplay = {discreteGpuAvailable: false};
export const AppMenu = {};
export const PointerWatcher = {};
export const SwitcherPopup = {};
export const Workspace = {};
export const WorkspacesView = {};
export const WorkspaceSwitcherPopup = {};
export const SearchController = {};
export const ShellMountOperation = {};
export const WorkspaceThumbnail = {};

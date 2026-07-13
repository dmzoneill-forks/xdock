// Mock for ./dependencies/shell/misc.js
export const Config = {};
export const Util = {spawnApp: () => {}};
export const AnimationUtils = {
    adjustAnimationTime: (msecs) => msecs,
};
export const ParentalControlsManager = {
    getDefault: () => ({shouldShowApp: () => true}),
};

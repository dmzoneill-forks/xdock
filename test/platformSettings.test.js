import {describe, expect, test, afterEach} from '@jest/globals';
import * as Settings from '../platform/settings.js';

describe('platform settings', () => {
    afterEach(() => Settings.destroy());

    test('returns direct Gio.Settings instance from DockManager', () => {
        const gioSettings = {connect: () => 1};
        Settings.init(gioSettings);

        expect(Settings.getGSettings()).toBe(gioSettings);
    });

    test('supports settings wrappers exposing _gioSettings', () => {
        const gioSettings = {connect: () => 1};
        Settings.init({_gioSettings: gioSettings});

        expect(Settings.getGSettings()).toBe(gioSettings);
    });
});

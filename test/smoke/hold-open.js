// Just load the extension and hold the devkit window open.
// For taking screenshots — no tests, no setting mutations.
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

export function run(_argv) {
    print('[XDOCK] Extension loaded, holding window open...');
    print('[XDOCK] Take your screenshot now. Window closes in 120 seconds.');

    // Make dock visible and fixed
    try {
        const ext = Main.extensionManager.lookup('xdock@github.com');
        const schemaDir = ext.dir.get_child('schemas');
        const src = Gio.SettingsSchemaSource.new_from_directory(
            schemaDir.get_path(),
            Gio.SettingsSchemaSource.get_default(), false);
        const s = new Gio.Settings({
            settings_schema: src.lookup('org.gnome.shell.extensions.xdock', true),
        });
        s.set_boolean('dock-fixed', true);
        s.set_boolean('autohide', false);
        s.set_boolean('intellihide', false);
        s.set_enum('dock-style', 1); // SHELF
        s.set_boolean('icon-magnification', true);
        s.set_double('icon-magnification-factor', 2.0);
        s.set_double('shelf-angle', 0.2);
        s.set_double('shelf-height', 0.45);
        s.set_boolean('apply-custom-theme', true);
        s.set_boolean('extend-height', false);
        s.set_double('height-fraction', 0.9);

        // Set a wallpaper inside the devkit session
        const bgSettings = new Gio.Settings({schema_id: 'org.gnome.desktop.background'});
        bgSettings.set_string('picture-uri', 'file:///usr/share/backgrounds/gnome/vnc-l.png');
        bgSettings.set_string('picture-uri-dark', 'file:///usr/share/backgrounds/gnome/vnc-l.png');
    } catch (e) {
        print(`[XDOCK] Warning: ${e.message}`);
    }

    // Hold indefinitely — close the devkit window when ready
    const loop = new GLib.MainLoop(null, false);
    loop.run();
}

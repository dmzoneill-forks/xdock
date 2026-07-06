export {default as Atk} from 'gi://Atk';
export {default as Clutter} from 'gi://Clutter';
export {default as Cogl} from 'gi://Cogl';
export {default as GLib} from 'gi://GLib';
export {default as GObject} from 'gi://GObject';
export {default as GdkPixbuf} from 'gi://GdkPixbuf';
export {default as Gio} from 'gi://Gio';
export {default as Meta} from 'gi://Meta';
export {default as Mtk} from 'gi://Mtk';
export {default as Pango} from 'gi://Pango';
export {default as Shell} from 'gi://Shell';
export {default as St} from 'gi://St';

// GioUnix was split out of Gio in newer GLib versions.  On older systems
// (e.g. Fedora 39 / GNOME 45) the namespace does not exist yet.
let _GioUnix;
try {
    _GioUnix = (await import('gi://GioUnix')).default;
} catch {
    _GioUnix = null;
}
export const GioUnix = _GioUnix;


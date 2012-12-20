/*global log, global */ // <-- for jshint
/** Credit:
 *  based off prefs.js from the gnome shell extensions repository at
 *  git.gnome.org/browse/gnome-shell-extensions
 */

const GLib = imports.gi.GLib;
const GObject = imports.gi.GObject;
const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const Lang = imports.lang;

const ExtensionUtils = imports.misc.extensionUtils;
const Params = imports.misc.params;

const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;
let extensionPath = Me.path;

// Settings
const SHOP_THEME = 'theme';
const SHOP_BACKEND = 'backend';
const SHOP_KEYWORD = 'keyword';
const SHOP_DELAY_TIME = 'delay-time';
const SHOP_RESULTS_ROWS = 'results-rows';
const SHOP_DEFAULT_LANGUAGE = 'default-language';
const SHOP_AFFILIATE = 'affiliate';
const SHOP_MAX_CHARS = 'max-chars';
const SHOP_TITLE_FONT_SIZE = 'title-font-size';
const SHOP_EXTRACT_FONT_SIZE = 'extract-font-size';
const SHOP_RESULT_WIDTH = 'result-width';
const SHOP_RESULT_HEIGHT = 'result-height';
const SHOP_DEFAULT_SHOP = 'default-shop';
const Themes = {
    LIGHT: 0,
    DARK: 1
};
const Shop = {
    
}
function init() {
}

const ShoppingSearchProviderPrefsWidget = new GObject.Class({
    Name: 'ShoppingSearchProvider.Prefs.Widget',
    GTypeName: 'ShoppingSearchProviderPrefsWidget',
    Extends: Gtk.Grid,

    _init: function (params) {
        this.parent(params);
        this.margin = this.row_spacing = this.column_spacing = 10;
        this._rownum = 0;
        this._settings = Convenience.getSettings();

        Gtk.Settings.get_default().gtk_button_images = true;

        // keyword
        this._keyword = this.addEntry(
            "Keyword:",
            SHOP_KEYWORD
        );
        this._backend = this.addEntry(
            "Backend:",
            SHOP_BACKEND
        );

        this._default_shop = this.addEntry(
            "Shop Domain:",
            SHOP_DEFAULT_SHOP
        );
        this._affiliate = this.addEntry(
            "Affiliate:",
            SHOP_AFFILIATE
        );
        // delay time
        this._delay = this.addSpin('Delay time(ms):', SHOP_DELAY_TIME, {
            lower: 100,
            upper: 5000,
            step_increment: 100
        });

        // max chars
        this._max_chars = this.addSpin('Max chars:', SHOP_MAX_CHARS, {
            lower: 50,
            upper: 2000,
            step_increment: 50
        });

        // title font size
        this._title_font_size = this.addSpin('Title font size(px):', SHOP_TITLE_FONT_SIZE, {
            lower: 1,
            upper: 40,
            step_increment: 1
        });

        // extract font size
        this._extract_font_size = this.addSpin('Extract font size(px):', SHOP_EXTRACT_FONT_SIZE, {
            lower: 1,
            upper: 20,
            step_increment: 1
        });

        // results rows
        this._results_rows = this.addSpin('Max results rows:', SHOP_RESULTS_ROWS, {
            lower: 1,
            upper: 10,
            step_increment: 1
        });

        // theme
        let item = new Gtk.ComboBoxText();

        for(let theme in Themes) {
            if(Themes.hasOwnProperty(theme)) {
                let label = theme[0].toUpperCase() + theme.substring(1).toLowerCase();
                item.insert(-1, Themes[theme].toString(), label);
            }
        }

        // item.set_active_id(this._settings.get_enum(SHOP_THEME)).toString();
        item.set_active_id(this._settings.get_enum(SHOP_THEME) == 0 ? '0' : '1');
        item.connect('changed', Lang.bind(this, function (combo) {
            let value = parseInt(combo.get_active_id(), 10);

            if (value !== undefined &&
                this._settings.get_enum(SHOP_THEME) !== value) {
                this._settings.set_enum(SHOP_THEME, value);
            }
        }));
        this.addRow("Theme:", item);

        // result width
        this._result_width = this.addSpin('Width(px):', SHOP_RESULT_WIDTH, {
            lower: 100,
            upper: 1500,
            step_increment: 10
        });

        // result height
        this._result_height = this.addSpin('Height(px):', SHOP_RESULT_HEIGHT, {
            lower: 50,
            upper: 1500,
            step_increment: 10
        });
    },

    addEntry: function (text, key) {
        let item = new Gtk.Entry({ hexpand: true });
        item.text = this._settings.get_string(key);
        this._settings.bind(key, item, 'text', Gio.SettingsBindFlags.DEFAULT);
        return this.addRow(text, item);
    },

    addBoolean: function (text, key) {
        let item = new Gtk.Switch({active: this._settings.get_boolean(key)});
        this._settings.bind(key, item, 'active', Gio.SettingsBindFlags.DEFAULT);
        return this.addRow(text, item);
    },

    addSpin: function (label, key, adjustmentProperties, spinProperties) {
        adjustmentProperties = Params.parse(adjustmentProperties, {
            lower: 0,
            upper: 100,
            step_increment: 100
        });
        let adjustment = new Gtk.Adjustment(adjustmentProperties);
        spinProperties = Params.parse(spinProperties, {
            adjustment: adjustment,
            numeric: true,
            snap_to_ticks: true
        }, true);
        let spinButton = new Gtk.SpinButton(spinProperties);

        spinButton.set_value(this._settings.get_int(key));
        spinButton.connect('value-changed', Lang.bind(this, function (spin) {
            let value = spin.get_value_as_int();
            if(this._settings.get_int(key) !== value) {
                this._settings.set_int(key, value);
            }
        }));
        return this.addRow(label, spinButton, true);
    },

    addRow: function (text, widget, wrap) {
        let label = new Gtk.Label({
            label: text,
            hexpand: true,
            halign: Gtk.Align.START
        });
        label.set_line_wrap(wrap || false);
        this.attach(label, 0, this._rownum, 1, 1); // col, row, colspan, rowspan
        this.attach(widget, 1, this._rownum, 1, 1);
        this._rownum++;
        return widget;
    },

    addItem: function (widget, col, colspan, rowspan) {
        this.attach(widget, col || 0, this._rownum, colspan || 2, rowspan || 1);
        this._rownum++;
        return widget;
    }
});

function buildPrefsWidget() {
    let widget = new ShoppingSearchProviderPrefsWidget();
    widget.show_all();

    return widget;
}

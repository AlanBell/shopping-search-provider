//A shopping search tool inspired by the canonical shopping lens for Unity
//with code based on the wikipedia search provider for Gnome-shell
//Like all extensions this is licenced under the terms of the GPLv2+
const St = imports.gi.St;
const Main = imports.ui.main;
const Tweener = imports.ui.tweener;
const Search = imports.ui.search;
const Atk = imports.gi.Atk;
const SearchDisplay = imports.ui.searchDisplay;
const IconGrid = imports.ui.iconGrid;
const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const Soup = imports.gi.Soup;
const Util = imports.misc.util;
const URLHighlighter = imports.ui.messageTray.URLHighlighter;
const Lang = imports.lang;
const Mainloop = imports.mainloop;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;
const Prefs = Me.imports.prefs;
const settings = Convenience.getSettings();
let text, button;
let shoppingProvider = "";
const shell_version = imports.misc.config.PACKAGE_VERSION;

const MAX_SEARCH_RESULTS_COLUMNS = 2
const ICON_SIZE = 120;


function starts_with(str1, str2) {
    return str1.slice(0, str2.length) == str2;
}

function is_blank(str) {
    return (!str || /^\s*$/.test(str));
}
const _httpSession = new Soup.SessionAsync();
Soup.Session.prototype.add_feature.call(
    _httpSession,
    new Soup.ProxyResolverDefault()
);
_httpSession.user_agent = 'Gnome-Shell Shopping Search Provider';

function get_icon(url,ICON_x,ICON_y) {
    let result;
    
    if(url) {
        let textureCache = St.TextureCache.get_default();
        result = textureCache.load_uri_async(url, ICON_x, ICON_y);
    }
    else {
        let extension = ExtensionUtils.getCurrentExtension()
        let textureCache = St.TextureCache.get_default();
        url="file://"+extension.path+"/shopping.png";
        result = textureCache.load_uri_async(url, 106, 94);
        if(starts_with(shell_version, '3.4')) {
            result.icon_type = St.IconType.FULLCOLOR
        }
    }

    return result;
}

const ShoppingResultActor = new Lang.Class({
    Name: 'ShoppingResultActor',

    _init: function(resultMeta) {
        this.actor = new St.Bin({
            style_class: 'shopping-'+settings.get_string(Prefs.SHOP_THEME),
            reactive: true,
            can_focus: true,
            track_hover: true,
            accessible_role: Atk.Role.PUSH_BUTTON
        });
        let monitor = Main.layoutManager.primaryMonitor;
        let content_width = monitor.width/4;
        let content_height = settings.get_int(Prefs.SHOP_RESULT_HEIGHT);
        let style_string = 
            'width: '+content_width+'px;'+
            'height: '+content_height+'px;'
        
        //start with a horizontal box layout, it will have icon and price on the left and title and description on the right
        let content = new St.BoxLayout({
            style_class: 'shopping-content-'+settings.get_string(Prefs.SHOP_THEME),
            style: style_string,
            vertical: false
        });
        this.actor.set_child(content);

        let leftcontent = new St.BoxLayout({
            vertical: true
        });
        content.add(leftcontent)
        let rightcontent = new St.BoxLayout({
            vertical: true
        });
        content.add(rightcontent);

        if(resultMeta.show_icon) {
            let icon = get_icon(resultMeta.image,resultMeta.iconx, resultMeta.icony);
            leftcontent.add(icon, {
                x_fill: true,
                y_fill: true,
                x_align: St.Align.START,
                y_align: St.Align.MIDDLE,
            });
        }
        
        if(resultMeta.price){
            let price = new St.Label({
                text: resultMeta.price,
                style_class: 'shopping-details-title-'+settings.get_string(Prefs.SHOP_THEME),
                style: 'font-size: '+settings.get_int(Prefs.SHOP_TITLE_FONT_SIZE)+'px;'
            });
            leftcontent.add(price, {
                x_fill: false,
                y_fill: false,
                x_align: St.Align.MIDDLE,
                y_align: St.Align.MIDDLE,
            });
        }
        
        let details = new St.BoxLayout({
            style_class: 'shopping-details-'+settings.get_string(Prefs.SHOP_THEME),
            vertical: true
        });

        rightcontent.add(details, {
            x_fill: false,
            y_fill: false,
            x_align: St.Align.START,
            y_align: St.Align.MIDDLE
        });

        let title = new St.Label({
            text: resultMeta.title,
            style_class: 'shopping-details-title-'+settings.get_string(Prefs.SHOP_THEME),
            style: 'font-size: '+settings.get_int(Prefs.SHOP_TITLE_FONT_SIZE)+'px;'
        });

        details.add(title, {
            x_fill: false,
            y_fill: false,
            x_align: St.Align.START,
            y_align: St.Align.START
        });


        this.actor.label_actor = title;
        
        
        let extract_box = new St.BoxLayout({
            vertical: true,
            style_class: 'shopping-details-extract-'+settings.get_string(Prefs.SHOP_THEME),
            style: 'font-size: '+settings.get_int(Prefs.SHOP_EXTRACT_FONT_SIZE)+'px;'
        });

        let extract = new URLHighlighter(
            resultMeta.extract,
            true,
            false
        );

        extract_box.add(extract.actor, {
            x_fill: true,
            y_fill: true,
            x_align: St.Align.END,
            y_align: St.Align.START
        });
        
        let content_scroll=new St.ScrollView({ x_fill: true,
                                         y_fill: false,
                                         y_align: St.Align.START
                                         });
        content_scroll.add_actor(extract_box);

        details.add(content_scroll, {
            x_fill: true,
            y_fill: true,
            x_align: St.Align.START,
            y_align: St.Align.END
        });
    }
});

const ShoppingProvider = new Lang.Class({
    Name: 'ShoppingProvider',
    Extends: Search.SearchProvider,

    _init: function(title) {
        this.title = title;
        this.async = true;
        this.delay_query = '';
        this.delay_query_id = 0;
    },
  _get_products: function(term, fun) {
        if(term) {
            term = encodeURIComponent(term);
            let url= settings.get_string(Prefs.SHOP_BACKEND)
            +"?search="+term+"&type=All&"
            +"store="+settings.get_string(Prefs.SHOP_DEFAULT_SHOP)
            +'&affiliate='+settings.get_string(Prefs.SHOP_AFFILIATE)
            //global.log(url);//uncomment this to log all the calls it makes to the server
            let here = this;
            let request = Soup.Message.new('GET', url);

            _httpSession.queue_message(request, function(_httpSession, message) {
                if(message.status_code === 200) {
                    let result = JSON.parse(request.response_body.data);
                    
                    if(result['Item']) {
                        fun.call(here, result);
                    }
                    else {
                        fun.call(here, false);
                    }
                }
                else {
                    fun.call(here, false);
                }
            });
        }
        else {
            fun.call(here, false);
        }
    },

    _search: function(term) {
        global.log("searching for "+term);
        this._get_products(term, function(products) {
            if(products) {
                let result = [];
                let Items=products['Item'];
                if(Items) {
                    for(let item in Items) {
                        result.push({
                            "id": Items[item]['DetailPageURL'],
                            "title": Items[item]['ItemAttributes']['Title'],
                            "price": Items[item]['OfferSummary'] ? Items[item]['OfferSummary']['LowestNewPrice'] ? Items[item]['OfferSummary']['LowestNewPrice']['FormattedPrice']:'':'',
                            "image": Items[item]['MediumImage'] ? Items[item]['MediumImage']['URL']:'',
                            "iconx": Items[item]['MediumImage'] ? Items[item]['MediumImage']['Width']['_']:'',
                            "icony": Items[item]['MediumImage'] ? Items[item]['MediumImage']['Height']['_']:'',
                            "extract": Items[item]['EditorialReviews'] ? 
                                    Items[item]['EditorialReviews']['EditorialReview']['Content'] ?
                                     Items[item]['EditorialReviews']['EditorialReview']['Content'].replace(/<(?:.|\n)*?>/gm, ''):
                                     Items[item]['EditorialReviews']['EditorialReview'][0]['Content'].replace(/<(?:.|\n)*?>/gm, '')
                                    :"No description",
                            "show_icon": Items[item]['MediumImage'] ? true:false
                        });
                    }
                }

                if(result.length > 0) {
                    this.searchSystem.pushResults(this, result);
                }
                else {
                    let nothing_found = [{
                        "title": "Shopping Search Provider",
                        "extract": "Your search - "+term+" - did not match any items.",
                        "show_icon": false
                    }]
                    this.searchSystem.pushResults(this, nothing_found);
                };
            }
            else {
                let nothing_found = [{
                    "title": "Shopping Search Provider",
                    "extract": "Your search - "+term+" - did not match any items.",
                    "show_icon": false
                }]
                this.searchSystem.pushResults(this, nothing_found);
            }
        });
    },
        
    
    _parse_query: function(terms_string) {
        let SHOPPING_QUERY_REGEXP = new RegExp(
            "("+settings.get_string(Prefs.SHOP_KEYWORD)+
            "|"+settings.get_string(Prefs.SHOP_KEYWORD)+
            "-(.*?)) (.*)"
        );
        let result = {};
        result.shopping_query = false;

        if(SHOPPING_QUERY_REGEXP.test(terms_string)) {
            result.shopping_query = true;
            let matches = SHOPPING_QUERY_REGEXP.exec(terms_string);
            let term = matches[3];

            if(!is_blank(term)) {
                result.term = term.trim();
            }
        }

        return result;
    },
    
    createResultActor: function(resultMeta, terms) {
        let result = new ShoppingResultActor(resultMeta);
        return result.actor;
    },
    getInitialResultSetAsync: function(terms) {
        if(this.delay_query_id > 0) {
            Mainloop.source_remove(this.delay_query_id);
            this.delay_query_id = 0;
        }

        let terms_string = terms.join(" ");
        let query = this._parse_query(terms_string);

        if(query.shopping_query) {
            let searching = [{
                "title": "Shopping Search Provider",
                "extract": "Searching for '"+query.term+"'...",
                "show_icon": true
            }]
            this.searchSystem.pushResults(this, searching);

            if(query.term) {


                this.delay_query = query.term;
                this.delay_query_id = Mainloop.timeout_add(
                    settings.get_int(Prefs.SHOP_DELAY_TIME),
                    Lang.bind(this, function() {
                        this._search(this.delay_query);
                    })
                );
            }
            else {
                let welcome = [{
                    "title": "Shopping Search Provider",
                    "extract": "What do you want to buy?",
                    "show_icon": true
                }]
                this.searchSystem.pushResults(this, welcome);
            }
        }
        else {
            this.searchSystem.pushResults(this, []);
        }
    },
    
    getInitialResultSet: function (terms) {
        this.getInitialResultSetAsync(terms);
    },

    getSubsearchResultSetAsync: function(prevResults, terms) {
        this.getInitialResultSetAsync(terms);
    },

    getSubsearchResultSet: function(prevResults, terms) {
        this.getInitialResultSetAsync(terms);
    },
        getResultMetasAsync: function(result, callback) {
        let metas = [];

        for(let i = 0; i < result.length; i++) {
            metas.push({
                'id' : result[i].id,
                'extract' : result[i].extract,
                'title' : result[i].title,
                'show_icon': result[i].show_icon,
                'image': result[i].image,
                'iconx': result[i].iconx,
                'icony': result[i].icony,
                'price': result[i].price
                });
        }

        callback(metas);
    },

    getResultMetas: function(result, callback) {
        this.getResultMetasAsync(result, callback)
    },

    createResultContainerActor: function() {
        let grid = new IconGrid.IconGrid({
            rowLimit: settings.get_int(Prefs.SHOP_RESULTS_ROWS),
            xAlign: St.Align.START
        });
        grid.actor.style_class = 'shopping-grid';

        let width = settings.get_int(Prefs.SHOP_RESULT_WIDTH);
        let height = settings.get_int(Prefs.SHOP_RESULT_HEIGHT); 
        let style_string = 
            '-shell-grid-horizontal-item-size: '+width+'px;'+
            '-shell-grid-vertical-item-size: '+height+'px;'
        grid.actor.style = style_string;

        let actor = new SearchDisplay.GridSearchResults(this, grid);
        return actor;
    },
    
    activateResult: function(resultId) {
        global.log(resultId);
        
        if(resultId) {
            try {
                Gio.app_info_launch_default_for_uri(
                    resultId,
                    global.create_app_launch_context()
                );
            }
            catch (e) {
                Util.spawn(['gvfs-open', resultId])
            }
        }
        else {
            // Main.notify("Bad url.");
        }

        return true;
    }
});

function init() {
    shoppingProvider = new ShoppingProvider('SHOPPING');
    
}

function enable() {
    Main.overview.addSearchProvider(shoppingProvider);
    if(starts_with(shell_version, '3.6')) {
        let search_results = Main.overview._viewSelector._searchResults;
        let provider_meta = search_results._metaForProvider(shoppingProvider);
        provider_meta.resultDisplay._grid.actor.style_class = 'shopping-grid';
        provider_meta.resultDisplay._grid._rowLimit = settings.get_int(Prefs.SHOP_RESULTS_ROWS);
        let monitor = Main.layoutManager.primaryMonitor;
        let width = monitor.width/4;
        let height = settings.get_int(Prefs.SHOP_RESULT_HEIGHT); 
        provider_meta.resultDisplay._grid.actor.style = 
            '-shell-grid-horizontal-item-size: '+width+'px;'+
            '-shell-grid-vertical-item-size: '+height+'px;'
    }
}

function disable() {
    Main.overview.removeSearchProvider(shoppingProvider);
}

shopping-search-provider
========================

A search provider for gnome shell that allows you to shop for things.

To install the latest stable reviewed version go to https://extensions.gnome.org/extension/564/amazon-shopping/

There are a number of settings you can tweak for this extension using the gnome-tweak-tool or the settings button
on https://extensions.gnome.org/local/

* Keyword

  This is a prefix to trigger it to search. By default it is set to "a" so you would hit super and type "a toaster" to search for toasters. You might want to set
the prefix to "shop" or set it blank to always search if you prefer that.

* Backend

  The server to search on. This won't be Amazon directly, it needs to be a proxy which holds the secret
keys for the search API. You can register on Amazon to get such keys.

* Shop Domain

  Which Amazon store do you want to search? You can set this to any of:
 * co.uk
 * de
 * com
 * ca
 * fr
 * co.jp
 * it
 * cn
 * es

* Affiliate

  This is an Amazon affiliate ID. It gives someone a commission if you buy stuff. It defaults to mine because I am
not stupid, but you can change it because I am not evil either. You might want to set it to 
gnomestore-20 to benefit the Gnome Foundation or electronicfro-20 to help out the Electronic Frontier Foundation
or pick another beneficiary of your choice. Would be rather smashing if you left it on theopesou-21 at least for a bit
though.

The rest of the parameters are fairly self explanatory and relate to the size of the boxes and fonts and suchlike.

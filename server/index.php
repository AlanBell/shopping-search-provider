<?php
/**
 * very very simple web services back end proxy for amazon. Basically a way to hide the secret key on
 * a server for a search application to come and get it.
 * this does't need to be in the distributed extension, but it is small and harmless and convenient to
 * put in the same source code control system
 */

//codes.php contains the constants AWS_API_KEY, AWS_API_SECRET_KEY, AWS_ASSOCIATE_TAG
//the lines look like this:
//define('AWS_ASSOCIATE_TAG', 'theopesou-21')
require 'codes.php';

//this is from https://github.com/Exeu/Amazon-ECS-PHP-Library
require 'Amazon-ECS-PHP-Library/lib/AmazonECS.class.php';

// get a new object with your API Key and secret key. Lang is optional.
if($_REQUEST['search']){
    header('Content-Type: application/json');
    $store = $_REQUEST['store'];
    $store=trim($store,". ");//some people put ".co.jp" in the store so strip out any leading .
    $tag= $_REQUEST['affiliate'];
    if(!$tag) {$tag=AWS_ASSOCIATE_TAG; };//use my tag if one is not supplied by the client
    $searchquery = $_REQUEST['search'];
    $type = $_REQUEST['type'];//for future use, at the moment searches All could be DVD or Books or other categories
//this is where the magic happens
    $amazonEcs = new AmazonECS(AWS_API_KEY, AWS_API_SECRET_KEY, $store, $tag);
    $response = $amazonEcs->category($type)->responseGroup('Medium')->search($searchquery);
    echo json_encode($response->Items);
//magic over. The rest is just presenting a web page for curious people arriving with a browser
}else{
?>
<html>
<body>
<h1>Shopping Search</h1>
<p>This web service proxies the Amazon API for a Gnome Shell search provider An example call would be:</p>

<p><a href="https://products.libertus.co.uk/?search=pink%20bunnies%20pen&type=All&store=co.uk&affiliate=theopensou-21">http://products.libertus.co.uk/?search=pink%20bunnies%20pen&type=All&store=co.uk&affiliate=theopensou-21</a></p>
<p>The tool itself can be installed from <a href="https://extensions.gnome.org/extension/564/amazon-shopping/">the Gnome extension collection</a></p>
<p>This is a <a href="http://libertus.co.uk">Libertus Solutions</a> service. We are not interested in the search queries, most of the time they won't be logged or looked at
although we might from time to time do some sample logging to see how much it is used and whether we need to dedicate more server power to it.</p>
<p>You can read more about the development of this service <a href="http://www.theopensourcerer.com/2012/12/privacy-is-hard-lets-go-shopping/">here</a>
<a href="http://www.theopensourcerer.com/2012/12/she-sells-sea-shells/">here</a> and <a href="http://www.theopensourcerer.com/2012/12/shopping-lens-for-gnome-shell/">here</a></p>
</body>

</html>
<?php
}
?>

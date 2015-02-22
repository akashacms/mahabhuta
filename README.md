# Mahabhuta
jQuery-like document processing engine 

This is a wrapper around Cheerio to perform a series of jQuery-like operations on an HTML document.  It allows one to package a set of reusable, discrete, DOM-manipulations.

The name comes because Mahabhuta was developed as part of AkashaCMS.  Where Akasha is the primordial element, in Sanskrit, Mahabhuta refers to all five elements.  Hence, Mahabhuta is focused on processing HTML elements.

Mahabhuta uses the [Cheerio](https://www.npmjs.com/package/cheerio) library for its jQuery-like API.  It doesn't support the full jQuery API, but a subset that the Cheerio team feels is useful.  Mahabhuta is used in [AkashaCMS](http://akashacms.com/) to provide DOM manipulation during page rendering.

## Purpose

Generally speaking, what's done with Mahabhuta is to either invent special tags (e.g. `<youtube-video-embed>`), and provide a function to process that tag, or to do special DOM manipulation.

Consider a page like this (adapted from the Boilerplate project):

```
<!doctype html>
<!-- paulirish.com/2008/conditional-stylesheets-vs-css-hacks-answer-neither/ -->
<!--[if lt IE 7]> <html class="no-js lt-ie9 lt-ie8 lt-ie7" lang="en"> <![endif]-->
<!--[if IE 7]>    <html class="no-js lt-ie9 lt-ie8" lang="en"> <![endif]-->
<!--[if IE 8]>    <html class="no-js lt-ie9" lang="en"> <![endif]-->
<!-- Consider adding a manifest.appcache: h5bp.com/d/Offline -->
<!--[if gt IE 8]><!--> <html class="no-js" lang="en"> <!--<![endif]-->
<head>
<meta charset="utf-8" />
<!-- Use the .htaccess and remove these lines to avoid edge case issues. More info: h5bp.com/i/378 -->
<meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1" />
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<ak-page-title/>
<ak-header-metatags/>
<ak-sitemapxml/>
<ak-siteverification/>
<ak-stylesheets/>
<ak-headerJavaScript/>
</head>
<body>
<ak-navigation-bar/>
<ak-insert-content/>
<!-- JavaScript at the bottom for fast page loading -->
<ak-footerJavaScript/>
<ak-google-analytics/>
</body>
</html>
```

What Mahabhuta does is give you the ability to process special tags like these, converting them into a fully fleshed out functional page suitable for display in a browser.

Another plausible use is to search for all `img` tags with a special class, and either add (or don't add) the image to `og:image` meta tags.

```
<img class="... ogshow ..." src="..."/>
```

This tag might be detected, and then added to the page header as an `og:image` tag so that social network sites can detect images to show when the page is shared.

## Installation

Add `mahabhuta` to your `package.json` and type:

```
$ npm install
```

Or simply type

```
$ npm install mahabhuta
```

## Usage

In your application

```
var mahabhuta = require('mahabhuta');
...
var $ = mahabhuta.parse(text, cheerioOptions);
...
mahabhuta.process($, { object containing data }, [ array containing mahafuncs ], function(err, rendered) {
    if (err) ...
    else {
        process the HTML in rendered
    }
});
...
```

The `cheerioOptions` variable should contain options for the Cheerio module.  It is an optional parameter, and it's also possible to skip the separate `parse` step like so:

```
mahabhuta.process(text, metadata, mahafuncs, function(err, rendered) { });
```

The text will be interpreted as HTML, of course.

The callback function you provide will be called when all the functions in the `mahafuncs` array have been executed.  The parameter `rendered` is the HTML string as processed by all the mahafuncs.

There is also a wrapper for `.process` letting you pass a single mahafunc

```
mahabhuta.process(text, metadata, mahafunc, function(err, rendered) { });
```

## Mahafuncs

In the `.process` function, Mahabhuta steps through the `mahafuncs` array calling each `mahafunc` in turn.  It does this using the `async.eachSeries` method to ensure the mahafuncs are executed in order.  The ordering of items in the `mahafuncs` array may be important to your application.

The `mahafuncs` array is to contain individual functions, each of which is a `mahafunc`.  A `mahafunc` has this signature:

```
mahafunc($, metadata, setDirty, function(err) { })
```

The `$` parameter is, as expected, the object into which Cheerio parsed the text you provide.  It lets you call jQuery-like functions (just visit api.jquery.org and expect that most of the API works as documented there) to manipulate the text you passed in.

The `metadata` parameter is the same object you passed in originally, letting you pass data into mahafuncs.

The `setDirty` parameter is a function your mahafunc can call if the mahafunc did something to the DOM which requires further processing.  For example, say you've invented a special tag the mahafunc replaces that tag with other special tags which other mahafuncs are supposed to handle.  That requires an extra run through the mahafuncs array.  Calling setDirty ensures that one more run will be made through the mahafuncs array.  The setDirty function can be called multiple times during a run, and only one more run will be performed.

Internally to Mahabhuta it makes passes through the mahafuncs array until none of the mahafunc's calls setDirty.

The final parameter is the function the mahafunc calls when it is done.  The mahafunc indicates an error by setting the `err` parameter, otherwise there is assumed to be no error.  If a mahafunc indicates an error all processing is stopped, and the callback provided in the `.process` function is in turn called with the `err` parameter.

## Examples

```
function($, metadata, dirty, done) {
    $('hello-world').replaceWith('<p class="hello-world">Hello world! '+ metadata.title +'</p>');
    done();
}
```

Replaces a `<hello-world>` tag with the text shown above.

```
function($, metadata, dirty, done) {
    // <oembed href="..." />
    var elemsOE = [];
    $('oembed').each(function(i, elem) { elemsOE[i] = elem; });
    // util.log(util.inspect(elemsOE));
    async.eachSeries(elemsOE, function(elemOE, next) {
        // util.log(util.inspect(elemOE));
        var url = $(elemOE).attr("href");
        var template = $(elemOE).attr('template');
        oembed.fetch(url, { maxwidth: 6000 }, function(err, results) {
            if (err) next(err);
            else {
                akasha.partial(template, results, function(err, html) {
                    if (err) next(err);
                    else { 
                        $(elemOE).replaceWith(html);
                        next();
                    }
                })
            }
        });
    }, function(err) {
        if (err) done(err);
        else done();
    });
},
```

This demonstrates handling multiple instances of a special tag where asynchronous stuff happens, and ensuring the callback is only called when everything is finished.

The first example silently handled multiple instances of the tag without any fuss, with synchronous execution.  But with an asynchronous function like `oembed.fetch`, the synchronous coding style doesn't work.

First we collect up references to all `oembed` tags into an array, then we step through that array one-by-one to process the items.  The `oembed.fetch` function uses the oEmbed protocol to fetch data about the given URL, and it of course executes asynchronously.  In this case we're using `akasha.partial` to format the results into a template, and eventually the resulting HTML is replaced back into the DOM in place of the `oembed` tag.

The structure of this ensures it can handle multiple tags while being certain of calling the Mahabhuta callback only once.

Both of these examples use the `replaceWith` function.  This ensures that if Mahabhuta does run through the array more than once, that the second time around the mahafunc won't do any further work.

That is, the mahafunc's have to be written knowing they'll likely be called more than once.  That means being sure to not perform the same manipulation twice, but first check to see if the manipulation is required (has already been done) before doing the manipulation.  Removing the special tag is a great way to ensure the manipulation is only done once.

Another trick is that some mahafunc's should only execute when run against a full page, rather than against a page snippet.

```
function($, metadata, dirty, done) {
    if ($('html head').get(0)) {
        // processing only done when there is an "html" tag containing a "head" tag.
    } else {
        done();
    }
}
```

This is a jQuery trick to detect whether a selector returned no elements.


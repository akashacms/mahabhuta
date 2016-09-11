---
layout: chapter.html.ejs
title: Processing HTML DOM with Mahabhuta's Mahafuncs
---

In the previous chapter we saw a simple one-element MahafuncArray.  We were told that when running `mahabhuta.process` we're to pass in a MahafuncArray object.  That's simple enough, right?  An array of Mahafunc objects, yes?  

# MahafuncArray - array's containing arrays containing arrays

Of course it's not that simple.  In AkashaCMS each Plugin is expected to have its own MahafuncArray filled with the Mahafunc's it supplies.  Therefore a typical AkashaCMS project will have several MahafuncArray's to deal with.  

To deal with that, Mahabhuta allows a MahafuncArray to contain other MahafuncArray instances, and of course these can be nested arbitrarily deep.  It's kind of like that old Cosmological idea of Universe - that the land is resting on the back of a giant turtle, that's in turn standing on another turtle, that is in turn standing on another turtle.  In Mahabhuta, it's MahafuncArray's all the way down to the bottom.

This means you can create a master MahafuncArray

```
var mahamaster = new mahabhuta.MahafuncArray("master", {});
```

Then you add more MahafuncArray's for each group of Mahafunc's used in your application.

```
mahamaster.addMahafunc(new mahabhuta.MahafuncArray("plugin-1", {}));
mahamaster.addMahafunc(new mahabhuta.MahafuncArray("plugin-2", {}));
```

And of course you can call `addMahafunc` on either of those MahafuncArray objects.  

What's that second parameter?  In the API it is marked as `config` but is currently ignored.  It is meant to hold a configuration object for that MahafuncArray.  

## Adding Mahafunc objects

You of course don't just add MahafuncArray instances.  The whole point to this is to define a list of operations we use to process HTML.  We've already seen this in the previous chapter.  Generally speaking, we do this:

```
class OurCustomElement extends mahabhuta.CustomElement {
	get elementName() { return "our-custom-element"; }
	process($element, metadata, dirty) {
		return Promise.resolve("Custom Element Content");
	}
}
mahamaster.addMahafunc(new OurCustomElement());
```

We add an instance of the class rather than the class.  That is, we call `new OurClassName()` rather than just passing in `OurClassName`.

## The result: HTML in, changed HTML out

The purpose for Mahabhuta is to manipulate HTML:

```
mahabhuta.process(HTMLINPUT, { }, mahafuncs, (err, HTMLOUTPUT) => {
    if (err) console.error(err);
    else ...
});
```

The API follows the old-school callback model for backwards compatibility.

# The Mahafunc objects

Currently there are two kinds of Mahafunc's, and a third type we might implement if it makes sense to do so.  We've already seen one, CustomElement, which is meant to process a single element in the DOM, replacing it with something else.  The other, Munger, is meant for wider-ranging changes to the DOM.

Each sort of Mahafunc receives a jQuery-like object representing the DOM.  It supports a subset of the jQuery API, supporting DOM manipulations using familiar jQuery methods.

## CustomElement

We've already looked at this object, without discussing any of the details.  Let's do that now.

The `elementName` method is a getter, and it defines the name of the element provided by this CustomElement instance.  As we saw in the Hello World example, with a CustomElement defined our HTML can contain a tag, `<our-custom-element>`.  When Mahabhuta executes each CustomElement instance, it scans the DOM as if this were executed:

```
var elements = [];
$('our-custom-element').each(function(i, elem) { ret.push(elem); });
```

For each element pushed to the `elements` array, Mahabhuta calls the `process` function.  The `$element` parameter gets `$(element)`, and the `metadata` parameter is passed through unchanged.

The `dirty` parameter is a function you are to call if your CustomElement inserts HTML which requires further processing.  You might add HTML that itself is meant to be processed by another Mahafunc.  If that's the case, call `dirty()` in your function.  If this function gets called, Mahabhuta will make sure to run all the Mahafunc's another time.

Your `process` function is to return a Promise that either resolve's or reject's depending on the result.  If the Promise resolve's, it is to contain an HTML string you wish to replace the element.  In Mahabhuta this is of course done as so:

```
$(element).replaceWith(html);
```

Because the `process` function returns a Promise, you can make whatever asynchronous calls you like.

Bottom line:  CustomElement objects are meant to implement, as the name implies, a custom HTML element which is completely replaced by other HTML code.

### Data and parameters

Being an HTML element, the HTML matching your CustomElement can of course have attributes.

```
<our-custom-element href="http://akashacms.com"></our-custom-element>
```

Which you can retrieve as so:

```
process($element, metadata, dirty) {
    var href = $element.attr('href');
    ...
}
```

You can also retrieve metadata values:

```
mahabhuta.process(htmlSource, {
    href: "http://akashacms.com",
    title: "AkashaCMS"
}, mahafuncs, (err, html) => {
    if (err) console.error(err);
    else ...
});
```

Then access the values as so

```
process($element, metadata, dirty) {
    ...
    var href = metadata.href;
    var title = metadata.title;
    ...
}
```

## Munger

Munger objects are meant to implement broader changes to the HTML.  For example you might want to "clean up" certain HTML code, or wrap certain code with some other HTML, or to insert some HTML elsewhere, or to move HTML from one place to another, and so forth.  The jQuery API is powerful, and we want you to use all of it in processing HTML.

```
class OurMungerClass extends mahabhuta.Munger {
	get selector() { return "jQuery Selector"; }

	process($, $match, metadata, dirty) {
    }
}
```

Instead of an element name, we're to supply a `selector`.  This is a full normal jQuery-style selector so go wild with it.

For each match to the selector, the `process` function is called.  The `metadata` and `dirty` parameters are as before.

The `$` parameter is the jQuery-like object representing the entire DOM.  You can call any jQuery function on this object which Cheerio supports.  While Cheerio supports a very large subset of jQuery, it has its limits.  

The `$match` parameter is the `$(element)` entry that was scanned using the `selector`.

As before, the `process` function is to return a Promise.  Unlike CustomElement, the content returned by the Promise is not used.  You must of course indicate failure by rejecting the Promise, and success with the resolve method.  

What you do within the `process` method is up to you.  Have fun.

## A warning about dirty() infinite loops

It's quite possible to lead Mahabhuta into an infinite loop:

```
class InfiniteLoop extends mahabhuta.Munger {
	get selector() { return "body"; }

	process($, $match, metadata, dirty) {
        dirty();
        return Promise.resolve("infinite loop");
    }
}
```

Don't do this.  Because Mahabhuta always ensures it'll re-run the Mahafunc's another time when `dirty` is called, this Mahafunc ensures Mahabhuta will never stop.  

There are a number of ways to create such a situation.

# Backwards compatibility - adding bare functions and Array's

For backwards compatibility with existing AkashaCMS code, Mahabhuta also supports adding simple function's (with a predefined signature), and simple Array's (which must contain Mahafunc's or the equivalent function).

The function signature is as so:

```
mahafunc($, metadata, dirty, next);
```

These parameters are all as we've seen above, except for `next`.  This is an old style callback function supplied by Mahabhuta.  You're to call it either as `next(error)` to indicate an error, or `next()` to indicate success.

When calling `mahabhuta.process` the `mahafuncs` parameter can be an Array.  Internally this is converted to a MahafuncArray.

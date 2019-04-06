---
layout: ebook-page.html.ejs
title: Introduction
# bookHomeURL: 'toc.html'
---

The Mahabhuta project is a framework for server-side DOM processing of HTML files in Node.js.  It uses a jQuery-like API as provided by the Cheerio library, making it possible to reuse our jQuery knowledge in server-side Node.js code.

This is significantly different from text-based template engines like EJS or Mustache.  HTML is not plain text, despite looking like plain text, because it is actually a textual representation of a data structure.  Text-based templating is easy and convenient, but does not treat HTML as a data structure and therefore is not a good fit for all use cases.  The DOM approach to manipulating HTML means you are manipulating the data structure as data rather than as text.

With Mahabhuta it is easy to perform a wide variety of DOM manipulations.  For example one can develop a custom tag that is expanded, through DOM manipulation, into HTML inserted into the DOM.  Or another Mahabhuta function (or Mahafunc) could search for and verify links, or add an _external link_ marker, or adding the favicon of the target site.  With Mahabhuta, one either uses the libraries of existing Mahafunc's, or implements their own, and string them together in arrays that hold Mahafuncs called _MahafuncArray_.

There are several kinds of Mahafuncs:

* **CustomElement** Define a custom tag, like `<embed-video>`, which is converted into a suitable block of HTML.  In this case the custom element is completely replaced by the new HTML code.
* **ElementTweaker** Make changes to an HTML element without replacing it.
* **Munger** Make larger-scale changes to a page.  In this case the programmer is given access to the entire page DOM, allowing any change to be implemented.

Each of those subclasses the _Mahafunc_ class, with each serving as a base class with which the programmer implements desired DOM manipulations.  Mahabhuta is designed to be given an array of Mahafunc's which Mahabhuta executes one-by-one.  Mahafunc's support asynchronous execution, allowing it to retrieve data from a database or web service.

# The origin of Mahabhuta

Back in 2011 when I was first learning about Node.js, I came across a video/talk by an excited Yahoo engineer.  He talked about the awesome power of server-side DOM-based processing of HTML, in Node.js, before sending the page to the browser.  He claimed that by doing most of the page assembly on the server overall performance would be improved -- because the server has better bandwidth to the supporting services to retrieve content to render, and therefore all the round-trips to gather that stuff runs more quickly on the server than in a browser.  Especially when that browser is in the middle of a farm field in the boondocks.

I found that server-side-is-faster-for-page-assembly argument to be compelling.  While developing the AkashaCMS static website generator, Mahabhuta was developed to enable powerful DOM manipulation.

### The name - Mahabhuta?

The name? "Mahabhuta" is the Sanskrit name for the five elements, with Akasha being one of those elements. The Mahabhuta engine deals with HTML Elements, so it seems like a fitting name.  Mahabhuta was originally developed for AkashaCMS, hence the association.  It can be used by other software.

# Where can Mahabhuta be used?

Mahabhuta was developed as part of the AkashaCMS project, and is managed within the AkashaCMS organization on Github.  But that does not prevent Mahabhuta from being used in other projects.

Mahabhuta can easily be embedded in other applications.

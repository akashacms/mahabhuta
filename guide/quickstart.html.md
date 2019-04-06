---
layout: ebook-page.html.ejs
title: Quick start introduction to Mahabhuta
# bookHomeURL: 'toc.html'
---

In this section we'll quickly walk through a simple Mahabhuta example.  The idea is to get you interested before we start with the detailed instructional material.

What we will do in this example is build a simple command-line (CLI) tool using Mahabhuta to process an HTML file specified on the command line.

You'll of course need to have Node.js installed on your computer.  Mahabhuta is written in Node.js, after all.  If you're here you probably already know what Node.js is, and how to install it, so have at that and return here when you're ready.

Create an empty project directory, and run `npm init` in that directory to create a blank project.  Then type these commands to install a few packages:

```shell
$ npm install commander fs-extra --save
```

And create a file named `index.js` containing the following.  There is a copy of this in the Mahabhuta Github repository if you wish to use that instead:

```js
const mahabhuta = require('mahabhuta');
const maha_partial = require('mahabhuta/maha/partial');
const maha_metadata = require('mahabhuta/maha/metadata');

const path = require('path');
const fs = require('fs-extra');
const program   = require('commander');

program
    .command('process <htmlFN>')
    .description('Process an HTML file')
    .action(async (htmlFN) => {

        let master_funcs = new mahabhuta.MahafuncArray("master", {});
        master_funcs.addMahafunc(maha_partial.mahabhutaArray({
            partialDirs: [
                path.join(__dirname, 'partials')
            ]
        }));
        master_funcs.addMahafunc(maha_metadata.mahabhutaArray({
            // options
        }));
        const text = await fs.readFile(htmlFN, 'utf8');
        console.log(`****** process got input text\n`, text)
        console.log(`****** process resulted with\n`, await mahabhuta.processAsync(text, {}, master_funcs));
    });

program.parse(process.argv);
```

The CLI tool is managed by the `commander` package and a lot of what's here is boilerplate required by that library.  The interesting part is the `.action` function.

We have require'd `mahabhuta`, `maha_partial`, and `maha_metadata`.  The first is the Mahabhuta library, while the other two are useful Mahafunc libraries.  With `maha_partial` we can use the `<partial>` tag to insert content from an HTML snippet, and optionally pass data to an HTML template snipped to be inserted into the HTML.  With `maha_metadata` we have several useful tags to insert things into HTML.

Inside the `.action` function we start by creating a _MahafuncArray_ named _master_, then we add the `maha_partial` and `maha_metadata` MahafuncArray's to that array.  While we use a function named `addMahafunc` to do so, this function is capable of adding either Mahafunc's or MahafuncArray's.

When adding `maha_partial` we passed an _options_ object that specified where the _partials_ directory is.  This is an array of directories where the `<partial>` tag will look to find the HTML snippet.

The `commander` module arranges for the HTML file name to appear as the `htmlFN` parameter.  We then read the file and pass its contents to `mahabhuta.processAsync` along with some other parameters including the _master_ MahafuncArray.

What `processAsync` does is to step through MahafuncArray's and sub-MahafuncArrays to execute all Mahafunc's.  Each does its thing to the HTML, and then the modified HTML is returned.  

The `.action` function helpfully prints the BEFORE and AFTER versions of the HTML.

How if you create a file named `test1.html` containing this:

```html
<html>
    <head>
        <site-verification google="Hello, Google!"></site-verification>
        <rss-header-meta href="https://akashacms.com/news/rss.xml"></rss-header-meta>
        <external-stylesheet href="https://some.where/style.css"></external-stylesheet>
        <xml-sitemap href="https://some.where/sitemap.xml"></xml-sitemap>
    </head>
    <body>
        <body-add-class class="foo"></body-add-class>
        <partial file-name="hello.html"></partial>
    </body>
</html>
```

You'll see this exercises many of the custom elements defined in the two Mahafunc libraries.  We have one more thing to do, and that is to create the _partials_ directory and a file named `hello.html`.

```shell
$ mkdir partials
```

Then create `hello.html` which might contain:

```html
<p>Hello, World!</p>
```

Then finally you can run this as so:

```html
$ node index.js process test1.html 
****** process got input text
 <html>
    <head>
        <site-verification google="Hello, Google!"></site-verification>
        <rss-header-meta href="https://akashacms.com/news/rss.xml"></rss-header-meta>
        <external-stylesheet href="https://some.where/style.css"></external-stylesheet>
        <xml-sitemap href="https://some.where/sitemap.xml"></xml-sitemap>
    </head>
    <body>
        <body-add-class class="foo"></body-add-class>
        <partial file-name="hello.html"></partial>
    </body>
</html>
****** process resulted with
 <html>
    <head>
        <meta name="google-site-verification" content="Hello, Google!">
        
        <link rel="stylesheet" type="text/css" href="https://some.where/style.css">
        <link rel="sitemap" type="application/xml" title="Sitemap" href="https://some.where/sitemap.xml">
    <link rel="alternate" type="application/rss+xml" href="https://akashacms.com/news/rss.xml"></head>
    <body class="foo">
        
        <p>Hello, World!</p>
    </body>
</html>
```

All those custom tags got replaced with the corresponding specific tags.

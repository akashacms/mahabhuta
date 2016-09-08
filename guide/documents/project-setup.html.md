---
layout: chapter.html.md
title: Project setup
---

# Setting up Node.js

Mahabhuta is written for the Node.js platform.  That means it executes JavaScript programs, letting you leverage your jQuery and JavaScript knowledge on server-side software.  Therefore the first step is to set up Node.js on your laptop and/or server.

I won't go into this in very much depth because there is excellent documentation elsewhere.

* Official download location: https://nodejs.org/en/download/
* Official documentation on installing from O/S package managers: https://nodejs.org/en/download/package-manager
* Comprehensive list of books and video courses on Node.js programming: http://davidherron.com/book/2015-09-14/books-and-videos-so-you-can-easily-learn-nodejs-programming
* NVM is an excellent tool for managing Node.js versions on your laptop: https://github.com/creationix/nvm

# Initializing a Mahabhuta project

Your use of Mahabhuta is probably going to be part of a larger project.  For example, while Mahabhuta is a major feature in AkashaCMS it is not the entirety of that project.

Every Node.js project starts with running this command:

```
$ npm init
```

This initializes a `package.json` file with a few basic settings.  The `package.json` describes the project, its dependencies, and can even describe the processes you can do with the project.

You declare the Mahabhuta dependency as so:

```
$ npm install "akashacms/mahabhuta#akasharender" --save
```

At the moment the Mahabhuta version documented in this book is available solely as the `akasharender` branch in the workspace.  In the due course of time this version of Mahabhuta will be available in the npm repository.

# A small Mahabhuta example


# etc

Using Mahabhuta in an AkashaCMS project ?? separate page ??

Using Mahabhuta in an EPUBTools project ?? seperate page ??

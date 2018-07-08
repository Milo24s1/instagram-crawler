# instagram-crawler

<h1 align="center">
	<img width="360" src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Instagram_font_awesome.svg/2000px-Instagram_font_awesome.svg.png" alt="fkill">
</h1>

[![NPM version](https://img.shields.io/npm/v/instagram-profilecrawl.svg)](https://www.npmjs.com/package/instagram-profilecrawl)
[![Build Status](https://travis-ci.org/nacimgoura/instagram-profilecrawl.svg?branch=master)](https://travis-ci.org/nacimgoura/instagram-profilecrawl)
[![built with NodeJS](https://img.shields.io/badge/Built%20with-nodejs-green.svg)](https://www.nodejs.org/)
[![built with Selenium](https://img.shields.io/badge/built%20with-puppeteer-green.svg)](https://github.com/GoogleChrome/puppeteer)
[![dependances](https://david-dm.org/nacimgoura/instagram-profilecrawl.svg)](https://david-dm.org/nacimgoura/instagram-profilecrawl)

> Quickly crawl the information (e.g. followers, tags, mentions, date, etc...) of an instagram profile. No login required!


## Usage

```bash


  Usage
    $ node index.js <username>

  Options
    --output -o          define output format (JSON, YAML)
    --limit -l           get only the number of post defined by the limit
    --interactive -i     disable headless mode

  Examples
    $ node index.js zuck
    $ node index.js zuck -l 3 -o yaml
```


## Special Thanks
this is an extend of version of nacimgoura instagram-profilecrawl 
https://nacimgoura.github.io

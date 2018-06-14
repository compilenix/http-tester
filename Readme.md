# Usage
* install nvm (https://github.com/creationix/nvm)
* `cp config.example.js config.js`
* edit config.js
* run `npm start`
* profit!

## A simple task
The following simple example task specifies the only required property: `url`. Any default settings, values and policies will be applied (see `config.js`).

```js
this.tasks = [
  { url: 'http://www.microsoft.com' },
  { url: 'https://www.google.com' }
]
```

## A complete task explained
The following example describes every possible task property.

Note that you are not required to set all properties, just set / change which you want to differ from the default behavior.

```js
this.tasks = [
  {
    url: 'https://compilenix.org',
    protocolVersion: '1.1',
    headers: [
      // - these headers do overwrite default headers
      // - if a header is 'null' or 'undefined' it will be removed
      { key: 'Upgrade-Insecure-Requests', value: null }
    ],
    //method: 'POST' // POST is implied by the `body` property
    body: path.parse('./LICENSE'),
    fetchBody: true,
    headerPolicies: [{ name: 'IsSuccessStatusCode', enabled: false }],
    bodyPolicies: [{ name: 'IsGreaterThan3k', enabled: false }],
    /**
     * @function
     * @param {http.IncomingMessage} res
     * @returns {string[] | void}
     */
    onHeaders: res => {
      // console.dir(res.headers)
    },
    /**
     * @function
     * @param {string} raw
     * @param {CheerioStatic} $
     * @returns {string[] | void}
     */
    onBody: (res, $) => {
      // console.dir(res)
      // console.dir($)
    },
    /**
     * @function
     * @description here you handle any kind of error
     * @param {Error} error
     */
    onError: error => console.error(error)
  }
]
```

This task makes a HTTP 1.1 POST request to compilenix.org. The request header `Upgrade-Insecure-Requests` will be removed (if it would be set by `Config.defaultHeaders`). The `body` property is set to an instance of `path.ParsedPath`, this has two implications:
1) the content of the specified file will be loaded on-demand when the task is getting processed.
2) the `method` property will be set to `POST`, if it's not already otherwise defined by the task.

If the `body` property is set to a string, it is send as is.

If `fetchBody` is set to true (default is `false`) the response body will be fetched and `onBody` callback will be called, the `Content-Ecoding` specified by the server will be parsed and acted upon (i.e.: automatic gunzip).

Note that the automatic handling of `Content-Encoding` is not yet HTTP 1.1 complient ([RFC7231 Section 3.1.2.2](https://tools.ietf.org/html/rfc7231#section-3.1.2.2))

If `fetchBody` is set to false, the response body will be ignored and the `onBody` callback will NOT be called.

The response headers will be analysed by the `IsSuccessStatusCode` heaader policy,  defined in `Config.headerPolicies[]`. The `bodyPolicies` works the same as `headerPolicies`, these will only evaluated if `fetchBody` is set to `true`.

There are three callback functions for `onHeaders`, `onBody` and `onError`, which do nothing fancy in this example. Here you could hook into to check for special cases, not defined as a header- or body-policy.

# split task definitions into seperate files under ./configs
You can split your tasks into smaller files in the ./configs folder and include them in `config.js` with this snipped (at the end of the `Config` type constructor):

```js
/** @type {Task[]} */
this.tasks = [
  { enabled: false, url: 'https://www.microsoft.com/en-US/' }
]

const configFiles = fs.readdirSync('configs')
for (let index = 0; index < configFiles.length; index++) {
  const file = configFiles[index]
  if (!file.endsWith('.js')) continue
  const tasksFromFile = require(`./configs${path.sep}${file}`)
  for (let index = 0; index < tasksFromFile.length; index++) {
    const task = tasksFromFile[index]
    this.tasks.push(task)
  }
}
```

And here is what such an included file in `./configs/` could look like:
```js
/// <reference path="../index.d.ts" />

/* eslint-disable no-unused-vars */
const path = require('path')
const http = require('http')
const cheerio = require('cheerio')
/* eslint-enable no-unused-vars */

/** @type {Task[]} */
module.exports = [
  {
    enabled: true,
    url: 'https://compilenix.org/',
    fetchBody: true,
    headerPolicies: [
      { name: 'IsExpiresSet', enabled: false }
    ],
    bodyPolicies: [{ name: 'IsGreaterThan3k', enabled: true }],
    /**
     * @function
     * @param {http.IncomingMessage} res
     * @returns {string[] | void}
     */
    onHeaders: res => {
      let errorMessages = ['']
      if (res.statusCode !== 200) errorMessages.push(`Status code is not equal to "200", got \`${res.statusCode}\``)
      if (res.headers['etag'] !== undefined) errorMessages.push(`\`etag\` should not be present, but it is and has the value \`${res.headers['etag']}\``)
      if (res.headers['strict-transport-security'] !== 'max-age=63072000; includeSubDomains; preload') errorMessages.push(`\`strict-transport-security\` is not present or is not equal to "max-age=63072000; includeSubDomains; preload", got \`${res.headers['strict-transport-security']}\``)
      if (res.headers['content-security-policy'] !== `default-src 'self' data: 'unsafe-inline' 'unsafe-eval' *.compilenix.org compilenix.org dharma.no-trust.org *.googleapis.com *.gstatic.com *.google.com *.gravatar.com code.jquery.com; frame-ancestors 'self' ; form-action 'self' ; upgrade-insecure-requests; block-all-mixed-content; reflected-xss block; referrer no-referrer;`) errorMessages.push(`\`content-security-policy\` is not set or is not equal to "default-src 'self' data: 'unsafe-inline' 'unsafe-eval' *.compilenix.org compilenix.org dharma.no-trust.org *.googleapis.com *.gstatic.com *.google.com *.gravatar.com code.jquery.com; frame-ancestors 'self' ; form-action 'self' ; upgrade-insecure-requests; block-all-mixed-content; reflected-xss block; referrer no-referrer;", got \`${res.headers['content-security-policy']}\``)

      return errorMessages
    },
    /**
     * @function
     * @param {string} raw
     * @param {CheerioStatic} $
     * @returns {string[] | void}
     */
    onBody: (raw, $) => {
      let errorMessages = ['']
      if (!raw.startsWith('<!DOCTYPE html>')) errorMessages.push(`Document body does not start with "<!DOCTYPE html>", got \`${raw.substr(0, 20)}\``)
      if ($('title').text() !== 'Compilenix.org') errorMessages.push(`Title does not match "Compilenix.org", got \`${$('title').text()}\``)
      return errorMessages
    },
    /**
     * @function
     * @description here you handle any kind of error
     * @param {Error} error
     */
    onError: error => console.error(error)
  }
]

```

You may want to put those tasks under version control, too. just create a git repo into the `configs` folder and add a git remote, this will not collide with anyting in this project.

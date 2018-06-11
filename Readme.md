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
      return {isSuccessStatusCode: true}
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
    onError: error => {
      console.dir(error)
    }
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

/* eslint-disable no-unused-vars */
const path = require('path')
const http = require('http')
const cheerio = require('cheerio')
/* eslint-enable no-unused-vars */

class Config {
  constructor () {
    this.version = 1

    this.enableSlack = true
    this.slackWebHookUri = 'https://hooks.slack.com/services/xxxxxx/xxxxxx/xxxxxx'
    this.slackChannel = ''
    this.slackUsername = 'http-tester-bot'

    this.botName = 'http-tester-bot'
    this.botIcon = 'https://compilenix.org/cdn/Compilenix.png'

    /** @type {{key: string, value: string | number | string[]}[]} */
    this.defaultHeaders = [
      { key: 'User-Agent', value: 'Mozilla/5.0 (X11; Linux x86_64; rv:60.0) Gecko/20100101 Firefox/60.0' },
      { key: 'Accept', value: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
      { key: 'Accept-Language', value: 'en-US,en;q=0.7,de-DE,de;q=0.3' },
      { key: 'Accept-Encoding', value: 'identity;q=0.9, deflate;q=0.5, gzip;q=0.1, *;q=0' },
      { key: 'DNT', value: 1 },
      { key: 'Upgrade-Insecure-Requests', value: 1 },
      { key: 'Cache-Control', value: 'max-age=0' }
    ]
    this.defaultMethod = 'GET'
    this.defaultConnectionTimeoutMs = 10000
    this.defaultProtocolVersion = '1.1'

    /**
     * @type {{ name: string, validate: (res: http.IncomingMessage) => boolean, failureMessage: (res: http.IncomingMessage) => string}[]}
     */
    this.headerPolicies = [{
      name: 'IsSuccessStatusCode',
      /**
       * @function
       * @param {http.IncomingMessage} res
       * @returns {boolean}
       */
      validate: res => {
        return res.statusCode && res.statusCode < 400
      },
      /**
       * @function
       * @param {http.IncomingMessage} res
       * @returns {string}
       */
      failureMessage: res => `Status code does not indicate success: ${res.statusCode}`
    }]

    this.defaultHeaderPolicies = [
      'IsSuccessStatusCode'
    ]

    /**
     * @type {{name: string, validate: (raw: string, $: CheerioStatic) => boolean, failureMessage: (raw: string, $: CheerioStatic) => string}[]}
     */
    this.defaultBodyPolicies = [{
      name: 'IsGreaterThan3k',
      /**
       * @function
       * @param {string} raw
       * @param {CheerioStatic} $
       * @returns {boolean}
       */
      validate: (raw, $) => {
        return raw.length >= 3072
      },
      /**
       * @function
       * @param {string} raw
       * @param {CheerioStatic} $
       * @returns {string}
       */
      failureMessage: (raw, $) => `Response body is not greater than 3k, we got ${raw.length} bytes.`
    }]

    this.defaultHeaderPolicies = [
      'IsGreaterThan3k'
    ]

    /** @type {Task[]} */
    this.tasks = [
      // { url: 'http://www.microsoft.com' }, // minimal example
      { // full example
        url: 'https://compilenix.org',
        headers: [
          // - these headers do overwrite default headers
          // - if a header is 'null' or 'undefined' it will be removed
          {
            key: 'Upgrade-Insecure-Requests',
            value: null
          }
        ],
        fetchBody: true,
        bodyPolicies: [{ 'IsGreaterThan3k': false }],
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
  }
}

module.exports = new Config()

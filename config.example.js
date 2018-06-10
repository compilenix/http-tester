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

    /** @type {{url: string, method?: string, protocolVersion?: string, headers?: {key: string, value: string | number | string[]}[], body?: path.ParsedPath | string, onHeaders?: function, onBody?: function, onError?: function, fetchBody?: boolean, connectionTimeoutMs?: number}[]} */
    this.tasks = [
      // { url: 'http://www.microsoft.com' }, // minimal required definition
      {
        url: 'https://compilenix.org',
        protocolVersion: '1.1',
        headers: [
          // - these headers does overwrite default headers
          // - if a header is 'null' or 'undefined' it will be removed
          { key: 'Upgrade-Insecure-Requests', value: null }
        ],
        // body: path.parse('./LICENSE'),
        fetchBody: true,
        /**
         * @function
         * @param {http.IncomingMessage} res
         * @returns {boolean} true indicates sucess
         */
        onHeaders: res => {
          console.dir(res.headers)
          return true
        },
        /**
         * @function
         * @param {string} raw contains the parsed response body
         * @param {CheerioStatic} $
         * @see https://cheerio.js.org/
         */
        onBody: (res, $) => {
          console.dir(res)
          console.dir($)
        },
        /**
         * @function
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

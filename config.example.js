const path = require('path')
const http = require('http') // eslint-disable-line no-unused-vars

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
      { key: 'Accept-Encoding', value: 'gzip, deflate' },
      { key: 'DNT', value: 1 },
      { key: 'Upgrade-Insecure-Requests', value: 1 },
      { key: 'Cache-Control', value: 'max-age=0' }
    ]
    this.defaultMethod = 'GET'
    this.defaultConnectionTimeoutMs = 10000
    this.defaultProtocolVersion = '1.1'

    /** @type {{url: string, method?: string, protocolVersion?: string, headers?: {key: string, value: string | number | string[]}[], body?: path.ParsedPath | string, onHeaders?: function, onBody?: function, onError?: function, fetchBody?: boolean, connectionTimeoutMs?: number}[]} */
    this.tasks = [
      { url: 'http://www.microsoft.com' }, // minimal required definition
      {
        url: 'http://compilenix.org',
        protocolVersion: '1.1',
        // headers: [
        //   // - these headers does overwrite default headers
        //   // - if a header is 'null' or 'undefined' it will be removed
        //   { key: 'User-Agent', value: 'NodeJS http-tester' }
        // ],
        // body: path.parse('./LICENSE'),
        fetchBody: true,
        onHeaders: (/** @type {http.IncomingMessage} */ res) => {
          console.dir(res.rawHeaders)
        },
        onBody: (/** @type {string} */ res) => {
          console.dir(res)
        },
        onError: (/** @type {Error} */ error) => {
          console.dir(error)
        }
      }
    ]
  }
}

module.exports = new Config()

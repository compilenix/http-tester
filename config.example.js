/// <reference path="index.d.ts" />

const fs = require('fs-extra')

/* eslint-disable no-unused-vars */
const path = require('path')
const http = require('http')
const cheerio = require('cheerio')
/* eslint-enable no-unused-vars */

class Config {
  constructor () {
    this.adminContact = 'admin@example.com'

    this.enableConsoleLog = true
    this.consoleVerbose = false
    this.enableSlack = false
    this.slackWebHookUri = 'https://hooks.slack.com/services/xxxxxx/xxxxxx/xxxxxx'
    this.slackChannel = ''
    this.slackUsername = 'http-tester-bot'

    this.botName = 'http-tester-bot'
    this.botIcon = 'https://compilenix.org/cdn/Compilenix.png'

    /** @type {{key: string, value: string | number | string[]}[]} */
    this.defaultHeaders = [
      { key: 'User-Agent', value: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.87 Safari/537.36' },
      { key: 'Accept', value: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8' },
      { key: 'Accept-Language', value: 'en,de;q=0.9' },
      { key: 'Accept-Encoding', value: 'gzip, deflate, identity;q=0.2, *;q=0' },
      { key: 'Upgrade-Insecure-Requests', value: 1 },
      { key: 'From', value: 'user@example.com' } // See: https://tools.ietf.org/html/rfc7231#section-5.5.1
    ]
    this.defaultMethod = 'GET'
    this.defaultConnectionTimeoutMs = 10000
    this.waitBetweenRequestsMs = 1000
    this.defaultProtocolVersion = '1.1'

    /**
     * @type {{ name: string, validate: (res: http.IncomingMessage) => boolean, failureMessage: (res: http.IncomingMessage) => string}[]}
     */
    this.headerPolicies = [{
      name: 'IsSuccessStatusCode',
      validate: res => res.statusCode && res.statusCode < 400,
      failureMessage: res => `Status code does not indicate success: ${res.statusCode}`
    },
    {
      name: 'IsContentEncodedGzip',
      validate: res => res.headers['content-encoding'] === 'gzip',
      failureMessage: res => `\`content-encoding\` is not equal to "gzip", got \`${res.headers['content-encoding']}\``
    },
    {
      name: 'IsContentEncodedDeflate',
      validate: res => res.headers['content-encoding'] === 'deflate',
      failureMessage: res => `\`content-encoding\` is not equal to "deflate", got \`${res.headers['content-encoding']}\``
    },
    {
      name: 'IsContentEncodedBrotli',
      validate: res => res.headers['content-encoding'] === 'br',
      failureMessage: res => `\`content-encoding\` is not equal to "br", got \`${res.headers['content-encoding']}\``
    },
    {
      name: 'IsContentTypeHtml',
      validate: res => res.headers['content-type'] && (res.headers['content-type'].indexOf('text/html') >= 0),
      failureMessage: res => `\`content-type\` does not match "text/html", got \`${res.headers['content-type']}\``
    },
    {
      name: 'IsContentTypeJavaScript',
      validate: res => res.headers['content-type'] && (res.headers['content-type'].indexOf('/javascript') >= 0),
      failureMessage: res => `\`content-type\` does not match "/javascript", got \`${res.headers['content-type']}\``
    },
    {
      name: 'IsContentTypeCSS',
      validate: res => res.headers['content-type'] && (res.headers['content-type'].indexOf('/css') >= 0),
      failureMessage: res => `\`content-type\` does not match "text/css", got \`${res.headers['content-type']}\``
    },
    {
      name: 'IsLastModifiedValidDate',
      validate: res => {
        try {
          return res.headers['last-modified'] && (typeof Date.parse(res.headers['last-modified']) === 'number')
        } catch (error) {
          return false
        }
      },
      failureMessage: res => `\`last-modified\` is not a valid date, got \`${res.headers['last-modified']}\``
    },
    {
      name: 'IsX-UA-CompatibleSet',
      validate: res => res.headers['x-ua-compatible'] && res.headers['x-ua-compatible'] === 'IE=edge',
      failureMessage: res => `\`x-ua-compatible\` is not set or is not equal to "IE=edge", we got \`${res.headers['x-ua-compatible']}\``
    },
    {
      name: 'IsExpiresSet',
      validate: res => res.headers['expires'] && res.headers['expires'].length > 0,
      failureMessage: res => `\`expires\` is not set but it should be`
    },
    {
      name: 'IsCacheControlSet',
      validate: res => res.headers['cache-control'] && res.headers['cache-control'].length > 0,
      failureMessage: res => `\`cache-control\` is not set but it should be`
    },
    {
      name: 'IsContentTypeSniffingSet',
      validate: res => res.headers['x-content-type-options'] && res.headers['x-content-type-options'] === `nosniff`,
      failureMessage: res => {
        if (res.headers['x-content-type-options']) {
          return `\`x-content-type-options\` is set but it has the wrong value, expected \`nosniff\` but got \`${res.headers['x-content-type-options']}\``
        }
        return `\`x-content-type-options\` is not set but it should be`
      }
    },
    {
      name: 'IsXSSProtectionSet',
      validate: res => res.headers['x-xss-protection'] && res.headers['x-xss-protection'] === `1; mode=block`,
      failureMessage: res => {
        if (res.headers['x-xss-protection']) {
          return `\`x-xss-protection\` is set but it has the wrong value, expected \`nosniff\` but got \`${res.headers['x-xss-protection']}\``
        }
        return `\`x-xss-protection\` is not set but it should be`
      }
    },
    {
      name: 'IsFrameOptionsSet',
      validate: res => {
        return typeof res.headers['x-frame-options'] === 'string' && (
          res.headers['x-frame-options'] === `DENY` ||
          res.headers['x-frame-options'] === `SAMEORIGIN` ||
          /`ALLOW-FROM `/i.test(res.headers['x-frame-options'].toString()) // calling toString() to make ts-lint happy
        )
      },
      failureMessage: res => {
        if (res.headers['x-frame-options']) {
          return `\`x-frame-options\` is set but it has a wrong value, expected \`DENY\`, \`SAMEORIGIN\` or \`ALLOW-FROM {some url}\` but got \`${res.headers['x-frame-options']}\``
        }
        return `\`x-frame-options\` is not set but it should be`
      }
    },
    {
      name: 'IsRefererPolicySet',
      validate: res => {
        return typeof res.headers['referrer-policy'] === 'string' && (
          res.headers['referrer-policy'] === `no-referrer` ||
          res.headers['referrer-policy'] === `no-referrer-when-downgrade` ||
          res.headers['referrer-policy'] === `origin` ||
          res.headers['referrer-policy'] === `origin-when-cross-origin` ||
          res.headers['referrer-policy'] === `same-origin` ||
          res.headers['referrer-policy'] === `strict-origin` ||
          res.headers['referrer-policy'] === `strict-origin-when-cross-origin` ||
          res.headers['referrer-policy'] === `unsafe-url`
        )
      },
      failureMessage: res => {
        if (res.headers['referrer-policy']) {
          return `\`referrer-policy\` is set but it has a wrong value, expected \`no-referrer\`, \`no-referrer-when-downgrade\`, \`origin\`, \`origin-when-cross-origin\`, \`same-origin\`, \`strict-origin\`, \`strict-origin-when-cross-origin\` or \`unsafe-url\` but got \`${res.headers['referrer-policy']}\``
        }
        return `\`referrer-policy\` is not set but it should be`
      }
    },
    {
      name: 'IsContentSecurityPolicySet',
      validate: res => typeof res.headers['content-security-policy'] === 'string' && res.headers['content-security-policy'].length > 10,
      failureMessage: res => {
        if (res.headers['content-security-policy']) {
          return `\`content-security-policy\` is set but it has a wrong value, expected something lengthier than 10 characters but got \`${res.headers['content-security-policy']}\``
        }
        return `\`content-security-policy\` is not set but it should be`
      }
    },
    {
      name: 'IsStrictTransportSecuritySet',
      validate: res => typeof res.headers['strict-transport-security'] === 'string' && res.headers['strict-transport-security'].length > 8,
      failureMessage: res => {
        if (res.headers['strict-transport-security']) {
          return `\`strict-transport-security\` is set but it has a wrong value, expected something lengthier than 8 characters but got \`${res.headers['strict-transport-security']}\``
        }
        return `\`strict-transport-security\` is not set but it should be`
      }
    },
    {
      name: 'IsContentSecurityPolicyReportingOnlySet',
      validate: res => typeof res.headers['content-security-policy-report-only'] === 'string' && res.headers['content-security-policy-report-only'].length > 23,
      failureMessage: res => {
        if (res.headers['content-security-policy-report-only']) {
          return `\`content-security-policy-report-only\` is set but it has a wrong value, expected something lengthier than 23 characters but got \`${res.headers['content-security-policy-report-only']}\``
        }
        return `\`content-security-policy-report-only\` is not set but it should be`
      }
    },
    {
      name: 'IsServerHeaderNotPresent',
      validate: res => !res.headers['server'],
      failureMessage: res => `\`server\` is set but it should not be set, got \`${res.headers['server']}\``
    },
    {
      name: 'IsXPoweredByHeaderNotPresent',
      /**
       * @function
       * @param {http.IncomingMessage} res
       * @returns {boolean}
       */
      validate: res => {
        return !res.headers['x-powered-by']
      },
      /**
       * @function
       * @param {http.IncomingMessage} res
       * @returns {string}
       */
      failureMessage: res => `\`x-powered-by\` is set but it should not be set, got \`${res.headers['x-powered-by']}\``
    },
    {
      name: 'IsETagNotPresent',
      /**
       * @function
       * @param {http.IncomingMessage} res
       * @returns {boolean}
       */
      validate: res => {
        return !res.headers['etag']
      },
      /**
       * @function
       * @param {http.IncomingMessage} res
       * @returns {string}
       */
      failureMessage: res => `\`etag\` should not be present, but it is and has the value \`${res.headers['etag']}\``
    }]

    this.defaultHeaderPolicies = [
      'IsSuccessStatusCode',
      'IsContentEncodedGzip',
      'IsContentTypeHtml',
      'IsLastModifiedValidDate',
      'IsX-UA-CompatibleSet',
      'IsExpiresSet',
      'IsCacheControlSet',
      'IsContentTypeSniffingSet',
      'IsXSSProtectionSet',
      'IsFrameOptionsSet',
      'IsRefererPolicySet',
      'IsContentSecurityPolicySet',
      'IsStrictTransportSecuritySet',
      'IsServerHeaderNotPresent',
      'IsXPoweredByHeaderNotPresent',
      'IsETagNotPresent'
    ]

    /**
     * @type {{name: string, validate: (raw: string, $: CheerioStatic) => boolean, failureMessage: (raw: string, $: CheerioStatic) => string}[]}
     */
    this.bodyPolicies = [{
      name: 'IsGreaterThan3k',
      validate: (raw, $) => raw.length >= 3072,
      failureMessage: (raw, $) => `Response body is not greater than 3k, we got ${raw.length} bytes.`
    },
    {
      name: 'StartsWithHtml5doctype',
      validate: (raw, $) => raw.startsWith('<!DOCTYPE html>'),
      failureMessage: (raw, $) => `Document body does not start with "<!DOCTYPE html>", got \`${raw.substr(0, 20).replace(/\n/g, '')}\``
    },
    {
      name: 'IsGreaterThan512b',
      /**
       * @function
       * @param {string} raw
       * @param {CheerioStatic} $
       * @returns {boolean}
       */
      validate: (raw, $) => raw.length >= 512,
      /**
       * @function
       * @param {string} raw
       * @param {CheerioStatic} $
       * @returns {string}
       */
      failureMessage: (raw, $) => `Response body is not greater than 512 bytes, we got ${raw.length} bytes.`
    }]

    this.defaultBodyPolicies = [
      'IsGreaterThan3k',
      'StartsWithHtml5doctype'
    ]

    /** @type {Task[]} */
    this.tasks = [
      { enabled: false, url: 'https://www.microsoft.com/en-US/' }, // minimal example
      { // full example
        enabled: true,
        url: 'https://blog.compilenix.org/code/723',
        headers: [
          // - these headers do overwrite default headers
          // - if a header is 'null' or 'undefined' it will be removed
          {
            key: 'Upgrade-Insecure-Requests',
            value: null
          }
        ],
        fetchBody: true,
        headerPolicies: [
          { name: 'IsSuccessStatusCode', enabled: false },
          { name: 'IsLastModifiedValidDate', enabled: false },
          { name: 'IsExpiresSet', enabled: false }
        ],
        bodyPolicies: [{ name: 'IsGreaterThan3k', enabled: false }],
        /**
         * @function
         * @param {http.IncomingMessage} res
         * @returns {string[] | void}
         */
        onHeaders: res => {
          let errorMessages = ['']
          if (res.statusCode !== 723) errorMessages.push(`Status code is not equal to "723", got \`${res.statusCode}\``)
          if (res.headers['etag'] !== undefined) errorMessages.push(`\`etag\` should not be present, but it is and has the value \`${res.headers['etag']}\``)
          if (res.headers['strict-transport-security'] !== 'max-age=15768000; includeSubDomains; preload') errorMessages.push(`\`strict-transport-security\` is not present or is not equal to "max-age=15768000; includeSubDomains; preload", got \`${res.headers['strict-transport-security']}\``)
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
          if ($('title').text() !== '723 Tricky') errorMessages.push(`Title does not match "723 Tricky", got \`${$('title').text()}\``)
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

    if (!fs.existsSync('configs')) {
      fs.mkdirSync('configs')
    }

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
  }
}

module.exports = new Config()

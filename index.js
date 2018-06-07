const http = require('http')
const https = require('https')
const http2 = require('http2')
const { URL } = require('url')
const path = require('path')

const fs = require('fs-extra')
const moment = require('moment')
const Slack = require('slack-node')
const punycode = require('./node_modules/punycode')

if (!fs.existsSync('./config.js')) {
  fs.copySync('./config.example.js', './config.js')
}

let config = require('./config.js')
let slack = new Slack()
/** @type {{message: string, ts: number, color: string}[]} */
let messagesToSend = []

function uniqueArray (/** @type {any[]} */ arr) {
  return Array.from(new Set(arr))
}

/**
 * @param {number} ms
 * @returns {Promise<void>}
 */
async function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function sendReport () {
  let payloads = []
  let attachments = []
  for (let index = 0; index < messagesToSend.length; index++) {
    const { message, ts, color } = messagesToSend[index]
    const attachment = {
      footer: config.botName || undefined,
      footer_icon: config.botIcon || undefined,
      color: color
    }
    if (attachment.footer === undefined) delete attachment.footer
    if (attachment.footer_icon === undefined) delete attachment.footer_icon

    attachment.fallback = `${message}`
    attachment.text = attachment.fallback
    attachment.ts = ts
    attachments.push(attachment)

    if (attachments.length > 18 || index === messagesToSend.length - 1) {
      let payload = {
        channel: config.slackChannel || undefined,
        username: config.slackUsername || undefined,
        attachments: attachments
      }
      attachments = []

      if (payload.channel === undefined) delete payload.channel
      if (payload.username === undefined) delete payload.username
      payloads.push(payload)
    }
  }

  for (let index = 0; index < payloads.length; index++) {
    const payload = payloads[index]
    slack.webhook(payload, (err, response) => {
      if (err) console.log(err, response)
    })
    await sleep(1000) // comply to slack api rate limiting
  }
}

/**
 * @param {string} message
 * @param {string} method
 * @param {string} uri
 */
function addMessage (message, method, uri, level = 'error') {
  let color = '#d50200' // error
  switch (level) {
    case 'warn':
      color = '#de9e31'
      break
  }

  messagesToSend.push({
    message: `${method} ${uri} -> ${message}\n`,
    ts: Date.now() / 1000,
    color: color
  })
}

async function run () {
  for (let index = 0; index < config.tasks.length; index++) {
    const task = config.tasks[index]
    if (!task.url) {
      addMessage(`\`uri\` is not present on task (index ${index}): \`\`\`${JSON.stringify(task, null, 4)}\`\`\``, task.method, task.url)
      continue
    }

    const url = new URL(task.url)
    let isEncrypted = url.protocol === 'https:'
    let method = task.method || config.defaultMethod || 'GET'

    if (task.body && !task.method) method = 'POST'

    if (task.body && typeof task.body !== 'string') {
      /** @type {path.ParsedPath} */
      let parsedPath = task.body
      task.body = await fs.readFile(`${parsedPath.dir}${path.sep}${parsedPath.base}`, { encoding: 'utf8' })
    }

    await new Promise(async (resolve, reject) => {
      switch (task.protocolVersion || config.defaultProtocolVersion || '1.1') {
        case '1.0':
        case '1.1':
          if (isEncrypted) {
            // TODO: handle
            console.error(new Error('Not implemented'))
          } else {
            let rawData = ''
            let req = new http.ClientRequest({
              timeout: task.connectionTimeoutMs || config.defaultConnectionTimeoutMs || 2500,
              href: url.href,
              method: method,
              host: url.host,
              hostname: url.hostname,
              pathname: url.pathname,
              search: url.search,
              hash: url.hash
            }, res => {
              res.setEncoding('utf8')
              res.on('error', error => {
                if (task.onError) {
                  task.onError(error)
                } else {
                  console.dir(error)
                }
                resolve()
              })
              if (task.onHeaders) {
                task.onHeaders(res)
              }

              console.log(`${task.url} -> ${res.statusCode}`)

              if (res.statusCode >= 400) addMessage(`Status code does not indicate success: ${res.statusCode}`, task.method || config.defaultMethod, task.url)

              if (task.fetchBody) {
                res.on('data', chunk => {
                  rawData += chunk
                })
                res.on('end', () => {
                  if (task.onBody) task.onBody(rawData)
                  resolve()
                })
              } else {
                res.on('end', () => {
                  resolve()
                })
                res.emit('end')
              }
            })

            req.setNoDelay(true)
            req.setSocketKeepAlive(false)
            req.setTimeout(task.connectionTimeoutMs || config.defaultConnectionTimeoutMs || 2500)

            if (config.defaultHeaders && config.defaultHeaders.length > 0) {
              for (let index = 0; index < config.defaultHeaders.length; index++) {
                const header = config.defaultHeaders[index]
                req.setHeader(header.key, header.value)
              }
            }

            if (task.headers && task.headers.length > 0) {
              for (let index = 0; index < config.defaultHeaders.length; index++) {
                const header = config.defaultHeaders[index]
                req.setHeader(header.key, header.value)
              }
            }

            req.on('error', error => {
              if (task.onError) task.onError(error)
              resolve()
            })
            // @ts-ignore here is task.body.length always "falsy" or a string
            if (task.body && task.body.length > 0) {
              try {
                req.write(task.body)
              } catch (error) {
                console.dir(error)
                // TODO: handle?
              }
            } else {
              req.end()
            }
          }
          break
        case '2.0':
          console.error(new Error('Not implemented'))
          // TODO: handle
          break
        default:
          console.error(new Error('Not implemented'))
          // TODO: error
          break
      }
    })
  }
}

(async () => {
  slack.setWebhook(config.slackWebHookUri)
  await run()
  await sendReport()
  console.log('done')
})()

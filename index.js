const http = require('http')
const https = require('https')
const { URL } = require('url')
const path = require('path')
const zlib = require('zlib')
const { Readable } = require('stream')

const fs = require('fs-extra')
const Slack = require('slack-node')
// const punycode = require('./node_modules/punycode')
const cheerio = require('cheerio')
const StreamToString = require('stream-to-string')

// if (!fs.existsSync('./config.js')) {
fs.copySync('./config.example.js', './config.js')
// }

let config = require('./config.js')
let slack = new Slack()
/** @type {{message: string, ts: number, color: string}[]} */
let messagesToSend = []

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

/**
 * @param {http.IncomingMessage} res
 * @param {{url: string, method?: string, protocolVersion?: string, headers?: {key: string, value: string | number | string[]}[], body?: path.ParsedPath | string, onHeaders?: function, onBody?: function, onError?: function, fetchBody?: boolean, connectionTimeoutMs?: number}} task
 * @param {function} resolve
 * @param {function} reject
 */
function handleHttpClientResponse (res, task, resolve, reject) {
  setupResolveResponseError(res, task, resolve)
  console.log(`${task.url} -> ${res.statusCode}`)
  if (invokeOnHeadersCallback(res, task) && res.statusCode >= 400) addMessage(`Status code does not indicate success: ${res.statusCode}`, task.method || config.defaultMethod, task.url)
  setupResolveResponseBody(res, task, resolve)
}

/**
 * @param {http.ClientRequest} req
 * @param {{url: string, method?: string, protocolVersion?: string, headers?: {key: string, value: string | number | string[]}[], body?: path.ParsedPath | string, onHeaders?: function, onBody?: function, onError?: function, fetchBody?: boolean, connectionTimeoutMs?: number}} task
 * @param {function} resolve
 */
function setupRequest (req, task, resolve) {
  req.setNoDelay(true)
  req.setSocketKeepAlive(false)
  req.setTimeout(task.connectionTimeoutMs || config.defaultConnectionTimeoutMs || 2500)

  if (config.defaultHeaders && config.defaultHeaders.length > 0) {
    for (let index = 0; index < config.defaultHeaders.length; index++) {
      const header = config.defaultHeaders[index]
      if (header.value === null || header.value === undefined) {
        req.removeHeader(header.key)
      } else {
        req.setHeader(header.key, header.value)
      }
    }
  }

  if (task.headers && task.headers.length > 0) {
    for (let index = 0; index < task.headers.length; index++) {
      const header = task.headers[index]
      if (header.value === null || header.value === undefined) {
        req.removeHeader(header.key)
      } else {
        req.setHeader(header.key, header.value)
      }
    }
  }

  setupRequestError(req, task, resolve)
}

/**
 * @param {http.ClientRequest} req
 * @param {{url: string, method?: string, protocolVersion?: string, headers?: {key: string, value: string | number | string[]}[], body?: path.ParsedPath | string, onHeaders?: function, onBody?: function, onError?: function, fetchBody?: boolean, connectionTimeoutMs?: number}} task
 * @param {function} resolve
 */
function setupRequestError (req, task, resolve) {
  req.on('error', error => {
    if (task.onError) task.onError(error)
    resolve()
  })
}

/**
 * @param {http.ClientRequest} req
 * @param {{url: string, method?: string, protocolVersion?: string, headers?: {key: string, value: string | number | string[]}[], body?: path.ParsedPath | string, onHeaders?: function, onBody?: function, onError?: function, fetchBody?: boolean, connectionTimeoutMs?: number}} task
 */
function sendRequestBodySync (req, task) {
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

/**
 * @param {http.IncomingMessage} res
 * @param {{url: string, method?: string, protocolVersion?: string, headers?: {key: string, value: string | number | string[]}[], body?: path.ParsedPath | string, onHeaders?: function, onBody?: function, onError?: function, fetchBody?: boolean, connectionTimeoutMs?: number}} task
 * @param {function} resolve
 */
function setupResolveResponseError (res, task, resolve) {
  res.on('error', error => {
    if (task.onError) {
      task.onError(error)
    } else {
      console.dir(error)
    }
    resolve()
  })
}

/**
 * @param {http.IncomingMessage} res
 * @param {{url: string, method?: string, protocolVersion?: string, headers?: {key: string, value: string | number | string[]}[], body?: path.ParsedPath | string, onHeaders?: function, onBody?: function, onError?: function, fetchBody?: boolean, connectionTimeoutMs?: number}} task
 */
function invokeOnHeadersCallback (res, task) {
  if (task.onHeaders) {
    task.onHeaders(res)
  }
}

/**
 * @param {http.IncomingMessage} res
 * @param {{url: string, method?: string, protocolVersion?: string, headers?: {key: string, value: string | number | string[]}[], body?: path.ParsedPath | string, onHeaders?: function, onBody?: function, onError?: function, fetchBody?: boolean, connectionTimeoutMs?: number}} task
 * @param {function} resolve
 */
function setupResolveResponseBody (res, task, resolve) {
  if (!task.fetchBody) {
    res.on('end', () => {
      resolve()
    })
    res.emit('end')
    return
  }

  if (res.headers['content-encoding']) {
    switch (res.headers['content-encoding'].toLowerCase()) {
      case 'deflate':
      case 'gzip':
        break
      default:
        res.setEncoding('utf8')
        break
    }
  } else {
    res.setEncoding('utf8')
  }

  let readable = new Readable()
  readable._read = () => {}
  res.on('data', chunk => {
    readable.push(chunk)
  })

  res.on('end', async () => {
    if (!task.onBody) {
      resolve()
      return
    }

    readable.push(null)
    let rawBody = ''
    if (res.headers['content-encoding']) {
      switch (res.headers['content-encoding'].toLowerCase()) {
        case 'deflate':
          rawBody = await StreamToString(readable.pipe(zlib.createInflate()))
          break
        case 'gzip':
          rawBody = await StreamToString(readable.pipe(zlib.createGunzip()))
          break
        default:
          rawBody = await StreamToString(readable)
          break
      }
    } else {
      rawBody = await StreamToString(readable)
    }

    let $ = cheerio.load(rawBody)
    task.onBody(rawBody, $)
    resolve()
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

    let clientRequest = {
      timeout: task.connectionTimeoutMs || config.defaultConnectionTimeoutMs || 2500,
      href: url.href,
      method: method,
      host: url.host,
      hostname: url.hostname,
      pathname: url.pathname,
      search: url.search,
      hash: url.hash
    }

    await new Promise(async (resolve, reject) => {
      switch (task.protocolVersion || config.defaultProtocolVersion || '1.1') {
        case '1.0':
        case '1.1':
          if (isEncrypted) {
            let req = https.request(clientRequest, res => {
              handleHttpClientResponse(res, task, resolve, reject)
            })
            setupRequest(req, task, resolve)
            sendRequestBodySync(req, task)
          } else {
            let req = http.request(clientRequest, res => {
              handleHttpClientResponse(res, task, resolve, reject)
            })
            setupRequest(req, task, resolve)
            sendRequestBodySync(req, task)
          }
          break
        case '2.0':
          console.error(new Error('Not implemented'))
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

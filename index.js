const http = require('http')
const https = require('https')
const http2 = require('http2')
const { URL } = require('url')

const fs = require('fs-extra')
const moment = require('moment')
const Slack = require('slack-node')
const punycode = require('./node_modules/punycode')

// if (!fs.existsSync('./config.js')) {
fs.copySync('./config.example.js', './config.js')
// }

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

function checkHeaders (headers) {
}

function checkBody (body) {
}

async function run () {
  for (let index = 0; index < config.tasks.length; index++) {
    const task = config.tasks[index]
    let headers
    let body
    let isEncrypted = false

    if (!task.url) {
      addMessage(`\`uri\` is not present on task (index ${index}): \`\`\`${JSON.stringify(task, null, 4)}\`\`\``, task.method, task.url)
    }
    const url = new URL(task.url)

    if (task.url.startsWith('https')) {
      isEncrypted = true
    }

    switch (task.protocolVersion) {
      case '1.0':
      case '1.1':
        if (isEncrypted) {
        } else {
          let req = new http.ClientRequest(url, res => {

          })
          req.setHeader()
        }
        break
      case '2.0':
        // TODO: handle
        break
      default:
        // TODO: error
        break
    }
  }
}

(async () => {
  slack.setWebhook(config.slackWebHookUri)
  await run()
  await sendReport()
  console.log('done')
})()

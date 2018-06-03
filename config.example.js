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
      { key: 'Connection', value: 'close' },
      { key: 'Upgrade-Insecure-Requests', value: 1 },
      { key: 'Cache-Control', value: 'max-age=0' }
    ]

    /** @type {{url: string, method?: string, protocolVersion?: string, port?: number, payload?: string}[]} */
    this.tasks = [
      { url: 'http://www.microsoft.com' },
      { url: 'http://compilenix.org', method: 'GET', protocolVersion: '2.0' }
    ]
  }
}

module.exports = new Config()

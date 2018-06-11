/// <reference path="typings/index.d.ts" />

interface Task {
  url: string,
  method?: string,
  protocolVersion?: string,
  headers?: { key: string, value: string | number | string[] }[],
  body?: path.ParsedPath | string,
  onHeaders?: (res: http.IncomingMessage) => string[] | void,
  onBody?: (raw: string, $: CheerioStatic) => string[] | void,
  onError?: (error: Error) => void,
  fetchBody?: boolean,
  headerPolicies?: Array<string | { [x: string]: boolean }>,
  bodyPolicies?: Array<string | { [x: string]: boolean }>,
  connectionTimeoutMs?: number
}

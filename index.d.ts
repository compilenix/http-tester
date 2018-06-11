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
  headerPolicies?: { name: string, enabled: boolean }[],
  bodyPolicies?: { name: string, enabled: boolean }[],
  connectionTimeoutMs?: number
}

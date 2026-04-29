/**
 * Type-shim for the `osc` npm package, which ships without .d.ts. We
 * only declare what LivefireOsc actually uses; everything else stays
 * `any` so the runtime keeps working without us tracking upstream
 * exactly.
 */
declare module 'osc' {
  export interface UDPPortOptions {
    localAddress?: string
    localPort?: number
    remoteAddress?: string
    remotePort?: number
    metadata?: boolean
  }

  export interface OscMessage {
    address: string
    args: any[]
  }

  export class UDPPort {
    constructor(opts: UDPPortOptions)
    open(): void
    close(): void
    send(message: OscMessage): void
    on(event: 'message', listener: (msg: OscMessage) => void): this
    on(event: 'error', listener: (err: Error) => void): this
    on(event: string, listener: (...args: any[]) => void): this
  }
}

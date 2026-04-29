/**
 * OSC client + server. Outgoing UDPPort sends commands to liveFire's
 * OSC-input. Incoming UDPPort listens for liveFire's feedback push and
 * dispatches to a callback.
 *
 * Belangrijk: `UDPPort.open()` is async — de socket is pas bind'd
 * wanneer 't `ready`-event afgaat. Tot die tijd worden send()-calls
 * stilletjes gedropt door de osc-library. We awaiten `ready` voor
 * beide ports voordat start() resolved, zodat Companion pas op "OK"
 * staat als we daadwerkelijk kunnen versturen.
 */
import { InstanceStatus } from '@companion-module/base'
import * as osc from 'osc'

export interface LivefireOscOptions {
  host: string
  cmdPort: number
  feedbackPort: number
  onMessage: (address: string, args: any[]) => void
  onStatus: (status: InstanceStatus, message?: string) => void
  /** Optional logger — Companion's instance has a `.log(level, msg)` method
   *  that surfaces in Settings → Log. We gebruiken 'm voor debug-traces
   *  zodat operators in 't veld kunnen zien of er daadwerkelijk OSC
   *  uitgaat. */
  log?: (level: 'debug' | 'info' | 'warn' | 'error', msg: string) => void
}

const READY_TIMEOUT_MS = 2000

function awaitReady(port: any): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    let settled = false
    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      reject(new Error(`UDP port did not become ready within ${READY_TIMEOUT_MS}ms`))
    }, READY_TIMEOUT_MS)
    port.once('ready', () => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve()
    })
    port.once('error', (err: Error) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      reject(err)
    })
  })
}

export class LivefireOsc {
  private opts: LivefireOscOptions
  private outgoing: osc.UDPPort | undefined
  private incoming: osc.UDPPort | undefined
  private outgoingReady = false

  constructor(opts: LivefireOscOptions) {
    this.opts = opts
  }

  async start(): Promise<void> {
    // Outgoing port — we don't need to receive on it, but the osc lib
    // requires an open port to send. Bind to localhost ephemeral.
    this.outgoing = new osc.UDPPort({
      localAddress: '0.0.0.0',
      localPort: 0,
      remoteAddress: this.opts.host,
      remotePort: this.opts.cmdPort,
      metadata: false,
    })
    this.outgoing.on('error', (err: Error) => {
      this.opts.onStatus(
        InstanceStatus.UnknownWarning,
        `OSC out error: ${err}`,
      )
      this.opts.log?.('warn', `OSC out error: ${err}`)
    })

    // Incoming port — bound to feedbackPort, listens for liveFire pushes.
    this.incoming = new osc.UDPPort({
      localAddress: '0.0.0.0',
      localPort: this.opts.feedbackPort,
      metadata: false,
    })
    this.incoming.on('message', (msg: { address: string; args: any[] }) => {
      const args = (msg.args || []).map((a: any) => {
        // osc lib wraps args as { type, value } when metadata=true; we
        // turned that off so args are raw values, but be defensive.
        return typeof a === 'object' && a !== null && 'value' in a
          ? a.value
          : a
      })
      // Trace iedere binnenkomende OSC-message naar Companion's log
      // zodat operators kunnen zien of de feedback-link daadwerkelijk
      // pakketten ontvangt.
      this.opts.log?.('info', `OSC in ← ${msg.address} ${JSON.stringify(args)}`)
      this.opts.onMessage(msg.address, args)
    })
    // raw-data hook: vuurt zelfs als het pakket niet als geldige OSC
    // wordt geparsed. Handig om "wel UDP, geen OSC"-issues te zien.
    this.incoming.on('raw', (data: Buffer) => {
      this.opts.log?.(
        'info',
        `OSC in raw ${data.length} bytes`,
      )
    })
    this.incoming.on('error', (err: Error) => {
      this.opts.onStatus(
        InstanceStatus.UnknownWarning,
        `OSC in error: ${err}`,
      )
      this.opts.log?.('warn', `OSC in error: ${err}`)
    })

    // Beide ports openen + wachten tot ze daadwerkelijk geboend zijn.
    // Pas dán resolved start() — vóór die tijd faalt elke send()
    // stilletjes omdat de udp4 socket nog niet bind() heeft afgerond.
    const outgoingReady = awaitReady(this.outgoing)
    const incomingReady = awaitReady(this.incoming)
    this.outgoing.open()
    this.incoming.open()
    await Promise.all([outgoingReady, incomingReady])
    this.outgoingReady = true
    this.opts.log?.(
      'info',
      `OSC link up: out → ${this.opts.host}:${this.opts.cmdPort}, ` +
        `in ← :${this.opts.feedbackPort}`,
    )
  }

  send(address: string, args: any[] = []): void {
    if (!this.outgoing) {
      this.opts.log?.('warn', `OSC send '${address}' skipped: outgoing not initialised`)
      return
    }
    if (!this.outgoingReady) {
      this.opts.log?.('warn', `OSC send '${address}' skipped: outgoing not ready yet`)
      return
    }
    try {
      this.outgoing.send({ address, args })
      this.opts.log?.('info', `OSC out → ${address} ${JSON.stringify(args)}`)
    } catch (e) {
      this.opts.onStatus(
        InstanceStatus.UnknownWarning,
        `OSC send failed: ${e}`,
      )
      this.opts.log?.('warn', `OSC send '${address}' failed: ${e}`)
    }
  }

  shutdown(): void {
    this.outgoingReady = false
    try {
      this.outgoing?.close()
    } catch {
      /* ignore */
    }
    try {
      this.incoming?.close()
    } catch {
      /* ignore */
    }
    this.outgoing = undefined
    this.incoming = undefined
  }
}

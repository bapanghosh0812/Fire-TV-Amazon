import type { ClientAction, RoomEvent } from '@storyloom/protocol';

type Listener = (e: RoomEvent) => void;
type StatusListener = (connected: boolean) => void;

/**
 * Resilient WebSocket to the room channel: reconnects with backoff, queues
 * messages while offline and keeps the connection warm with pings.
 */
export class RoomSocket {
  private ws?: WebSocket;
  private listeners = new Set<Listener>();
  private statusListeners = new Set<StatusListener>();
  private queue: string[] = [];
  private retry = 0;
  private closed = false;
  private pingTimer?: ReturnType<typeof setInterval>;
  private url: string;

  constructor(url: string) {
    this.url = url;
    this.open();
  }

  private open() {
    if (this.closed) return;
    const ws = new WebSocket(this.url);
    this.ws = ws;
    ws.onopen = () => {
      this.retry = 0;
      this.emitStatus(true);
      this.queue.splice(0).forEach((m) => ws.send(m));
      this.pingTimer = setInterval(() => this.send({ action: 'ping' }), 25000);
    };
    ws.onmessage = (msg) => {
      try {
        const event = JSON.parse(msg.data) as RoomEvent;
        this.listeners.forEach((l) => l(event));
      } catch {
        /* ignore malformed frames */
      }
    };
    ws.onclose = () => {
      clearInterval(this.pingTimer);
      this.emitStatus(false);
      if (this.closed) return;
      const delay = Math.min(8000, 400 * 2 ** this.retry++);
      setTimeout(() => this.open(), delay);
    };
    ws.onerror = () => ws.close();
  }

  send(action: ClientAction) {
    const data = JSON.stringify(action);
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(data);
    else if (action.action !== 'ping') this.queue.push(data);
  }

  on(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onStatus(listener: StatusListener) {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  private emitStatus(connected: boolean) {
    this.statusListeners.forEach((l) => l(connected));
  }

  close() {
    this.closed = true;
    clearInterval(this.pingTimer);
    this.ws?.close();
  }
}

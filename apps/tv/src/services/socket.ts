import type { ClientAction, RoomEvent } from '@storyloom/protocol';

type Listener = (e: RoomEvent) => void;

/** Room channel with automatic reconnect, offline queue and keep-alive. */
export class RoomSocket {
  private ws?: WebSocket;
  private listeners = new Set<Listener>();
  private statusListeners = new Set<(up: boolean) => void>();
  private queue: string[] = [];
  private retry = 0;
  private closed = false;
  private ping?: ReturnType<typeof setInterval>;

  constructor(private url: string) {
    this.open();
  }

  private open() {
    if (this.closed) return;
    const ws = new WebSocket(this.url);
    this.ws = ws;
    ws.onopen = () => {
      this.retry = 0;
      this.statusListeners.forEach((l) => l(true));
      this.queue.splice(0).forEach((m) => ws.send(m));
      ws.send(JSON.stringify({ action: 'sync' }));
      this.ping = setInterval(() => this.send({ action: 'ping' }), 25000);
    };
    ws.onmessage = (msg) => {
      try {
        const e = JSON.parse(String(msg.data)) as RoomEvent;
        this.listeners.forEach((l) => l(e));
      } catch {}
    };
    ws.onclose = () => {
      if (this.ping) clearInterval(this.ping);
      this.statusListeners.forEach((l) => l(false));
      if (this.closed) return;
      setTimeout(() => this.open(), Math.min(8000, 500 * 2 ** this.retry++));
    };
    ws.onerror = () => ws.close();
  }

  send(action: ClientAction) {
    const data = JSON.stringify(action);
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(data);
    else if (action.action !== 'ping') this.queue.push(data);
  }

  on(l: Listener) {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  onStatus(l: (up: boolean) => void) {
    this.statusListeners.add(l);
    return () => this.statusListeners.delete(l);
  }

  close() {
    this.closed = true;
    if (this.ping) clearInterval(this.ping);
    this.ws?.close();
  }
}

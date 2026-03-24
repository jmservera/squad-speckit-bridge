/**
 * WebSocket Data Provider
 *
 * @requirement FR-002
 */

// FR-002: real-time data updates via WebSocket
export function createDataProvider(url: string) {
  const ws = new WebSocket(url);

  return {
    subscribe(callback: (data: unknown) => void) {
      ws.onmessage = (event) => callback(JSON.parse(event.data));
    },
    close() {
      ws.close();
    },
  };
}

// FR-003: persist layout to local storage
export function saveLayout(layout: object): void {
  localStorage.setItem('dashboard-layout', JSON.stringify(layout));
}

export function loadLayout(): object | null {
  const raw = localStorage.getItem('dashboard-layout');
  return raw ? JSON.parse(raw) : null;
}

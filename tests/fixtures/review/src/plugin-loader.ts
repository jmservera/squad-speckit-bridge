/**
 * Widget Plugin Loader
 *
 * @satisfies FR-004
 */

export interface WidgetLifecycle {
  onMount(): void;
  onData(data: unknown): void;
  onDestroy(): void;
}

// FR-004: async plugin loading
export async function loadPlugin(path: string): Promise<WidgetLifecycle> {
  const mod = await import(path);
  return mod.default as WidgetLifecycle;
}

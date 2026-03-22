export function track(event: string, properties?: Record<string, string>) {
  if (typeof window !== "undefined") {
    // Google Analytics (gtag)
    const w = window as unknown as {
      gtag?: (cmd: string, event: string, params?: Record<string, string>) => void;
    };
    if (w.gtag) {
      w.gtag("event", event, properties);
    }
  }
}

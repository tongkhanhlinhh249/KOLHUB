/** Fake network latency (400–800 ms by default). */
export function delay(ms: number = 400 + Math.random() * 400): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

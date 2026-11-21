/** Single-owner, single-process deployment: cap all login attempts, including concurrent requests.
 * Not a distributed limiter. Restarting the process resets its window.
 */
let windowStart = 0;
let attempts = 0;
export function consumeLoginAttempt(now = Date.now()): boolean {
  if (now - windowStart >= 300_000 || now < windowStart) { windowStart = now; attempts = 0; }
  if (attempts >= 30) return false;
  attempts += 1;
  return true;
}

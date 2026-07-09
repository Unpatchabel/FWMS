/**
 * Every Server Action in src/actions/ returns this shape instead of throwing
 * on validation/permission failures, so client components can show an inline
 * error message the same way they did with fetch()+res.ok. Unexpected
 * exceptions (bugs, DB errors) still throw and surface as Next's error
 * boundary — only EXPECTED failure modes (bad input, no permission, not
 * found) are returned as data.
 */
export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

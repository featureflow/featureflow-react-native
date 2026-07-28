import { testCondition } from './conditions';
import type { EvalRule, EvaluatedControl } from './types';

/**
 * Resolves a variant from the rules the server returned.
 *
 * The server matched every rule against the user's own attributes and pre-computed the variant
 * from their bucket. Two kinds of rule arrive:
 *
 * - **Fully evaluated** — no `audience`. It matched server-side; take its variant.
 * - **Partially evaluated** — an `audience` of `featureflow.date` / `featureflow.hourofday`
 *   conditions the server deliberately did not resolve, so the response stays identical for
 *   everyone in the same bucket and can be cached at the CDN.
 *
 * Rules are ordered and first match wins. **A partial rule whose time conditions fail is skipped
 * and evaluation continues with the next rule** — it does not end evaluation. Getting that wrong
 * silently disables every fallback rule sitting behind a scheduled one.
 */

export interface Resolved {
  variant: string;
  value?: unknown;
}

/**
 * The time context is built from `now` **at evaluation time**, not when the response was
 * fetched. A mobile session can run for days; computing it at fetch time would freeze
 * `featureflow.hourofday` at whatever it was when the app launched, so a 9-to-5 rule would
 * still report `on` at midnight.
 */
function timeContext(now: Date): Record<string, unknown[]> {
  return {
    'featureflow.date': [now.toISOString()],
    'featureflow.hourofday': [now.getHours()]
  };
}

function ruleMatches(rule: EvalRule, context: Record<string, unknown[]>): boolean {
  if (!rule.audience || !rule.audience.conditions) return true;

  for (const condition of rule.audience.conditions) {
    // A target this SDK does not supply locally is skipped, not failed. The server already
    // tested every attribute it could, so an unknown target means a newer server behaviour —
    // and skipping keeps a shipped app, which will never update, matching as it did before.
    const values = context[condition.target];
    if (!values) continue;

    const passed = values.some((value) =>
      testCondition(condition.operator, value, condition.values)
    );
    if (!passed) return false;
  }
  return true;
}

export function evaluateControl(
  control: EvaluatedControl | undefined,
  now: Date
): Resolved | undefined {
  if (!control || !Array.isArray(control.rules)) return undefined;

  const context = timeContext(now);
  for (const rule of control.rules) {
    if (ruleMatches(rule, context)) {
      return { variant: rule.variant, value: rule.value };
    }
  }
  return undefined;
}

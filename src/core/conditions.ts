/**
 * Condition operators, matching `sdk-server/src/services/conditions.ts`.
 *
 * The set is fixed by the server's `Operator` enum. An unrecognised operator must return `false`
 * rather than throw, so a rule using an operator newer than this SDK fails closed instead of
 * crashing the host app — which, on mobile, cannot be hot-fixed.
 */

type OperatorFn = (userValue: unknown, conditionValue: unknown) => boolean;

function parseDate(value: unknown): number | null {
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  return null;
}

function bothStrings(
  a: unknown,
  b: unknown,
  fn: (x: string, y: string) => boolean
): boolean {
  return typeof a === 'string' && typeof b === 'string' && fn(a, b);
}

function bothNumbers(
  a: unknown,
  b: unknown,
  fn: (x: number, y: number) => boolean
): boolean {
  // Explicit rather than relying on JS coercion: `"1.10.0" > "1.9.0"` is a lexicographic
  // comparison that answers the opposite of what anyone writing a version rule intends.
  return typeof a === 'number' && typeof b === 'number' && fn(a, b);
}

const operators: Record<string, OperatorFn> = {
  equals: (a, b) => a === b,
  contains: (a, b) => bothStrings(a, b, (x, y) => x.indexOf(y) > -1),
  startsWith: (a, b) => bothStrings(a, b, (x, y) => x.startsWith(y)),
  endsWith: (a, b) => bothStrings(a, b, (x, y) => x.endsWith(y)),
  matches: (a, b) =>
    bothStrings(a, b, (x, y) => {
      try {
        return new RegExp(y).test(x);
      } catch {
        // An invalid pattern authored in the dashboard must not crash the app.
        return false;
      }
    }),
  in: (a, b) => Array.isArray(b) && b.indexOf(a as never) > -1,
  notIn: (a, b) => Array.isArray(b) && b.indexOf(a as never) < 0,
  before: (a, b) => {
    const x = parseDate(a);
    const y = parseDate(b);
    return x !== null && y !== null && x < y;
  },
  after: (a, b) => {
    const x = parseDate(a);
    const y = parseDate(b);
    return x !== null && y !== null && x > y;
  },
  greaterThan: (a, b) => bothNumbers(a, b, (x, y) => x > y),
  greaterThanOrEqual: (a, b) => bothNumbers(a, b, (x, y) => x >= y),
  lessThan: (a, b) => bothNumbers(a, b, (x, y) => x < y),
  lessThanOrEqual: (a, b) => bothNumbers(a, b, (x, y) => x <= y)
};

/**
 * `in` and `notIn` test against the whole values list; every other operator uses the first
 * value only.
 */
export function testCondition(
  operator: string,
  userValue: unknown,
  conditionValues: unknown[]
): boolean {
  const fn = operators[operator];
  if (!fn) return false;

  if (operator === 'in' || operator === 'notIn') {
    return fn(userValue, conditionValues);
  }
  if (conditionValues.length === 0) return false;
  return fn(userValue, conditionValues[0]);
}

/**
 * Condition testing utilities for local feature evaluation.
 * These are used for date-based and time-based conditions that can be
 * evaluated locally for better caching performance.
 */

/**
 * Test a condition with the given operator, value, and target values.
 *
 * @param operator - The comparison operator
 * @param value - The current value to test
 * @param values - The target values to compare against
 * @returns Whether the condition passes
 */
export function test(
  operator: string,
  value: string | number | Date,
  values: (string | number)[]
): boolean {
  switch (operator) {
    case 'equals':
      return values.some((v) => String(v) === String(value));

    case 'notEquals':
      return values.every((v) => String(v) !== String(value));

    case 'contains':
      return values.some((v) => String(value).includes(String(v)));

    case 'notContains':
      return values.every((v) => !String(value).includes(String(v)));

    case 'startsWith':
      return values.some((v) => String(value).startsWith(String(v)));

    case 'endsWith':
      return values.some((v) => String(value).endsWith(String(v)));

    case 'greaterThan':
      return values.some((v) => {
        if (value instanceof Date) {
          return value.getTime() > new Date(v).getTime();
        }
        return Number(value) > Number(v);
      });

    case 'greaterThanOrEqual':
      return values.some((v) => {
        if (value instanceof Date) {
          return value.getTime() >= new Date(v).getTime();
        }
        return Number(value) >= Number(v);
      });

    case 'lessThan':
      return values.some((v) => {
        if (value instanceof Date) {
          return value.getTime() < new Date(v).getTime();
        }
        return Number(value) < Number(v);
      });

    case 'lessThanOrEqual':
      return values.some((v) => {
        if (value instanceof Date) {
          return value.getTime() <= new Date(v).getTime();
        }
        return Number(value) <= Number(v);
      });

    case 'in':
      return values.includes(value as string | number);

    case 'notIn':
      return !values.includes(value as string | number);

    case 'matches':
      return values.some((v) => new RegExp(String(v)).test(String(value)));

    default:
      return false;
  }
}


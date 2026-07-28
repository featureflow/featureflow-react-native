import { testCondition } from '../core/conditions';
import { evaluateControl } from '../core/ruleEvaluator';
import { createEvaluate } from '../core/evaluate';
import { base64UrlEncode } from '../core/restClient';
import { FeatureflowCore } from '../core/client';
import type { Platform, PlatformRequests } from '../core/platform';
import type { Controls } from '../core/types';
import { createMemoryStorage } from '../core/memoryStorage';

describe('conditions', () => {
  it('matches strings', () => {
    expect(testCondition('equals', 'gold', ['gold'])).toBe(true);
    expect(testCondition('equals', 'gold', ['silver'])).toBe(false);
    expect(testCondition('contains', 'featureflow', ['ature'])).toBe(true);
    expect(testCondition('startsWith', 'featureflow', ['feat'])).toBe(true);
    expect(testCondition('endsWith', 'featureflow', ['flow'])).toBe(true);
    expect(testCondition('matches', 'a@featureflow.io', ['.*@featureflow\\.io$'])).toBe(true);
  });

  it('handles list operators against the whole list', () => {
    expect(testCondition('in', 'beta', ['admin', 'beta'])).toBe(true);
    expect(testCondition('in', 'guest', ['admin', 'beta'])).toBe(false);
    expect(testCondition('notIn', 'guest', ['admin', 'beta'])).toBe(true);
  });

  it('compares numbers', () => {
    expect(testCondition('greaterThan', 10, [9])).toBe(true);
    expect(testCondition('greaterThan', 9, [9])).toBe(false);
    expect(testCondition('greaterThanOrEqual', 9, [9])).toBe(true);
    expect(testCondition('lessThan', 8, [9])).toBe(true);
  });

  // Coercing here would make "1.10.0" > "1.9.0" true — the opposite of what a version rule means.
  it('does not coerce types', () => {
    expect(testCondition('greaterThan', '1.10.0', ['1.9.0'])).toBe(false);
    expect(testCondition('contains', 42, ['4'])).toBe(false);
  });

  it('compares dates with and without fractional seconds', () => {
    expect(testCondition('before', '2026-01-01T00:00:00.000Z', ['2026-06-01T00:00:00.000Z'])).toBe(true);
    expect(testCondition('before', '2026-01-01T00:00:00Z', ['2026-06-01T00:00:00Z'])).toBe(true);
    expect(testCondition('after', '2026-06-01T00:00:00.000Z', ['2026-01-01T00:00:00.000Z'])).toBe(true);
  });

  // A rule may use an operator newer than this SDK. Mobile cannot be hot-fixed, so fail closed.
  it('fails closed on an unknown operator', () => {
    expect(testCondition('someFutureOperator', 'a', ['a'])).toBe(false);
  });

  it('does not throw on an invalid regex', () => {
    expect(testCondition('matches', 'x', ['['])).toBe(false);
  });

  it('returns false for an empty value list', () => {
    expect(testCondition('equals', 'a', [])).toBe(false);
  });
});

describe('rule evaluation', () => {
  const now = new Date('2026-06-01T12:00:00.000Z');
  const dateRule = (variant: string, values: string[]) => ({
    variant,
    audience: { conditions: [{ target: 'featureflow.date', operator: 'after', values }] }
  });

  it('takes a fully evaluated rule as-is', () => {
    expect(evaluateControl({ rules: [{ variant: 'on' }] }, now)?.variant).toBe('on');
  });

  it('returns undefined when no rules match', () => {
    expect(evaluateControl({ rules: [] }, now)).toBeUndefined();
    expect(evaluateControl(undefined, now)).toBeUndefined();
  });

  it('takes the first matching rule', () => {
    const control = { rules: [{ variant: 'first' }, { variant: 'second' }] };
    expect(evaluateControl(control, now)?.variant).toBe('first');
  });

  it('matches a partial rule inside its window', () => {
    const control = { rules: [dateRule('on', ['2026-01-01T00:00:00.000Z'])] };
    expect(evaluateControl(control, now)?.variant).toBe('on');
  });

  it('skips a partial rule outside its window', () => {
    const control = { rules: [dateRule('on', ['2026-12-01T00:00:00.000Z'])] };
    expect(evaluateControl(control, now)).toBeUndefined();
  });

  // The bug this SDK previously had: a failing time rule must not end evaluation.
  it('falls through to the next rule when a partial rule fails', () => {
    const control = {
      rules: [dateRule('scheduled', ['2026-12-01T00:00:00.000Z']), { variant: 'fallback' }]
    };
    expect(evaluateControl(control, now)?.variant).toBe('fallback');
  });

  it('ANDs the conditions in an audience', () => {
    const control = {
      rules: [
        {
          variant: 'on',
          audience: {
            conditions: [
              { target: 'featureflow.hourofday', operator: 'greaterThan', values: [9] },
              { target: 'featureflow.hourofday', operator: 'greaterThan', values: [23] }
            ]
          }
        }
      ]
    };
    expect(evaluateControl(control, now)).toBeUndefined();
  });

  // The hour comes from the clock at evaluation, not at fetch — a session can run for days.
  it('uses the hour at evaluation time', () => {
    const control = {
      rules: [
        {
          variant: 'on',
          audience: {
            conditions: [
              { target: 'featureflow.hourofday', operator: 'equals', values: [new Date('2026-06-01T14:30:00').getHours()] }
            ]
          }
        }
      ]
    };
    expect(evaluateControl(control, new Date('2026-06-01T14:30:00'))?.variant).toBe('on');
    expect(evaluateControl(control, new Date('2026-06-01T03:30:00'))).toBeUndefined();
  });

  // An old app must keep matching as it did before a new server target existed.
  it('skips a target it does not supply rather than failing the rule', () => {
    const control = {
      rules: [
        {
          variant: 'on',
          audience: {
            conditions: [{ target: 'featureflow.somethingNew', operator: 'equals', values: ['x'] }]
          }
        }
      ]
    };
    expect(evaluateControl(control, now)?.variant).toBe('on');
  });

  it('carries the matched rule payload, not the first rule payload', () => {
    const control = {
      rules: [
        { ...dateRule('scheduled', ['2026-12-01T00:00:00.000Z']), value: { which: 'wrong' } },
        { variant: 'fallback', value: { which: 'right' } }
      ]
    };
    expect(evaluateControl(control, now)?.value).toEqual({ which: 'right' });
  });
});

describe('createEvaluate', () => {
  it('exposes the standard accessors, case-insensitively', () => {
    const on = createEvaluate('On');
    expect(on.isOn()).toBe(true);
    expect(on.isOff()).toBe(false);
    expect(on.is('ON')).toBe(true);
    expect(on.value()).toBe('on');
  });

  it('carries a JSON payload', () => {
    expect(createEvaluate('on', { a: 1 }).jsonValue()).toEqual({ a: 1 });
    expect(createEvaluate('on').jsonValue()).toBeUndefined();
  });
});

describe('base64UrlEncode', () => {
  const reference = (s: string) =>
    Buffer.from(s, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  it('matches a reference encoder at every padding length', () => {
    for (let n = 0; n <= 40; n++) {
      const input = 'a'.repeat(n);
      expect(base64UrlEncode(input)).toBe(reference(input));
    }
  });

  // '/' is a path separator; the user is encoded into a path segment.
  it('emits no url-unsafe characters', () => {
    const encoded = base64UrlEncode(JSON.stringify({ id: 'user~123?&/x', a: 'b/c+d' }));
    expect(encoded).not.toContain('+');
    expect(encoded).not.toContain('/');
    expect(encoded).not.toContain('=');
  });

  it('handles multi-byte characters', () => {
    const input = JSON.stringify({ id: 'ünïcode-日本語-🎉' });
    expect(base64UrlEncode(input)).toBe(reference(input));
  });
});

// ---- Client -----------------------------------------------------------------

function fakePlatform(controls: Controls, overrides: Partial<Platform> = {}): Platform & {
  posted: string[];
  fetches: number;
} {
  const posted: string[] = [];
  let fetches = 0;

  const requests: PlatformRequests = {
    get: async () => {
      fetches++;
      return { status: 200, body: JSON.stringify(controls), header: () => null };
    },
    post: async (_url, _headers, body) => {
      posted.push(body);
      return { status: 200, body: '{}', header: () => null };
    }
  };

  const platform = {
    requests,
    storage: createMemoryStorage(),
    info: { name: 'TestClient', version: '0.0.0' },
    randomId: () => 'anonymous:test',
    now: () => new Date('2026-06-01T12:00:00.000Z'),
    ...overrides
  } as Platform;

  return Object.assign(platform, {
    get posted() {
      return posted;
    },
    get fetches() {
      return fetches;
    }
  });
}

describe('FeatureflowCore', () => {
  it('evaluates after starting', async () => {
    const platform = fakePlatform({ 'my-feature': { rules: [{ variant: 'on' }] } });
    const core = new FeatureflowCore('key', { id: 'user-1' }, {}, platform);
    await core.start();

    expect(core.evaluate('my-feature').isOn()).toBe(true);
    expect(core.isReady).toBe(true);
    await core.close();
  });

  it('serves a configured default for an unknown feature', async () => {
    const platform = fakePlatform({});
    const core = new FeatureflowCore('key', { id: 'u' }, { defaultFeatures: { x: 'on' } }, platform);
    await core.start();

    expect(core.evaluate('x').isOn()).toBe(true);
    expect(core.evaluate('never-heard-of-it').isOff()).toBe(true);
    await core.close();
  });

  it('generates and persists an anonymous id when no user is given', async () => {
    const platform = fakePlatform({});
    const core = new FeatureflowCore('key', undefined, {}, platform);
    await core.start();

    expect(core.getUser().id).toBe('anonymous:test');
    expect(await platform.storage.getItem('ff-anonymous-id')).toBe('anonymous:test');
    await core.close();
  });

  it('makes no requests when offline', async () => {
    const platform = fakePlatform({ x: { rules: [{ variant: 'on' }] } });
    const core = new FeatureflowCore('key', { id: 'u' }, { offline: true, defaultFeatures: { x: 'off' } }, platform);
    await core.start();

    expect(platform.fetches).toBe(0);
    expect(core.evaluate('x').isOff()).toBe(true);
    await core.close();
  });

  it('summarises repeated impressions into a count', async () => {
    const platform = fakePlatform({ x: { rules: [{ variant: 'on' }] } });
    const core = new FeatureflowCore('key', { id: 'u' }, {}, platform);
    await core.start();

    for (let i = 0; i < 50; i++) core.evaluate('x');
    await core.close();

    const batch = JSON.parse(platform.posted[platform.posted.length - 1]);
    const evaluate = batch.filter((e: { type: string }) => e.type === 'evaluate');
    expect(evaluate).toHaveLength(1);
    expect(evaluate[0].impressions).toBe(50);
    expect(evaluate[0].evaluatedVariant).toBe('on');
  });

  it('records no impression for peek or getFeatures', async () => {
    const platform = fakePlatform({ x: { rules: [{ variant: 'on' }] } });
    const core = new FeatureflowCore('key', { id: 'u' }, {}, platform);
    await core.start();

    core.peek('x');
    core.getFeatures();
    await core.close();

    const batches = platform.posted.map((b) => JSON.parse(b)).flat();
    expect(batches.filter((e: { type: string }) => e.type === 'evaluate')).toHaveLength(0);
  });

  it('sends goals raw, with value and custom data', async () => {
    const platform = fakePlatform({});
    const core = new FeatureflowCore('key', { id: 'u' }, {}, platform);
    await core.start();

    core.track('signup');
    core.track('purchase', 49.95);
    core.track('checkout', { value: 10, plan: 'pro' });
    await core.close();

    const batch = JSON.parse(platform.posted[platform.posted.length - 1]);
    const goals = batch.filter((e: { type: string }) => e.type === 'goal');
    expect(goals).toHaveLength(3);
    expect(goals[1].value).toBe(49.95);
    expect(goals[2].data).toEqual({ plan: 'pro' });
    // The server keys every event by featureKey, goals included.
    expect(goals[0].featureKey).toBe('signup');
  });

  it('notifies listeners only when the evaluation changes', async () => {
    let variant = 'off';
    const platform = fakePlatform({});
    platform.requests.get = async () => ({
      status: 200,
      body: JSON.stringify({ x: { rules: [{ variant }] } }),
      header: () => null
    });

    const core = new FeatureflowCore('key', { id: 'u' }, { useCache: false }, platform);
    await core.start();

    const seen: Array<Record<string, string>> = [];
    core.onFlagsChanged((f) => seen.push(f));

    await core.refresh();
    expect(seen).toHaveLength(0);

    variant = 'on';
    await core.refresh();
    expect(seen).toHaveLength(1);
    expect(seen[0].x).toBe('on');
    await core.close();
  });

  it('keeps running when a listener throws', async () => {
    let variant = 'off';
    const platform = fakePlatform({});
    platform.requests.get = async () => ({
      status: 200,
      body: JSON.stringify({ x: { rules: [{ variant }] } }),
      header: () => null
    });

    const core = new FeatureflowCore('key', { id: 'u' }, { useCache: false }, platform);
    await core.start();

    let reached = false;
    core.onFlagsChanged(() => {
      throw new Error('boom');
    });
    core.onFlagsChanged(() => {
      reached = true;
    });

    variant = 'on';
    await core.refresh();
    expect(reached).toBe(true);
    await core.close();
  });

  // A flag service being unreachable must not stop an app from starting.
  it('starts successfully when the network fails', async () => {
    const platform = fakePlatform({});
    platform.requests.get = async () => ({ status: 0, header: () => null });

    const core = new FeatureflowCore('key', { id: 'u' }, {}, platform);
    await expect(core.start()).resolves.toBeUndefined();
    expect(core.isReady).toBe(true);
    expect(core.evaluate('x').isOff()).toBe(true);
    await core.close();
  });

  it('keeps previous values when a refresh fails', async () => {
    const platform = fakePlatform({ x: { rules: [{ variant: 'on' }] } });
    const core = new FeatureflowCore('key', { id: 'u' }, { useCache: false }, platform);
    await core.start();
    expect(core.evaluate('x').isOn()).toBe(true);

    platform.requests.get = async () => ({ status: 500, header: () => null });
    expect(await core.refresh()).toBe(false);
    expect(core.evaluate('x').isOn()).toBe(true);
    await core.close();
  });

  // The previous user may have been entitled to something this one is not.
  it('does not serve one user’s cached flags to another', async () => {
    const storage = createMemoryStorage();
    const platform = fakePlatform({ premium: { rules: [{ variant: 'on' }] } }, { storage });
    const first = new FeatureflowCore('key', { id: 'user-1' }, {}, platform);
    await first.start();
    await first.close();

    const offline = fakePlatform({}, { storage });
    offline.requests.get = async () => ({ status: 0, header: () => null });
    const second = new FeatureflowCore('key', { id: 'user-2' }, {}, offline);
    await second.start();

    expect(second.evaluate('premium').isOff()).toBe(true);
    await second.close();
  });

  it('serves a cached evaluation when the network is unavailable', async () => {
    const storage = createMemoryStorage();
    const platform = fakePlatform({ x: { rules: [{ variant: 'on' }] } }, { storage });
    const first = new FeatureflowCore('key', { id: 'user-1' }, {}, platform);
    await first.start();
    await first.close();

    const offline = fakePlatform({}, { storage });
    offline.requests.get = async () => ({ status: 0, header: () => null });
    const second = new FeatureflowCore('key', { id: 'user-1' }, {}, offline);
    await second.start();

    expect(second.evaluate('x').isOn()).toBe(true);
    await second.close();
  });

  it('re-evaluates on updateUser', async () => {
    let variant = 'off';
    const platform = fakePlatform({});
    platform.requests.get = async () => ({
      status: 200,
      body: JSON.stringify({ x: { rules: [{ variant }] } }),
      header: () => null
    });

    const core = new FeatureflowCore('key', { id: 'user-1' }, { useCache: false }, platform);
    await core.start();
    expect(core.evaluate('x').isOff()).toBe(true);

    variant = 'on';
    await core.updateUser({ id: 'user-2' });
    expect(core.getUser().id).toBe('user-2');
    expect(core.evaluate('x').isOn()).toBe(true);
    await core.close();
  });

  // A queued impression belongs to the user who generated it.
  it('flushes pending events before switching user', async () => {
    const platform = fakePlatform({ x: { rules: [{ variant: 'on' }] } });
    const core = new FeatureflowCore('key', { id: 'user-1' }, { useCache: false }, platform);
    await core.start();

    core.evaluate('x');
    await core.updateUser({ id: 'user-2' });

    const firstBatch = JSON.parse(platform.posted[0]);
    expect(firstBatch[0].user.id).toBe('user-1');
    await core.close();
  });

  it('bounds the event queue', async () => {
    const platform = fakePlatform({});
    const core = new FeatureflowCore(
      'key',
      { id: 'u' },
      { maxEventQueueSize: 10, eventFlushIntervalMs: 1_000_000 },
      platform
    );
    await core.start();

    for (let i = 0; i < 100; i++) core.track(`goal-${i}`);
    await core.close();

    const batch = JSON.parse(platform.posted[platform.posted.length - 1]);
    expect(batch.length).toBeLessThanOrEqual(10);
  });

  it('sends no events when they are disabled', async () => {
    const platform = fakePlatform({ x: { rules: [{ variant: 'on' }] } });
    const core = new FeatureflowCore('key', { id: 'u' }, { disableEvents: true }, platform);
    await core.start();

    core.evaluate('x');
    core.track('signup');
    await core.close();

    expect(platform.posted).toHaveLength(0);
  });
});

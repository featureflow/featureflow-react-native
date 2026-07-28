# CLAUDE.md

Guidance for Claude Code working in this repository.

Workspace-level guidance is in `../CLAUDE.md`.

## What this is

The Featureflow **client-side** SDK for React Native. Pure JavaScript — no native modules beyond
the AsyncStorage peer dependency — so it works under the New Architecture and in Expo Go without
a config plugin. That is the reason this SDK exists alongside `../featureflow-ios-sdk` and
`../featureflow-android-sdk`; it is not replaced by them.

## Commands

```bash
npm install
npm run typecheck    # tsc --noEmit
npm test             # jest
npm run build        # rollup
```

## The architecture, and why it is like this

```
src/core/       platform-free. Zero React Native imports, zero runtime dependencies.
src/platform/   the ONLY directory that imports react-native or AsyncStorage.
src/*.tsx       React bindings over the client.
```

`core/` is written entirely against the `Platform` interface in `core/platform.ts` — requests,
storage, lifecycle, info, `randomId`, `now`. It is intended to lift out wholesale into a shared
`@featureflow/js-core` package, with this SDK and `../featureflow-javascript-sdk` becoming thin
platform implementations over it (`ops/SDK-BACKLOG.md` item 3).

**Two invariants keep that possible. Both are cheap to check and easy to break:**

```bash
# core/ must import nothing from react-native, and nothing external at all
grep -rn "from 'react-native'\|@react-native\|AsyncStorage" src/core/
grep -rhn "^import .* from '[^.]" src/core/

# the core test suite must never load platform/
grep -n "from '../platform" src/__tests__/core.test.ts
```

All three must return nothing. `createMemoryStorage` lives in `core/` rather than `platform/` for
exactly this reason — it has no platform dependency, and putting it in `platform/` would force
the core tests to load React Native.

**Storage is async-first on purpose.** `localStorage` is synchronous and `AsyncStorage` is not.
Making the interface sync to suit the browser is what would force React Native to fake it; the
browser adapter wrapping sync calls in resolved promises is the cheap direction of that mismatch.

## The contract

Client SDK, not a server SDK: it does no rule matching beyond time conditions and **never**
computes buckets. Two endpoints, keyed by the API key in the URL path (client keys are public):

| Call | Endpoint |
|---|---|
| Fetch | `GET {baseUrl}/api/js/v1/evaluate/{apiKey}/user/{base64url(userJSON)}` |
| Events | `POST {eventsUrl}/api/js/v1/event/{apiKey}` |

Specified once in `../featureflow-client-sdk-testbed/CONTRACT.md`. Authoritative server code:
`../sdk-server/src/routes/js/`, `src/services/evaluate.service.ts`, `src/services/conditions.ts`.
**Verify against those, never from memory.**

### Partial evaluation

The server pre-matches every rule against the user's attributes and returns candidate rules with
the variant already computed. Rules that depended on `featureflow.date` or
`featureflow.hourofday` come back with those conditions attached for this device to resolve —
that is what keeps the response cacheable at the CDN.

`core/ruleEvaluator.ts` is the client half: walk rules in order, first match wins, and **a
partial rule whose time conditions fail is skipped so evaluation continues**. It does not end
evaluation. Getting that wrong silently disables every fallback rule behind a scheduled one, and
there is a test named for it.

## What the 2.0 rewrite fixed

The previous implementation was a third, independent copy of the contract that had drifted. All
four were real bugs, and all four have regression tests:

1. **No polling and no `AppState` handling** — flags were fetched at init and never again, so a
   flag change never reached a running app. Fine for a browser page that reloads constantly;
   wrong for a mobile session lasting days. Now polls, refreshes on foreground, flushes on
   background.
2. **The time context was computed at fetch time**, so `featureflow.hourofday` froze at app
   launch and a 9-to-5 rule stayed `on` at midnight. Now computed at evaluation time.
3. **One event per feature per session** (`uniqueEvals`) rather than summarised impression
   counts. That model cannot express "this user saw this variant 40 times", which is what
   experiment denominators and flag usage insight need. Now summarised.
4. **`Math.random()` anonymous ids.** That id is the bucketing key, so a collision co-buckets two
   users in every experiment. Now `crypto.getRandomValues` with a time-mixed fallback.

Also added: `jsonValue()` / `useJsonValue` for variant config payloads, and `track()` with a
metric value and custom data (`goal()` is kept as a deprecated alias).

## Deliberate decisions

- **base64url is hand-rolled** in `core/restClient.ts`. Standard base64 emits `/`, which is a
  path separator, and neither `btoa` nor `Buffer` is reliably present across Hermes, JSC and
  Expo Go. UTF-8 encoding is hand-rolled for the same reason — `TextEncoder` was not always
  shipped. Tested against a reference encoder at every padding length.
- **`fetch` + `AbortController`**, not `XMLHttpRequest` — present in every RN runtime, and
  `fetch` alone has no timeout.
- **No `sendBeacon`.** React Native has no equivalent, so `PlatformRequests.sendBeacon` is
  omitted and the core falls back to `post`.
- **Unknown operators and unknown condition targets fail safe** — `false` and *skipped*
  respectively. A shipped mobile binary can never be hot-fixed, so it must keep working against
  a newer server.
- **Failed event batches are dropped, not retried.** Retrying risks double-counting impressions
  after a partial server-side write; events are diagnostic, not transactional.
- **`start()` never rejects.** Falls back to cache, then `defaultFeatures`, then `off`.
- **The cache is keyed by user id *and* API key.** Serving a previous user's flags to a new one
  is a correctness bug — they may have had different entitlements.
- **Bulk reads record no impression**; `evaluate()` and `useFeature()` do. Impressions must mean
  exposure or experiment denominators are wrong.

## Testing

40 tests, no network, no React Native. The client tests inject a fake `Platform`, which is the
payoff of the interface — there is nothing to mock.

Not yet wired to `../featureflow-client-sdk-testbed`, whose scenarios cover the same cases. See
`../ops/SDK-BACKLOG.md` item 7.

## Version

`SDK_VERSION` in `src/FeatureflowClient.ts` is sent as the `X-Featureflow-Client` header
(`ReactNativeClient/{version}`) and is how server-side usage reporting attributes traffic. Bump it
alongside `package.json`.

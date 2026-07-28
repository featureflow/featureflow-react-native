# Changelog

## [2.0.0] — unreleased

Rewritten. The previous implementation was an independent third copy of the client contract that
had drifted from `featureflow-javascript-sdk` and the server. This release restructures it into a
platform-free `core/` written against a `Platform` interface, with `platform/` holding the only
React Native imports — the shape a shared `@featureflow/js-core` package would take.

### Fixed

- **Flags now reach a running app.** The SDK fetched at init and never again, so flipping a flag
  in the dashboard did nothing until the next cold start. It now polls on an interval, refreshes
  when the app returns to the foreground, and flushes events when it backgrounds.
- **`featureflow.hourofday` is no longer frozen at launch.** The time context was computed when
  the response was fetched, so a 9-to-5 rule stayed `on` at midnight. It is now computed at
  evaluation time.
- **Impressions are summarised into counts.** The old `uniqueEvals` model sent one event per
  feature per session and could not express repeated exposure, which experiment denominators and
  flag usage insight both need.
- **Anonymous ids are no longer `Math.random()`.** That id is the bucketing key; a collision
  co-buckets two users in every experiment. Now `crypto.getRandomValues` with a time-mixed
  fallback.

### Added

- `jsonValue()` and `useJsonValue()` for variant JSON config payloads.
- `track(goalKey, details)` with a metric value and custom data, matching the Node, browser, Java,
  iOS and Android SDKs.
- `useFeature(key)` returning the full evaluation, and `useTrack()`.
- `peek()` — evaluate without recording an impression, for debug screens.
- `refresh()`, `onFlagsChanged()`, `close()`, and a `storage` config override for tests.
- `loadingComponent` on `FeatureflowProvider`.

### Changed

- **No runtime dependencies.** `base64-js`, `mitt` and `featureflow-client` are all gone; base64url
  and UTF-8 encoding are hand-rolled because neither `btoa` nor `Buffer` is reliably present
  across Hermes, JSC and Expo Go.
- `fetch` + `AbortController` replaces `XMLHttpRequest`.
- `goal(key)` is **deprecated** in favour of `track()`. It still works.
- Config option names are now explicit about units: `pollingIntervalMs`, `cacheTTLMs`,
  `eventFlushIntervalMs`, `requestTimeoutMs`.

### Notes

Not published, so there is no migration path to document. The public API — `FeatureflowProvider`,
`FeatureflowProviderWithClient`, `useFeatureflow`, `useFeatures`, `useBooleanFlag`,
`useStringFlag`, `useFeatureflowStatus`, `init` — is unchanged in shape.

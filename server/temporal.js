// Node 24 (Vercel's default) does not expose Temporal globally yet.
// Keep the app's existing Temporal usage consistent across runtimes.
globalThis.Temporal ||= require('@js-temporal/polyfill').Temporal;

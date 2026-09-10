# Nebula — Code Samples

A few Cloud Functions pulled from [Nebula](https://github.com/nabylazoubairi/nebula-portfolio), shared here to show actual code rather than just screenshots. Backend: Firebase (Firestore + Cloud Functions), Node.js.

The full app has ~40 functions handling chat, friend requests, trip planning, and moderation; these three are self-contained enough to read on their own.

| File | What it shows |
|---|---|
| [`new-message-push.js`](new-message-push.js) | Firestore trigger → push notification fan-out, with a small UX fix (disambiguating users who share a first name) |
| [`friend-accepted.js`](friend-accepted.js) | Firestore trigger → server-side write using the Admin SDK, needed because client-side security rules only allow each user to write their own document |
| [`cleanup-expired-stories.js`](cleanup-expired-stories.js) | Scheduled job → deletes expired content from both Firestore and Storage in parallel, fault-tolerant with `Promise.allSettled` |

Full project source stays private; this is a curated excerpt.

# Nebula — Code Samples

Backend source from [Nebula](https://github.com/nabylazoubairi/nebula-portfolio), shared here to show actual code rather than just screenshots. Node.js / Express, JWT auth, SQLite, ElevenLabs text-to-speech.

| File | What it shows |
|---|---|
| [`server.js`](server.js) | App entrypoint — middleware, rate limiting, route mounting |
| [`auth.js`](auth.js) | Signup/login with bcrypt password hashing, JWT issuance, and the `requireAuth` middleware that protects everything else |
| [`tts.js`](tts.js) | The core feature: checks the user's free-session quota, then proxies the request to ElevenLabs and streams the generated audio straight back to the client |

Secrets (API keys, JWT signing secret) live in a `.env` file that is never committed — every reference here goes through `process.env`. Full project source stays private; this is a curated excerpt.

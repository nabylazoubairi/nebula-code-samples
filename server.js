require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const rateLimit = require('express-rate-limit');
const { router: authRouter } = require('./routes/auth');
const ttsRouter = require('./routes/tts');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ─────────────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50kb' }));

// Rate limiting — max 20 req/min par IP
app.use('/api/', rateLimit({ windowMs: 60_000, max: 20, message: { error: 'Trop de requêtes, réessaie dans 1 minute.' } }));

// ── Routes ─────────────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/tts',  ttsRouter);

app.get('/', (_, res) => res.json({ app: 'Nebula API', status: 'ok', version: '1.0.0' }));
app.get('/health', (_, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// ── Start ──────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n✦ Nebula Backend — port ${PORT}`);
  console.log(`  ElevenLabs key: ${process.env.ELEVENLABS_API_KEY ? '✅ configurée' : '❌ manquante (.env)'}`);
  console.log(`  Sessions gratuites: ${process.env.FREE_SESSIONS || 3}\n`);
});

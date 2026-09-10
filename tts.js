const express = require('express');
const fetch   = require('node-fetch');
const db      = require('../db');
const { requireAuth } = require('./auth');
const router  = express.Router();

const FREE_SESSIONS = parseInt(process.env.FREE_SESSIONS) || 3;

// ── POST /api/tts ──────────────────────────────────────────────
router.post('/', requireAuth, async (req, res) => {
  const { text, voice_id = '21m00Tcm4TlvDq8ikWAM', lang = 'fr' } = req.body;
  if (!text) return res.status(400).json({ error: 'Texte manquant' });

  // Vérifier les crédits
  const user = db.prepare('SELECT sessions, subscribed FROM users WHERE id = ?').get(req.userId);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

  if (!user.subscribed && user.sessions >= FREE_SESSIONS) {
    return res.status(402).json({
      error: 'sessions_exceeded',
      message: `Tu as utilisé tes ${FREE_SESSIONS} sessions gratuites. Passe à Premium pour continuer ✨`,
      freeLeft: 0
    });
  }

  if (!process.env.ELEVENLABS_API_KEY) {
    return res.status(503).json({ error: 'Clé ElevenLabs non configurée sur le serveur' });
  }

  try {
    const elRes = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voice_id}/stream`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': process.env.ELEVENLABS_API_KEY
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          language_code: lang,
          voice_settings: { stability: 0.42, similarity_boost: 0.82, style: 0.25, use_speaker_boost: true }
        })
      }
    );

    if (!elRes.ok) {
      const err = await elRes.json().catch(() => ({}));
      return res.status(502).json({ error: err.detail?.message || 'Erreur ElevenLabs' });
    }

    // Incrémenter sessions + logger
    db.prepare('UPDATE users SET sessions = sessions + 1 WHERE id = ?').run(req.userId);
    db.prepare('INSERT INTO sessions_log (user_id, voice_id, chars) VALUES (?, ?, ?)').run(req.userId, voice_id, text.length);

    const freeLeft = user.subscribed ? 999 : Math.max(0, FREE_SESSIONS - user.sessions - 1);

    // Stream audio + header sessions restantes
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('X-Sessions-Left', freeLeft);
    elRes.body.pipe(res);

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;

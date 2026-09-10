// Cloud Function (scheduled) — Nebula
// Runs daily; deletes stories older than 24h (unless highlighted) from
// both Firestore and Storage, in parallel and fault-tolerant.

exports.cleanupExpiredStories = onSchedule('every 24 hours', async () => {
  const DAY_MS = 24 * 60 * 60 * 1000;
  const cutoff = new Date(Date.now() - DAY_MS);
  const snap = await db.collection('stories')
    .where('createdAt', '<', cutoff)
    .get();

  if (snap.empty) return;

  const expired = snap.docs.filter(d => !d.data().highlighted);
  if (!expired.length) return;

  await Promise.allSettled(expired.map(async d => {
    const story = d.data();
    const ext = story.videoURL ? 'mp4' : 'jpg';
    await Promise.allSettled([
      d.ref.delete(),
      bucket.file(`stories/${story.uid}/${d.id}.${ext}`).delete(),
    ]);
  }));

  console.log(`Cleaned up ${expired.length} expired stories (${snap.docs.length - expired.length} highlighted, kept)`);
});

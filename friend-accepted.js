// Cloud Function (Firestore trigger) — Nebula
// Fires when a friend request flips to "accepted"; links both users
// server-side because Firestore security rules only let each client
// write its own user document.

exports.onFriendAccepted = onDocumentUpdated(
  'friendRequests/{requestId}',
  async (event) => {
    const before = event.data.before.data();
    const after  = event.data.after.data();
    if (before.status === after.status) return;
    if (after.status !== 'accepted') return;

    // Add each other as friends here (server-side, admin SDK) — the client
    // can only ever write its own user doc per the security rules, so it
    // can't add itself to the OTHER person's friends array. arrayUnion also
    // dedupes automatically, fixing repeated accepts creating duplicates.
    await Promise.all([
      db.doc(`users/${after.from}`).update({ friends: FieldValue.arrayUnion(after.to) }),
      db.doc(`users/${after.to}`).update({ friends: FieldValue.arrayUnion(after.from) }),
    ]);

    const accepterDoc = await db.doc(`users/${after.to}`).get();
    const accepterName = accepterDoc.data()?.firstName || 'Someone';

    await sendPushToUser(after.from, {
      title: 'Friend request accepted! 👯',
      body:  `${accepterName} is now your friend!`,
      data:  { type: 'friendAccepted', uid: after.to },
    });

    await db.collection(`users/${after.from}/notifications`).add({
      type:      'friendAccepted',
      from:      after.to,
      fromName:  accepterName,
      read:      false,
      createdAt: FieldValue.serverTimestamp(),
    });
  }
);

// Cloud Function (Firestore trigger) — Au Pair Society
// Fires when a chat message is created; notifies the recipient via push
// and logs an in-app notification, disambiguating same-first-name users.

exports.onNewMessage = onDocumentCreated(
  'chats/{chatId}/messages/{msgId}',
  async (event) => {
    const msg    = event.data.data();
    const chatId = event.params.chatId;

    // Get chat participants
    const chatDoc = await db.doc(`chats/${chatId}`).get();
    const participants = chatDoc.data()?.participants || [];

    // Recipient = the other person
    const recipientUid = participants.find(uid => uid !== msg.sender);
    if (!recipientUid) return;

    // Get sender name — first name alone was ambiguous when two au pairs
    // share one (common with a small international pool), so the last
    // initial rides along too: "Camille D." instead of just "Camille".
    const senderData = (await db.doc(`users/${msg.sender}`).get()).data() || {};
    const senderName = [senderData.firstName || 'Someone', senderData.lastName ? senderData.lastName[0] + '.' : '']
      .filter(Boolean).join(' ');

    await sendPushToUser(recipientUid, {
      title: senderName,
      body:  notifBodyFor(msg),
      data:  { type: 'message', chatId, senderId: msg.sender },
    });

    // Save notification in Firestore too
    await db.collection(`users/${recipientUid}/notifications`).add({
      type:      'message',
      from:      msg.sender,
      fromName:  senderName,
      text:      msg.text,
      chatId,
      read:      false,
      createdAt: FieldValue.serverTimestamp(),
    });
  }
);

const express = require('express');
const { makeWASocket, useSingleFileAuthState } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

const { state, saveState } = useSingleFileAuthState('./auth_info.json');

let sock;

async function startSock() {
  sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
  });

  sock.ev.on('creds.update', saveState);
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect.error = Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) startSock();
    }
  });
}
startSock();

// WhatsBulk send endpoint
app.post('/send', async (req, res) => {
  const { number, message } = req.body;
  try {
    await sock.sendMessage(number + '@s.whatsapp.net', { text: message });
    res.json({ success: true, sent_to: number });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send' });
  }
});

app.listen(port, () => console.log(`WhatsBulk Bot running on port ${port}`));

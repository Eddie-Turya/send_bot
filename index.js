const express = require("express");
const { Client, LocalAuth } = require("whatsapp-web.js");
const cors = require("cors");
const qrcode = require("qrcode");
const fs = require("fs");

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

let sessionReady = false;
let client;

const SESSION_FILE_PATH = "./session.json";

// Load saved session if it exists
let sessionData;
if (fs.existsSync(SESSION_FILE_PATH)) {
  sessionData = require(SESSION_FILE_PATH);
}

client = new Client({
  authStrategy: new LocalAuth({ clientId: "whatsbulk" }),
  puppeteer: { headless: true },
  session: sessionData,
});

client.on("qr", async (qr) => {
  const qrImage = await qrcode.toDataURL(qr);
  fs.writeFileSync("./qr.json", JSON.stringify({ qr: qrImage }));
});

client.on("ready", () => {
  sessionReady = true;
  console.log("WhatsApp bot is ready!");
});

client.initialize();

app.get("/status", (req, res) => {
  res.json({ authenticated: sessionReady });
});

app.get("/qr", (req, res) => {
  try {
    const qr = JSON.parse(fs.readFileSync("./qr.json"));
    res.json(qr);
  } catch (err) {
    res.status(404).json({ error: "QR not ready" });
  }
});

app.post("/send", async (req, res) => {
  const { number, message } = req.body;

  if (!sessionReady) return res.status(401).json({ success: false, msg: "Not Authenticated" });

  try {
    await client.sendMessage(`${number}@c.us`, message);
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false, error: e.toString() });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

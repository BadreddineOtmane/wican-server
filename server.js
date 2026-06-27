/* ============================================================================
   Bonne Route Auto - truck telematics server (Node / Express)
   Receives compact JSON snapshots from the in-truck STM32+SIM7070G gateway,
   keeps the latest state, and serves a live HTML dashboard.

     POST /api/ingest   (gateway -> here)   header X-Device-Token
     GET  /api/latest   (dashboard polls)
     GET  /             (dashboard)

   Deploy on Render/Replit/Railway. No database.
   ============================================================================ */

const express = require('express');
const path = require('path');

const app = express();
app.use(express.json({ limit: '32kb' }));

const DEVICE_TOKEN = process.env.DEVICE_TOKEN || 'brauto-dev-token';
// Pterodactyl-style hosts (WispByte) pass the allocated port as SERVER_PORT.
const PORT = process.env.PORT || process.env.SERVER_PORT || 8000;

// Empty until the truck gateway posts real data. Dashboard shows "—" / offline.
let state = {
  vin: null,
  lamps: { mil: 0, stop: 0, warn: 0, prot: 0 },
  dtc_count: 0,
  dtcs: [],
  server_ts: 0,
  fresh: false
};

app.post('/api/ingest', (req, res) => {
  const token = req.get('X-Device-Token') || req.query.token;
  if (token !== DEVICE_TOKEN) return res.status(401).json({ error: 'bad token' });
  if (typeof req.body !== 'object' || req.body === null)
    return res.status(400).json({ error: 'expected JSON object' });
  state = { ...state, ...req.body, server_ts: Date.now() / 1000, fresh: true };
  res.json({ ok: true });
});

app.get('/api/latest', (req, res) => {
  const age = Date.now() / 1000 - (state.server_ts || 0);
  res.json({ ...state, age_s: Math.round(age * 10) / 10, online: age < 30 });
});

app.get('/health', (req, res) => res.type('text').send('ok'));
app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, '0.0.0.0', () => console.log(`BRA server on 0.0.0.0:${PORT}`));

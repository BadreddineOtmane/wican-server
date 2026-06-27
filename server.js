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
const PORT = process.env.PORT || 8000;

// Seeded with a real snapshot so the dashboard shows something immediately.
let state = {
  vin: 'XLRTEH4300G181727',
  rpm: 0, speed_kmh: 0, coolant_c: 57, oil_temp_c: 50.6, fuel_temp_c: 55,
  intake_temp_c: 58, exhaust_temp_c: 52, amb_temp_c: 26.0, atmo_kpa: 101.5,
  boost_kpa: 2, fuel_pct: 56, def_pct: 61, def_temp_c: 27, fuel_rate_lph: 0,
  fuel_trip_l: 8741.0, fuel_total_l: 341864.5, oil_press_kpa: 20, fuel_press_kpa: 20,
  batt_v: 0, engine_hours: 17695.0, vehicle_hours: 18719.5, odo_km: 1040763.9,
  lamps: { mil: 1, stop: 0, warn: 1, prot: 1 }, dtc_count: 24,
  dtcs: [
    { spn: 1071, fmi: 5, oc: 126 }, { spn: 5109, fmi: 19, oc: 113 },
    { spn: 3217, fmi: 19, oc: 113 }, { spn: 3821, fmi: 11, oc: 126 },
    { spn: 1347, fmi: 16, oc: 25 }
  ],
  server_ts: 0, fresh: false
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

app.listen(PORT, () => console.log(`BRA server on :${PORT}`));

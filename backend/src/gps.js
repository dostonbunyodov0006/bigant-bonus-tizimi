// src/gps.js — 📍 ҲАЙДОВЧИЛАР GPS: вилоятдан қайтиб Тошкентга кирган вақт → қўшимча соат.
//
// Достон 2026-09-17: «ҳайдовчи ҳеч нима босмасин — машина белгиланган зонага кирганда
// автоматик соат олиниб бонус ҳисоблансин». Telegram орқа фонда жойлашувни бермайди, шунинг
// учун ҳайдовчи телефонига БИР МАРТА бепул Traccar Client иловаси ўрнатилади:
//   Device identifier = шахсий код (gps_qurilma), Server URL = …/gps, Frequency = 1200 (20 дақиқа).
//
// Қоида: 18:00 да Тошкентдан ТАШҚАРИДА бўлган ҳайдовчи 18:00 дан кейин (эртанги 05:00 гача)
// Тошкентга КИРСА — «18:00 → кирган вақт» қўшимча соат. Кирган пайт икки нуқта орасидан
// чегарани кесиб ўтган жойига қараб ҳисобланади (20 дақиқалик оралиқ ичида аниқроқ).
// Натижа src/bonus.js haydovchiSoat() га тушади: «Юк топшириш» расми билан — энг кечи олинади.
import { toshkentdami, chegaraKesish } from "./toshkent.js";

export const GPS_ORALIQ = 1200;               // иловада Frequency (сония) — 20 дақиқа
const TZ = 5 * 3600;
const ENG_KAM_ORALIQ = 60;                     // бир қурилмадан 60 сониядан тез келган нуқта — ташланади
const SAQLASH_KUN = 70;                        // хом нуқталар шунча кун сақланади
const OLDIN_18_IZLASH = 45 * 60;               // 18:00 даги ҳолатни аниқлаш учун ±45 дақиқа

const iso = (ms) => new Date(ms).toISOString().slice(0, 10);
const tosh = (unix) => {
  const t = unix + TZ;
  const sek = ((t % 86400) + 86400) % 86400;
  return { sana: iso(t * 1000), min: Math.floor(sek / 60), sek };
};
const oldingiKun = (sana) => iso(Date.parse(sana + "T00:00:00Z") - 86400000);
const soat18 = (sana) => Date.parse(sana + "T00:00:00Z") / 1000 - TZ + 18 * 3600;

/* ============================ ҚАБУЛ ҚИЛИШ (POST/GET /gps) ============================ */
function vaqtOl(v) {
  if (v === undefined || v === null || v === "") return null;
  if (/^\d+(\.\d+)?$/.test(String(v))) {
    const n = Number(v);
    return Math.floor(n > 2147483647 ? n / 1000 : n);            // сония ёки миллисекунд
  }
  const ms = Date.parse(String(v).replace(" ", "T") + (/[zZ]|[+-]\d\d:?\d\d$/.test(String(v)) ? "" : "Z"));
  return Number.isFinite(ms) ? Math.floor(ms / 1000) : null;
}

/** Traccar Client (OsmAnd протоколи) юборадиган ҳар хил шаклдан нуқталар рўйхати */
export async function nuqtalarOl(request) {
  const url = new URL(request.url);
  const q = url.searchParams;
  const natija = [];
  const qosh = (kod, lat, lon, vaqt, aniqlik) => natija.push({ kod: String(kod || "").trim(), lat: Number(lat), lon: Number(lon), vaqt: vaqtOl(vaqt), aniqlik: aniqlik == null ? null : Number(aniqlik) });
  // 1) URL параметрлари: ?id=…&lat=…&lon=…&timestamp=…
  const soz = (p) => {
    let lat = p.get("lat"), lon = p.get("lon");
    if ((lat == null || lon == null) && p.get("location")) [lat, lon] = String(p.get("location")).split(",");
    if (lat != null && lon != null) qosh(p.get("id") || p.get("deviceid"), lat, lon, p.get("timestamp"), p.get("accuracy"));
  };
  soz(q);
  if (request.method === "POST") {
    const ct = request.headers.get("content-type") || "";
    const matn = await request.text().catch(() => "");
    if (matn) {
      if (/json/i.test(ct) || /^\s*[{[]/.test(matn)) {
        // 2) JSON: { device_id, location: { timestamp, coords: { latitude, longitude, accuracy } } } (location массив ҳам бўлиши мумкин)
        try {
          const j = JSON.parse(matn);
          for (const b of Array.isArray(j) ? j : [j]) {
            const joylar = Array.isArray(b.location) ? b.location : [b.location];
            for (const l of joylar) {
              if (!l || !l.coords) continue;
              qosh(b.device_id || b.id || q.get("id"), l.coords.latitude, l.coords.longitude, l.timestamp, l.coords.accuracy);
            }
          }
        } catch { /* нотўғри JSON */ }
      } else {
        soz(new URLSearchParams(matn));                          // 3) форма
      }
    }
  }
  return natija;
}

export async function gpsQabul(request, env) {
  const javob = (matn, status = 200) => new Response(matn, { status, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
  if (request.method !== "POST" && request.method !== "GET") return javob("method", 405);
  if (!env.DB) return javob("db", 500);
  const nuqtalar = await nuqtalarOl(request);
  if (!nuqtalar.length) return javob("joylashuv yo'q", 400);
  const hozir = Math.floor(Date.now() / 1000);
  const kodlar = new Map();
  let saqlandi = 0;
  for (const n of nuqtalar) {
    if (!/^[a-z0-9-]{8,64}$/i.test(n.kod)) return javob("kod noto'g'ri", 403);
    if (!kodlar.has(n.kod)) {
      const q = await env.DB.prepare("SELECT hodim FROM gps_qurilma WHERE kod = ? AND faol = 1").bind(n.kod).first();
      kodlar.set(n.kod, q ? Number(q.hodim) : null);
    }
    const hodim = kodlar.get(n.kod);
    if (!hodim) return javob("kod topilmadi", 403);
    if (!(n.lat >= -90 && n.lat <= 90 && n.lon >= -180 && n.lon <= 180) || (n.lat === 0 && n.lon === 0)) continue;
    let vaqt = n.vaqt || hozir;
    if (vaqt > hozir + 300) vaqt = hozir;                        // телефон соати олдинда бўлса
    if (vaqt < hozir - 7 * 86400) continue;                      // 7 кундан эски (буфердан) — ташланади
    const oxirgi = await env.DB.prepare("SELECT MAX(vaqt) AS v FROM gps_nuqta WHERE hodim = ?").bind(hodim).first("v");
    if (oxirgi && vaqt >= oxirgi && vaqt - oxirgi < ENG_KAM_ORALIQ) continue;   // жуда тез-тез — ташланади
    await env.DB.prepare("INSERT OR IGNORE INTO gps_nuqta (hodim, vaqt, lat, lon, aniqlik, keldi) VALUES (?,?,?,?,?,?)")
      .bind(hodim, vaqt, n.lat, n.lon, Number.isFinite(n.aniqlik) ? n.aniqlik : null, hozir).run();
    saqlandi++;
  }
  // Эски нуқталарни вақти-вақти билан тозалаш (ҳар сўровда эмас)
  if (Math.random() < 0.02) {
    await env.DB.prepare("DELETE FROM gps_nuqta WHERE vaqt < ?").bind(hozir - SAQLASH_KUN * 86400).run().catch(() => {});
  }
  return javob(`OK ${saqlandi}`);
}

/* ============================ ҲИСОБ: ТОШКЕНТГА КИРИШЛАР ============================
 * nuqtalar: [{ hodim, vaqt, lat, lon }]
 * @returns [{ hodim, sana (иш куни), min (кечқурун дақиқаси, 05:00 гача бўлса +1440), vaqt }] */
export function gpsKirishlar(nuqtalar) {
  const guruh = new Map();
  for (const n of nuqtalar || []) {
    if (!guruh.has(n.hodim)) guruh.set(n.hodim, []);
    guruh.get(n.hodim).push(n);
  }
  const natija = [];
  for (const [hodim, L0] of guruh) {
    const L = L0.slice().sort((a, b) => a.vaqt - b.vaqt);
    const ich = L.map((p) => toshkentdami(p.lat, p.lon));
    const holat18 = (t18) => {                                   // 18:00 га энг яқин нуқта (±45 дақиқа)
      let eng = null;
      for (let i = 0; i < L.length; i++) {
        const d = Math.abs(L[i].vaqt - t18);
        if (d <= OLDIN_18_IZLASH && (eng === null || d < Math.abs(L[eng].vaqt - t18))) eng = i;
      }
      return eng === null ? null : ich[eng];
    };
    for (let i = 1; i < L.length; i++) {
      if (ich[i - 1] || !ich[i]) continue;                       // фақат «ташқаридан → ичкарига»
      const nx = L[i + 1];
      if (nx && nx.vaqt - L[i].vaqt <= 3600 && !ich[i + 1]) continue;   // чегарада GPS сакраши — тасдиқланмади
      const p0 = L[i - 1], p1 = L[i];
      const f = chegaraKesish(p0.lat, p0.lon, p1.lat, p1.lon);
      const tc = Math.round(p0.vaqt + (f === null ? 1 : f) * (p1.vaqt - p0.vaqt));
      const t = tosh(tc);
      let sana, min;
      if (t.min > 18 * 60) { sana = t.sana; min = t.min; }
      else if (t.sek < 5 * 3600) { sana = oldingiKun(t.sana); min = t.min + 1440; }
      else continue;                                             // иш вақтида кирган — бонус йўқ
      const t18 = soat18(sana);
      if (tc <= t18) continue;
      if (holat18(t18) !== false) continue;                      // 18:00 да ташқарида бўлгани аниқ эмас
      natija.push({ hodim: Number(hodim), sana, min, vaqt: tc });
    }
  }
  return natija;
}

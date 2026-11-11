// 📍 ҲАЙДОВЧИЛАР GPS — Тошкент зонаси, Traccar Client нуқталари, «вилоятдан қайтиб кирди» соати.
//
//   node tests/gpssinov.js   (аввал: node tests/tayyorla.mjs)
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const papka = new URL("./app/", import.meta.url);
fs.mkdirSync(papka, { recursive: true });
for (const f of fs.readdirSync(new URL("../src/app/", import.meta.url))) {
  if (f.endsWith(".js")) fs.copyFileSync(new URL("../src/app/" + f, import.meta.url), new URL(f, papka));
}

const toshkent = (y, mo, d, h, mi) => Date.UTC(y, mo - 1, d, h - 5, mi);
let VAQT = toshkent(2026, 9, 18, 22, 0);
const aslNow = Date.now;
Date.now = () => VAQT;
globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({ ok: true, result: {} }) });

const { d1Yasa } = await import("./d1sqlite.js");
const Z = await import("./toshkent.js");
const G = await import("./gps.js");
const B = await import("./bonus.js");
const appWorker = (await import("./app/worker.js")).default;

let ok = 0, jami = 0;
const C = (n, shart, izoh) => { jami++; if (shart) ok++; console.log(`  ${shart ? "✅" : "❌"} ${n}${!shart && izoh ? "  — " + izoh : ""}`); };
const T = (d, h, mi) => toshkent(2026, 9, d, h, mi) / 1000;

const ICH = { lat: 41.2755, lon: 69.2045 };      // Чилонзор
const TASH = { lat: 41.1120, lon: 69.0470 };     // Янгийўл
const UZOQ = { lat: 40.4897, lon: 68.7842 };     // Гулистон
const AZIZ_ID = 10, HIKMAT_ID = 23;

/* ════════ 1. ЗОНА ════════ */
console.log("── 🗺 Тошкент зонаси ──");
for (const [n, lat, lon, kut] of [["Сергели (ишхона)", 41.2285, 69.2170, true], ["Чилонзор", 41.2755, 69.2045, true], ["Ходим15обод", 41.3650, 69.2870, true],
  ["Аэропорт", 41.2579, 69.2812, true], ["Чирчиқ", 41.4690, 69.5820, false], ["Олмалиқ", 40.8440, 69.5980, false], ["Янгийўл", 41.1120, 69.0470, false],
  ["Зангиота", 41.1920, 69.1450, false], ["Гулистон", 40.4897, 68.7842, false], ["Самарқанд", 39.6542, 66.9597, false]]) {
  C(`${n} — ${kut ? "ичида" : "ташқарида"}`, Z.toshkentdami(lat, lon) === kut);
}
const f = Z.chegaraKesish(TASH.lat, TASH.lon, ICH.lat, ICH.lon);
C("Янгийўл → Чилонзор кесмаси чегарани кесади (0…1)", f > 0 && f < 1, String(f));

/* ════════ 2. ИЛОВА ЮБОРАДИГАН ШАКЛЛАР ════════ */
console.log("── 📱 Traccar Client шакллари ──");
{
  const q = await G.nuqtalarOl(new Request("https://x/gps?id=bigant-aziz-abc123&lat=41.2755&lon=69.2045&timestamp=1789000000&accuracy=12", { method: "POST" }));
  C("URL параметрлари (id, lat, lon, timestamp сония)", q.length === 1 && q[0].kod === "bigant-aziz-abc123" && q[0].lat === 41.2755 && q[0].vaqt === 1789000000 && q[0].aniqlik === 12, JSON.stringify(q));
  const ms = await G.nuqtalarOl(new Request("https://x/gps?deviceid=bigant-aziz-abc123&location=41.1,69.1&timestamp=1789000000123", { method: "GET" }));
  C("deviceid + location=lat,lon + миллисекунд", ms.length === 1 && ms[0].lat === 41.1 && ms[0].lon === 69.1 && ms[0].vaqt === 1789000000, JSON.stringify(ms));
  const js = await G.nuqtalarOl(new Request("https://x/gps", { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ device_id: "bigant-aziz-abc123", location: { timestamp: "2026-09-18T16:00:00.000Z", coords: { latitude: 41.2, longitude: 69.3, accuracy: 5 } } }) }));
  C("JSON: device_id + location.coords + ISO вақт", js.length === 1 && js[0].vaqt === Date.parse("2026-09-18T16:00:00Z") / 1000 && js[0].lon === 69.3, JSON.stringify(js));
  const arr = await G.nuqtalarOl(new Request("https://x/gps", { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ device_id: "bigant-aziz-abc123", location: [{ timestamp: "2026-09-18T16:00:00Z", coords: { latitude: 41, longitude: 69 } }, { timestamp: "2026-09-18T16:20:00Z", coords: { latitude: 41.1, longitude: 69.1 } }] }) }));
  C("JSON: буфердаги бир нечта нуқта (массив)", arr.length === 2, JSON.stringify(arr));
  const fm = await G.nuqtalarOl(new Request("https://x/gps", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: "id=bigant-aziz-abc123&lat=41&lon=69&timestamp=1789000000" }));
  C("форма (x-www-form-urlencoded)", fm.length === 1 && fm[0].lat === 41);
}

/* ════════ 3. СЕРВЕР ҚАБУЛИ ════════ */
console.log("── 🖥 /gps қабул ──");
const DB = d1Yasa(fileURLToPath(new URL("../migrations/0001_urik.sql", import.meta.url)));
DB.db.exec(fs.readFileSync(new URL("../migrations/0002_bonus.sql", import.meta.url), "utf8"));
DB.db.exec(fs.readFileSync(new URL("../migrations/0006_ish_izoh.sql", import.meta.url), "utf8"));
DB.db.exec(fs.readFileSync(new URL("../migrations/0021_bonus_rasm_id.sql", import.meta.url), "utf8"));
DB.db.exec(fs.readFileSync(new URL("../migrations/0023_ragbat_summa.sql", import.meta.url), "utf8"));
DB.db.exec(fs.readFileSync(new URL("../migrations/0003_gps.sql", import.meta.url), "utf8"));
await DB.prepare("INSERT INTO gps_qurilma (kod, hodim, yaratildi) VALUES (?,?,?)").bind("bigant-aziz-k7p2x9", AZIZ_ID, 1).run();
await DB.prepare("INSERT INTO gps_qurilma (kod, hodim, yaratildi, faol) VALUES (?,?,?,0)").bind("bigant-eski-000000", HIKMAT_ID, 1).run();
const env = { DB, BOT_TOKEN: "T", ACCESS_KV: { get: async () => null, put: async () => {}, delete: async () => {}, list: async () => ({ keys: [], list_complete: true }) } };
const yubor = async (kod, p, vaqt, usul = "POST") => {
  const r = await appWorker.fetch(new Request(`https://bigant-app-preview.x/gps?id=${kod}&lat=${p.lat}&lon=${p.lon}&timestamp=${vaqt}`, { method: usul }), env);
  return { status: r.status, matn: await r.text() };
};
const sanoq = async () => Number(await DB.prepare("SELECT COUNT(*) n FROM gps_nuqta").first("n"));
{
  C("нотўғри код — РАД (403)", (await yubor("bigant-yoq-111111", ICH, T(18, 17, 0))).status === 403);
  C("ўчирилган код — РАД (403)", (await yubor("bigant-eski-000000", ICH, T(18, 17, 0))).status === 403);
  C("ғалати белгили код — РАД (403)", (await yubor("<script>", ICH, T(18, 17, 0))).status === 403);
  const r = await yubor("bigant-aziz-k7p2x9", TASH, T(18, 17, 40));
  C("тўғри код — сақланди (200, «OK 1»)", r.status === 200 && r.matn === "OK 1" && (await sanoq()) === 1, JSON.stringify(r));
  C("GET ҳам қабул қилинади", (await yubor("bigant-aziz-k7p2x9", TASH, T(18, 18, 0), "GET")).status === 200 && (await sanoq()) === 2);
  await yubor("bigant-aziz-k7p2x9", TASH, T(18, 18, 0) + 30);
  C("60 сониядан тез келган нуқта — ташланади", (await sanoq()) === 2);
  await yubor("bigant-aziz-k7p2x9", TASH, T(18, 18, 0));
  C("бир хил нуқта икки марта — бир марта ёзилади", (await sanoq()) === 2);
  await yubor("bigant-aziz-k7p2x9", TASH, T(10, 12, 0));
  C("7 кундан эски нуқта — ташланади", (await sanoq()) === 2);
  C("координатасиз сўров — 400", (await appWorker.fetch(new Request("https://x/gps?id=bigant-aziz-k7p2x9", { method: "POST" }), env)).status === 400);
}

/* ════════ 4. «ТОШКЕНТГА КИРДИ» ҲИСОБИ ════════ */
console.log("── ⏰ кирган вақт ──");
const n = (vaqt, p, hodim = AZIZ_ID) => ({ hodim, vaqt, lat: p.lat, lon: p.lon });
const kesish = Z.chegaraKesish(TASH.lat, TASH.lon, ICH.lat, ICH.lon);
{
  // а) 18:00 да вилоятда, 20:40 да ҳали ташқарида, 21:00 да Тошкент ичида
  const a = G.gpsKirishlar([n(T(18, 17, 40), UZOQ), n(T(18, 18, 0), UZOQ), n(T(18, 20, 40), TASH), n(T(18, 21, 0), ICH), n(T(18, 21, 20), ICH)]);
  const kut = Math.floor((T(18, 20, 40) + kesish * 1200 + 5 * 3600) % 86400 / 60);
  C("18:00 да вилоятда → 21:00 атрофида кирди: вақт чегарани кесган жойдан (20:40 ва 21:00 орасида)", a.length === 1 && a[0].sana === "2026-09-18" && Math.abs(a[0].min - kut) <= 1 && a[0].min > 20 * 60 + 40 && a[0].min < 21 * 60, JSON.stringify(a));
  // б) 18:00 да Тошкент ичида эди
  C("18:00 да Тошкент ИЧИДА бўлса — йўқ", G.gpsKirishlar([n(T(18, 18, 0), ICH), n(T(18, 19, 0), TASH), n(T(18, 20, 0), ICH), n(T(18, 20, 20), ICH)]).length === 0);
  // в) иш вақтида қайтди
  C("17:00 да қайтиб кирди (иш вақти) — йўқ", G.gpsKirishlar([n(T(18, 16, 40), TASH), n(T(18, 17, 0), ICH), n(T(18, 17, 20), ICH), n(T(18, 18, 0), ICH)]).length === 0);
  // г) чегарада GPS сакраши
  C("ичкарига «кирди» ва дарров яна ташқарида — ҳисобланмайди", G.gpsKirishlar([n(T(18, 18, 0), TASH), n(T(18, 19, 0), ICH), n(T(18, 19, 20), TASH)]).length === 0);
  // д) ярим тундан кейин
  const d = G.gpsKirishlar([n(T(18, 18, 0), UZOQ), n(T(19, 0, 40), TASH), n(T(19, 1, 0), ICH)]);
  C("01:00 атрофида кирди — ОЛДИНГИ кун (18.09), дақиқа +24 соат", d.length === 1 && d[0].sana === "2026-09-18" && d[0].min > 24 * 60 + 40 && d[0].min < 25 * 60, JSON.stringify(d));
  // е) 18:00 атрофида нуқта йўқ — аниқ эмас
  C("18:00 атрофида (±45 дақиқа) нуқта йўқ — эҳтиёт учун ҳисобланмайди", G.gpsKirishlar([n(T(18, 20, 40), TASH), n(T(18, 21, 0), ICH)]).length === 0);
  // ж) ҳайдовчи эмас
  const hs = B.haydovchiSoat([], [{ hodim: 3, sana: "2026-09-18", min: 21 * 60 }]);
  C("ҳайдовчи бўлмаган ходим (Ходим03) GPS'дан соат олмайди", hs.length === 0);
}

/* ════════ 5. РАСМ БИЛАН БИРГА — ЭНГ КЕЧИ ════════ */
console.log("── 📷+📍 расм ва GPS ──");
{
  const AZIZ_TG = 700000017;
  const rasm19 = [{ guruh: "topshirish", uid: AZIZ_TG, vaqt: T(18, 19, 0) }];
  const r1 = B.haydovchiSoat(rasm19, [{ hodim: AZIZ_ID, sana: "2026-09-18", min: 21 * 60 }]);
  C("расм 19:00, GPS 21:00 → 21:00 олинади, «GPS — Тошкентга кирди»", r1.length === 1 && r1[0].tugatdi === "21:00" && r1[0].kech === 180 && r1[0].summa === 120000 && /GPS/.test(r1[0].yozdi), JSON.stringify(r1));
  const rasm22 = [{ guruh: "topshirish", uid: AZIZ_TG, vaqt: T(18, 22, 0) }];
  const r2 = B.haydovchiSoat(rasm22, [{ hodim: AZIZ_ID, sana: "2026-09-18", min: 21 * 60 }]);
  C("расм 22:00, GPS 21:00 → 22:00 (расм), икки марта ёзилмайди", r2.length === 1 && r2[0].tugatdi === "22:00" && r2[0].summa === 160000 && /расми/.test(r2[0].yozdi), JSON.stringify(r2));
  const r3 = B.haydovchiSoat([{ guruh: "olish", uid: AZIZ_TG, vaqt: T(18, 7, 30) }], [{ hodim: AZIZ_ID, sana: "2026-09-18", min: 20 * 60 }]);
  C("эрталаб LOGISTIKA 07:30 + кечқурун GPS 20:00 → 1:30 + 2:00 = 140 000", r3.length === 1 && r3[0].jami === 210 && r3[0].summa === 140000, JSON.stringify(r3));
}

/* ════════ 6. ЁЗИЛГАНИДАН EXCEL'ГАЧА ════════ */
console.log("── 📊 сервер → Excel ──");
{
  for (const [t, p] of [[T(18, 18, 20), UZOQ], [T(18, 18, 40), UZOQ], [T(18, 20, 40), TASH], [T(18, 21, 0), ICH], [T(18, 21, 20), ICH]]) await yubor("bigant-aziz-k7p2x9", p, t);
  const d = await B.davrMalumot(env, B.davrOl(T(18, 12, 0)), T(18, 22, 0));
  const q = d.ish.find((x) => x.hodim.nom === "Ходим10");
  C("Excel «Ишбай»: Ходим10 — GPS'дан кечқурунги соат, суммаси бор", q && q.kech > 170 && q.kech < 180 && q.summa === Math.round(40000 * q.kech / 60) && /GPS/.test(q.yozdi), JSON.stringify(q));
  const x = await B.bonusExcel(d);
  C("Excel файли ясалди", x.length > 3000);
}

Date.now = aslNow;
console.log(`\n═══ ${ok}/${jami} ═══`);

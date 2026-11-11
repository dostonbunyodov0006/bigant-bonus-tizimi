// 🎁 БОНУСЛАР — иш вақти, юк олиш/топшириш, рағбатлантириш, Excel (src/bonus.js, src/app/bonusapi.js).
//
//   node tests/bonussinov.js   (аввал: node tests/tayyorla.mjs)
//
// Текширилади:
//   1) қоидалар: тугма вақтлари, энг эрта/энг кеч, «Қўшимча», ярим тун, 2x, машина тоифаси, давр;
//   2) API ҳар бир одам номидан (ҳақиқий initData имзоси): ким кира олади, ким нима қила олади;
//   3) ботнинг гуруҳдан расм ёзиб олиши: бошқа бўлимларга ТЕГМАЙДИ, гуруҳга ҳеч нима юбормайди;
//   4) Excel: варақлар, суммалар, формулалар.
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const papka = new URL("./app/", import.meta.url);
fs.mkdirSync(papka, { recursive: true });
for (const f of fs.readdirSync(new URL("../src/app/", import.meta.url))) {
  if (f.endsWith(".js")) fs.copyFileSync(new URL("../src/app/" + f, import.meta.url), new URL(f, papka));
}

const toshkent = (y, mo, d, h, mi) => Date.UTC(y, mo - 1, d, h - 5, mi);   // Тошкент вақти → ms
let VAQT = toshkent(2026, 9, 16, 8, 0);
const aslNow = Date.now;
Date.now = () => VAQT;
const soatQoy = (h, mi, d = 16) => { VAQT = toshkent(2026, 9, d, h, mi); };

let chiq = [];
globalThis.fetch = async (url, o = {}) => {
  const met = String(url).split("/").pop().split("?")[0];
  let body = {};
  if (typeof o.body === "string") { try { body = JSON.parse(o.body); } catch {} }
  else if (o.body && typeof o.body.get === "function") body = { chat_id: o.body.get("chat_id"), caption: o.body.get("caption"), _fayl: o.body.get("document") };
  chiq.push({ met, ...body });
  return { ok: true, status: 200, json: async () => ({ ok: true, result: { message_id: 7000 + chiq.length } }) };
};

const { d1Yasa, URIK_SXEMA } = await import("./d1sqlite.js");
const B = await import("./bonus.js");
const { apiIshla } = await import("./app/api.js");
const { initDataYasa } = await import("./app/tma.js");
const { tablarOl, bolimlar } = await import("../app/src/lib/tablar.js");
const worker = (await import("./index.js")).default;

let ok = 0, jami = 0;
const C = (n, shart, izoh) => { jami++; if (shart) ok++; console.log(`  ${shart ? "✅" : "❌"} ${n}${!shart && izoh ? "  — " + izoh : ""}`); };
const T = (y, mo, d, h, mi) => toshkent(y, mo, d, h, mi) / 1000;

const TOKEN = "123456789:AAFakeTokenForTestsOnly_abcdefghijk";
const kv = new Map();
const KV = {
  get: async (k) => (Array.isArray(k) ? new Map(k.map((x) => [x, kv.get(x) ?? null])) : kv.get(k) ?? null),
  put: async (k, v) => kv.set(k, String(v)), delete: async (k) => kv.delete(k),
  list: async () => ({ keys: [], list_complete: true }),
};
function yangiDB() {
  const DB = d1Yasa(URIK_SXEMA);
  DB.db.exec(fs.readFileSync(new URL("../migrations/0002_bonus.sql", import.meta.url), "utf8"));
  DB.db.exec(fs.readFileSync(new URL("../migrations/0006_ish_izoh.sql", import.meta.url), "utf8"));
  DB.db.exec(fs.readFileSync(new URL("../migrations/0021_bonus_rasm_id.sql", import.meta.url), "utf8"));
  DB.db.exec(fs.readFileSync(new URL("../migrations/0023_ragbat_summa.sql", import.meta.url), "utf8"));
  DB.db.exec(fs.readFileSync(new URL("../migrations/0028_bonus_ogoh.sql", import.meta.url), "utf8"));
  DB.db.exec(fs.readFileSync(new URL("../migrations/0029_bonus_jarima.sql", import.meta.url), "utf8"));
  return DB;
}
let env = { BOT_TOKEN: TOKEN, OMBOR_GURUH: "-100", ACCESS_KV: KV, DB: yangiDB(), BONUS_SINOV: "1" };
// Синов ходимлари production рўйхатидан олиб ташланган (2026-09-18) — синов учун шу ерда қўшилади
B.sinovQosh({ id: 900, nom: "Достон (синов)", bolim: "Ҳайдовчи", tarif: 40000, mashina: "kichik", tg: 700000005, sinov: true });
B.sinovQosh({ id: 901, nom: "Шерик (синов)", bolim: "Цех", tarif: 40000, tg: 700000043, sinov: true });   // Достон 2026-10-12: ҳайдовчига рағбат ёзилмайди — тестер ходим бўлди

async function sora(uid, yol, usul = "GET", body) {
  const init = await initDataYasa({ id: uid, first_name: "U" + uid }, TOKEN);
  const res = await apiIshla(new Request("https://app/api" + yol, {
    method: usul, headers: { authorization: "tma " + init, "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  }), env);
  let d = {};
  try { d = await res.json(); } catch {}
  return { status: res.status, ...d };
}

const AZIZ = 700000017, NUR = 700000008, HIKMAT = 700000029, SARDOR = 700000004, RUSLAN = 700000043,
      DOSTON = 700000005, HUSNIDDIN = 700000040, BEGONA = 999000111, YUNUS = 700000034, KAMOL = 700000038, SHAHZOD = 700000007;
const H = (nom) => B.HODIMLAR.find((h) => h.nom === nom).id;

/* ════════════════ 1. ҚОИДАЛАР ════════════════ */
console.log("── ⏰ тугма вақтлари ──");
C("04:59 → «тугатдим» (тун)", B.ishTugmasi(T(2026, 9, 16, 4, 59)) === "t");
C("05:00 → «бошладим»", B.ishTugmasi(T(2026, 9, 16, 5, 0)) === "b");
C("08:59 → «бошладим»", B.ishTugmasi(T(2026, 9, 16, 8, 59)) === "b");
C("09:00 → тугма йўқ", B.ishTugmasi(T(2026, 9, 16, 9, 0)) === null);
C("18:00 → тугма йўқ", B.ishTugmasi(T(2026, 9, 16, 18, 0)) === null);
C("18:01 → «тугатдим»", B.ishTugmasi(T(2026, 9, 16, 18, 1)) === "t");
C("23:59 → «тугатдим»", B.ishTugmasi(T(2026, 9, 16, 23, 59)) === "t");

console.log("── ⏰ иш вақти ҳисоби ──");
{
  const r = B.ishHisob([
    { hodim: H("Ходим15"), tur: "b", vaqt: T(2026, 9, 16, 8, 0), kim: KAMOL, kim_ism: "Ходим15" },
    { hodim: H("Ходим15"), tur: "b", vaqt: T(2026, 9, 16, 7, 30), kim: KAMOL, kim_ism: "Ходим15" },
    { hodim: H("Ходим15"), tur: "t", vaqt: T(2026, 9, 16, 19, 0), kim: KAMOL, kim_ism: "Ходим15" },
    { hodim: H("Ходим15"), tur: "t", vaqt: T(2026, 9, 16, 20, 30), kim: KAMOL, kim_ism: "Ходим15" },
    { hodim: H("Ходим15"), tur: "t", vaqt: T(2026, 9, 16, 20, 0), kim: NUR, kim_ism: "Ходим03" },
    { hodim: H("Ходим03"), tur: "t", vaqt: T(2026, 9, 17, 1, 30), kim: NUR, kim_ism: "Ходим03" },
    { hodim: H("Ходим02"), tur: "t", vaqt: T(2026, 9, 16, 18, 1), kim: SHAHZOD, kim_ism: "Ходим02" },
  ]);
  const q = (n) => r.find((x) => x.hodim.nom === n);
  // 🧰 Достон 2026-10-16: Ходим15 ГРУЗЧИК — иш куни 08:00 да бошланади (аввал 09:00 эди)
  C("Ходим15 (грузчик): эрталаб 07:30 → 0:30 (08:00 гача), кечқурун 20:30 → 2:30, жами 3:00 = 105 000",
    q("Ходим15").boshladi === "07:30" && q("Ходим15").tugatdi === "20:30" && q("Ходим15").jami === 180 && q("Ходим15").summa === 105000, JSON.stringify(q("Ходим15")));
  C("Ходим15: бир кунда битта қатор (икки марта ёзилмайди)", r.filter((x) => x.hodim.nom === "Ходим15").length === 1);
  C("Ходим15 (Telegram'и йўқ) — Ходим03 ёзди: 2:00 = 70 000, «ким ёзди» кўринади",
    q("Ходим15").summa === 70000 && /Ходим03/.test(q("Ходим15").yozdi), JSON.stringify(q("Ходим15")));
  C("01:30 да «тугатдим» → ОЛДИНГИ кун (16.09), 18:00→01:30 = 7:30 = 262 500",
    q("Ходим03").sana === "2026-09-16" && q("Ходим03").jami === 450 && q("Ходим03").summa === 262500, JSON.stringify(q("Ходим03")));
  C("18:01 → 1 дақиқа × 40 000 = 667 (Ходим02)", q("Ходим02").summa === 667, JSON.stringify(q("Ходим02")));
  C("ҳайдовчи (Ходим10) иловада ёзилса ҲИСОБЛАНМАЙДИ — унинг соати расмдан", B.ishHisob([{ hodim: H("Ходим10"), tur: "t", vaqt: T(2026, 9, 16, 20, 0), kim: AZIZ }]).length === 0);
  const x = B.ishHisob([{ hodim: H("Ходим15"), tur: "b", vaqt: T(2026, 9, 16, 12, 0), kim: KAMOL }, { hodim: H("Ходим15"), tur: "t", vaqt: T(2026, 9, 16, 17, 0), kim: KAMOL }]);
  C("иш вақтидаги сохта ёзувлар ҳисобланмайди", x.length === 0, JSON.stringify(x));
  C("нотўғри ходим рақами — ўтказиб юборилади", B.ishHisob([{ hodim: 999, tur: "t", vaqt: T(2026, 9, 16, 20, 0), kim: 1 }]).length === 0);
}

console.log("── 🚚 юк: 2x, машина, вақт ──");
C("«2x», «2х», «2 X», «x2» → ташқари", B.ikkiX("Hodim04 2x") && B.ikkiX("2х") && B.ikkiX("Mijoz2 2 X") && B.ikkiX("x2"));
C("«1x», изоҳсиз, «12x», «2xona» → шаҳар ичи", !B.ikkiX("1x") && !B.ikkiX("") && !B.ikkiX("12x") && !B.ikkiX("2xona"));
{
  const X = [
    { guruh: "olish", uid: AZIZ, vaqt: T(2026, 9, 16, 8, 10), matn: "Hodim04 2x", albom: "A1", msg_id: 1 },
    { guruh: "olish", uid: AZIZ, vaqt: T(2026, 9, 16, 8, 10), matn: "", albom: "A1", msg_id: 2 },
    { guruh: "olish", uid: AZIZ, vaqt: T(2026, 9, 16, 8, 11), matn: "", albom: null, msg_id: 3 },
    { guruh: "olish", uid: AZIZ, vaqt: T(2026, 9, 16, 8, 40), matn: "Mijoz2", albom: null, msg_id: 4 },
    { guruh: "olish", uid: AZIZ, vaqt: T(2026, 9, 16, 12, 0), matn: "2x", albom: null, msg_id: 5 },
    { guruh: "olish", uid: AZIZ, vaqt: T(2026, 9, 16, 19, 0), matn: "2x", albom: null, msg_id: 6 },
    { guruh: "olish", uid: HIKMAT, vaqt: T(2026, 9, 16, 7, 0), matn: "1x", albom: null, msg_id: 7 },
    { guruh: "olish", uid: NUR, vaqt: T(2026, 9, 16, 7, 0), matn: "", albom: null, msg_id: 8 },
    { guruh: "topshirish", uid: AZIZ, vaqt: T(2026, 9, 16, 18, 30), matn: "2x", albom: null, msg_id: 9 },
    { guruh: "topshirish", uid: AZIZ, vaqt: T(2026, 9, 16, 15, 0), matn: "2x", albom: null, msg_id: 10 },
    { guruh: "topshirish", uid: YUNUS, vaqt: T(2026, 9, 16, 8, 59), matn: "Hodim06", albom: null, msg_id: 11 },
    { guruh: "topshirish", uid: YUNUS, vaqt: T(2026, 9, 16, 18, 0), matn: "", albom: null, msg_id: 12 },
  ];
  const o = B.yukHisob(X, "olish"), t = B.yukHisob(X, "topshirish");
  const az = o.yuklar.filter((y) => y.hodim.nom === "Ходим10");
  C("юк олиш: альбом + 1 дақиқадан кейинги расм = 1 юк (3 расм)", az[0] && az[0].rasm === 3, JSON.stringify(az));
  C("юк олиш КУН БЎЙИ: 08:10, 08:40, 12:00, 19:00 — 4 та юк", az.length === 4 && az.map((y) => y.vaqt).join() === "08:10,08:40,12:00,19:00", az.map((y) => y.vaqt).join());
  C("Ходим10 (кичик): 2x = 20 000, шаҳар ичи = 10 000", az.map((y) => y.bonus).join() === "20000,10000,20000,20000");
  C("Ходим15 ака (16.09 дан Дамас) «1x» → шаҳар ичи 10 000", o.yuklar.find((y) => y.hodim.nom === "Ходим15 ака").bonus === 10000);
  C("изоҳдаги исм («Hodim04») эмас — расм ташлаган Ходим10га", az[0].hodim.nom === "Ходим10");
  C("Ходим03 ҳайдовчи эмас → ҳисобланмайди", !o.yuklar.some((y) => y.hodim.nom === "Ходим03") && o.tanilmagan === 1);
  const tv = t.yuklar.map((y) => y.hodim.nom + "@" + y.vaqt + "=" + y.bonus).join();
  C("юк топшириш КУН БЎЙИ: 15:00, 18:30, 08:59, 18:00 — ҳаммаси", tv === "Ходим10@15:00=20000,Ходим10@18:30=20000,Ходим15@08:59=20000,Ходим15@18:00=20000", tv);
  // ⏰ ҳайдовчининг қўшимча соати — расмдан
  const hs = B.haydovchiSoat(X);
  const hq = (n) => hs.find((q) => q.hodim.nom === n);
  // Достон 2026-10-27: кечқурунги вақт иккала гуруҳдан — Ходим10нинг 19:00 даги «юк олиш» расми ҳам ҳисобланади
  C("Ходим10 соати: эрталабки ЙЎҚ, кечқурун энг кечи — 19:00 юк олиш (1 соат) = 40 000",
    hq("Ходим10") && hq("Ходим10").boshladi === "" && hq("Ходим10").tugatdi === "19:00" && hq("Ходим10").jami === 60 && hq("Ходим10").summa === 40000, JSON.stringify(hq("Ходим10")));
  C("Ходим15 ака: эрталабки LOGISTIKA расми соат бермайди", !hq("Ходим15 ака"), JSON.stringify(hq("Ходим15 ака")));
  C("Ходим15: эрталабки расм соат бермайди, 18:00 роса — соат ЙЎҚ", !hq("Ходим15"), JSON.stringify(hq("Ходим15")));
  C("Ходим03 (ҳайдовчи эмас) расмдан соат олмайди", !hq("Ходим03"));
  const tun = B.haydovchiSoat([{ guruh: "topshirish", uid: AZIZ, vaqt: T(2026, 9, 17, 1, 0) }, { guruh: "topshirish", uid: AZIZ, vaqt: T(2026, 9, 16, 19, 0) }]);
  C("ярим тундан кейин (01:00) «Юк топшириш» расми — олдинги кун, 18:00→01:00 = 7:00 = 280 000", tun.length === 1 && tun[0].sana === "2026-09-16" && tun[0].tugatdi === "01:00" && tun[0].summa === 280000, JSON.stringify(tun));
}

console.log("── 🗓 давр (16 → 15) ──");
C("16.09 00:05 → 16.09–15.10", B.davrOl(T(2026, 9, 16, 0, 5)).bosh === "2026-09-16");
C("15.09 23:59 → 16.08–15.09", B.davrOl(T(2026, 9, 15, 23, 59)).bosh === "2026-08-16");
C("05.01.2027 → 16.12.2026–15.01.2027", B.davrOl(T(2027, 1, 5, 12, 0)).oxir === "2027-01-15");
C("охирги 4 давр", B.davrlar(T(2026, 9, 20, 12, 0), 4).map((x) => x.bosh).join() === "2026-09-16,2026-08-16,2026-07-16,2026-06-16");

console.log("── 👥 ходимлар рўйхати ──");
C("38 та ходим (+ синов), рақамлар такрорланмайди — Ходим07 2026-10-08 да асосий рўйхатга кўчирилди", B.HODIMLAR.filter((h) => !h.sinov).length === 38 && new Set(B.HODIMLAR.map((h) => h.id)).size === B.HODIMLAR.length && B.HODIMLAR.filter((h) => !h.sinov && !h.ketgan).length === 37);
C("синов ходимлари фақат Достон ва Шерик (тестерлар)", B.HODIMLAR.filter((h) => h.sinov).every((h) => h.tg === DOSTON || h.tg === RUSLAN));
C("Telegram id такрорланмайди (қўшимча аккаунтлар билан)", new Set(B.HODIMLAR.flatMap(B.hodimTgLari)).size === B.HODIMLAR.flatMap(B.hodimTgLari).length);
C("Ходим15 — иккала аккаунт ҳам (700000030 ва эски 700000031)", B.hodimTg(700000030).nom === "Ходим15" && B.hodimTg(700000031).nom === "Ходим15");
C("Ходим15нинг икки аккаунтидан ташланган расмлар — битта ҳайдовчига",
  B.yukHisob([{ guruh: "topshirish", uid: 700000030, vaqt: T(2026, 9, 17, 12, 0), matn: "", msg_id: 1 }, { guruh: "topshirish", uid: 700000031, vaqt: T(2026, 9, 17, 13, 49), matn: "Ходим04", msg_id: 2 }], "topshirish")
    .yuklar.filter((y) => y.hodim.nom === "Ходим15").length === 2);
C("Ходим05 ака (ҳайдовчи, Газел) = 700000013 «Ходим05ака Бигант»", B.hodimTg(700000013).nom === "Ходим05 ака" && B.hodimTg(700000013).mashina === "orta");
C("700000010 «Ходим05» — дўкон ходими, ҳайдовчи ЭМАС", B.hodimTg(700000010).nom === "Ходим05" && !B.hodimTg(700000010).mashina);
// Ходим15 — Исузу (катта), соатлик тарифи 70 000 (Достон 2026-10-15)
C("Ходим15: 15.09 — Дамас 40 000, 16.09 — Исузу 70 000", B.hodimKun(B.hodimOl(26), "2026-09-15").tarif === 40000 && B.hodimKun(B.hodimOl(26), "2026-09-16").tarif === 70000 && B.hodimKun(B.hodimOl(26), "2026-10-15").tarif === 70000);
C("ҳамма ҳайдовчида машина тоифаси бор", B.HODIMLAR.filter((h) => h.bolim === "Ҳайдовчи").every((h) => h.mashina));
// 🧰 Достон 2026-10-16: ГРУЗЧИКНИНГ иш куни 08:00 да бошланади — эрталабки бонус 08:00 гача
{
  const gr = B.HODIMLAR.find((h) => h.nom === "Ходим15"), od = B.HODIMLAR.find((h) => h.nom === "Ходим03");
  C("грузчик аниқланади (бўлим ёки исмда «грузчик»)", B.gruzchikmi(gr) && B.gruzchikmi(B.HODIMLAR.find((h) => h.nom === "Ходим15 грузчик")) && !B.gruzchikmi(od));
  C("грузчикда иш куни 08:00, бошқада 09:00", B.ishBoshi(gr) === 480 && B.ishBoshi(od) === 540);
  const b8 = (hodim, soat, daq) => ({ hodim, tur: "b", vaqt: Date.parse("2026-10-05T" + String(soat - 5).padStart(2, "0") + ":" + String(daq).padStart(2, "0") + ":00Z") / 1000, kim: 1 });
  const q = (hodim, soat, daq) => B.ishHisob([b8(hodim, soat, daq)])[0];
  C("грузчик 08:00 да босса — 0 дақиқа, пул ЙЎҚ", q(gr.id, 8, 0).jami === 0 && q(gr.id, 8, 0).summa === 0, JSON.stringify(q(gr.id, 8, 0)));
  C("грузчик 08:05 да босса — барибир 0 (кеч келган)", q(gr.id, 8, 5).jami === 0);
  C("грузчик 07:00 да босса — 1 соат (08:00 гача)", q(gr.id, 7, 0).jami === 60 && q(gr.id, 7, 0).summa === 35000, JSON.stringify(q(gr.id, 7, 0)));
  C("оддий ходим 08:00 да босса — 1 соат (09:00 гача)", q(od.id, 8, 0).jami === 60);
  C("оддий ходим 07:00 да босса — 2 соат", q(od.id, 7, 0).jami === 120);
}

// ✅ Достон 2026-10-19: 16.09–15.10 ҳисоб-китоби тугади, пуллар берилди — ЖОРИЙ давр ҳам ОЧИҚ.
// «1 ойлик» = жорий давр (16.10 дан), эски давр эса рўйхатдан танлаб юкланади.
{
  const U = (sana, soat = "12:00") => Date.parse(sana + "T" + soat + ":00Z") / 1000 - 5 * 3600;
  C("JORIY_YOPIQ ўчирилган — ҳеч бир давр ёпиқ эмас", B.JORIY_YOPIQ === null);
  C("19.10 да жорий давр (16.10) ОЧИҚ", B.davrYopiq("2026-10-16", U("2026-10-19")) === false);
  C("16.10 да ҳам жорий давр ОЧИҚ", B.davrYopiq("2026-10-16", U("2026-10-16")) === false);
  C("тугаган давр (16.09) ҳар доим ОЧИҚ", B.davrYopiq("2026-09-16", U("2026-10-19")) === false);
  C("кейинги ой (16.11) ўз даври ёпилмайди", B.davrYopiq("2026-11-16", U("2026-11-17")) === false);
  C("15.10 да (ҳали ҳисоб-китоб эмас) жорий давр ОЧИҚ", B.davrYopiq("2026-09-16", U("2026-10-15")) === false);
  C("19.10 да «1 ойлик» = ЖОРИЙ давр 16.10", B.davrlar(U("2026-10-19"), 3)[0].bosh === "2026-10-16");
  C("19.10 да эски давр 16.09 иккинчи ўринда", B.davrlar(U("2026-10-19"), 3)[1].bosh === "2026-09-16");
}
C("Ходим15 Газел — ўрта; Ходим15 Исузу (катта), Ходим08 Дамас — ДАВР бошидан (16.09)", B.hodimOl(14).mashina === "orta" && B.hodimKun(B.hodimOl(26), "2026-09-15").mashina === "kichik" && B.hodimKun(B.hodimOl(26), "2026-09-16").mashina === "katta" && B.hodimKun(B.hodimOl(8), "2026-09-15").mashina === "orta" && B.hodimKun(B.hodimOl(8), "2026-09-16").mashina === "kichik" && B.hodimKun(B.hodimOl(8), "2026-09-16").tarif === 40000);
{
  // Достон 2026-09-17: Ходим15 Дамас → Газел, Ходим15 ака Газел → Дамас.
  // Хўжайин 2026-09-28: алмашув ДАВР бошидан (16.09) — эски машина ўтган даврда (15.09 гача) қолади
  const RAVSHAN = 700000027;
  C("Ходим15: 15.09 — Дамас 40 000, 16.09 — Газел 70 000", B.hodimKun(B.hodimOl(21), "2026-09-15").mashina === "kichik" && B.hodimKun(B.hodimOl(21), "2026-09-15").tarif === 40000 && B.hodimKun(B.hodimOl(21), "2026-09-16").mashina === "orta" && B.hodimKun(B.hodimOl(21), "2026-09-16").tarif === 70000 && B.hodimKun(B.hodimOl(21), "2026-09-17").mashina === "orta");
  C("Ходим15 ака: 15.09 — Газел 70 000, 16.09 — Дамас 40 000", B.hodimKun(B.hodimOl(23), "2026-09-15").mashina === "orta" && B.hodimKun(B.hodimOl(23), "2026-09-16").mashina === "kichik" && B.hodimKun(B.hodimOl(23), "2026-10-05").tarif === 40000);
  const rs = [
    { guruh: "olish", uid: RAVSHAN, vaqt: T(2026, 9, 15, 12, 0), matn: "", albom: null, msg_id: 1 },
    { guruh: "olish", uid: RAVSHAN, vaqt: T(2026, 9, 16, 12, 0), matn: "2x", albom: null, msg_id: 2 },
    { guruh: "olish", uid: HIKMAT, vaqt: T(2026, 9, 15, 12, 0), matn: "", albom: null, msg_id: 3 },
    { guruh: "olish", uid: HIKMAT, vaqt: T(2026, 9, 16, 12, 0), matn: "", albom: null, msg_id: 4 },
    { guruh: "topshirish", uid: RAVSHAN, vaqt: T(2026, 9, 15, 19, 0), albom: null, msg_id: 5 },
    { guruh: "topshirish", uid: RAVSHAN, vaqt: T(2026, 9, 16, 19, 0), albom: null, msg_id: 6 },
    { guruh: "topshirish", uid: HIKMAT, vaqt: T(2026, 9, 16, 19, 0), albom: null, msg_id: 7 },
  ];
  const yk = B.yukHisob(rs, "olish").yuklar.map((y) => y.hodim.nom + "@" + y.sana.slice(8) + "=" + y.bonus).join();
  C("юк: Ходим15 15.09 Дамас 10 000, 16.09 Газел 2x 40 000; Ходим15 15.09 Газел 20 000, 16.09 Дамас 10 000", yk === "Ходим15@15=10000,Ходим15@16=40000,Ходим15 ака@15=20000,Ходим15 ака@16=10000", yk);
  const sk = B.haydovchiSoat(rs).map((q) => q.hodim.nom + "@" + q.sana.slice(8) + "=" + q.summa).sort().join();
  C("соат (18:00→19:00): Ходим15 15.09 40 000, 16.09 70 000; Ходим15 16.09 40 000", sk === "Ходим15@15=40000,Ходим15@16=70000,Ходим15 ака@16=40000", sk);
  const xl = await B.bonusExcel({ davr: B.davrOl(T(2026, 9, 16, 12, 0)), gacha: T(2026, 9, 16, 23, 0), ish: B.haydovchiSoat(rs), olish: B.yukHisob(rs, "olish"), topshirish: B.yukHisob(rs, "topshirish"), ragbat: [] });
  C("Excel ясалади (машина алмашган ҳайдовчилар билан)", xl && (xl.byteLength || xl.length) > 1000);
  // 📊 Достон 2026-10-16: Раҳбар ака файлида «Жами» варағи — БИРИНЧИ варақ, ҳар бир ходим битта қаторда
  {
    const d0 = { davr: B.davrOl(T(2026, 9, 16, 12, 0)), gacha: T(2026, 9, 16, 23, 0),
      ish: B.haydovchiSoat(rs), olish: B.yukHisob(rs, "olish"), topshirish: B.yukHisob(rs, "topshirish"), ragbat: [] };
    const v = B.bonusVaraqlar(d0, "синов");
    C("варақлар тартиби — Раҳбар аканинг эски файлидагидек", v.map((x) => x.name).join(",") === "Ишбай,Рағбат,Юк олиш,Ходимлар Жами,Жами сумма", v.map((x) => x.name).join(","));
    C("«Юк топшириш» тўлиқ рўйхати бу файлда ЙЎҚ — алоҳида файлда", !v.some((x) => x.name === "Юк топшириш"));
    const qator = (r) => (r || []).map((x) => (x && x.v !== undefined ? x.v : x && x.f !== undefined ? "=" + x.f : ""));
    const satrlar = v.find((x) => x.name === "Ходимлар Жами").rows.map(qator);
    const mat = satrlar.map((r) => r.join("|")).join("\n");
    const jamiSatr = v.find((x) => x.name === "Жами сумма").rows.map(qator).map((r) => r.join("|")).join("\n");
    C("«Жами сумма» варағида Жами қатори ва формула", /\|Жами\|/.test(jamiSatr) && /=SUM\(D\d+:D\d+\)/.test(jamiSatr), jamiSatr.slice(-300));
    C("«Жами сумма» бўлим қаторлари (эски файлдагидек ёзув)",
      /ишдан ташқари ишлаган суммаси/.test(jamiSatr) && /юк олиш бонуси суммаси/.test(jamiSatr) &&
      /рағбатлантириш суммаси/.test(jamiSatr), jamiSatr.slice(0, 400));
    C("«Жами сумма»да ЮК ТОПШИРИШ қатори ЙЎҚ", !/юк топшириш/i.test(jamiSatr), jamiSatr.slice(0, 400));
    const nomlar = [...new Set([...d0.ish.map((z) => z.hodim.nom), ...d0.olish.yuklar.map((y) => y.hodim.nom), ...d0.topshirish.yuklar.map((y) => y.hodim.nom)])];
    C("ҳар бир ходим битта қаторда (№ 5-қатордан)", nomlar.every((n) => satrlar.some((r) => r[1] === n)), nomlar.join(","));
    C("ходим қаторида ЖАМИ = иш вақти + юк олиш (юк топшириш бу файлда ЙЎҚ)",
      nomlar.every((n) => {
        const ish = d0.ish.filter((z) => z.hodim.nom === n).reduce((q, z) => q + z.summa, 0);
        const ol = d0.olish.yuklar.filter((y) => y.hodim.nom === n).reduce((q, y) => q + y.bonus, 0);
        const r = satrlar.find((q) => q[1] === n);
        if (!ish && !ol) return !r;                       // фақат топшириши борлар жадвалда йўқ
        return r && r[2] === ish + ol && r[3] === ish && r[5] === (ol || "");
      }), mat.slice(0, 400));
    C("«Ходимлар Жами»да ЮК ТОПШИРИШ устуни ЙЎҚ", !/топшириш/i.test(mat), mat.slice(0, 300));
    C("«округлит» устуни ЙЎҚ (ишхона зарарига ишларди)", !/Округлит/.test(mat) && !B.okruglit);
  }
}

/* ════════════════ 2. API — ҲАР БИР ОДАМ НОМИДАН ════════════════ */
console.log("── 👤 ким кира олади ──");
{
  const a = await sora(AZIZ, "/me");
  // «vozvratkor» — Возврат бўлими ҳаммага очилгани (2026-10-19) учун ҳар кимда бор, бўлим эмас
  const rol = (x) => x.rollar.filter((r) => r !== "vozvratkor").join();
  C("Ходим10 (ҳайдовчи) — КИРАДИ, роли «haydovchi»", a.status === 200 && rol(a) === "haydovchi", JSON.stringify(a.rollar));
  C("Ходим10да ягона бўлим — «Ҳайдовчи»: Иш вақти, Тошкентга кирдим (Рағбат 2026-10-12 да олиб ташланди)", bolimlar(a.rollar).join() === "haydovchi" && tablarOl("haydovchi", a.rollar).map((x) => x[2]).join() === "ishvaqt,kirdim");
  const km = await sora(KAMOL, "/me");
  C("Ходим15 (ходим, ҳайдовчи эмас) — «haydovchi» роли ЙЎҚ, Бонус очиқ", !km.rollar.includes("haydovchi") && km.bonus === true, JSON.stringify(km.rollar));
  const hm = await sora(700000028, "/me");
  C("Ходим15 ака: Ошпаз (Ҳисоб) ва Ҳайдовчи — бонус очиқ (2026-09-30)", bolimlar(hm.rollar).includes("oshpaz") && bolimlar(hm.rollar).includes("haydovchi") && hm.bonus === true, JSON.stringify(bolimlar(hm.rollar)));
  C("19 та ҳайдовчининг ҳаммаси «haydovchi» ролида", (await Promise.all(B.HODIMLAR.filter((h) => h.mashina).map((h) => sora(h.tg, "/me")))).every((x) => x.rollar.includes("haydovchi")));
  const b = await sora(BEGONA, "/me");
  C("бегона одам — аввалгидек КИРА ОЛМАЙДИ (403)", b.status === 403);
  C("бегона /bonus ни ҳам очолмайди", (await sora(BEGONA, "/bonus")).status === 403);
  const h = await sora(HUSNIDDIN, "/me");
  C("Ходим15 — бригадир + ишчи (2026-10-14) + алоҳида «Ходим» бўлими", rol(h) === "brigadir,ishchi,xodim", JSON.stringify(h.rollar));
  const s = await sora(SARDOR, "/me");
  C("Раҳбар ака — «xodim» қўшилмади (ўз бўлимлари)", !s.rollar.includes("xodim"));
  C("бошқа ролларнинг пастки панелида «Бонуслар» йўқ (админ, бригадир, ошхона, ошпаз, программист)", !["admin", "brigadir", "ishchi", "oshpaz", "developer"].some((r) => tablarOl(r, [r]).some((x) => x[2] === "bonus")));
  // Достон 2026-09-21 (бошқа ойнада): супер админда «Бонуслар» — алоҳида пастки тугма
  C("супер админда «Бонуслар» пастки тугмаси бор", tablarOl("superadmin", ["superadmin"]).some((x) => x[2] === "bonus"));
  // Достон 2026-09-17: бухгалтер, сотувчи, ошпаз, бригадир, ошхона, админ — Бонус бўлимини КЎРМАСИН
  for (const [n, id] of [["Админ ака (админ)", 700000041], ["Ходим15 (бухгалтер)", 700000044],
    ["ошпаз", 1855283494]]) {
    const me = await sora(id, "/me");
    // ⚠️ 2026-11-11: Админ ака огоҳлантириш ёзади — /bonus (ҳолат) очиқ, лекин рағбат ва Excel ЁПИҚ
    const yopiq = id === 700000041
      ? (await sora(id, "/bonus/ragbat", "POST", { kimga: "h" + H("Ходим15"), matn: "бир нарса" })).status === 403
        && (await sora(id, "/bonus/excel", "POST", {})).status === 403 && (await sora(id, "/bonus/ish", "POST", { tur: "t" })).status === 403
      : (await sora(id, "/bonus")).status === 403;
    C(`${n}: юқоридаги Бонус тугмаси ЙЎҚ, ${id === 700000041 ? "рағбат/Excel/иш вақти" : "/bonus"} — 403`, me.status === 200 && me.bonus === false && yopiq, JSON.stringify({ s: me.status, b: me.bonus }));
  }
  // Достон 2026-09-18: сотувчи (Ходим15 ака) — ўз бўлимида Рағбат ёзади, «Иш вақти» эса йўқ
  const xs = await sora(700000042, "/me");
  C("Ходим15 ака (сотувчи): Бонус очиқ — рағбат ёза олади", xs.bonus === true && (await sora(700000042, "/bonus")).status === 200);
  C("Ходим15 ака ходимлар рўйхатида йўқ — «Иш вақти» ёза олмайди (403)", (await sora(700000042, "/bonus/ish", "POST", { tur: "t", qoshimcha: [H("Ходим15")] })).status === 403);
  for (const [n, id] of [["Раҳбар ака", SARDOR], ["Достон", DOSTON], ["Шерик (тестер)", RUSLAN],
    ["Ходим15 (бригадир, лекин ходимлар рўйхатида)", HUSNIDDIN], ["Ходим10 (ҳайдовчи)", AZIZ]]) {
    const me = await sora(id, "/me");
    C(`${n}: Бонус очиқ`, me.bonus === true && (await sora(id, "/bonus")).status === 200, JSON.stringify({ s: me.status, b: me.bonus }));
  }
}

console.log("── ⏰ тугмалар (сервер вақти) ──");
{
  soatQoy(8, 0);
  let r = await sora(AZIZ, "/bonus");
  C("08:00 — «Ишни бошладим» очиқ; Ходим10 ҳайдовчи — унга «Иш вақти» кўрсатилмайди", r.tugma === "b" && r.men && r.men.nom === "Ходим10" && r.haydovchi === true, JSON.stringify({ t: r.tugma, m: r.men, h: r.haydovchi }));
  C("«Иш вақти» рўйхатида ХАММА ходим бор (ҳайдовчи ҳам)", r.hodimlar.some((h) => h.nom === "Ходим10") && r.hodimlar.some((h) => h.nom === "Ходим15"));
  C("ҳайдовчида mashina белгиси бор (илова ажратсин)", (r.hodimlar.find((h) => h.nom === "Ходим10") || {}).mashina === "kichik");
  // 🚚 Достон 2026-10-13: эрталаб («b») ҳайдовчини ТАНЛАБ БЎЛМАЙДИ — вақти расмдан
  C("эрталаб ҳайдовчини танласа — РАД (403)", (await sora(NUR, "/bonus/ish", "POST", { tur: "b", qoshimcha: [H("Ходим10")] })).status === 403);
  C("эрталаб ҳайдовчи + ходим бирга — ҳам РАД (403)", (await sora(NUR, "/bonus/ish", "POST", { tur: "b", qoshimcha: [H("Ходим10"), H("Ходим15")] })).status === 403);
  // Тўлиқ (ҳамма ходим) Excel фақат Раҳбар акада; ходимда 3 та давр бор — ЎЗ шахсий Excel'и учун
  C("Ходим10га ТЎЛИҚ Excel кўринмайди, лекин ўз даврлари бор", r.excel === false && r.davrlar.length === 3);
  C("ишдан кетган 9 ходим рўйхатдан ўчирилган (Ходим15, Ходим15, Ходим15…)",
    !["Ходим15", "Ходим15", "Ходим15", "Ходим15", "Ходим15"].some((n) => B.HODIMLAR.some((h) => h.nom === n)) && r.hodimlar.some((h) => h.nom === "Ходим15"));
  soatQoy(12, 0);
  r = await sora(KAMOL, "/bonus");
  C("12:00 — тугма йўқ", r.tugma === null);
  C("12:00 да «бошладим» — РАД (409)", (await sora(KAMOL, "/bonus/ish", "POST", { tur: "b" })).status === 409);
  C("12:00 да «тугатдим» — РАД (409)", (await sora(KAMOL, "/bonus/ish", "POST", { tur: "t" })).status === 409);
  C("🧪 Ходим15 (тестер эмас) — синов режими ЙЎҚ", (await sora(KAMOL, "/bonus")).sinov === false);
  // «Иш вақти» тугмаларини синаш учун Достон вақтинча ҳайдовчи эмас (ҳайдовчини «Иш вақти»да танлаб бўлмайди)
  const d900 = B.hodimOl(900), m900 = d900.mashina; delete d900.mashina;
  const ds = await sora(DOSTON, "/bonus");
  C("🧪 Достон (тестер) — синов режими бор", ds.sinov === true && ds.men && ds.men.nom === "Достон (синов)");
  C("🧪 синовда ҳам БИТТА тугма: аввал «бошладим»", ds.tugma === "b", ds.tugma);
  C("🧪 навбати бўлмаган «тугатдим» — РАД", (await sora(DOSTON, "/bonus/ish", "POST", { tur: "t", qoshimcha: [900] })).status === 409);
  C("🧪 12:00 да «бошладим» ✓", (await sora(DOSTON, "/bonus/ish", "POST", { tur: "b", qoshimcha: [900] })).status === 200);
  C("🧪 кейин тугма «тугатдим» га ўтади", (await sora(DOSTON, "/bonus")).tugma === "t");
  C("🧪 «тугатдим» ✓ → яна «бошладим»", (await sora(DOSTON, "/bonus/ish", "POST", { tur: "t", qoshimcha: [900] })).status === 200 && (await sora(DOSTON, "/bonus")).tugma === "b");
  d900.mashina = m900;   // Достон — синов ҳайдовчиси (2026-09-17)
  const dsd = await B.davrMalumot(env, B.davrOl(T(2026, 9, 16, 12, 0)), T(2026, 9, 16, 12, 1));
  C("🧪 иш вақтида босилган синов ёзуви пулга ҲИСОБЛАНМАЙДИ", !dsd.ish.some((q) => q.hodim.nom === "Достон (синов)"));
  soatQoy(7, 45);
  C("ҳеч ким танланмаса — РАД (ўзи АВТОМАТИК қўшилмайди)", (await sora(KAMOL, "/bonus/ish", "POST", { tur: "b" })).status === 400);
  const b1 = await sora(KAMOL, "/bonus/ish", "POST", { tur: "b", qoshimcha: [H("Ходим15")] });
  C("07:45 Ходим15 ўзини танлаб «бошладим» ✓", b1.status === 200 && b1.kimlar.join() === "Ходим15", JSON.stringify(b1));
  soatQoy(8, 10);
  C("бир марта: Ходим15 қайта «бошладим» — РАД (аллақачон ёзилган)", (await sora(KAMOL, "/bonus/ish", "POST", { tur: "b", qoshimcha: [H("Ходим15")] })).status === 409);
  const aq = await sora(KAMOL, "/bonus/ish", "POST", { tur: "b", qoshimcha: [H("Ходим15"), H("Ходим15")] });
  C("Ходим15 + Ходим15 танланди: фақат Ходим15 ёзилди, Ходим15 «аввал ёзилган»", aq.status === 200 && aq.kimlar.join() === "Ходим15" && aq.oldin.join() === "Ходим15", JSON.stringify(aq));
  soatQoy(8, 20);
  const nb = await sora(NUR, "/bonus/ish", "POST", { tur: "b", qoshimcha: [H("Ходим15 кичик")] });
  C("Ходим03 Telegram'сиз Ходим15ни ёзди — Ходим03нинг ЎЗИ ёзилмади", nb.status === 200 && nb.kimlar.join() === "Ходим15 кичик", JSON.stringify(nb));
  soatQoy(7, 45);
  C("07:45 да «тугатдим» — РАД", (await sora(KAMOL, "/bonus/ish", "POST", { tur: "t", qoshimcha: [H("Ходим15")] })).status === 409);
  soatQoy(19, 30);
  const q = await sora(NUR, "/bonus/ish", "POST", { tur: "t", qoshimcha: [H("Ходим15"), H("Ходим15"), H("Ходим15 грузчик"), H("Ходим15"), 999, H("Ходим03")] });
  C("19:30 Ходим15, Ходим15, Ходим15 грузчик, Ходим03 — такрор/сохта рақамлар ташланди", q.status === 200 && q.kimlar.join() === "Ходим15,Ходим15,Ходим15 грузчик,Ходим03", JSON.stringify(q));
  soatQoy(20, 15);
  const q3 = await sora(NUR, "/bonus/ish", "POST", { tur: "t", qoshimcha: [H("Ходим15")] });
  C("«тугатдим» қайта ёзилади (энг кечи олинади)", q3.status === 200 && q3.kimlar.join() === "Ходим15");
  soatQoy(19, 50);
  const bekorlik = await sora(KAMOL, "/bonus/ish", "POST", { tur: "t", qoshimcha: [H("Ходим15")] });
  C("19:50 Ходим15 «тугатдим» ✓", bekorlik.status === 200);
  const g = await sora(KAMOL, "/bonus");
  const yoz = g.bugun.find((y) => y.tur === "t" && y.meniki);
  // 3 та: ўзининг бошладими ва тугатдими + ўзи ёзган Ходим15 (API'да бор, иловада кўрсатилмайди)
  C("API: Ходим15 ёзган ёзувлар (Ходим15 ҳам); «бекор» майдони йўқ", g.bugun.length === 3 && yoz && yoz.bekorMumkin === undefined, JSON.stringify(g.bugun));
  // Шерик 2026-09-24: «Бекор қилиш» олиб ташланди — йўл йўқ, гуруҳга ҳеч нима кетмайди
  const nurYoz = (await sora(NUR, "/bonus")).bugun.find((y) => y.hodim === "Ходим15");
  soatQoy(19, 38);
  chiq = [];
  C("«бекор» йўли йўқ (404), гуруҳга хабар кетмади", (await sora(NUR, "/bonus/ish/" + nurYoz.id + "/bekor", "POST", {})).status === 404 && chiq.length === 0);
  soatQoy(20, 15);
  C("Шерик ҳеч кимни танламаса — РАД", (await sora(RUSLAN, "/bonus/ish", "POST", { tur: "t" })).status === 400);

  // Натижа: базадан давр ҳисоби
  const d = await B.davrMalumot(env, B.davrOl(T(2026, 9, 16, 20, 0)), T(2026, 9, 16, 23, 0));
  const q2 = (n) => d.ish.find((x) => x.hodim.nom === n);
  C("Ходим15 (грузчик): 07:45→0:15 + 19:50→1:50 = 2:05 = 72 917", q2("Ходим15") && q2("Ходим15").jami === 125 && q2("Ходим15").summa === 72917, JSON.stringify(q2("Ходим15")));
  C("Ходим15: 19:30 ва 20:15 ёзилган → ЭНГ КЕЧ 20:15 = 2:15 = 78 750", q2("Ходим15") && q2("Ходим15").jami === 135 && q2("Ходим15").summa === 78750, JSON.stringify(q2("Ходим15")));
  C("Ходим15: 19:30 → 1:30 = 52 500 (бекор қилиш йўқ — ёзув қолади)", q2("Ходим15") && q2("Ходим15").summa === 52500, JSON.stringify(q2("Ходим15")));
  C("Ходим15 грузчик: 19:30 → 1:30 = 52 500", q2("Ходим15 грузчик") && q2("Ходим15 грузчик").summa === 52500);
  C("Ходим15 кичик (Ходим03 ёзган): 08:20 → 0:40 = 23 333", q2("Ходим15 кичик") && q2("Ходим15 кичик").summa === 23333 && /Ходим03/.test(q2("Ходим15 кичик").yozdi), JSON.stringify(q2("Ходим15 кичик")));
  C("Ходим03: эрталаб ЁЗИЛМАГАН (фақат 19:30 → 1:30)", q2("Ходим03") && q2("Ходим03").ertalab === 0 && q2("Ходим03").summa === 52500, JSON.stringify(q2("Ходим03")));
}

console.log("── 🎁 рағбатлантириш ──");
{
  soatQoy(14, 0);
  chiq = [];
  const r = await sora(DOSTON, "/bonus/ragbat", "POST", { kimga: "h901", matn: "Перфоуголокни ўзи ортиб олди <b>485</b> та" });
  const e = chiq.find((x) => x.met === "sendMessage");
  // 🚫 2026-09-19 (src/taqiq.js): BIGANT гуруҳига эълон КЕТМАЙДИ — ёзув сақланади, guruhga:false
  C("Достон → Шерик: сақланди ва BIGANT гуруҳига кетди (бонус — тақиқдан истисно, 2026-09-21)", r.status === 200 && r.kimga === "Шерик (синов)" && r.guruhga === true, JSON.stringify(r));
  C("эълон: «🎁 РАҒБАТЛАНТИРИШ», ким, кимга (рўйхат), матн — < > escape", e && Number(e.chat_id) === B.BIGANT_GURUH && e.parse_mode === "HTML" && e.text === "<pre>📨 РАҒБАТЛАНТИРИШ\n\n✍️ Достон (синов)\n👥 Кимга:\n  • Шерик (синов)\n\n📝 Перфоуголокни ўзи ортиб олди &lt;b&gt;485&lt;/b&gt; та</pre>", JSON.stringify(e));
  C("🚚 Ходим10 (ҳайдовчи) рағбат ЁЗА ОЛМАЙДИ — 403 (Достон 2026-10-12)", (await sora(AZIZ, "/bonus/ragbat", "POST", { kimga: "h" + H("Ходим15"), matn: "Клиентга юкни ўзи туширди" })).status === 403);
  chiq = [];
  const kop = await sora(DOSTON, "/bonus/ragbat", "POST", { kimga: ["h" + H("Ходим15"), "h" + H("Ходим15"), "h901", "h" + H("Ходим15")], matn: "Цехни ўзлари тозалашди" });
  const kopE = chiq.filter((x) => x.met === "sendMessage");
  C("бир нечта одам: 3 киши (такрор ташланди) — Excel учун 3 та ёзув", kop.status === 200 && kop.soni === 3, JSON.stringify(kop));
  C("бир нечта одам — гуруҳга БИТТА эълон, ҳамма исми билан", kopE.length === 1 && kopE[0].text.includes("👥 Кимга:\n  • Ходим15\n  • Ходим15\n  • Шерик (синов)\n"), JSON.stringify(kopE));
  const ozi = await sora(DOSTON, "/bonus/ragbat", "POST", { kimga: ["h" + H("Ходим15"), "h900"], matn: "синов" });
  C("ўз исмини танласа — РАД (Шерик 2026-09-24: ўзини рағбатлантириб бўлмайди)", ozi.status === 403, JSON.stringify(ozi));
  const oziR = await sora(RUSLAN, "/bonus/ragbat", "POST", { kimga: ["u" + RUSLAN], matn: "синов" });
  C("иловадаги одам ҳам ўзини танлай олмайди (u<id>)", oziR.status === 403, JSON.stringify(oziR));
  const gD = await sora(DOSTON, "/bonus");
  C("рўйхатда ўз исми йўқ (Достон — h900)", gD.kimlar && gD.kimlar.length > 0 && !gD.kimlar.some((k) => k.k === "h900"), JSON.stringify((gD.kimlar || []).slice(0, 3)));
  const faqat = await sora(KAMOL, "/bonus/ragbat", "POST", { kimga: ["h" + H("Ходим15")], matn: "фақат Ходим15" });
  C("ўзини танламаса — ўзига ЁЗИЛМАЙДИ (фақат Ходим15)", faqat.status === 200 && faqat.kimga === "Ходим15" && faqat.soni === 1, JSON.stringify(faqat));
  C("матнсиз — РАД", (await sora(KAMOL, "/bonus/ragbat", "POST", { kimga: "h" + H("Ходим15"), matn: " " })).status === 400);
  C("рўйхатда йўқ одамга — РАД", (await sora(KAMOL, "/bonus/ragbat", "POST", { kimga: "u12345", matn: "бир нарса" })).status === 400);
  C("бегона — РАД (403)", (await sora(BEGONA, "/bonus/ragbat", "POST", { kimga: "h" + H("Ходим15"), matn: "бир нарса" })).status === 403);
}

console.log("── 📝 «Иш вақти» изоҳи (Достон 2026-09-30) ──");
{
  soatQoy(19, 30);
  chiq = [];
  const r = await sora(KAMOL, "/bonus/ish", "POST", { tur: "t", qoshimcha: [H("Ходим15"), H("Ходим15")], izoh: "  Ходим04нинг   заказини ортдик  " });
  C("изоҳ билан ёзилди", r.status === 200 && r.izoh === "Ходим04нинг заказини ортдик", JSON.stringify(r));
  const x = chiq.find((c) => c.met === "sendMessage" && /Ишни тугатди/.test(String(c.text)));
  C("🔔 ўзини белгилаган — ботда шахсий хабар ЙЎҚ", !chiq.some((c) => Number(c.chat_id) === KAMOL), JSON.stringify(chiq.map((c) => c.chat_id)));
  C("гуруҳ хабарида изоҳ бор", x && /📝 Ходим04нинг заказини ортдик/.test(String(x.text)), x && x.text);
  // 📢 Достон 2026-10-21 (Раҳбар ака сўради): сарлавҳа + исмлар рўйхати
  const kut = ["<b>✅ Ишни тугатди</b>", "", "👥 Ким ёзди: Ходим15", "  • Ходим15", "", "📝 Ходим04нинг заказини ортдик"].join("\n");
  C("гуруҳ хабари янги кўринишда: сарлавҳа + исмлар", x && String(x.text) === kut, JSON.stringify(x && x.text));
  C("исм такрорланмайди (эски кўриниш йўқ)", x && !/Ходим15 Ишни тугатди/.test(String(x.text)));
  // ✍️ Достон 2026-11-04: тепада ҳар доим «Ким ёзди: Исм»
  C("✍️ ўзини қўшган бўлса — фақат «Ким ёзди»да, рўйхатда такрорланмайди",
    B.ishXabar("t", "19:00", ["Ходим01", "Ходим15"], "", "Ходим01")
      === ["<b>✅ Ишни тугатди</b>", "", "👥 Ким ёзди: Ходим01", "  • Ходим15"].join("\n"),
    JSON.stringify(B.ishXabar("t", "19:00", ["Ходим01", "Ходим15"], "", "Ходим01")));
  C("✍️ ўзини қўшмаса — «Ким ёзди» да туради, рўйхатда ЙЎҚ (бонус ёзилмайди)",
    B.ishXabar("t", "19:00", ["Ходим15", "Ходим15"], "", "Ходим01")
      === ["<b>✅ Ишни тугатди</b>", "", "👥 Ким ёзди: Ходим01", "  • Ходим15", "  • Ходим15"].join("\n"),
    JSON.stringify(B.ishXabar("t", "19:00", ["Ходим15", "Ходим15"], "", "Ходим01")));
  C("✍️ изоҳ билан: Ким ёзди → исмлар → 📝 изоҳ",
    B.ishXabar("t", "19:21", ["Ходим15"], "Қоп кетдик", "Ходим01")
      === ["<b>✅ Ишни тугатди</b>", "", "👥 Ким ёзди: Ходим01", "  • Ходим15", "", "📝 Қоп кетдик"].join("\n"),
    JSON.stringify(B.ishXabar("t", "19:21", ["Ходим15"], "Қоп кетдик", "Ходим01")));
  C("✍️ исм қисқа ёзилади («Ходим15 грузчик» → «Ходим15») — ЁЗГАНда ҳам",
    B.ishNomlari(["Ходим15"], "Ходим15 грузчик").yozdi === "Ходим15",
    JSON.stringify(B.ishNomlari(["Ходим15"], "Ходим15 грузчик")));
  C("✍️ ёзган одам берилмаса — «Ким ёзди» сатри йўқ (эскидек)",
    B.ishXabar("t", "19:00", ["Ходим15", "Ходим15"], "") === ["<b>✅ Ишни тугатди</b>", "", "  • Ходим15", "  • Ходим15"].join("\n"));
  C("эрталабки хабар ҳам шунday", B.ishXabar("b", "07:40", ["Ходим15"], "") === ["<b>✅ Ишни бошлади</b>", "", "  • Ходим15"].join("\n"),
    JSON.stringify(B.ishXabar("b", "07:40", ["Ходим15"], "")));
  const dd = await B.davrMalumot(env, B.davrOl(T(2026, 9, 16, 19, 30)), T(2026, 9, 16, 19, 35));
  const q = dd.ish.find((y) => y.hodim.nom === "Ходим15");
  C("ҳисобда изоҳ бор", q && /Кечқурун: Ходим04нинг заказини ортдик/.test(String(q.izoh)), JSON.stringify(q && q.izoh));
  const q2 = dd.ish.find((y) => y.hodim.nom === "Ходим15");
  C("қўшимча танланган ходимда ҳам изоҳ бор", q2 && /Ходим04нинг заказини ортдик/.test(String(q2.izoh)));
  const xl = await B.bonusExcel(dd);
  C("Excel ясалади ва изоҳ ичида", xl && (xl.byteLength || xl.length) > 1000);
  chiq = [];
  const r2 = await sora(KAMOL, "/bonus/ish", "POST", { tur: "t", qoshimcha: [H("Ходим15")] });
  const x2 = chiq.find((c) => c.met === "sendMessage");
  C("изоҳсиз ҳам ишлайди (ихтиёрий)", r2.status === 200 && r2.izoh === null && x2 && !/📝/.test(String(x2.text)), JSON.stringify(r2.izoh));
  C("узун изоҳ 200 белгига қисқаради", (await sora(KAMOL, "/bonus/ish", "POST", { tur: "t", qoshimcha: [H("Ходим15")], izoh: "я".repeat(300) })).izoh.length === 200);
}

console.log("── 📊 Excel ──");
{
  soatQoy(21, 0);
  C("Ходим10 Excel ола ОЛМАЙДИ (403)", (await sora(AZIZ, "/bonus/excel", "POST", { davr: "2026-09-16" })).status === 403);
  C("Шерик (супер админ эмас, Excel рўйхатида йўқ) ола ОЛМАЙДИ", (await sora(RUSLAN, "/bonus/excel", "POST", { davr: "2026-09-16" })).status === 403);
  chiq = [];
  const dx = await sora(DOSTON, "/bonus/excel", "POST", { davr: "2026-09-16" });
  C("Достон ола олади — файл ЎЗИНИНГ чатига", dx.status === 200 && chiq.some((c) => c.met === "sendDocument" && Number(c.chat_id) === DOSTON));
  const s = await sora(SARDOR, "/bonus");
  C("Раҳбар акага Excel бўлими ва даврлар кўринади", s.excel === true && s.davrlar[0].joriy && s.davrlar[0].bosh === "2026-09-16", JSON.stringify(s.davrlar));
  C("нотўғри давр — РАД", (await sora(SARDOR, "/bonus/excel", "POST", { davr: "2020-01-16" })).status === 400);
  chiq = [];
  const x = await sora(SARDOR, "/bonus/excel", "POST", { davr: "2026-09-16" });
  const d = chiq.find((c) => c.met === "sendDocument");
  C("Раҳбар ака: файл УНИНГ шахсий чатига юборилди", x.status === 200 && d && Number(d.chat_id) === SARDOR && d._fayl, JSON.stringify(x));
  C("файл билан ҲЕЧ ҚАНДАЙ изоҳ хабари йўқ (ҳаммаси Excel ичида)", d && !d.caption, d && d.caption);
  C("файл номи: «Рағбатлантириш ва бонус (16.09.2026-16.09.2026).xlsx»", d && d._fayl && d._fayl.name === "Рағбатлантириш ва бонус (16.09.2026-16.09.2026).xlsx", d && d._fayl && d._fayl.name);
}

console.log("── 👤 Шахсий Excel (ҳар ким ўзиники) ──");
{
  soatQoy(21, 0);
  const UMRZOQ = 700000006;
  // Ходим ўз Excel'ини юклайди
  chiq = [];
  const a1 = await sora(AZIZ, "/bonus/excel/shaxsiy", "POST", {});
  const f1 = chiq.find((c) => c.met === "sendDocument");
  C("Ходим10 ЎЗ Excel'ини юклай олади — файл ўзининг чатига", a1.status === 200 && f1 && Number(f1.chat_id) === AZIZ && f1._fayl, JSON.stringify(a1));
  C("файл номида ходимнинг исми бор", f1 && f1._fayl && f1._fayl.name.startsWith("Ходим10 — бонус ("), f1 && f1._fayl && f1._fayl.name);
  // Бошқанинг Excel'ини ола олмайди
  C("Ходим10 БОШҚА ходимнинг Excel'ини ола олмайди (403)", (await sora(AZIZ, "/bonus/excel/shaxsiy", "POST", { hodim: H("Ходим11") })).status === 403);
  // 🎁 Достон 2026-10-17 (Раҳбар аканинг файлидагидек): ҳар бир ходимда — ҳайдовчида ҳам —
  //    Жами · Ишбай · Рағбат · Юк олиш. Рағбат ҳайдовчида ҳам бор (Раҳбар ака уларга ҳам ёзган).
  {
    const zlib = await import("node:zlib");
    const dx = await B.davrMalumot(env, B.davrOl(T(2026, 9, 18, 12, 0)), T(2026, 9, 19, 12, 0));
    const varaq = async (id) => {
      const buf = Buffer.from(await B.shaxsiyExcel(dx, B.hodimOl(id)));
      for (let i = 0; i < buf.length - 30; i++) {
        if (buf.readUInt32LE(i) !== 0x04034b50) continue;
        const nl = buf.readUInt16LE(i + 26), el = buf.readUInt16LE(i + 28), cs = buf.readUInt32LE(i + 18);
        if (buf.slice(i + 30, i + 30 + nl).toString() === "xl/workbook.xml")
          return zlib.inflateRawSync(buf.slice(i + 30 + nl + el, i + 30 + nl + el + cs)).toString();
      }
      return "";
    };
    const wH = await varaq(H("Ходим10"));            // ҳайдовчи
    const wX = await varaq(H("Ходим15"));       // ходим
    const tartib = (w) => (w.match(/<sheet name="([^"]+)"/g) || []).map((x) => x.slice(13, -1)).join(" · ");
    C("ҳайдовчи Excel'и: Жами · Ишбай · Рағбат · Юк олиш", tartib(wH) === "Жами · Ишбай · Рағбат · Юк олиш", tartib(wH));
    C("ходим Excel'и ҳам: Жами · Ишбай · Рағбат · Юк олиш", tartib(wX) === "Жами · Ишбай · Рағбат · Юк олиш", tartib(wX));
    // 🔒 Достон 2026-10-16: шахсий файлда «Юк топшириш» умуман йўқ — ходимлар кўрмайди
    C("шахсий Excel'да «Юк топшириш» варағи ЙЎҚ (ҳайдовчида ҳам, ходимда ҳам)", !wH.includes('name="Юк топшириш"') && !wX.includes('name="Юк топшириш"'));
    C("биринчи варақ — «Жами» (умумий сумма, Достон 2026-10-13)", /<sheet name="Жами"/.test(wH) && /<sheet name="Жами"/.test(wX));
  }
  // Ходим01 ака — Telegram'и йўқларники
  const tgsiz = H("Ходим15 грузчик");
  chiq = [];
  const u1 = await sora(UMRZOQ, "/bonus/excel/shaxsiy", "POST", { hodim: tgsiz });
  const f2 = chiq.find((c) => c.met === "sendDocument");
  C("Ходим01 ака Telegram'и йўқ ходимнинг Excel'ини юклай олади", u1.status === 200 && f2 && Number(f2.chat_id) === UMRZOQ && f2._fayl.name.startsWith("Ходим15 грузчик — бонус ("), JSON.stringify(u1));
  C("Ходим01 ака Telegram'и БОР ходимникини ола олмайди (403)", (await sora(UMRZOQ, "/bonus/excel/shaxsiy", "POST", { hodim: H("Ходим11") })).status === 403);
  // Раҳбар ака — ҳамманики
  chiq = [];
  const s1 = await sora(SARDOR, "/bonus/excel/shaxsiy", "POST", { hodim: H("Ходим11") });
  C("Раҳбар ака ҳар қандай ходимнинг шахсий Excel'ини юклай олади", s1.status === 200 && chiq.some((c) => c.met === "sendDocument" && Number(c.chat_id) === SARDOR));
  // 🔒 Достон 2026-10-16: ҲАР БИР ходим ФАҚАТ ЎЗИНИКИНИ юклай олади — ҳаммасини текширамиз
  {
    const tgli = B.HODIMLAR.filter((h) => !h.ketgan && !h.sinov && B.hodimTgLari(h).length);
    const ozi = [], begona = [], fayl = [];
    for (const h of tgli) {
      const u = B.hodimTgLari(h)[0];
      if (u === SARDOR || u === UMRZOQ) continue;              // уларда кенг ҳуқуқ бор, алоҳида текширилди
      chiq = [];
      const r1 = await sora(u, "/bonus/excel/shaxsiy", "POST", {});
      const d1 = chiq.find((c) => c.met === "sendDocument");
      if (r1.status !== 200) ozi.push(h.nom + ":" + r1.status);
      else if (!d1 || Number(d1.chat_id) !== u || !String(d1._fayl.name).startsWith(h.nom + " — бонус (")) fayl.push(h.nom);
      const boshqa = tgli.find((q) => q.id !== h.id);
      const r2 = await sora(u, "/bonus/excel/shaxsiy", "POST", { hodim: boshqa.id });
      if (r2.status !== 403) begona.push(h.nom + "→" + boshqa.nom + ":" + r2.status);
    }
    C("ҲАР БИР ходим ЎЗ Excel'ини юклай олади (" + tgli.length + " киши)", ozi.length === 0, ozi.join(", "));
    C("файл ЎЗ чатига ва ЎЗ исми билан келади", fayl.length === 0, fayl.join(", "));
    C("ҲЕЧ БИР ходим бошқасининг Excel'ини ола ОЛМАЙДИ (403)", begona.length === 0, begona.join(", "));
  }
  // 🔎 Достон 2026-10-16: ҲАҚИҚИЙ ходим иловада «Менинг бонусим» бўлимини КЎРАДИМИ
  {
    const yoq = [];
    for (const nom of ["Ходим15", "Ходим15", "Ходим04", "Ходим15", "Ходим01"]) {
      const h = B.HODIMLAR.find((q) => q.nom === nom);
      const st = await sora(B.hodimTgLari(h)[0], "/bonus", "GET");
      if (!(st.excelMen === true && st.menRoyxatda === true && (st.davrlar || []).length >= 2))
        yoq.push(nom + ":" + JSON.stringify({ e: st.excelMen, m: st.menRoyxatda, d: (st.davrlar || []).length }));
    }
    C("ҳақиқий ходимда «Менинг бонусим» бўлими ва даврлар бор", yoq.length === 0, yoq.join(", "));
    // Эслатма: синовларда Достон «синов ходими» қилиб қўшилган (62-қатор), шунинг учун
    // бу ерда menRoyxatda = true. ПРОДАКШЕНДА у рўйхатда ЙЎҚ — иловада «ўз тугмаси»
    // ўрнида «🧪 Синов режими: сиз бонус рўйхатида йўқсиз» ёзуви чиқади.
    const dt = await sora(DOSTON, "/bonus", "GET");
    C("тестерда бўлим кўринади ва рўйхатдан ходим танлай олади", dt.excelMen === true && Array.isArray(dt.excelKimlar) && dt.excelKimlar.length > 30, dt.excelKimlar && dt.excelKimlar.length);
    // 📅 Достон 2026-10-19: «1 ойлик» = ЖОРИЙ давр (16.10 дан), эскиси ҳам танланади
    const ert = Math.floor(Date.parse("2026-10-19T09:00:00Z") / 1000) - 5 * 3600;
    const dl = B.davrlar(ert, 3);
    C("19.10 да «1 ойлик» = жорий давр 16.10 ва у ОЧИҚ", dl[0].bosh === "2026-10-16" && B.davrYopiq(dl[0].bosh, ert) === false, dl.map((x) => x.bosh).join(","));
    C("19.10 да эски давр 16.09–15.10 ҳам юкланади", dl[1].bosh === "2026-09-16" && B.davrYopiq(dl[1].bosh, ert) === false);
  }
  // 🚚 Достон 2026-10-16: «Юк топшириш» алоҳида файли — фақат Раҳбар акада
  C("ходим юк топшириш Excel'ини ола ОЛМАЙДИ (403)", (await sora(AZIZ, "/bonus/excel/topshirish", "POST", { davr: "2026-08-16" })).status === 403);
  C("Ходим01 ака ҳам ола ОЛМАЙДИ (403)", (await sora(UMRZOQ, "/bonus/excel/topshirish", "POST", { davr: "2026-08-16" })).status === 403);
  {
    chiq = [];
    const t1 = await sora(SARDOR, "/bonus/excel/topshirish", "POST", { davr: "2026-08-16" });
    const d1 = chiq.find((c) => c.met === "sendDocument");
    C("Раҳбар ака юк топшириш Excel'ини юклай олади", t1.status === 200 && d1 && Number(d1.chat_id) === SARDOR && String(d1._fayl.name).startsWith("Юк топшириш бонуси ("), JSON.stringify(t1) + (d1 ? " " + d1._fayl.name : ""));
  }
  // Бегона
  C("бонус рўйхатида йўқ одам — РАД", (await sora(BEGONA, "/bonus/excel/shaxsiy", "POST", {})).status === 403);
  // Ҳолат: рўйхатлар
  const az = await sora(AZIZ, "/bonus");
  C("оддий ходимга excelMen: true, бошқалар рўйхати БЎШ", az.excelMen === true && az.excelKimlar.length === 0, JSON.stringify(az.excelKimlar));
  // 📅 ходимда ҳам Раҳбар акадагидек 2 та тугма: «1 ойлик» ва «бугунгача»
  C("ходимга 3 та давр кўринади (жорий + 2 ўтган)", az.davrlar.length === 3 && az.davrlar[0].joriy === true && az.davrlar[0].bosh === "2026-09-16" && az.davrlar[1].bosh === "2026-08-16" && az.davrlar[2].bosh === "2026-07-16", JSON.stringify(az.davrlar));
  // маълумоти йўқ давр «bor: false» — иловада тугмаси кўринмайди (бўш файл юкланмасин)
  C("жорий даврда маълумот бор, ўтган ойда йўқ", az.davrlar[0].bor === true && az.davrlar[1].bor === false, JSON.stringify(az.davrlar.map((d) => d.bosh + "=" + d.bor)));
  chiq = [];
  const o1 = await sora(AZIZ, "/bonus/excel/shaxsiy", "POST", { davr: "2026-08-16" });
  const of1 = chiq.find((c) => c.met === "sendDocument");
  C("ходим ЎТГАН ойлик Excel'ини ҳам юклай олади", o1.status === 200 && of1 && of1._fayl.name === "Ходим10 — бонус (16.08.2026-15.09.2026).xlsx", of1 && of1._fayl && of1._fayl.name);
  C("ходим 6 ой олдинги даврни ола ОЛМАЙДИ (400)", (await sora(AZIZ, "/bonus/excel/shaxsiy", "POST", { davr: "2026-05-16" })).status === 400);
  C("нотўғри давр — РАД", (await sora(AZIZ, "/bonus/excel/shaxsiy", "POST", { davr: "2020-01-16" })).status === 400);
  chiq = [];
  const s6 = await sora(SARDOR, "/bonus/excel/shaxsiy", "POST", { hodim: H("Ходим11"), davr: "2026-05-16" });
  C("Раҳбар ака 6 давргача ола олади", s6.status === 200 && chiq.some((c) => c.met === "sendDocument"), JSON.stringify(s6));
  const um = await sora(UMRZOQ, "/bonus");
  C("Ходим01 акага Telegram'и йўқлар рўйхати кўринади, ўзи йўқ", um.excelMen === true && um.excelKimlar.length > 0 &&
    um.excelKimlar.every((k) => k.nom !== "Ходим01") && um.excelKimlar.some((k) => k.nom === "Ходим15 грузчик"), JSON.stringify(um.excelKimlar));
  const sr = await sora(SARDOR, "/bonus");
  C("Раҳбар акага ҳамма ходим рўйхати кўринади", sr.excelKimlar.length > um.excelKimlar.length);
  // 🧪 тестер (Шерик) — қайси рол бўлимида турса ҳам ходим Excel'ини текшира олади
  const rolSora = async (uid, yol, usul = "GET", body) => {
    const init = await initDataYasa({ id: uid, first_name: "U" + uid }, TOKEN);
    const res = await apiIshla(new Request("https://app/api" + yol, {
      method: usul, headers: { authorization: "tma " + init, "content-type": "application/json", "x-view-as": "sotuvchi" },
      body: body ? JSON.stringify(body) : undefined,
    }), env);
    let dd = {}; try { dd = await res.json(); } catch {}
    return { status: res.status, ...dd };
  };
  const rt = await rolSora(RUSLAN, "/bonus");
  C("тестер сотувчи бўлимида ҳам ходимлар рўйхатини кўради", rt.excelKimlar.length > 0, JSON.stringify(rt.excelKimlar && rt.excelKimlar.length));
  chiq = [];
  const rx = await rolSora(RUSLAN, "/bonus/excel/shaxsiy", "POST", { hodim: H("Ходим11") });
  C("тестер ходимнинг шахсий Excel'ини юклай олади", rx.status === 200 && chiq.some((c) => c.met === "sendDocument" && Number(c.chat_id) === RUSLAN), JSON.stringify(rx));
  C("бегона (тестер эмас) — барибир РАД", (await sora(BEGONA, "/bonus/excel/shaxsiy", "POST", { hodim: H("Ходим11") })).status === 403);
}

/* ════════════════ 3. БОТ: ГУРУҲДАН РАСМ ЁЗИБ ОЛИШ ════════════════ */
console.log("── 📷 бот гуруҳдан расмни ёзиб олади, бошқа ҳеч нимага тегмайди ──");
{
  const benv = { ...env, WEBHOOK_SECRET: "S" };
  // Шерик 2026-10-02: ҳар update ўз ID'си (ҳақиқий Telegram'дагидек — index.js энди ҳар
  // update_id'ни БИР МАРТА ишлайди, 7 кун КВ'да белгилаб). «Бир хабар икки марта» синови
  // учун ЭСКИ update_id ҚАЙТА берилади — Telegram шуни қайта юборганини англатади.
  let uidSon = 0;
  const yubor = async (message, { qaytaUpdateId = null } = {}) => {
    chiq = [];
    const r = await worker.fetch(new Request("https://b/", { method: "POST", headers: { "X-Telegram-Bot-Api-Secret-Token": "S" },
      body: JSON.stringify({ update_id: qaytaUpdateId ?? ++uidSon, message }) }), benv);
    return { status: r.status, chiq: chiq.slice(), updateId: qaytaUpdateId ?? uidSon };
  };
  const sanoq = async () => Number(await env.DB.prepare("SELECT COUNT(*) AS n FROM bonus_xabar").first("n"));
  const oldin = await sanoq();
  const r1 = await yubor({ message_id: 501, date: T(2026, 9, 17, 8, 5), chat: { id: B.LOGISTIKA_GURUH, type: "supergroup" },
    from: { id: AZIZ, first_name: "Ходим10" }, photo: [{ file_id: "P" }], caption: "Hodim04 2x", media_group_id: "G9" });
  C("LOGISTIKA'даги расм ёзиб олинди", r1.status === 200 && (await sanoq()) === oldin + 1);
  C("гуруҳга ҲЕЧ НИМА юборилмади", r1.chiq.filter((c) => c.met.startsWith("send")).length === 0, JSON.stringify(r1.chiq));
  // Telegram ХУДДИ ШУ update'ни қайта юборди (жавоб кечиккан бўлса ҳам бўлиши мумкин) — ўша ID билан
  await yubor({ message_id: 501, date: T(2026, 9, 17, 8, 5), chat: { id: B.LOGISTIKA_GURUH, type: "supergroup" }, from: { id: AZIZ }, photo: [{ file_id: "P" }] },
    { qaytaUpdateId: r1.updateId });
  C("бир хабар икки марта келса — бир марта ёзилади", (await sanoq()) === oldin + 1);
  await yubor({ message_id: 502, date: T(2026, 9, 17, 18, 40), chat: { id: B.TOPSHIRISH_GURUH, type: "group" }, from: { id: YUNUS }, document: { file_id: "D", mime_type: "image/jpeg" } });
  C("«Topshirilgan yuk»даги расм-файл ҳам ёзилди", (await sanoq()) === oldin + 2);
  await yubor({ message_id: 503, date: T(2026, 9, 17, 8, 6), chat: { id: B.LOGISTIKA_GURUH, type: "supergroup" }, from: { id: AZIZ }, text: "салом" });
  C("оддий матн — ёзилмайди", (await sanoq()) === oldin + 2);
  await yubor({ message_id: 504, date: T(2026, 9, 17, 8, 7), chat: { id: B.BIGANT_GURUH, type: "supergroup" }, from: { id: AZIZ }, photo: [{ file_id: "P" }] });
  await yubor({ message_id: 505, date: T(2026, 9, 17, 8, 7), chat: { id: -1009000000045, type: "supergroup" }, from: { id: AZIZ }, photo: [{ file_id: "P" }] });
  C("бошқа гуруҳлардаги расм (BIGANT, омбор) — ёзилмайди", (await sanoq()) === oldin + 2);
  const dbsiz = await worker.fetch(new Request("https://b/", { method: "POST", headers: { "X-Telegram-Bot-Api-Secret-Token": "S" },
    body: JSON.stringify({ update_id: 999, message: { message_id: 506, date: 1, chat: { id: B.LOGISTIKA_GURUH, type: "supergroup" }, from: { id: AZIZ }, photo: [{}] } }) }),
    { ...benv, DB: undefined });
  C("база уланмаган бўлса ҳам бот йиқилмайди", dbsiz.status === 200);
  const rr = await B.davrMalumot(env, B.davrOl(T(2026, 9, 17, 9, 0)), T(2026, 9, 17, 23, 0));
  C("ёзилган расмлардан: юк олиш 1 (Ходим10 2x = 20 000), юк топшириш 1 (Ходим15 18:40 = 20 000)",
    rr.olish.yuklar.length === 1 && rr.olish.yuklar[0].bonus === 20000 && rr.topshirish.yuklar.length === 1 && rr.topshirish.yuklar[0].bonus === 20000,
    JSON.stringify({ o: rr.olish.yuklar.map((y) => y.bonus), t: rr.topshirish.yuklar.map((y) => [y.vaqt, y.bonus]) }));
}

/* ════════════════ 4. EXCEL ТУЗИЛИШИ ════════════════ */
console.log("── 📑 Excel файли ичи ──");
{
  const d = await B.davrMalumot(env, B.davrOl(T(2026, 9, 17, 9, 0)), T(2026, 9, 17, 23, 0));
  const bytes = await B.bonusExcel(d);
  C("xlsx (ZIP) ясалди", bytes.length > 3000 && bytes[0] === 0x50 && bytes[1] === 0x4b);
  // ZIP ичидан XML ни очиш — node:zlib
  const zlib = await import("node:zlib");
  const ol = (nom) => {
    const buf = Buffer.from(bytes);
    for (let i = 0; i < buf.length - 30; i++) {
      if (buf.readUInt32LE(i) !== 0x04034b50) continue;
      const nl = buf.readUInt16LE(i + 26), el = buf.readUInt16LE(i + 28), cs = buf.readUInt32LE(i + 18);
      const n = buf.slice(i + 30, i + 30 + nl).toString();
      if (n === nom) return zlib.inflateRawSync(buf.slice(i + 30 + nl + el, i + 30 + nl + el + cs)).toString();
    }
    return "";
  };
  const wb = ol("xl/workbook.xml");
  C("5 та варақ: Ишбай · Рағбат · Юк олиш · Ходимлар Жами · Жами сумма",
    ["Ишбай", "Рағбат", "Юк олиш", "Ходимлар Жами", "Жами сумма"].every((n) => wb.includes(`name="${n}"`)) && (wb.match(/<sheet /g) || []).length === 5, wb.match(/name="[^"]*"/g).join(","));
  const sJ = ol("xl/worksheets/sheet4.xml");   // «Ходимлар Жами» (Достон 2026-10-16)
  const s1 = ol("xl/worksheets/sheet1.xml");
  const ustun = (xml, qator) => [...xml.matchAll(new RegExp(`<c r="([A-Z]+)${qator}"[^>]*>(?:<is><t[^>]*>([^<]*)</t></is>|<v>([^<]*)</v>)`, "g"))].map((m) => m[2] ?? m[3]);
  C("Ишбай: сарлавҳа ва давр («… гача»)", s1.includes("Иш вақтидан ташқари қўшимча ишлаган ходимлар ҳисоботи") && s1.includes("16.09.2026 - 15.10.2026") && s1.includes("гача"));
  C("Ишбай устунлари: … · Ким ёзди · Нима иш қилди (изоҳ, Достон 2026-09-30)",
    ustun(s1, 4).join("|") === "№|Сана|Ходим|Иш тури|Нархи|Бошлади|Тугатди|Ишлаган вақти|Суммаси|Ким ёзди|Нима иш қилди", ustun(s1, 4).join("|"));
  // Достон 2026-10-13: ҳайдовчида эрталабки соат йўқ — «Иш тури» ёрлиғини алоҳида текширамиз
  {
    const U2 = (y, m, dd, h, mi) => Math.floor(Date.UTC(y, m - 1, dd, h - 5, mi) / 1000);
    const q = B.haydovchiSoat([], [], [{ hodim: H("Ходим10"), tur: "t", vaqt: U2(2026, 9, 17, 19, 0), kim: 1 }]);
    C("ҳайдовчи қатори бор ва машинаси ўқилади (Кичик)", q.length === 1 && q[0].mashina === "kichik" && q[0].summa === 40000, JSON.stringify(q));
  }
  C("Ишбай: суммалар ва ҳар бир ходимнинг умумий жадвали", s1.includes("<v>72917</v>") && s1.includes("<v>78750</v>") && s1.includes("ҲАР БИР ХОДИМНИНГ УМУМИЙ ҚЎШИМЧА ИШ СУММАСИ"), s1.includes("<v>72917</v>") + "/" + s1.includes("<v>78750</v>"));
  const s2 = ol("xl/worksheets/sheet3.xml");   // Юк олиш
  C("Юк олиш устунлари ва ҳар бир ҳайдовчининг жамиси", ustun(s2, 4).join("|") === "№|Сана|Вақт|Ҳайдовчи|Машина|Шаҳар|Бонус|Расм|Расм изоҳи" && s2.includes("ҲАР БИР ҲАЙДОВЧИНИНГ УМУМИЙ БОНУСИ") && s2.includes("Жами юк"), ustun(s2, 4).join("|"));
  const s4 = ol("xl/worksheets/sheet2.xml");   // Рағбат
  C("Рағбат устунлари аввалгидек: № · Сана · Ходим · Рағбатлантириш (хабар тексти) · Сумма · Изоҳ",
    ustun(s4, 4).join("|") === "№|Сана|Ходим|Рағбатлантириш (хабар тексти)|Сумма|Изоҳ", ustun(s4, 4).join("|"));
  // 2 та якка + 3 кишилик эълон + Ходим15 = 5 қатор — ҳар одам алоҳида (ўзини танлаш — рад, Шерик 2026-09-24)
  C("Рағбат: 5 та ёзув (кўп кишилик эълон — ҳар бири алоҳида қатор), сумма БЎШ, SUM ва SUMIF", s4.includes("Шерик") && s4.includes("Ходим15") && s4.includes("Ходим15") && /<f>SUM\(E5:E9\)<\/f>/.test(s4) && /SUMIF\(\$C\$5:\$C\$9/.test(s4), (s4.match(/<f>[^<]*<\/f>/g) || []).join(" "));
  C("«Ходимлар Жами» устунлари — эски файлдагидек (жами исмдан кейин, топшириш йўқ)",
    ustun(sJ, 4).join("|") === "№|Ходим|Жами олиши керак|Ишбай (иш ташқари)|Рағбатлантириш|Юк олиш бонуси", ustun(sJ, 4).join("|"));
  const sJS = ol("xl/worksheets/sheet5.xml");
  C("«Жами сумма» варағи эски файлдагидек, топшириш ЙЎҚ", sJS.includes("ишдан ташқари ишлаган суммаси") && sJS.includes("юк олиш бонуси суммаси") && !/юк топшириш/i.test(sJS));
  const st0 = ol("xl/styles.xml");
  C("styles.xml: [h]:mm формати ва тўқ кўк/сариқ ранглар", st0.includes('formatCode="[h]:mm"') && st0.includes("FF2F5597") && st0.includes("FFFFE699") && /<numFmts count="6">/.test(st0));
  const st = ol("xl/styles.xml");
  const xf = Number((st.match(/<cellXfs count="(\d+)"/) || [])[1]), bor = (st.match(/<cellXfs[^>]*>([\s\S]*?)<\/cellXfs>/)[1].match(/<xf /g) || []).length;
  C("styles.xml: услублар сони тўғри (янги услуб охирига қўшилган)", xf === bor);
}

console.log("── 📍 «Тошкентга кирдим» тугмаси ──");
{
  env = { ...env, DB: yangiDB() };
  env.DB.db.exec(fs.readFileSync(new URL("../migrations/0004_kirdim.sql", import.meta.url), "utf8"));
  const ICHI = { lat: 41.285, lon: 69.204, aniqlik: 12 }, TASHQI = { lat: 41.469, lon: 69.582, aniqlik: 15 };
  soatQoy(12, 0);
  const g0 = await sora(AZIZ, "/bonus");
  C("ҳайдовчи: кундузи тугма КЎРИНМАЙДИ", g0.kirdim && g0.kirdim.korinadi === false, JSON.stringify(g0.kirdim));
  C("кундузи 12:00 да босса — РАД (409)", (await sora(AZIZ, "/bonus/kirdim", "POST", ICHI)).status === 409);
  const gn = await sora(NUR, "/bonus");
  C("ҳайдовчи эмас (Ходим03): тугма йўқ", gn.kirdim === null);
  soatQoy(21, 0);
  C("ҳайдовчи эмас босса — РАД (403)", (await sora(NUR, "/bonus/kirdim", "POST", ICHI)).status === 403);
  C("кечқурун 21:00 ҳайдовчига тугма кўринади", (await sora(AZIZ, "/bonus")).kirdim.korinadi === true);
  const tq = await sora(AZIZ, "/bonus/kirdim", "POST", TASHQI);
  C("Тошкентга кирмай босса (Чирчиқ) — «❌ Рад этилди», чегарагача км", tq.status === 409 && /Рад этилди/.test(tq.xato) && /чегарагача \d+(,\d)? км/.test(tq.xato), JSON.stringify(tq));
  C("рад этилгани базага ёзилмайди", env.DB.db.prepare("SELECT COUNT(*) n FROM bonus_kirish").get().n === 0);
  C("жойлашувсиз (GPS йўқ) — РАД (400)", (await sora(AZIZ, "/bonus/kirdim", "POST", {})).status === 400);
  C("0,0 координата — РАД (400)", (await sora(AZIZ, "/bonus/kirdim", "POST", { lat: 0, lon: 0 })).status === 400);
  soatQoy(21, 5);
  const ki = await sora(AZIZ, "/bonus/kirdim", "POST", ICHI);
  C("Чилонзорда 21:05 — ✓, вақт СЕРВЕРДАН, чегарадан км", ki.status === 200 && ki.vaqt === "21:05" && ki.km > 0.5 && ki.km < 20, JSON.stringify(ki));
  const g1 = await sora(AZIZ, "/bonus");
  C("кейин очса: «✓ 21:05 · чегарадан … км» кўринади", g1.kirdim.oldin && g1.kirdim.oldin.vaqt === "21:05" && g1.kirdim.oldin.km === ki.km, JSON.stringify(g1.kirdim));
  soatQoy(1, 0, 17);
  C("ярим тундан кейин (01:00) ҳам аввалги кун ёзуви кўринади", (await sora(AZIZ, "/bonus")).kirdim.oldin?.vaqt === "21:05");
  const qator = env.DB.db.prepare("SELECT * FROM bonus_kirish").get();
  C("базада: ходим рақами, lat/lon, аниқлик, ким босди", qator.hodim === H("Ходим10") && qator.lat === ICHI.lat && qator.aniqlik === 12 && qator.kim === AZIZ, JSON.stringify(qator));
  const dm = await B.davrMalumot(env, B.davrOl(T(2026, 9, 17, 9, 0)), T(2026, 9, 17, 12, 0));
  const aq = dm.ish.find((q) => q.hodim.nom === "Ходим10" && q.sana === "2026-09-16");
  C("Excel (Ишбай): Ходим10 16.09 — 18:00→21:05 = 3:05 = 123 333, изоҳда «Тошкентга кирдим» ва км",
    aq && aq.tugatdi === "21:05" && aq.jami === 185 && aq.summa === 123333 && /Тошкентга кирдим» — чегарадан \d+,\d км/.test(aq.yozdi), JSON.stringify(aq));
  const xl = await B.bonusExcel(dm);
  C("Excel файли ясалади (тугма ёзуви билан)", xl && (xl.byteLength || xl.length || (xl.fayl && xl.fayl.byteLength)) > 1000, typeof xl + " " + Object.keys(xl || {}).join());
  soatQoy(12, 0, 17);
  C("эртаси куни кундузи — аввалги ёзув кўринмайди", (await sora(AZIZ, "/bonus")).kirdim.oldin === null);
  // Excel ҳисоби: биринчи босилиши олинади, расмдан кечроқ бўлса — тугма
  const hs = B.haydovchiSoat([{ guruh: "topshirish", uid: AZIZ, vaqt: T(2026, 9, 16, 19, 0) }],
    [{ hodim: H("Ходим10"), vaqt: T(2026, 9, 16, 21, 5), km: 4.4 }, { hodim: H("Ходим10"), vaqt: T(2026, 9, 16, 22, 0), km: 9 }]);
  C("Ходим10: расм 19:00, тугма 21:05 (ва 22:00) → 18:00–21:05 = 3:05 = 123 333", hs.length === 1 && hs[0].tugatdi === "21:05" && hs[0].summa === 123333 && /чегарадан 4,4 км/.test(hs[0].yozdi), JSON.stringify(hs));
  const hk = B.haydovchiSoat([], [{ hodim: H("Ходим10"), vaqt: T(2026, 9, 16, 14, 0), km: 3 }, { hodim: H("Ходим03"), vaqt: T(2026, 9, 16, 20, 0), km: 3 }]);
  C("кундузи босилгани ва ҳайдовчи эмас — ҳисобланмайди", hk.length === 0, JSON.stringify(hk));
  const hy = B.haydovchiSoat([{ guruh: "topshirish", uid: AZIZ, vaqt: T(2026, 9, 16, 23, 0) }], [{ hodim: H("Ходим10"), vaqt: T(2026, 9, 16, 21, 0), km: 2 }]);
  C("тугмадан кейин расм ташланса (23:00) — энг кечи олинади", hy[0].tugatdi === "23:00");
}

console.log("── 📶 интернетсиз босилган «Тошкентга кирдим» ──");
{
  env = { ...env, DB: yangiDB() };
  env.DB.db.exec(fs.readFileSync(new URL("../migrations/0004_kirdim.sql", import.meta.url), "utf8"));
  const ICHI = { lat: 41.2755, lon: 69.2045 };
  const ms = (d, h, mi) => toshkent(2026, 9, d, h, mi);
  soatQoy(21, 30, 18);
  const a = await sora(YUNUS, "/bonus/kirdim", "POST", { ...ICHI, bosildi: ms(18, 20, 10), telefon: ms(18, 21, 30) });
  C("20:10 да босди, интернет 21:30 да келди → 20:10 ёзилади", a.status === 200 && a.vaqt === "20:10", JSON.stringify(a));
  env.DB.db.exec("DELETE FROM bonus_kirish");
  const b = await sora(YUNUS, "/bonus/kirdim", "POST", { ...ICHI, bosildi: ms(18, 19, 10), telefon: ms(18, 20, 30) });
  C("телефон соати 1 соат ОРҚАГА сурилган (19:10 кўрсатади) → барибир 20:10", b.status === 200 && b.vaqt === "20:10", JSON.stringify(b));
  env.DB.db.exec("DELETE FROM bonus_kirish");
  const c = await sora(YUNUS, "/bonus/kirdim", "POST", { ...ICHI, bosildi: ms(18, 23, 0), telefon: ms(18, 22, 0) });
  C("босилган вақт юборилгандан кейин (сохта) → сервер вақти 21:30", c.status === 200 && c.vaqt === "21:30", JSON.stringify(c));
  env.DB.db.exec("DELETE FROM bonus_kirish");
  const e = await sora(YUNUS, "/bonus/kirdim", "POST", { ...ICHI, bosildi: ms(18, 21, 30) + 3600e3, telefon: ms(18, 21, 30) + 3600e3 + 5000 });
  C("телефон соати 1 соат ОЛДИНГА сурилган, 5 сониядан кейин юборилди → 21:29 (сурилган соат ҳисобга олинмайди)", e.status === 200 && e.vaqt === "21:29", JSON.stringify(e));
  env.DB.db.exec("DELETE FROM bonus_kirish");
  soatQoy(3, 0, 19);
  const f = await sora(YUNUS, "/bonus/kirdim", "POST", { ...ICHI, bosildi: ms(18, 20, 30), telefon: ms(19, 3, 0) });
  C("6,5 соат олдин босилган — РАД", f.status === 409 && /5 соат/.test(f.xato), JSON.stringify(f));
  soatQoy(18, 30, 18);
  const g = await sora(YUNUS, "/bonus/kirdim", "POST", { ...ICHI, bosildi: ms(18, 17, 30), telefon: ms(18, 18, 30) });
  C("17:30 да (иш вақтида) босилган, 18:30 да юборилди — РАД", g.status === 409, JSON.stringify(g));
  C("рад этилганлар базага ёзилмайди", env.DB.db.prepare("SELECT COUNT(*) n FROM bonus_kirish").get().n === 0);
}

console.log("── 🗺 Тошкент чегараси ──");
{
  const Z = await import("./toshkent.js");
  for (const [n, lat, lon, kut] of [["Сергели (ишхона)", 41.2285, 69.2170, true], ["Чилонзор", 41.2755, 69.2045, true], ["Ходим15обод", 41.3650, 69.2870, true],
    ["Аэропорт", 41.2579, 69.2812, true], ["Чирчиқ", 41.4690, 69.5820, false], ["Олмалиқ", 40.8440, 69.5980, false], ["Янгийўл", 41.1120, 69.0470, false],
    ["Зангиота", 41.1920, 69.1450, false], ["Гулистон", 40.4897, 68.7842, false], ["Самарқанд", 39.6542, 66.9597, false]]) {
    C(`${n} — ${kut ? "ичида" : "ташқарида"}`, Z.toshkentdami(lat, lon) === kut);
  }
  const km = Z.chegaragachaKm(41.2755, 69.2045);
  C("Чилонзор чегарадан 1–15 км ичкарида", km > 1 && km < 15, String(km));
}


console.log("── 🧪 тестер: ҳар бир бўлимда ФАҚАТ ўша роль функциялари ──");
{
  async function soraRol(uid, yol, rol, usul = "GET", body) {
    const init = await initDataYasa({ id: uid, first_name: "U" + uid }, TOKEN);
    const res = await apiIshla(new Request("https://app/api" + yol, {
      method: usul, headers: { authorization: "tma " + init, "content-type": "application/json", "x-view-as": rol },
      body: body ? JSON.stringify(body) : undefined,
    }), env);
    let d = {}; try { d = await res.json(); } catch {}
    return { status: res.status, ...d };
  }
  soatQoy(21, 0, 20);
  const h = await soraRol(DOSTON, "/bonus", "haydovchi");
  C("Достон «Ҳайдовчи» бўлимида: «Тошкентга кирдим» БОР, «Иш вақти» ЙЎҚ, тўлиқ Excel ЙЎҚ", h.kirdim && h.haydovchi === true && h.excel === false, JSON.stringify({ k: h.kirdim, h: h.haydovchi, e: h.excel }));
  const x = await soraRol(DOSTON, "/bonus", "xodim");
  C("Достон «Ходим» бўлимида: «Иш вақти» БОР, «Тошкентга кирдим» ЙЎҚ, Excel ЙЎҚ", x.kirdim === null && x.haydovchi === false && x.excel === false, JSON.stringify({ k: x.kirdim, h: x.haydovchi, e: x.excel }));
  const sa = await soraRol(DOSTON, "/bonus", "superadmin");
  C("Достон «Супер админ» бўлимида: Excel БОР, «Тошкентга кирдим» ЙЎҚ", sa.excel === true && sa.kirdim === null && sa.haydovchi === false, JSON.stringify({ k: sa.kirdim, e: sa.excel }));
  C("Достон «Ҳайдовчи» бўлимидан Excel сўраса — РАД (403)", (await soraRol(DOSTON, "/bonus/excel", "haydovchi", "POST", { davr: "2026-09-16" })).status === 403);
  C("Шерик «Ҳайдовчи» бўлимида ҳам Excel ЙЎҚ", (await soraRol(RUSLAN, "/bonus", "haydovchi")).excel === false);
  C("Шерик «Ходим» бўлимида «Тошкентга кирдим» боса олмайди (403)", (await soraRol(RUSLAN, "/bonus/kirdim", "xodim", "POST", { lat: 41.2755, lon: 69.2045 })).status === 403);
  // 🚛 Достон 2026-10-07: ҳайдовчи ҳам «Иш вақти» ёзади — лекин ФАҚАТ БОШҚА ходимга.
  //    Аввал беркилгани учун ҳайдовчилар соатни «Рағбат»га ёзишаверган (Ходим15 → Ходим07 22:20, 06.10).
  {
    const r1 = await soraRol(DOSTON, "/bonus/ish", "haydovchi", "POST", { tur: "t", qoshimcha: [H("Ходим15")] });
    C("Ҳайдовчи БОШҚА ходимга «Иш вақти» ёза олади (403 ЭМАС)", r1.status !== 403, "status=" + r1.status);
    const r2 = await soraRol(DOSTON, "/bonus/ish", "haydovchi", "POST", { tur: "t", qoshimcha: [11] });
    C("Ҳайдовчи ўзини ҳам танлай олади (такрор бўлмайди)", r2.status !== 403, "status=" + r2.status);
  }
  const sr = await sora(SARDOR, "/bonus");
  C("Раҳбар ака (тестер эмас) — Excel аввалгидек БОР", sr.excel === true);
}

console.log("── 👥 рўйхатга янги одам қўшиш / ўчириш (ким қўшди, ким ўчирди) ──");
{
  env = { ...env, DB: yangiDB() };
  env.DB.db.exec(fs.readFileSync(new URL("../migrations/0005_bonus_hodim.sql", import.meta.url), "utf8"));
  soatQoy(12, 0, 18);
  const q = await sora(KAMOL, "/bonus/hodim", "POST", { nom: "Ходим15", tarif: 35000 });
  C("Ходим15 (ходим) янги одам қўшди: Ходим15, 35 000", q.status === 200 && q.id > 10000 && q.nom === "Ходим15", JSON.stringify(q));
  const g = await sora(KAMOL, "/bonus");
  const a = g.hodimlar.find((h) => h.nom === "Ходим15");
  C("Ходим15 «Иш вақти» рўйхатида, «қўшди: Ходим15» билан", a && a.qoshilgan && a.qoshdi === "Ходим15", JSON.stringify(a));
  C("Ходим15 рағбат рўйхатида ҳам", g.kimlar.some((k) => k.k === "h" + q.id));
  C("тарихда: ким қўшди ва қачон", g.qoshilganTarix.length === 1 && g.qoshilganTarix[0].nom === "Ходим15" && /18\.09 12:00/.test(g.qoshilganTarix[0].qachon), JSON.stringify(g.qoshilganTarix));
  C("бир хил исм қайта қўшилмайди (409)", (await sora(NUR, "/bonus/hodim", "POST", { nom: "алишер", tarif: 35000 })).status === 409);
  C("асосий рўйхатдаги исм ҳам қўшилмайди (Ходим15 бор)", (await sora(NUR, "/bonus/hodim", "POST", { nom: "Ходим15", tarif: 35000 })).status === 409);
  C("нотўғри тариф — РАД", (await sora(NUR, "/bonus/hodim", "POST", { nom: "Ходим15", tarif: 99999 })).status === 400);
  C("ҳайдовчи одам қўша олмайди (403)", (await sora(AZIZ, "/bonus/hodim", "POST", { nom: "Ходим15", tarif: 35000 })).status === 403);
  C("ҳайдовчига «қўшиш» тугмаси ва тарих кўринмайди", (await sora(AZIZ, "/bonus")).qoshaOladi === false);
  // Қўшилган одамга иш вақти ва рағбат
  soatQoy(20, 0, 18);
  const ish = await sora(KAMOL, "/bonus/ish", "POST", { tur: "t", qoshimcha: [q.id] });
  C("Ходим15га «Ишни тугатдим» 20:00 ёзилди", ish.status === 200 && ish.kimlar.join() === "Ходим15", JSON.stringify(ish));
  const rg = await sora(KAMOL, "/bonus/ragbat", "POST", { kimga: ["h" + q.id], matn: "Омборни тартибга келтирди" });
  C("Ходим15га рағбат ёзилди", rg.status === 200 && rg.kimga === "Ходим15", JSON.stringify(rg));
  // Ўчириш — бошқа одам
  C("асосий рўйхатдаги ходимни ўчириб бўлмайди (403)", (await sora(KAMOL, "/bonus/hodim/42/ochir", "POST")).status === 403);
  C("ҳайдовчи ўчира олмайди (403)", (await sora(AZIZ, "/bonus/hodim/" + q.id + "/ochir", "POST")).status === 403);
  soatQoy(21, 0, 18);
  const o = await sora(700000039, "/bonus/hodim/" + q.id + "/ochir", "POST");
  C("Ходим15 Ходим15ни ўчирди", o.status === 200, JSON.stringify(o));
  const g2 = await sora(KAMOL, "/bonus");
  C("ўчирилгандан кейин рўйхатларда ЙЎҚ", !g2.hodimlar.some((h) => h.nom === "Ходим15") && !g2.kimlar.some((k) => k.k === "h" + q.id));
  const tt = g2.qoshilganTarix[0];
  C("тарихда: «ўчирди: Ходим15, 18.09 21:00»", tt.ochirildi && tt.ochirdi && /18\.09 21:00/.test(tt.ochirQachon), JSON.stringify(tt));
  // Эски ёзуви Excel'да қолади
  const d = await B.davrMalumot(env, B.davrOl(T(2026, 9, 18, 12, 0)), T(2026, 9, 19, 12, 0));
  const aq = d.ish.find((x) => x.hodim.nom === "Ходим15");
  C("ўчирилган бўлса ҳам эски ёзуви Excel'да: 18:00→20:00 = 70 000", aq && aq.summa === 70000, JSON.stringify(aq));
  C("рағбати ҳам Excel'да", d.ragbat.some((r) => r.kimga === "Ходим15"));
  const xl = await B.bonusExcel(d);
  C("Excel ясалади (қўшилган ходим билан)", xl && (xl.byteLength || xl.length) > 1000);
  // Excel ичи: қўшилган ходим оч яшил, исми ёнида ким қўшгани; алоҳида «Қўшилганлар» варағи
  const zlib = await import("node:zlib");
  const och = (nom) => {
    const buf = Buffer.from(xl);
    for (let i = 0; i < buf.length - 30; i++) {
      if (buf.readUInt32LE(i) !== 0x04034b50) continue;
      const nl = buf.readUInt16LE(i + 26), el = buf.readUInt16LE(i + 28), cs = buf.readUInt32LE(i + 18);
      if (buf.slice(i + 30, i + 30 + nl).toString() === nom) return zlib.inflateRawSync(buf.slice(i + 30 + nl + el, i + 30 + nl + el + cs)).toString();
    }
    return "";
  };
  const wb = och("xl/workbook.xml");
  // Достон 2026-09-30: ЎЧИРИЛГАН қўшилган ходим «Қўшилганлар» варағида кўринмайди —
  // фақат фаоллар чиқади; фаол бўлмаса варақнинг ўзи ясалмайди (супер админни чалғитмасин).
  C("ўчирилган ходим «Қўшилганлар» варағини чиқармайди (5 варақ)", !wb.includes('name="Қўшилганлар"') && (wb.match(/<sheet /g) || []).length === 5, wb.match(/name="[^"]+"/g).join());
  const s1 = och("xl/worksheets/sheet1.xml"), s4 = och("xl/worksheets/sheet2.xml");
  const qoshS = String(await import("./xlsxout.js").then((X) => X.S.BN_QOSH));
  C("Ишбай: «Ходим15 (қўшди: Ходим15)» оч яшил катакда", s1.includes("Ходим15 (қўшди: Ходим15)") && new RegExp('s="' + qoshS + '"[^>]*><is><t[^>]*>Ходим15 \\(қўшди').test(s1));
  C("Рағбат: «Ходим15 (қўшди: Ходим15)» ва SUMIF шу исм билан", s4.includes("Ходим15 (қўшди: Ходим15)"));
  // Фаол қўшилган ходим бўлса — варақ чиқади ва ичида ким қўшгани ёзилади
  const yq = await sora(KAMOL, "/bonus/hodim", "POST", { nom: "Синов қўшилган", tarif: 35000 });
  C("янги ходим қўшилди (фаол)", yq.status === 200, JSON.stringify(yq));
  const d2 = await B.davrMalumot(env, B.davrOl(T(2026, 9, 18, 12, 0)), T(2026, 9, 19, 12, 0));
  const xl2 = await B.bonusExcel(d2);
  const och2 = (nom) => { const buf = Buffer.from(xl2);
    for (let i = 0; i < buf.length - 30; i++) { if (buf.readUInt32LE(i) !== 0x04034b50) continue;
      const nl = buf.readUInt16LE(i + 26), el = buf.readUInt16LE(i + 28), cs = buf.readUInt32LE(i + 18);
      if (buf.slice(i + 30, i + 30 + nl).toString() === nom) return zlib.inflateRawSync(buf.slice(i + 30 + nl + el, i + 30 + nl + el + cs)).toString(); }
    return ""; };
  const wb2 = och2("xl/workbook.xml");
  C("фаол қўшилган ходим бўлса — «Қўшилганлар» варағи чиқади", wb2.includes('name="Қўшилганлар"'), wb2.match(/name="[^"]+"/g).join());
  const s5b = och2("xl/worksheets/sheet6.xml");
  C("варақда: ходим, тарифи, ким қўшди, қачон (ўчирилганлар йўқ)", s5b.includes("Синов қўшилган") && s5b.includes("Ходим15") && !s5b.includes("Ўчирилган") && !s5b.includes("Ходим15"));
  await sora(KAMOL, "/bonus/hodim/" + yq.id + "/ochir", "POST");   // синовдан кейин тозалаймиз
}

console.log("── 🏁 production: синов режими ўчиқ, тугмалар фақат вақтида ──");
{
  const e0 = env;
  env = { ...env, BONUS_SINOV: undefined };
  soatQoy(12, 0, 19);
  const g = await sora(DOSTON, "/bonus");
  C("тестер ҳам 12:00 да «Иш вақти» тугмасини кўрмайди (синов режими ўчиқ)", g.tugma === null && g.sinov === false, JSON.stringify({ t: g.tugma, s: g.sinov }));
  soatQoy(4, 59, 19);
  C("04:59 — кечаги «Ишни тугатдим» ҳали очиқ", (await sora(KAMOL, "/bonus")).tugma === "t");
  soatQoy(5, 0, 19);
  C("05:00 — «Ишни бошладим»", (await sora(KAMOL, "/bonus")).tugma === "b");
  soatQoy(8, 59, 19);
  C("08:59 — ҳали «Ишни бошладим»", (await sora(KAMOL, "/bonus")).tugma === "b");
  soatQoy(9, 0, 19);
  C("09:00 — тугма йўқ (иш вақти)", (await sora(KAMOL, "/bonus")).tugma === null);
  soatQoy(18, 0, 19);
  C("18:00 роса — ҳали тугма йўқ", (await sora(KAMOL, "/bonus")).tugma === null);
  soatQoy(18, 1, 19);
  C("18:01 — «Ишни тугатдим»", (await sora(KAMOL, "/bonus")).tugma === "t");
  C("тестер 12:00 да «Ишни бошладим» ёза олмайди (409)", (soatQoy(12, 0, 19), (await sora(DOSTON, "/bonus/ish", "POST", { tur: "b", qoshimcha: [H("Ходим15")] })).status === 409));
  env = e0;
}

console.log("── 👷 Ходим15 (ходим + ошхона): битта меню ──");
{
  const km = await sora(KAMOL, "/me");
  C("Ходим15: битта бўлим «Ходим» (Ошхона алоҳида бўлим эмас)", bolimlar(km.rollar).join() === "xodim", bolimlar(km.rollar).join());
  C("Ходим15 менюси: Иш вақти · Рағбат · Ошхона (очилганда — ИШ ВАҚТИ, Достон 2026-10-08)", tablarOl("xodim", km.rollar).map((t) => t[2]).join() === "ishvaqt,ragbat,ovqat", tablarOl("xodim", km.rollar).map((t) => t[2]).join());
}

console.log("── 📢 BIGANT гуруҳига бонус эълонлари (2026-09-21) ──");
{
  const e0 = env;
  env = { ...env, DB: yangiDB(), BONUS_SINOV: undefined };
  env.DB.db.exec(fs.readFileSync(new URL("../migrations/0005_bonus_hodim.sql", import.meta.url), "utf8"));
  chiq = [];
  soatQoy(8, 30, 22);
  const b = await sora(700000008, "/bonus/ish", "POST", { tur: "b", qoshimcha: [H("Ходим03")] });
  const e1 = chiq.find((x) => x.met === "sendMessage");
  // 📢 Достон 2026-10-21: сарлавҳа + исмлар рўйхати (Раҳбар ака сўради)
  C("Ходим03 ўзи 08:30 да бошлади → гуруҳга сарлавҳа + исм", b.guruhga === true && e1 && Number(e1.chat_id) === B.BIGANT_GURUH
    && e1.text === ["<b>✅ Ишни бошлади</b>", "", "👥 Ким ёзди: Ходим03"].join("\n"), JSON.stringify(e1));
  chiq = [];
  soatQoy(18, 30, 22);
  await sora(KAMOL, "/bonus/ish", "POST", { tur: "t", qoshimcha: [H("Ходим15"), H("Ходим15 кичик")] });
  const e2 = chiq.find((x) => x.met === "sendMessage");
  // ✍️ Достон 2026-11-04: Ходим15 ўзини белгиламаган — биринчи қаторда «Ходим15 ✍️» (ёзган одам)
  C("Ходим15 бошқалар учун босди → «Ким ёзди: Ходим15», ўзи рўйхатда ЙЎҚ",
    e2 && e2.text === ["<b>✅ Ишни тугатди</b>", "", "👥 Ким ёзди: Ходим15", "  • Ходим15", "  • Ходим15"].join("\n"), JSON.stringify(e2));
  C("🔔 ботда шахсий хабар ЮБОРИЛМАЙДИ (Достон: «bu habar keremas»)",
    !chiq.some((c) => Number(c.chat_id) === KAMOL), JSON.stringify(chiq.map((c) => c.chat_id)));
  C("қисқартириш: лавозим қўшимчаси олинади, «ака» қолади",
    B.qisqaNom("Ходим15 грузчик") === "Ходим15" && B.qisqaNom("Ходим08 сваршик") === "Ходим08"
    && B.qisqaNom("Ходим15 Газел") === "Ходим15" && B.qisqaNom("Ходим05 ака") === "Ходим05 ака" && B.qisqaNom("Ходим01") === "Ходим01");
  chiq = [];
  soatQoy(19, 0, 22);
  await sora(KAMOL, "/bonus/ragbat", "POST", { kimga: ["h" + H("Ходим15")], matn: "Грузчик йўқ эди, юкни ўзи туширди — 20 қоп" });
  const e3 = chiq.find((x) => x.met === "sendMessage");
  C("рағбат гуруҳга: ✍️ Ходим15, 👥 • Ходим15, 📝 матн", e3 && e3.text === "<pre>📨 РАҒБАТЛАНТИРИШ\n\n✍️ Ходим15\n👥 Кимга:\n  • Ходим15\n\n📝 Грузчик йўқ эди, юкни ўзи туширди — 20 қоп</pre>", JSON.stringify(e3));
  const g = await sora(KAMOL, "/bonus");
  C("Mini App'да рағбатлар рўйхати ЙЎҚ (фақат Excel ва гуруҳда — Достон 2026-09-21)", g.ragbatlar === undefined);
  // ✏️ Гуруҳ эълонини қўлда тузатиш — KV навбатидан, оддий матн
  const { guruhTahrir } = await import("./app/bonusapi.js");
  await KV.put("bonus:guruh-tahrir", JSON.stringify([{ m: 98993, t: "Ходим15 Ишни тугатди — 18:30 ✅\n📝 Hodim05 ishi bilan" }, { m: "x", t: "" }]));
  chiq = [];
  await guruhTahrir(env);
  const ed = chiq.filter((x) => x.met === "editMessageText");
  C("гуруҳ эълони тузатилди (фақат тўғри ёзув), навбат тозаланди", ed.length === 1 && ed[0].message_id === 98993 && Number(ed[0].chat_id) === B.BIGANT_GURUH &&
    ed[0].text === "Ходим15 Ишни тугатди — 18:30 ✅\n📝 Hodim05 ishi bilan" && !ed[0].parse_mode && (await KV.get("bonus:guruh-tahrir")) === null, JSON.stringify(ed));
  // 🅱 Достон 2026-10-21: "p":"HTML" берилса қалин ёзув ишлайди (эски эълонларни янги кўринишга ўтказиш)
  await KV.put("bonus:guruh-tahrir", JSON.stringify([{ m: 98994, t: "<b>Ишни тугатди</b> ✅\n\nХодим01", p: "HTML" }]));
  chiq = [];
  await guruhTahrir(env);
  const ed2 = chiq.filter((x) => x.met === "editMessageText");
  C("HTML билан тузатиш — parse_mode юборилади", ed2.length === 1 && ed2[0].parse_mode === "HTML"
    && ed2[0].text === "<b>Ишни тугатди</b> ✅\n\nХодим01", JSON.stringify(ed2));
  // 🗑 Такрор эълонни ўчириш — KV навбатидан; рағбат бўлмаган msg_id'га тегмайди
  const { ragbatTakrorOchir } = await import("./app/bonusapi.js");
  const ochMsg = (await env.DB.prepare("SELECT msg_id FROM bonus_ragbat WHERE msg_id IS NOT NULL ORDER BY id DESC LIMIT 1").first()).msg_id;
  await KV.put("bonus:ragbat-ochir", `${ochMsg}, 123`);
  chiq = [];
  await ragbatTakrorOchir(env);
  const del = chiq.filter((x) => x.met === "deleteMessage");
  const qoldi = await env.DB.prepare("SELECT COUNT(*) AS n FROM bonus_ragbat WHERE msg_id = ?").bind(ochMsg).first("n");
  C("такрор эълон гуруҳдан ва базадан ўчди, бегона msg_id'га тегмади, навбат тозаланди",
    del.length === 1 && del[0].message_id === ochMsg && Number(del[0].chat_id) === B.BIGANT_GURUH && Number(qoldi) === 0 && (await KV.get("bonus:ragbat-ochir")) === null, JSON.stringify(del));
  // Бошқа ҳамма ёзиш тақиқлигича
  const { tg } = await import("./app/tgapi.js");
  chiq = [];
  const x = await tg(TOKEN, "sendMessage", { chat_id: B.BIGANT_GURUH, text: "бошқа хабар" });
  C("бонусдан бошқа хабар BIGANT'га ҳамон КЕТМАЙДИ (тақиқ)", x.taqiq === true && chiq.length === 0);
  const y = await tg(TOKEN, "sendDocument", { chat_id: B.BIGANT_GURUH }, { bonus: true });
  C("истисно фақат sendMessage учун (файл юбориб бўлмайди)", y.taqiq === true);
  env = e0;
}

console.log("── ✅ Ходим15 ака бонус тизимида (қайта киритилди, 2026-09-30) ──");
{
  const HAMID = 700000028;
  const hb = await sora(HAMID, "/bonus");
  C("Ходим15 ака: Бонус очиқ, ҳайдовчи деб танилади", hb.status === 200 && hb.haydovchi === true && hb.men && hb.men.nom === "Ходим15 ака", JSON.stringify({ s: hb.status, h: hb.haydovchi, m: hb.men }));
  C("Ходим15 ака ўз Excel'ини юклай олади", hb.excelMen === true && hb.davrlar.length === 3);
  C("🚚 Ходим15 ака (ҳайдовчи) рағбат ЁЗА ОЛМАЙДИ — 403 (Достон 2026-10-12)", (await sora(HAMID, "/bonus/ragbat", "POST", { kimga: "h" + H("Ходим15"), matn: "ёрдам берди" })).status === 403);
  C("Ҳайдовчи ҳам «Иш вақти» рўйхатида бор", (await sora(KAMOL, "/bonus")).hodimlar.some((h) => h.nom === "Ходим15 ака"));
  C("🎁 рағбат рўйхатида БОР — ҳайдовчига рағбат ЁЗИЛАДИ (Достон 2026-11-02)", (await sora(KAMOL, "/bonus")).kimlar.some((k) => k.nom === "Ходим15 ака"));
  C("🎁 ҳайдовчига рағбат ёзиш ишлади — Ходим15 → Ходим11 (ҳайдовчи)", (await sora(KAMOL, "/bonus/ragbat", "POST", { kimga: "h" + H("Ходим11"), matn: "Клиентнинг юкини ўзи туширди" })).status === 200);
  C("Дамас (кичик), тарифи 40 000", B.hodimOl(22).mashina === "kichik" && B.hodimOl(22).tarif === 40000);
}

console.log("── ✍️ ҳайдовчига қўлда тузатиш (Ходим11 18.09 18:44) ──");
{
  const rasm = [{ guruh: "topshirish", uid: 700000018, vaqt: T(2026, 9, 18, 16, 49) }];
  const qolda = [{ hodim: H("Ходим11"), tur: "t", vaqt: T(2026, 9, 18, 18, 44), kim: DOSTON, kim_ism: "Достон" }];
  const hs = B.haydovchiSoat(rasm, [], qolda).find((q) => q.sana === "2026-09-18");
  C("Ходим11: 18:00→18:44 = 44 дақ = 29 333, изоҳда «қўлда тузатилди»", hs && hs.tugatdi === "18:44" && hs.summa === 29333 && /қўлда тузатилди \(Достон\)/.test(hs.yozdi), JSON.stringify(hs));
  const kech = B.haydovchiSoat([{ guruh: "topshirish", uid: 700000018, vaqt: T(2026, 9, 18, 19, 30) }], [], qolda)[0];
  C("кейинроқ расм бўлса (19:30) — энг кечи олинади", kech.tugatdi === "19:30");
  C("ҳайдовчи бўлмаган ходимнинг ёзуви бу ерда ҳисобланмайди (ishHisob'да)", B.haydovchiSoat([], [], [{ hodim: H("Ходим15"), tur: "t", vaqt: T(2026, 9, 18, 19, 0) }]).length === 0);
}

console.log("── 📦 юк оралиғи: 30 дақиқа (2026-09-21) ──");
{
  const r = (h, mi, s = 0, albom = null) => ({ guruh: "topshirish", uid: AZIZ, vaqt: T(2026, 9, 21, h, mi) + s, matn: "", albom, msg_id: h * 100 + mi + s });
  const n = (xs) => B.yukHisob(xs, "topshirish").yuklar.length;
  C("битта расм — 1 юк", n([r(10, 0)]) === 1);
  C("бир йўла 3 та расм (альбом) — 1 юк", n([r(10, 0, 0, "a1"), r(10, 0, 0, "a1"), r(10, 0, 1, "a1")]) === 1);
  C("1 дақиқа ичида 2–3 расм — 1 юк", n([r(10, 0), r(10, 0, 30), r(10, 1)]) === 1);
  C("20 дақиқадан кейинги расм — АЛОҲИДА юк (Достон 2026-10-13)", n([r(10, 0), r(10, 20)]) === 2);
  C("5 дақиқа ичида — ўша юк", n([r(10, 0), r(10, 4, 59)]) === 1);
  C("5 дақиқадан кейин — янги юк", n([r(10, 0), r(10, 5, 1)]) === 2);
  C("роса 30 дақиқадан кейин — 2-юк", n([r(10, 0), r(10, 30)]) === 2);
  C("кетма-кет 3 дақиқалик расмлар — битта юк (оралиқ ОХИРГИ расмдан)", n([r(10, 0), r(10, 2), r(10, 4)]) === 1);
  C("10:00, 10:20, 10:35 — 3 юк (ҳар бири алоҳида)", n([r(10, 0), r(10, 20), r(10, 35)]) === 3);
  C("бошқа альбом, 10 дақиқа кейин — АЛОҲИДА юк", n([r(10, 0, 0, "a1"), r(10, 10, 0, "a2")]) === 2);
  C("битта альбом — вақт узоқ бўлса ҳам битта юк", n([r(10, 0, 0, "a1"), r(10, 25, 0, "a1")]) === 1);
  C("бошқа одамнинг расми алоҳида юк", B.yukHisob([r(10, 0), { ...r(10, 5), uid: 700000018 }], "topshirish").yuklar.length === 2);
  // 📷 Достон 2026-10-13: айнан бир расм қайта ташланса — иккинчи марта ҳисобланмайди
  {
    const ri = (mi, id, uid = AZIZ) => ({ guruh: "topshirish", uid, vaqt: T(2026, 9, 21, 12, mi), matn: "Hodim04", albom: null, msg_id: 7000 + mi, rasm_id: id });
    C("бир хил расм 2 марта (30 дақ оралиқ) — 1 юк", B.yukHisob([ri(0, "AAA"), ri(30, "AAA")], "topshirish").yuklar.length === 1);
    C("ҳар хил расм — 2 юк", B.yukHisob([ri(0, "AAA"), ri(30, "BBB")], "topshirish").yuklar.length === 2);
    C("rasm_id йӯқ (эски ёзувлар) — аввалгидек 2 юк", B.yukHisob([ri(0, null), ri(30, null)], "topshirish").yuklar.length === 2);
    C("бошқа ҳайдовчининг расми билан устма-уст тушмайди", B.yukHisob([ri(0, "AAA"), ri(30, "AAA", 700000018)], "topshirish").yuklar.length === 2);
  }
  // 🔁 Достон 2026-10-13: битта заказ иккала гуруҳга ташланса — битта ҳисобланади
  {
    const o = (mi, matn) => ({ guruh: "olish", uid: AZIZ, vaqt: T(2026, 9, 21, 14, mi), matn, albom: null, msg_id: 900 + mi });
    const t2 = (mi, matn) => ({ guruh: "topshirish", uid: AZIZ, vaqt: T(2026, 9, 21, 14, mi), matn, albom: null, msg_id: 800 + mi });
    const O = B.yukHisob([o(15, "Mijoz2 akan zakaslar")], "olish").yuklar;
    const Tp = B.yukHisob([t2(15, "Mijoz2 akan zakaslar")], "topshirish").yuklar;
    C("изоҳи бир хил, 1 дақиқа — юк олиш ўчирилади", B.juftOchir(O, Tp).length === 0);
    const O2 = B.yukHisob([o(15, "Mijoz2 akan zakaslar")], "olish").yuklar;
    const Tp2 = B.yukHisob([t2(15, "Hodim06 akan zakaslar")], "topshirish").yuklar;
    C("изоҳи БОШҚА — иккитаси ҳам қолади", B.juftOchir(O2, Tp2).length === 1);
    const O3 = B.yukHisob([o(15, "Mijoz2 akan zakaslar")], "olish").yuklar;
    const Tp3 = B.yukHisob([t2(25, "Mijoz2 akan zakaslar")], "topshirish").yuklar;
    C("вақти узоқ (10 дақиқа) — иккитаси ҳам қолади", B.juftOchir(O3, Tp3).length === 1);
    // 📷 Достон 2026-10-16: АЙНАН ӯша расм иккала гуруҳда — ВАҚТИ БОШҚА бӯлса АЛОҲИДА 2 бонус
    const oR = (mi, matn, id) => ({ guruh: "olish", uid: AZIZ, vaqt: T(2026, 9, 21, 14, mi), matn, albom: null, msg_id: 4000 + mi, rasm_id: id });
    const tR = (mi, matn, id) => ({ guruh: "topshirish", uid: AZIZ, vaqt: T(2026, 9, 21, 14, mi), matn, albom: null, msg_id: 5000 + mi, rasm_id: id });
    const O4 = B.yukHisob([oR(1, "Mijoz2 akan zakaslar", "ZZZ")], "olish").yuklar;
    const T4 = B.yukHisob([tR(57, "Mijoz2 akan zakaslar", "ZZZ")], "topshirish").yuklar;
    C("бир хил расм, 56 дақиқа — ИККИТАСИ ҲАМ ҚОЛАДИ (олди ва топширди)", B.juftOchir(O4, T4).length === 1);
    const O4b = B.yukHisob([oR(1, "Mijoz2 akan zakaslar", "ZZZ")], "olish").yuklar;
    const T4b = B.yukHisob([tR(4, "Boshqa mijoz", "ZZZ")], "topshirish").yuklar;
    C("бир хил расм, 3 дақиқа — битта иш, олиш ӯчади", B.juftOchir(O4b, T4b).length === 0);
    const O5 = B.yukHisob([oR(1, "Mijoz2 akan zakaslar", "ZZZ")], "olish").yuklar;
    const T5 = B.yukHisob([tR(57, "Mijoz2 akan zakaslar", "YYY")], "topshirish").yuklar;
    C("ҳар хил расм, 56 дақиқа — иккитаси ҳам қолади", B.juftOchir(O5, T5).length === 1);
    // Ходим11 02.10: топшириш 17:33 + 17:45 битта юк, олиш 17:44 — 17:45 билан 1 дақиқа → олиш ӯчади
    const O6 = B.yukHisob([oR(12, "Hodim06 akan zakaslar")], "olish").yuklar;
    const T6 = B.yukHisob([tR(1, "Hodim06 akan zakaslar"), tR(13, "Hodim06 akan zakaslar")], "topshirish").yuklar;
    C("бирлашган юк ичидаги расм 1 дақиқа — олиш ӯчади", T6.length === 1 && B.juftOchir(O6, T6).length === 0);
    // Ходим11 13.10: олиш 17:01 + топшириш 17:57, бир расм — энди 2 бонус (56 дақиқа)
    const bX = (g, u, id) => ({ guruh: g, uid: 700000018, vaqt: u, matn: "Mijoz2 akan zakaslar", albom: null, msg_id: u % 100000, rasm_id: id });
    const O7 = B.yukHisob([bX("olish", 1791892889, "QQQ")], "olish").yuklar, T7 = B.yukHisob([bX("topshirish", 1791896258, "QQQ")], "topshirish").yuklar;
    C("Ходим11 13.10 — олиш ҳам, топшириш ҳам қолади", B.juftOchir(O7, T7).length === 1);
    // битта гуруҳ ичида эса бир хил расм иккинчи марта ҳисобланмайди
    C("бир гуруҳда бир хил расм 2 марта — 1 юк", B.yukHisob([bX("olish", 1791892889, "WWW"), bX("olish", 1791896258, "WWW")], "olish").yuklar.length === 1);
    // Ходим15 25.09 06:00 — эрталабки истисно; бошқа кун/ходимга тарқалмайди
    const e6 = (sana, hodim) => ({ hodim, tur: "b", vaqt: Date.parse(sana + "T01:00:00Z") / 1000, kim_ism: "Достон" });
    const hE = B.haydovchiSoat([], [], [e6("2026-09-25", 26)]);
    C("Ходим15 25.09 06:00 — 3 соат, 210 000 (Исузу 70 000)", hE.length === 1 && hE[0].jami === 180 && hE[0].summa === 210000);
    C("Ходим15 бошқа кун — эрталаб ҳисобланмайди", B.haydovchiSoat([], [], [e6("2026-09-26", 26)]).length === 0);
    C("бошқа ҳайдовчи 25.09 — эрталаб ҳисобланмайди", B.haydovchiSoat([], [], [e6("2026-09-25", 11)]).length === 0);
  }
  // 🧾 Достон 2026-10-13: 1–3 дақиқа оралиғида МИЖОЗ бошқа бўлса — алоҳида юк
  const rm = (h, mi, s2, matn) => ({ guruh: "topshirish", uid: AZIZ, vaqt: T(2026, 9, 21, h, mi) + s2, matn, albom: null, msg_id: h * 1000 + mi * 10 + s2 });
  C("2 дақиқа, мижоз БОШҚА — 2 юк", n([rm(11, 0, 0, "Hodim04"), rm(11, 2, 0, "Po‘lat")]) === 2);
  C("2 дақиқа, мижоз БИР ХИЛ — 1 юк", n([rm(11, 0, 0, "Hodim04"), rm(11, 2, 0, "Hodim04 bez nakladnoy")]) === 1);
  C("12 дақиқа, мижоз БИР ХИЛ — 1 юк (Достон 2026-10-13: 15 дақиқагача)", n([rm(11, 0, 0, "Hodim04"), rm(11, 12, 0, "Hodim04")]) === 1);
  C("15 дақиқа роса, мижоз бир хил — 1 юк", n([rm(11, 0, 0, "Hodim04"), rm(11, 15, 0, "Hodim04")]) === 1);
  C("16 дақиқа, мижоз бир хил — 2 юк", n([rm(11, 0, 0, "Hodim04"), rm(11, 16, 0, "Hodim04")]) === 2);
  C("12 дақиқа, мижоз БОШҚА — 2 юк", n([rm(11, 0, 0, "Hodim04"), rm(11, 12, 0, "Ходим15 ока")]) === 2);
  // ⚠️ Ходим15 (id 18) — истисно: унда эскиси (5 дақиқа) қолади (Достон 2026-10-13)
  {
    const IX = B.hodimOl(18).tg;
    const ri = (mi, matn) => ({ guruh: "topshirish", uid: IX, vaqt: T(2026, 9, 21, 13, mi), matn, albom: null, msg_id: 6000 + mi });
    C("Ходим15 ЭСКИ кун (21.09): 12 дақиқа — 2 юк (эксели ӯзгармайди)", B.yukHisob([ri(0, "Hodim04"), ri(12, "Hodim04")], "topshirish").yuklar.length === 2);
    C("Ходим15 эски кун: 2 дақиқа — 1 юк", B.yukHisob([ri(0, "Hodim04"), ri(2, "Hodim04")], "topshirish").yuklar.length === 1);
    // 14.10 дан бошлаб Ходим15га ҳам 15 дақиқа қоидаси
    const rY = (mi, matn) => ({ guruh: "topshirish", uid: IX, vaqt: T(2026, 10, 14, 13, mi), matn, albom: null, msg_id: 6500 + mi });
    C("Ходим15 ЯНГИ кун (14.10): 12 дақиқа — 1 юк (ҳаммадек)", B.yukHisob([rY(0, "Hodim04"), rY(12, "Hodim04")], "topshirish").yuklar.length === 1);
    C("Ходим15 янги кун: 16 дақиқа — 2 юк", B.yukHisob([rY(0, "Hodim04"), rY(16, "Hodim04")], "topshirish").yuklar.length === 2);
  }
  C("айни дақиқада ҳам, мижоз бошқа — 2 юк (Достон 13.10 якуний қоида)", n([rm(11, 0, 0, "Hodim04"), rm(11, 0, 20, "Ходим15 ока")]) === 2);
  C("кирилл/лотин фарқи йўқ: «Ходим15» = «Poʻlat»", B.mijozlar("Ходим15 ока").has("mijoz2") && B.mijozlar("Poʻlat").has("mijoz2"));
  C("2 дақиқа, изоҳи бўш — 1 юк", n([rm(11, 0, 0, "Hodim04"), rm(11, 2, 0, "")]) === 1);
}

console.log("── 🔎 чуқур текширув топилмалари (2026-09-21) ──");
{
  const r = (g, d, h, mi) => ({ guruh: g, uid: AZIZ, vaqt: T(2026, 9, d, h, mi), matn: "", albom: null, msg_id: d * 10000 + h * 100 + mi });
  C("LOGISTIKA расми 01:00 да — эрталабки соат ЙЎҚ (8 соат бонус бермайди)", B.haydovchiSoat([r("olish", 22, 1, 0)]).length === 0);
  C("LOGISTIKA расми 04:59 да — ҳисобланмайди", B.haydovchiSoat([r("olish", 22, 4, 59)]).length === 0);
  const e = B.haydovchiSoat([r("olish", 22, 5, 0)]);
  C("LOGISTIKA расми 05:00 да — соат ЙЎҚ (Достон 2026-10-13)", e.length === 0, JSON.stringify(e));
  C("LOGISTIKA расми 08:59 да — соат ЙЎҚ", B.haydovchiSoat([r("olish", 22, 8, 59)]).length === 0);
}

console.log("── 🚚 эрталабки соат РАСМДАН — 16.10 дан (Достон 2026-10-23) ──");
{
  // Тугма ҳайдовчида умуман йўқ (иловада ҳам, API'да ҳам — юқорида 403 текширилган),
  // лекин 09:00 дан олдин гуруҳга расм ташласа — ўша вақтдан 09:00 гача соат ёзилади.
  const r = (g, d, h, mi) => ({ guruh: g, uid: AZIZ, vaqt: T(2026, 10, d, h, mi), matn: "", albom: null, msg_id: d * 10000 + h * 100 + mi });
  const q1 = B.haydovchiSoat([r("olish", 20, 8, 0)]);
  C("20.10 да 08:00 юк олиш расми → 1 соат = 40 000", q1.length === 1 && q1[0].boshladi === "08:00" && q1[0].ertalab === 60 && q1[0].summa === 40000, JSON.stringify(q1));
  const q2 = B.haydovchiSoat([r("topshirish", 20, 8, 30)]);
  C("юк ТОПШИРИШ расми ҳам соат беради (08:30 → 30 дақ)", q2.length === 1 && q2[0].ertalab === 30 && q2[0].summa === 20000, JSON.stringify(q2));
  C("энг ЭРТА расм олинади (08:45 + 07:10 → 1с50д)", B.haydovchiSoat([r("olish", 20, 8, 45), r("topshirish", 20, 7, 10)])[0].ertalab === 110);
  C("«Ким ёзди»да — гуруҳдаги расм", /Эрталаб: гуруҳдаги расм/.test(q1[0].yozdi), q1[0].yozdi);
  C("04:59 да — ҳисобланмайди", B.haydovchiSoat([r("olish", 20, 4, 59)]).length === 0);
  C("09:00 да — ҳисобланмайди (иш вақти бошланди)", B.haydovchiSoat([r("olish", 20, 9, 0)]).length === 0);
  C("эрталабки расм + кечқурунги расм — битта қатор", B.haydovchiSoat([r("olish", 20, 8, 0), r("topshirish", 20, 19, 0)]).length === 1);
  const ik = B.haydovchiSoat([r("olish", 20, 8, 0), r("topshirish", 20, 19, 0)])[0];
  C("— эрталаб 60 + кечқурун 60 = 2 соат (80 000)", ik.jami === 120 && ik.summa === 80000, JSON.stringify(ik));
  // 🔒 эски давр (16.09–15.10) ҳисоб-китоб қилинган — ўзгармайди
  C("15.10 да 08:00 — соат ЙЎҚ (эски давр эталон)", B.haydovchiSoat([r("olish", 15, 8, 0)]).length === 0);
  C("16.10 да 08:00 — БОР (янги қоида шу кундан)", B.haydovchiSoat([r("olish", 16, 8, 0)]).length === 1);
  // Қўлда ёзилган «бошладим» (расм ташламаган кун) — 16.10 дан истисносиз ишлайди
  const qd = [{ hodim: H("Ходим10"), tur: "b", vaqt: T(2026, 10, 21, 7, 23), kim: 1, kim_ism: "Достон" }];
  const q3 = B.haydovchiSoat([], [], qd);
  C("қўлда 21.10 07:23 → 1с37д (истисно рўйхати шарт эмас)", q3.length === 1 && q3[0].ertalab === 97, JSON.stringify(q3));
  const q4 = B.haydovchiSoat([r("olish", 21, 8, 41)], [], qd);
  C("қўлда 07:23 + расм 08:41 → битта қатор, энг эрта 07:23", q4.length === 1 && q4[0].boshladi === "07:23" && q4[0].ertalab === 97, JSON.stringify(q4));
  C("қўлда 10.10 (эски давр) — ҳисобланмайди", B.haydovchiSoat([], [], [{ hodim: H("Ходим10"), tur: "b", vaqt: T(2026, 10, 10, 7, 23), kim: 1 }]).length === 0);
  C("Ходим05 ака 22.10 истисноси жойида", B.HAYDOVCHI_ERTALAB_ISTISNO.has("7|2026-10-22"));

  // 🌙 Достон 2026-10-27: кечқурунги соат «юк олиш» расмидан ҳам (Ходим15 26.10 — 20:35 да юк олган)
  const kech1 = B.haydovchiSoat([r("olish", 26, 20, 35)]);
  C("26.10 да 20:35 ЮК ОЛИШ расми → 18:00–20:35 = 2с35д = 103 333", kech1.length === 1 && kech1[0].tugatdi === "20:35" && kech1[0].kech === 155 && kech1[0].summa === 103333, JSON.stringify(kech1));
  C("17:59 да юк олиш — соат ЙЎҚ (иш вақти)", B.haydovchiSoat([r("olish", 26, 17, 59)]).length === 0);
  C("18:00 роса — соат ЙЎҚ (18:01 дан)", B.haydovchiSoat([r("olish", 26, 18, 0)]).length === 0);
  const kech2 = B.haydovchiSoat([r("olish", 26, 20, 35), r("topshirish", 26, 19, 0)]);
  C("иккала гуруҳдан энг КЕЧИ олинади (20:35)", kech2[0].tugatdi === "20:35" && kech2[0].kech === 155, JSON.stringify(kech2));
  C("ярим тундан кейинги ЮК ОЛИШ расми (02:00) — ҳисобланмайди", B.haydovchiSoat([r("olish", 26, 2, 0)]).length === 0);
  const tunT = B.haydovchiSoat([r("topshirish", 26, 2, 0)]);
  C("ярим тундан кейинги ЮК ТОПШИРИШ — аввалгидек олдинги кунга", tunT.length === 1 && tunT[0].sana === "2026-10-25", JSON.stringify(tunT));
  // 🔒 эски давр: кечқурунги «юк олиш» ҳисобланмайди (эталон ўзгармайди)
  // Достон 2026-10-27: эски кунлар ҳам тузатилди — кечқурунги «юк олиш» ҳамма даврда ҳисобланади
  C("15.10 да ҳам 20:35 юк олиш → соат БОР (эски кунлар тузатилди)", B.haydovchiSoat([r("olish", 15, 20, 35)]).length === 1);
  C("16.10 да 20:35 юк олиш — БОР", B.haydovchiSoat([r("olish", 16, 20, 35)]).length === 1);
}

console.log("── 🔎 чуқур текширув: 6 та тузатиш (2026-09-21) ──");
{
  // 4. Ходим15нинг икки аккаунти — битта одам
  const hx = [{ guruh: "topshirish", uid: 700000030, vaqt: T(2026, 9, 22, 10, 0), matn: "", albom: null, msg_id: 1 },
              { guruh: "topshirish", uid: 700000031, vaqt: T(2026, 9, 22, 10, 2), matn: "", albom: null, msg_id: 2 }];
  C("Ходим15 икки аккаунтдан 2 дақиқа оралиқда — 1 юк (битта одам)", B.yukHisob(hx, "topshirish").yuklar.length === 1);
  // 3. Давр чегараси: 15.09 23:50 + 16.09 00:05 — янги даврда ёзилмайди
  const DBc = yangiDB();
  DBc.db.exec(fs.readFileSync(new URL("../migrations/0004_kirdim.sql", import.meta.url), "utf8"));
  DBc.db.exec(fs.readFileSync(new URL("../migrations/0005_bonus_hodim.sql", import.meta.url), "utf8"));
  const ins = (vaqt, msg) => DBc.db.prepare("INSERT INTO bonus_xabar (chat_id, msg_id, guruh, uid, ism, vaqt, matn, rasm, albom) VALUES (?,?,?,?,?,?,?,1,NULL)").run(-5000000003, msg, "topshirish", AZIZ, "Ходим10", vaqt, "");
  ins(T(2026, 9, 15, 23, 59), 11); ins(T(2026, 9, 16, 0, 1), 12);   // 2 дақиқа — битта юк
  const dy = await B.davrMalumot({ DB: DBc }, B.davrOl(T(2026, 9, 16, 12, 0)), T(2026, 9, 16, 12, 0));
  C("давр чегарасидаги юк (15-куни бошланган) янги даврда ЙЎҚ — икки марта тўланмайди", dy.topshirish.yuklar.length === 0, JSON.stringify(dy.topshirish.yuklar.map((y) => y.sana)));
  const de = await B.davrMalumot({ DB: DBc }, B.davrOl(T(2026, 9, 15, 12, 0)), T(2026, 9, 16, 12, 0));
  C("…ўтган даврда эса битта юк", de.topshirish.yuklar.length === 1);
  // 6. Рағбат йўқ бўлса — доиравий формула йўқ
  const xl = Buffer.from(await B.bonusExcel(dy));
  const zlib = await import("node:zlib");
  let s4 = "";
  for (let i = 0; i < xl.length - 30; i++) { if (xl.readUInt32LE(i) !== 0x04034b50) continue; const nl = xl.readUInt16LE(i + 26), el = xl.readUInt16LE(i + 28), cs = xl.readUInt32LE(i + 18); if (xl.slice(i + 30, i + 30 + nl).toString() === "xl/worksheets/sheet2.xml") s4 = zlib.inflateRawSync(xl.slice(i + 30 + nl + el, i + 30 + nl + el + cs)).toString(); }
  C("рағбат бўш бўлса ЖАМИ катагида доиравий формула ЙЎҚ", s4 && !/<f>SUM\(E5:E5\)<\/f>/.test(s4));
  // 2. «Тошкентга кирдим»: эрталаб «кечаси босгандим» деб орқага сурилган вақт — рад
  const e0 = env;
  env = { ...env, DB: yangiDB(), BONUS_SINOV: undefined };
  env.DB.db.exec(fs.readFileSync(new URL("../migrations/0004_kirdim.sql", import.meta.url), "utf8"));
  soatQoy(9, 30, 22);
  const ms = toshkent(2026, 9, 22, 9, 30);
  const k = await sora(AZIZ, "/bonus/kirdim", "POST", { lat: 41.2755, lon: 69.2045, bosildi: ms - (4 * 3600 + 31 * 60) * 1000, telefon: ms });
  C("09:30 да «04:59 да босгандим» деб юборилса — РАД (олдин 10 соатлик бонус бўларди)", k.status === 409 && /05:00 дан кейин/.test(k.xato || ""), JSON.stringify(k));
  C("…базага ҳеч нарса ёзилмади", env.DB.db.prepare("SELECT COUNT(*) n FROM bonus_kirish").get().n === 0);
  env = e0;
  // 5. Оддий ходимнинг тарифи ҳам шу кунга қараб (oldin)
  B.sinovQosh({ id: 950, nom: "Синов тариф", bolim: "Цех", tarif: 40000, tg: 9990001, oldin: [{ gacha: "2026-09-18", tarif: 35000 }] });
  const ih = B.ishHisob([{ hodim: 950, tur: "t", vaqt: T(2026, 9, 18, 19, 0), kim: 1 }, { hodim: 950, tur: "t", vaqt: T(2026, 9, 19, 19, 0), kim: 1 }]);
  C("оддий ходим: 18.09 эски тариф 35 000, 19.09 янги 40 000", ih.find((q) => q.sana === "2026-09-18").summa === 35000 && ih.find((q) => q.sana === "2026-09-19").summa === 40000, JSON.stringify(ih.map((q) => q.summa)));
  // 1. Рўйхат бўш қолмайди: юклаш вақтида ҳам эски рўйхат кўринади
  const DBh = yangiDB();
  DBh.db.exec(fs.readFileSync(new URL("../migrations/0005_bonus_hodim.sql", import.meta.url), "utf8"));
  DBh.db.prepare("INSERT INTO bonus_hodim (nom, tarif, qoshdi, qoshdi_ism, vaqt) VALUES ('Ходим15', 35000, 1, 'К', 1)").run();
  await B.hodimlarYukla({ DB: DBh });
  const yukl = B.hodimlarYukla({ DB: DBh });   // тугамасдан туриб…
  C("қўшилган ходим рўйхати юкланаётганда ҳам бўш эмас (бир вақтдаги сўровлар)", B.hodimOl(10001) && B.hodimOl(10001).nom === "Ходим15");
  await yukl;
}

// 🕒 Рағбатга соат ёзилса огоҳлантириш: SOAT_RE ҳақиқий вақтларни топиши шарт.
//   Нима учун тест манба файлдан ўқийди: ифодадаги backslash'лар йўқолиб кетган бўлса
//   (\d -> d, \s -> s) ифода ҳеч қачон мос келмайди ва огоҳлантириш чиқмайди (Достон 2026-10-06).
{
  const sv = fs.readFileSync(new URL("../app/src/screens/Bonus.svelte", import.meta.url), "utf8");
  const m = sv.match(/const SOAT_RE = (\/.+\/)([gimsuy]*);/);
  C("Bonus.svelteда SOAT_RE бор", !!m, String(m && m[1]));
  let re = null;
  if (m) { try { re = new RegExp(m[1].slice(1, -1), m[2]); } catch { re = null; } }
  C("SOAT_RE тўғри ифода", !!re);
  const topsin = ["18:40", "20:30", "8:15", "23:59", "9.30", "21:20 да тугатдик", "Сетка 18:40 дан 20:00 гача"];
  const topmasin = ["20 қоп", "5 та палета", "1000", "2026 йил"];
  for (const s of topsin) C("SOAT_RE топади: " + s, !!re && re.test(s));
  for (const s of topmasin) C("SOAT_RE топмайди (тўғри): " + s, !!re && !re.test(s));
}
/* ⚠️ ТАКРОР ТЕКШИРУВИ (Достон 2026-10-08): сеҳдаги ходим ҳайдовчига соат ёзса,
 * кейин ҳайдовчи ўзи ҳам ёзса — БИР марта ҳисобланиши шарт. */
{
  const U = (y, m, d, h, mi) => Math.floor(Date.UTC(y, m - 1, d, h - 5, mi) / 1000);
  const ikki = [{ hodim: 10, tur: "t", vaqt: U(2026, 10, 8, 19, 10), kim: 1 }, { hodim: 10, tur: "t", vaqt: U(2026, 10, 8, 19, 30), kim: 10 }];
  const hs = B.haydovchiSoat([], [], ikki);
  C("ҳайдовчига икки киши ёзса — БИТТА қатор", hs.length === 1, "қатор: " + hs.length);
  C("— ва энг КЕЧ вақт олинади (19:30 → 1с09)", hs[0] && hs[0].jami === 90, "дақ: " + (hs[0] && hs[0].jami));
  C("ҳайдовчига қўлда «бошладим» ёзса ҳам — ҳисобланмайди (Достон 2026-10-13)", B.haydovchiSoat([], [], [{ hodim: 10, tur: "b", vaqt: U(2026, 10, 8, 7, 38), kim: 1 }]).length === 0);
  const ih = B.ishHisob(ikki.map((y) => ({ ...y, hodim: 1 })));
  C("оддий ходимга ҳам икки ёзув — БИТТА қатор", ih.length === 1, "қатор: " + ih.length);
  C("ҳайдовчининг илова ёзуви ishHisobда ИККИ МАРТА ҳисобланмайди", B.ishHisob(ikki).length === 0);
  C("лотин/кирилл такрор исм тутилади", B.ismTeng("Hodim01", "Ходим01") && B.ismTeng("Hodim19", "Ходим15") && !B.ismTeng("Hodim14", "Ходим15 Газел"));
  // 🔤 Достон 2026-10-19: «Hodim05 aka gazel» такрор деб тутилиши керак
  C("исм ичида рўйхатдагиси бўлса — такрор", B.ismIchida("Ходим05 ака", "Hodim05 aka gazel") === true);
  C("«Ходим15» ичида бўлса ҳам такрор", B.ismIchida("Ходим15", "Hodim35 usta") === true);
  C("«Ходим10» ва «Ходим10бек» — БОШҚА одам", B.ismIchida("Ходим10", "Azizbek") === false && B.ismIchida("Ходим10", "Aziz") === true);
  C("тескариси такрор эмас: рўйхатдагиси узун бўлса", B.ismIchida("Ходим15 Газел", "Hodim14") === false);
}
console.log("── 🚚 ҳайдовчи «Ишни тугатдим»: танламаса — ўзи, танласа — фақат танланганлар (2026-11-07) ──");
{
  soatQoy(20, 29, 25);
  const r1 = await sora(AZIZ, "/bonus/ish", "POST", { tur: "t", qoshimcha: [] });
  C("🚚 Ходим10 ҳеч кимни танламай босди → ФАҚАТ ўзига", r1.status === 200 && r1.kimlar.join() === "Ходим10", JSON.stringify(r1));
  soatQoy(20, 40, 25);
  const r2 = await sora(AZIZ, "/bonus/ish", "POST", { tur: "t", qoshimcha: [H("Ходим15"), H("Ходим15")] });
  C("🚚 Ходим10 Ходим15 ва Ходим15ни танлади → ФАҚАТ Ходим15 + Ходим15 (Ходим10га ортиқча соат ЙЎҚ)", r2.status === 200 && r2.kimlar.join() === "Ходим15,Ходим15", JSON.stringify(r2));
  soatQoy(20, 42, 25);
  const r2b = await sora(AZIZ, "/bonus/ish", "POST", { tur: "t", qoshimcha: [H("Ходим10"), H("Ходим15")] });
  C("🚚 Ходим10 ўзини ҳам танлади → Ходим10 + Ходим15 (бир вақтда тугатди)", r2b.status === 200 && r2b.kimlar.join() === "Ходим10,Ходим15", JSON.stringify(r2b));
  soatQoy(20, 45, 25);
  const r3 = await sora(KAMOL, "/bonus/ish", "POST", { tur: "t", qoshimcha: [H("Ходим15")] });
  C("бошқа ходим (Ходим15) — аввалгидек: фақат танлаганига", r3.status === 200 && r3.kimlar.join() === "Ходим15", JSON.stringify(r3));
  const r4 = await sora(KAMOL, "/bonus/ish", "POST", { tur: "t", qoshimcha: [] });
  C("бошқа ходим ҳеч кимни танламаса — «Ходимларни танланг» (400)", r4.status === 400, JSON.stringify(r4));
}

console.log("── ✂️ АЛОҲИДА ЮК — Ходим15 07.11 12:49 возврат + 12:56 Эшонгузар = 2 иш ──");
{
  const v = (h, mi, s = 0) => Date.UTC(2026, 10, 7, h - 5, mi, s) / 1000;
  const xs = [
    { guruh: "olish", msg_id: 15135, uid: 700000023, vaqt: v(12, 49, 49), matn: "Hodim04 sapok vazvrat", rasm_id: "A1" },
    { guruh: "olish", msg_id: 15138, uid: 700000023, vaqt: v(12, 56, 36), matn: "Hodim04 Joy1da olindi Sapok", rasm_id: "B2" },
    { guruh: "olish", msg_id: 15139, uid: 700000023, vaqt: v(12, 58, 12), matn: "Hodim04 Joy1da Sapok olindi", rasm_id: "B2" },
  ];
  const y = B.yukHisob(xs, "olish").yuklar;
  C("✂️ 12:49 ва 12:56 — ИККИ юк, 12:58 (такрор расм) — ҳисобланмайди → 20 000",
    y.length === 2 && y[0].vaqt === "12:49" && y[1].vaqt === "12:56" && y.reduce((s, q) => s + q.bonus, 0) === 20000, JSON.stringify(y.map((q) => [q.vaqt, q.rasm, q.bonus])));
  const yb = B.yukHisob(xs.map((x) => ({ ...x, msg_id: x.msg_id + 1000 })), "olish").yuklar;
  C("✂️ бошқа хабарларда қоида ўзгармади — бир мижоз 15 дақиқада = 1 юк", yb.length === 1, JSON.stringify(yb.map((q) => [q.vaqt, q.rasm])));
}

C("👤 Ходим15 2-аккаунт (700000026) → Ходим15ники", (B.hodimTg(700000026) || {}).id === 20 && (B.hodimTg(700000025) || {}).id === 20);

console.log("── ⚠️ ОГОҲЛАНТИРИШ — фақат Раҳбар ака, Админ ака, Ходим02, Ходим15 ака (Достон 2026-11-11) ──");
{
  const MUROD = 700000041, XURSHID = 700000042;
  C("⚠️ гуруҳ хабари рағбатдек: ОГОҲЛАНТИРИШ · ✍️ · Кимга · 📝",
    B.ogohXabar("Ходим02", ["Ходим15", "Ходим13"], "кеч қолди") === "<pre>⚠️ ОГОҲЛАНТИРИШ\n\n✍️ Ходим02\n👥 Кимга:\n  • Ходим15\n  • Ходим13\n\n📝 кеч қолди</pre>");
  const gS = await sora(SHAHZOD, "/bonus"), gK = await sora(KAMOL, "/bonus");
  C("⚠️ Ходим02да огоҳлантириш бор, Ходим15да — йўқ", gS.ogoh === true && gK.ogoh === false, JSON.stringify([gS.ogoh, gK.ogoh]));
  chiq = [];
  const r1 = await sora(SHAHZOD, "/bonus/ogoh", "POST", { kimga: ["h" + H("Ходим15")], matn: "Ишга кеч қолди" });
  const x1 = chiq.filter((m) => m.met === "sendMessage").at(-1) || {};
  C("⚠️ Ходим02 ёзди → 200, BIGANT гуруҳига «ОГОҲЛАНТИРИШ»", r1.status === 200 && r1.guruhga && Number(x1.chat_id) === B.BIGANT_GURUH && /^<pre>⚠️ ОГОҲЛАНТИРИШ\n/.test(x1.text || ""), JSON.stringify([r1, x1]));
  const r2 = await sora(MUROD, "/bonus/ogoh", "POST", { kimga: ["h" + H("Ходим15"), "h" + H("Ходим15")], matn: "Тартибни бузди" });
  C("⚠️ Админ ака (ходим эмас) ҳам ёза олади → 2 киши", r2.status === 200 && r2.soni === 2, JSON.stringify(r2));
  const r3 = await sora(SARDOR, "/bonus/ogoh", "POST", { kimga: ["h" + H("Ходим15")], matn: "огоҳлантириш" });
  const r4 = await sora(XURSHID, "/bonus/ogoh", "POST", { kimga: ["h" + H("Ходим15")], matn: "огоҳлантириш" });
  C("⚠️ Раҳбар ака ва Ходим15 ака ёза олади", r3.status === 200 && r4.status === 200, JSON.stringify([r3.status, r4.status]));
  C("⚠️ Ходим15 (бошқа ходим) ёза олмайди — 403", (await sora(KAMOL, "/bonus/ogoh", "POST", { kimga: ["h" + H("Ходим15")], matn: "огоҳлантириш" })).status === 403);
  C("⚠️ Ходим10 (ҳайдовчи) ёза олмайди — 403", (await sora(AZIZ, "/bonus/ogoh", "POST", { kimga: ["h" + H("Ходим15")], matn: "огоҳлантириш" })).status === 403);
  C("⚠️ бегона — 403", (await sora(BEGONA, "/bonus/ogoh", "POST", { kimga: ["h" + H("Ходим15")], matn: "огоҳлантириш" })).status === 403);
  C("⚠️ матнсиз / кимсиз — РАД", (await sora(SHAHZOD, "/bonus/ogoh", "POST", { kimga: ["h" + H("Ходим15")], matn: " " })).status === 400
    && (await sora(SHAHZOD, "/bonus/ogoh", "POST", { kimga: [], matn: "огоҳлантириш" })).status === 400);
  C("⚠️ рағбат жадвалига ТУШМАЙДИ (алоҳида жадвал)", (await env.DB.prepare("SELECT COUNT(*) n FROM bonus_ragbat WHERE matn = 'Ишга кеч қолди'").first("n")) === 0
    && (await env.DB.prepare("SELECT COUNT(*) n FROM bonus_ogoh").first("n")) === 5);
  const tb = (rol, rr) => tablarOl(rol, rr).map((t) => t[2]);
  C("⚠️ таблар: ходим/админ/сотувчида «ogoh» белгиси бўлса — пастки тугма; белгисиз — йўқ",
    tb("xodim", ["xodim", "ogoh"]).includes("ogoh") && tb("admin", ["admin", "ogoh"]).includes("ogoh") && tb("sotuvchi", ["sotuvchi", "ogoh"]).includes("ogoh")
    && !tb("xodim", ["xodim"]).includes("ogoh"), JSON.stringify([tb("xodim", ["xodim", "ogoh"]), tb("admin", ["admin", "ogoh"])]));
  C("⚠️ супер админда алоҳида тугма ЙЎҚ — «Бонуслар» ичида", !tb("superadmin", ["superadmin", "ogoh"]).includes("ogoh") && tb("superadmin", ["superadmin", "ogoh"]).includes("bonus"));
  const me = await sora(MUROD, "/me"), meK = await sora(KAMOL, "/me");
  C("⚠️ /me: Админ акада «ogoh» белгиси, Ходим15да йўқ", (me.rollar || []).includes("ogoh") && !(meK.rollar || []).includes("ogoh"), JSON.stringify([me.rollar, meK.rollar]));
}

console.log("── 💸 ЖАРИМА — вариантдан танланади, 4 киши ёзади, бонусдан айирилмайди (Достон 2026-11-11) ──");
{
  const MUROD = 700000041, XURSHID = 700000042;
  C("💸 гуруҳ хабари: ЖАРИМА · ✍️ · Кимга · 📝 вариант — нарх",
    B.jarimaXabar("Ходим02", ["Ходим15"], "Ишга кеч қолиш", 50000) === "<pre>🚫 ЖАРИМА\n\n✍️ Ходим02\n👥 Кимга:\n  • Ходим15\n\n📝 Ишга кеч қолиш — 50 000 сўм</pre>");
  const v1 = await sora(SHAHZOD, "/bonus/jarima/tur", "POST", { nom: "Ишга кеч қолиш", narx: "50 000" });
  C("💸 Ходим02 вариант қўшди: «Ишга кеч қолиш» — 50 000", v1.status === 200 && v1.narx === 50000 && v1.id > 0, JSON.stringify(v1));
  C("💸 бир хил вариант қайта қўшилмайди — 409", (await sora(MUROD, "/bonus/jarima/tur", "POST", { nom: "ишга кеч қолиш", narx: 30000 })).status === 409);
  C("💸 нархсиз / номсиз вариант — РАД", (await sora(SHAHZOD, "/bonus/jarima/tur", "POST", { nom: "Чекиш", narx: "" })).status === 400
    && (await sora(SHAHZOD, "/bonus/jarima/tur", "POST", { nom: "", narx: 20000 })).status === 400);
  C("💸 Ходим15 вариант қўша олмайди — 403", (await sora(KAMOL, "/bonus/jarima/tur", "POST", { nom: "Бошқа", narx: 20000 })).status === 403);
  const g = await sora(SARDOR, "/bonus"), gK = await sora(KAMOL, "/bonus");
  C("💸 вариантлар рўйхати 4 кишида кўринади, Ходим15да — бўш", g.jarimaTurlar.some((t) => t.nom === "Ишга кеч қолиш" && t.narx === 50000) && gK.jarimaTurlar.length === 0, JSON.stringify(g.jarimaTurlar));
  chiq = [];
  const j1 = await sora(MUROD, "/bonus/jarima", "POST", { kimga: ["h" + H("Ходим15"), "h" + H("Ходим15")], tur: v1.id });
  const x1 = chiq.filter((m) => m.met === "sendMessage").at(-1) || {};
  C("💸 Админ ака Ходим15 ва Ходим15га жарима ёзди → 2 киши, гуруҳга «ЖАРИМА … 50 000 сўм»",
    j1.status === 200 && j1.soni === 2 && Number(x1.chat_id) === B.BIGANT_GURUH && /^<pre>🚫 ЖАРИМА\n/.test(x1.text || "") && /Ишга кеч қолиш — 50 000 сўм/.test(x1.text || ""), JSON.stringify([j1, x1.text]));
  C("💸 Раҳбар ака, Ходим15 ака, Ходим02 ҳам ёза олади",
    (await sora(SARDOR, "/bonus/jarima", "POST", { kimga: ["h" + H("Ходим15")], tur: v1.id })).status === 200
    && (await sora(XURSHID, "/bonus/jarima", "POST", { kimga: ["h" + H("Ходим15")], tur: v1.id })).status === 200
    && (await sora(SHAHZOD, "/bonus/jarima", "POST", { kimga: ["h" + H("Ходим15")], tur: v1.id })).status === 200);
  C("💸 вариантсиз — РАД (қўлда ёзиб бўлмайди)", (await sora(SHAHZOD, "/bonus/jarima", "POST", { kimga: ["h" + H("Ходим15")], matn: "ўзим ёздим" })).status === 400
    && (await sora(SHAHZOD, "/bonus/jarima", "POST", { kimga: ["h" + H("Ходим15")], tur: 99999 })).status === 400);
  C("💸 кимсиз — РАД", (await sora(SHAHZOD, "/bonus/jarima", "POST", { kimga: [], tur: v1.id })).status === 400);
  C("💸 Ходим15, Ходим10 (ҳайдовчи), бегона ёза олмайди — 403",
    (await sora(KAMOL, "/bonus/jarima", "POST", { kimga: ["h" + H("Ходим15")], tur: v1.id })).status === 403
    && (await sora(AZIZ, "/bonus/jarima", "POST", { kimga: ["h" + H("Ходим15")], tur: v1.id })).status === 403
    && (await sora(BEGONA, "/bonus/jarima", "POST", { kimga: ["h" + H("Ходим15")], tur: v1.id })).status === 403);
  const qator = await env.DB.prepare("SELECT kimga, tur_nom, narx FROM bonus_jarima ORDER BY id").all();
  C("💸 базада 5 қатор, ҳар бирида вариант номи ва нархи", qator.results.length === 5 && qator.results.every((q) => q.tur_nom === "Ишга кеч қолиш" && q.narx === 50000), JSON.stringify(qator.results));
  const tb = (rol, rr) => tablarOl(rol, rr).map((t) => t[2]);
  C("💸 таблар: «ogoh» белгисида «Жарима» ҳам бор, белгисиз — йўқ; супер админда «Бонуслар» ичида",
    tb("xodim", ["xodim", "ogoh"]).includes("jarima") && tb("admin", ["admin", "ogoh"]).includes("jarima") && !tb("xodim", ["xodim"]).includes("jarima")
    && !tb("superadmin", ["superadmin", "ogoh"]).includes("jarima"));
}

console.log("── 🔒 огоҳлантириш ва жарима: Достонга ОЧИҚ, Шерикга ЁПИҚ (Достон 2026-11-11) ──");
{
  const gD = await sora(DOSTON, "/bonus"), gR = await sora(RUSLAN, "/bonus");
  C("👤 огоҳлантириш/жарима рўйхатида ёзаётганнинг ЎЗИ ҳам бор (Ходим02, Достон)",
    (await sora(SHAHZOD, "/bonus")).ogohKimlar.some((k) => k.k === "h" + H("Ходим02")) && gD.ogohKimlar.some((k) => k.k === "u" + DOSTON || k.k === "h900")
    && (await sora(SHAHZOD, "/bonus/ogoh", "POST", { kimga: ["h" + H("Ходим02")], matn: "ўзимга синов" })).status === 200
    && !(await sora(SHAHZOD, "/bonus")).kimlar.some((k) => k.k === "h" + H("Ходим02")));
  C("🔒 Достонда кўринади, Шерикда — йўқ", gD.ogoh === true && gR.ogoh === false && gR.jarimaTurlar.length === 0, JSON.stringify([gD.ogoh, gR.ogoh]));
  const tur = gD.jarimaTurlar[0];
  C("🔒 Достон огоҳлантириш ва жарима ёза олади",
    (await sora(DOSTON, "/bonus/ogoh", "POST", { kimga: ["h" + H("Ходим15")], matn: "синов огоҳлантириш" })).status === 200
    && (await sora(DOSTON, "/bonus/jarima", "POST", { kimga: ["h" + H("Ходим15")], tur: tur && tur.id })).status === 200);
  C("🔒 Шерик огоҳлантириш, жарима, вариант — ҳаммаси 403",
    (await sora(RUSLAN, "/bonus/ogoh", "POST", { kimga: ["h" + H("Ходим15")], matn: "синов огоҳлантириш" })).status === 403
    && (await sora(RUSLAN, "/bonus/jarima", "POST", { kimga: ["h" + H("Ходим15")], tur: tur && tur.id })).status === 403
    && (await sora(RUSLAN, "/bonus/jarima/tur", "POST", { nom: "Шерик варианти", narx: 10000 })).status === 403);
}

console.log("── 📊 Excel: огоҳлантириш ва жарима — алоҳида варақ, «Жами»да алоҳида (бонусга кирмайди) (Достон 2026-11-11) ──");
{
  const hoz = Math.floor(Date.now() / 1000);
  const dAsl = await B.davrMalumot(env, B.davrOl(hoz), hoz + 60);
  C("📅 17.11.2026 дан олдинги огоҳлантириш/жарима Excel'да КЎРИНМАЙДИ", B.OGOH_JARIMA.bosh === "2026-11-17" && dAsl.ogoh.length === 0 && dAsl.jarima.length === 0);
  B.OGOH_JARIMA.bosh = "2000-01-01";   // синов ёзувлари (октябрь) ҳам кўринсин
  const d = await B.davrMalumot(env, B.davrOl(hoz), hoz + 60);
  const hodim35 = H("Ходим15");
  const jK = d.jarima.filter((r) => Number(r.kimga_hodim) === hodim35), oK = d.ogoh.filter((r) => Number(r.kimga_hodim) === hodim35);
  C("📊 давр маълумотида огоҳлантириш ва жарима бор (Ходим15)", jK.length >= 1 && oK.length >= 1 && jK.every((r) => r.narx === 50000), JSON.stringify([jK.length, oK.length]));
  const v = B.bonusVaraqlar(d, "синов"), nomlar = v.map((x) => x.name);
  C("📊 Раҳбар ака файлида «Огоҳлантириш» ва «Жарима» варақлари", nomlar.includes("Огоҳлантириш") && nomlar.includes("Жарима"), nomlar.join(","));
  const matnlar = (vr) => vr.rows.flat().map((x) => (x && x.v != null ? String(x.v) : ""));
  const jv = v.find((x) => x.name === "Жарима"), js = v.find((x) => x.name === "Жами сумма");
  const jamiPul = d.jarima.reduce((s2, r) => s2 + r.narx, 0);
  C("📊 «Жарима» варағида вариант номи, нархи ва ким ёзгани", matnlar(jv).includes("Ишга кеч қолиш") && matnlar(jv).includes("50000") && matnlar(jv).includes(String(jamiPul)));
  const jsR = js.rows.findIndex((r) => r[1] && r[1].v === "Жарима");
  const jamiR = js.rows.findIndex((r) => r[1] && r[1].v === "Жами");
  C("📊 «Жами сумма»да жарима суммаси ЖАМИ қаторидан КЕЙИН (бонус жамисига кирмайди)", jsR > jamiR && jamiR > 0 && js.rows[jsR][3].v === jamiPul
    && js.rows.some((r) => r[1] && /^Огоҳлантириш/.test(String(r[1].v))), JSON.stringify([jsR, jamiR, js.rows[jsR] && js.rows[jsR][3]]));
  const bayt = await B.shaxsiyExcel(d, B.hodimOl(hodim35));
  C("📊 Ходим15нинг шахсий Excel'и тузилади (огоҳлантириш/жарима билан)", bayt && bayt.length > 1000);
  const d0 = { ...d, ogoh: [], jarima: [] };
  const ov = v.find((x) => x.name === "Огоҳлантириш");
  C("📊 «Огоҳлантириш» варағида «Сумма» устуни бўш (Раҳбар ака ёзади), ЖАМИ — формула",
    ov.rows[3].map((x) => x.v).join("|") === "№|Сана|Ходим|Огоҳлантириш (хабар тексти)|Сумма|Ёзган" && ov.rows[4][4].v === ""
    && js.rows.some((r) => r[3] && /^SUM\('Огоҳлантириш'!E5:E\d+\)$/.test(r[3].f || "")), JSON.stringify(ov.rows[3].map((x) => x.v)));
  B.OGOH_JARIMA.bosh = "2026-11-17";
  C("📊 огоҳлантириш/жарима йўқ бўлса — варақлар ҳам йўқ", !B.bonusVaraqlar(d0, "").some((x) => x.name === "Жарима" || x.name === "Огоҳлантириш"));
}

console.log("── 🧪 синов: KV «bonus:elon-guruh» — рағбат, огоҳлантириш, жарима — ўзига / синов гуруҳига (Достон 2026-11-11) ──");
{
  const TEST = -1009998887776;
  const tur = (await sora(SARDOR, "/bonus")).jarimaTurlar[0];
  const yubor = async () => {
    chiq = [];
    await sora(SARDOR, "/bonus/ragbat", "POST", { kimga: ["h" + H("Ходим15")], matn: "синов рағбат" });
    await sora(SARDOR, "/bonus/ogoh", "POST", { kimga: ["h" + H("Ходим15")], matn: "синов огоҳлантириш" });
    await sora(SARDOR, "/bonus/jarima", "POST", { kimga: ["h" + H("Ходим15")], tur: tur.id });
    return chiq.filter((m) => m.met === "sendMessage").map((m) => Number(m.chat_id));
  };
  await KV.put("bonus:elon-guruh", "ozi");
  const sanoq = async () => [await env.DB.prepare("SELECT COUNT(*) n FROM bonus_ragbat").first("n"),
    await env.DB.prepare("SELECT COUNT(*) n FROM bonus_ogoh").first("n"), await env.DB.prepare("SELECT COUNT(*) n FROM bonus_jarima").first("n")].join();
  const oldin = await sanoq();
  const c1 = await yubor();
  C("🧪 «ozi»: базага ҲЕЧ НАРСА ёзилмади (рағбат, огоҳлантириш, жарима — Excel'да чиқмайди)", (await sanoq()) === oldin, oldin + " → " + (await sanoq()));
  C("🧪 «ozi»: учаласи ҳам Раҳбар аканинг ЎЗИГА (бот чати)", c1.join() === [SARDOR, SARDOR, SARDOR].join(), JSON.stringify(c1));
  await KV.put("bonus:elon-guruh", String(TEST));
  const c2 = await yubor();
  C("🧪 гуруҳ рақами: учаласи ҳам синов гуруҳига", c2.join() === [TEST, TEST, TEST].join(), JSON.stringify(c2));
  await KV.delete("bonus:elon-guruh");
  const c3 = await yubor();
  C("🧪 калит ўчирилса — учаласи ҳам BIGANT гуруҳига", c3.length === 3 && c3.every((x) => x === B.BIGANT_GURUH), JSON.stringify(c3));
}

Date.now = aslNow;
console.log(`\n═══ ${ok}/${jami} ═══`);

// src/app/bonusapi.js — 🎁 Бонуслар API (Mini App). Қоидалар: src/bonus.js бошида.
//
//   GET  /bonus                  ҳолат: қайси тугма очиқ, ходимлар рўйхати, бугунги ёзувлар, Excel даврлари
//   POST /bonus/ish              { tur: "b"|"t", qoshimcha: [ходим рақами…] } — танланганлар (ўзи автоматик ЭМАС), вақт СЕРВЕРДАН
//   POST /bonus/ragbat           { kimga: "h12" | "u700000043", matn } — BIGANT гуруҳига эълон
//   POST /bonus/excel            { davr: "2026-09-16" } — фақат Раҳбар ака; файл ботдан шахсий чатга келади
import * as B from "../bonus.js";
import { tg, tgFaylYubor } from "./tgapi.js";
import * as R from "./rollar.js";
import { toshkentdami, chegaragachaKm } from "../toshkent.js";

const KIRDIM_ESKI = 5 * 3600;   // интернетсиз босилган «Тошкентга кирдим» 5 соатгача қабул қилинади
const soatMatn =(unix) => { const m = B.toshkent(unix).min; return String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0"); };

const KUNIGA_RAGBAT = 30;                // бир одам бир кунда кўпи билан шунча рағбатлантириш ёзади
const hozir = () => Math.floor(Date.now() / 1000);

/* 🧪 Рағбат · огоҳлантириш · жарима эълони қаерга (Достон 2026-11-11: синов вақтида).
 * KV «bonus:elon-guruh»:  "ozi" — ЁЗГАН ОДАМНИНГ ўзига (бот билан шахсий чат: Раҳбар ака ёзса — Раҳбар акага);
 *                         "-100…" — ўша гуруҳга;  йўқ — BIGANT гуруҳига.
 * «Ишни бошлади/тугатди» бунга кирмайди — доим BIGANT'га.
 * BIGANT'га қайтариш: wrangler kv key delete "bonus:elon-guruh" --binding ACCESS_KV -c wrangler.app.toml --remote */
const ELON_GURUH_KALIT = "bonus:elon-guruh";
/** 🧪 Синов режими (Достон 2026-11-11): KV = "ozi" — хабар фақат ёзган одамга, БАЗАГА ҳам EXCEL'ГА ҳам ЁЗИЛМАЙДИ */
async function elonSinov(env) {
  try { return Boolean(env.ACCESS_KV) && String((await env.ACCESS_KV.get(ELON_GURUH_KALIT)) || "").trim() === "ozi"; }
  catch { return false; }
}
async function elonGuruh(env, uid) {
  const asl = Number(env.BONUS_BIGANT_GURUH || B.BIGANT_GURUH);
  try {
    const v = env.ACCESS_KV ? String((await env.ACCESS_KV.get(ELON_GURUH_KALIT)) || "").trim() : "";
    if (v === "ozi" && Number(uid) > 0) return Number(uid);
    return /^-\d{5,20}$/.test(v) ? Number(v) : asl;
  } catch { return asl; }
}

/** Рағбатлантириш кимга берилиши мумкин: ходимлар рўйхати + иловадаги одамлар (Шерик ва ҳ.к.)
 *  🚚 Достон 2026-10-12: ҲАЙДОВЧИ рўйхатда йўқ — унга рағбат ёзиб бўлмайди (ҳайдовчининг қўшимча
 *  иши расм ва «Тошкентга кирдим» орқали пулга ўтади, рағбат эса пул бермайди — чалкашлик чиқарди). */
function kimlarRoyxati(cfg) {
  // 🎁 Достон 2026-11-02: ҳайдовчига рағбат ЁЗИЛАДИ — бошқа ходимлар ёзади.
  // (12.10 да рўйхатдан олинган эди; 31.10 да Ходим05 Ходим11ни тополмай, рўйхатга
  //  «hodim12» деган такрор одам қўшиб қўйган — шундан кейин тузатилди.)
  // Ҳайдовчи ўзи рағбат ЫЗМАЙДИ — у қоида ўзгармади (POST да 403, tablar.js да саҳифа йўқ).
  const r = [...B.HODIMLAR, ...B.qoshilganlar()].filter((h) => !h.ketgan).map((h) => ({ k: "h" + h.id, nom: h.nom, izoh: h.bolim, ...(h.qoshilgan ? { qoshilgan: true, qoshdi: h.qoshdi } : {}) }));
  const hodimTglar = new Set(B.HODIMLAR.flatMap(B.hodimTgLari));
  const nomlar = new Set(B.HODIMLAR.map((h) => h.nom.toLowerCase()));
  for (const o of R.odamlar((cfg && cfg.ismlar) || {})) {
    if (hodimTglar.has(Number(o.id)) || nomlar.has(String(o.ism).toLowerCase())) continue;
    r.push({ k: "u" + o.id, nom: String(o.ism), izoh: "" });
  }
  return r.sort((a, b) => a.nom.localeCompare(b.nom, "ru"));
}

/** «Қўшилганлар тарихи»: ким, қачон қўшди ва (бўлса) ким, қачон ўчирди */
async function qoshilganTarix(env) {
  const sana = (u) => { if (!u) return ""; const t = B.toshkent(u); return `${t.sana.slice(8, 10)}.${t.sana.slice(5, 7)} ${soatMatn(u)}`; };
  try {
    const r = await env.DB.prepare("SELECT id, nom, tarif, qoshdi_ism, vaqt, ochirildi, ochirdi_ism, ochirildi_vaqt FROM bonus_hodim ORDER BY id DESC LIMIT 50").all();
    return (r.results || []).map((x) => ({
      id: B.QOSHILGAN_BOSH + Number(x.id), nom: x.nom, tarif: x.tarif,
      qoshdi: x.qoshdi_ism || "?", qachon: sana(x.vaqt),
      ochirildi: !!x.ochirildi, ochirdi: x.ochirdi_ism || "", ochirQachon: sana(x.ochirildi_vaqt),
    }));
  } catch { return []; }   // жадвал ҳали йўқ
}

/**
 * 🗑 Такрор рағбат эълонини ўчириш (Шерик 2026-09-24: Ходим15 бир ишни икки марта ёзди).
 * KV'га msg_id'лар қўйилади: wrangler kv key put "bonus:ragbat-ochir" "98994" --remote ...
 * Кейинги сўровда гуруҳдан ўчади, bonus_ragbat'дан ҳам (Excel'да икки марта чиқмасин), калит тозаланади.
 */
const RAGBAT_OCHIR_KALIT = "bonus:ragbat-ochir";
export async function ragbatTakrorOchir(env) {
  if (!env.DB || !env.ACCESS_KV) return;
  try {
    const q = await env.ACCESS_KV.get(RAGBAT_OCHIR_KALIT);
    if (!q) return;
    await env.ACCESS_KV.delete(RAGBAT_OCHIR_KALIT);
    const idlar = [...new Set(String(q).split(/[,\s]+/).map(Number).filter((n) => Number.isInteger(n) && n > 0))];
    const guruh = Number(env.BONUS_BIGANT_GURUH || B.BIGANT_GURUH);
    const natija = [];
    for (const msgId of idlar) {
      // Фақат ботнинг ўз рағбат эълони — bonus_ragbat'да бўлмаса тегмаймиз
      const bor = await env.DB.prepare("SELECT COUNT(*) AS n FROM bonus_ragbat WHERE msg_id = ?").bind(msgId).first("n");
      if (!Number(bor)) { natija.push(`${msgId}: рағбат эмас`); continue; }
      const t = await tg(env.BOT_TOKEN, "deleteMessage", { chat_id: guruh, message_id: msgId }, { bonus: true }).catch(() => null);
      await env.DB.prepare("DELETE FROM bonus_ragbat WHERE msg_id = ?").bind(msgId).run();
      natija.push(`${msgId}: ${t && t.ok ? "ўчди" : "гуруҳда ўчмади (" + (t && t.description) + "), базадан ўчди"}`);
    }
    await env.ACCESS_KV.put(RAGBAT_OCHIR_KALIT + ":natija", JSON.stringify({ natija, vaqt: hozir() }));
    console.log("рағбат такрори:", natija.join("; "));
  } catch (e) { console.error("рағбат такрори:", e && e.stack || e); }
}

/**
 * ✏️ Гуруҳдаги бонус эълонини қўлда тузатиш (Шерик 2026-09-24: Ходим15 «ишни тугатди»ни рағбат орқали ёзган).
 * KV: wrangler kv key put "bonus:guruh-tahrir" '[{"m":98993,"t":"Ходим15 Ишни тугатди — 18:30 ✅"}]' --remote ...
 * Кейинги сўровда editMessageText, калит тозаланади. Бот фақат ЎЗ хабарини таҳрирлай олади.
 * 🅱 Достон 2026-10-21: `"p":"HTML"` берилса қалин ёзув (<b>) ҳам ишлайди — эски эълонларни
 *    янги кўринишга ўтказганда ҳарфлар айнан янгиларидек бўлсин.
 */
const GURUH_TAHRIR_KALIT = "bonus:guruh-tahrir";
export async function guruhTahrir(env) {
  if (!env.ACCESS_KV) return;
  try {
    const q = await env.ACCESS_KV.get(GURUH_TAHRIR_KALIT);
    if (!q) return;
    await env.ACCESS_KV.delete(GURUH_TAHRIR_KALIT);
    const guruh = Number(env.BONUS_BIGANT_GURUH || B.BIGANT_GURUH);
    const natija = [];
    for (const { m, t, p } of [].concat(JSON.parse(q))) {
      const matn = String(t || "").trim();
      if (!Number.isInteger(Number(m)) || !matn) { natija.push(`${m}: нотўғри`); continue; }
      const r = await tg(env.BOT_TOKEN, "editMessageText",
        { chat_id: guruh, message_id: Number(m), text: matn, ...(p === "HTML" ? { parse_mode: "HTML" } : {}) },
        { bonus: true }).catch(() => null);
      natija.push(`${m}: ${r && r.ok ? "ўзгарди" : "ўзгармади (" + (r && r.description) + ")"}`);
    }
    await env.ACCESS_KV.put(GURUH_TAHRIR_KALIT + ":natija", JSON.stringify({ natija, vaqt: hozir() }));
    console.log("гуруҳ таҳрири:", natija.join("; "));
  } catch (e) { console.error("гуруҳ таҳрири:", e && e.stack || e); }
}

/**
 * 📤 Қўлланмани ҲАР БИР ХОДИМНИНГ ШАХСИЙ чатига юбориш (Достон 2026-09-30).
 * Гуруҳга эмас — ҳар кимга алоҳида. KV орқали ишга тушади:
 *   wrangler kv key put "bonus:qollanma-yubor" '{"matn":"…"}' --remote --binding ACCESS_KV -c wrangler.app.toml
 * Кейинги сўровда юборилади, натижа "bonus:qollanma-yubor:natija" га ёзилади, калит тозаланади.
 */
const QOLLANMA_KALIT = "bonus:qollanma-yubor";
export async function qollanmaYubor(env) {
  if (!env.ACCESS_KV) return;
  let q;
  try { q = await env.ACCESS_KV.get(QOLLANMA_KALIT); } catch { return; }
  if (!q) return;
  try {
    await env.ACCESS_KV.delete(QOLLANMA_KALIT);
    const f = JSON.parse(q);
    const matn = String(f.matn || "").slice(0, 3500);
    if (!matn) return;
    await B.hodimlarYukla(env);
    const yuborildi = [], yiqildi = [];
    // f.kimga — фақат шу Telegram id ларга юборилади (бўлмаса — ҳаммага)
    const faqat = Array.isArray(f.kimga) ? f.kimga.map(Number) : null;
    for (const h of B.HODIMLAR) {
      if (h.ketgan || h.sinov) continue;
      for (const uid of B.hodimTgLari(h)) {
        if (faqat && !faqat.includes(Number(uid))) continue;
        const r = await tg(env.BOT_TOKEN, "sendMessage",
          { chat_id: uid, text: matn, parse_mode: "HTML", disable_web_page_preview: false }).catch(() => null);
        if (r && r.ok) yuborildi.push(h.nom);
        else yiqildi.push(`${h.nom} (${uid}): ${r && r.description || "жавоб йўқ"}`);
      }
    }
    await env.ACCESS_KV.put(QOLLANMA_KALIT + ":natija",
      JSON.stringify({ vaqt: hozir(), yuborildi, yiqildi }, null, 1));
    console.log("қўлланма юборилди:", yuborildi.length, "| йиқилди:", yiqildi.length);
  } catch (e) { console.error("қўлланма юбориш:", e && e.stack || e); }
}

/** 💸 Жарима вариантлари (ўчирилмаганлари), номи бўйича */
async function jarimaTurlar(env) {
  try {
    const r = await env.DB.prepare("SELECT id, nom, narx FROM bonus_jarima_tur WHERE ochirildi = 0 ORDER BY nom").all();
    return (r.results || []).map((t) => ({ id: Number(t.id), nom: t.nom, narx: Number(t.narx) }));
  } catch { return []; }   // жадвал ҳали йўқ
}

export async function bonusApi(request, env, x) {
  const { yol, usul, uid, ism, cfg, tana, json, xato, natija } = x;
  // 🧪 Синов режими (Достон 2026-09-17: «test учун ҳозир кўрсатиб қўй, босиб кўрай»):
  // фақат тестерлар (Достон, Шерик) «Иш вақти» тугмаларини истаган пайт боса олади.
  // Иш вақти ичида босилган ёзув барибир ҲИСОБЛАНМАЙДИ (src/bonus.js ishHisob) — пулга таъсири йўқ.
  // Достон 2026-09-18: ходимлар ишлата бошлади — тугмалар ҲАММАГА фақат вақтида («Ишни бошладим» 05:00–09:00,
  // «Ишни тугатдим» 18:01 дан). Синов режими (истаган пайт босиш) фақат синовларда: env.BONUS_SINOV = "1".
  const sinov = Boolean(x.tester) && Boolean(env && env.BONUS_SINOV === "1");
  const men = B.hodimTg(uid);
  // Шерик 2026-09-24: рағбатлантиришда ЎЗИНИ танлаб бўлмайди — рўйхатда кўринмайди, сервер ҳам рад этади
  const ozimi = (k) => k === "u" + uid || Boolean(men && k === "h" + men.id);
  const ragbatRoyxat = () => kimlarRoyxati(cfg).filter((o) => !ozimi(o.k));
  // Достон 2026-09-17: тестер (Достон, Шерик) қайси бўлимда турса — ФАҚАТ ўша ролнинг функциялари:
  //   haydovchi → «Тошкентга кирдим»; xodim → «Иш вақти»; superadmin → «Иш вақти» + Excel. Рағбат — ҳаммада.
  // korRol фақат тестерда келади (api.js); «фойдаланувчи кўради» режимида x.tester=false бўлса ҳам бўлим сақланади
  const kor = x.korRol || null;   // тестер қайси бўлимни кўраётгани (синовдан қатъи назар)
  const excelMumkin = B.EXCEL_EGASI.includes(Number(uid)) && (!kor || kor === "superadmin");
  // 👤 Шахсий Excel (Достон 2026-09-29): ҳар бир ходим ЎЗ бонусини юклай олади (фақат жорий давр).
  // Ходим01 ака — Telegram'и йўқ ходимларникини ҳам; Раҳбар ака — ҳамманикини.
  const tgsiz = (h) => !B.hodimTgLari(h).length;
  const barchaHodim = () => [...B.HODIMLAR, ...B.qoshilganlar()].filter((h) => !h.ketgan && !h.sinov);
  // 🧪 Тестер (Достон, Шерик) қайси рол бўлимида турса ҳам ходимларнинг шахсий Excel'ини
  // юклаб, ичини текшира олади (Достон 2026-09-29: «реал текшир»). Пулга таъсири йўқ — фақат ўқиш.
  const tester = Boolean(x.tester);
  const shaxsiyRuxsat = (h) => {
    if (!h) return false;
    if (excelMumkin || tester) return true;            // Раҳбар ака ва тестерлар — ҳамма
    if (men && h.id === men.id) return true;           // ўзиники
    return Boolean(men && men.tgsizExcel && tgsiz(h)); // Ходим01 ака — Telegram'и йўқлар
  };
  const excelKimlar = () => {
    if (!men && !excelMumkin && !tester) return [];
    const r = excelMumkin || tester ? barchaHodim() : (men && men.tgsizExcel ? barchaHodim().filter(tgsiz) : []);
    return r.filter((h) => !men || h.id !== men.id).map((h) => ({ id: h.id, nom: h.nom }))
      .sort((a, b) => a.nom.localeCompare(b.nom, "ru"));
  };
  // ⚠️ Огоҳлантириш ва 💸 жарима (Достон 2026-11-11): фақат Раҳбар ака, Админ ака, Ходим02, Ходим15 ака + Достон.
  // Шерикга ЁПИҚ (тестер бўлса ҳам).
  const ogohMumkin = B.OGOH_YOZADI.includes(Number(uid)) || B.OGOH_SINOVCHI.includes(Number(uid));
  const vaqt = hozir();
  if (env.DB) await B.hodimlarYukla(env);

  /** Синов режими учун: шу одам (тугмани босган) охирги марта қайси турни ёзган */
  async function oxirgiTur() {
    if (!sinov || !env.DB) return null;
    const y = await env.DB.prepare("SELECT tur FROM bonus_ish WHERE ochirildi = 0 AND kim = ? ORDER BY vaqt DESC, id DESC LIMIT 1").bind(uid).first();
    return y ? y.tur : null;
  }
  /** Ҳозир қайси битта тугма: вақт бўйича; синов режимида (вақт ёпиқ бўлса) — навбатма-навбат */
  const tugmaOl = async () => B.ishTugmasi(vaqt) || (sinov ? ((await oxirgiTur()) === "b" ? "t" : "b") : null);

  /** Базадаги ЭНГ ЭРТА бонус ёзуви — ундан олдинги даврлар бўш (бот 2026-09-17 дан ёза бошлаган) */
  async function engErta() {
    if (!env.DB) return null;
    try {
      const r = await env.DB.prepare(
        "SELECT MIN(v) v FROM (SELECT MIN(vaqt) v FROM bonus_xabar UNION ALL SELECT MIN(vaqt) FROM bonus_ish)").first();
      return r && r.v ? Number(r.v) : null;
    } catch { return null; }
  }

  // ---------- ҳолат ----------
  if (yol === "/bonus" && usul === "GET") {
    let bugun = [];
    if (env.DB) {
      const r = await env.DB.prepare(
        "SELECT id, hodim, tur, vaqt, kim, kim_ism FROM bonus_ish WHERE ochirildi = 0 AND vaqt >= ? AND (kim = ?" +
        (men ? " OR hodim = ?" : "") + ") ORDER BY vaqt DESC LIMIT 60",
      ).bind(vaqt - 20 * 3600, uid, ...(men ? [men.id] : [])).all();
      bugun = (r.results || []).map((y) => {
        const h = B.hodimOl(y.hodim);
        const t = B.toshkent(y.vaqt);
        return { id: y.id, hodim: h ? h.nom : "?", tur: y.tur, vaqt: String(Math.floor(t.min / 60)).padStart(2, "0") + ":" + String(t.min % 60).padStart(2, "0"),
                 kim: y.kim_ism || "", meniki: Number(y.kim) === Number(uid) };
      });
    }
    // 📍 «Тошкентга кирдим»: ҳайдовчига кечқурун (18:01–05:00) кўринади; шу иш кунида аввал босилгани
    const haydovchi = kor ? kor === "haydovchi" : Boolean(men && men.mashina);
    let kirdim = null;
    if (haydovchi) {
      let oldin = null;
      if (env.DB) {
        try {
          const kun = B.ishKuni(vaqt, "t");
          const r = await env.DB.prepare("SELECT vaqt, km FROM bonus_kirish WHERE kim = ? AND vaqt >= ? ORDER BY vaqt").bind(uid, vaqt - 30 * 3600).all();
          const y = (r.results || []).find((k) => B.ishKuni(k.vaqt, "t") === kun && B.ishTugmasi(k.vaqt) === "t");
          if (y) oldin = { vaqt: soatMatn(y.vaqt), km: y.km };
        } catch { /* жадвал ҳали йўқ */ }
      }
      // Ходим15 ака (2026-10-13): kirdimYoq — тугма умуман берилмайди
      if (!(men && men.kirdimYoq)) kirdim = { korinadi: B.ishTugmasi(vaqt) === "t" || sinov, oldin };
    }
    const erta = await engErta();
    return json({
      ok: true, hozir: vaqt, tugma: await tugmaOl(), sinov, dbBor: !!env.DB,
      men: men ? { id: men.id, nom: men.nom, bolim: men.bolim, tarif: men.tarif } : null,
      // Ҳайдовчининг қўшимча соати расмдан ҳисобланади — унга «Иш вақти» кўрсатилмайди, рўйхатда ҳам йўқ
      haydovchi, kirdim, ishYozadi: true,
      hodimlar: [...B.HODIMLAR, ...B.qoshilganlar()].filter((h) => !h.ketgan)
        .map((h) => ({ id: h.id, nom: h.nom, bolim: h.bolim, ...(h.mashina ? { mashina: h.mashina } : {}), ...(h.qoshilgan ? { qoshilgan: true, qoshdi: h.qoshdi } : {}) })),
      // Достон 2026-09-18: ҳайдовчидан бошқа ҳар ким рўйхатга янги одам қўшади / ўзи қўшганини ўчиради
      qoshaOladi: !haydovchi,
      // Ким қўшди / ким ўчирди — тарих (охирги 50 та)
      qoshilganTarix: haydovchi || !env.DB ? [] : await qoshilganTarix(env),
      kimlar: ragbatRoyxat(),
      ogoh: ogohMumkin,
      // огоҳлантириш ва жарима рўйхатида ЁЗАЁТГАН ОДАМНИНГ ЎЗИ ҲАМ бор (Достон 2026-11-11: «meni ismim yoq»)
      ogohKimlar: ogohMumkin ? kimlarRoyxati(cfg) : [],
      // 💸 жарима вариантлари — фақат шу 4 кишига
      jarimaTurlar: ogohMumkin && env.DB ? await jarimaTurlar(env) : [],
      bugun,
      excel: excelMumkin,
      // 👤 ўз бонусини Excel'да юклаш: бонус рўйхатидаги ҳар бир ходим (жорий давр)
      // 🧪 Достон 2026-10-16: тестер (ҳайдовчи/ходим ролида турганда ҳам) бўлимни КЎРАДИ —
      // аввал кўринмасди, «Excel юклаш йўқ» деб ўйлаб қолинган. Ўз тугмаси — menRoyxatda.
      excelMen: Boolean(men) || tester,
      menRoyxatda: Boolean(men),
      excelKimlar: excelKimlar(),
      // Достон 2026-09-29: ходимга ҳам Раҳбар акадагидек 2 та тугма — «1 ойлик» ва «бугунгача».
      // Раҳбар ака 6 та даврни кўради, ходим — жорий ва ўтган 2 давр (Достон 2026-10-19:
      // эски 16.09–15.10 ни ҳам танлаб юклай олсин — ҳисоб-китоб тугаган).
      // bor: шу даврда умуман маълумот борми (бўш файл юкламасин)
      davrlar: (excelMumkin || men || tester)
        ? B.davrlar(vaqt, excelMumkin ? 6 : 3).map((d, i) => ({ bosh: d.bosh, nom: d.nom, joriy: i === 0,
            // 🔒 Достон 2026-10-16: ҳисоб-китоб кунлари жорий даврни юклаб бўлмайди
            yopiq: B.davrYopiq(d.bosh, vaqt),
            bor: erta === null || d.oxirUnix >= erta }))
        : [],
    });
  }

  if (!env.DB) return xato("База уланмаган", 500);

  // ---------- ⏰ ишни бошладим / тугатдим ----------
  if (yol === "/bonus/ish" && usul === "POST") {
    if (kor && !["xodim", "superadmin", "brigadir", "haydovchi"].includes(kor)) return xato("«Иш вақти» бу бўлимда йўқ", 403);
    // Ходимлар рўйхатида йўқ сотувчи фақат рағбат ёзади (Достон 2026-09-18)
    if (!kor && !men && !x.superadmin && !sinov) return xato("«Иш вақти» фақат ходимлар учун", 403);
    const { m: f } = await tana(request);
    const tur = f && f.tur;
    if (tur !== "b" && tur !== "t") return xato("tur: b ёки t");
    if ((await tugmaOl()) !== tur) {
      return xato(tur === "b" ? "«Ишни бошладим» фақат 05:00–09:00 да очиқ" : "«Ишни тугатдим» фақат 18:01 дан эрталаб 05:00 гача очиқ", 409);
    }
    // Достон 2026-09-17: тугмани босган одам АВТОМАТИК ҚЎШИЛМАЙДИ — ҳамма (керак бўлса ўзи ҳам)
    // рўйхатдан танланади. Telegram'и йўқ ишчини киритиб берган одамга беихтиёр бонус ёзилмасин.
    // 🚚 Достон 2026-11-07: ҳайдовчи ҳеч кимни танламай «Ишни тугатдим»ни босса — ФАҚАТ ўзи;
    // танласа — ФАҚАТ танланганлар (ўзи ҳам ишлаган бўлса — ўзини ҳам танлайди). Сабаб: ҳайдовчи 18:00 да
    // тугатиб, 19:00 да грузчикларни ёзса — унга 1 соат ортиқча ёзилиб қолмасин. Бошқа ходимларда — аввалгидек.
    const sorandi = [...new Set((Array.isArray(f.qoshimcha) ? f.qoshimcha : []).map(Number))];
    const tanlangan = (!sorandi.length && men && men.mashina ? [men.id] : sorandi)
      .filter((id) => B.hodimOl(id) && !B.hodimOl(id).ketgan).slice(0, 100);
    if (!tanlangan.length) return xato("Ходимларни танланг");
    // 🚚 Достон 2026-10-13: ҳайдовчига «Ишни бошладим» ЁЗИЛМАЙДИ — эрталабки вақти
    // гуруҳга (логистика ёки юк топшириш) ташлаган расмидан олинади.
    if (tur === "b") {
      const hay = tanlangan.filter((id) => B.hodimOl(id).mashina).map((id) => B.hodimOl(id).nom);
      if (hay.length) return xato(`Ҳайдовчига «Ишни бошладим» ёзилмайди — эрталабки вақт гуруҳдаги расмдан олинади (${hay.join(", ")})`, 403);
    }
    // «Бошладим» бир марта: шу иш кунида аллақачон бошлаган ходим қайта ёзилмайди (эрталаб — энг эртаси
    // ҳисобланади, қайта ёзиш ҳеч нимани ўзгартирмайди). «Тугатдим» — қайта ёзилади, энг кечи олинади.
    let kimlar = tanlangan, oldin = [];
    if (tur === "b" && !sinov) {
      const kun = B.ishKuni(vaqt, "b");
      const r = await env.DB.prepare(
        `SELECT hodim, vaqt FROM bonus_ish WHERE ochirildi = 0 AND tur = 'b' AND vaqt >= ? AND hodim IN (${tanlangan.map(() => "?").join(",")})`,
      ).bind(vaqt - 30 * 3600, ...tanlangan).all();
      const bor = new Set((r.results || []).filter((y) => B.ishKuni(y.vaqt, "b") === kun).map((y) => Number(y.hodim)));
      oldin = tanlangan.filter((id) => bor.has(id)).map((id) => B.hodimOl(id).nom);
      kimlar = tanlangan.filter((id) => !bor.has(id));
      if (!kimlar.length) return xato(`Аллақачон ёзилган: ${oldin.join(", ")}`, 409);
    }
    // 📝 Изоҳ (Достон 2026-09-30): «нима ишни бошладим / тугатдим» — ихтиёрий, Excel'да алоҳида устун
    const izoh = String((f && f.izoh) || "").replace(/\s+/g, " ").trim().slice(0, 200) || null;
    await env.DB.batch(kimlar.map((id) => env.DB.prepare(
      "INSERT INTO bonus_ish (hodim, tur, vaqt, kim, kim_ism, izoh) VALUES (?,?,?,?,?,?)",
    ).bind(id, tur, vaqt, uid, String(ism || "").slice(0, 60), izoh)));
    // 📢 BIGANT гуруҳига (Достон + хўжайин, 2026-09-21): «Достон — 08:30 да ишни бошлади»
    const nomlar = kimlar.map((id) => B.hodimOl(id).nom);
    // Шерик 2026-09-24: «⏰ ИШПАЙ» сарлавҳаси, ҳар исм алоҳида қаторда (src/bonus.js ishXabar)
    const guruhIsh = Number(env.BONUS_BIGANT_GURUH || B.BIGANT_GURUH);
    const te = await tg(env.BOT_TOKEN, "sendMessage", { chat_id: guruhIsh, text: B.ishXabar(tur, soatMatn(vaqt), nomlar, izoh, men ? men.nom : ism), parse_mode: "HTML" }, { bonus: true }).catch(() => null);
    return json({ ok: true, tur, vaqt, kimlar: nomlar, oldin, izoh, guruhga: Boolean(te && te.ok) });
  }

  let mm;
  // ↩️ «Бекор қилиш» олиб ташланди (Шерик 2026-09-24: «бу керак эмас»)

  // ---------- 📍 «Тошкентга кирдим» (ҳайдовчи) ----------
  // Достон 2026-09-17: вилоятдан қайтган ҳайдовчи Тошкентга кирганда босади. Вақт — сервер соати билан тузатилган, жойлашув —
  // телефон GPS'идан (бир марта). Тошкентдан ташқарида босилса — рад; ичида — чегарадан неча км экани ёзилади.
  if (yol === "/bonus/kirdim" && usul === "POST") {
    if (kor && kor !== "haydovchi") return xato("«Тошкентга кирдим» — фақат «Ҳайдовчи» бўлимида", 403);
    if (!(men && men.mashina) && !sinov) return xato("Бу тугма фақат ҳайдовчилар учун", 403);
    if (men && men.kirdimYoq) return xato("«Тошкентга кирдим» сизга ёпиқ", 403);
    const { m: f } = await tana(request);
    // Интернетсиз босилган бўлса (Достон 2026-09-17): БОСИЛГАН пайт ҳисобланади. Телефон соати сурилган
    // бўлиши мумкин — юбориш пайтидаги телефон соатини сервер соати билан солиштириб тузатамиз.
    let bosildi = vaqt;
    const bMs = Number(f && f.bosildi), tMs = Number(f && f.telefon);
    if (Number.isFinite(bMs) && Number.isFinite(tMs) && bMs > 0 && tMs > 0 && bMs <= tMs) {
      bosildi = Math.min(vaqt, Math.floor((bMs + (vaqt * 1000 - tMs)) / 1000));
      if (vaqt - bosildi > KIRDIM_ESKI) return xato("❌ Рад этилди — тугма 5 соатдан олдин босилган, ҳисобланмайди", 409);
      // Чуқур текширув 2026-09-21: эрталаб (05:00 дан кейин) «кечаси босгандим» деб орқага сурилган вақт юбориб
      // кечқурунги соат олиб бўлмасин — интернетсиз босилгани фақат ҳали тун бўлса қабул қилинади
      if (bosildi < vaqt - 60 && B.ishTugmasi(vaqt) !== "t" && !sinov) return xato("❌ Рад этилди — интернетсиз босилган вақт эрталаб 05:00 дан кейин қабул қилинмайди", 409);
    }
    if (B.ishTugmasi(bosildi) !== "t" && !sinov) return xato("«Тошкентга кирдим» фақат 18:01 дан эрталаб 05:00 гача", 409);
    const lat = Number(f && f.lat), lon = Number(f && f.lon), aniqlik = Number(f && f.aniqlik);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180 || (lat === 0 && lon === 0)) {
      return xato("📍 Жойлашув олинмади — GPS'ни ёқиб, қайта босинг");
    }
    const km = Math.round(chegaragachaKm(lat, lon) * 10) / 10;
    if (!toshkentdami(lat, lon)) {
      return xato(`❌ Рад этилди — сиз ҳали Тошкентга кирмагансиз (чегарагача ${String(km).replace(".", ",")} км)`, 409);
    }
    await env.DB.prepare("INSERT INTO bonus_kirish (hodim, vaqt, lat, lon, aniqlik, km, kim) VALUES (?,?,?,?,?,?,?)")
      .bind(men ? men.id : 0, bosildi, lat, lon, Number.isFinite(aniqlik) ? aniqlik : null, km, uid).run();
    return json({ ok: true, vaqt: soatMatn(bosildi), km });
  }

  // ---------- 👥 рўйхатга янги одам қўшиш / ўчириш (ҳайдовчидан бошқа ҳамма) ----------
  const haydovchiKor = kor ? kor === "haydovchi" : Boolean(men && men.mashina);
  if (yol === "/bonus/hodim" && usul === "POST") {
    if (haydovchiKor) return xato("Ҳайдовчи рўйхатга одам қўша олмайди", 403);
    const { m: f } = await tana(request);
    const nom = String((f && f.nom) || "").replace(/\s+/g, " ").trim();
    const tarif = Number(f && f.tarif);
    if (nom.length < 2 || nom.length > 40) return xato("Исмни ёзинг (2–40 ҳарф)");
    if (![35000, 40000].includes(tarif)) return xato("Тарифни танланг: 35 000 ёки 40 000");
    // Такрор: исм бир хил, ёки янги исм ичида рўйхатдагининг ҳамма сўзи бор
    // («Hodim05 aka gazel» → «Ходим05 ака») — Достон 2026-10-19
    const band = [...B.HODIMLAR, ...B.qoshilganlar()].find((h) => !h.ketgan
      && (B.ismTeng(h.nom, nom) || B.ismIchida(h.nom, nom)));
    if (band) return xato(`«${band.nom}» рўйхатда бор — уни танланг`, 409);
    const soni = await env.DB.prepare("SELECT COUNT(*) AS n FROM bonus_hodim WHERE qoshdi = ? AND vaqt >= ?").bind(uid, vaqt - 86400).first("n");
    if (Number(soni) >= 20) return xato("Бугун жуда кўп қўшдингиз — эртага давом этинг", 429);
    const r = await env.DB.prepare("INSERT INTO bonus_hodim (nom, tarif, qoshdi, qoshdi_ism, vaqt) VALUES (?,?,?,?,?)")
      .bind(nom, tarif, uid, String(ism || "").slice(0, 60), vaqt).run();
    const id = B.QOSHILGAN_BOSH + Number(r.meta && r.meta.last_row_id);
    return json({ ok: true, id, nom, tarif });
  }
  if ((mm = yol.match(/^\/bonus\/hodim\/(\d{1,9})\/ochir$/)) && usul === "POST") {
    if (haydovchiKor) return xato("Ҳайдовчи рўйхатдан одам ўчира олмайди", 403);
    const id = Number(mm[1]);
    if (id <= B.QOSHILGAN_BOSH) return xato("Асосий рўйхатдаги ходимни фақат Достон ўчиради", 403);
    const y = await env.DB.prepare("SELECT id, ochirildi FROM bonus_hodim WHERE id = ?").bind(id - B.QOSHILGAN_BOSH).first();
    if (!y || y.ochirildi) return xato("Топилмади", 404);
    await env.DB.prepare("UPDATE bonus_hodim SET ochirildi = 1, ochirdi = ?, ochirdi_ism = ?, ochirildi_vaqt = ? WHERE id = ?")
      .bind(uid, String(ism || "").slice(0, 60), vaqt, y.id).run();
    return json({ ok: true });
  }

  // ---------- 🎁 рағбатлантириш ----------
  if (yol === "/bonus/ragbat" && usul === "POST") {
    if (men && men.ragbatYoq) return xato("Рағбатлантириш сизга ёпиқ", 403);
    // 🚚 Достон 2026-10-12 (2026-11-02 да тасдиқланди): ҳайдовчи рағбат ЁЗМАЙДИ
    // (саҳифаси ҳам кўринмайди — tablar.js). Лекин УНГА ёзиш МУМКИН — kimlarRoyxati да бор.
    // Тестер истисно: у бошқа бўлимларни синаш учун ёзади.
    if (kor === "haydovchi" || (!x.tester && men && men.mashina)) return xato("Ҳайдовчи рағбатлантириш ёзмайди", 403);
    const { m: f } = await tana(request);
    const matn = String((f && f.matn) || "").replace(/\s+\n/g, "\n").trim();
    if (matn.length < 3) return xato("Нима иш қилганини ёзинг");
    if (matn.length > 1000) return xato("Матн жуда узун (1000 белгидан ошмасин)");
    // Достон 2026-09-17: бир нечта одамни танлаш мумкин — ҳар бирига алоҳида ёзув (Excel'да алоҳида қатор),
    // гуруҳга эса БИТТА эълон. Эски шакл (битта сатр) ҳам қабул қилинади.
    const kalitlar = [...new Set((Array.isArray(f && f.kimga) ? f.kimga : [f && f.kimga]).map((k) => String(k || "")).filter(Boolean))].slice(0, 50);
    if (kalitlar.some(ozimi)) return xato("Ўзингизни рағбатлантира олмайсиз — бошқа одамни танланг", 403);
    const royxat = ragbatRoyxat();
    const kimlar = kalitlar.map((k) => royxat.find((o) => o.k === k)).filter(Boolean);
    if (!kalitlar.length || kimlar.length !== kalitlar.length) return xato("Кимга эканини рўйхатдан танланг");
    const bugunBosh = vaqt - (B.toshkent(vaqt).sek);
    // Чеклов — эълонлар сони бўйича (бир эълонда бир нечта одам бўлиши мумкин)
    const soni = await env.DB.prepare("SELECT COUNT(DISTINCT vaqt) AS n FROM bonus_ragbat WHERE kim = ? AND vaqt >= ?").bind(uid, bugunBosh).first("n");
    if (Number(soni) >= KUNIGA_RAGBAT) return xato("Бугун жуда кўп ёздингиз — эртага давом этинг", 429);
    const yozdi = String(ism || "").slice(0, 60);
    const sinovE = await elonSinov(env);   // 🧪 синовда базага ёзилмайди
    if (!sinovE) await env.DB.batch(kimlar.map((kim) => {
      const hodimId = kim.k[0] === "h" ? Number(kim.k.slice(1)) : null;
      const hodim = hodimId ? B.hodimOl(hodimId) : null;
      const kimgaUid = kim.k[0] === "u" ? Number(kim.k.slice(1)) : (hodim && hodim.tg) || null;
      return env.DB.prepare(
        "INSERT INTO bonus_ragbat (kimga, kimga_hodim, kimga_uid, matn, kim, kim_ism, vaqt) VALUES (?,?,?,?,?,?,?)",
      ).bind(kim.nom, hodimId, kimgaUid, matn, uid, yozdi, vaqt);
    }));
    const nomlar = kimlar.map((k) => k.nom).join(", ");
    // Гуруҳга эълон — «🎁 РАҒБАТЛАНТИРИШ», кимга — рўйхат (src/bonus.js ragbatXabar; матн escape қилинади).
    // Узунлиги чекланган: матн ≤ 1000, ≤ 50 исм — 4096 дан ошмайди (HTML'ни кесиш тегни бузарди).
    const guruh = await elonGuruh(env, uid);
    const t = await tg(env.BOT_TOKEN, "sendMessage", {
      chat_id: guruh, text: B.ragbatXabar(yozdi, kimlar.map((k) => k.nom), matn), parse_mode: "HTML",
    }, { bonus: true }).catch(() => null);
    const msgId = t && t.ok && t.result ? t.result.message_id : null;
    if (msgId && !sinovE) await env.DB.prepare("UPDATE bonus_ragbat SET msg_id = ? WHERE kim = ? AND vaqt = ?").bind(msgId, uid, vaqt).run();
    return json({ ok: true, kimga: nomlar, soni: kimlar.length, guruhga: !!msgId, ...(sinovE ? { sinov: true } : {}) });
  }

  // ---------- ⚠️ огоҳлантириш (Достон 2026-11-11) — рағбатдек, фақат 4 киши ёзади ----------
  if (yol === "/bonus/ogoh" && usul === "POST") {
    if (!ogohMumkin) return xato("Огоҳлантириш сизга ёпиқ", 403);
    const { m: f } = await tana(request);
    const matn = String((f && f.matn) || "").replace(/\s+\n/g, "\n").trim();
    if (matn.length < 3) return xato("Огоҳлантириш матнини ёзинг");
    if (matn.length > 1000) return xato("Матн жуда узун (1000 белгидан ошмасин)");
    const kalitlar = [...new Set((Array.isArray(f && f.kimga) ? f.kimga : [f && f.kimga]).map((k) => String(k || "")).filter(Boolean))].slice(0, 50);
    const royxat = kimlarRoyxati(cfg);   // Достон 2026-11-11: ўзи ҳам рўйхатда
    const kimlar = kalitlar.map((k) => royxat.find((o) => o.k === k)).filter(Boolean);
    if (!kalitlar.length || kimlar.length !== kalitlar.length) return xato("Кимга эканини рўйхатдан танланг");
    const bugunBosh = vaqt - (B.toshkent(vaqt).sek);
    const soni = await env.DB.prepare("SELECT COUNT(DISTINCT vaqt) AS n FROM bonus_ogoh WHERE kim = ? AND vaqt >= ?").bind(uid, bugunBosh).first("n");
    if (Number(soni) >= KUNIGA_RAGBAT) return xato("Бугун жуда кўп ёздингиз — эртага давом этинг", 429);
    const yozdi = String(ism || "").slice(0, 60);
    const sinovE = await elonSinov(env);   // 🧪 синовда базага ёзилмайди
    if (!sinovE) await env.DB.batch(kimlar.map((kim) => {
      const hodimId = kim.k[0] === "h" ? Number(kim.k.slice(1)) : null;
      const hodim = hodimId ? B.hodimOl(hodimId) : null;
      const kimgaUid = kim.k[0] === "u" ? Number(kim.k.slice(1)) : (hodim && hodim.tg) || null;
      return env.DB.prepare(
        "INSERT INTO bonus_ogoh (kimga, kimga_hodim, kimga_uid, matn, kim, kim_ism, vaqt) VALUES (?,?,?,?,?,?,?)",
      ).bind(kim.nom, hodimId, kimgaUid, matn, uid, yozdi, vaqt);
    }));
    const guruh = await elonGuruh(env, uid);
    const t = await tg(env.BOT_TOKEN, "sendMessage", {
      chat_id: guruh, text: B.ogohXabar(yozdi, kimlar.map((k) => k.nom), matn), parse_mode: "HTML",
    }, { bonus: true }).catch(() => null);
    const msgId = t && t.ok && t.result ? t.result.message_id : null;
    if (msgId && !sinovE) await env.DB.prepare("UPDATE bonus_ogoh SET msg_id = ? WHERE kim = ? AND vaqt = ?").bind(msgId, uid, vaqt).run();
    return json({ ok: true, kimga: kimlar.map((k) => k.nom).join(", "), soni: kimlar.length, guruhga: !!msgId, ...(sinovE ? { sinov: true } : {}) });
  }

  // ---------- 💸 жарима вариантини қўшиш (Достон 2026-11-11): «Ишга кеч қолиш — 50 000» ----------
  if (yol === "/bonus/jarima/tur" && usul === "POST") {
    if (!ogohMumkin) return xato("Жарима сизга ёпиқ", 403);
    const { m: f } = await tana(request);
    const nom = String((f && f.nom) || "").replace(/\s+/g, " ").trim();
    const narx = Math.round(Number(String((f && f.narx) ?? "").replace(/[\s,]/g, "")));
    if (nom.length < 3 || nom.length > 100) return xato("Жарима нималигини ёзинг (3–100 ҳарф)");
    if (!Number.isFinite(narx) || narx < 1000 || narx > 100_000_000) return xato("Нархини ёзинг (1 000 сўмдан кўп)");
    const bor = (await jarimaTurlar(env)).find((t) => B.ismTeng(t.nom, nom));
    if (bor) return xato(`«${bor.nom}» вариант бор — уни танланг`, 409);
    const soni = await env.DB.prepare("SELECT COUNT(*) AS n FROM bonus_jarima_tur WHERE kim = ? AND vaqt >= ?").bind(uid, vaqt - 86400).first("n");
    if (Number(soni) >= 30) return xato("Бугун жуда кўп қўшдингиз — эртага давом этинг", 429);
    const r = await env.DB.prepare("INSERT INTO bonus_jarima_tur (nom, narx, kim, kim_ism, vaqt) VALUES (?,?,?,?,?)")
      .bind(nom, narx, uid, String(ism || "").slice(0, 60), vaqt).run();
    return json({ ok: true, id: Number(r.meta && r.meta.last_row_id), nom, narx });
  }

  // ---------- 💸 жарима ёзиш: кимга (рўйхат) + вариант ----------
  if (yol === "/bonus/jarima" && usul === "POST") {
    if (!ogohMumkin) return xato("Жарима сизга ёпиқ", 403);
    const { m: f } = await tana(request);
    const tur = (await jarimaTurlar(env)).find((t) => t.id === Number(f && f.tur));
    if (!tur) return xato("Жарима вариантини танланг");
    const kalitlar = [...new Set((Array.isArray(f && f.kimga) ? f.kimga : [f && f.kimga]).map((k) => String(k || "")).filter(Boolean))].slice(0, 50);
    const royxat = kimlarRoyxati(cfg);   // Достон 2026-11-11: ўзи ҳам рўйхатда
    const kimlar = kalitlar.map((k) => royxat.find((o) => o.k === k)).filter(Boolean);
    if (!kalitlar.length || kimlar.length !== kalitlar.length) return xato("Кимга эканини рўйхатдан танланг");
    const bugunBosh = vaqt - (B.toshkent(vaqt).sek);
    const soni = await env.DB.prepare("SELECT COUNT(DISTINCT vaqt) AS n FROM bonus_jarima WHERE kim = ? AND vaqt >= ?").bind(uid, bugunBosh).first("n");
    if (Number(soni) >= KUNIGA_RAGBAT) return xato("Бугун жуда кўп ёздингиз — эртага давом этинг", 429);
    const yozdi = String(ism || "").slice(0, 60);
    const sinovE = await elonSinov(env);   // 🧪 синовда базага ёзилмайди
    if (!sinovE) await env.DB.batch(kimlar.map((kim) => {
      const hodimId = kim.k[0] === "h" ? Number(kim.k.slice(1)) : null;
      const hodim = hodimId ? B.hodimOl(hodimId) : null;
      const kimgaUid = kim.k[0] === "u" ? Number(kim.k.slice(1)) : (hodim && hodim.tg) || null;
      return env.DB.prepare(
        "INSERT INTO bonus_jarima (kimga, kimga_hodim, kimga_uid, tur_id, tur_nom, narx, kim, kim_ism, vaqt) VALUES (?,?,?,?,?,?,?,?,?)",
      ).bind(kim.nom, hodimId, kimgaUid, tur.id, tur.nom, tur.narx, uid, yozdi, vaqt);
    }));
    const guruh = await elonGuruh(env, uid);
    const t = await tg(env.BOT_TOKEN, "sendMessage", {
      chat_id: guruh, text: B.jarimaXabar(yozdi, kimlar.map((k) => k.nom), tur.nom, tur.narx), parse_mode: "HTML",
    }, { bonus: true }).catch(() => null);
    const msgId = t && t.ok && t.result ? t.result.message_id : null;
    if (msgId && !sinovE) await env.DB.prepare("UPDATE bonus_jarima SET msg_id = ? WHERE kim = ? AND vaqt = ?").bind(msgId, uid, vaqt).run();
    return json({ ok: true, kimga: kimlar.map((k) => k.nom).join(", "), soni: kimlar.length, tur: tur.nom, narx: tur.narx, guruhga: !!msgId, ...(sinovE ? { sinov: true } : {}) });
  }

  // ---------- 👤 Шахсий Excel: ўзиники (ёки Ходим01 ака / Раҳбар ака — бошқаники), ЖОРИЙ давр ----------
  if (yol === "/bonus/excel/shaxsiy" && usul === "POST") {
    const { m: f } = await tana(request);
    const kim = f && f.hodim != null && f.hodim !== "" ? B.hodimOl(Number(f.hodim)) : men;
    if (!kim) return xato("Сиз бонус рўйхатида йўқсиз", 403);
    if (!shaxsiyRuxsat(kim)) return xato("Бу ходимнинг Excel'ини юклай олмайсиз", 403);
    // Давр: берилмаса — жорий. Ходим фақат жорий ва ўтган ойни, Раҳбар ака 6 тани.
    const ruxsatDavrlar = B.davrlar(vaqt, excelMumkin ? 6 : 3).map((x) => x.bosh).filter((x) => !B.davrYopiq(x, vaqt));
    const bosh = f && f.davr ? String(f.davr) : ruxsatDavrlar[0];
    if (B.davrYopiq(bosh, vaqt)) return xato("Ҳозир ҳисоб-китоб даври — фақат тугаган давр (" + B.davrlar(vaqt, 2)[1].nom + ") юкланади", 403);
    if (!ruxsatDavrlar.includes(bosh)) return xato("Давр нотўғри", 400);
    const dv = B.davrBoshidan(bosh);
    const d = await B.davrMalumot(env, dv, vaqt);
    const bytes = await B.shaxsiyExcel(d, kim);
    const uz = (s) => s.slice(8, 10) + "." + s.slice(5, 7) + "." + s.slice(0, 4);
    const toliq = d.gacha >= dv.oxirUnix;
    const nom = `${kim.nom} — бонус (${uz(dv.bosh)}-${uz(toliq ? dv.oxir : B.toshkent(d.gacha).sana)}).xlsx`;
    const r = await tgFaylYubor(env.BOT_TOKEN, "sendDocument", "document",
      { chat_id: uid },
      { bytes, nom, mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    if (!r || !r.ok) return xato("Файл юборилмади — ботни очиб /start босинг ва қайта уриниб кўринг", 502);
    return json({ ok: true, nom, hodim: kim.nom });
  }

  // ---------- 📊 Excel (фақат Раҳбар ака) ----------
  if (yol === "/bonus/excel" && usul === "POST") {
    if (!excelMumkin) return xato("Excel'ни фақат Раҳбар ака юклай олади", 403);
    const { m: f } = await tana(request);
    const bosh = String((f && f.davr) || "");
    if (B.davrYopiq(bosh, vaqt)) return xato("Ҳозир ҳисоб-китоб даври — фақат тугаган давр (" + B.davrlar(vaqt, 2)[1].nom + ") юкланади", 403);
    if (!B.davrlar(vaqt, 6).some((d) => d.bosh === bosh)) return xato("Давр нотўғри");
    const dv = B.davrBoshidan(bosh);
    const d = await B.davrMalumot(env, dv, vaqt);
    const bytes = await B.bonusExcel(d);
    // Файл номи — аввалги файлдагидек; жорий ойда «… гача». Изоҳ (caption) ЙЎҚ (Достон 2026-09-17) — ҳаммаси Excel ичида.
    const uz = (s) => s.slice(8, 10) + "." + s.slice(5, 7) + "." + s.slice(0, 4);
    const toliq = d.gacha >= dv.oxirUnix;
    const nom = `Рағбатлантириш ва бонус (${uz(dv.bosh)}-${uz(toliq ? dv.oxir : B.toshkent(d.gacha).sana)}).xlsx`;
    const r = await tgFaylYubor(env.BOT_TOKEN, "sendDocument", "document",
      { chat_id: uid },
      { bytes, nom, mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    if (!r || !r.ok) return xato("Файл юборилмади — ботни очиб /start босинг ва қайта уриниб кўринг", 502);
    return json({ ok: true, nom });
  }

  // ---------- 🚚 ЮК ТОПШИРИШ — АЛОҲИДА Excel (фақат Раҳбар ака, Достон 2026-10-16) ----------
  // Ходимларнинг шахсий файлида «Юк топшириш» умуман йўқ — улар кўрмайди.
  if (yol === "/bonus/excel/topshirish" && usul === "POST") {
    if (!excelMumkin) return xato("Юк топшириш Excel'ини фақат Раҳбар ака юклай олади", 403);
    const { m: f } = await tana(request);
    const bosh = String((f && f.davr) || "");
    if (B.davrYopiq(bosh, vaqt)) return xato("Ҳозир ҳисоб-китоб даври — фақат тугаган давр (" + B.davrlar(vaqt, 2)[1].nom + ") юкланади", 403);
    if (!B.davrlar(vaqt, 6).some((d) => d.bosh === bosh)) return xato("Давр нотўғри");
    const dv = B.davrBoshidan(bosh);
    const d = await B.davrMalumot(env, dv, vaqt);
    const bytes = await B.topshirishExcel(d);
    const uz = (s) => s.slice(8, 10) + "." + s.slice(5, 7) + "." + s.slice(0, 4);
    const toliq = d.gacha >= dv.oxirUnix;
    const nom = `Юк топшириш бонуси (${uz(dv.bosh)}-${uz(toliq ? dv.oxir : B.toshkent(d.gacha).sana)}).xlsx`;
    const r = await tgFaylYubor(env.BOT_TOKEN, "sendDocument", "document",
      { chat_id: uid },
      { bytes, nom, mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    if (!r || !r.ok) return xato("Файл юборилмади — ботни очиб /start босинг ва қайта уриниб кўринг", 502);
    return json({ ok: true, nom });
  }

  void natija;
  return xato("топилмади", 404);
}

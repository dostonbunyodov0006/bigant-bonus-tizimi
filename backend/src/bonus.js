// src/bonus.js — 🎁 БОНУСЛАР: ишдан ташқари вақт, юк олиш/топшириш, рағбатлантириш.
//
// Қоидалар (Достон ва Раҳбар ака, 2026-09-16):
//   ⏰ Иш вақти (Mini App): 05:00–09:00 «Ишни бошладим», 18:01–05:00 «Ишни тугатдим».
//      Вақт = тугма БОСИЛГАН пайт. Бир кунда бир неча марта босилса — эрталаб ЭНГ
//      ЭРТА, кечқурун ЭНГ КЕЧ вақт олинади (икки марта ёзилмайди). «Қўшимча» —
//      рўйхатдан танланган ҳамкасбларга ҳам худди шу вақт ёзилади (Telegram'и
//      бўлмаса ҳам — рўйхат рақами орқали). Соатига ходимнинг тарифи (35/40/70 минг).
//      ҲАЙДОВЧИЛАР тугма босмайди — уларнинг қўшимча соати РАСМДАН (Достон 2026-09-17):
//      эрталаб — LOGISTIKA'даги ЭНГ ЭРТА расм → 09:00 гача; кечқурун — «Юк топшириш»даги
//      ЭНГ КЕЧ расм → 18:00 дан. Иловада ҳайдовчи учун босилган ёзув ҳисобланмайди (икки марта бўлмасин).
//   🚚 Юк олиш (LOGISTIKA) ва 📦 юк топшириш (Topshirilgan yuk): бонус КУН БЎЙИ ҳар юкка
//      (Достон 2026-09-17: «9:00–18:00 да ҳам, 9 дан олдин ҳам, 18 дан кейин ҳам»).
//      Иккаласида: бир йўла ташланган расмлар = 1 юк; изоҳда «2x» — шаҳардан
//      ташқари, бўлмаса (ёки «1x») — шаҳар ичи. Изоҳдаги исмга ҚАРАЛМАЙДИ —
//      бонус расмни ташлаган ҳайдовчига. Нарх машина тоифасига қараб.
//   🎁 Рағбатлантириш: ФАҚАТ Mini App'дан (гуруҳда қўлда ёзилгани олинмайди).
//      Суммани Раҳбар ака Excel'да ўзи ёзади.
//   📊 Excel: фақат Раҳбар ака; жорий давр (16-сана → бугун) ёки ўтган даврлар.
//
// Бу модул ботнинг бошқа бўлимларига ТЕГМАЙДИ: гуруҳдан фақат расмни жимгина
// ёзиб олади (ҳеч нимани «емайди», гуруҳга ҳеч нима юбормайди).
import { buildXlsx, S } from "./xlsxout.js";

/* ============================ СОЗЛАМАЛАР ============================ */
export const BIGANT_GURUH = -1009000000001;       // рағбатлантириш эълони шу ерга кетади
export const LOGISTIKA_GURUH = -1009000000002;    // юк олиш
export const TOPSHIRISH_GURUH = -5000000003;      // юк топшириш
/** Excel'ни фақат шулар юклай олади: Раҳбар ака, Достон (Достон 2026-09-16: «мени ҳам админ қилиб қўй») */
export const EXCEL_EGASI = [700000004, 700000005];

const TZ = 5 * 3600;                // Тошкент, UTC+5 (ёзги вақт йўқ)
const SOAT = 3600;
export const BOSHLASH_DAN = 5 * SOAT, BOSHLASH_GACHA = 9 * SOAT;   // «Ишни бошладим»: 05:00 ≤ t < 09:00
export const TUGATISH_DAN = 18 * SOAT + 60;                         // «Ишни тугатдим»: 18:01 дан …
export const TUGATISH_GACHA = 5 * SOAT;                             // … эртанги 05:00 гача
const ISH_BOSHI = 9 * 60, ISH_OXIRI = 18 * 60;                       // дақиқада
/* 🧰 ГРУЗЧИКНИНГ ИШ КУНИ 08:00 ДА БОШЛАНАДИ (Достон 2026-10-16: «грузчиклар соат 8 да
 * ишни бошлар экан»). Шунинг учун уларга эрталабки соат 08:00 ДАН ОЛДИН келгани учун
 * ёзилади — 08:00 да босса, бу оддий иш вақти, бонус эмас. Бошқаларда аввалгидек 09:00. */
const GRUZCHIK_BOSHI = 8 * 60;
export const gruzchikmi = (h) => Boolean(h && /грузчик/i.test(String(h.bolim || "") + " " + String(h.nom || "")));
/** Шу ходимнинг иш куни неча дақиқада бошланади (эрталабки бонус шунгача ҳисобланади) */
export const ishBoshi = (h) => (gruzchikmi(h) ? GRUZCHIK_BOSHI : ISH_BOSHI);
// Достон 2026-09-21: бир одамнинг БИРИНЧИ расмидан кейинги 30 дақиқа ичидаги ҳамма расмлари — битта юк;
// 30 дақиқа ўтгач ташлангани — кейинги юк (олиш ва топшириш алоҳида). Олдин 2 дақиқа эди.
export const BIR_YUK_SEK = 30 * 60;
// 🚚 Достон 2026-10-13: 30 дақиқа ЖУДА КЕНГ эди — ҳайдовчи иккита бошқа-бошқа мижозга 20 дақиқада
// борса ҳам БИТТА юк саналарди (Ходим15: «49 та топширдим, Excel'да 41»). Энди юк БИРЛАШАДИ фақат:
//   • расмлар бир альбомда (бир йўла ташланган), ёки
//   • орасида 5 дақиқадан кам вақт бор (бир юкнинг иккинчи расми: накладной, яна бир палет) ва мижози бир хил.
// Қолган ҳолатда — алоҳида юк. Текширилди: Ходим15 89 → 98 (ўзи санагани билан тўлиқ мос).
export const BIR_YUK_ORALIQ = 300;   // Достон 2026-10-13: 3 → 5 дақиқа (изоҳи бӯш расмлар учун)
// 🧾 Достон 2026-10-13 (учинчи қоида): битта ҳайдовчи БИР МИЖОЗга 5–15 дақиқа ичида
// икки марта расм ташласа — бу БИТТА ЮК (бир одамга 15 дақиқада икки марта бориб келиш бӯлмайди).
export const BIR_MIJOZ_ORALIQ = 900;
// ⚠️ Истисно (Достон 2026-10-13): Ходим15 (id 18) ӯзи санаб айтган рақам тасдиқланган —
// унинг ЭСКИ кунлари (13.10 гача) ӯзгармайди: ӯша кунларда 5 дақиқа.
// 14.10 дан бошлаб унга ҳам ҳаммадек 15 дақиқа қоидаси қӯлланади (Достон: «экселини
// ӯзгартирма, лекин унга ҳам шу қоида амал қилсин»).
export const BIR_MIJOZ_ISTISNO = { 18: "2026-10-13" };
/* ✂️ АЛОҲИДА ЮК (калит: "гуруҳ|msg_id") — бу расм олдингиси билан БИРЛАШМАЙДИ, янги юк бошланади.
 * Мижоз бир хил ва 15 дақиқа ичида бўлса ҳам аслида икки иш бўлган ҳолатлар (Достон тасдиқлайди):
 *   • Ходим15 07.11: 12:49 «Hodim04 sapok vazvrat» (возврат) ва 12:56 «Hodim04 Joy1da olindi Sapok» — икки иш (Достон 2026-11-07). */
export const YUK_AJRAT = new Set(["olish|15138"]);
// 🚚 Достон 2026-10-15: ҳайдовчида эрталабки соат йўқ — ЛЕКИН шу кунлар истисно (ҚОИДА ЭМАС).
// Фақат базадаги қўлда ёзилган «b» ёзуви ҳисобланади. Калит: "ходим id|сана".
// Ходим15 25.09 — 06:00 дан бошлаган (07:31 ва 08:16 Ходим15га топширган).
// Ходим15 20.10 — 08:23 да ишни бошлаган, тугмаси йўқ (ҳайдовчи); Достон тасдиқлади.
// Ходим05 ака 22.10 — 07:23 да, 23.10 — 08:00 да ишни бошлаган; Достон тасдиқлади (23.10).
// 🚚 Достон 2026-10-23: ҲАЙДОВЧИНИНГ ЭРТАЛАБКИ СОАТИ ҚАЙТА ҲИСОБЛАНАДИ — лекин ФАҚАТ расмдан.
// «Ишни бошладим» тугмаси ҳайдовчида умуман йўқ (иловада ҳам, API'да ҳам). 09:00 дан олдин
// гуруҳга (юк олиш ёки юк топшириш — иккаласи ҳам) расм ташласа, ЭНГ ЭРТА расм вақтидан
// 09:00 гача соат ёзилади (08:00 да расм → 1 соат). Достон: «agar ishni vohli boshlasa yani
// 9:00 dan oldin guruhlarga tashlidigan rasmidan hsoblab bonus yozasan».
// ⚠️ ФАҚАТ 16.10 дан: 16.09–15.10 даври ҳисоб-китоб қилиниб пули берилган, Раҳбар аканинг
// қўлда тўғриланган файли эталон — у ўзгармаслиги керак.
// Достон 2026-10-27: кечқурунги соат ҳам ИККАЛА гуруҳдан («юк олиш» расми ҳам иш вақти —
// «nega unday boldi yuk olishdanham hsoblashi kere kechqurungi ishlagan vohtini bonusini»).
export const HAYDOVCHI_ERTALAB_DAN = "2026-10-16";   // эрталабки ҳам, кечқурунги «юк олиш» ҳам шу кундан
export const HAYDOVCHI_ERTALAB_ISTISNO = new Set(["26|2026-09-25", "21|2026-10-20", "7|2026-10-22", "7|2026-10-23"]);
// 🧾 Достон 2026-10-13 (иккинчи қоида): 1–5 дақиқа оралиғида расм ташланса ҳам, изоҳдаги МИЖОЗ
// бошқа бўлса — АЛОҲИДА юк. Айни бир дақиқада ташланганлар эса битта юк (Достон: Ходим15нинг
// 01.10 «Hodim04 15:51 + Ходим15 ока 15:51» — битта юк). Изоҳда исм бўлмаса — эскисига қўшилади.
const MIJOZ_ALIAS = { mijoz2: "mijoz2", abduvohit: "hodim05", hodim05: "hodim05", ahror: "mijoz1",
  hodim01: "hodim01", umurzo: "hodim01", aliwer: "alisher", izza: "izzat" };
const MIJOZLAR = ["hodim04", "hodim06", "mijoz2", "hodim05", "hodim36", "mijoz3", "hodim06b", "mijoz1",
  "orikzor", "alisher", "mamur", "muhriddin", "izzat", "rahbar", "hodim34", "admin", "hurshid",
  "hodim01", "sadriddin", "sayfullo", "fathulla"];
/** Изоҳдан мижоз исмларини ажратиб олади (лотин/кирилл фарқи йўқ) */
export function mijozlar(matn) {
  const t = new Set();
  for (const w of ismSoda(matn || "").split(/[^a-z0-9ʻ]+/)) {
    if (w.length < 4) continue;
    const a = MIJOZ_ALIAS[w] || w;
    for (const m of MIJOZLAR) if (a === m || a.startsWith(m)) { t.add(m); break; }
  }
  return t;
}
const mijozMos = (a, b) => { if (!a.size || !b.size) return true; for (const v of a) if (b.has(v)) return true; return false; };

/** Ҳайдовчи бонус нархлари: [шаҳар ичи, шаҳардан ташқари] (юк олиш ва топшириш бир хил) */
export const YUK_NARX = { kichik: [10000, 20000], orta: [20000, 40000], katta: [30000, 60000] };
const MASHINA_NOMI = { kichik: "Кичик (Дамас/Лабо/Ван)", orta: "Ўрта (Газел)", katta: "Катта (Исузу)" };

/* ============================ ХОДИМЛАР ============================
 * «Ходимлар_лавозими_тарифи.xlsx» (Раҳбар ака, 2026-09-16) — тартиб рақами ўша файлдаги №.
 * tg — index.js даги EMPLOYEE_TG_IDS билан бир хил (одам томонидан тасдиқланган).
 * Машина тоифаси «тариф бўйича» (Достон 2026-09-16): 40 000 — кичик, Газел — ўрта, Исузу — катта.
 * Ходим15 Исузу — соатлик тарифи 70 000 (Достон 2026-10-15: 16.09 дан Исузуга ўтган,
 * аввал хато 40 000 ёзилган эди).                                                      */
export const HODIMLAR = [
  // Достон 2026-09-18: ишдан кетган 9 ходим (Ходим15, Ходим15, Ходим15, Ходим15, Ходим15,
  // Ходим15, Ходим15, Ходим15, Ходим15) рўйхатдан ЎЧИРИЛДИ; Ходим15 ака — грузчик
  // Достон 2026-09-29: Telegram'и йўқ ходимларнинг шахсий Excel'ини Ходим01 ака юклаб беради
  { id: 1, nom: "Ходим01", bolim: "Цех", tarif: 35000, tg: 700000006, tgsizExcel: true },
  { id: 2, nom: "Ходим02", bolim: "Диспетчер", tarif: 40000, tg: 700000007 },
  { id: 3, nom: "Ходим03", bolim: "Склад", tarif: 35000, tg: 700000008 },
  // Дўкон ходимлари — BIGANT гуруҳи экспортидан (16.08–15.09): «Ходим04 Бигант», «Ходим05», «Ходим06 Бигант».
  { id: 4, nom: "Ходим04", bolim: "Дўкон", tarif: 40000, tg: 700000009 },
  { id: 5, nom: "Ходим05", bolim: "Дўкон", tarif: 40000, tg: 700000010 },
  { id: 6, nom: "Ходим06", bolim: "Дўкон", tarif: 40000, tg: 700000011 },
  // 🧾 Ходим07 (Достон 2026-10-08): аввал иловадан «қўшилган ходим» сифатида киритилган эди (bonus_hodim id 4),
  // лекин у доимий сотувчи — «Қўшилганлар» рўйхатида туриши нотўғри. Асосий рўйхатга кўчирилди.
  // Тарифи 35 000 — қўшилганда шундай белгиланган, эски ёзуви ҳам шунга ҳисобланган (22:20 → 151 667).
  { id: 47, nom: "Ходим07", bolim: "Дўкон", tarif: 35000, tg: 700000012 },
  // ДИҚҚАТ (2026-09-16): index.js EMPLOYEE_TG_IDS да «Ходим05 ака» = 700000010 — бу НОТЎҒРИ.
  // Гуруҳ экспортида 700000010 — «Ходим05» (дўкон, ҳайдовчиларга заказ беради), ҳайдовчининг
  // ўз «#а … 07.00 09.00» хабарларини эса 700000013 «Ходим05ака Бигант» ёзган.
  // Достон 2026-09-30: Ходим05 аканинг ИККИНЧИ аккаунти — 700000014 «Ходим15 Ходим15»
  // (юк гуруҳларига шу аккаунтдан ҳам расм ташлаган, бонуси ёзилмай қолаётган эди).
  { id: 7, nom: "Ходим05 ака", bolim: "Ҳайдовчи", tarif: 70000, mashina: "orta", tg: 700000013, tglar: [700000014] },
  // Достон 2026-09-30: Ходим08 ишдан кетди — рўйхатларда кўринмайди, лекин 16.09 даги
  // 2 та юки Excel'да қолади (ишлаган пули йўқолмасин).
  { id: 8, nom: "Ходим08", bolim: "Ҳайдовчи", tarif: 40000, mashina: "kichik", tg: 700000015, ketgan: true, oldin: [{ gacha: "2026-09-15", mashina: "orta", tarif: 70000 }] },
  { id: 9, nom: "Ходим09", bolim: "Ҳайдовчи", tarif: 40000, mashina: "kichik", tg: 700000016 },
  { id: 10, nom: "Ходим10", bolim: "Ҳайдовчи", tarif: 40000, mashina: "kichik", tg: 700000017 },
  { id: 11, nom: "Ходим11", bolim: "Ҳайдовчи", tarif: 40000, mashina: "kichik", tg: 700000018 },
  { id: 12, nom: "Ходим12", bolim: "Ҳайдовчи", tarif: 70000, mashina: "orta", tg: 700000019 },
  { id: 13, nom: "Ходим13", bolim: "Ҳайдовчи", tarif: 40000, mashina: "kichik", tg: 700000020 },
  { id: 14, nom: "Ходим15 Газел", bolim: "Ҳайдовчи", tarif: 70000, mashina: "orta", tg: 700000021 },
  { id: 16, nom: "Ходим15", bolim: "Ҳайдовчи", tarif: 40000, mashina: "kichik", tg: 1732723743 },
  { id: 17, nom: "Ходим15", bolim: "Ҳайдовчи", tarif: 40000, mashina: "kichik", tg: 700000022 },
  { id: 18, nom: "Ходим15", bolim: "Ҳайдовчи", tarif: 40000, mashina: "kichik", tg: 700000023 },
  { id: 19, nom: "Ходим15", bolim: "Ҳайдовчи", tarif: 40000, mashina: "kichik", tg: 700000024 },
  { id: 20, nom: "Ходим15", bolim: "Ҳайдовчи", tarif: 40000, mashina: "kichik", tg: 700000025, tglar: [700000026] },  // 2-аккаунт «Ходим15 Ходим15» (Достон 2026-11-10)
  // Достон 2026-09-17: Ходим15 — Газелга, Ходим15 ака — Дамасга. Хўжайин 2026-09-28: машина алмашуви
  // ДАВР бошидан ҳисобланади (16.09 дан) — давр ўртасида бўлинмайди; эски машина ўтган даврда қолади (oldin.gacha = 15-сана)
  { id: 21, nom: "Ходим15", bolim: "Ҳайдовчи", tarif: 70000, mashina: "orta", tg: 700000027, oldin: [{ gacha: "2026-09-15", mashina: "kichik", tarif: 40000 }] },
  // «Ходим15 ака» 2026-09-21 да бонус тизимидан чиқарилган эди; Достон 2026-09-30: ҚАЙТА КИРИТИЛДИ —
  // Дамас ҳайдайди, бонуслари (юк, қўшимча соат, рағбат) ҳисобланади, Mini App'да Бонуслар очиқ.
  // Достон 2026-10-13: Ходим15 акада ФАҚАТ «Иш вақти» қолсин — «Рағбат» ва «Тошкентга кирдим» олинди.
  { id: 22, nom: "Ходим15 ака", bolim: "Ҳайдовчи", tarif: 40000, mashina: "kichik", tg: 700000028, ragbatYoq: true, kirdimYoq: true },
  { id: 23, nom: "Ходим15 ака", bolim: "Ҳайдовчи", tarif: 40000, mashina: "kichik", tg: 700000029, oldin: [{ gacha: "2026-09-15", mashina: "orta", tarif: 70000 }] },
  // Ходим15 ИККИ аккаунтдан ёзади (Достон 2026-09-17: «иккала аккаунтни ҳам Ходим15га бириктир»):
  // 700000030 «🇺🇿🥋хусан🥋🇺🇿» (асосий) ва 700000031 «🇸🇱🥋ХУСАН.🥋🇸🇱» (эски, 17.09 13:49 да ҳам расм ташлаган).
  { id: 24, nom: "Ходим15", bolim: "Ҳайдовчи", tarif: 40000, mashina: "kichik", tg: 700000030, tglar: [700000031] },
  { id: 25, nom: "Ходим15", bolim: "Ҳайдовчи", tarif: 40000, mashina: "kichik", tg: 700000032 },
  { id: 26, nom: "Ходим15", bolim: "Ҳайдовчи", tarif: 70000, mashina: "katta", tg: 700000033, oldin: [{ gacha: "2026-09-15", mashina: "kichik", tarif: 40000 }] },   // Достон 2026-10-15: 16.09 дан Исузу — соатлик тариф 70 000 (аввал 40 000 эди)
  { id: 27, nom: "Ходим15", bolim: "Ҳайдовчи", tarif: 70000, mashina: "orta", tg: 700000034 },
  // Достон 2026-09-30: янги ҳайдовчи — Ходим15 (@mirgofurov1), Дамас
  { id: 28, nom: "Ходим15", bolim: "Ҳайдовчи", tarif: 40000, mashina: "kichik", tg: 700000035 },
  { id: 32, nom: "Ходим15 ака", bolim: "Грузчик", tarif: 35000 },
  { id: 33, nom: "Ходим15 кичик", bolim: "Цех", tarif: 35000 },
  { id: 36, nom: "Ходим15", bolim: "Цех", tarif: 35000 },
  { id: 38, nom: "Ходим15", bolim: "Цех", tarif: 35000, tg: 700000036 },
  { id: 40, nom: "Ходим15 грузчик", bolim: "Цех", tarif: 35000 },
  { id: 41, nom: "Ходим08 сваршик", bolim: "Цех", tarif: 35000 },
  // 🔄 Ходим15 янги Телеграмга ўтди (Достон 2026-10-09): эскиси 700000037 ўчиб кетган, янгиси 700000038.
  // Бонуслари hodim = 42 га боғланган — алмашиш пулга таъсир қилмайди (7 та ёзуви жойида қолади).
  { id: 42, nom: "Ходим15", bolim: "Грузчик", tarif: 35000, tg: 700000038 },
  { id: 43, nom: "Ходим15", bolim: "Грузчик", tarif: 35000, tg: 700000039 },
  { id: 45, nom: "Ходим15", bolim: "Грузчик", tarif: 35000, tg: 700000040 },
  { id: 46, nom: "Ходим13 грузчик", bolim: "Цех", tarif: 35000 },   // Достон 2026-09-16: 35 000
  // 🧪 Синов ходимлари (Достон, Шерик) 2026-09-18 да олиб ташланди — ходимлар ишлата бошлади.
  // Синовлар учун tests/bonussinov.js ўзи sinovQosh() билан қўшади.
];
const HODIM_ID = new Map(HODIMLAR.map((h) => [h.id, h]));
/** Ходимнинг ҳамма Telegram аккаунтлари: асосий tg + қўшимча tglar (бир одам икки телефондан ёзса) */
export const hodimTgLari = (h) => [h.tg, ...(h.tglar || [])].filter(Boolean);
const HODIM_TG = new Map(HODIMLAR.flatMap((h) => hodimTgLari(h).map((id) => [id, h])));
// 👥 Mini App'дан қўшилган ходимлар (bonus_hodim жадвали; рақами 10000 + id). hodimlarYukla() тўлдиради.
export const QOSHILGAN_BOSH = 10000;
let QOSHILGAN = new Map();
export const hodimOl = (id) => HODIM_ID.get(Number(id)) || QOSHILGAN.get(Number(id)) || null;
/** Иловадан қўшилган ходимлар (ўчирилганлари ҳам — эски ёзувлари учун) */
export const qoshilganlar = () => [...QOSHILGAN.values()];
/** bonus_hodim жадвалини ўқиб, рўйхатни янгилайди; жадвал йўқ бўлса — бўш */
export async function hodimlarYukla(env) {
  // Чуқур текширув 2026-09-21: Worker бир вақтда бир нечта сўровга хизмат қилади — рўйхатни бўшатиб
  // тўлдириш орасида бошқа сўров уни бўш кўрмасин: янги Map тўлиқ тайёр бўлгач алмаштирилади.
  if (!env || !env.DB) { QOSHILGAN = new Map(); return; }
  const yangi = new Map();
  try {
    const r = await env.DB.prepare("SELECT id, nom, tarif, qoshdi_ism, vaqt, ochirildi, ochirdi_ism, ochirildi_vaqt FROM bonus_hodim").all();
    for (const x of r.results || []) {
      const id = QOSHILGAN_BOSH + Number(x.id);
      yangi.set(id, { id, nom: String(x.nom), bolim: "Қўшилган", tarif: Number(x.tarif), qoshilgan: true,
                          qoshdi: x.qoshdi_ism || "", qoshVaqt: Number(x.vaqt) || 0, ketgan: x.ochirildi ? "ochirildi" : undefined,
                          ochirdi: x.ochirdi_ism || "", ochirVaqt: Number(x.ochirildi_vaqt) || 0 });
    }
    QOSHILGAN = yangi;
  } catch (e) { console.error("bonus_hodim:", e && e.message); }
}
export const hodimTg = (uid) => HODIM_TG.get(Number(uid)) || null;
/** ФАҚАТ синовлар учун: вақтинча ходим қўшиш (production'да чақирилмайди) */
export function sinovQosh(h) {
  HODIMLAR.push(h); HODIM_ID.set(h.id, h);
  for (const id of hodimTgLari(h)) HODIM_TG.set(id, h);
}
/** Шу кундаги машина ва тариф: машина алмашган бўлса — o'sha kungacha эскиси (oldin: [{ gacha, mashina, tarif }]) */
export function hodimKun(h, sana) {
  const e = (h.oldin || []).filter((o) => sana <= o.gacha).sort((a, b) => a.gacha.localeCompare(b.gacha))[0];
  return e ? { mashina: e.mashina, tarif: e.tarif } : { mashina: h.mashina, tarif: h.tarif };
}

/* ============================ ВАҚТ ============================ */
const iso = (ms) => new Date(ms).toISOString().slice(0, 10);
/** unix (сония) → Тошкент санаси ва кун бошидан сония */
export function toshkent(unix) {
  const t = Number(unix) + TZ;
  const sek = ((t % 86400) + 86400) % 86400;
  return { sana: iso(t * 1000), sek, min: Math.floor(sek / 60) };
}
const oldingiKun = (sana) => iso(Date.parse(sana + "T00:00:00Z") - 86400000);
const sanaUz = (s) => (s ? s.slice(8, 10) + "." + s.slice(5, 7) + "." + s.slice(0, 4) : "");
const hhmm = (min) => {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
};
/** дақиқа → «2:05» (соат:дақиқа, 24 дан ошиши мумкин) */
export const davomiylik = (min) => Math.floor(min / 60) + ":" + String(Math.round(min % 60)).padStart(2, "0");

/* ============================ ГУРУҲ ЭЪЛОНЛАРИ ============================ */
// Шерик 2026-09-24: сарлавҳа (қалин) + ҳар исм алоҳида қаторда. parse_mode: "HTML" — ёзилган матн escape қилинади.
const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const qatorlar = (nomlar) => nomlar.map((n) => `  • ${esc(n)}`).join("\n");

/** 🎁 Рағбатлантириш эълони: ким ёзди, кимга (рўйхат), нима учун */
export function ragbatXabar(yozdi, nomlar, matn) {
  // Достон 2026-11-11: учала эълон (рағбат · огоҳлантириш · жарима) — «машинка» (моноширин) кўринишида
  return `<pre>📨 РАҒБАТЛАНТИРИШ\n\n✍️ ${esc(yozdi)}\n👥 Кимга:\n${qatorlar(nomlar)}\n\n📝 ${esc(matn)}</pre>`;
}

/* ⚠️ ОГОҲЛАНТИРИШ (Достон 2026-11-11): рағбатлантиришдек — ходимлар рўйхати + матн, BIGANT гуруҳига эълон.
 * Фақат шу 4 киши кўради ва ёза олади (тестерлар — синаш учун). Пулга таъсири йўқ. */
export const OGOH_YOZADI = [700000004, 700000041, 700000007, 700000042];   // Раҳбар ака, Админ ака, Ходим02, Ходим15 ака
// Достон 2026-11-11: синаш учун фақат Достонга ҳам очиқ; Шерикга (тестер бўлса ҳам) ЁПИҚ
export const OGOH_SINOVCHI = [700000005];
// 📅 Огоҳлантириш ва жарима Excel'да шу санадан кўринади (Достон 2026-11-11: «шу ойнинг 17-санасидан»).
// Бонусдек давр бўйича (16 → 15) ҳисобланади. Объект — синовда санани ўзгартириш учун.
export const OGOH_JARIMA = { bosh: "2026-11-17" };
export function ogohXabar(yozdi, nomlar, matn) {
  return `<pre>⚠️ ОГОҲЛАНТИРИШ\n\n✍️ ${esc(yozdi)}\n👥 Кимга:\n${qatorlar(nomlar)}\n\n📝 ${esc(matn)}</pre>`;
}

/* 💸 ЖАРИМА (Достон 2026-11-11): огоҳлантиришдаги 4 киши; жарима тайёр вариантдан танланади.
 * Бонусдан айирилмайди — фақат ёзилади ва гуруҳга эълон. */
export const sumMatn = (n) => String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
export function jarimaXabar(yozdi, nomlar, tur, narx) {
  return `<pre>🚫 ЖАРИМА\n\n✍️ ${esc(yozdi)}\n👥 Кимга:\n${qatorlar(nomlar)}\n\n📝 ${esc(tur)} — ${sumMatn(narx)} сўм</pre>`;
}

/* 🏷 Гуруҳ эълонида исм ҚИСҚА ёзилади (Раҳбар ака сўради — Достон 2026-10-21):
 * «Ходим15 кичик» → «Ходим15», «Ходим15 грузчик» → «Ходим15», «Ходим13 грузчик» → «Ходим13».
 * Фақат лавозим/машина қўшимчаси олиб ташланади; «ака» қолади (Ходим05 ака, Ходим15 ака).
 * Ҳисобот ва Excel'да исм ТЎЛИҚ ёзилади — бу фақат гуруҳдаги эълон учун.            */
const QISQA_QOSHIMCHA = ["грузчик", "сваршик", "кичик", "газел", "гуричик"];
export const qisqaNom = (nom) => {
  const s = String(nom || "").trim().split(/\s+/);
  while (s.length > 1 && QISQA_QOSHIMCHA.includes(s[s.length - 1].toLowerCase())) s.pop();
  return s.join(" ");
};

/* ✍️ Достон 2026-11-04: гуруҳ эълонида тепада ҲАР ДОИМ «Ким ёзди: Исм» туради.
 * Аввал фақат исмлар рўйхати бор эди — гуруҳда ким юборгани билинмасди.
 *   • ўзини ҳам белгилаган бўлса — исми рўйхатда ҳам бўлади, соати (бонуси) ЁЗИЛАДИ;
 *   • ўзини қўшмаса — фақат «Ким ёзди»да туради, унга бонус ҲИСОБЛАНМАЙДИ.
 * Рўйхат тартиби ўзгартирилмайди — белгиланган тартибда қолади.
 * Ёзган одам рўйхатда ТАКРОРЛАНМАЙДИ (Достон: «Ким ёзди: Ходим01 бўлсин, бўлди етади») —
 * бу фақат гуруҳдаги кўриниш: ўзини белгилаган бўлса, базада соати абадал ёзилади. */
export function ishNomlari(nomlar, yozdi) {
  const y = qisqaNom(yozdi || "");
  const q = (nomlar || []).map((n) => qisqaNom(n)).filter((n) => !y || n.toLowerCase() !== y.toLowerCase());
  return { yozdi: y, nomlar: q };
}

/** Иш вақти эълони (Раҳбар ака сўради — Достон 2026-10-21): сарлавҳа + исмлар рўйхати:
 *     <b>Ишни тугатди</b> ✅
 *
 *     Ходим01
 *     Ходим15
 *
 *     📝 изоҳ
 * Аввал ҳар қаторда «Исм Ишни тугатди — 18:33 ✅» такрорланиб, узун ва чалкаш эди
 * (Шерик 2026-09-24 даги кўриниш). Вақт сарлавҳада ҳам ёзилмайди — Telegram'нинг
 * ўзи хабар вақтини кўрсатиб туради (Раҳбар аканинг намунасидагидек).               */
export function ishXabar(tur, soat, nomlar, izoh, yozdi) {
  // ✍️ Достон 2026-11-04 (айнан шу кўриниш): «✅ Ишни тугатди» → «👥 Ким ёзди: Исм» → • исмлар → 📝 изоҳ
  const sar = `<b>✅ Ишни ${tur === "b" ? "бошлади" : "тугатди"}</b>`;
  const r = ishNomlari(nomlar, yozdi);
  const qator = [...(r.yozdi ? [`👥 Ким ёзди: ${esc(r.yozdi)}`] : []), ...(r.nomlar.length ? [qatorlar(r.nomlar)] : [])];
  return `${sar}\n\n${qator.join("\n")}` + (izoh ? `\n\n📝 ${esc(izoh)}` : "");   // 📝 ходим ёзган изоҳ (Достон 2026-09-30)
}

/** Қайси тугма ҳозир кўринади: "b" (бошладим), "t" (тугатдим) ёки null (иш вақти) */
export function ishTugmasi(unix) {
  const { sek } = toshkent(unix);
  if (sek >= BOSHLASH_DAN && sek < BOSHLASH_GACHA) return "b";
  if (sek >= TUGATISH_DAN || sek < TUGATISH_GACHA) return "t";
  return null;
}
/** Иш куни: ярим тундан кейин (05:00 гача) босилган «тугатдим» — ОЛДИНГИ кунга тегишли */
export function ishKuni(unix, tur) {
  const { sana, sek } = toshkent(unix);
  return tur === "t" && sek < TUGATISH_GACHA ? oldingiKun(sana) : sana;
}

/* ============================ ДАВР (16 → 15) ============================ */
/** Берилган вақт қайси ҳисобот даврига тушади */
export function davrOl(unix) {
  const { sana } = toshkent(unix);
  let y = +sana.slice(0, 4), m = +sana.slice(5, 7);
  if (+sana.slice(8, 10) < 16) { m -= 1; if (m === 0) { m = 12; y -= 1; } }
  return davrBoshidan(`${y}-${String(m).padStart(2, "0")}-16`);
}
/** «2026-08-16» → { bosh, oxir, boshUnix, oxirUnix, nom } */
export function davrBoshidan(bosh) {
  if (!/^\d{4}-\d{2}-16$/.test(String(bosh))) return null;
  let y = +bosh.slice(0, 4), m = +bosh.slice(5, 7) + 1;
  if (m === 13) { m = 1; y += 1; }
  const oxir = `${y}-${String(m).padStart(2, "0")}-15`;
  const boshUnix = Date.parse(bosh + "T00:00:00Z") / 1000 - TZ;
  const oxirUnix = Date.parse(oxir + "T00:00:00Z") / 1000 - TZ + 86400 - 1;
  return { bosh, oxir, boshUnix, oxirUnix, nom: `${sanaUz(bosh)} – ${sanaUz(oxir)}` };
}
/** Жорий ва олдинги n та давр (янгиси биринчи) */
export function davrlar(hozirUnix, n = 4) {
  const r = [];
  let d = davrOl(hozirUnix);
  for (let i = 0; i < n && d; i++) { r.push(d); d = davrOl(d.boshUnix - 1); }
  return r;
}
/* 🔒 ҲИСОБ-КИТОБ КУНЛАРИ (Достон 2026-10-16): «16.09 – 15.10 ни юклаш имкони бўлсин,
 * 16.10 гачасини юклаш имкони бўлмасин — Раҳбар акада ҳам шунday».
 * Фақат шу санолар орасида (ўзи ҳам) ЖОРИЙ давр ёпиқ — ҳеч ким юклай олмайди, тугаган
 * давр эса ҳар доим очиқ. Қайта очиш: null қилиб қўйинг ёки «gacha» ни ўзгартиринг.      */
/* ✅ Достон 2026-10-19: 16.09 – 15.10 ҳисоб-китоби ТУГАДИ, ходимларга пуллари берилди.
 * Жорий давр (16.10 дан) қайта ОЧИЛДИ: энди «1 ойлик» = жорий давр, эски давр эса
 * рўйхатдан танлаб юкланади. Қайта ёпиш керак бўлса — объектни қайтариб қўйинг.      */
export const JORIY_YOPIQ = null;
/** Шу давр ҳозир юклаш учун ёпиқми (фақат ҳисоб-китоб кунларидаги ЖОРИЙ давр) */
export function davrYopiq(bosh, hozirUnix) {
  if (!JORIY_YOPIQ) return false;
  const sana = toshkent(hozirUnix).sana;
  if (sana < JORIY_YOPIQ.bosh || sana > JORIY_YOPIQ.gacha) return false;
  const j = davrOl(hozirUnix);
  return Boolean(j && String(bosh) === j.bosh);             // тугаган даврлар ҳар доим очиқ
}

/* ============================ ⏰ ИШ ВАҚТИ ============================
 * yozuvlar: [{ hodim, tur:"b"|"t", vaqt:unix, kim:uid, kim_ism }]
 * Натижа — ҳар бир ходим × иш куни учун битта қатор.                    */
/* 🔤 Исм бир хилми — лотин ва кирилл ёзувни тенг деб билади (Достон 2026-10-08).
 * Нима учун: 08.10 да «Hodim01» ва «Hodim14» лотинда қўшилиб, рўйхатдаги «Ходим01» ва
 * «Ходим15 Газел» билан такрор бўлиб қолган — toLowerCase() уларни бошқа сўз деб билган. */
const KIRILL = { а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "j", з: "z", и: "i", й: "y",
  к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h",
  ц: "s", ч: "ch", ш: "sh", щ: "sh", ъ: "", ы: "i", ь: "", э: "e", ю: "yu", я: "ya",
  ў: "u", қ: "q", ғ: "g", ҳ: "h" };
export const ismSoda = (s) => String(s || "").toLowerCase().trim()
  .replace(/[Ѐ-ӿ]/g, (c) => (c in KIRILL ? KIRILL[c] : c))
  .replace(/[ʻʼ‘’'`]/g, "")    // ʻ ʼ ‘ ’ ' ` — апострофлар ташланади
  .replace(/x/g, "h")                               // х ↔ ҳ: «Hodim19» ва «Ходим15» бир одам
  .replace(/\s+/g, " ").trim();
export const ismTeng = (a, b) => ismSoda(a) === ismSoda(b);
/* 🔤 Достон 2026-10-19: «Hodim05 aka gazel» деб ҚЎШИБ юборилган эди, рўйхатда эса
 * «Ходим05 ака» бор. Янги исм ичида рўйхатдаги исмнинг ҲАММА сўзи бўлса — такрор.
 * «Ходим10» ва «Ходим10бек» эса бошқа-бошқа қолади (сўз бутунлигича мос келиши керак).      */
export const ismIchida = (bor, yangi) => {
  const a = ismSoda(bor).split(" ").filter(Boolean);
  const b = new Set(ismSoda(yangi).split(" ").filter(Boolean));
  return a.length > 0 && a.every((w) => b.has(w));
};

export function ishHisob(yozuvlar) {
  const g = new Map();
  for (const y of yozuvlar || []) {
    const h = hodimOl(y.hodim);
    if (!h || (y.tur !== "b" && y.tur !== "t")) continue;
    if (h.mashina) continue;   // ҳайдовчининг соати расмдан (haydovchiSoat) — иловадаги ёзув ҳисобланмайди
    const sana = ishKuni(y.vaqt, y.tur);
    const k = h.id + "|" + sana;
    if (!g.has(k)) g.set(k, { hodim: h, sana, b: null, t: null });
    const q = g.get(k);
    const { min } = toshkent(y.vaqt);
    if (y.tur === "b") {
      if (min < 5 * 60 || min >= ISH_BOSHI) continue;               // бошладим фақат 05:00–09:00
      if (!q.b || min < q.b.min) q.b = { min, y };
    } else {
      const eff = min < 5 * 60 ? min + 1440 : min;                  // ярим тундан кейин — +24 соат
      if (eff <= ISH_OXIRI) continue;                               // тугатдим фақат 18:01 дан
      if (!q.t || eff > q.t.min) q.t = { min: eff, y };
    }
  }
  const qatorlar = [];
  for (const q of g.values()) {
    if (!q.b && !q.t) continue;
    const ertalab = q.b ? Math.max(0, ishBoshi(q.hodim) - q.b.min) : 0;
    const kech = q.t ? q.t.min - ISH_OXIRI : 0;
    const jami = ertalab + kech;
    const tglar = hodimTgLari(q.hodim);
    const yozdi = (x) => (!x ? "" : tglar.includes(Number(x.y.kim)) ? "ўзи" : (x.y.kim_ism || "?"));
    // 📝 Изоҳ (Достон 2026-09-30): тугма босилганда ёзилган «нима иш қилдим»
    const izoh = [q.b && q.b.y.izoh ? "Эрталаб: " + q.b.y.izoh : "", q.t && q.t.y.izoh ? "Кечқурун: " + q.t.y.izoh : ""].filter(Boolean).join(" · ");
    qatorlar.push({
      hodim: q.hodim, sana: q.sana,
      boshladi: q.b ? hhmm(q.b.min) : "", tugatdi: q.t ? hhmm(q.t.min) : "",
      ertalab, kech, jami, tarif: hodimKun(q.hodim, q.sana).tarif,
      summa: Math.round(hodimKun(q.hodim, q.sana).tarif * jami / 60),
      yozdi: [q.b ? "Эрталаб: " + yozdi(q.b) : "", q.t ? "Кечқурун: " + yozdi(q.t) : ""].filter(Boolean).join(" · "),
      izoh,
    });
  }
  return qatorlar.sort((a, b) => a.hodim.nom.localeCompare(b.hodim.nom, "ru") || a.sana.localeCompare(b.sana));
}

/* ============================ 🚚 ЮК ============================ */
const IKKI_X = /(^|[^\p{L}\p{N}])(2\s*[xхXХ×]|[xхXХ×]\s*2)(?![\p{L}\p{N}])/u;
/** Изоҳда «2x» (2х, 2 x, X2 …) бор — шаҳардан ташқари */
export const ikkiX = (matn) => IKKI_X.test(String(matn || ""));

/* ============================ 🚚 ҲАЙДОВЧИНИНГ ҚЎШИМЧА СОАТИ (расмдан) ============================
 *   эрталаб:  LOGISTIKA'даги 09:00 гача ташланган ЭНГ ЭРТА расм → 09:00 гача
 *   кечқурун: «Юк топшириш»даги 18:00 дан кейинги ЭНГ КЕЧ расм → 18:00 дан
 *             (ярим тундан кейин, 05:00 гача ташланган расм — олдинги куннинг кечқуруни)
 * Натижа ishHisob() билан бир хил шаклда — Excel'нинг «Ишбай» варағига тушади.                  */
/** Кечқурунги соат ИККАЛА гуруҳнинг расмидан — ҳамма даврда (Достон 2026-10-27:
 *  «tuzat hamasini yuk olishdan ham oqi ohirgi rasim vohtini» — эски кунлар ҳам тузатилди) */
const kechGuruh = () => true;
export function haydovchiSoat(xabarlar, tugmaKirish = [], qolda = []) {
  const g = new Map();
  const tManba = new Map();   // кечқурунги энг кеч вақт қаердан: расм, тугма ёки қўлда тузатиш
  const bManba = new Map();
  const tIzoh = new Map(), bIzoh = new Map();   // 📝 ходим ёзган изоҳ (Достон 2026-09-30)
  // ✍️ Қўлда тузатиш (Достон 2026-09-21): ҳайдовчининг bonus_ish ёзуви фақат базадан қўлда киритилади
  // (иловада ҳайдовчини «Иш вақти»да танлаб бўлмайди) — масалан расм ташламай қолган кун учун.
  for (const y of qolda || []) {
    const h = hodimOl(y.hodim);
    if (!h || !h.mashina || (y.tur !== "b" && y.tur !== "t")) continue;
    const t = toshkent(y.vaqt);
    let sana = t.sana, min = t.min;
    // 🚚 Достон 2026-10-23: қўлда ёзилган «бошладим» 16.10 дан ҳисобланади (расм ташламай қолган
    // кун учун). 16.10 дан олдинги кунлар — фақат истисно рўйхатидагиси (эски давр ўзгармасин).
    if (y.tur === "b") {
      if (min >= ISH_BOSHI || t.sek < TUGATISH_GACHA) continue;                       // фақат 05:00–09:00
      if (t.sana < HAYDOVCHI_ERTALAB_DAN && !HAYDOVCHI_ERTALAB_ISTISNO.has(h.id + "|" + t.sana)) continue;
    }
    else if (t.sek < TUGATISH_GACHA) { sana = oldingiKun(t.sana); min += 1440; }
    else if (min <= ISH_OXIRI) continue;
    const k = h.id + "|" + sana;
    if (!g.has(k)) g.set(k, { hodim: h, sana, b: null, t: null });
    const q = g.get(k);
    const izoh = `қўлда тузатилди (${y.kim_ism || "?"})`;
    if (y.tur === "b" && (q.b === null || min < q.b)) { q.b = min; bManba.set(k, "Эрталаб: " + izoh); if (y.izoh) bIzoh.set(k, "Эрталаб: " + y.izoh); }
    if (y.tur === "t" && (q.t === null || min > q.t)) { q.t = min; tManba.set(k, "Кечқурун: " + izoh); if (y.izoh) tIzoh.set(k, "Кечқурун: " + y.izoh); }
  }
  // 📍 «Тошкентга кирдим» тугмаси (Mini App): шу иш кунидаги ЭНГ БИРИНЧИ босилиши — кирган пайт
  const birinchi = new Map();
  for (const b0 of tugmaKirish || []) {
    const h = hodimOl(b0.hodim);
    if (!h || !h.mashina) continue;
    const t = toshkent(b0.vaqt);
    let sana, min;
    if (t.min > ISH_OXIRI) { sana = t.sana; min = t.min; }
    else if (t.sek < TUGATISH_GACHA) { sana = oldingiKun(t.sana); min = t.min + 1440; }
    else continue;                                               // иш вақтида босилган — ҳисобланмайди
    const k = h.id + "|" + sana;
    if (!birinchi.has(k) || min < birinchi.get(k).min) birinchi.set(k, { h, sana, min, km: b0.km });
  }
  for (const [k, b] of birinchi) {
    if (!g.has(k)) g.set(k, { hodim: b.h, sana: b.sana, b: null, t: null });
    const q = g.get(k);
    if (q.t === null || b.min > q.t) {
      q.t = b.min;
      tManba.set(k, `Кечқурун: «Тошкентга кирдим» — чегарадан ${Number(b.km || 0).toFixed(1).replace(".", ",")} км`);
    }
  }
  for (const x of xabarlar || []) {
    const h = hodimTg(x.uid);
    if (!h || !h.mashina) continue;
    const t = toshkent(x.vaqt);
    let sana, tur, min;
    // Эрталаб — фақат 05:00–09:00 (Достон 2026-09-21 чуқур текширув: 00:00–05:00 даги расм «эрта келди» бўлиб
    // 8 соатгача бонус бермасин; ходимларнинг «Ишни бошладим» тугмаси билан бир хил чегара)
    // 🚚 Достон 2026-10-23: эрталабки вақт ИККАЛА гуруҳнинг расмидан (05:00–09:00, энг эрта);
    // 16.10 дан олдинги кунларда — йўқ (эски давр ҳисоб-китоб қилинган). Кечқурунгиси ўзгармади.
    if (t.sana >= HAYDOVCHI_ERTALAB_DAN && t.min >= 5 * 60 && t.min < ISH_BOSHI) { sana = t.sana; tur = "b"; min = t.min; }
    // 🌙 Кечқурун: 16.10 дан ИККАЛА гуруҳ ҳисобланади — ҳайдовчи 18:00 дан кейин юк ОЛИБ келса ҳам
    // ишлаган бўлади (Ходим15 26.10: 20:35 да «юк олиш»га расм ташлаган, соати ёзилмай қолганди).
    // Достон 2026-10-27: ЭСКИ КУНЛАР ҲАМ шу қоида билан — Ходим15 30.09/05.10/08.10 ва Ходим15 09.10
    // да ҳам кечқурунги охирги расм «юк олиш»да бўлиб, соати ёзилмай қолган эди (166 834 сўм).
    else if (kechGuruh() && t.min > ISH_OXIRI) { sana = t.sana; tur = "t"; min = t.min; }
    // Ярим тундан кейинги расм (00:00–05:00) — олдинги куннинг кечқуруни: бу ФАҚАТ «юк топшириш»дан
    // (кечаси юк олиб келиш «тунда ишлади» дегани эмас, 11 соатлик бонус бериб қўймасин).
    else if (x.guruh === "topshirish" && t.sek < TUGATISH_GACHA) { sana = oldingiKun(t.sana); tur = "t"; min = t.min + 1440; }
    else continue;
    const k = h.id + "|" + sana;
    if (!g.has(k)) g.set(k, { hodim: h, sana, b: null, t: null });
    const q = g.get(k);
    // 🔒 Достон 2026-10-16: «Ким ёзди» устунида «Юк топшириш» сўзи ЁЗИЛМАЙДИ — у бонус
    // эмас, фақат соат қаердан олингани. Чалкашмасин деб нейтрал ёзилади.
    if (tur === "b" && (q.b === null || min < q.b)) { q.b = min; bManba.set(k, "Эрталаб: гуруҳдаги расм"); }
    if (tur === "t" && (q.t === null || min > q.t)) { q.t = min; tManba.set(k, "Кечқурун: гуруҳдаги расм"); }
  }
  return [...g.values()].map((q) => {
    const ertalab = q.b === null ? 0 : Math.max(0, ishBoshi(q.hodim) - q.b);
    const kech = q.t === null ? 0 : q.t - ISH_OXIRI;
    const jami = ertalab + kech;
    return {
      hodim: q.hodim, sana: q.sana,
      boshladi: q.b === null ? "" : hhmm(q.b), tugatdi: q.t === null ? "" : hhmm(q.t),
      ertalab, kech, jami, mashina: hodimKun(q.hodim, q.sana).mashina, tarif: hodimKun(q.hodim, q.sana).tarif,
      izoh: [bIzoh.get(q.hodim.id + "|" + q.sana) || "", tIzoh.get(q.hodim.id + "|" + q.sana) || ""].filter(Boolean).join(" · "),
      summa: Math.round(hodimKun(q.hodim, q.sana).tarif * jami / 60),
      yozdi: [q.b === null ? "" : (bManba.get(q.hodim.id + "|" + q.sana) || "Эрталаб: гуруҳдаги расм"), q.t === null ? "" : tManba.get(q.hodim.id + "|" + q.sana)].filter(Boolean).join(" · "),
    };
  });
}

/**
 * Расм ёзувларидан юклар ва бонуслар.
 * xabarlar: [{ guruh, uid, ism, vaqt, matn, albom, msg_id }] — фақат расмлар
 * @returns {{ yuklar: [...], tanilmagan: number }}
 */
/** 🔁 Достон 2026-10-13: битта заказни ҳайдовчи ИККАЛА гуруҳга ташласа (изоҳи бир хил,
 *  орасида 5 дақиқадан кам) — бу БИТТА заказ. Юк олиш тарафидагиси олиб ташланади,
 *  юк топшириш қолади. Ҳақиқатан иккита иш бўлса изоҳи ҳар хил бўлади. */
export function juftOchir(olishYuklar, topshirishYuklar) {
  const band = new Set();
  const izKes = (a, b) => (a || []).some((v) => (b || []).includes(v));
  return (olishYuklar || []).filter((o) => {
    const i = (topshirishYuklar || []).findIndex((t, n) => {
      if (band.has(n) || t.hodim.id !== o.hodim.id) return false;
      // 📷 Достон 2026-10-14: АЙНАН ЎША расм иккала гуруҳда — вақтдан қатъи назар битта юк
      // (Ходим11 13.10: олиш 17:01 + топшириш 17:57, битта расм).
      // Юк бир неча расмдан иборат бўлса — ҲАР БИР расм солиштирилади (Достон 2026-10-14,
      // Ходим11 02.10: олиш 17:44 ↔ топшириш 17:45, лекин топшириш юки 17:33 дан бошланганди).
      const qa = o.qismlar || [{ unix: o.unix, izoh: o.izoh }], qb = t.qismlar || [{ unix: t.unix, izoh: t.izoh }];
      // 📷 Достон 2026-10-16: БИР ХИЛ РАСМ иккала гуруҳда — бу АЛОҲИДА иккита бонус:
      // юкни олди (олиш) ва кейин бориб топширди (топшириш), вақти ҳам бошқа. Расмнинг
      // «бир марта» қоидаси фақат БИТТА гуруҳ ичида ишлайди (yukHisob). Иккала гуруҳда эса
      // расм ҳам, вақт ҳам 5 дақиқа ичида бўлса — битта ишни икки гуруҳга ташлагани.
      const yaqin = qa.some((a) => qb.some((b) => Math.abs((b.unix || 0) - (a.unix || 0)) <= BIR_YUK_ORALIQ));
      if (yaqin && izKes(o.izlar, t.izlar)) return true;
      return qa.some((a) => String(a.izoh || "").trim() && qb.some((b) =>
        Math.abs((b.unix || 0) - (a.unix || 0)) <= BIR_YUK_ORALIQ && ismSoda(b.izoh) === ismSoda(a.izoh)));
    });
    if (i < 0) return true;
    band.add(i);
    return false;
  });
}

export function yukHisob(xabarlar, guruh) {
  // Ходим бўйича (икки Telegram аккаунти бор ходим — битта одам); танилмаганлар — аккаунт бўйича
  const kalit = (uid) => { const h = hodimTg(uid); return h ? "h" + h.id : "u" + uid; };
  const rasmlar = (xabarlar || []).filter((x) => x.guruh === guruh).map((x) => ({ ...x, k: kalit(x.uid) }))
    .sort((a, b) => a.k.localeCompare(b.k) || (a.vaqt - b.vaqt) || (a.msg_id - b.msg_id));
  const yuklar = [];
  let joriy = null, tanilmagan = 0;
  // 📷 Достон 2026-10-13: Айнан бир расм қайта ташланса — иккинчи марта ҳисобланмайди.
  // Белги: Telegram file_unique_id (bonus_xabar.rasm_id). Бир хайдовчининг ӯзида текширилади.
  const korilgan = new Set();
  for (const x of rasmlar) {
    if (x.rasm_id) {
      const belgi = x.k + "|" + x.rasm_id;
      if (korilgan.has(belgi)) continue;        // такрор расм — юк эмас
      korilgan.add(belgi);
    }
    // Шу альбомда, ёки ОХИРГИ расмдан 3 дақиқа ичида — ўша юк (Достон 2026-10-13, BIR_YUK_ORALIQ).
    // 1–3 дақиқа оралиғида мижоз исми бошқа бўлса — АЛОҲИДА юк.
    const oraliq = joriy ? x.vaqt - joriy.oxirgi : Infinity;
    // Мижоз БИР ХИЛ бӯлса — 15 дақиқагача битта юк (Достон 2026-10-13);
    // мижоз бошқа бӯлса — дарҳол алоҳида юк; изоҳ бӯш бӯлса — 5 дақиқа.
    const mA = joriy ? mijozlar(joriy.izohlar.join(" ")) : null, mB = mijozlar(x.matn);
    const hx = hodimTg(x.uid);
    const istisnoGacha = hx ? BIR_MIJOZ_ISTISNO[hx.id] : null;
    const mijozOyna = istisnoGacha && toshkent(x.vaqt).sana <= istisnoGacha ? BIR_YUK_ORALIQ : BIR_MIJOZ_ORALIQ;
    const birXil = joriy && joriy.k === x.k && !YUK_AJRAT.has(x.guruh + "|" + x.msg_id) &&
      ((x.albom && x.albom === joriy.albom) ||
       (mA.size && mB.size
          ? (oraliq <= mijozOyna && mijozMos(mA, mB))
          : oraliq <= BIR_YUK_ORALIQ));
    if (birXil) {
      joriy.oxirgi = x.vaqt; joriy.rasm++;
      if (x.matn) joriy.izohlar.push(String(x.matn));
      if (x.rasm_id) joriy.izlar.push(String(x.rasm_id));
      joriy.qismlar.push({ unix: x.vaqt, izoh: String(x.matn || "") });
      if (x.albom && !joriy.albom) joriy.albom = x.albom;
      continue;
    }
    joriy = { k: x.k, uid: x.uid, ism: x.ism, vaqt: x.vaqt, oxirgi: x.vaqt, albom: x.albom || null, rasm: 1,
              izohlar: x.matn ? [String(x.matn)] : [], izlar: x.rasm_id ? [String(x.rasm_id)] : [],
              qismlar: [{ unix: x.vaqt, izoh: String(x.matn || "") }] };
    yuklar.push(joriy);
  }
  const natija = [];
  for (const y of yuklar) {
    const h = hodimTg(y.uid);                           // кун бўйи ҳисобланади (вақт чеклови йўқ)
    if (!h || !h.mashina) { tanilmagan++; continue; }   // faqat haydovchilar
    const izoh = y.izohlar.join(" | ");
    const tashqari = ikkiX(izoh);
    const t = toshkent(y.vaqt);
    const m = hodimKun(h, t.sana).mashina;               // шу кундаги машина (алмашган бўлса)
    natija.push({ hodim: h, sana: t.sana, vaqt: hhmm(t.min), unix: y.vaqt, izlar: y.izlar || [], qismlar: y.qismlar, tashqari, rasm: y.rasm, izoh, mashina: m,
                  bonus: YUK_NARX[m][tashqari ? 1 : 0] });
  }
  natija.sort((a, b) => a.hodim.nom.localeCompare(b.hodim.nom, "ru") || a.sana.localeCompare(b.sana) || a.vaqt.localeCompare(b.vaqt));
  return { yuklar: natija, tanilmagan };
}

/* ============================ 📷 ГУРУҲДАН ЁЗИБ ОЛИШ ============================
 * index.js fetch() энг бошида чақиради. ҲЕЧ НИМАНИ «ЕМАЙДИ», ҳеч нима юбормайди,
 * хато бўлса ҳам бот ишлашда давом этади.                                         */
function guruhTuri(chatId, env) {
  const id = Number(chatId);
  const n = (v, d) => Number((env && v) || d);
  if (id === n(env && env.BONUS_LOGISTIKA_GURUH, LOGISTIKA_GURUH)) return "olish";
  if (id === n(env && env.BONUS_TOPSHIRISH_GURUH, TOPSHIRISH_GURUH)) return "topshirish";
  return null;
}
const rasmmi = (m) => Boolean((Array.isArray(m.photo) && m.photo.length) ||
  (m.document && /^image\//i.test(String(m.document.mime_type || ""))));
/** 📷 Расмнинг бармоқ изи — Telegram file_unique_id (Достон 2026-10-13).
 *  Битта расмнинг ҳар ӯлчамида file_unique_id ҳар хил, энг каттаси олинади. */
export const rasmIdOl = (m) => {
  if (Array.isArray(m.photo) && m.photo.length) {
    const eng = m.photo.reduce((a, b) => ((b.file_size || 0) > (a.file_size || 0) ? b : a), m.photo[0]);
    return eng && eng.file_unique_id ? String(eng.file_unique_id) : null;
  }
  return m.document && m.document.file_unique_id ? String(m.document.file_unique_id) : null;
};

export async function bonusYoz(env, message) {
  try {
    if (!env || !env.DB || !message || !message.chat) return false;
    const guruh = guruhTuri(message.chat.id, env);
    if (!guruh || !rasmmi(message)) return false;
    const f = message.from || {};
    const ism = [f.first_name, f.last_name].filter(Boolean).join(" ").slice(0, 80);
    await env.DB.prepare(
      "INSERT OR IGNORE INTO bonus_xabar (chat_id, msg_id, guruh, uid, ism, vaqt, matn, rasm, albom, rasm_id) VALUES (?,?,?,?,?,?,?,1,?,?)",
    ).bind(Number(message.chat.id), Number(message.message_id), guruh, f.id ? Number(f.id) : null, ism,
           Number(message.date) || Math.floor(Date.now() / 1000),
           String(message.caption || message.text || "").slice(0, 1000), message.media_group_id ? String(message.media_group_id) : null,
           rasmIdOl(message)).run();
    return true;
  } catch (e) {
    console.error("bonusYoz:", e && e.message);
    return false;
  }
}

/* ============================ D1: ДАВР МАЪЛУМОТИ ============================ */
/**
 * @param dv        davrBoshidan() натижаси
 * @param hozirUnix жорий вақт — жорий ой учун «шу пайтгача» кесилади
 */
export async function davrMalumot(env, dv, hozirUnix = Math.floor(Date.now() / 1000)) {
  await hodimlarYukla(env);
  const oxir = Math.min(dv.oxirUnix, hozirUnix);
  // «Тугатдим» 05:00 гача ОЛДИНГИ кунга тегишли: давр бошидаги 00:00–05:00 — ўтган даврники,
  // давр охиридан кейинги тонгги 00:00–05:00 эса шу даврники.
  const ishDan = dv.boshUnix + TUGATISH_GACHA;
  const ishGacha = Math.min(dv.oxirUnix + TUGATISH_GACHA, hozirUnix);
  const [ish, rag, xab] = await Promise.all([
    env.DB.prepare("SELECT hodim, tur, vaqt, kim, kim_ism, izoh FROM bonus_ish WHERE ochirildi = 0 AND vaqt BETWEEN ? AND ?")
      .bind(ishDan, ishGacha).all(),
    env.DB.prepare("SELECT id, kimga, kimga_hodim, matn, kim, kim_ism, vaqt, summa FROM bonus_ragbat WHERE vaqt BETWEEN ? AND ? ORDER BY vaqt")
      .bind(dv.boshUnix, oxir).all(),
    // Расмлар ҳам давр охиридан кейинги тонгги 05:00 гача ўқилади (ҳайдовчининг ярим тундан кейинги кечқуруни)
    // 30 дақиқа олдиндан: давр чегарасидаги юк (15-куни 23:50 + 16-куни 00:05) иккала даврда ёзилмасин —
    // биринчи расми олдинги даврда бўлган юк davrda() филтрида тушиб қолади
    env.DB.prepare("SELECT guruh, uid, ism, vaqt, matn, albom, msg_id, rasm_id FROM bonus_xabar WHERE rasm = 1 AND vaqt BETWEEN ? AND ?")
      .bind(dv.boshUnix - BIR_YUK_SEK, ishGacha).all(),
  ]);
  // 📍 «Тошкентга кирдим» тугмаси; жадвал йўқ бўлса — бўш
  let tugma = [];
  try {
    const r = await env.DB.prepare("SELECT hodim, vaqt, km FROM bonus_kirish WHERE vaqt BETWEEN ? AND ?")
      .bind(ishDan, ishGacha).all();
    tugma = r.results || [];
  } catch (e) { console.error("bonus_kirish:", e && e.message); }
  // ⚠️ Огоҳлантириш ва 💸 жарима (Достон 2026-11-11) — Excel'да алоҳида варақ; жадвал йўқ бўлса — бўш
  const qoshimcha = async (sql) => {
    // 📅 Достон 2026-11-11: Excel'да фақат 17.11.2026 дан (ундан олдингилари — синов ёзувлари) кўринади
    try { const r = await env.DB.prepare(sql).bind(dv.boshUnix, oxir).all(); return (r.results || []).map((x) => ({ ...x, sana: toshkent(x.vaqt).sana })).filter((x) => x.sana >= OGOH_JARIMA.bosh); }
    catch (e) { console.error("ogoh/jarima:", e && e.message); return []; }
  };
  const ogoh = await qoshimcha("SELECT id, kimga, kimga_hodim, matn, kim, kim_ism, vaqt FROM bonus_ogoh WHERE vaqt BETWEEN ? AND ? ORDER BY vaqt");
  const jarima = await qoshimcha("SELECT id, kimga, kimga_hodim, tur_nom, narx, kim, kim_ism, vaqt FROM bonus_jarima WHERE vaqt BETWEEN ? AND ? ORDER BY vaqt");
  const davrda = (q) => q.sana >= dv.bosh && q.sana <= dv.oxir;
  const rasmlar = xab.results || [];
  const ishQator = [...ishHisob(ish.results || []), ...haydovchiSoat(rasmlar, tugma, ish.results || [])].filter(davrda)
    .sort((a, b) => a.hodim.nom.localeCompare(b.hodim.nom, "ru") || a.sana.localeCompare(b.sana));
  const yuk = (guruh) => { const r = yukHisob(rasmlar, guruh); return { ...r, yuklar: r.yuklar.filter(davrda) }; };
  const tp = yuk("topshirish"), ol0 = yuk("olish");
  const ol = { ...ol0, yuklar: juftOchir(ol0.yuklar, tp.yuklar) };
  return {
    davr: dv, gacha: oxir,
    ish: ishQator,
    olish: ol,
    topshirish: tp,
    ragbat: (rag.results || []).map((r) => ({ ...r, sana: toshkent(r.vaqt).sana })),
    ogoh, jarima,
  };
}

/* ============================ 📊 EXCEL ============================
 * Кўриниш — Раҳбар акага аввал берилган «Рағбатлантириш ва бонус (16.08.2026-15.09.2026).xlsx»
 * билан бир хил (Достон 2026-09-17): сарлавҳа · давр · тўқ кўк устун сарлавҳаси · ҳар ходимга оч кўк
 * қатор (жамиси билан) · унинг ёзувлари · сариқ ЖАМИ · пастда «ҲАР БИР ХОДИМНИНГ УМУМИЙ …» жадвали.
 * Ҳар устунда фақат ўша устуннинг маълумоти.                                                     */
const c = (v, s) => ({ v, s });
const excelSana = (sana) => Math.floor(Date.parse(sana + "T00:00:00Z") / 86400000) + 25569;
const soatQiymat = (min) => min / 1440;           // [h]:mm учун кун улуши
const ustunHarf = (n) => String.fromCharCode(64 + n);

/** Иш тури — аввалги файлдагидек: «Газел/Исузу қўшимча ишлагани учун» */
function ishTuri(h, m = h.mashina) {
  const nom = m ? (m === "kichik" ? "Ван/Лабо" : "Газел/Исузу") : h.bolim;
  return `${nom} қўшимча ишлагани учун`;
}

// Давр ичида машина алмашган бўлса — иккаласи ҳам кўринади
const yagona = (xs) => [...new Set(xs.filter(Boolean))].join(", ");
const ishTurlari = (g) => yagona(g.qatorlar.map((q) => ishTuri(g.hodim, q.mashina)));
const mashinalar = (g) => yagona(g.qatorlar.map((q) => MASHINA_NOMI[q.mashina]));

// 👥 Иловадан қўшилган ходим: исми ёнида ким қўшгани, катаги оч яшил (Достон 2026-09-18)
const nomLabel = (h) => (h && h.qoshilgan ? `${h.nom} (қўшди: ${h.qoshdi || "?"})` : (h ? h.nom : ""));
const nomUslub = (h, oddiy) => (h && h.qoshilgan ? (oddiy === S.BN_GURUH ? S.BN_QOSH_B : S.BN_QOSH) : oddiy);

function varaqBoshi(rows, merge, sarlavha, davrMatn, ustunlar, bosh) {
  const L = ustunHarf(ustunlar);
  rows.push([c(sarlavha, S.BN_SARLAVHA)]); merge.push(`A1:${L}1`);
  rows.push([c(davrMatn, S.BN_DAVR)]); merge.push(`A2:${L}2`);
  rows.push([]);
  rows.push(bosh.map((t) => c(t, S.BN_BOSH)));
}
/** Пастки жадвал сарлавҳаси: 2 бўш қатор, номи, устун сарлавҳалари */
function pastkiBoshi(rows, merge, nom, bosh) {
  rows.push([], []);
  rows.push([c(nom, S.BN_SARLAVHA)]);
  merge.push(`A${rows.length}:${ustunHarf(bosh.length)}${rows.length}`);
  rows.push(bosh.map((t) => c(t, S.BN_BOSH)));
}
const bosQator = (n) => Array.from({ length: n }, () => c("", S.BN_GURUH));
const jamiQator = (n) => Array.from({ length: n }, () => c("", S.BN_JAMI));

/** Ходим бўйича гуруҳлаш: [{ hodim, qatorlar }] (исм бўйича) */
function guruhla(qatorlar) {
  const m = new Map();
  for (const q of qatorlar) {
    if (!m.has(q.hodim.id)) m.set(q.hodim.id, { hodim: q.hodim, qatorlar: [] });
    m.get(q.hodim.id).qatorlar.push(q);
  }
  return [...m.values()].sort((a, b) => a.hodim.nom.localeCompare(b.hodim.nom, "ru"));
}

/* ── 1. ИШБАЙ (иш вақтидан ташқари) ──
   № | Сана | Ходим | Иш тури | Нархи | Бошлади | Тугатди | Ишлаган вақти | Суммаси | Ким ёзди */
function ishVaraq(d, davrMatn, boshlasiz = false) {
  // 🚚 Достон 2026-10-13: ҳайдовчида эрталабки соат йўқ — «Бошлади» устуни ҳам кўрсатилмайди
  const rows = [], merge = [];
  const ust = ["№", "Сана", "Ходим", "Иш тури", "Нархи", ...(boshlasiz ? [] : ["Бошлади"]),
    "Тугатди", "Ишлаган вақти", "Суммаси", "Ким ёзди", "Нима иш қилди"];
  const U = ust.length, iV = U - 4, iS = U - 3;
  varaqBoshi(rows, merge, "Иш вақтидан ташқари қўшимча ишлаган ходимлар ҳисоботи", davrMatn, U, ust);
  const gr = guruhla(d.ish);
  let jamiMin = 0, jamiSum = 0;
  gr.forEach((g, gi) => {
    const gm = g.qatorlar.reduce((s, q) => s + q.jami, 0), gs = g.qatorlar.reduce((s, q) => s + q.summa, 0);
    const r = bosQator(U);
    r[0] = c(gi + 1, S.BN_GURUH_SON); r[2] = c(nomLabel(g.hodim), nomUslub(g.hodim, S.BN_GURUH)); r[3] = c(ishTurlari(g), S.BN_GURUH);
    r[iV] = c(soatQiymat(gm), S.BN_GURUH_SOAT); r[iS] = c(gs, S.BN_GURUH_SON);
    rows.push(r);
    g.qatorlar.forEach((q, i) => {
      rows.push([c(i + 1, S.SON), c(excelSana(q.sana), S.SANA), c(nomLabel(q.hodim), nomUslub(q.hodim, S.MATN)), c(ishTuri(q.hodim, q.mashina), S.MATN), c(q.tarif, S.SON),
                 ...(boshlasiz ? [] : [c(q.boshladi, S.MATN)]), c(q.tugatdi, S.MATN), c(soatQiymat(q.jami), S.BN_SOAT), c(q.summa, S.SON),
                 c(q.yozdi, S.MATN), c(q.izoh || "", S.MATN)]);
    });
    jamiMin += gm; jamiSum += gs;
  });
  const j = jamiQator(U);
  j[2] = c("ЖАМИ", S.BN_JAMI); j[iV] = c(soatQiymat(jamiMin), S.BN_JAMI_SOAT); j[iS] = c(jamiSum, S.BN_JAMI_SON);
  rows.push(j);

  pastkiBoshi(rows, merge, "ҲАР БИР ХОДИМНИНГ УМУМИЙ ҚЎШИМЧА ИШ СУММАСИ", ["№", "Ходим", "Иш тури", "Марта", "Жами вақт", "Жами сумма"]);
  gr.forEach((g, i) => {
    rows.push([c(i + 1, S.SON), c(nomLabel(g.hodim), nomUslub(g.hodim, S.MATN)), c(ishTurlari(g), S.MATN), c(g.qatorlar.length, S.SON),
               c(soatQiymat(g.qatorlar.reduce((s, q) => s + q.jami, 0)), S.BN_SOAT), c(g.qatorlar.reduce((s, q) => s + q.summa, 0), S.SON_B)]);
  });
  rows.push([c("", S.BN_JAMI), c("ЖАМИ", S.BN_JAMI), c("", S.BN_JAMI), c(d.ish.length, S.BN_JAMI_SON),
             c(soatQiymat(jamiMin), S.BN_JAMI_SOAT), c(jamiSum, S.BN_JAMI_SON)]);
  return { name: "Ишбай", rows, merge, freeze: 4, cols: [5, 12, 18, 34, 11, ...(boshlasiz ? [] : [10]), 10, 13, 13, 34, 40] };
}

/* ── 2–3. ЮК ОЛИШ / ЮК ТОПШИРИШ ──
   № | Сана | Вақт | Ҳайдовчи | Машина | Шаҳар | Бонус | Расм | Расм изоҳи */
function yukVaraq(nomi, sarlavha, r, davrMatn) {
  const rows = [], merge = [], U = 9;
  varaqBoshi(rows, merge, sarlavha, davrMatn, U, ["№", "Сана", "Вақт", "Ҳайдовчи", "Машина", "Шаҳар", "Бонус", "Расм", "Расм изоҳи"]);
  const gr = guruhla(r.yuklar);
  let jami = 0;
  gr.forEach((g, gi) => {
    const gs = g.qatorlar.reduce((s, q) => s + q.bonus, 0);
    const q0 = bosQator(U);
    q0[0] = c(gi + 1, S.BN_GURUH_SON); q0[3] = c(g.hodim.nom, S.BN_GURUH); q0[4] = c(mashinalar(g), S.BN_GURUH);
    q0[6] = c(gs, S.BN_GURUH_SON);   // юк сони — пастки жадвалда «Жами юк»
    rows.push(q0);
    g.qatorlar.forEach((q, i) => {
      rows.push([c(i + 1, S.SON), c(excelSana(q.sana), S.SANA), c(q.vaqt, S.MATN), c(q.hodim.nom, S.MATN), c(MASHINA_NOMI[q.mashina], S.MATN),
                 c(q.tashqari ? "Шаҳардан ташқари (2x)" : "Шаҳар ичи", S.MATN), c(q.bonus, S.SON), c(q.rasm, S.SON), c(q.izoh, S.MATN)]);
    });
    jami += gs;
  });
  const j = jamiQator(U);
  j[3] = c("ЖАМИ", S.BN_JAMI); j[6] = c(jami, S.BN_JAMI_SON);
  rows.push(j);

  pastkiBoshi(rows, merge, "ҲАР БИР ҲАЙДОВЧИНИНГ УМУМИЙ БОНУСИ", ["№", "Ҳайдовчи", "Машина", "Шаҳар ичи", "Ташқари (2x)", "Жами юк", "Жами бонус"]);
  gr.forEach((g, i) => {
    const ichi = g.qatorlar.filter((q) => !q.tashqari).length, tash = g.qatorlar.length - ichi;
    rows.push([c(i + 1, S.SON), c(g.hodim.nom, S.MATN), c(mashinalar(g), S.MATN), c(ichi, S.SON), c(tash, S.SON),
               c(g.qatorlar.length, S.SON), c(g.qatorlar.reduce((s, q) => s + q.bonus, 0), S.SON_B)]);
  });
  const ichiJ = r.yuklar.filter((q) => !q.tashqari).length;
  rows.push([c("", S.BN_JAMI), c("ЖАМИ", S.BN_JAMI), c("", S.BN_JAMI), c(ichiJ, S.BN_JAMI_SON), c(r.yuklar.length - ichiJ, S.BN_JAMI_SON),
             c(r.yuklar.length, S.BN_JAMI_SON), c(jami, S.BN_JAMI_SON)]);
  return { name: nomi, rows, merge, freeze: 4, cols: [5, 12, 8, 18, 24, 22, 12, 7, 45] };
}

/* ── 4. РАҒБАТ ── аввалги файлдагидек:
   № | Сана | Ходим | Рағбатлантириш (хабар тексти) | Сумма | Изоҳ — суммани Раҳбар ака ёзади */
function ragbatVaraq(d, davrMatn) {
  const rows = [], merge = [], U = 6;
  varaqBoshi(rows, merge, "Рағбатлантириш (ишхона учун фойдали иш қилганлар)", davrMatn, U,
    ["№", "Сана", "Ходим", "Рағбатлантириш (хабар тексти)", "Сумма", "Изоҳ"]);
  const b1 = rows.length + 1;
  const ragNom = (r) => { const h = r.kimga_hodim ? hodimOl(r.kimga_hodim) : null; return h && h.qoshilgan ? nomLabel(h) : r.kimga; };
  const ragUslub = (r) => nomUslub(r.kimga_hodim ? hodimOl(r.kimga_hodim) : null, S.MATN);
  d.ragbat.forEach((r, i) => {
    rows.push([c(i + 1, S.SON), c(excelSana(r.sana), S.SANA), c(ragNom(r), ragUslub(r)), c(r.matn, S.MATN), c(Number(r.summa) || "", S.BN_SUMMA),
               c(`Ёзган: ${r.kim_ism || ""}`, S.MATN)]);
  });
  const o1 = Math.max(rows.length, b1);
  const j = jamiQator(U);
  j[3] = c("ЖАМИ", S.BN_JAMI); j[4] = d.ragbat.length ? { f: `SUM(E${b1}:E${o1})`, s: S.BN_JAMI_SON } : c(0, S.BN_JAMI_SON);
  rows.push(j);

  pastkiBoshi(rows, merge, "ҲАР БИР ХОДИМНИНГ УМУМИЙ РАҒБАТЛАНТИРИШ СУММАСИ", ["№", "Ходим", "Сони", "Жами сумма"]);
  const nomlar = [...new Set(d.ragbat.map(ragNom))].sort((a, b) => a.localeCompare(b, "ru"));
  const nomUsl = new Map(d.ragbat.map((r) => [ragNom(r), ragUslub(r)]));
  const b2 = rows.length + 1;
  nomlar.forEach((nom, i) => {
    const rn = rows.length + 1;
    rows.push([c(i + 1, S.SON), c(nom, nomUsl.get(nom) || S.MATN), c(d.ragbat.filter((r) => ragNom(r) === nom).length, S.SON),
               { f: `SUMIF($C$${b1}:$C$${o1},$B${rn},$E$${b1}:$E$${o1})`, s: S.SON_B }]);
  });
  const o2 = rows.length;
  rows.push([c("", S.BN_JAMI), c("ЖАМИ", S.BN_JAMI), c(d.ragbat.length, S.BN_JAMI_SON),
             { f: nomlar.length ? `SUM(D${b2}:D${o2})` : "0", s: S.BN_JAMI_SON }]);
  return { name: "Рағбат", rows, merge, freeze: 4, cols: [5, 12, 18, 90, 14, 26] };
}

/* ── ⚠️ ОГОҲЛАНТИРИШ ва 💸 ЖАРИМА варақлари (Достон 2026-11-11) ──
 * Бонусга ҚЎШИЛМАЙДИ ҳам, АЙИРИЛМАЙДИ ҳам — фақат ёзиб қўйилади («Жами»да алоҳида кўринади). */
const kimgaNom = (r) => { const h = r.kimga_hodim ? hodimOl(r.kimga_hodim) : null; return h && h.qoshilgan ? nomLabel(h) : r.kimga; };
const kimgaUslub = (r) => nomUslub(r.kimga_hodim ? hodimOl(r.kimga_hodim) : null, S.MATN);
/* ⚠️ Огоҳлантириш — рағбатдек: матн ёзилади, СУММАНИ ой охирида Раҳбар ака ўзи ёзади (E устуни бўш).
 * «Жами» варақлари шу устунга формула билан боғланган — нарх ёзилса, ўзи ҳисоблайди. */
function ogohVaraq(d, davrMatn) {
  const rows = [], merge = [], U = 6;
  const a = d.ogoh || [];
  varaqBoshi(rows, merge, "Огоҳлантиришлар", davrMatn, U, ["№", "Сана", "Ходим", "Огоҳлантириш (хабар тексти)", "Сумма", "Ёзган"]);
  const b1 = rows.length + 1;
  a.forEach((r, i) => rows.push([c(i + 1, S.SON), c(excelSana(r.sana), S.SANA), c(kimgaNom(r), kimgaUslub(r)), c(r.matn, S.MATN), c("", S.BN_SUMMA), c(r.kim_ism || "", S.MATN)]));
  const o1 = Math.max(rows.length, b1);
  const j = jamiQator(U);
  j[2] = c("ЖАМИ", S.BN_JAMI); j[3] = c(`${a.length} та огоҳлантириш`, S.BN_JAMI);
  j[4] = a.length ? { f: `SUM(E${b1}:E${o1})`, s: S.BN_JAMI_SON } : c(0, S.BN_JAMI_SON);
  rows.push(j);
  pastkiBoshi(rows, merge, "ҲАР БИР ХОДИМНИНГ ОГОҲЛАНТИРИШЛАРИ", ["№", "Ходим", "Сони", "Жами сумма"]);
  const nomlar = [...new Set(a.map(kimgaNom))].sort((x, y) => x.localeCompare(y, "ru"));
  const b2 = rows.length + 1;
  nomlar.forEach((nom, i) => {
    const rn = rows.length + 1;
    rows.push([c(i + 1, S.SON), c(nom, S.MATN), c(a.filter((r) => kimgaNom(r) === nom).length, S.SON),
               { f: `SUMIF($C$${b1}:$C$${o1},$B${rn},$E$${b1}:$E$${o1})`, s: S.SON_B }]);
  });
  const o2 = rows.length;
  rows.push([c("", S.BN_JAMI), c("ЖАМИ", S.BN_JAMI), c(a.length, S.BN_JAMI_SON), { f: nomlar.length ? `SUM(D${b2}:D${o2})` : "0", s: S.BN_JAMI_SON }]);
  return { name: "Огоҳлантириш", rows, merge, freeze: 4, cols: [5, 12, 22, 80, 14, 22] };
}
function jarimaVaraq(d, davrMatn) {
  const rows = [], merge = [], U = 6;
  const a = d.jarima || [];
  varaqBoshi(rows, merge, "Жарималар", davrMatn, U, ["№", "Сана", "Ходим", "Жарима", "Сумма", "Ёзган"]);
  const b1 = rows.length + 1;
  a.forEach((r, i) => rows.push([c(i + 1, S.SON), c(excelSana(r.sana), S.SANA), c(kimgaNom(r), kimgaUslub(r)), c(r.tur_nom, S.MATN), c(Number(r.narx) || 0, S.SON), c(r.kim_ism || "", S.MATN)]));
  const o1 = Math.max(rows.length, b1);
  const j = jamiQator(U);
  j[2] = c("ЖАМИ", S.BN_JAMI); j[3] = c(`${a.length} та жарима`, S.BN_JAMI);
  j[4] = a.length ? { f: `SUM(E${b1}:E${o1})`, s: S.BN_JAMI_SON } : c(0, S.BN_JAMI_SON);
  rows.push(j);
  pastkiBoshi(rows, merge, "ҲАР БИР ХОДИМНИНГ ЖАРИМАЛАРИ", ["№", "Ходим", "Сони", "Жами сумма"]);
  const nomlar = [...new Set(a.map(kimgaNom))].sort((x, y) => x.localeCompare(y, "ru"));
  nomlar.forEach((nom, i) => {
    const q = a.filter((r) => kimgaNom(r) === nom);
    rows.push([c(i + 1, S.SON), c(nom, S.MATN), c(q.length, S.SON), c(q.reduce((s, r) => s + (Number(r.narx) || 0), 0), S.SON_B)]);
  });
  rows.push([c("", S.BN_JAMI), c("ЖАМИ", S.BN_JAMI), c(a.length, S.BN_JAMI_SON), c(a.reduce((s, r) => s + (Number(r.narx) || 0), 0), S.BN_JAMI_SON)]);
  return { name: "Жарима", rows, merge, freeze: 4, cols: [5, 12, 22, 40, 14, 22] };
}
/** «Жами» варағининг тагида — огоҳлантириш ва жарима (бонус жамисига КИРМАЙДИ) */
function ogohJarimaJami(rows, d) {
  const og = d.ogoh || [], ja = d.jarima || [];
  if (!og.length && !ja.length) return;
  rows.push([], [c("Огоҳлантириш ва жарима (бонусга қўшилмайди ҳам, айирилмайди ҳам)", S.BN_SARLAVHA)]);
  // Огоҳлантириш суммаси — «Огоҳлантириш» варағининг Сумма устунидан (Раҳбар ака ёзади)
  if (og.length) rows.push([c("", S.SON), c("Огоҳлантириш (суммасини Раҳбар ака ёзади)", S.MATN), c(`${og.length} та`, S.MATN),
    { f: `SUM('Огоҳлантириш'!E5:E${4 + og.length})`, s: S.BN_SUMMA }]);
  if (ja.length) rows.push([c("", S.SON), c("Жарима", S.MATN), c(`${ja.length} та`, S.MATN), c(ja.reduce((s, r) => s + (Number(r.narx) || 0), 0), S.BN_SUMMA)]);
}

/* ── 5. ҚЎШИЛГАНЛАР ── иловадан ким кимни қўшди / ўчирди (Достон 2026-09-18)
   № | Ходим | Тариф | Қўшди | Қачон | Ҳолати | Ўчирди | Қачон */
/** Фаол (ўчирилмаган) қўшилган ходимлар — Достон 2026-09-30: ўчирилгани Excel'да кўринмайди */
const faolQoshilgan = () => qoshilganlar().filter((h) => !h.ketgan);
function qoshilganVaraq(davrMatn) {
  const rows = [], merge = [], U = 5;
  varaqBoshi(rows, merge, "Иловадан рўйхатга қўшилган ходимлар (оч яшил — бошқа варақларда ҳам)", davrMatn, U,
    ["№", "Ходим", "Тариф", "Қўшди", "Қачон"]);
  const vaqtMatn = (u) => { if (!u) return ""; const t = toshkent(u); return `${sanaUz(t.sana)} ${hhmm(t.min)}`; };
  faolQoshilgan().sort((a, b) => a.qoshVaqt - b.qoshVaqt).forEach((h, i) => {
    rows.push([c(i + 1, S.SON), c(h.nom, S.BN_QOSH), c(h.tarif, S.SON), c(h.qoshdi || "?", S.MATN), c(vaqtMatn(h.qoshVaqt), S.MATN)]);
  });
  return { name: "Қўшилганлар", rows, merge, freeze: 4, cols: [5, 22, 11, 22, 17] };
}

/* ── 📊 ЖАМИ варағи (Достон 2026-10-13): ходим Excel'ни очиши биланоқ умумий суммасини кўрсин ── */
function jamiVaraq(d2, h, davrMatn) {
  const rows = [], merge = [], U = 4;
  varaqBoshi(rows, merge, "Умумий бонус", davrMatn, U, ["№", "Бўлим", "Сони", "Сумма"]);
  const soat = d2.ish.reduce((s, z) => s + (z.jami || 0), 0);
  const ol = d2.olish.yuklar, tp = d2.topshirish.yuklar;
  const pul = (a) => a.reduce((s, y) => s + (y.bonus || 0), 0);
  const satr = [
    ["Иш вақти (қўшимча соат)", `${Math.floor(soat / 60)} соат ${String(soat % 60).padStart(2, "0")} дақиқа`,
     d2.ish.reduce((s, z) => s + (z.summa || 0), 0)],
    ["Юк олиш", `${ol.length} юк`, pul(ol)],
  ];
  // 🔒 Достон 2026-10-16: ходимнинг ШАХСИЙ файлида «Юк топшириш» КЎРИНМАЙДИ (TOPSHIRISH_SHAXSIY).
  if (TOPSHIRISH_SHAXSIY) satr.push(["Юк топшириш", `${tp.length} юк`, pul(tp)]);
  // 🎁 Рағбатлантириш — ҳамма ходимда (ҳайдовчида ҳам: Раҳбар ака уларга ҳам ёзган).
  // 💰 Достон 2026-10-19: «Excel'да рағбат ёзилиб турсин, ой охирида Раҳбар ака нархни ўзи ёзади».
  // Шунинг учун сумма «Рағбат» варағининг Сумма устунига БОҒЛАНГАН: у ерга нарх ёзилса,
  // «Жами» ўзи қайта ҳисоблайди (базада summa бўлмаса ҳам файл ичида ишлайди).
  const rag = d2.ragbat || [];
  if (rag.length) satr.push([rag.every((r) => !Number(r.summa)) ? "Рағбатлантириш (нархини Раҳбар ака ёзади)" : "Рағбатлантириш",
    `${rag.length} ёзув`, { f: `SUM('Рағбат'!E5:E${4 + rag.length})` }]);
  const b1 = rows.length + 1;
  satr.forEach((r, i) => rows.push([c(i + 1, S.SON), c(r[0], S.MATN), c(r[1], S.MATN),
    (r[2] && r[2].f) ? { ...r[2], s: S.BN_SUMMA } : c(r[2], S.BN_SUMMA)]));
  const o1 = rows.length;
  rows.push([c("", S.BN_JAMI), c("ЖАМИ", S.BN_JAMI), c("", S.BN_JAMI), { f: `SUM(D${b1}:D${o1})`, s: S.BN_JAMI_SON }]);
  ogohJarimaJami(rows, d2);
  return { name: "Жами", rows, merge, freeze: 4, cols: [5, 30, 20, 18] };
}

/* 🔒 Достон 2026-10-16: «Юк топшириш бонусини ҳамма ходимдан ўчириб тур — ходимлар
 * кўролмасин, фақат Раҳбар ака учун чиқариб қўй». Ходимнинг ШАХСИЙ файлида бу варақ
 * ҳам, «Жами»даги қатори ҳам йўқ. Раҳбар аканинг тўлиқ файлида аввалгидек туради.
 * Қайта очиш: true қилиб қўйинг.                                                      */
export const TOPSHIRISH_SHAXSIY = false;

/**
 * 👤 Битта ходимнинг ўз .xlsx'и (Достон 2026-09-29): Жами · Ишбай · Юк олиш
 * (+ Юк топшириш — TOPSHIRISH_SHAXSIY ёқилган бўлса).
 * Фақат ўша одамнинг қаторлари — бошқа ходимларнинг пули кўринмайди.
 */
export async function shaxsiyExcel(d, h) {
  const tw = d.gacha < d.davr.oxirUnix;
  const davrMatn = `${h.nom} · ${sanaUz(d.davr.bosh)} - ${sanaUz(d.davr.oxir)}` + (tw ? `  (${sanaUz(toshkent(d.gacha).sana)} гача)` : "");
  const meniki = (x) => x && x.hodim && x.hodim.id === h.id;
  const d2 = {
    ...d,
    ish: (d.ish || []).filter(meniki),
    olish: { ...d.olish, yuklar: (d.olish.yuklar || []).filter(meniki) },
    topshirish: { ...d.topshirish, yuklar: (d.topshirish.yuklar || []).filter(meniki) },
    // 🎁 Рағбат варағи ҚЎШИЛДИ (Достон 2026-10-08): аввал шахсий Excel'да бу варақ умуман
    // йўқ эди — Ходим15 23.09 ва 26.09 даги рағбатини кўрмаган, «ёзилмаган» деб ўйлаган.
    ragbat: (d.ragbat || []).filter((r) => Number(r.kimga_hodim) === h.id),
    ogoh: (d.ogoh || []).filter((r) => Number(r.kimga_hodim) === h.id),
    jarima: (d.jarima || []).filter((r) => Number(r.kimga_hodim) === h.id),
  };
  // Бўш варақда «ёзув йўқ» деб ёзамиз — ходим чалкашмасин (Достон 2026-09-29)
  const bosIzoh = (v, bor, matn) => { if (!bor) { v.rows.push([], [c(matn, S.BN_SARLAVHA)]); } return v; };
  // 📋 Варақлар тартиби — Раҳбар ака берган «тўғриланган» файлдагидек (Достон 2026-10-17):
  //    Жами · Ишбай · Рағбат · Юк олиш. «Жами» — янги бўлим: ходим очиши биланоқ
  //    ўзининг умумий пулини кўради (иш вақти + юк олиш + рағбатлантириш).
  return buildXlsx([
    jamiVaraq(d2, h, davrMatn),
    // 🚚 Достон 2026-10-19: ҳайдовчида «Бошлади» устуни фақат эрталабки ёзуви БЎЛМАСА яширилади
    // (Ходим15нинг 25.09 даги 06:00 и ҳожайиннинг файлида кўринади — бизда ҳам кўринсин)
    bosIzoh(ishVaraq(d2, davrMatn, Boolean(h.mashina) && !(d2.ish || []).some((q) => q.boshladi)), d2.ish.length, "Бу даврда қўшимча ишлаган вақт ёзилмаган"),
    // 🎁 Рағбат ҳамма ходимда (ҳайдовчида ҳам): Раҳбар аканинг файлида ҳайдовчиларга ҳам
    //    рағбат ёзилган — ходим ўз рағбат пулини кўриши керак (Достон 2026-10-17).
    bosIzoh(ragbatVaraq(d2, davrMatn), d2.ragbat.length, "Бу даврда рағбатлантириш ёзилмаган"),
    // ⚠️💸 Достон 2026-11-11: огоҳлантириш ва жарима — алоҳида варақ (бўлса)
    ...(d2.ogoh.length ? [ogohVaraq(d2, davrMatn)] : []),
    ...(d2.jarima.length ? [jarimaVaraq(d2, davrMatn)] : []),
    ...(TOPSHIRISH_SHAXSIY
      ? [bosIzoh(yukVaraq("Юк топшириш", "Юк топшириш бонуслари", d2.topshirish, davrMatn), d2.topshirish.yuklar.length, "Бу даврда юк топширилмаган")]
      : []),
    bosIzoh(yukVaraq("Юк олиш", "Юк олиш бонуслари", d2.olish, davrMatn), d2.olish.yuklar.length, "Бу даврда юк олинмаган"),
  ]);
}

/** Ходим бўйича йиғма: { h, ish, soat, ol, no, tp, nt, rag, jami } — жамиси бўйича тартибланган */
function hodimJamlanma(d) {
  const m = new Map();
  const qo = (h, k, v) => {
    if (!h) return;
    const q = m.get(h.id) || { h, ish: 0, soat: 0, ol: 0, no: 0, tp: 0, nt: 0, rag: 0, ragPul: 0 };
    q[k] += v; m.set(h.id, q);
  };
  for (const z of d.ish || []) { qo(z.hodim, "ish", z.summa || 0); qo(z.hodim, "soat", z.jami || 0); }
  for (const y of (d.olish && d.olish.yuklar) || []) { qo(y.hodim, "ol", y.bonus || 0); qo(y.hodim, "no", 1); }
  for (const y of (d.topshirish && d.topshirish.yuklar) || []) { qo(y.hodim, "tp", y.bonus || 0); qo(y.hodim, "nt", 1); }
  for (const r of d.ragbat || []) {
    const h = r.kimga_hodim ? hodimOl(Number(r.kimga_hodim)) : null;
    qo(h, "rag", 1); qo(h, "ragPul", Number(r.summa) || 0);
  }
  return [...m.values()].map((q) => ({ ...q, jami: q.ish + q.ol + q.tp + q.ragPul })).sort((x, y) => y.jami - x.jami);
}

/* ── 📊 «ХОДИМЛАР ЖАМИ» варағи (Достон 2026-10-16, Раҳбар аканинг эски файлидагидек):
 *    ҳар бир ходим БИТТА қаторда — скрол қилмасдан ҳаммани кўради.
 *    «Округлит» ЙЎҚ (ишхонанинг зарарига ишларди) — сумма аниқ.                        */
function hodimlarJamiVaraq(d, davrMatn) {
  const rows = [], merge = [], U = 6;
  // Устунлар Раҳбар аканинг эски файлидагидек: исмдан кейин ДАРҲОЛ «Жами олиши керак».
  // 🔒 Достон 2026-10-16: «Юк топшириш» бу файлда УМУМАН йўқ — алоҳида файлда (topshirishExcel).
  varaqBoshi(rows, merge, "ХОДИМЛАРГА ҲИСОБЛАНГАН БОНУСЛАР", davrMatn, U,
    ["№", "Ходим", "Жами олиши керак", "Ишбай (иш ташқари)", "Рағбатлантириш", "Юк олиш бонуси"]);
  const a = hodimJamlanma(d).map((q) => ({ ...q, jami: q.ish + q.ol + q.ragPul }))
    .filter((q) => q.ish || q.ol || q.ragPul).sort((x, y) => y.jami - x.jami);
  const b1 = rows.length + 1;
  a.forEach((q, i) => rows.push([
    c(i + 1, S.SON), c(nomLabel(q.h), nomUslub(q.h, S.MATN)), c(q.jami, S.SON_B),
    c(q.ish, S.SON), c(q.ragPul || "", S.SON), c(q.no ? q.ol : "", S.SON),
  ]));
  const o1 = rows.length;
  const j = jamiQator(U);
  j[1] = c("ЖАМИ · " + a.length + " киши", S.BN_JAMI);
  for (const [i, h] of [[2, "C"], [3, "D"], [4, "E"], [5, "F"]])
    j[i] = { f: `SUM(${h}${b1}:${h}${o1})`, s: S.BN_JAMI_SON };
  rows.push(j);
  return { name: "Ходимлар Жами", rows, merge, freeze: 4, cols: [5, 26, 20, 20, 18, 18] };
}

/* ── 📊 «ЖАМИ СУММА» варағи — Раҳбар аканинг эски файлидаги кўриниш ── */
function jamiSummaVaraq(d, davrMatn) {
  const rows = [], merge = [], U = 4;
  varaqBoshi(rows, merge, "Ходимларга ҳисобланган бонуслар ва рағбатлантиришлар ҳисоботи", davrMatn, U,
    ["№", "Бўлим", "Сони", "Сумма"]);
  const ol = (d.olish && d.olish.yuklar) || [];
  const soat = (d.ish || []).reduce((s, z) => s + (z.jami || 0), 0);
  const pul = (x) => x.reduce((s, y) => s + (y.bonus || 0), 0);
  const satr = [
    ["Ходимлар ишдан ташқари ишлаган суммаси", `${Math.floor(soat / 60)} соат ${String(soat % 60).padStart(2, "0")} дақиқа`,
     (d.ish || []).reduce((s, z) => s + (z.summa || 0), 0)],
    ["Ходимлар юк олиш бонуси суммаси", `${ol.length} юк`, pul(ol)],
    // 🔒 «Ходимлар юк топшириш бонуси» бу файлда ЙЎҚ — алоҳида файлда (Достон 2026-10-16)
    // 💰 Достон 2026-10-19: нархни ой охирида Раҳбар ака ўзи ёзади — шунинг учун бу катак
    // «Рағбат» варағининг Сумма устунига боғланган (у ерга ёзса, бу ер ўзи ҳисоблайди).
    ["Ходимларга рағбатлантириш суммаси", `${(d.ragbat || []).length} ёзув`,
     (d.ragbat || []).length ? { f: `SUM('Рағбат'!E5:E${4 + (d.ragbat || []).length})` }
       : (d.ragbat || []).reduce((s2, r) => s2 + (Number(r.summa) || 0), 0)],
  ];
  const b1 = rows.length + 1;
  satr.forEach((r, i) => rows.push([c(i + 1, S.SON), c(r[0], S.MATN), c(r[1], S.MATN),
    (r[2] && r[2].f) ? { ...r[2], s: S.BN_SUMMA } : c(r[2], S.BN_SUMMA)]));
  const o1 = rows.length;
  rows.push([c("", S.BN_JAMI), c("Жами", S.BN_JAMI), c(hodimJamlanma(d).length + " киши", S.BN_JAMI),
             { f: `SUM(D${b1}:D${o1})`, s: S.BN_JAMI_SON }]);
  ogohJarimaJami(rows, d);
  return { name: "Жами сумма", rows, merge, freeze: 4, cols: [5, 42, 20, 20] };
}
/** Синовлар учун: Раҳбар ака файлидаги варақлар (xlsx'ни очмасдан текшириш) */
/* Варақлар тартиби — Раҳбар аканинг эски файлидагидек (Достон 2026-10-16):
 * Ишбай · Рағбат · Юк олиш · Ходимлар Жами · Жами сумма (+ Қўшилганлар).
 * 🔒 «Юк топшириш»нинг тўлиқ рўйхати бу файлда ЙЎҚ — алоҳида файлда (topshirishExcel),
 *    фақат Раҳбар ака юклайди. Суммаси «Ходимлар Жами» ва «Жами сумма»да туради.          */
export const bonusVaraqlar = (d, davrMatn = "") => [
  ishVaraq(d, davrMatn),
  ragbatVaraq(d, davrMatn),
  ...((d.ogoh || []).length ? [ogohVaraq(d, davrMatn)] : []),
  ...((d.jarima || []).length ? [jarimaVaraq(d, davrMatn)] : []),
  yukVaraq("Юк олиш", "Юк олиш бонуслари", d.olish, davrMatn),
  hodimlarJamiVaraq(d, davrMatn),
  jamiSummaVaraq(d, davrMatn),
  ...(faolQoshilgan().length ? [qoshilganVaraq(davrMatn)] : []),
];

/** Давр маълумотидан .xlsx: Ишбай · Рағбат · Юк олиш · Ходимлар Жами · Жами сумма */
export async function bonusExcel(d) {
  const tw = d.gacha < d.davr.oxirUnix;
  const davrMatn = `${sanaUz(d.davr.bosh)} - ${sanaUz(d.davr.oxir)}` + (tw ? `  (${sanaUz(toshkent(d.gacha).sana)} гача)` : "");
  return buildXlsx(bonusVaraqlar(d, davrMatn));   // ўчирилган қўшилганлар варағи умуман чиқмайди
}

/* ── 📊 Юк топшириш файлининг «Жами» варағи (Достон 2026-10-16) ── */
function topshirishJamiVaraq(d, davrMatn) {
  const rows = [], merge = [], U = 6;
  varaqBoshi(rows, merge, "ЮК ТОПШИРИШ БОНУСИ — ЖАМИ", davrMatn, U,
    ["№", "Ҳайдовчи", "Машина", "Жами юк", "Шаҳардан ташқари (2x)", "Жами сумма"]);
  const y = (d.topshirish && d.topshirish.yuklar) || [];
  const m = new Map();
  for (const q of y) {
    const v = m.get(q.hodim.id) || { h: q.hodim, mas: new Set(), n: 0, x: 0, s: 0 };
    v.mas.add(MASHINA_NOMI[q.mashina] || ""); v.n++; if (q.tashqari) v.x++; v.s += q.bonus || 0;
    m.set(q.hodim.id, v);
  }
  const a = [...m.values()].sort((p, q) => q.s - p.s);
  const b1 = rows.length + 1;
  a.forEach((q, i) => rows.push([
    c(i + 1, S.SON), c(nomLabel(q.h), nomUslub(q.h, S.MATN)), c(yagona([...q.mas]), S.MATN),
    c(q.n, S.SON), c(q.x || "", S.SON), c(q.s, S.SON_B),
  ]));
  const o1 = rows.length;
  const j = jamiQator(U);
  j[1] = c("ЖАМИ · " + a.length + " ҳайдовчи", S.BN_JAMI);
  for (const [i, h] of [[3, "D"], [4, "E"], [5, "F"]]) j[i] = { f: `SUM(${h}${b1}:${h}${o1})`, s: S.BN_JAMI_SON };
  rows.push(j);
  return { name: "Жами", rows, merge, freeze: 4, cols: [5, 26, 22, 12, 22, 20] };
}

/* 🚚 ЮК ТОПШИРИШ — АЛОҲИДА файл (Достон 2026-10-16): «ходимлар кўролмасин, Раҳбар ака
 * ўз бўлимидан алоҳида Excel'да юклаб олсин». Жами · Юк топшириш (ҳар бир юк).           */
export async function topshirishExcel(d) {
  const tw = d.gacha < d.davr.oxirUnix;
  const davrMatn = `${sanaUz(d.davr.bosh)} - ${sanaUz(d.davr.oxir)}` + (tw ? `  (${sanaUz(toshkent(d.gacha).sana)} гача)` : "");
  return buildXlsx([
    topshirishJamiVaraq(d, davrMatn),
    yukVaraq("Юк топшириш", "Юк топшириш бонуслари", d.topshirish, davrMatn),
  ]);
}

# Умумий файллардаги БОНУС қисмлари

Бу 5 та файл бошқа лойиҳалар (Ошхона, Склад, Возврат, Ўрикзор, 1С…) билан УМУМИЙ.
Бу ерда ФАҚАТ бонус/рағбатлантиришга тегишли қаторлар (чапда — асл файлдаги қатор рақами).
Аралаш қаторда бошқа лойиҳа қисми «…» билан алмаштирилган. Бошқа лойиҳа ва шерик (Шерик) коди йўқ.

## `src/index.js` — Бот: юк олиш/топшириш гуруҳидаги расмни бонус учун ёзиб олиш

```js
  33│ // 🎁 Бонуслар: юк олиш/топшириш гуруҳларидаги расмларни жимгина ёзиб олади (src/bonus.js)
  34│ import { bonusYoz } from "./bonus.js";
// ……
1058│         // 🎁 Бонуслар: LOGISTIKA ва «Topshirilgan yuk» гуруҳидаги расм — фақат ЁЗИБ ОЛИНАДИ.
1059│         // Хабар «ейилмайди» (consumed ўзгармайди), ҳеч ким жавоб олмайди, хато бўлса ҳам
1060│         // пастдаги ҳеч бир қадамга таъсир қилмайди (bonusYoz ичида try/catch).
1061│         await bonusYoz(env, update.message);
```

## `src/app/worker.js` — Mini App Worker: қўлланма жавоби ва бонус асбоблари (KV навбатлари)

```js
  12│ import { ragbatTakrorOchir, guruhTahrir, qollanmaYubor } from "./bonusapi.js";
// ……
  63│     // 🗑 Такрор рағбат эълони — KV'да навбат бўлса (bonusapi.js ragbatTakrorOchir)
  64│     if (p === "/api/qollanma/javob" && request.method === "POST") {
  65│       try {
  66│         const f = await request.json().catch(() => ({}));
  67│         const ism = String((f && f.ism) || "").replace(/s+/g, " ").trim().slice(0, 40);
  68│         const rol = f && (f.rol === "haydovchi" || f.rol === "xodim") ? f.rol : null;
  69│         if (!ism || !env.DB) return new Response("{}", { status: 400, headers: { "content-type": "application/json" } });
  70│         await env.DB.prepare("INSERT INTO qollanma_tushunmadi (ism, rol, vaqt) VALUES (?,?,?)")
  71│           .bind(ism, rol, Math.floor(Date.now() / 1000)).run();
  72│         return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } });
  73│       } catch (e) {
  74│         console.error("қўлланма жавоби:", e && e.message);
  75│         return new Response("{}", { status: 500, headers: { "content-type": "application/json" } });
  76│       }
  77│     }
// ……
  79│     if (p === "/api" || p.startsWith("/api/") || p === "/app/") { await ragbatTakrorOchir(env); await guruhTahrir(env); await qollanmaYubor(env); }
```

## `src/app/api.js` — Mini App API: бонус бўлимига рухсат, ходим/ҳайдовчи роллари, огоҳлантириш, /bonus йўналиши

```js
  17│ import { bonusApi } from "./bonusapi.js";
// ……
  19│ import { hodimTg, EXCEL_EGASI, HODIMLAR, qoshilganlar, hodimTgLari, hodimlarYukla, OGOH_YOZADI } from "../bonus.js";
// ……
  43│ /** Ходим/ҳайдовчи бўлса — унинг бонус роллари (иловага кирганда ҳам, Созлама рўйхатида ҳам) */
  44│ function hodimRollari(rollar, hodim) {
  45│   if (hodim && hodim.mashina) rollar.add("haydovchi");
  46│   else if (hodim) rollar.add("xodim");
  47│   if (hodim && hodim.ragbatYoq) rollar.add("ragbatsiz");   // белги: «Рағбат» саҳифаси кўрсатилмайди (Ходим15 ака)
  48│   if (hodim && hodim.kirdimYoq) rollar.add("kirdimsiz");   // белги: «Тошкентга кирдим» саҳифаси ҳам йўқ (Ходим15 ака, 2026-10-13)
  49│ }
// ……
 154│   // кира олади — унга фақат «Бонус» бўлими кўринади (app/src/lib/tablar.js → xodim).
 155│   // 🚚 Ҳайдовчи (Достон 2026-09-17): алоҳида рол — иловани очса ТЎҒРИ «Бонус»га киради (src/bonus.js ҳайдовчилари)
 156│   const hodim = hodimTg(uid);
 157│   // Бонус — алоҳида бўлимда (Ходим / Ҳайдовчи); бошқа ролларга аралашмайди (Достон 2026-09-17)
 158│   hodimRollari(Rl.rollar, hodim);
// ……
 160│   // 🎁 Бонус бўлими (Достон 2026-09-17): ФАҚАТ бонус рўйхатидаги ходимлар (ҳайдовчилар билан), супер админ,
 161│   // Достон ва Шерик (тестерлар). Бошқа ҳеч ким (админ, бухгалтер, сотувчи, ошпаз, программист…) кўрмайди.
 162│   // Достон 2026-09-18: сотувчи (13 киши) ва бригадир ҳам — ўз бўлими ичида «Рағбат» саҳифаси
 163│   const bonusRuxsat = Boolean(hodim) || EXCEL_EGASI.includes(Number(uid)) || Rl.tester ||
 164│     ["superadmin", "sotuvchi", "brigadir"].some((r) => Rl.rollar.has(r));
 165│   // ⚠️ Огоҳлантириш (Достон 2026-11-11): фақат 4 киши — иловага «ogoh» белгиси (tablar.js).
 166│   // Бонус бўлими бўлмаган (Админ ака) — ФАҚАТ /bonus (ҳолат) ва /bonus/ogoh; рағбат, Excel ва б. ёпиқ.
 167│   const ogohRuxsat = OGOH_YOZADI.includes(Number(uid));
 168│   const ogohBelgi = ogohRuxsat ? ["ogoh"] : [];
// ……
 209│       rollar: [...Rl.rollar, …, ...ogohBelgi, …],   // ⚠️ «ogoh» белгиси — огоҳлантириш/жарима таблари
// ……
 215│       bonus: bonusRuxsat,
// ……
 233│       hodimRollari(r, hodimTg(id));
// ……
 831│   // ---------- 🎁 бонуслар: иш вақти, рағбатлантириш, Excel (src/app/bonusapi.js) ----------
 832│   if (yol === "/bonus" || yol.startsWith("/bonus/")) {
 833│     if (!bonusRuxsat && !(ogohRuxsat && (yol === "/bonus" || yol === "/bonus/ogoh" || yol === "/bonus/jarima" || yol === "/bonus/jarima/tur"))) return xato("Бонус бўлими сизга ёпиқ", 403);
 834│     const ism = (hodimTg(uid) || {}).nom || ISM[uid] || t.user.first_name || String(uid);
 835│     return bonusApi(request, env, { yol, usul, uid, ism, cfg: Rl.cfg, tester: testerHuquq, superadmin: Rl.rollar.has("superadmin"), korRol, tana, json, xato, natija });
 836│   }
```

## `app/src/lib/tablar.js` — Пастки тугмалар: Иш вақти · Рағбат · Тошкентга кирдим · Огоҳлантириш · Жарима · Бонуслар

```js
   8│ // 🎁 Бонус саҳифалари (Достон 2026-09-18): ҳар бири алоҳида пастки тугма
   9│ const RAGBAT = ["coins", "Рағбат", "ragbat"];
// ……
  27│ // 🎁 Бонуслар — супер админда алоҳида пастки тугма (Достон 2026-09-21)
  28│ const BONUS_TAB = ["coins", "Бонуслар", "bonus"];
  29│ // ⚠️ Огоҳлантириш (Достон 2026-11-11): фақат «ogoh» белгиси борларга (Раҳбар ака, Админ ака, Ходим02, Ходим15 ака).
  30│ // Супер админда — «Бонуслар» ичида; бошқа бўлимларда — алоҳида пастки тугма.
  31│ const OGOH_TAB = ["alert", "Огоҳлантириш", "ogoh"];
  32│ // 💸 Жарималар (Достон 2026-11-11) — шу 4 кишига, огоҳлантириш ёнида
  33│ const JARIMA_TAB = ["ban", "Жарима", "jarima"];
// ……
  36│ const ISHVAQT = ["clock", "Иш вақти", "ishvaqt"];
// ……
  44│ const KIRDIM = ["flag", "Тошкентга кирдим", "kirdim"];
// ……
  52│   sotuvchi: [ …, RAGBAT],   // сотувчида «Рағбат» саҳифаси
// ……
  58│   brigadir: [ …, ISHVAQT, RAGBAT],
// ……
  60│   // 🎁 Бонуслар (2026-09-16): иловада бошқа роли йўқ ҳайдовчи/ишчи — фақат «Бонус».
  61│   // Бошқа ҳамма одамга «Бонус» юқори панелдаги тугмадан очилади (App.svelte).
  62│   // Достон 2026-09-18: очилганда Рағбат, ёнидаги саҳифада «Ишни бошладим / тугатдим»
  63│   xodim: [ISHVAQT, RAGBAT],   // Достон 2026-10-08: очилганда ИШ ВАҚТИ (аввал Рағбат эди)
  64│   // 🚚 Ҳайдовчи (Достон 2026-09-17): иловани очса тўғри «Бонус»
  65│   // Достон 2026-10-12: «Рағбат» ҳайдовчидан ОЛИБ ТАШЛАНДИ — ҳайдовчи рағбат ёзмайди
  66│   // ва унга ҳам ёзилмайди (bonusapi.js kimlarRoyxati). Унинг қўшимча иши расм ва
  67│   // «Тошкентга кирдим» орқали пулга ўтади, рағбат эса пул бермайди.
  69│   haydovchi: [ISHVAQT, KIRDIM],   // Достон 2026-10-12: «Рағбат» ҳайдовчидан ОЛИНДИ
// ……
 209│   // Ходим15 ака (битта «Админ» бўлими): Тасдиқлар · Огоҳлантириш · Ошхона
 210│   if (rollar.includes("ogoh") && t.length && !t.includes(BONUS_TAB) && rol !== "haydovchi") {
 211│     const i = t.indexOf(OSHXONA);
 212│     t = i < 0 ? [...t, OGOH_TAB, JARIMA_TAB] : [...t.slice(0, i), OGOH_TAB, JARIMA_TAB, ...t.slice(i)];
 213│   }
// ……
 230│   if (rol === "brigadir") return rollar.includes("brigadir") ? TABS.brigadir.filter((t) => t !== ISHVAQT || rollar.includes("xodim")) : [];
// ……
 231│   // Достон 2026-09-18: сотувчининг ҳаммасида (Ходим04, Ходим05, Ходим06 ҳам) фақат Ошхона + Рағбат — «Иш вақти» йўқ
// ……
 237│   if (rol === "sotuvchi") return rollar.includes("sotuvchi") ? [ …, RAGBAT] : [];
// ……
 241│   // Ошхонага ҳам овоз берадиган ходим/ҳайдовчида — битта менюда: Рағбат · … · Ошхона
 242│   if (rol === "xodim") return rollar.includes("xodim") ? [...TABS.xodim, ...(rollar.includes("ishchi") ? [OSHXONA] : [])].filter((t) => t !== RAGBAT || !rollar.includes("ragbatsiz")) : [];
 243│   // «ragbatsiz» белгиси (Ходим15 ака, 2026-09-21) — «Рағбат» саҳифаси йўқ
 244│   // «kirdimsiz» белгиси (Ходим15 ака, 2026-10-13) — «Тошкентга кирдим» саҳифаси ҳам йўқ
 245│   if (rol === "haydovchi") return rollar.includes("haydovchi") ? [...TABS.haydovchi, ...(rollar.includes("ishchi") ? [OSHXONA] : [])].filter((t) => (t !== RAGBAT || !rollar.includes("ragbatsiz")) && (t !== KIRDIM || !rollar.includes("kirdimsiz"))) : [];
// ……
 253│   if (rol === "superadmin") return rollar.includes("superadmin")
 254│     ? [ …, BONUS_TAB, … ] : [];   // супер админда «Бонуслар» (ичида Рағбат · Огоҳлантириш · Жарима · Excel)
```

## `app/src/App.svelte` — Илова: бонус экранларини очиш

```svelte
  40│   import Bonus from "./screens/Bonus.svelte";
// ……
  56│                   bonus: "Бонуслар", ragbat: "Рағбатлантириш", ogoh: "Огоҳлантириш", jarima: "Жарималар", ishvaqt: "Иш вақти", kirdim: "Тошкентга кирдим",
// ……
 218│       <!-- 🎁 Бонуслар: ходим/ҳайдовчида — пастки панелда; юқори тугма ФАҚАТ «Супер админ» бўлимида (роллар аралашмасин) -->
 219│       {#if tab !== "bonus" && rol === "superadmin" && me.bonus && !tablar.some((t) => t[2] === "bonus")}
 220│         <button class="xbtn" onclick={() => och("bonus")} aria-label="Бонуслар"><Icon name="coins" size={20} /></button>
 221│       {/if}
// ……
 294│     {:else if tab === "bonus"}
 295│       <Bonus {me} {xabar} />
 296│     {:else if tab === "ragbat"}
 297│       <Bonus {me} {xabar} bolak="ragbat" />
 298│     {:else if tab === "ogoh"}
 299│       <Bonus {me} {xabar} bolak="ogoh" />
 300│     {:else if tab === "jarima"}
 301│       <Bonus {me} {xabar} bolak="jarima" />
 302│     {:else if tab === "ishvaqt"}
 303│       <Bonus {me} {xabar} bolak="ish" />
// ……
 315│     {:else if tab === "kirdim"}
 316│       <Bonus {me} {xabar} bolak="kirdim" />
```

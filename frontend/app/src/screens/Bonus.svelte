<script>
  // 🎁 Бонуслар (2026-09-16): ⏰ Иш вақти · 🎁 Рағбатлантириш · 📊 Excel (Раҳбар ака, Достон).
  // Қоидалар серверда (src/bonus.js): тугма вақти СЕРВЕРДАН олинади, бу ерда фақат кўрсатилади.
  // Достон 2026-09-17: изоҳ матнлари олиб ташланди (ходимларга оғзаки тушунтирилади);
  // исмлар — битта майдон, босилганда рўйхат тагма-таг очилади; Excel — фақат 2 та тугма.
  import { onMount, onDestroy } from "svelte";
  import { api } from "../lib/api.js";
  import { haptic } from "../lib/tg.js";
  import Icon from "../lib/Icon.svelte";
  // bolak (Достон 2026-09-18): ҳар бир саҳифа алоҳида пастки тугма — "ragbat" | "ish" | "kirdim";
  // "hammasi" — супер админнинг юқоридаги тугмасидан (ҳаммаси + Excel)
  let { me, xabar, bolak = "hammasi" } = $props();
  const hammasi = $derived(bolak === "hammasi");

  let s = $state(null), xato = $state(""), yuk = $state(false);
  let tanlangan = $state([]), qoshOchiq = $state(false), qidir = $state("");
  let kimga = $state([]), kimOchiq = $state(false), kimQidir = $state(""), matn = $state("");
  let taymer = null;

  const yukla = () => api("/bonus").then((r) => { s = r; xato = ""; }).catch((e) => (xato = e.message));
  onMount(() => { yukla(); taymer = setInterval(yukla, 60_000); });
  onDestroy(() => clearInterval(taymer));

  // Кирилл исмни лотинча ёзиб ҳам топиш учун
  const LAT = { а: "a", б: "b", в: "v", г: "g", ғ: "g", д: "d", е: "e", ё: "yo", ж: "j", з: "z", и: "i", й: "y", к: "k", қ: "q", л: "l", м: "m", н: "n", о: "o", ў: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "x", ҳ: "h", ц: "s", ч: "ch", ш: "sh", ъ: "", ь: "", э: "e", ю: "yu", я: "ya" };
  const lotin = (t) => String(t).toLowerCase().split("").map((c) => LAT[c] ?? c).join("");
  // 🔤 Достон 2026-10-19: «hodim05» деб қидирилганда «Ходим05 ака» ТОПИЛМАГАН эди —
  // х ҳарфи «x» га ўгирилган, одам эса «h» деб ёзади. Шунинг учун Ходим15 17.10 да
  // рўйхатда бор одамни тополмай «Hodim05 aka gazel» деб такрор қўшиб юборган.
  // Энди х/ҳ бир хил, апострофлар (ʻ ʼ ' `) ташланади — худди сервердаги ismSoda() дек.
  const soda = (t) => lotin(t).replace(/[ʻʼ‘’'`]/g, "").replace(/x/g, "h").replace(/\s+/g, " ").trim();
  const mos = (nom, q) => { const x = q.trim().toLowerCase(); return !x || nom.toLowerCase().includes(x) || soda(nom).includes(soda(x)); };

  const nomi = (id) => ((s && s.hodimlar.find((h) => h.id === id)) || {}).nom || "?";
  // Ўзи ҳам рўйхатда — автоматик қўшилмайди, керак бўлса ўзини танлайди (Достон 2026-09-17)
  // 🚚 Достон 2026-10-13: эрталабки «Ишни бошладим»да ҲАЙДОВЧИ рўйхатда КЎРИНМАЙДИ —
  // унинг эрталабки вақти гуруҳдаги расмдан олинади, ҳеч ким унга «бошлади» деб ёза олмайди.
  // 🚚 2026-11-07: ҳайдовчининг ўз исми рўйхатнинг ЭНГ ТЕПАСИДА — грузчиклар билан бирга тугатса ўзини ҳам белгилайди
  const ozim = (h) => s && s.haydovchi && s.men && h.id === s.men.id;
  const royxat = $derived(!s ? [] : s.hodimlar.filter((h) => mos(h.nom, qidir) && !(tur === "b" && h.mashina))
    .sort((a, b) => (ozim(b) ? 1 : 0) - (ozim(a) ? 1 : 0)));
  // Ўзи ҳам рўйхатда: ўз исмини танласа — ўзига ҳам ёзилади, танламаса — йўқ (Достон 2026-09-17)
  const kimRoyxat = $derived(!s ? [] : s.kimlar.filter((k) => mos(k.nom, kimQidir)));
  // Ҳар доим БИТТА тугма (сервер вақт бўйича беради; синов режимида — навбатма-навбат)
  const tur = $derived(s ? s.tugma : null);
  // Ҳайдовчига «Иш вақти» кўрсатилмайди — унинг қўшимча соати гуруҳдаги расмлардан ҳисобланади
  // Ҳайдовчида эрталабки «Ишни бошладим» саҳифаси УМУМАН кўринмайди (Достон 2026-10-13);
  // кечқурунги «Ишни тугатдим» эса очиқ.
  // ⏰ Достон 2026-10-29: «Ишни тугатдим» тугмаси ҲАММАГА ҲАР ДОИМ кўриниб турсин.
  // Сабаб: Ходим15 ака 28.10 да 19:04 да ишни тугатган, Тошкентга кирмаган
  // (уйи йўлда) — тугмани тополмаган, «Тошкентга кирдим» саҳифасида излаган.
  // Энди тугма доим туради: 18:01–05:00 да босилади, бошқа пайт ёпиқ (кул ранг)
  // ва тагида қачон очилиши ёзилади. Ҳайдовчида «Ишни бошладим» аввалгидек ЮҚ.
  const boshKorinadi = $derived(!!s && !s.haydovchi);
  const boshOchiq = $derived(tur === "b");
  const tugatOchiq = $derived(tur === "t");
  const ishKorinadi = $derived(!!s && (s.ishYozadi || !s.haydovchi));
  // 📊 Достон 2026-10-19: АСОСИЙ тугма — ЖОРИЙ давр (16.10 дан). 16.09 – 15.10 ҳисоб-китоби
  // тугади, пуллар берилди; эски даврни кўрмоқчи бўлса — пастдаги «Ўтган давр» тугмасидан танлайди.
  const joriyDavr = $derived(s && s.davrlar ? s.davrlar.find((d) => d.joriy) : null);
  const joriy = $derived(joriyDavr && !joriyDavr.yopiq ? joriyDavr : null);
  // Маълумоти бор тугаган даврлар (бўш ойнинг тугмаси кўринмайди — Достон 2026-09-29)
  const otganlar = $derived(s && s.davrlar ? s.davrlar.filter((d) => !d.joriy && d.bor !== false && !d.yopiq) : []);
  const qisqa = (nom) => nom.replace(/\.(\d{4})/g, "").replace(/\s*–\s*/, " – ");   // «16.08.2026 – 15.09.2026» → «16.08 – 15.09»

  function tanla(id) {
    tanlangan = tanlangan.includes(id) ? tanlangan.filter((x) => x !== id) : [...tanlangan, id];
    haptic();
  }
  // 📝 Изоҳ (Достон 2026-09-30): нима ишни бошлади / тугатди — ихтиёрий
  let ishIzoh = $state("");
  async function ishSaqla(t = tur) {
    if (!s || !t) return;
    yuk = true;
    try {
      const r = await api("/bonus/ish", { method: "POST", body: { tur: t, qoshimcha: tanlangan, izoh: ishIzoh.trim() } });
      xabar(`${r.tur === "b" ? "Бошланди" : "Тугатилди"} ✓ ${r.kimlar.join(", ")}` + (r.oldin && r.oldin.length ? ` · аввал ёзилган: ${r.oldin.join(", ")}` : ""));
      haptic("medium");
      tanlangan = []; qoshOchiq = false; qidir = ""; ishIzoh = "";
      await yukla();
    } catch (e) { xabar(e.message, true); await yukla(); }
    yuk = false;
  }
  function kimTanla(k) {
    kimga = kimga.some((x) => x.k === k.k) ? kimga.filter((x) => x.k !== k.k) : [...kimga, k];
    haptic();
  }
  // ⚠️ Достон 2026-09-24: ходимлар қўшимча иш соатини «Иш вақти» тугмаси ўрнига рағбатга ёзиб
  // юборишяпти (3 кунда 4 марта). Матнда соат кўринса — огоҳлантирамиз ва иккинчи босишда юборамиз.
  const SOAT_RE = /(^|[^\d])([01]?\d|2[0-3])\s*[:.]\s*[0-5]\d(?![\d])/;
  const soatBor = $derived(SOAT_RE.test(matn));
  let soatTasdiq = $state(false);
  async function ragbatYubor() {
    if (!kimga.length || matn.trim().length < 3) return;
    if (soatBor && !soatTasdiq) { soatTasdiq = true; haptic("medium"); return; }
    yuk = true;
    try {
      const r = await api("/bonus/ragbat", { method: "POST", body: { kimga: kimga.map((k) => k.k), matn } });
      xabar(`Юборилди ✓ ${r.kimga}` + (r.sinov ? " · 🧪 синов: базага ёзилмади" : ""));
      haptic("medium");
      kimga = []; kimQidir = ""; matn = ""; kimOchiq = false; soatTasdiq = false;   // «Тайёр» тугмаси йўқ — юборилгач рўйхат ўзи ёпилади
    } catch (e) { xabar(e.message, true); }
    yuk = false;
  }
  // ⚠️ Огоҳлантириш (Достон 2026-11-11): рағбатдек — кимга (рўйхат) + матн
  let ogKimga = $state([]), ogOchiq = $state(false), ogQidir = $state(""), ogMatn = $state("");
  const ogRoyxat = $derived(!s ? [] : (s.ogohKimlar || s.kimlar).filter((k) => mos(k.nom, ogQidir)));
  function ogTanla(k) {
    ogKimga = ogKimga.some((x) => x.k === k.k) ? ogKimga.filter((x) => x.k !== k.k) : [...ogKimga, k];
    haptic();
  }
  async function ogohYubor() {
    if (!ogKimga.length || ogMatn.trim().length < 3) return;
    yuk = true;
    try {
      const r = await api("/bonus/ogoh", { method: "POST", body: { kimga: ogKimga.map((k) => k.k), matn: ogMatn } });
      xabar(`Юборилди ✓ ${r.kimga}` + (r.sinov ? " · 🧪 синов: базага ёзилмади" : ""));
      haptic("medium");
      ogKimga = []; ogQidir = ""; ogMatn = ""; ogOchiq = false;
    } catch (e) { xabar(e.message, true); }
    yuk = false;
  }
  // 💸 Жарима (Достон 2026-11-11): қўлда ёзилмайди — кимга (рўйхат) + тайёр вариант; «Вариант қўшиш» — номи ва нархи
  let jKimga = $state([]), jOchiq = $state(false), jQidir = $state(""), jTur = $state(null);
  let jYangi = $state(false), jNom = $state(""), jNarx = $state("");
  const jRoyxat = $derived(!s ? [] : (s.ogohKimlar || s.kimlar).filter((k) => mos(k.nom, jQidir)));
  const jTurlar = $derived(s && s.jarimaTurlar ? s.jarimaTurlar : []);
  const som = (n) => String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const jNarxSon = $derived(Number(String(jNarx).replace(/[\s,]/g, "")) || 0);
  function jTanla(k) {
    jKimga = jKimga.some((x) => x.k === k.k) ? jKimga.filter((x) => x.k !== k.k) : [...jKimga, k];
    haptic();
  }
  async function jVariantSaqla() {
    if (jNom.trim().length < 3 || jNarxSon < 1000) return;
    yuk = true;
    try {
      const r = await api("/bonus/jarima/tur", { method: "POST", body: { nom: jNom.trim(), narx: jNarxSon } });
      xabar(`✓ Вариант қўшилди: ${r.nom} — ${som(r.narx)} сўм`);
      haptic("medium");
      jNom = ""; jNarx = ""; jYangi = false;
      await yukla();
      jTur = r.id;   // қўшилган вариант дарров танланади
    } catch (e) { xabar(e.message, true); }
    yuk = false;
  }
  async function jarimaYubor() {
    if (!jKimga.length || !jTur) return;
    yuk = true;
    try {
      const r = await api("/bonus/jarima", { method: "POST", body: { kimga: jKimga.map((k) => k.k), tur: jTur } });
      xabar(`Юборилди ✓ ${r.kimga} · ${r.tur} — ${som(r.narx)} сўм` + (r.sinov ? " · 🧪 синов: базага ёзилмади" : ""));
      haptic("medium");
      jKimga = []; jQidir = ""; jTur = null; jOchiq = false;
    } catch (e) { xabar(e.message, true); }
    yuk = false;
  }
  // 📍 «Тошкентга кирдим» (Достон 2026-09-17). Интернет йўқ бўлса: жойлашув ва БОСИЛГАН пайт сақланади,
  // алоқа келиши билан ўзи юборилади; телефон соати сурилган бўлса сервер тузатади.
  const KUTISH = "bonusKirdimKutish";
  let kirXato = $state(""), kirSozlama = $state(false), kutilmoqda = $state(false), kirTaymer = null;
  const WA = () => (window.Telegram && window.Telegram.WebApp) || null;

  // Telegram «жойлашув бор/йўқ» ҳолатини БИР МАРТА текшириб эслаб қолади (telegram-web-app.js). Ҳайдовчи
  // GPS'ни ёқиб қайта боссa эски «йўқ» қолиб кетмаслиги учун — ҲАР босишда қайта текширтирамиз.
  function lmTekshir(w, LM) {
    return new Promise((ok) => {
      if (!LM.isInited) { LM.init(() => ok()); setTimeout(ok, 4000); return; }
      let tugadi = false;
      const tayyor = () => { if (tugadi) return; tugadi = true; try { w.offEvent("locationManagerUpdated", tayyor); } catch { /* йўқ */ } ok(); };
      try { w.onEvent("locationManagerUpdated", tayyor); window.Telegram.WebView.postEvent("web_app_check_location", false); } catch { tayyor(); }
      setTimeout(tayyor, 4000);
    });
  }
  const GPS_OCHIQ = () => Object.assign(new Error("📍 GPS ўчиқ — телефонда GPS'ни ёқинг, кейин қайта босинг"), { gps: true });
  async function tgJoylashuv() {
    const w = WA(), LM = w && w.LocationManager;
    if (!LM || !w.isVersionAtLeast || !w.isVersionAtLeast("8.0")) return brauzerJoylashuv();
    await lmTekshir(w, LM);
    if (!LM.isInited || !LM.isLocationAvailable) return brauzerJoylashuv();   // Telegram бермаса — WebView орқали
    const d = await new Promise((ok) => {
      try { LM.getLocation((x) => ok(x)); } catch { ok(null); }
      setTimeout(() => ok(null), 40_000);
    });
    if (d && Number.isFinite(d.latitude)) return { lat: d.latitude, lon: d.longitude, aniqlik: d.horizontal_accuracy ?? null };
    if (LM.isAccessRequested && !LM.isAccessGranted) throw Object.assign(new Error("📍 Жойлашувга рухсат берилмаган — «Рухсат бериш» тугмасини босинг"), { sozlama: true });
    // Рухсат бор, жойлашув йўқ — кўпинча GPS ўчиқ. WebView орқали ҳам бир уриниб кўрамиз
    try { return await brauzerJoylashuv(); } catch { throw GPS_OCHIQ(); }
  }
  function brauzerJoylashuv() {
    return new Promise((ok, yoq) => {
      if (!navigator.geolocation) return yoq(new Error("📍 Бу телефонда жойлашув ишламайди"));
      navigator.geolocation.getCurrentPosition(
        (p) => ok({ lat: p.coords.latitude, lon: p.coords.longitude, aniqlik: p.coords.accuracy }),
        (e) => yoq(new Error(e.code === 1 ? "📍 Жойлашувга рухсат берилмаган — телефон созламаларидан Telegram'га рухсат беринг"
          : e.code === 3 ? "📍 GPS сигнали топилмади — очиқ жойда қайта босинг" : "📍 GPS ўчиқ — телефонда GPS'ни ёқинг, кейин қайта босинг")),
        { enableHighAccuracy: true, timeout: 30_000, maximumAge: 0 });
    });
  }
  async function kirdimYubor(joy) {
    try {
      // bosildi — тугма босилган пайт (телефон соати), telefon — юбориш пайти: сервер фарқини ўзи тузатади
      const r = await api("/bonus/kirdim", { method: "POST", body: { ...joy, telefon: Date.now() } });
      try { localStorage.removeItem(KUTISH); } catch { /* йўқ */ }
      kutilmoqda = false; kirXato = "";
      xabar(kirdimMatn(r.vaqt, r.km));
      haptic("medium");
      await yukla();
    } catch (e) {
      if (e.status === 0) {
        // Интернет йўқ — жойлашувни сақлаймиз, алоқа келганда ўзи юборилади
        try { localStorage.setItem(KUTISH, JSON.stringify(joy)); } catch { /* йўқ */ }
        kutilmoqda = true;
        kirXato = "📶 Интернет йўқ — сақланди. Алоқа келиши билан ўзи юборилади, вақт тугма босилган пайт бўйича ёзилади.";
      } else {
        try { localStorage.removeItem(KUTISH); } catch { /* йўқ */ }
        kutilmoqda = false; kirXato = e.message;
        haptic("heavy");
      }
    }
  }
  async function kirdim() {
    yuk = true; kirXato = ""; kirSozlama = false;
    const bosildi = Date.now();
    try {
      const joy = await tgJoylashuv();
      await kirdimYubor({ ...joy, bosildi });
    } catch (e) { kirXato = e.message; kirSozlama = !!e.sozlama; haptic("heavy"); }
    yuk = false;
  }
  function kutganiniYubor() {
    let joy = null;
    try { joy = JSON.parse(localStorage.getItem(KUTISH) || "null"); } catch { joy = null; }
    if (joy && navigator.onLine !== false) { kutilmoqda = true; kirdimYubor(joy); }
  }
  const sozlamaOch = () => { try { WA().LocationManager.openSettings(); } catch { /* эски клиент */ } };
  onMount(() => { kutganiniYubor(); kirTaymer = setInterval(kutganiniYubor, 15_000); window.addEventListener("online", kutganiniYubor); });
  onDestroy(() => { clearInterval(kirTaymer); window.removeEventListener("online", kutganiniYubor); });
  const kmMatn = (km) => String(km).replace(".", ",");
  // Достон 2026-09-17: ҳайдовчига тушунарли — «Тошкентга 2 км кириб тугмани босдингиз»
  const kirdimMatn = (vaqt, km) => `✅ Тошкентга ${kmMatn(km)} км кириб тугмани босдингиз · соат ${vaqt}`;

  // 👥 Рўйхатга янги одам қўшиш / ўзи қўшганини ўчириш (Достон 2026-09-18: ҳайдовчидан бошқа ҳамма учун)
  let yangiOchiq = $state(""), yangiNom = $state(""), yangiTarif = $state(35000), ochirId = $state(null);
  async function yangiQosh(qayer) {
    const nom = yangiNom.trim();
    if (nom.length < 2) return;
    yuk = true;
    try {
      const r = await api("/bonus/hodim", { method: "POST", body: { nom, tarif: Number(yangiTarif) } });
      xabar(`✓ ${r.nom} рўйхатга қўшилди`);
      haptic("medium");
      yangiNom = ""; yangiOchiq = "";
      await yukla();
      // Қўшилган одам шу рўйхатда дарров белгиланади
      if (qayer === "ish") tanlangan = [...tanlangan, r.id];
      else { const k = s.kimlar.find((x) => x.k === "h" + r.id); if (k) kimga = [...kimga, k]; }
    } catch (e) { xabar(e.message, true); }
    yuk = false;
  }
  async function odamOchir(id) {
    if (ochirId !== id) { ochirId = id; haptic(); return; }   // биринчи босиш — «Ўчириш?», иккинчиси — ўчиради
    yuk = true;
    try {
      await api(`/bonus/hodim/${id}/ochir`, { method: "POST" });
      xabar("Рўйхатдан ўчирилди");
      tanlangan = tanlangan.filter((x) => x !== id);
      kimga = kimga.filter((x) => x.k !== "h" + id);
      await yukla();
    } catch (e) { xabar(e.message, true); }
    ochirId = null; yuk = false;
  }

  // 👤 Шахсий Excel (Достон 2026-09-29): ўзиники ёки (Ходим01 ака/Раҳбар ака) бошқа ходимники
  let kimOchiqExcel = $state(false), excelQidir = $state("");
  const excelRoyxat = $derived(!s || !s.excelKimlar ? [] :
    s.excelKimlar.filter((k) => !excelQidir.trim() || k.nom.toLowerCase().includes(excelQidir.trim().toLowerCase())));
  async function shaxsiyExcel(hodim = null, d = null) {
    yuk = true;
    try {
      const r = await api("/bonus/excel/shaxsiy", { method: "POST", body: { ...(hodim ? { hodim } : {}), ...(d ? { davr: d.bosh } : {}) } });
      xabar(`Excel ботга юборилди ✓ ${r.hodim || ""}`);
      haptic("medium");
    } catch (e) { xabar(e.message, true); }
    yuk = false;
  }

  async function excel(d) {
    if (!d) return;
    yuk = true;
    try { await api("/bonus/excel", { method: "POST", body: { davr: d.bosh } }); xabar("Excel ботга юборилди ✓"); haptic("medium"); }
    catch (e) { xabar(e.message, true); }
    yuk = false;
  }

  // 🚚 Достон 2026-10-16: «Юк топшириш» — АЛОҲИДА файл, фақат Раҳбар акада
  async function topshirishExcel(d) {
    if (!d) return;
    yuk = true;
    try { await api("/bonus/excel/topshirish", { method: "POST", body: { davr: d.bosh } }); xabar("Юк топшириш Excel'и ботга юборилди ✓"); haptic("medium"); }
    catch (e) { xabar(e.message, true); }
    yuk = false;
  }
</script>

{#snippet yangiForma(qayer)}
  {#if s.qoshaOladi}
    {#if yangiOchiq === qayer}
      <div class="field"><input placeholder="Янги одамнинг исми" maxlength="40" bind:value={yangiNom} /></div>
      <div class="field">
        <select bind:value={yangiTarif} aria-label="Соатлик тариф">
          <option value={35000}>Тариф: 35 000 сўм/соат (цех, грузчик)</option>
          <option value={40000}>Тариф: 40 000 сўм/соат (дўкон, диспетчер)</option>
        </select>
      </div>
      <div class="two">
        <button class="btn sm" disabled={yuk || yangiNom.trim().length < 2} onclick={() => yangiQosh(qayer)}>Қўшиш</button>
        <button class="btn sm soft" onclick={() => { yangiOchiq = ""; yangiNom = ""; }}>Бекор</button>
      </div>
    {:else}
      <button class="rowbtn" onclick={() => { yangiOchiq = qayer; ochirId = null; haptic(); }}>
        <Icon name="plus" size={20} /><span class="mid">Янги одам қўшиш</span>
      </button>
    {/if}
  {/if}
{/snippet}

<div class="body">
  {#if xato}
    <div class="note rd"><Icon name="alert" size={18} />{xato}</div>
  {:else if !s}
    <div class="spin"></div>
  {:else}

    <!-- ⏰ ИШ ВАҚТИ — фақат тугма очиқ бўлганда. Ёзувлар рўйхати ходимга кўрсатилмайди — Excel'да. -->
    <!-- 🚚 Достон 2026-11-07: ҳайдовчида тушунтириш хатлари ЙЎҚ — фақат «Ишни тугатдим» тугмаси («juda ham rasvo») -->
    {#if bolak === "ish" && !boshOchiq && !tugatOchiq && !s.haydovchi}
      <div class="note"><Icon name="clock" size={18} />Ҳозир иш вақти. «Ишни бошладим» эрталаб 05:00–09:00 да, «Ишни тугатдим» тугмаси доим пастда туради — кечқурун 18:01 дан босилади.</div>
    {/if}
    <!-- 👔 Достон 2026-11-11: супер админда «Иш вақти» ЙЎҚ («super adminga keremas») — фақат ўз саҳифасида -->
    {#if ishKorinadi && bolak === "ish"}
      {#if !s.haydovchi}
        <div class="sect"><span>⏰ Иш вақти</span>{#if s.sinov}<span class="chip amb">🧪 Синов</span>{/if}</div>
      {/if}
      <div class="card">
          <button class="rowbtn" onclick={() => { qoshOchiq = !qoshOchiq; haptic(); }}>
            <Icon name="users" size={20} />
            <span class="mid">Ходимларни танланг{tanlangan.length ? ` · ${tanlangan.length} киши` : ""}</span>
            <Icon name={qoshOchiq ? "up" : "chev"} size={18} />
          </button>
          {#if tanlangan.length && !qoshOchiq}
            <div class="muted" style="font-size:13px">{tanlangan.map(nomi).join(", ")}</div>
          {/if}
          {#if qoshOchiq}
            <div class="field"><input placeholder="Қидириш…" bind:value={qidir} /></div>
            <div class="list" style="padding:0 4px;max-height:50vh;overflow-y:auto">
              {#each royxat as h (h.id)}
                <div class="lrow" style="padding:0">
                  <button class="lrow" onclick={() => tanla(h.id)}>
                    <span class="mid"><span class="t">{h.nom}</span>{#if h.qoshilgan}<span class="muted" style="font-size:12px">қўшди: {h.qoshdi || "?"}</span>{/if}</span>
                    {#if tanlangan.includes(h.id)}<Icon name="check" size={20} />{/if}
                  </button>
                  {#if h.qoshilgan && s.qoshaOladi}
                    <button class="chip" class:rd={ochirId === h.id} class:muted={ochirId !== h.id} disabled={yuk} onclick={() => odamOchir(h.id)}>{ochirId === h.id ? "Ўчириш?" : "✕"}</button>
                  {/if}
                </div>
              {/each}
            </div>
            {@render yangiForma("ish")}
            <button class="btn sm soft" onclick={() => { qoshOchiq = false; qidir = ""; haptic(); }}>Тайёр</button>
          {/if}

          {#if !s.haydovchi}
          <div class="field">
            <textarea rows="2" maxlength="200"
              placeholder={boshOchiq ? "Нима ишни бошладингиз? Масалан: цехни тозалаш (ихтиёрий)" : "Нима иш қилдингиз? Масалан: Ходим04нинг заказини ортдик (ихтиёрий)"}
              bind:value={ishIzoh}></textarea>
          </div>
          {/if}
          {#if boshKorinadi}
            <button class="btn green" disabled={yuk || !tanlangan.length || !boshOchiq} onclick={() => ishSaqla("b")}>
              <Icon name="sun" size={20} />
              Ишни бошладим{tanlangan.length ? ` (${tanlangan.length} киши)` : ""}
            </button>
          {/if}
          <button class="btn" disabled={yuk || (!s.haydovchi && !tanlangan.length) || !tugatOchiq} onclick={() => ishSaqla("t")}>
            <Icon name="moon" size={20} />
            Ишни тугатдим{tanlangan.length ? ` (${tanlangan.length} киши)` : ""}
          </button>
          {#if !tugatOchiq && !s.haydovchi}
            <div class="muted" style="font-size:13px">«Ишни тугатдим» кечқурун 18:01 дан эрталаб 05:00 гача босилади.</div>
          {/if}
          {#if boshKorinadi && !boshOchiq}
            <div class="muted" style="font-size:13px">«Ишни бошладим» эрталаб 05:00–09:00 да босилади.</div>
          {/if}

      </div>
    {/if}

    <!-- 📍 ТОШКЕНТГА КИРДИМ — Достон 2026-11-07: саҳифада ФАҚАТ тугма, доим туради,
         18:01–05:00 да босилади (тушунтириш хатлари олиб ташланди). -->
    {#if s.kirdim && (bolak === "kirdim" || (hammasi && (s.kirdim.korinadi || kutilmoqda)))}
      {#if hammasi}<div class="sect"><span>📍 Вилоятдан қайтиш</span>{#if s.sinov}<span class="chip amb">🧪 Синов</span>{/if}</div>{/if}
      <div class="card">
        {#if s.kirdim.oldin}
          <div class="note">{kirdimMatn(s.kirdim.oldin.vaqt, s.kirdim.oldin.km)}</div>
        {/if}
        {#if kirXato}
          <div class="note rd">{kirXato}</div>
        {/if}
        {#if kirSozlama}
          <button class="btn sm soft" onclick={sozlamaOch}>Рухсат бериш</button>
        {/if}
        {#if !s.kirdim.oldin || s.sinov}
          <button class="btn green" disabled={yuk || kutilmoqda || !(s.kirdim.korinadi || s.sinov)} onclick={kirdim}>📍 Тошкентга кирдим</button>
        {/if}
      </div>
    {/if}

    {#if hammasi || bolak === "ragbat"}
    <!-- 🎁 РАҒБАТЛАНТИРИШ -->
    <div class="sect"><span>🎁 Рағбатлантириш</span></div>
    <div class="card">
      <!-- Бир нечта одамни танлаш мумкин (Достон 2026-09-17) -->
      <button class="rowbtn" onclick={() => { kimOchiq = !kimOchiq; haptic(); }}>
        <Icon name="users" size={20} />
        <span class="mid">Кимга{kimga.length ? ` · ${kimga.length} киши` : ""}</span>
        <Icon name={kimOchiq ? "up" : "chev"} size={18} />
      </button>
      {#if kimga.length && !kimOchiq}
        <div class="muted" style="font-size:13px">{kimga.map((k) => k.nom).join(", ")}</div>
      {/if}
      {#if kimOchiq}
        <div class="field"><input placeholder="Қидириш…" bind:value={kimQidir} /></div>
        <div class="list" style="padding:0 4px;max-height:50vh;overflow-y:auto">
          {#each kimRoyxat as k (k.k)}
            <div class="lrow" style="padding:0">
              <button class="lrow" onclick={() => kimTanla(k)}>
                <span class="mid"><span class="t">{k.nom}</span>{#if k.qoshilgan}<span class="muted" style="font-size:12px">қўшди: {k.qoshdi || "?"}</span>{/if}</span>
                {#if kimga.some((x) => x.k === k.k)}<Icon name="check" size={20} />{/if}
              </button>
              {#if k.qoshilgan && s.qoshaOladi}
                <button class="chip" class:rd={ochirId === Number(k.k.slice(1))} class:muted={ochirId !== Number(k.k.slice(1))} disabled={yuk} onclick={() => odamOchir(Number(k.k.slice(1)))}>{ochirId === Number(k.k.slice(1)) ? "Ўчириш?" : "✕"}</button>
              {/if}
            </div>
          {/each}
        </div>
        {@render yangiForma("ragbat")}
      {/if}
      <div class="field"><textarea rows="4" maxlength="1000" placeholder="Нима иш қилди? Масалан: грузчик йўқ эди, юкни ўзи туширди — 20 қоп" bind:value={matn} oninput={() => (soatTasdiq = false)}></textarea></div>
      {#if soatBor}
        <div class="note rd"><Icon name="alert" size={18} />Бу қўшимча иш вақтими? Унда рағбатга эмас, «Иш вақти» саҳифасидаги тугмани босинг — бонус ўша ердан ҳисобланади. Рағбатга ёзилгани пулга ўтмайди.</div>
      {/if}
      <button class="btn" disabled={yuk || !kimga.length || matn.trim().length < 3} onclick={ragbatYubor}><Icon name="send" size={18} />{soatBor && soatTasdiq ? "Барибир юбориш" : "Юбориш"}{kimga.length > 1 ? ` (${kimga.length} киши)` : ""}</button>
    </div>

    {/if}

    {#if s.ogoh && (hammasi || bolak === "ogoh")}
    <!-- ⚠️ ОГОҲЛАНТИРИШ (Достон 2026-11-11) — фақат Раҳбар ака, Админ ака, Ходим02, Ходим15 ака -->
    <div class="sect"><span>⚠️ Огоҳлантириш</span></div>
    <div class="card">
      <button class="rowbtn" onclick={() => { ogOchiq = !ogOchiq; haptic(); }}>
        <Icon name="users" size={20} />
        <span class="mid">Кимга{ogKimga.length ? ` · ${ogKimga.length} киши` : ""}</span>
        <Icon name={ogOchiq ? "up" : "chev"} size={18} />
      </button>
      {#if ogKimga.length && !ogOchiq}
        <div class="muted" style="font-size:13px">{ogKimga.map((k) => k.nom).join(", ")}</div>
      {/if}
      {#if ogOchiq}
        <div class="field"><input placeholder="Қидириш…" bind:value={ogQidir} /></div>
        <div class="list" style="padding:0 4px;max-height:50vh;overflow-y:auto">
          {#each ogRoyxat as k (k.k)}
            <button class="lrow" onclick={() => ogTanla(k)}>
              <span class="mid"><span class="t">{k.nom}</span></span>
              {#if ogKimga.some((x) => x.k === k.k)}<Icon name="check" size={20} />{/if}
            </button>
          {/each}
        </div>
      {/if}
      <div class="field"><textarea rows="4" maxlength="1000" placeholder="Огоҳлантириш матни" bind:value={ogMatn}></textarea></div>
      <button class="btn" disabled={yuk || !ogKimga.length || ogMatn.trim().length < 3} onclick={ogohYubor}><Icon name="send" size={18} />Юбориш{ogKimga.length > 1 ? ` (${ogKimga.length} киши)` : ""}</button>
    </div>
    {/if}

    {#if s.ogoh && (hammasi || bolak === "jarima")}
    <!-- 💸 ЖАРИМА (Достон 2026-11-11) — қўлда ёзилмайди, вариантдан танланади -->
    <div class="sect"><span>💸 Жарима</span></div>
    <div class="card">
      <button class="rowbtn" onclick={() => { jOchiq = !jOchiq; haptic(); }}>
        <Icon name="users" size={20} />
        <span class="mid">Кимга{jKimga.length ? ` · ${jKimga.length} киши` : ""}</span>
        <Icon name={jOchiq ? "up" : "chev"} size={18} />
      </button>
      {#if jKimga.length && !jOchiq}
        <div class="muted" style="font-size:13px">{jKimga.map((k) => k.nom).join(", ")}</div>
      {/if}
      {#if jOchiq}
        <div class="field"><input placeholder="Қидириш…" bind:value={jQidir} /></div>
        <div class="list" style="padding:0 4px;max-height:50vh;overflow-y:auto">
          {#each jRoyxat as k (k.k)}
            <button class="lrow" onclick={() => jTanla(k)}>
              <span class="mid"><span class="t">{k.nom}</span></span>
              {#if jKimga.some((x) => x.k === k.k)}<Icon name="check" size={20} />{/if}
            </button>
          {/each}
        </div>
      {/if}

      <!-- Достон 2026-11-11: ҳар бир вариант — алоҳида тугма, чизиқ билан ажратилган -->
      {#if jTurlar.length}
        <div class="jvarlar">
          {#each jTurlar as t (t.id)}
            <button class="jvar" class:on={jTur === t.id} onclick={() => { jTur = jTur === t.id ? null : t.id; haptic(); }}>
              <span class="jnom">{t.nom}</span>
              <span class="jnarx">{som(t.narx)} сўм</span>
              {#if jTur === t.id}<Icon name="check" size={18} />{/if}
            </button>
          {/each}
        </div>
      {/if}
      {#if jYangi}
        <div class="field"><input placeholder="Жарима нима" maxlength="100" bind:value={jNom} /></div>
        <div class="field"><input placeholder="Нархи" inputmode="numeric" bind:value={jNarx} /></div>
        <div class="two">
          <button class="btn sm" disabled={yuk || jNom.trim().length < 3 || jNarxSon < 1000} onclick={jVariantSaqla}>Сақлаш</button>
          <button class="btn sm soft" onclick={() => { jYangi = false; jNom = ""; jNarx = ""; }}>Бекор</button>
        </div>
      {:else}
        <button class="rowbtn" onclick={() => { jYangi = true; haptic(); }}>
          <Icon name="plus" size={20} /><span class="mid">Вариант қўшиш</span>
        </button>
      {/if}

      <button class="btn" disabled={yuk || !jKimga.length || !jTur} onclick={jarimaYubor}><Icon name="send" size={18} />Юбориш{jKimga.length > 1 ? ` (${jKimga.length} киши)` : ""}</button>
    </div>
    {/if}

    <!-- 👤 МЕНИНГ БОНУСИМ — ҲАР БИР саҳифада кўринади (Рағбат, Иш вақти, Тошкентга кирдим).
         Ходим ўз Excel'ини юклайди (жорий давр); рўйхатда йўқ бўлса тугма ўчиқ, сабаби ёзилган. -->
    <!-- 👤 Менинг бонусим — фақат бонус рўйхатидаги ходимга (Достон 2026-10-16) -->
    {#if s.menRoyxatda}
      <div class="sect"><span>📊 Менинг бонусим</span></div>
      <div class="card">
        {#if joriy}
          <button class="btn" disabled={yuk} onclick={() => shaxsiyExcel(null, joriy)}>
            <Icon name="download" size={20} />1 ойлик Excel · {joriy.nom.slice(0, 5)} – бугун
          </button>
        {/if}
        {#each otganlar as d (d.bosh)}
          <button class="btn soft" disabled={yuk} onclick={() => shaxsiyExcel(null, d)}>
            <Icon name="download" size={20} />Ўтган давр · {qisqa(d.nom)}
          </button>
        {/each}
        {#if s.excelKimlar && s.excelKimlar.length && !s.excel}
          <button class="rowbtn" onclick={() => { kimOchiqExcel = !kimOchiqExcel; haptic(); }}>
            <Icon name="users" size={20} />
            <span class="mid">Ходим Excel'и · {s.excelKimlar.length} киши</span>
            <Icon name={kimOchiqExcel ? "up" : "chev"} size={18} />
          </button>
          {#if kimOchiqExcel}
            <div class="list" style="padding:0 4px;max-height:50vh;overflow-y:auto">
              {#each s.excelKimlar as k (k.id)}
                <div class="lrow" style="padding:0">
                  <span class="mid" style="padding:10px 12px"><span class="t">{k.nom}</span></span>
                  {#if joriy}<button class="chip" disabled={yuk} onclick={() => shaxsiyExcel(k.id, joriy)}>1 ойлик</button>{/if}
                  {#each otganlar as d (d.bosh)}<button class="chip" disabled={yuk} onclick={() => shaxsiyExcel(k.id, d)}>{qisqa(d.nom)}</button>{/each}
                </div>
              {/each}
            </div>
          {/if}
        {/if}
      </div>
    {/if}

    {#if hammasi}
    <!-- 👥 РЎЙХАТГА ҚЎШИЛГАНЛАР: ким қўшди, ким ўчирди (Достон 2026-09-18) -->
    <!-- 📊 EXCEL — Раҳбар ака ва Достон -->
    {#if s.excel}
      <div class="sect"><span>📊 Excel</span></div>
      <div class="card">
        {#if joriy}
          <button class="btn" disabled={yuk} onclick={() => excel(joriy)}>
            <Icon name="download" size={20} />1 ойлик Excel · {joriy.nom.slice(0, 5)} – бугун
          </button>
          <button class="btn soft" disabled={yuk} onclick={() => topshirishExcel(joriy)}>
            <Icon name="download" size={20} />Юк топшириш Excel · {joriy.nom.slice(0, 5)} – бугун
          </button>
        {/if}
        {#each otganlar as d (d.bosh)}
          <button class="btn soft" disabled={yuk} onclick={() => excel(d)}>
            <Icon name="download" size={20} />Ўтган давр Excel · {qisqa(d.nom)}
          </button>
          <button class="btn soft" disabled={yuk} onclick={() => topshirishExcel(d)}>
            <Icon name="download" size={20} />Ўтган давр · Юк топшириш · {qisqa(d.nom)}
          </button>
        {/each}
        {#if s.excelKimlar && s.excelKimlar.length}
          <button class="rowbtn" onclick={() => { kimOchiqExcel = !kimOchiqExcel; haptic(); }}>
            <Icon name="users" size={20} />
            <span class="mid">Битта ходимнинг Excel'и · {s.excelKimlar.length} киши</span>
            <Icon name={kimOchiqExcel ? "up" : "chev"} size={18} />
          </button>
          {#if kimOchiqExcel}
            <div class="field"><input placeholder="Исмни қидириш…" bind:value={excelQidir} /></div>
            <div class="list" style="padding:0 4px;max-height:50vh;overflow-y:auto">
              {#each excelRoyxat as k (k.id)}
                <div class="lrow" style="padding:0">
                  <span class="mid" style="padding:10px 12px"><span class="t">{k.nom}</span></span>
                  {#if joriy}<button class="chip" disabled={yuk} onclick={() => shaxsiyExcel(k.id, joriy)}>1 ойлик</button>{/if}
                  {#each otganlar as d (d.bosh)}<button class="chip" disabled={yuk} onclick={() => shaxsiyExcel(k.id, d)}>{qisqa(d.nom)}</button>{/each}
                </div>
              {/each}
            </div>
          {/if}
        {/if}
      </div>
    {/if}
    {/if}
  {/if}
</div>

<style>
  /* 💸 Жарима вариантлари — тугмадек, ҳар бири чизиқ билан ажратилган (Достон 2026-11-11) */
  .jvarlar { display: flex; flex-direction: column; gap: 8px; }
  .jvar { display: flex; align-items: center; gap: 10px; width: 100%; min-height: 48px; padding: 10px 14px;
          border: 1.5px solid var(--off); border-radius: 14px; background: var(--surf); color: var(--ink);
          font-size: 15px; text-align: left; }
  .jvar .jnom { flex: 1 1 auto; font-weight: 600; }
  .jvar .jnarx { flex: 0 0 auto; color: var(--muted); font-size: 14px; white-space: nowrap; }
  .jvar.on { border-color: var(--or); background: var(--ors); }
  .jvar.on .jnarx { color: var(--or); }
</style>

-- 🎁 Бонуслар (src/bonus.js, src/app/bonusapi.js). Фақат ЯНГИ жадваллар —
-- мавжуд жадвалларга тегилмайди.
--
-- Ҳисоб-китоб бу ерда САҚЛАНМАЙДИ: ҳар гал Excel сўралганда хом ёзувлардан
-- қайта ҳисобланади. Қоида ўзгарса, эски ойлар ҳам янги қоида бўйича чиқади.

-- 📷 Юк олиш / юк топшириш гуруҳларидаги расмлар (бот жимгина ёзиб олади)
CREATE TABLE IF NOT EXISTS bonus_xabar (
  chat_id  INTEGER NOT NULL,
  msg_id   INTEGER NOT NULL,
  guruh    TEXT    NOT NULL,              -- olish | topshirish
  uid      INTEGER,                       -- ким ташлади (Telegram id)
  ism      TEXT,                          -- Telegram'даги исми (фақат кўриш учун)
  vaqt     INTEGER NOT NULL,              -- юборилган вақт, unix (UTC)
  matn     TEXT,                          -- расм изоҳи
  rasm     INTEGER NOT NULL DEFAULT 1,
  albom    TEXT,                          -- media_group_id (бир йўла ташланган расмлар)
  PRIMARY KEY (chat_id, msg_id)
);
CREATE INDEX IF NOT EXISTS bonus_xabar_vaqt ON bonus_xabar (vaqt);

-- ⏰ Иш вақти: «Ишни бошладим» / «Ишни тугатдим» (Mini App)
CREATE TABLE IF NOT EXISTS bonus_ish (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  hodim     INTEGER NOT NULL,             -- src/bonus.js HODIMLAR даги рақам
  tur       TEXT    NOT NULL,             -- b (бошладим) | t (тугатдим)
  vaqt      INTEGER NOT NULL,             -- тугма босилган вақт, unix (UTC) — СЕРВЕР вақти
  kim       INTEGER NOT NULL,             -- тугмани ким босди (Telegram id)
  kim_ism   TEXT,
  ochirildi INTEGER NOT NULL DEFAULT 0    -- 1 — ёзган одам бекор қилди
);
CREATE INDEX IF NOT EXISTS bonus_ish_vaqt ON bonus_ish (vaqt);

-- 🎁 Рағбатлантириш (Mini App)
CREATE TABLE IF NOT EXISTS bonus_ragbat (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  kimga       TEXT    NOT NULL,           -- кимга (исм — Excel'да шундай кўринади)
  kimga_hodim INTEGER,                    -- HODIMLAR рақами (бўлса)
  kimga_uid   INTEGER,                    -- Telegram id (бўлса)
  matn        TEXT    NOT NULL,           -- нима иш қилди
  kim         INTEGER NOT NULL,           -- ким ёзди
  kim_ism     TEXT,
  vaqt        INTEGER NOT NULL,
  msg_id      INTEGER                     -- BIGANT гуруҳидаги эълон
);
CREATE INDEX IF NOT EXISTS bonus_ragbat_vaqt ON bonus_ragbat (vaqt);

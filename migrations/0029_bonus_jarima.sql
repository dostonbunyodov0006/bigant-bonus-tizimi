-- 💸 Жарималар (Достон 2026-11-11): огоҳлантиришдаги 4 киши ёзади (Раҳбар ака, Админ ака, Ходим02, Ходим15 ака).
-- Жарима қўлда ёзилмайди — тайёр вариантдан танланади (масалан «Ишга кеч қолиш — 50 000»).
-- Бонусдан АЙИРИЛМАЙДИ — фақат ёзиб қўйилади ва BIGANT гуруҳига эълон қилинади.
CREATE TABLE IF NOT EXISTS bonus_jarima_tur (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  nom      TEXT    NOT NULL,              -- жарима нима (масалан «Ишга кеч қолиш»)
  narx     INTEGER NOT NULL,              -- нархи, сўм
  kim      INTEGER NOT NULL,              -- ким қўшди
  kim_ism  TEXT,
  vaqt     INTEGER NOT NULL,
  ochirildi INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS bonus_jarima (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  kimga       TEXT    NOT NULL,           -- кимга (исм)
  kimga_hodim INTEGER,                    -- HODIMLAR рақами (бўлса)
  kimga_uid   INTEGER,                    -- Telegram id (бўлса)
  tur_id      INTEGER NOT NULL,           -- bonus_jarima_tur.id
  tur_nom     TEXT    NOT NULL,           -- вариант номи (ёзилган пайтдагиси)
  narx        INTEGER NOT NULL,           -- нархи (ёзилган пайтдагиси)
  kim         INTEGER NOT NULL,           -- ким ёзди
  kim_ism     TEXT,
  vaqt        INTEGER NOT NULL,
  msg_id      INTEGER                     -- BIGANT гуруҳидаги эълон
);
CREATE INDEX IF NOT EXISTS bonus_jarima_vaqt ON bonus_jarima (vaqt);

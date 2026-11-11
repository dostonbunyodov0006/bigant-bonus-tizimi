-- 👥 Mini App'дан қўшилган ходимлар (Достон 2026-09-18): ҳайдовчи бўлмаган ҳар ким
-- «Иш вақти» ва «Рағбатлантириш» рўйхатига янги одам қўшади ёки ўчиради.
-- Ким қўшгани ва ким ўчиргани сақланади — иловада «Қўшилганлар тарихи»да кўринади.
-- Фақат ЯНГИ жадвал — мавжудларига тегилмайди. Ходим рақами = 10000 + id (src/bonus.js).
CREATE TABLE IF NOT EXISTS bonus_hodim (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  nom            TEXT    NOT NULL,
  tarif          INTEGER NOT NULL,              -- соатлик тариф, сўм (35 000 ёки 40 000)
  qoshdi         INTEGER NOT NULL,              -- ким қўшди (Telegram id)
  qoshdi_ism     TEXT,
  vaqt           INTEGER NOT NULL,              -- қўшилган вақт, unix
  ochirildi      INTEGER NOT NULL DEFAULT 0,    -- 1 = ўчирилган (эски ёзувлари Excel'да қолади)
  ochirdi        INTEGER,                       -- ким ўчирди (Telegram id)
  ochirdi_ism    TEXT,
  ochirildi_vaqt INTEGER
);

-- 📍 Ҳайдовчилар GPS (src/gps.js): телефондаги Traccar Client иловаси ҳар 20 дақиқада жойлашувни юборади.
-- Фақат ЯНГИ жадваллар — мавжудларига тегилмайди.

-- Ҳар ҳайдовчининг шахсий коди (иловадаги «Device identifier»). Код — пароль ўрнида.
CREATE TABLE IF NOT EXISTS gps_qurilma (
  kod       TEXT PRIMARY KEY,
  hodim     INTEGER NOT NULL,            -- src/bonus.js HODIMLAR рақами
  yaratildi INTEGER NOT NULL,            -- unix
  faol      INTEGER NOT NULL DEFAULT 1   -- 0 — ўчирилган (янги код берилса)
);

-- Хом нуқталар. Ҳисоб (Тошкентга қачон кирди) ҳар гал Excel сўралганда шулардан қайта қилинади.
CREATE TABLE IF NOT EXISTS gps_nuqta (
  hodim   INTEGER NOT NULL,
  vaqt    INTEGER NOT NULL,              -- телефон ўлчаган вақт, unix (UTC)
  lat     REAL    NOT NULL,
  lon     REAL    NOT NULL,
  aniqlik REAL,                          -- метр
  keldi   INTEGER NOT NULL,              -- серверга етиб келган вақт, unix
  PRIMARY KEY (hodim, vaqt)
);
CREATE INDEX IF NOT EXISTS gps_nuqta_vaqt ON gps_nuqta (vaqt);

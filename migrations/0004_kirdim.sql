-- 📍 «Тошкентга кирдим» тугмаси (Mini App, ҳайдовчилар): босилган пайтдаги жойлашув.
-- Фақат ЯНГИ жадвал — мавжудларига тегилмайди.
CREATE TABLE IF NOT EXISTS bonus_kirish (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  hodim   INTEGER NOT NULL,             -- src/bonus.js HODIMLAR рақами (ҳайдовчи)
  vaqt    INTEGER NOT NULL,             -- тугма босилган вақт, unix (UTC) — СЕРВЕР вақти
  lat     REAL    NOT NULL,
  lon     REAL    NOT NULL,
  aniqlik REAL,                         -- GPS аниқлиги, метр
  km      REAL    NOT NULL,             -- Тошкент чегарасидан неча км ичкарида
  kim     INTEGER NOT NULL              -- ким босди (Telegram id)
);
CREATE INDEX IF NOT EXISTS bonus_kirish_vaqt ON bonus_kirish (vaqt);

-- ⚠️ Огоҳлантириш (Достон 2026-11-11): рағбатлантиришдек, фақат 4 киши ёзади
-- (Раҳбар ака, Админ ака, Ходим02, Ходим15 ака). Пулга таъсири йўқ.
CREATE TABLE IF NOT EXISTS bonus_ogoh (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  kimga       TEXT    NOT NULL,           -- кимга (исм)
  kimga_hodim INTEGER,                    -- HODIMLAR рақами (бўлса)
  kimga_uid   INTEGER,                    -- Telegram id (бўлса)
  matn        TEXT    NOT NULL,           -- огоҳлантириш матни
  kim         INTEGER NOT NULL,           -- ким ёзди
  kim_ism     TEXT,
  vaqt        INTEGER NOT NULL,
  msg_id      INTEGER                     -- BIGANT гуруҳидаги эълон
);
CREATE INDEX IF NOT EXISTS bonus_ogoh_vaqt ON bonus_ogoh (vaqt);

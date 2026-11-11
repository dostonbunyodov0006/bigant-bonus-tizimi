-- 📘 Қўлланма жавоблари (Достон 2026-09-30): ким «Тушундим», ким «Тушунмадим» босди
CREATE TABLE IF NOT EXISTS qollanma_javob (
  hodim INTEGER PRIMARY KEY,          -- src/bonus.js HODIMLAR даги рақам
  javob TEXT NOT NULL,                -- ha | yoq
  rol   TEXT,                         -- xodim | haydovchi
  vaqt  INTEGER NOT NULL,
  soni  INTEGER NOT NULL DEFAULT 1    -- неча марта босган
);

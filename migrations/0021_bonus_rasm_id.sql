-- 📷 Достон 2026-10-13: расмнинг «бармоқ изи» (Telegram file_unique_id).
-- Муаммо: база расмнинг ўзини сақламасди — ҳайдовчи ЎША расмни қайта ташласа,
-- тизим билмай янги юк деб ёзарди. Шерик накладнойда шу усулни ишлатган (src/urik.js).
-- Энди ҳар бир расмнинг file_unique_id си сақланади; бир хил расм иккинчи марта
-- ташланса — юк ҳисобланмайди (src/bonus.js yukHisob).
ALTER TABLE bonus_xabar ADD COLUMN rasm_id TEXT;
CREATE INDEX IF NOT EXISTS bonus_xabar_rasm_id ON bonus_xabar (rasm_id);

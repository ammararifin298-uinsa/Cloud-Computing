-- ==========================================================================
-- LacakIn v2 - Dokumen Pendaftaran Kurir & Status Review Persisten
-- Idempotent: aman dijalankan berulang kali.
-- ==========================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS doc_ktp_url    TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS doc_sim_url    TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS doc_stnk_url   TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS doc_selfie_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS review_status  TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE users ADD COLUMN IF NOT EXISTS review_note    TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reviewed_by    INTEGER REFERENCES users(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS reviewed_at    TIMESTAMPTZ;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_users_review_status') THEN
        ALTER TABLE users
            ADD CONSTRAINT chk_users_review_status
            CHECK (review_status IN ('pending', 'approved', 'revision', 'rejected'));
    END IF;
END $$;

-- Akun aktif yang sudah ada dianggap telah disetujui
UPDATE users SET review_status = 'approved' WHERE is_active = TRUE AND review_status = 'pending';

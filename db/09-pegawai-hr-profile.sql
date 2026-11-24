-- ==========================================================================
-- LacakIn v2 - Adaptasi Data HR & Legal Pegawai (UU PDP Compliant)
-- Idempotent: aman dijalankan berulang kali.
-- ==========================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_place              TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_date               DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender                   TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS address_domicile         TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS department               TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS job_title                TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS employment_status        TEXT NOT NULL DEFAULT 'PKWTT';
ALTER TABLE users ADD COLUMN IF NOT EXISTS join_date                DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS contract_end_date        DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS education_last           TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS emergency_contact_name     TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS emergency_contact_relation TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS emergency_contact_phone    TEXT;

-- Administrasi Pajak, BPJS, & Perbankan (sensitif UU PDP)
ALTER TABLE users ADD COLUMN IF NOT EXISTS npwp                     TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bpjs_kes                 TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bpjs_tk                  TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_name                TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_account             TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_holder              TEXT;

-- Dokumen Legal & Akademik Pegawai
ALTER TABLE users ADD COLUMN IF NOT EXISTS doc_ijazah_url           TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS doc_skck_url             TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS doc_contract_url         TEXT;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_users_emp_status') THEN
        ALTER TABLE users
            ADD CONSTRAINT chk_users_emp_status
            CHECK (employment_status IN ('PKWTT', 'PKWT', 'MAGANG'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_users_gender') THEN
        ALTER TABLE users
            ADD CONSTRAINT chk_users_gender
            CHECK (gender IS NULL OR gender IN ('L', 'P'));
    END IF;
END $$;

-- ============================================================
-- VAULTX — Migration 015: Native Signed PDF Export
-- ============================================================
-- Adds integrity-verification columns to pentest_reports. "Signed" here
-- means content-integrity signing (SHA-256 hash of the exact generated
-- PDF bytes, embedded in the PDF footer and stored server-side) rather
-- than a PKI/certificate signature — appropriate for the platform's
-- zero-budget constraint, and sufficient to let a recipient verify a
-- PDF hasn't been altered since VAULTX generated it.

alter table pentest_reports
  add column pdf_sha256      text,
  add column pdf_generated_at timestamptz;

comment on column pentest_reports.pdf_sha256 is
  'SHA-256 hex digest of the most recently generated PDF export. Recomputed and overwritten each time the PDF is (re)downloaded, so it always reflects the latest export, not necessarily the latest full_report content if the report itself was regenerated without re-exporting.';

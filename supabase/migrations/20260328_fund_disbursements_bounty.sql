-- Add bounty_id and cat_id to fund_disbursements for bounty fund requests
ALTER TABLE fund_disbursements
  ADD COLUMN IF NOT EXISTS bounty_id uuid REFERENCES bounties(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cat_id uuid REFERENCES cats(id) ON DELETE SET NULL;

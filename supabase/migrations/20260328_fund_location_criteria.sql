-- Add location + allocation criteria to community_funds
alter table community_funds
  add column if not exists lat float,
  add column if not exists lng float,
  add column if not exists address text,
  add column if not exists criteria text[] default '{}';

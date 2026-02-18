-- Add manual_ticks column to clocks table
-- Tracks ticks applied directly (outside of log entries)
-- so they survive recalculation from clock_progress entries.

ALTER TABLE clocks ADD COLUMN manual_ticks INTEGER DEFAULT 0;

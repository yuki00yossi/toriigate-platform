-- Funnel events: discovery → connect → call (→ paid, added with billing)
CREATE TABLE IF NOT EXISTS funnel_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT NOT NULL,
  tool TEXT NOT NULL,
  stage TEXT NOT NULL,
  client_hash TEXT NOT NULL,
  user_agent TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_funnel_tool_stage_ts ON funnel_events (tool, stage, ts);
CREATE INDEX IF NOT EXISTS idx_funnel_client ON funnel_events (client_hash, ts);

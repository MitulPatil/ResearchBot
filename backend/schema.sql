CREATE TABLE research_reports (
  id            SERIAL PRIMARY KEY,
  question      TEXT NOT NULL,                    -- The original research question
  report_content TEXT NOT NULL,                   -- Full markdown report
  sources       JSONB NOT NULL DEFAULT '[]',      -- Array of {url, title} objects
  search_queries JSONB NOT NULL DEFAULT '[]',     -- Array of planned query strings
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW() -- When the report was saved
);

CREATE INDEX idx_research_reports_created_at ON research_reports (created_at DESC);

CREATE INDEX idx_research_reports_question ON research_reports USING gin(to_tsvector('english', question));
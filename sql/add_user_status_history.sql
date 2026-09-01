-- Record the administrator and timestamp for every user activation/deactivation.
CREATE TABLE IF NOT EXISTS user_status_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  changed_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  changed_by_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL,
  changed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_status_history_user_changed_at_idx
  ON user_status_history(user_id, changed_at DESC);
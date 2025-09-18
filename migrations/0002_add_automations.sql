-- migrations/0002_add_automations.sql

CREATE TABLE IF NOT EXISTS automations (
  id SERIAL PRIMARY KEY,
  list_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL, -- ex: 'status_changed'
  trigger_config JSONB,      -- ex: '{"to_status_id": 3}'
  action_type TEXT NOT NULL,   -- ex: 'assign_user'
  action_config JSONB,       -- ex: '{"assignee_id": 2}'
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE CASCADE
);

-- Adicionar um índice para pesquisas rápidas
CREATE INDEX IF NOT EXISTS idx_automations_list_id_trigger_type ON automations(list_id, trigger_type);
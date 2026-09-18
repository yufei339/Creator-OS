-- Creator OS 数据库 schema (Postgres 15 + pgvector)
-- Alembic 首个迁移应等价于本文件

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text UNIQUE NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE scripts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       text NOT NULL,
  content     text NOT NULL DEFAULT '',
  status      text NOT NULL DEFAULT 'draft'›
              CHECK (status IN ('draft','ready','shot','published')),
  series      text,
  tags        text[] NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_scripts_user ON scripts(user_id);
CREATE INDEX idx_scripts_series ON scripts(series);

CREATE TABLE script_versions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id    uuid NOT NULL REFERENCES scripts(id) ON DELETE CASCADE,
  content      text NOT NULL,
  change_note  text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_versions_script ON script_versions(script_id);

CREATE TABLE images (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id    uuid NOT NULL REFERENCES scripts(id) ON DELETE CASCADE,
  storage_key  text NOT NULL,
  prompt       text,
  provider     text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_images_script ON images(script_id);

CREATE TABLE publications (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id     uuid NOT NULL REFERENCES scripts(id) ON DELETE CASCADE,
  type          text NOT NULL CHECK (type IN ('video','image_text')),
  source        text NOT NULL CHECK (source IN ('link','upload')),
  platform      text NOT NULL,
  external_url  text,
  storage_key   text,
  external_id   text,
  track_status  text NOT NULL DEFAULT 'active'
                CHECK (track_status IN ('active','paused')),
  published_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pub_script ON publications(script_id);
CREATE INDEX idx_pub_track ON publications(track_status, platform);

CREATE TABLE publication_metrics (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id   uuid NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
  views            int,
  completion_rate  real,
  likes            int,
  comments         int,
  shares           int,
  saves            int,
  collected_by     text NOT NULL DEFAULT 'manual'
                   CHECK (collected_by IN ('auto','manual')),
  recorded_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_metrics_pub ON publication_metrics(publication_id, recorded_at DESC);

CREATE TABLE style_profiles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scope       text NOT NULL CHECK (scope IN ('global','series')),
  series      text,
  rules       jsonb NOT NULL DEFAULT '{}',
  embedding   vector(1536),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_style_user ON style_profiles(user_id);

CREATE TABLE script_embeddings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id   uuid NOT NULL REFERENCES scripts(id) ON DELETE CASCADE,
  embedding   vector(1536) NOT NULL
);
CREATE INDEX idx_script_emb ON script_embeddings
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

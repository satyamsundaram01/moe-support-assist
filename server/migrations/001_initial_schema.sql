-- Description: Initial database schema for Ask Mode tables
-- v0.0.2 
-- postgres supported queries :

-- Enable UUID extension for PostgreSQL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Analytics Events Table
CREATE TABLE IF NOT EXISTS analytics_events (
    id BIGSERIAL PRIMARY KEY,
    event_data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for analytics_events
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_name ON analytics_events((event_data->>'event_name'));
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events((event_data->>'user_id'));
CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id ON analytics_events((event_data->>'session_id'));

-- Sessions Table
-- Stores Discovery Engine session information
CREATE TABLE IF NOT EXISTS asksessions (
    session_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    api_session_id TEXT NOT NULL,
    conversation_id TEXT,
    title TEXT DEFAULT 'Untitled Conversation',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT DEFAULT 'active',
    session_metadata JSONB DEFAULT '{}'::jsonb,
    total_queries INTEGER DEFAULT 0,
    last_query_at TIMESTAMPTZ,
    tags TEXT[]
);

-- Create indexes for asksessions
CREATE INDEX IF NOT EXISTS idx_asksessions_user_id ON asksessions(user_id);
CREATE INDEX IF NOT EXISTS idx_asksessions_api_session_id ON asksessions(api_session_id);
CREATE INDEX IF NOT EXISTS idx_asksessions_created_at ON asksessions(created_at);
CREATE INDEX IF NOT EXISTS idx_asksessions_updated_at ON asksessions(updated_at);
CREATE INDEX IF NOT EXISTS idx_asksessions_status ON asksessions(status);
CREATE INDEX IF NOT EXISTS idx_asksessions_last_query_at ON asksessions(last_query_at);


CREATE TABLE IF NOT EXISTS ask_conversation_turns (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES asksessions(session_id) ON DELETE CASCADE,
    user_query TEXT NOT NULL,
    ai_response TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb,
    citations JSONB
);

-- Create indexes for ask_conversation_turns
CREATE INDEX IF NOT EXISTS idx_ask_conversation_turns_session_id ON ask_conversation_turns(session_id);
CREATE INDEX IF NOT EXISTS idx_ask_conversation_turns_created_at ON ask_conversation_turns(created_at);

-- 

-- Announcements Table
-- Stores system announcements and notifications
CREATE TABLE IF NOT EXISTS announcements (
    id TEXT PRIMARY KEY,
    enabled BOOLEAN NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('banner','toast')),
    severity TEXT NOT NULL CHECK (severity IN ('info','success','warning','error')),
    title TEXT,
    message TEXT NOT NULL,
    dismissible BOOLEAN NOT NULL,
    max_impressions_per_user INT,
    frequency TEXT NOT NULL CHECK (frequency IN ('always','once','per_session','per_day')),
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for announcements
CREATE INDEX IF NOT EXISTS idx_announcements_enabled ON announcements(enabled);
CREATE INDEX IF NOT EXISTS idx_announcements_type ON announcements(type);
CREATE INDEX IF NOT EXISTS idx_announcements_severity ON announcements(severity);
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON announcements(created_at);
CREATE INDEX IF NOT EXISTS idx_announcements_updated_at ON announcements(updated_at);

-- Announcement Impressions Table
-- Tracks which users have seen which announcements
CREATE TABLE IF NOT EXISTS announcement_impressions (
    id BIGSERIAL PRIMARY KEY,
    announcement_id TEXT NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for announcement_impressions
CREATE INDEX IF NOT EXISTS idx_announcement_impressions_announcement_user ON announcement_impressions(announcement_id, user_id);
CREATE INDEX IF NOT EXISTS idx_announcement_impressions_user_id ON announcement_impressions(user_id);
CREATE INDEX IF NOT EXISTS idx_announcement_impressions_seen_at ON announcement_impressions(seen_at);

-- Announcement Dismissals Table
-- Tracks which users have dismissed which announcements
CREATE TABLE IF NOT EXISTS announcement_dismissals (
    announcement_id TEXT NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    dismissed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (announcement_id, user_id)
);

-- Create indexes for announcement_dismissals
CREATE INDEX IF NOT EXISTS idx_announcement_dismissals_user_id ON announcement_dismissals(user_id);
CREATE INDEX IF NOT EXISTS idx_announcement_dismissals_dismissed_at ON announcement_dismissals(dismissed_at);

-- Prompt Library Table
-- Stores reusable prompt templates
CREATE TABLE IF NOT EXISTS prompt_library (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL,
    tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    likes INTEGER NOT NULL DEFAULT 0,
    is_favorite BOOLEAN NOT NULL DEFAULT true,
    is_public BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by TEXT
);

-- Create indexes for prompt_library
CREATE INDEX IF NOT EXISTS idx_prompt_library_category ON prompt_library(category);
CREATE INDEX IF NOT EXISTS idx_prompt_library_created_by ON prompt_library(created_by);
CREATE INDEX IF NOT EXISTS idx_prompt_library_is_public ON prompt_library(is_public);
CREATE INDEX IF NOT EXISTS idx_prompt_library_created_at ON prompt_library(created_at);
CREATE INDEX IF NOT EXISTS idx_prompt_library_tags ON prompt_library USING GIN(tags);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_announcements_updated_at 
    BEFORE UPDATE ON announcements 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert migration record
CREATE TABLE IF NOT EXISTS migrations (
    id SERIAL PRIMARY KEY,
    migration_name TEXT NOT NULL UNIQUE,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    checksum TEXT NOT NULL
);

INSERT INTO migrations (migration_name, checksum) 
VALUES ('001_initial_schema', 'initial_schema_v2')
ON CONFLICT (migration_name) DO NOTHING; 

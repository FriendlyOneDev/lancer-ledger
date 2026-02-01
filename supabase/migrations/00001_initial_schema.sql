-- TTRPG Ledger - Lancer Campaign Tracker
-- Initial database schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE log_type AS ENUM ('game', 'trade');

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    discord_id TEXT,
    discord_username TEXT,
    display_name TEXT,
    is_gm BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pilots table
CREATE TABLE pilots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    callsign TEXT,
    license_level INTEGER DEFAULT 2 CHECK (license_level >= 0 AND license_level <= 12),
    ll_clock_progress INTEGER DEFAULT 0 CHECK (ll_clock_progress >= 0),
    background TEXT,
    notes TEXT,
    manna INTEGER DEFAULT 0,
    downtime INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Corporations table (GM-managed homebrew corps)
CREATE TABLE corporations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Corporation Reputation table
CREATE TABLE corporation_reputation (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pilot_id UUID NOT NULL REFERENCES pilots(id) ON DELETE CASCADE,
    corporation_id UUID NOT NULL REFERENCES corporations(id) ON DELETE CASCADE,
    reputation_value INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(pilot_id, corporation_id)
);

-- Exotic Gear table
CREATE TABLE exotic_gear (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pilot_id UUID NOT NULL REFERENCES pilots(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    acquired_date TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Personal Clocks table (LL clock is managed via pilot table)
CREATE TABLE clocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pilot_id UUID REFERENCES pilots(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    segments INTEGER NOT NULL CHECK (segments > 0),
    filled INTEGER DEFAULT 0 CHECK (filled >= 0),
    tick_amount INTEGER DEFAULT 1 CHECK (tick_amount > 0),
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Log Entries table
CREATE TABLE log_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pilot_id UUID NOT NULL REFERENCES pilots(id) ON DELETE CASCADE,
    log_type log_type NOT NULL,
    description TEXT,
    manna_change INTEGER DEFAULT 0,
    downtime_change INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clock Progress table (tracks which clocks were ticked in which log)
CREATE TABLE clock_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    log_entry_id UUID NOT NULL REFERENCES log_entries(id) ON DELETE CASCADE,
    clock_id UUID NOT NULL REFERENCES clocks(id) ON DELETE CASCADE,
    ticks_applied INTEGER NOT NULL CHECK (ticks_applied > 0),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_pilots_user_id ON pilots(user_id);
CREATE INDEX idx_corporation_reputation_pilot_id ON corporation_reputation(pilot_id);
CREATE INDEX idx_exotic_gear_pilot_id ON exotic_gear(pilot_id);
CREATE INDEX idx_clocks_pilot_id ON clocks(pilot_id);
CREATE INDEX idx_log_entries_pilot_id ON log_entries(pilot_id);
CREATE INDEX idx_log_entries_log_type ON log_entries(log_type);
CREATE INDEX idx_log_entries_created_at ON log_entries(created_at);
CREATE INDEX idx_clock_progress_log_entry_id ON clock_progress(log_entry_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pilots_updated_at BEFORE UPDATE ON pilots
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_corporations_updated_at BEFORE UPDATE ON corporations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_corporation_reputation_updated_at BEFORE UPDATE ON corporation_reputation
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exotic_gear_updated_at BEFORE UPDATE ON exotic_gear
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clocks_updated_at BEFORE UPDATE ON clocks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_log_entries_updated_at BEFORE UPDATE ON log_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE pilots ENABLE ROW LEVEL SECURITY;
ALTER TABLE corporations ENABLE ROW LEVEL SECURITY;
ALTER TABLE corporation_reputation ENABLE ROW LEVEL SECURITY;
ALTER TABLE exotic_gear ENABLE ROW LEVEL SECURITY;
ALTER TABLE clocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE log_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE clock_progress ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is GM (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION is_gm()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT is_gm FROM public.users WHERE id = auth.uid()),
    false
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Users policies
CREATE POLICY "Users can view their own profile"
    ON users FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON users FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "GMs can view all users"
    ON users FOR SELECT
    USING (is_gm());

-- Pilots policies
CREATE POLICY "Users can view their own pilots"
    ON pilots FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own pilots"
    ON pilots FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own pilots"
    ON pilots FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own pilots"
    ON pilots FOR DELETE
    USING (user_id = auth.uid());

CREATE POLICY "GMs can view all pilots"
    ON pilots FOR SELECT
    USING (is_gm());

-- Corporations policies (everyone can read, GM can write)
CREATE POLICY "Anyone can view corporations"
    ON corporations FOR SELECT
    USING (TRUE);

CREATE POLICY "GMs can insert corporations"
    ON corporations FOR INSERT
    WITH CHECK (is_gm());

CREATE POLICY "GMs can update corporations"
    ON corporations FOR UPDATE
    USING (is_gm());

CREATE POLICY "GMs can delete corporations"
    ON corporations FOR DELETE
    USING (is_gm());

-- Corporation Reputation policies
CREATE POLICY "Users can view reputation for their pilots"
    ON corporation_reputation FOR SELECT
    USING (EXISTS (SELECT 1 FROM pilots WHERE pilots.id = pilot_id AND pilots.user_id = auth.uid()));

CREATE POLICY "Users can insert reputation for their pilots"
    ON corporation_reputation FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM pilots WHERE pilots.id = pilot_id AND pilots.user_id = auth.uid()));

CREATE POLICY "Users can update reputation for their pilots"
    ON corporation_reputation FOR UPDATE
    USING (EXISTS (SELECT 1 FROM pilots WHERE pilots.id = pilot_id AND pilots.user_id = auth.uid()));

CREATE POLICY "Users can delete reputation for their pilots"
    ON corporation_reputation FOR DELETE
    USING (EXISTS (SELECT 1 FROM pilots WHERE pilots.id = pilot_id AND pilots.user_id = auth.uid()));

CREATE POLICY "GMs can view all reputation"
    ON corporation_reputation FOR SELECT
    USING (is_gm());

-- Exotic Gear policies
CREATE POLICY "Users can view gear for their pilots"
    ON exotic_gear FOR SELECT
    USING (EXISTS (SELECT 1 FROM pilots WHERE pilots.id = pilot_id AND pilots.user_id = auth.uid()));

CREATE POLICY "Users can insert gear for their pilots"
    ON exotic_gear FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM pilots WHERE pilots.id = pilot_id AND pilots.user_id = auth.uid()));

CREATE POLICY "Users can update gear for their pilots"
    ON exotic_gear FOR UPDATE
    USING (EXISTS (SELECT 1 FROM pilots WHERE pilots.id = pilot_id AND pilots.user_id = auth.uid()));

CREATE POLICY "Users can delete gear for their pilots"
    ON exotic_gear FOR DELETE
    USING (EXISTS (SELECT 1 FROM pilots WHERE pilots.id = pilot_id AND pilots.user_id = auth.uid()));

CREATE POLICY "GMs can view all gear"
    ON exotic_gear FOR SELECT
    USING (is_gm());

-- Clocks policies
CREATE POLICY "Users can view clocks for their pilots"
    ON clocks FOR SELECT
    USING (pilot_id IS NULL OR EXISTS (SELECT 1 FROM pilots WHERE pilots.id = pilot_id AND pilots.user_id = auth.uid()));

CREATE POLICY "Users can insert clocks for their pilots"
    ON clocks FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM pilots WHERE pilots.id = pilot_id AND pilots.user_id = auth.uid()));

CREATE POLICY "Users can update clocks for their pilots"
    ON clocks FOR UPDATE
    USING (EXISTS (SELECT 1 FROM pilots WHERE pilots.id = pilot_id AND pilots.user_id = auth.uid()));

CREATE POLICY "Users can delete clocks for their pilots"
    ON clocks FOR DELETE
    USING (EXISTS (SELECT 1 FROM pilots WHERE pilots.id = pilot_id AND pilots.user_id = auth.uid()));

CREATE POLICY "GMs can view all clocks"
    ON clocks FOR SELECT
    USING (is_gm());

-- Log Entries policies
CREATE POLICY "Users can view logs for their pilots"
    ON log_entries FOR SELECT
    USING (EXISTS (SELECT 1 FROM pilots WHERE pilots.id = pilot_id AND pilots.user_id = auth.uid()));

CREATE POLICY "Users can insert logs for their pilots"
    ON log_entries FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM pilots WHERE pilots.id = pilot_id AND pilots.user_id = auth.uid()));

CREATE POLICY "Users can update logs for their pilots"
    ON log_entries FOR UPDATE
    USING (EXISTS (SELECT 1 FROM pilots WHERE pilots.id = pilot_id AND pilots.user_id = auth.uid()));

CREATE POLICY "Users can delete logs for their pilots"
    ON log_entries FOR DELETE
    USING (EXISTS (SELECT 1 FROM pilots WHERE pilots.id = pilot_id AND pilots.user_id = auth.uid()));

CREATE POLICY "GMs can view all logs"
    ON log_entries FOR SELECT
    USING (is_gm());

-- Clock Progress policies
CREATE POLICY "Users can view clock progress for their logs"
    ON clock_progress FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM log_entries
        JOIN pilots ON pilots.id = log_entries.pilot_id
        WHERE log_entries.id = log_entry_id AND pilots.user_id = auth.uid()
    ));

CREATE POLICY "Users can insert clock progress for their logs"
    ON clock_progress FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM log_entries
        JOIN pilots ON pilots.id = log_entries.pilot_id
        WHERE log_entries.id = log_entry_id AND pilots.user_id = auth.uid()
    ));

CREATE POLICY "Users can delete clock progress for their logs"
    ON clock_progress FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM log_entries
        JOIN pilots ON pilots.id = log_entries.pilot_id
        WHERE log_entries.id = log_entry_id AND pilots.user_id = auth.uid()
    ));

CREATE POLICY "GMs can view all clock progress"
    ON clock_progress FOR SELECT
    USING (is_gm());

-- Function to handle new user creation from Discord OAuth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, discord_id, discord_username, display_name)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'provider_id',
        NEW.raw_user_meta_data->>'full_name',
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Pilot')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create user profile on signup
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Helper function to get LL clock segments based on license level
CREATE OR REPLACE FUNCTION get_ll_clock_segments(ll INTEGER)
RETURNS INTEGER AS $$
BEGIN
    IF ll >= 1 AND ll <= 5 THEN
        RETURN 3;
    ELSIF ll >= 6 AND ll <= 9 THEN
        RETURN 4;
    ELSIF ll >= 10 AND ll <= 12 THEN
        RETURN 5;
    ELSE
        RETURN 3; -- Default
    END IF;
END;
$$ LANGUAGE plpgsql;

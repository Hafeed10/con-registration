-- ====================================================================
-- CONFIQ 2026 - Supabase Database Schema & RLS Setup
-- Run this entire script in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/memrzpxzijsthjeduago/sql
-- ====================================================================

-- 1. DELEGATES TABLE
CREATE TABLE IF NOT EXISTS public.delegates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pass_id TEXT UNIQUE,
    full_name TEXT NOT NULL,
    age INTEGER,
    phone TEXT,
    whatsapp TEXT,
    address TEXT,
    status TEXT DEFAULT 'Student',
    campus TEXT,
    position TEXT,
    study_range TEXT DEFAULT 'Muthawwal',
    birudam TEXT DEFAULT 'N/A',
    sanad TEXT DEFAULT 'N/A',
    studied_alfiyya BOOLEAN DEFAULT true,
    utr_number TEXT,
    payment_screenshot TEXT,
    payment_status TEXT DEFAULT 'PENDING_VERIFICATION',
    amount NUMERIC DEFAULT 200,
    rejection_reason TEXT,
    verified_at TIMESTAMPTZ,
    verified_by TEXT,
    arrived BOOLEAN DEFAULT false,
    attendance_status TEXT DEFAULT 'ABSENT',
    arrived_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookup by phone / pass_id / utr
CREATE INDEX IF NOT EXISTS idx_delegates_pass_id ON public.delegates (pass_id);
CREATE INDEX IF NOT EXISTS idx_delegates_phone ON public.delegates (phone);
CREATE INDEX IF NOT EXISTS idx_delegates_whatsapp ON public.delegates (whatsapp);
CREATE INDEX IF NOT EXISTS idx_delegates_created_at ON public.delegates (created_at DESC);

-- 2. SESSIONS TABLE
CREATE TABLE IF NOT EXISTS public.sessions (
    id TEXT PRIMARY KEY,
    speaker_name TEXT NOT NULL,
    flag TEXT DEFAULT '🇬🇧',
    role TEXT,
    affiliation TEXT,
    photo TEXT,
    tags TEXT[],
    bio TEXT,
    abstract TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. TRACKS TABLE
CREATE TABLE IF NOT EXISTS public.tracks (
    id TEXT PRIMARY KEY,
    code TEXT,
    title TEXT NOT NULL,
    speakers_count TEXT,
    description TEXT,
    topics TEXT[],
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Enable RLS and grant full access to anonymous and authenticated users
-- ====================================================================

ALTER TABLE public.delegates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to prevent duplication errors
DROP POLICY IF EXISTS "Allow public all access on delegates" ON public.delegates;
DROP POLICY IF EXISTS "Allow public all access on sessions" ON public.sessions;
DROP POLICY IF EXISTS "Allow public all access on tracks" ON public.tracks;

-- Create permissive policies for delegates
CREATE POLICY "Allow public all access on delegates"
ON public.delegates
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Create permissive policies for sessions
CREATE POLICY "Allow public all access on sessions"
ON public.sessions
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Create permissive policies for tracks
CREATE POLICY "Allow public all access on tracks"
ON public.tracks
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- ====================================================================
-- REALTIME REPLICATION (For live dashboard updates)
-- ====================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.delegates;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tracks;

-- ====================================================================
-- INITIAL SEED DATA (Default Tracks & Sessions)
-- ====================================================================
INSERT INTO public.tracks (id, code, title, speakers_count, description, topics)
VALUES 
    ('track-1', 'TRACK 01', 'Decentralized Crypto Finance & Smart Contracts', '4 Keynotes', 'Examining tokenomics, decentralized liquidity pools, automated market makers (AMMs), and staking rewards under Islamic jurisprudence and Usul al-Fiqh.', ARRAY['DeFi Yield Farming', 'Algorithmic Stablecoins', 'Smart Contract Gharar']),
    ('track-2', 'TRACK 02', 'Artificial Intelligence & Algorithmic Fatwa Limits', '5 Sessions', 'Delineating ethical boundary conditions, LLM hallucination risks, and legal accountability when AI agents generate legal opinions or fatwas.', ARRAY['LLM Jurisprudential Limits', 'Autonomous Ijtihad Risks', 'Algorithmic Bias']),
    ('track-3', 'TRACK 03', 'CRISPR Gene Editing & Bioethical Jurisprudence', '3 Panels', 'Scholarly evaluation of somatic vs. germline modification, human enhancement boundaries, synthetic biology, and genetic patenting in Fiqh.', ARRAY['Germline Editing Limits', 'Gene Therapy Fiqh', 'Genomic Privacy']),
    ('track-4', 'TRACK 04', 'Makhdoomi Shafi''i Heritage & Applied Jurisprudence', '6 Lectures', 'Tracing the Indian Ocean jurisprudence tradition from Ponnani Makhdooms to contemporary Malabar Coast legal applications.', ARRAY['Makhdoomi Manuscripts', 'Maritime Jurisprudence', 'Contemporary Nawazil'])
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.sessions (id, speaker_name, flag, role, affiliation, photo, tags, bio, abstract)
VALUES
    ('session-1', 'Zack Wilson', '🇬🇧', 'Senior Product Designer at Meta', 'Lead Researcher in AI Fatwa Limits & UX Guardrails', '/zack_wilson.jpg', ARRAY['UX/UI design', 'Product design', 'Copywriting'], 'Zack Wilson is a Senior Product Designer at Meta with over 12 years of experience designing complex algorithmic interfaces and human-AI interaction patterns.', 'This session explores how user interfaces can transparently signal AI confidence levels, prevent automated fatwa hallucinations, and preserve human scholarly authority in digital legal consultations.')
ON CONFLICT (id) DO NOTHING;

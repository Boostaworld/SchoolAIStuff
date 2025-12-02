-- ============================================
-- ORBIT OS PHASE 3 ENHANCED - TYPING SYSTEM
-- Advanced Challenges, Racing, AI Generation
-- ============================================

-- ============================================
-- 1. UPDATE TYPING CHALLENGES - Add Categories & Metadata
-- ============================================
ALTER TABLE public.typing_challenges
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Standard',
  ADD COLUMN IF NOT EXISTS length_type TEXT CHECK (length_type IN ('Sprint', 'Medium', 'Marathon')) DEFAULT 'Medium',
  ADD COLUMN IF NOT EXISTS is_custom BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS word_count INTEGER,
  ADD COLUMN IF NOT EXISTS char_count INTEGER;

-- Calculate word/char counts for existing challenges
UPDATE public.typing_challenges
SET
  word_count = array_length(string_to_array(text_content, ' '), 1),
  char_count = length(text_content)
WHERE word_count IS NULL;

-- Create index for category filtering
CREATE INDEX IF NOT EXISTS typing_challenges_category_idx ON public.typing_challenges(category, difficulty);
CREATE INDEX IF NOT EXISTS typing_challenges_user_idx ON public.typing_challenges(user_id);

-- ============================================
-- 2. CHALLENGE HISTORY / RESULTS CHANNEL
-- ============================================
CREATE TABLE IF NOT EXISTS public.typing_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  challenge_id UUID REFERENCES public.typing_challenges(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.typing_sessions(id) ON DELETE CASCADE,

  -- Performance metrics
  wpm NUMERIC(6, 2) NOT NULL,
  accuracy NUMERIC(5, 2) NOT NULL,
  error_count INTEGER DEFAULT 0,
  time_elapsed INTEGER, -- seconds

  -- Per-word breakdown
  words_data JSONB, -- { word: string, correct: boolean, time_ms: number }[]

  -- Challenge snapshot (in case challenge gets deleted)
  challenge_text TEXT,
  challenge_title TEXT,

  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.typing_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own typing history"
  ON public.typing_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own typing history"
  ON public.typing_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX typing_history_user_idx ON public.typing_history(user_id, completed_at DESC);

-- ============================================
-- 3. RACING SYSTEM
-- ============================================
CREATE TABLE IF NOT EXISTS public.typing_races (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  challenge_id UUID REFERENCES public.typing_challenges(id) ON DELETE CASCADE NOT NULL,
  host_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,

  -- Race settings
  bot_count INTEGER DEFAULT 3,
  bot_wpm_ranges INTEGER[], -- [20, 50, 70] etc

  -- Race state
  status TEXT CHECK (status IN ('waiting', 'in_progress', 'completed')) DEFAULT 'waiting',
  started_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.typing_races ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view races"
  ON public.typing_races FOR SELECT
  USING (true);

CREATE POLICY "Users can create races"
  ON public.typing_races FOR INSERT
  WITH CHECK (auth.uid() = host_user_id);

-- Race participants (users + bots)
CREATE TABLE IF NOT EXISTS public.race_participants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  race_id UUID REFERENCES public.typing_races(id) ON DELETE CASCADE NOT NULL,

  -- Participant info
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_bot BOOLEAN DEFAULT false,
  bot_name TEXT,
  bot_target_wpm INTEGER,

  -- Race results
  position INTEGER,
  final_wpm NUMERIC(6, 2),
  final_accuracy NUMERIC(5, 2),
  completion_time INTEGER, -- milliseconds

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.race_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view race participants"
  ON public.race_participants FOR SELECT
  USING (true);

CREATE INDEX race_participants_race_idx ON public.race_participants(race_id);

-- ============================================
-- 4. AI GENERATION QUEUE
-- ============================================
CREATE TABLE IF NOT EXISTS public.challenge_generation_queue (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,

  -- Generation parameters
  category TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  length_type TEXT NOT NULL,
  custom_prompt TEXT, -- Optional user instructions

  -- Queue status
  status TEXT CHECK (status IN ('pending', 'generating', 'completed', 'failed')) DEFAULT 'pending',
  generated_challenge_id UUID REFERENCES public.typing_challenges(id) ON DELETE SET NULL,
  error_message TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.challenge_generation_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own generation queue"
  ON public.challenge_generation_queue FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert generation requests"
  ON public.challenge_generation_queue FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX generation_queue_user_status_idx ON public.challenge_generation_queue(user_id, status);

-- ============================================
-- 5. SEED NEW CHALLENGE CATEGORIES
-- ============================================

-- Update existing challenges with categories
UPDATE public.typing_challenges
SET category = 'Quick Start', length_type = 'Sprint', word_count = 14, char_count = 78
WHERE title = 'Quick Start';

UPDATE public.typing_challenges
SET category = 'Programming', length_type = 'Sprint', word_count = 11, char_count = 68
WHERE title = 'Code Sprint';

UPDATE public.typing_challenges
SET category = 'Science', length_type = 'Marathon', word_count = 21, char_count = 163
WHERE title = 'Theory Test';

UPDATE public.typing_challenges
SET category = 'Programming', length_type = 'Medium', word_count = 18, char_count = 125
WHERE title = 'Database Query';

UPDATE public.typing_challenges
SET category = 'Technical', length_type = 'Medium', word_count = 18, char_count = 152
WHERE title = 'Technical Prose';

UPDATE public.typing_challenges
SET category = 'Programming', length_type = 'Medium', word_count = 14, char_count = 119
WHERE title = 'Variable Names';

-- Add more diverse challenges
INSERT INTO public.typing_challenges (title, text_content, difficulty, category, length_type) VALUES

-- Sprint Challenges (< 50 words)
('Speed Test Alpha', 'The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs. How vexingly quick daft zebras jump!', 'Easy', 'Speed Training', 'Sprint'),
('Code Comment', '// TODO: Refactor this function to use async/await instead of callbacks for better readability and error handling.', 'Medium', 'Programming', 'Sprint'),
('Git Commit', 'feat: add user authentication with JWT tokens and refresh token rotation for enhanced security', 'Easy', 'Programming', 'Sprint'),

-- Medium Challenges (50-150 words)
('React Component', 'import React, { useState, useEffect } from ''react''; export const UserProfile = ({ userId }) => { const [user, setUser] = useState(null); useEffect(() => { fetch(`/api/users/${userId}`).then(res => res.json()).then(setUser); }, [userId]); return <div>{user?.name}</div>; };', 'Hard', 'Programming', 'Medium'),
('Async JavaScript', 'async function fetchUserData(userId) { try { const response = await fetch(`/api/users/${userId}`); if (!response.ok) throw new Error("Failed to fetch"); const data = await response.json(); return data; } catch (error) { console.error("Error fetching user:", error); return null; } }', 'Hard', 'Programming', 'Medium'),
('CSS Flexbox', 'Flexbox is a one-dimensional layout method for arranging items in rows or columns. Items flex to fill additional space or shrink to fit into smaller spaces. This makes flexbox perfect for responsive layouts that adapt to different screen sizes and orientations.', 'Medium', 'Technical', 'Medium'),
('Linux Commands', 'To search for files in Linux, use the find command: find /path/to/search -name "filename" -type f. For text within files, use grep: grep -r "search term" /path/to/directory. Combine them: find . -type f -name "*.log" -exec grep -l "error" {} \;', 'Hard', 'Technical', 'Medium'),

-- Marathon Challenges (150+ words)
('Web Architecture', 'Modern web applications typically follow a three-tier architecture consisting of presentation, application, and data layers. The presentation layer handles the user interface and user experience, often built with frameworks like React, Vue, or Angular. The application layer contains business logic and is implemented using backend frameworks such as Node.js, Django, or Spring Boot. The data layer manages persistent storage using databases like PostgreSQL, MongoDB, or Redis. Communication between layers happens through RESTful APIs or GraphQL endpoints. This separation of concerns enables scalability, maintainability, and independent development of each layer. Additionally, microservices architecture has gained popularity for large-scale applications, where functionality is split into smaller, independently deployable services that communicate via APIs.', 'Hard', 'Technical', 'Marathon'),
('Python OOP', 'class BankAccount: def __init__(self, owner, balance=0): self.owner = owner self.balance = balance def deposit(self, amount): if amount > 0: self.balance += amount return True return False def withdraw(self, amount): if amount > 0 and amount <= self.balance: self.balance -= amount return True return False def get_balance(self): return self.balance account = BankAccount("Alice", 1000) account.deposit(500) account.withdraw(200) print(f"Balance: ${account.get_balance()}")', 'Hard', 'Programming', 'Marathon'),
('Cybersecurity Basics', 'Cybersecurity involves protecting systems, networks, and data from digital attacks. Common threats include malware, phishing, ransomware, and SQL injection. Defense mechanisms include firewalls, encryption, multi-factor authentication, and regular security audits. Best practices involve keeping software updated, using strong passwords, limiting access privileges, and educating users about social engineering. Modern security employs zero-trust architecture, assuming no user or system is trustworthy by default. Continuous monitoring, incident response plans, and penetration testing are essential for maintaining robust security posture.', 'Medium', 'Technical', 'Marathon');

-- ============================================
-- 6. ENABLE REALTIME FOR NEW TABLES
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.typing_races;
ALTER PUBLICATION supabase_realtime ADD TABLE public.race_participants;

-- ============================================
-- DONE! Enhanced typing system ready.
-- ============================================

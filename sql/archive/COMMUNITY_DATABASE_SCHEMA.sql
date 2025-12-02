# 🌐 COMMUNITY HUB - COMPLETE DATABASE SCHEMA
## Feed, Study Groups, Showcase, Help Corner

---

## 📊 COMPLETE SCHEMA SQL

```sql
-- ============================================
-- COMMUNITY HUB SCHEMA
-- ============================================

-- 1. POSTS (Community Feed)
-- ============================================
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Content
  content TEXT NOT NULL CHECK (char_length(content) <= 500),
  post_type TEXT CHECK (post_type IN ('text', 'achievement', 'study_group', 'help', 'showcase')) DEFAULT 'text',
  tags TEXT[], -- ['math', 'cs201', 'typing', 'achievement']
  
  -- Media
  image_url TEXT,
  video_url TEXT,
  
  -- Engagement metrics
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  
  -- Metadata
  metadata JSONB, -- {task_id, race_id, wpm, accuracy, etc}
  
  -- Visibility
  is_pinned BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX posts_author_idx ON public.posts(author_id, created_at DESC);
CREATE INDEX posts_type_idx ON public.posts(post_type, created_at DESC);
CREATE INDEX posts_tags_idx ON public.posts USING GIN(tags);
CREATE INDEX posts_engagement_idx ON public.posts((likes_count + comments_count * 2) DESC) WHERE is_deleted = false;

-- RLS
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public posts"
  ON public.posts FOR SELECT
  USING (is_deleted = false);

CREATE POLICY "Users can create posts"
  ON public.posts FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update own posts"
  ON public.posts FOR UPDATE
  USING (auth.uid() = author_id);

CREATE POLICY "Users can soft-delete own posts"
  ON public.posts FOR UPDATE
  USING (auth.uid() = author_id AND is_deleted = false);

-- 2. POST LIKES
-- ============================================
CREATE TABLE IF NOT EXISTS public.post_likes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(post_id, user_id)
);

CREATE INDEX post_likes_post_idx ON public.post_likes(post_id);
CREATE INDEX post_likes_user_idx ON public.post_likes(user_id);

ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view post likes"
  ON public.post_likes FOR SELECT
  USING (true);

CREATE POLICY "Users can like posts"
  ON public.post_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike posts"
  ON public.post_likes FOR DELETE
  USING (auth.uid() = user_id);

-- 3. POST COMMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS public.post_comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL CHECK (char_length(content) <= 200),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX post_comments_post_idx ON public.post_comments(post_id, created_at ASC);
CREATE INDEX post_comments_author_idx ON public.post_comments(author_id);

ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view comments"
  ON public.post_comments FOR SELECT
  USING (true);

CREATE POLICY "Users can comment on posts"
  ON public.post_comments FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can delete own comments"
  ON public.post_comments FOR DELETE
  USING (auth.uid() = author_id);

-- 4. USER FOLLOWING
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_follows (
  follower_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id != following_id)
);

CREATE INDEX user_follows_follower_idx ON public.user_follows(follower_id);
CREATE INDEX user_follows_following_idx ON public.user_follows(following_id);

ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view follows"
  ON public.user_follows FOR SELECT
  USING (true);

CREATE POLICY "Users can follow others"
  ON public.user_follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow"
  ON public.user_follows FOR DELETE
  USING (auth.uid() = follower_id);

-- 5. STUDY GROUPS
-- ============================================
CREATE TABLE IF NOT EXISTS public.study_groups (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  course_tag TEXT, -- 'MATH101', 'CS201'
  course_name TEXT, -- 'Calculus I', 'Data Structures'
  creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Settings
  is_public BOOLEAN DEFAULT true,
  max_members INTEGER DEFAULT 10,
  meeting_schedule TEXT, -- 'Mon/Wed 7pm EST'
  meeting_link TEXT, -- Discord, Zoom, etc
  
  -- Stats
  member_count INTEGER DEFAULT 1,
  
  -- Flags
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX study_groups_course_idx ON public.study_groups(course_tag) WHERE is_active = true;
CREATE INDEX study_groups_creator_idx ON public.study_groups(creator_id);

ALTER TABLE public.study_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public groups"
  ON public.study_groups FOR SELECT
  USING (is_public = true AND is_active = true);

CREATE POLICY "Users can create groups"
  ON public.study_groups FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update groups"
  ON public.study_groups FOR UPDATE
  USING (auth.uid() = creator_id);

-- 6. GROUP MEMBERS
-- ============================================
CREATE TABLE IF NOT EXISTS public.group_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  group_id UUID REFERENCES public.study_groups(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT CHECK (role IN ('creator', 'member')) DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(group_id, user_id)
);

CREATE INDEX group_members_group_idx ON public.group_members(group_id);
CREATE INDEX group_members_user_idx ON public.group_members(user_id);

ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view group members"
  ON public.group_members FOR SELECT
  USING (true);

CREATE POLICY "Users can join groups"
  ON public.group_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave groups"
  ON public.group_members FOR DELETE
  USING (auth.uid() = user_id);

-- 7. HELP CORNER (Minimal Q&A)
-- ============================================
CREATE TABLE IF NOT EXISTS public.help_questions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[],
  
  -- AI check
  ai_queried BOOLEAN DEFAULT false,
  ai_response TEXT,
  
  -- Bounty
  bounty_amount INTEGER DEFAULT 0,
  
  -- Status
  status TEXT CHECK (status IN ('open', 'answered', 'closed')) DEFAULT 'open',
  accepted_answer_id UUID,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX help_questions_author_idx ON public.help_questions(author_id);
CREATE INDEX help_questions_status_idx ON public.help_questions(status, created_at DESC);

ALTER TABLE public.help_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view questions"
  ON public.help_questions FOR SELECT
  USING (true);

CREATE POLICY "Users can ask questions"
  ON public.help_questions FOR INSERT
  WITH CHECK (auth.uid() = author_id AND ai_queried = true);

-- 8. HELP ANSWERS
-- ============================================
CREATE TABLE IF NOT EXISTS public.help_answers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  question_id UUID REFERENCES public.help_questions(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL CHECK (char_length(content) <= 10000),
  
  -- Detection
  time_to_answer INTEGER, -- seconds
  is_flagged BOOLEAN DEFAULT false,
  flag_reasons TEXT[],
  
  -- Votes
  upvotes INTEGER DEFAULT 0,
  is_accepted BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX help_answers_question_idx ON public.help_answers(question_id, upvotes DESC);
CREATE INDEX help_answers_author_idx ON public.help_answers(author_id);

ALTER TABLE public.help_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view answers"
  ON public.help_answers FOR SELECT
  USING (true);

CREATE POLICY "Users can answer questions"
  ON public.help_answers FOR INSERT
  WITH CHECK (auth.uid() = author_id);
```

---

## 🔄 RPC FUNCTIONS

```sql
-- 1. LIKE POST (with counter update)
-- ============================================
CREATE OR REPLACE FUNCTION like_post(p_post_id UUID, p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert like
  INSERT INTO public.post_likes (post_id, user_id)
  VALUES (p_post_id, p_user_id)
  ON CONFLICT (post_id, user_id) DO NOTHING;
  
  -- Update counter
  UPDATE public.posts
  SET likes_count = (SELECT COUNT(*) FROM public.post_likes WHERE post_id = p_post_id)
  WHERE id = p_post_id;
END;
$$;

-- 2. UNLIKE POST
-- ============================================
CREATE OR REPLACE FUNCTION unlike_post(p_post_id UUID, p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.post_likes WHERE post_id = p_post_id AND user_id = p_user_id;
  
  UPDATE public.posts
  SET likes_count = (SELECT COUNT(*) FROM public.post_likes WHERE post_id = p_post_id)
  WHERE id = p_post_id;
END;
$$;

-- 3. CREATE POST WITH VALIDATION
-- ============================================
CREATE OR REPLACE FUNCTION create_post(
  p_author_id UUID,
  p_content TEXT,
  p_post_type TEXT,
  p_tags TEXT[],
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  post_id UUID;
BEGIN
  -- Rate limit check (max 10 posts per hour)
  IF (SELECT COUNT(*) FROM public.posts 
      WHERE author_id = p_author_id 
      AND created_at > NOW() - INTERVAL '1 hour') >= 10 THEN
    RAISE EXCEPTION 'Rate limit: Max 10 posts per hour';
  END IF;
  
  INSERT INTO public.posts (author_id, content, post_type, tags, metadata)
  VALUES (p_author_id, p_content, p_post_type, p_tags, p_metadata)
  RETURNING id INTO post_id;
  
  RETURN post_id;
END;
$$;

-- 4. JOIN STUDY GROUP
-- ============================================
CREATE OR REPLACE FUNCTION join_study_group(p_group_id UUID, p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_members INTEGER;
  max_members INTEGER;
BEGIN
  -- Check capacity
  SELECT member_count, study_groups.max_members INTO current_members, max_members
  FROM public.study_groups
  WHERE id = p_group_id;
  
  IF current_members >= max_members THEN
    RAISE EXCEPTION 'Group is full';
  END IF;
  
  -- Add member
  INSERT INTO public.group_members (group_id, user_id)
  VALUES (p_group_id, p_user_id)
  ON CONFLICT DO NOTHING;
  
  -- Update counter
  UPDATE public.study_groups
  SET member_count = (SELECT COUNT(*) FROM public.group_members WHERE group_id = p_group_id)
  WHERE id = p_group_id;
END;
$$;

-- 5. GET FEED (with filters)
-- ============================================
CREATE OR REPLACE FUNCTION get_feed(
  p_user_id UUID,
  p_filter TEXT DEFAULT 'all', -- 'all', 'following', 'trending'
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  author_id UUID,
  author_username TEXT,
  author_avatar TEXT,
  content TEXT,
  post_type TEXT,
  tags TEXT[],
  likes_count INTEGER,
  comments_count INTEGER,
  user_has_liked BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_filter = 'following' THEN
    RETURN QUERY
    SELECT 
      p.id, p.author_id,
      prof.username, prof.avatar_url,
      p.content, p.post_type, p.tags,
      p.likes_count, p.comments_count,
      EXISTS(SELECT 1 FROM post_likes WHERE post_id = p.id AND user_id = p_user_id) as user_has_liked,
      p.created_at
    FROM public.posts p
    JOIN public.profiles prof ON p.author_id = prof.id
    WHERE p.author_id IN (
      SELECT following_id FROM public.user_follows WHERE follower_id = p_user_id
    )
    AND p.is_deleted = false
    ORDER BY p.created_at DESC
    LIMIT p_limit OFFSET p_offset;
    
  ELSIF p_filter = 'trending' THEN
    RETURN QUERY
    SELECT 
      p.id, p.author_id,
      prof.username, prof.avatar_url,
      p.content, p.post_type, p.tags,
      p.likes_count, p.comments_count,
      EXISTS(SELECT 1 FROM post_likes WHERE post_id = p.id AND user_id = p_user_id) as user_has_liked,
      p.created_at
    FROM public.posts p
    JOIN public.profiles prof ON p.author_id = prof.id
    WHERE p.created_at > NOW() - INTERVAL '24 hours'
    AND p.is_deleted = false
    ORDER BY (p.likes_count + p.comments_count * 2) DESC
    LIMIT p_limit OFFSET p_offset;
    
  ELSE -- 'all'
    RETURN QUERY
    SELECT 
      p.id, p.author_id,
      prof.username, prof.avatar_url,
      p.content, p.post_type, p.tags,
      p.likes_count, p.comments_count,
      EXISTS(SELECT 1 FROM post_likes WHERE post_id = p.id AND user_id = p_user_id) as user_has_liked,
      p.created_at
    FROM public.posts p
    JOIN public.profiles prof ON p.author_id = prof.id
    WHERE p.is_deleted = false
    ORDER BY p.created_at DESC
    LIMIT p_limit OFFSET p_offset;
  END IF;
END;
$$;
```

---

## 🎯 AUTO-POST TRIGGERS

```sql
-- Auto-create post when user completes typing session
CREATE OR REPLACE FUNCTION auto_post_achievement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only post if it's a new personal best
  IF NEW.wpm > (SELECT COALESCE(MAX(wpm), 0) FROM typing_sessions 
                 WHERE user_id = NEW.user_id AND id != NEW.id) THEN
    
    INSERT INTO public.posts (author_id, content, post_type, tags, metadata)
    VALUES (
      NEW.user_id,
      '🎉 New personal best: ' || NEW.wpm || ' WPM at ' || NEW.accuracy || '% accuracy!',
      'achievement',
      ARRAY['achievement', 'typing'],
      json_build_object('session_id', NEW.id, 'wpm', NEW.wpm, 'accuracy', NEW.accuracy)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_post_achievement_trigger
AFTER INSERT ON public.typing_sessions
FOR EACH ROW
EXECUTE FUNCTION auto_post_achievement();
```

---

## 📱 REALTIME SUBSCRIPTIONS

```typescript
// Subscribe to new posts in feed
supabase
  .channel('community_feed')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'posts',
    filter: 'is_deleted=eq.false'
  }, (payload) => {
    // Add new post to feed
    setPosts(prev => [payload.new, ...prev]);
  })
  .subscribe();

// Subscribe to likes on your posts
supabase
  .channel(`user_${userId}_post_likes`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'post_likes',
    filter: `post_id=in.(${userPostIds.join(',')})`
  }, (payload) => {
    // Update like count
    updatePostLikes(payload.new.post_id);
  })
  .subscribe();
```

---

**Status:** Complete database schema ready for implementation ✅  
**Next:** Create implementation timeline and get user approval

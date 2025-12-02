# 🧠 ORBIT OS - Q&A SYSTEM DESIGN
## Community Help & Knowledge Sharing

---

## 📋 EXECUTIVE SUMMARY

A Stack Overflow-style Q&A system integrated into Orbit OS where operatives can:
- **Ask** coding/technical/academic questions
- **Answer** other users' questions
- **Vote** on answers (upvote/downvote)
- **Accept** best answer (question author only)
- **Earn points** for helping others

---

## 🎯 CORE FEATURES

### 1. **Ask Questions**
- Rich text editor with code block support
- Tag system (JavaScript, Python, Math, etc.)
- Optional bounty (Orbit Points for best answer)
- Attach files/images
- Mark as urgent

### 2. **Answer Questions**
- Multiple answers per question
- Code snippets with syntax highlighting
- Attach screenshots/diagrams
- Edit your own answers

### 3. **Voting & Reputation**
- Upvote/downvote answers
- Best answer selection (green checkmark)
- Reputation points system:
  - +10 points for upvote on your answer
  - -2 points for downvote
  - +25 points for accepted answer
  - Bounty transferred if answer accepted

### 4. **Discovery & Search**
- Browse by tags
- Search questions
- Filter: Unanswered, Bounties, Trending
- Sort by: Newest, Most Votes, Bounty Amount

### 5. **Notifications**
- Someone answered your question
- Your answer was accepted
- Your answer was upvoted
- Question with tag you follow gets posted

---

## 🗄️ DATABASE SCHEMA

### New Tables

#### **questions**
```sql
CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Content
  title TEXT NOT NULL, -- "How to implement binary search in Python?"
  body TEXT NOT NULL, -- Full question with markdown
  code_snippet TEXT, -- Optional code example
  
  -- Metadata
  tags TEXT[], -- ['python', 'algorithms', 'binary-search']
  view_count INTEGER DEFAULT 0,
  is_urgent BOOLEAN DEFAULT false,
  bounty_amount INTEGER DEFAULT 0, -- Orbit points
  bounty_escrowed BOOLEAN DEFAULT false,
  
  -- Status
  status TEXT CHECK (status IN ('open', 'answered', 'closed')) DEFAULT 'open',
  accepted_answer_id UUID REFERENCES answers(id) ON DELETE SET NULL,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX questions_author_idx ON questions(author_id);
CREATE INDEX questions_tags_idx ON questions USING GIN(tags);
CREATE INDEX questions_status_idx ON questions(status, created_at DESC);
CREATE INDEX questions_bounty_idx ON questions(bounty_amount DESC) WHERE bounty_amount > 0;
```

#### **answers**
```sql
CREATE TABLE public.answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Content
  body TEXT NOT NULL,
  code_snippet TEXT,
  attachments JSONB, -- [{url: '...', type: 'image'}]
  
  -- Voting
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  net_score INTEGER DEFAULT 0, -- upvotes - downvotes
  
  is_accepted BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX answers_question_idx ON answers(question_id, net_score DESC);
CREATE INDEX answers_author_idx ON answers(author_id);
CREATE INDEX answers_accepted_idx ON answers(is_accepted) WHERE is_accepted = true;
```

#### **answer_votes**
```sql
CREATE TABLE public.answer_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  answer_id UUID REFERENCES answers(id) ON DELETE CASCADE NOT NULL,
  voter_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  vote_type TEXT CHECK (vote_type IN ('up', 'down')) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(answer_id, voter_id) -- One vote per user per answer
);

CREATE INDEX answer_votes_answer_idx ON answer_votes(answer_id);
CREATE INDEX answer_votes_voter_idx ON answer_votes(voter_id);
```

#### **question_views**
```sql
CREATE TABLE public.question_views (
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE NOT NULL,
  viewer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  viewed_at TIMESTAMP DEFAULT NOW(),
  
  PRIMARY KEY (question_id, viewer_id)
);
```

#### **user_tags** (Follow tags)
```sql
CREATE TABLE public.user_tags (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  tag TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  
  PRIMARY KEY (user_id, tag)
);
```

---

## ⚙️ RPC FUNCTIONS

### **vote_answer()**
```sql
CREATE OR REPLACE FUNCTION vote_answer(
  p_answer_id UUID,
  p_voter_id UUID,
  p_vote_type TEXT -- 'up' or 'down'
)
RETURNS VOID AS $$
DECLARE
  answer_author UUID;
  old_vote TEXT;
  points_change INTEGER;
BEGIN
  -- Get answer author
  SELECT author_id INTO answer_author FROM answers WHERE id = p_answer_id;
  
  -- Check if user already voted
  SELECT vote_type INTO old_vote FROM answer_votes 
  WHERE answer_id = p_answer_id AND voter_id = p_voter_id;
  
  -- Remove old vote if exists
  IF old_vote IS NOT NULL THEN
    DELETE FROM answer_votes WHERE answer_id = p_answer_id AND voter_id = p_voter_id;
    
    -- Revert points
    IF old_vote = 'up' THEN
      UPDATE answers SET upvotes = upvotes - 1, net_score = net_score - 1 WHERE id = p_answer_id;
      UPDATE profiles SET orbit_points = orbit_points - 10 WHERE id = answer_author;
    ELSE
      UPDATE answers SET downvotes = downvotes - 1, net_score = net_score + 1 WHERE id = p_answer_id;
      UPDATE profiles SET orbit_points = orbit_points + 2 WHERE id = answer_author;
    END IF;
  END IF;
  
  -- Add new vote
  INSERT INTO answer_votes (answer_id, voter_id, vote_type)
  VALUES (p_answer_id, p_voter_id, p_vote_type);
  
  -- Update answer counts
  IF p_vote_type = 'up' THEN
    UPDATE answers SET upvotes = upvotes + 1, net_score = net_score + 1 WHERE id = p_answer_id;
    UPDATE profiles SET orbit_points = orbit_points + 10 WHERE id = answer_author;
  ELSE
    UPDATE answers SET downvotes = downvotes + 1, net_score = net_score - 1 WHERE id = p_answer_id;
    UPDATE profiles SET orbit_points = orbit_points - 2 WHERE id = answer_author;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### **accept_answer()**
```sql
CREATE OR REPLACE FUNCTION accept_answer(
  p_question_id UUID,
  p_answer_id UUID,
  p_user_id UUID
)
RETURNS VOID AS $$
DECLARE
  question_author UUID;
  answer_author UUID;
  bounty INTEGER;
BEGIN
  -- Verify user is question author
  SELECT author_id, bounty_amount INTO question_author, bounty 
  FROM questions WHERE id = p_question_id;
  
  IF question_author != p_user_id THEN
    RAISE EXCEPTION 'Only question author can accept answers';
  END IF;
  
  -- Get answer author
  SELECT author_id INTO answer_author FROM answers WHERE id = p_answer_id;
  
  -- Unaccept previous answer (if any)
  UPDATE answers SET is_accepted = false 
  WHERE question_id = p_question_id AND is_accepted = true;
  
  -- Accept this answer
  UPDATE answers SET is_accepted = true WHERE id = p_answer_id;
  UPDATE questions SET accepted_answer_id = p_answer_id, status = 'answered' WHERE id = p_question_id;
  
  -- Award points (+25 for acceptance)
  UPDATE profiles SET orbit_points = orbit_points + 25 WHERE id = answer_author;
  
  -- Transfer bounty if exists
  IF bounty > 0 THEN
    UPDATE profiles SET orbit_points = orbit_points + bounty WHERE id = answer_author;
  END IF;
  
  -- Create notification
  INSERT INTO notifications (recipient_id, sender_id, type, title, content, link_url)
  VALUES (
    answer_author,
    p_user_id,
    'achievement',
    'Answer Accepted!',
    'Your answer was accepted and you earned ' || (25 + bounty) || ' points!',
    '/questions/' || p_question_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 🎨 UI COMPONENTS

### **Agent 2: vibe-builder**

#### 1. **QuestionsPanel.tsx**
```
┌─────────────────────────────────────────┐
│ 🧠 ORBIT HELP CENTER                   │
│ [Ask Question] [My Questions] [Tags]   │
│                                         │
│ Filter: [All] Unanswered Bounties      │
│ Sort: [Newest v] Search: [______]      │
│                                         │
│ ┌─────────────────────────────────────┐│
│ │ ⭐ 15  How to fix async/await?      ││
│ │ python javascript async             ││
│ │ 3 answers • 127 views • 2h ago      ││
│ │ 💰 50 points bounty                 ││
│ └─────────────────────────────────────┘│
│ ┌─────────────────────────────────────┐│
│ │ ⭐ 8   Best way to cache data?      ││
│ │ react performance                   ││
│ │ 1 answer • 45 views • 5h ago        ││
│ └─────────────────────────────────────┘│
└─────────────────────────────────────────┘
```

#### 2. **QuestionDetail.tsx**
```
┌─────────────────────────────────────────┐
│ How to implement binary search?        │
│ python algorithms                       │
│ Asked by @Alice • 2 hours ago           │
│ 💰 100 points bounty                    │
│                                         │
│ I'm trying to implement binary search   │
│ but getting index out of bounds...     │
│                                         │
│ ```python                               │
│ def binary_search(arr, target):        │
│   # my code here                        │
│ ```                                     │
│                                         │
│ ─────────────────────────────────────  │
│ 3 Answers (sorted by votes)            │
│                                         │
│ ┌─────────────────────────────────────┐│
│ │ ⬆ 12  ⬇ 0  ✓ ACCEPTED              ││
│ │ @Bob • 1 hour ago                   ││
│ │                                     ││
│ │ The issue is with your loop bounds. ││
│ │ Here's the corrected version:       ││
│ │ ```python                           ││
│ │ def binary_search(arr, target):     ││
│ │   left, right = 0, len(arr) - 1     ││
│ │   ...                               ││
│ │ ```                                 ││
│ │ [Upvote] [Downvote] [Edit]          ││
│ └─────────────────────────────────────┘│
└─────────────────────────────────────────┘
```

#### 3. **AskQuestionModal.tsx**
- Title input
- Markdown editor with preview
- Code snippet editor (syntax highlighted)
- Tag selector (multi-select)
- Bounty amount (optional, shows current balance)
- Urgency toggle

---

## 🧩 INTEGRATION WITH EXISTING FEATURES

### **Connections to Gold Master**

#### **Economy System** 💰
- **Bounties** use Orbit Points (escrow when posting)
- **Reputation** earns points:
  - +10 per upvote
  - +25 for accepted answer
  - Bounty transfer on acceptance

#### **Notifications** 🔔
- "New answer on your question"
- "Your answer was accepted"
- "New question with tag you follow"
- "High bounty question posted"

#### **Intel System** 🤖
- AI can suggest related questions
- AI can analyze code in questions
- "Ask AI" button → converts to Intel query

#### **Social** 👥
- View user's questions/answers on profile
- DM question author for clarification
- Follow users who give good answers

#### **Training** 🏁
- Link typing challenges to Q&A
- "Practice this algorithm" → generates typing challenge

---

## 📊 ZUSTAND STORE SLICE

```typescript
interface QASlice {
  // State
  questions: Question[];
  currentQuestion: Question | null;
  answers: Answer[];
  myQuestions: Question[];
  followedTags: string[];
  
  // Filters
  filter: 'all' | 'unanswered' | 'bounty' | 'mine';
  sort: 'newest' | 'votes' | 'bounty';
  searchQuery: string;
  
  // Actions
  fetchQuestions: (filter: Filter, sort: Sort) => Promise<void>;
  fetchQuestion: (id: string) => Promise<void>;
  askQuestion: (data: QuestionData) => Promise<void>;
  postAnswer: (questionId: string, answer: AnswerData) => Promise<void>;
  voteAnswer: (answerId: string, voteType: 'up' | 'down') => Promise<void>;
  acceptAnswer: (questionId: string, answerId: string) => Promise<void>;
  followTag: (tag: string) => Promise<void>;
  searchQuestions: (query: string) => Promise<void>;
}
```

---

## 🚀 IMPLEMENTATION ROADMAP

### **Phase 1: Database** (Agent 1)
- Create tables: questions, answers, answer_votes, question_views
- RPC functions: vote_answer, accept_answer, create_question
- RLS policies
- Seed sample questions

### **Phase 2: UI Components** (Agent 2)
- QuestionsPanel (list view)
- QuestionDetail (single question + answers)
- AskQuestionModal
- AnswerEditor
- VoteButtons component

### **Phase 3: Logic** (Agent 3)
- Vote tracking system
- Bounty escrow/transfer logic
- Reputation calculation
- Tag-based notifications
- Search algorithm

---

## 🎯 SUCCESS METRICS

**Week 1:**
- 50+ questions posted
- 100+ answers submitted
- 10+ bounties created
- Avg 3 answers per question

**Engagement:**
- 70% of questions get answered within 24h
- 60% of bounty questions get accepted answer
- 30+ active helpers (5+ answers posted)

---

## ⚠️ EDGE CASES & VALIDATION

### **Voting**
- ❌ Can't vote on your own answer
- ❌ Can't vote multiple times (toggle vote type)
- ✅ Revoke vote by clicking same button

### **Bounties**
- ❌ Can't set bounty > current balance
- ✅ Points escrowed immediately
- ✅ Refund if no accepted answer after 30 days

### **Answers**
- ❌ Can't accept your own answer as author
- ✅ Can edit answer within 5 minutes
- ✅ Show "edited" badge if modified

### **Spam Prevention**
- Rate limit: Max 5 questions per day
- Min 10 orbit points to ask question
- Min 50 points to set bounty
- -10 points if question flagged as spam

---

## 🔮 FUTURE ENHANCEMENTS

1. **Comments** on answers (mini-discussion threads)
2. **Question Drafts** (save before posting)
3. **Related Questions** (AI-suggested similar posts)
4. **Badges** (Helpful, Expert, First Answer, etc.)
5. **Bookmarks** (save questions for later)
6. **Question Series** (multi-part tutorials)

---

**Next Step:** Review this design and approve to begin implementation! 🚀

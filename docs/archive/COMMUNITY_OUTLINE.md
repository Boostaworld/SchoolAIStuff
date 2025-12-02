# 🌐 COMMUNITY HUB - FEATURE OUTLINE
## Social Feed + Study Groups + Showcase

---

## 1. COMMUNITY FEED

### Database Schema
```sql
CREATE TABLE posts (
  id UUID PRIMARY KEY,
  author_id UUID REFERENCES profiles(id),
  content TEXT, -- Max 500 chars
  post_type TEXT CHECK (type IN ('text', 'achievement', 'study_group', 'help')),
  tags TEXT[], -- ['math', 'cs201', 'typing']
  image_url TEXT,
  
  -- Engagement
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE post_likes (
  post_id UUID REFERENCES posts(id),
  user_id UUID REFERENCES profiles(id),
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE post_comments (
  id UUID PRIMARY KEY,
  post_id UUID REFERENCES posts(id),
  author_id UUID REFERENCES profiles(id),
  content TEXT, -- Max 200 chars
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Feed Algorithm (v1 - Simple)
```typescript
function getFeed(userId: string, filter: 'all' | 'following' | 'trending') {
  if (filter === 'following') {
    // Posts from followed users
    return posts.where('author_id IN following_list').orderBy('created_at DESC');
  }
  
  if (filter === 'trending') {
    // High engagement last 24h
    return posts
      .where('created_at > NOW() - 24h')
      .orderBy('(likes_count + comments_count * 2) DESC');
  }
  
  // Default: Chronological
  return posts.orderBy('created_at DESC');
}
```

---

## 2. STUDY GROUPS

### Database Schema
```sql
CREATE TABLE study_groups (
  id UUID PRIMARY KEY,
  name TEXT, -- "Math 101 Study Squad"
  description TEXT,
  course_tag TEXT, -- "MATH101"
  creator_id UUID REFERENCES profiles(id),
  
  -- Settings
  is_public BOOLEAN DEFAULT true,
  max_members INTEGER DEFAULT 10,
  meeting_schedule TEXT, -- "Mon/Wed 7pm"
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE group_members (
  group_id UUID REFERENCES study_groups(id),
  user_id UUID REFERENCES profiles(id),
  joined_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (group_id, user_id)
);
```

---

## 3. SHOWCASE

### Auto-Generated Posts
```typescript
// Trigger: User completes typing session with new PB
await createPost({
  author_id: userId,
  post_type: 'achievement',
  content: '🎉 New personal best: 95 WPM at 98% accuracy!',
  tags: ['achievement', 'typing'],
  metadata: { session_id, wpm: 95, accuracy: 98 }
});

// Trigger: User wins race
await createPost({
  author_id: userId,
  post_type: 'achievement',
  content: '🏆 Won a typing race! Beat 3 opponents with 102 WPM',
  tags: ['achievement', 'racing'],
  metadata: { race_id, position: 1 }
});
```

---

## 4. HELP CORNER (Minimal Q&A)

### Pre-Post AI Check
```typescript
// Before allowing question post
async function askQuestion(question: string) {
  // 1. Auto-query Intel AI
  const aiResponse = await queryIntel(question);
  
  // 2. Show AI response
  showModal({
    title: "Intel AI suggests:",
    content: aiResponse,
    actions: [
      { text: "This helped!", action: "close" },
      { text: "Still need human help", action: "proceedToPost" }
    ]
  });
}
```

### Anti-Spam Detection
```typescript
// Flag suspicious answers
function detectAIGenerated(answer: string, timeToAnswer: number) {
  const flags = [];
  
  // Too fast (likely copy-paste)
  if (timeToAnswer < 30) flags.push('too_fast');
  
  // Common AI phrases
  const aiPhrases = ['As an AI', 'I apologize', 'Here\'s a comprehensive'];
  if (aiPhrases.some(p => answer.includes(p))) flags.push('ai_language');
  
  // Too perfect (no typos, perfect formatting)
  if (answer.match(/```/) && answer.split('\n').length > 20) flags.push('suspiciously_formatted');
  
  return flags.length > 0 ? { flagged: true, reasons: flags } : { flagged: false };
}
```

---

## 🎨 UI COMPONENTS

### FeedPanel.tsx
```
┌─────────────────────────────────────┐
│ 🌐 COMMUNITY                        │
│ [All] Following Trending            │
│ ─────────────────────────────────── │
│ 📝 What's on your mind?    [Post]   │
│ ─────────────────────────────────── │
│                                     │
│ @Alice · 2h                         │
│ Just hit 100 WPM for the first     │
│ time! 🎉 #typing #milestone         │
│ ❤️ 12  💬 3  🔄 Share               │
│                                     │
│ ─────────────────────────────────── │
│ @Bob · 5h                           │
│ Looking for Math 101 study partners │
│ for midterm prep 📚                │
│ 👥 Join Study Group  ❤️ 5  💬 8     │
└─────────────────────────────────────┘
```

### StudyGroupCard.tsx
```
┌─────────────────────────────────────┐
│ Math 101 Study Squad                │
│ 5/10 members · Mon/Wed 7pm          │
│                                     │
│ 👤 @Alice @Bob @Charlie @Dave @Eve  │
│                                     │
│ Next session: Mon Dec 2, 7pm       │
│ Topic: Chapter 5 Review             │
│                                     │
│ [Join Group] [View Details]         │
└─────────────────────────────────────┘
```

---

## 📍 QUICK ACCESS OPTIONS

### Option 1: Floating Action Button (FAB)
```
Bottom-right corner of dashboard:
[🌐] → Opens Community flyout panel
```

### Option 2: Persistent Sidebar
```
Left sidebar always visible:
📰 Feed
🏆 Showcase
👥 Study Groups
❓ Help
```

### Option 3: Top Nav Integration
```
Main nav bar:
[Tasks] [Intel] [Training] [Community ▼]
                            └─ Feed
                            └─ Study Groups
                            └─ Showcase
                            └─ Help
```

**Recommendation:** Option 1 (FAB) + Option 3 (Nav dropdown)
- FAB for quick posts
- Nav for browsing

---

## ⚡ IMPLEMENTATION PRIORITY

### MVP (Week 1)
- [ ] Posts table + RLS
- [ ] FeedPanel component
- [ ] Post creation modal
- [ ] Like/comment actions
- [ ] Chronological feed

### V2 (Week 2)
- [ ] Study groups schema
- [ ] Group creation
- [ ] Join/leave groups
- [ ] Group feed

### V3 (Week 3)
- [ ] Auto-achievement posts
- [ ] Showcase leaderboard
- [ ] Trending algorithm
- [ ] Following system

### V4 (Week 4)
- [ ] Help corner (minimal Q&A)
- [ ] AI-first prompts
- [ ] Anti-spam detection
- [ ] Bounties (limited)

---

**Status:** Outline complete, ready for implementation  
**Next:** Get user approval on pivot from Q&A to Community Hub

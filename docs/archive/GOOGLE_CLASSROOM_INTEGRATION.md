# 🎓 GOOGLE CLASSROOM INTEGRATION
## Auto-Import Assignments to Orbit OS Tasks

---

## ✅ YES, IT'S POSSIBLE!

Google Classroom has a **free public API** that allows:
- ✅ Fetch user's enrolled courses
- ✅ Get all assignments (coursework) with due dates
- ✅ Check submission status
- ✅ Sync grades
- ✅ Get course announcements

---

## 🔑 AUTHENTICATION FLOW

### OAuth 2.0 Setup

```typescript
// 1. Register app in Google Cloud Console
// 2. Enable Google Classroom API
// 3. Configure OAuth consent screen
// 4. Get Client ID & Secret

const SCOPES = [
  'https://www.googleapis.com/auth/classroom.courses.readonly',
  'https://www.googleapis.com/auth/classroom.coursework.me.readonly',
  'https://www.googleapis.com/auth/classroom.announcements.readonly'
];

// 5. User clicks "Connect Google Classroom"
async function connectGoogleClassroom() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'https://orbit-os.vercel.app/api/auth/google/callback'
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
  });

  // Redirect user to Google consent screen
  window.location.href = authUrl;
}
```

---

## 📚 FETCHING ASSIGNMENTS

### API Endpoints

```typescript
import { google } from 'googleapis';

export class GoogleClassroomService {
  private classroom;

  constructor(accessToken: string) {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    this.classroom = google.classroom({ version: 'v1', auth });
  }

  // 1. Get all enrolled courses
  async getCourses() {
    const response = await this.classroom.courses.list({
      studentId: 'me',
      courseStates: ['ACTIVE']
    });

    return response.data.courses; 
    // Returns: [{id, name, section, descriptionHeading, enrollmentCode}]
  }

  // 2. Get assignments for a course
  async getAssignments(courseId: string) {
    const response = await this.classroom.courses.courseWork.list({
      courseId,
      orderBy: 'dueDate desc'
    });

    return response.data.courseWork;
    // Returns: [{id, title, description, dueDate, maxPoints, workType}]
  }

  // 3. Get submission status
  async getSubmissions(courseId: string, courseWorkId: string) {
    const response = await this.classroom.courses.courseWork.studentSubmissions.list({
      courseId,
      courseWorkId,
      userId: 'me'
    });

    return response.data.studentSubmissions;
    // Returns: [{state: 'TURNED_IN' | 'NEW' | 'RECLAIMED_BY_STUDENT', assignedGrade}]
  }

  // 4. Sync all assignments to Orbit Tasks
  async syncToOrbitTasks(userId: string) {
    const courses = await this.getCourses();
    const allTasks = [];

    for (const course of courses) {
      const assignments = await this.getAssignments(course.id);

      for (const assignment of assignments) {
        const submissions = await this.getSubmissions(course.id, assignment.id);
        const submission = submissions[0]; // User's submission

        // Convert to Orbit Task
        const task = {
          user_id: userId,
          title: `${course.name}: ${assignment.title}`,
          category: 'School', // New category
          difficulty: this.estimateDifficulty(assignment.maxPoints),
          completed: submission.state === 'TURNED_IN',
          external_id: assignment.id, // Link back to Classroom
          external_source: 'google_classroom',
          due_date: assignment.dueDate ? new Date(assignment.dueDate.year, assignment.dueDate.month - 1, assignment.dueDate.day) : null,
          created_at: new Date()
        };

        allTasks.push(task);
      }
    }

    // Bulk insert to tasks table
    await supabase.from('tasks').upsert(allTasks, {
      onConflict: 'external_id',
      ignoreDuplicates: false
    });

    return allTasks;
  }

  private estimateDifficulty(maxPoints?: number): string {
    if (!maxPoints) return 'Medium';
    if (maxPoints <= 10) return 'Easy';
    if (maxPoints <= 50) return 'Medium';
    return 'Hard';
  }
}
```

---

## 🗄️ DATABASE SCHEMA CHANGES

### Extend `tasks` Table

```sql
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS external_id TEXT, -- Google Classroom assignment ID
  ADD COLUMN IF NOT EXISTS external_source TEXT, -- 'google_classroom'
  ADD COLUMN IF NOT EXISTS due_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS course_name TEXT,
  ADD COLUMN IF NOT EXISTS max_points INTEGER,
  ADD COLUMN IF NOT EXISTS synced_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX tasks_external_idx ON public.tasks(external_id, external_source);
```

### New Table: `google_classroom_tokens`

```sql
CREATE TABLE IF NOT EXISTS public.google_classroom_tokens (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expiry TIMESTAMP WITH TIME ZONE NOT NULL,
  last_sync TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.google_classroom_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tokens"
  ON public.google_classroom_tokens FOR SELECT
  USING (auth.uid() = user_id);
```

---

## 🔄 AUTO-SYNC WORKFLOW

### Option 1: Manual Sync Button
```typescript
// User clicks "Sync Assignments"
async function manualSync() {
  const { data: token } = await supabase
    .from('google_classroom_tokens')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (!token) {
    // Prompt to connect Google Classroom
    return showConnectModal();
  }

  const classroom = new GoogleClassroomService(token.access_token);
  const tasks = await classroom.syncToOrbitTasks(userId);

  toast.success(`Synced ${tasks.length} assignments!`);
}
```

### Option 2: Auto-Sync (Cron Job)
```typescript
// Supabase Edge Function (runs every 6 hours)
// File: supabase/functions/sync-classroom/index.ts

Deno.serve(async (req) => {
  // Get all users with connected Classroom
  const { data: users } = await supabase
    .from('google_classroom_tokens')
    .select('user_id, access_token, refresh_token, token_expiry')
    .lt('last_sync', new Date(Date.now() - 6 * 60 * 60 * 1000)); // 6 hours ago

  for (const user of users) {
    // Refresh token if expired
    if (new Date(user.token_expiry) < new Date()) {
      const newToken = await refreshGoogleToken(user.refresh_token);
      user.access_token = newToken.access_token;
    }

    // Sync assignments
    const classroom = new GoogleClassroomService(user.access_token);
    await classroom.syncToOrbitTasks(user.user_id);

    // Update last_sync
    await supabase
      .from('google_classroom_tokens')
      .update({ last_sync: new Date() })
      .eq('user_id', user.user_id);
  }

  return new Response(JSON.stringify({ synced: users.length }), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

---

## 🎨 UI COMPONENTS

### ConnectClassroomButton.tsx
```tsx
export function ConnectClassroomButton() {
  const [isConnected, setIsConnected] = useState(false);

  return (
    <div className="p-4 border rounded-lg bg-white/5">
      <div className="flex items-center gap-3">
        <img src="/icons/google-classroom.svg" className="w-12 h-12" />
        <div className="flex-1">
          <h3 className="font-bold">Google Classroom</h3>
          <p className="text-sm text-slate-400">
            Auto-import assignments as tasks
          </p>
        </div>
        {isConnected ? (
          <button onClick={manualSync} className="btn-secondary">
            Sync Now
          </button>
        ) : (
          <button onClick={connectGoogleClassroom} className="btn-primary">
            Connect
          </button>
        )}
      </div>
    </div>
  );
}
```

### TaskCard with Classroom Badge
```tsx
{task.external_source === 'google_classroom' && (
  <div className="flex items-center gap-2 text-xs">
    <img src="/icons/classroom-badge.svg" className="w-4 h-4" />
    <span className="text-blue-400">{task.course_name}</span>
    {task.due_date && (
      <span className="text-red-400">
        Due {format(task.due_date, 'MMM d')}
      </span>
    )}
  </div>
)}
```

---

## 🚀 COMMUNITY INTEGRATION

### Study Groups Auto-Create from Courses

```typescript
// When user syncs Classroom, auto-create Study Groups
async function createStudyGroupsFromCourses(courses: Course[], userId: string) {
  for (const course of courses) {
    // Check if group exists
    const existing = await supabase
      .from('study_groups')
      .select('id')
      .eq('course_tag', course.section)
      .single();

    if (existing) {
      // Join existing group
      await supabase.from('group_members').insert({
        group_id: existing.id,
        user_id: userId
      });
    } else {
      // Create new group
      const { data: group } = await supabase
        .from('study_groups')
        .insert({
          name: `${course.name} Study Group`,
          description: `Study group for ${course.section}`,
          course_tag: course.section,
          creator_id: userId,
          is_public: true
        })
        .select()
        .single();

      await supabase.from('group_members').insert({
        group_id: group.id,
        user_id: userId
      });
    }
  }
}
```

### Feed Posts from Assignments
```typescript
// Auto-post when assignment is completed
async function onAssignmentCompleted(task: Task) {
  if (task.external_source === 'google_classroom') {
    await createPost({
      author_id: task.user_id,
      post_type: 'achievement',
      content: `✅ Completed ${task.title}!`,
      tags: ['school', task.course_name?.toLowerCase()],
      metadata: { task_id: task.id }
    });
  }
}
```

---

## ⚠️ LIMITATIONS & CONSIDERATIONS

### API Quotas
- **10,000 queries per day** (free tier)
- Monitor usage with analytics
- Cache course/assignment data for 6 hours

### Privacy
- Requires OAuth consent (students must approve)
- Only access assignments, NOT grades or classmate info
- Store tokens encrypted in database

### Sync Conflicts
- What if user manually creates same task?
- Solution: Use `external_id` to prevent duplicates
- Upsert with `ON CONFLICT` clause

### Rate Limiting
- Batch requests (don't sync every 5 minutes)
- Use webhooks if available (Classroom API has limited webhook support)
- Default: Sync every 6 hours

---

## 🎯 IMPLEMENTATION PLAN

### Phase 1: OAuth Setup (Day 1)
- [ ] Register Google Cloud project
- [ ] Enable Classroom API
- [ ] Configure OAuth consent
- [ ] Create callback endpoint

### Phase 2: Basic Sync (Day 2)
- [ ] `GoogleClassroomService` class
- [ ] Sync courses + assignments
- [ ] Store in tasks table
- [ ] Manual sync button

### Phase 3: UI Integration (Day 3)
- [ ] Connect Classroom button
- [ ] Sync status indicator
- [ ] Task badges for Classroom assignments
- [ ] Settings page for manage connection

### Phase 4: Auto-Sync (Day 4)
- [ ] Supabase Edge Function (cron)
- [ ] Token refresh logic
- [ ] Error handling + logging

### Phase 5: Community Features (Day 5)
- [ ] Auto-create Study Groups from courses
- [ ] Auto-post assignment completions to Feed
- [ ] Course-based filtering in Community

---

## 📊 USER FLOW

```mermaid
graph TD
    A[User opens Orbit OS] --> B{Classroom connected?}
    B -->|No| C[Show "Connect Classroom" prompt]
    B -->|Yes| D[Auto-sync assignments every 6h]
    
    C --> E[OAuth flow]
    E --> F[Grant permissions]
    F --> G[Store tokens]
    G --> D
    
    D --> H[Fetch courses]
    H --> I[Fetch assignments]
    I --> J[Convert to Tasks]
    J --> K[Upsert to database]
    
    K --> L[Show in Tasks tab]
    K --> M[Create Study Groups]
    K --> N[Post to Community Feed]
```

---

## 🔮 FUTURE ENHANCEMENTS

1. **Canvas LMS Integration** (similar API)
2. **Blackboard Integration**
3. **Assignment reminders** (push notifications 1 day before due)
4. **Grade tracking** (show grades in Tasks)
5. **Submission upload** (submit directly from Orbit OS)

---

**Status:** Fully researched and planned ✅  
**Feasibility:** HIGH - Google Classroom API is mature and well-documented  
**Est. Implementation:** 5 days for full integration

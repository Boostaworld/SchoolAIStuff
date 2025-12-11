# Implementation Plan - Gemini 3.0 Integration & Profile Viewing

## Goal
Integrate Gemini 3.0 Pro Preview capabilities into the Intel Engine, including Thinking Mode, Image Analysis, and Image Generation. Enable profile viewing from the Horde Feed. Implement a "Prompt Improver" for all modes. Finally, create a global "Announcer" system for critical updates and news.

## User Review Required
> [!IMPORTANT]
> **Gemini 3.0 Access**: Ensure your API key has access to `gemini-3.0-pro-preview` and `gemini-3.0-pro-image-preview`. If not, these features will fail or fallback.
> **Image Upload**: We will use base64 encoding for image analysis for now, as `media.upload` requires a more complex backend setup or specific client configuration not fully visible here.

## School Notes Integration (Priority)
These items take precedence based on recent feedback.

~~### 1. Fix Model IDs & Customization
- **Issue**: Intel is currently locked to correct ID `gemini-3-pro-preview` (codebase might use `3.0-preo`) and lacks customization options.
- **Action**:
    - Update `lib/ai/gemini.ts` (or relevant constants) with correct IDs:
        - `gemini-3-pro-preview` (Reasoning/Agentic)
        - `gemini-3-pro-image-preview` (Image Gen/Edit)
        - `gemini-2.5-pro` (Complex Reasoning)
        - `gemini-2.5-flash` (Fast)
    - **ResearchLab Customization**:
        - Unlock model selection in the Intel/Chat tab.
        - Add "Thinking" toggle/visibility controls if "shows way too low" implies UI issues.~~

~~### 2. Restore Vision Mode (Image Analysis)
- **Issue**: Vision mode was removed but is needed for deep analysis with customization.
- **Action**:
    - Create a **New Tab** in ResearchLab specifically for "Image Analysis" (Vision).
    - Features:
        - Image Upload/Paste.
        - Customization: Model Selection (`gemini-2.5-pro` vs `gemini-2.0-flash` etc), Prompt/Instruction styling.~~

### 3. Image Gen Thinking Display (Fix Scroll/Layout)
- **Issue**: "The thinking for image shows way too low" — content renders out of view (below fold) and the container is **not scrollable**, making it impossible to read.
- **Action**:
    - Fix CSS `overflow` and `height` properties for the Thinking container in `ImageGenPanel` (or `IntelPanel`).
    - Ensure the thinking block is visible above the fold or has its own scrollable area.
    - Verify markdown formatting for "Crafting a Scene" / "Analyzing Image Compliance" logs.

~~### 4. Dynamic Input Textareas
- **Issue**: Input boxes are currently single-line and don't expand, making it hard to write long prompts.
- **Action**:
    - Refactor `InputArea.tsx` (and other chat inputs) to use a dynamic textarea (auto-growing height).
    - Ensure it expands up to a max-height before scrolling.
    - Maintain "Shift+Enter" for new lines and "Enter" for submit.~~

~~### 5. Google Form Fix
- **Issue**: Google Form analysis was failing/timing out. This feature relies on Vision capabilities.
- **Dependency**: **Vision Mode** (Previously missing, now Restored).
- **Action**:
    - With Vision Mode restored, debug the `analyzeGoogleForm` function in `gemini.ts`.
    - Fix timeout/empty response handling.~~


## Proposed Changes

### 1. Database (`sql`)

#### [NEW] [announcements.sql](file:///c:/Users/kayla/OneDrive/Desktop/SchoolAIStuff/sql/announcements.sql)
- **Table**: `announcements`
    - `id`: uuid (PK)
    - `title`: text
    - `simple_description`: text (for the banner)
    - `full_content`: text (markdown supported, for the modal)
    - `type`: 'update' | 'announcement' | 'alert'
    - `created_at`: timestamp
    - `is_active`: boolean (defaults to true)
    - `version`: string (e.g., "1.2.0")

### 2. AI Logic Layer (`lib/ai`)

#### [MODIFY] [intel.ts](file:///c:/Users/kayla/OneDrive/Desktop/SchoolAIStuff/lib/ai/intel.ts)
- Update `IntelQueryParams` to include:
    - `thinkingLevel`: 'low' | 'medium' | 'high'
    - `mode`: 'chat' | 'research'
- **Note**: Image Generation and Image Analysis will be handled by separate services/tabs, keeping Intel focused purely on text-based deep reasoning/research.
- Update `runIntelQuery` to:
    - Map `gemini-3.0-pro-preview`
    - Construct `thinkingConfig` based on `thinkingLevel`.
    - Handle image input in `contents`.
    - Handle image generation response processing.

#### [MODIFY] [InputArea.tsx](file:///c:/Users/kayla/OneDrive/Desktop/SchoolAIStuff/components/Intel/InputArea.tsx)
- Add "Magic Wand" / "Improve Prompt" button.
- On click:
    - Show loading state ("Refining prompt...").
    - Call `improvePrompt`.
    - Update input value with refined prompt.
    - Show toast/notification of what changed (optional).

### 3. Announcer System (`components/Announcer`)

#### [NEW] [AnnouncementBanner.tsx](file:///c:/Users/kayla/OneDrive/Desktop/SchoolAIStuff/components/Announcer/AnnouncementBanner.tsx)
- **Visuals**:
    - Fixed top bar (dismissible).
    - Vivid gradient background (based on `type`).
    - Title + "View More" button + Close (X) icon.
- **Logic**:
    - Check `useOrbitStore` for `lastDismissedAnnouncementId`.
    - If `latestAnnouncement.id` != `lastDismissedId`, show banner.
    - On Close: Update `lastDismissedAnnouncementId`.
    - On "View More": Open `AnnouncementModal`.

#### [NEW] [AnnouncementModal.tsx](file:///c:/Users/kayla/OneDrive/Desktop/SchoolAIStuff/components/Announcer/AnnouncementModal.tsx)
- **Visuals**:
    - Standard Orbit Modal design.
    - Pagination controls (< Prev | Next >) to browse historical updates.
    - Markdown rendering for `full_content`.
- **Logic**:
    - Fetch all active announcements (ordered by date).
    - Maintain `currentIndex` state.

### 4. Admin Integration (`components/Admin`)

#### [MODIFY] [GodModePanel.tsx](file:///c:/Users/kayla/OneDrive/Desktop/SchoolAIStuff/components/Admin/GodModePanel.tsx)
- Add "Announcements" tab.
- Form to create new announcement:
    - Title, Banner Description, Full Content (Markdown Editor), Type.
    - "Post Announcement" button.
- List active announcements (Edit/Delete).

### 5. ImageGen Enhancements (`components/ImageGen`)

#### [MODIFY] [ImageGenPanel.tsx](file:///c:/Users/kayla/OneDrive/Desktop/SchoolAIStuff/components/ImageGen/ImageGenPanel.tsx)
- **Thinking View Fix**:
    - Make the thinking process panel scrollable within viewport
    - Add proper max-height and overflow handling
    - Ensure modal doesn't extend beyond screen bounds
- **Advanced Split View Editor**:
    - Add toggle for split view mode
    - Left panel: Original generated image
    - Right panel: Edit controls / AI enhancement prompts
    - Support iterative editing with image-to-image refinement

### 6. Horde Feed (`components/Horde`)

#### [MODIFY] [HordeFeed.tsx](file:///c:/Users/kayla/OneDrive/Desktop/SchoolAIStuff/components/Horde/HordeFeed.tsx)
- Add `fetchProfile` function to get full profile data from Supabase by `author_id`.
- Add `showProfileModal` state.
- Make avatar clickable to trigger fetch and show `ProfileModal`.

## Verification Plan

### Automated Tests
- None (Frontend/API integration).

### Manual Verification
1.  **Gemini 3.0 Chat**:
    - Open Intel Panel -> Settings.
    - Select "Gemini 3.0 Pro".
    - Set Thinking Level to "High".
    - Send a complex query (e.g., "Solve this riddle...").
    - Verify response indicates deep thinking (or check logs for model usage).
2.  **Image Analysis**:
    - Switch to "Image Mode".
    - Upload an image.
    - Ask "What is in this image?".
    - Verify accurate description.
3.  **Image Generation**:
    - Switch to "Image Generation Mode".
    - Prompt "Cyberpunk city".
    - Verify an image is generated and displayed.
4.  **Profile Viewing**:
    - Go to Horde Feed.
    - Click on a user's avatar.
    - Verify `ProfileModal` opens with their stats.

5.  **Prompt Improver**:
    - **Vision Mode**:
        - Type "Read this".
        - Click "Improve Prompt".
        - Verify it changes to a detailed analysis prompt.
    - **Image Gen Mode**:
        - Type a simple noun (e.g., "Cat").
        - Click "Improve Prompt".
        - Verify it expands to a detailed description.
    - **General Chat**:
        - Type a question.
        - Click "Improve Prompt".
        - Verify it adds structure or context based on web search best practices.

6.  **Announcer System**:
    - **Admin**:
        - Create a new announcement ("Test Update 1.0").
        - Verify it appears in the list.
    - **User Experience**:
        - Refresh page. Verify Top Banner appears.
        - Click "View More". Verify Modal opens with details.
        - Close Modal. Click "X" on Banner.
        - Refresh page. Verify Banner does NOT reappear.
        - Clear LocalStorage (or reset persistence logic). Verify Banner reappears.

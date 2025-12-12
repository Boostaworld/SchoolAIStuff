# Announcer & Changelog System Implementation Plan

## User Review Required
> [!IMPORTANT]
> The schema has been updated to support `category` for changelogs. Please run `sql/create_announcements_table.sql`.

## Proposed Changes

### Database
#### [MODIFY] [create_announcements_table.sql](file:///c:/Users/kayla/OneDrive/Desktop/SchoolAIStuff/sql/create_announcements_table.sql)
- Added `category` field (feature, fix, system, etc.).
- `active` flag controls the "Banner" (latest important news).
- All records (active or inactive) appear in the "Changelog" history.

### Types
#### [MODIFY] [types.ts](file:///c:/Users/kayla/OneDrive/Desktop/SchoolAIStuff/types.ts)
- Update `Announcement` interface to include `category`.

### Store
#### [MODIFY] [useOrbitStore.ts](file:///c:/Users/kayla/OneDrive/Desktop/SchoolAIStuff/store/useOrbitStore.ts)
- `announcements`: Announcement[] (Cached list for the modal)
- `activeBanner`: Announcement | null (The specific one for the top banner)
- Actions: 
    - `fetchChangelogs(page, limit)`
    - `fetchLatestActiveAnnouncement()`
    - `dismissBanner(id)`

### UI Components

#### [NEW] [ChangelogModal.tsx](file:///c:/Users/kayla/OneDrive/Desktop/SchoolAIStuff/components/Shared/ChangelogModal.tsx)
**Expand Functionality:**
- **Split-View Layout**:
    - **Left Sidebar**: Scrollable timeline of versions (e.g., "v2.1 - Dec 12", "v2.0 - Dec 10").
    - **Pagination**: "Load More" button at the bottom of the sidebar to fetch older logs.
    - **Categories**: Icons indicating type (Star for Feature, Bug for Fix).
- **Right Content Area**:
    - Renders the `content` of the selected version in Markdown.
    - Beautiful typography for headers, lists, and code blocks.
    - "Hero" image support if we parse it from markdown or add a column later.

#### [NEW] [AnnouncementBanner.tsx](file:///c:/Users/kayla/OneDrive/Desktop/SchoolAIStuff/components/Shared/AnnouncementBanner.tsx)
- Simple, high-visibility strip at the top.
- "What's New" button opens the `ChangelogModal` pre-selected to that announcement.

#### [MODIFY] [GodModePanel.tsx](file:///c:/Users/kayla/OneDrive/Desktop/SchoolAIStuff/components/Admin/GodModePanel.tsx)
- Add "Announcements" tab.
- Editor for Title, Version, Category, and Markdown Content.
- Toggle for "Active Banner" status.

## Verification Plan
1.  **Changelog Navigation**: Create 6-7 test announcements. Open modal. Verify pagination (or scrolling) loads them correctly. Switch between them.
2.  **Banner Integration**: Ensure clicking the banner text opens the modal to the *correct* detailed view.
3.  **Formatting**: content with Markdown (`- list`, `**bold**`, `## Header`) renders correctly in the modal right pane.

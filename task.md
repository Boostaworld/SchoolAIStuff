# Announcer System Task List

- [ ] Database Setup
    - [x] Create `announcements` table schema <!-- id: 0 -->
    - [x] Fix `moddatetime` error in SQL script <!-- id: 1 -->
    - [ ] **USER ACTION**: Run `sql/create_announcements_table.sql` <!-- id: 2 -->
- [ ] Backend & Key Infrastructure
    - [ ] Update `types.ts` with `Announcement` interface <!-- id: 3 -->
    - [ ] Update `useOrbitStore.ts` with state and actions <!-- id: 4 -->
- [ ] UI Components
    - [ ] Create `AnnouncementBanner.tsx` <!-- id: 5 -->
    - [ ] Create `ChangelogModal.tsx` (Split-view, Markdown support) <!-- id: 6 -->
    - [ ] Integrate components into `App.tsx` <!-- id: 7 -->
- [ ] Admin Interface
    - [ ] Update `GodModePanel.tsx` with Announcements tab <!-- id: 8 -->
    - [ ] Implement Create/Edit Announcement forms <!-- id: 9 -->
- [ ] Verification
    - [ ] Verify Banner appearance and persistence <!-- id: 10 -->
    - [ ] Verify Changelog Modal navigation and rendering <!-- id: 11 -->

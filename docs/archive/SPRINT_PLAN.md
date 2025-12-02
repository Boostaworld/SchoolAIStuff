# 🚀 GOLD MASTER - 2 DAY SPRINT
## VIBE Coding Mode: Fast Implementation

---

## 📅 DAY 1: Database + Core Economy (Today)

### Session 1: Foundation (2 hours)
- [x] Database already executed ✅
- [ ] Verify all tables created
- [ ] Test RPC functions
- [ ] Enable Realtime subscriptions
- [ ] Seed shop items

### Session 2: Economy UI (3 hours)
- [ ] `BlackMarket.tsx` - Shop interface
- [ ] `PassiveMiner.tsx` - Mining UI
- [ ] `TheVault.tsx` - File sharing
- [ ] Wire to Zustand store
- [ ] Test purchase flow

### Session 3: Intel + Admin (3 hours)
- [ ] `IntelCommandDeck.tsx` - AI controls
- [ ] `GodModePanel.tsx` - Admin dashboard
- [ ] Update `IntelService.ts` with access control
- [ ] Test permission system

---

## 📅 DAY 2: Polish + Deploy

### Session 1: Notifications + Contracts (2 hours)
- [ ] `NotificationTray.tsx` - Bell dropdown
- [ ] `ContractsPanel.tsx` - Bounty board
- [ ] Real-time subscriptions
- [ ] Test notification delivery

### Session 2: Racing Fixes (2 hours)
- [ ] `useRaceInterpolation.ts` - Unstoppable bots
- [ ] Update `RacingTerminal.tsx`
- [ ] `useTypingEngine.ts` - Dual modes
- [ ] Test tab backgrounding

### Session 3: Final Testing + Deploy (2 hours)
- [ ] End-to-end testing
- [ ] Fix critical bugs
- [ ] Deploy to Vercel
- [ ] Verify production works

---

## 🎯 IMMEDIATE NEXT STEPS (RIGHT NOW)

### Step 1: Verify Database ✅
You said you already ran the queries, let's verify:

```sql
-- Run these in Supabase SQL Editor:

-- 1. Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('shop_items', 'user_inventory', 'contracts', 'vault_files', 'notifications', 'user_settings');

-- 2. Check shop items seeded
SELECT COUNT(*) FROM shop_items;

-- 3. Test passive mining RPC
SELECT claim_passive_points(auth.uid());

-- 4. Check your profile has new columns
SELECT can_customize_ai, unlocked_models, is_admin FROM profiles WHERE id = auth.uid();
```

### Step 2: Enable Realtime
In Supabase Dashboard → Database → Publications:
- [x] Add tables to `supabase_realtime`:
  - `notifications`
  - `contracts`
  - `vault_files`
  - `user_settings`

### Step 3: Start Building (Choose Priority)

**Option A: Economy First** (Recommended - most visible)
```bash
# Create components
touch components/Economy/BlackMarket.tsx
touch components/Economy/PassiveMiner.tsx
touch components/Economy/TheVault.tsx
```

**Option B: Intel + God Mode** (Power user features)
```bash
# Create components
touch components/Intel/IntelCommandDeck.tsx
touch components/Admin/GodModePanel.tsx
```

**Option C: Notifications** (Foundation for everything)
```bash
# Create component
touch components/Notifications/NotificationTray.tsx
```

---

## 🛠️ COMPONENT TEMPLATES (Quick Start)

### BlackMarket.tsx (Template)
```typescript
import { useOrbitStore } from '@/store/useOrbitStore';
import { motion } from 'framer-motion';

export function BlackMarket() {
  const { shopItems, purchaseItem, userPoints } = useOrbitStore();
  
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">⚡ Black Market</h2>
      
      <div className="grid grid-cols-3 gap-4">
        {shopItems.map(item => (
          <motion.div 
            key={item.id}
            className={`p-4 rounded border ${getRarityClass(item.rarity)}`}
            whileHover={{ scale: 1.05 }}
          >
            <h3>{item.name}</h3>
            <p className="text-sm text-slate-400">{item.description}</p>
            <div className="mt-2 flex justify-between">
              <span>{item.price} pts</span>
              <button onClick={() => purchaseItem(item.id)}>
                Buy
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function getRarityClass(rarity: string) {
  const classes = {
    common: 'border-slate-500 shadow-slate-500/20',
    rare: 'border-blue-500 shadow-blue-500/40',
    epic: 'border-purple-500 shadow-purple-500/60',
    legendary: 'border-yellow-500 shadow-yellow-500/80 animate-pulse'
  };
  return classes[rarity] || classes.common;
}
```

---

## 📊 PROGRESS TRACKING

Today's Goal: **50% of Gold Master Complete**
- Database ✅
- Economy UI (3 components)
- Intel + God Mode (2 components)

Tomorrow's Goal: **100% Complete + Deployed**
- Notifications
- Contracts
- Racing fixes
- Production deploy

---

**READY TO START?** Pick a component and I'll build it with you! 🚀

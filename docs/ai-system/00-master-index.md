# Orbit OS: Multi-Model AI Access System
## Project NEXUS — Master Specification Index

> **Version:** 1.1 (Updated with feedback)  
> **Status:** Ready for Implementation  
> **Aesthetic:** Cyberpunk / High-Tech Command Center

---

## Executive Overview

This specification defines a comprehensive, watertight system for managing multi-model AI access within the Orbit OS platform. The system aggressively controls costs while maximizing utility for students.

> [!IMPORTANT]
> **Orbit OS is a homework help / "cheat sheet" platform** — NOT a study app. It provides AI assistance for answers, project help (Intel mode, Image Gen), and social features (DMs). Points are earned through engagement, not task completion.

### Core Philosophy

1. **Cost Control Without Frustration** — Hard limits that reset every 72 hours, with overdraft safety nets
2. **Mandatory Smart Routing** — SYNAPSE cannot be disabled (protects operator's API costs)
3. **Earned Access via Engagement** — Points come from login streaks, mining, and social activity (NOT gameable tasks)
4. **Portable Context** — MEMCORE compression enables multi-model workflows

---

## Feature Specifications

### Core Features

| Feature | Codename | Document | Priority |
|---------|----------|----------|----------|
| Per-Model Credit Cycles | CHRONOLOCK Protocol | [01-chronolock-protocol.md](file:///C:/Users/kayla/OneDrive/Desktop/SchoolAIStuff/docs/ai-system/01-chronolock-protocol.md) | Critical |
| Context Compression | MEMCORE Compression | [02-memcore-compression.md](file:///C:/Users/kayla/OneDrive/Desktop/SchoolAIStuff/docs/ai-system/02-memcore-compression.md) | High |
| Smart Routing | SYNAPSE Gateway | [03-synapse-gateway.md](file:///C:/Users/kayla/OneDrive/Desktop/SchoolAIStuff/docs/ai-system/03-synapse-gateway.md) | High |
| Overdraft Buffer | DEADZONE Buffer | [04-deadzone-buffer.md](file:///C:/Users/kayla/OneDrive/Desktop/SchoolAIStuff/docs/ai-system/04-deadzone-buffer.md) | High |
| Point Buyback | CREDIT FORGE | [05-credit-forge.md](file:///C:/Users/kayla/OneDrive/Desktop/SchoolAIStuff/docs/ai-system/05-credit-forge.md) | Medium-High |

### Additional Features

| Feature | Codename | Document Section | Priority |
|---------|----------|------------------|----------|
| Rate Limiting | THERMAL THROTTLE | [06-additional-features.md#part-1](file:///C:/Users/kayla/OneDrive/Desktop/SchoolAIStuff/docs/ai-system/06-additional-features.md) | Medium |
| Response Caching | MNEMONIC CACHE | [06-additional-features.md#part-2](file:///C:/Users/kayla/OneDrive/Desktop/SchoolAIStuff/docs/ai-system/06-additional-features.md) | Medium |
| Progressive Unlocks | NEURALYNC Progression | [06-additional-features.md#part-3](file:///C:/Users/kayla/OneDrive/Desktop/SchoolAIStuff/docs/ai-system/06-additional-features.md) | Medium |

---

## System Architecture

```mermaid
flowchart TB
    subgraph User Layer
        UI[Chat Interface]
        Compact[Compact Button]
        Forge[Credit Forge Modal]
    end

    subgraph Gateway Layer
        Router[SYNAPSE Gateway]
        Throttle[THERMAL THROTTLE]
        Cache[MNEMONIC CACHE]
    end

    subgraph Credit Layer
        Chrono[CHRONOLOCK Protocol]
        Dead[DEADZONE Buffer]
        Forge2[CREDIT FORGE]
    end

    subgraph AI Layer
        Flash[Gemini Flash]
        Pro[Gemini Pro]
        Preview[Gemini 3 Pro Preview]
        Opus[Claude Opus]
        Sonnet[Claude Sonnet]
    end

    subgraph Progression
        Neural[NEURALYNC]
        Skills[Skill Tree]
    end

    UI --> Router
    Compact --> Cache
    Router --> Throttle
    Throttle --> Chrono
    Chrono --> Dead
    Dead --> AI Layer
    Forge --> Forge2
    Forge2 --> Chrono
    Neural --> AI Layer
    Skills --> Neural
```

---

## Database Schema Overview

All features share a unified database design:

| Table | Purpose | Primary Feature |
|-------|---------|-----------------|
| `ai_models` | Model registry with pricing | All |
| `user_model_cycles` | Per-user-model credit tracking | CHRONOLOCK |
| `credit_transactions` | Audit log for all credit changes | CHRONOLOCK |
| `streaming_reservations` | Reserve credits during streaming | DEADZONE |
| `context_compressions` | Saved compression blocks | MEMCORE |
| `buyback_rates` | Exchange rates per model | CREDIT FORGE |
| `buyback_transactions` | Buyback purchase log | CREDIT FORGE |
| `buyback_promotions` | Scheduled discounts | CREDIT FORGE |
| `model_unlock_requirements` | Unlock rules per model | NEURALYNC |
| `user_model_unlocks` | User unlock progress | NEURALYNC |

---

## Multi-Model Workflow Example

This demonstrates the full system working together:

### Scenario: Complex Essay with Model Handoff

1. **Start:** Student opens Research Lab, selects **Gemini 3 Pro Preview**
   - NEURALYNC checks: Student is Level 5 ✓ → Access granted
   - CHRONOLOCK checks: $5.00 / $5.00 available ✓

2. **Research Phase:** 20 messages exploring essay topic
   - CHRONOLOCK deducts: $0.45 used, $4.55 remaining
   - Student builds deep understanding

3. **Compress:** Student clicks **Compact** button
   - MEMCORE compresses 20 messages → 380 tokens
   - Cost: $0.002 from Flash pool
   - Output: Portable context block

4. **Switch Models:** Student opens new chat with **Gemini 2.5 Pro**
   - Pastes MEMCORE context
   - Pro immediately understands full context

5. **Writing Phase:** Pro helps draft essay sections
   - SYNAPSE detects simple query "What's another word for 'however'?"
   - Reroutes to Flash, saves $0.003
   - Toast: "Simple query → Flash. Use Deep Think for analysis."

6. **Credit Exhaustion:** Pro credits hit $0
   - DEADZONE allows $0.12 overdraft to finish thought
   - Student sees: "Using overdraft: -$0.12 / -$0.50 max"

7. **Buyback:** Student needs more Pro credits
   - Opens CREDIT FORGE: 1,500 Orbit Points → $0.10 Pro credits
   - Finals Week promotion: 50% off → 750 points
   - Purchase completes, work continues

8. **Next Cycle:** 72 hours later, Pro resets
   - Overdraft debt ($0.12) deducted from new cycle
   - New balance: $4.88 / $5.00
   - Notification explains carryover

---

## UI/UX Principles

### Themed Nomenclature

All features use cyberpunk-inspired names that reinforce the Orbit OS brand:

| Functional Term | Orbit OS Term |
|-----------------|---------------|
| Credit Cycle | CHRONOLOCK |
| Context Compression | MEMCORE |
| Smart Routing | SYNAPSE |
| Overdraft | DEADZONE |
| Buyback | CREDIT FORGE |
| Rate Limit | THERMAL THROTTLE |
| Response Cache | MNEMONIC CACHE |
| Progression System | NEURALYNC |

### Notification Patterns

1. **Success** → Cyan/Emerald gradient, subtle glow
2. **Warning** → Amber, pulse animation
3. **Error/Blocked** → Red, static with countdown
4. **Educational** → Violet, includes "💡 Tip:"

### Progressive Disclosure

- Simple queries: Minimal UI, just work
- Edge cases: Explain via toast
- Repeated patterns: Escalate to modal
- Complex situations: Full panel with options

---

## Implementation Order

### Phase 1: Core Credit System (Week 1-2)
1. Database migrations
2. CHRONOLOCK service
3. Basic credit UI

### Phase 2: Cost Optimization (Week 3-4)
4. SYNAPSE Gateway (smart routing)
5. MNEMONIC CACHE
6. DEADZONE Buffer

### Phase 3: Economy Integration (Week 5-6)
7. CREDIT FORGE
8. THERMAL THROTTLE
9. NEURALYNC Progression

### Phase 4: Advanced Features (Week 7-8)
10. MEMCORE Compression
11. Multi-model workflow UI
12. Admin dashboards & analytics

---

## Verification Strategy

### Automated Testing
- Unit tests for all services
- Integration tests for credit flows
- Load tests for rate limiting
- Edge case coverage (race conditions, overdraft exhaustion)

### Manual QA
- End-to-end user journeys
- Cross-model workflow testing
- Abuse scenario testing
- Mobile responsiveness

### Analytics & Monitoring
- Credit consumption dashboards
- Routing decision logs
- Buyback conversion rates
- Model unlock progression metrics

---

## Resolved Design Decisions

The following decisions have been finalized:

| Question | Decision | Rationale |
|----------|----------|-----------|
| Cycle Duration | **72 hours fixed** | Single-school app, no multi-tenant config needed |
| Overdraft Cap | **15% or $0.50 max** | Approved as reasonable |
| Buyback Disable | **Admins can disable** | Full control for operator |
| Model Progression | **Single config** | Not a multi-school platform |
| SYNAPSE Opt-Out | **NO — Mandatory** | Protects operator's API costs; students don't pay |

---

> **Status:** Specification complete. Ready for implementation.

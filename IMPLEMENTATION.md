# Round Table Party - MVP Implementation Plan

## Overview

Multiplayer roleplay platform where an AI Game Master narrates and resolves player actions in a turn-based format. Similar to "Old Greg's Tavern" - GM posts narrative, all players submit actions (visible immediately), host triggers GM to resolve, repeat.

---

## Data Model

### New Tables

```sql
-- Campaigns (game sessions)
campaigns
  id              INTEGER PRIMARY KEY
  name            TEXT NOT NULL
  inviteCode      TEXT UNIQUE NOT NULL (6-char alphanumeric)
  hostUserId      INTEGER NOT NULL (FK → users)
  phase           TEXT NOT NULL ('collecting_actions' | 'gm_responding')
  createdAt       INTEGER NOT NULL (timestamp)

-- Players in campaigns
campaignPlayers
  id              INTEGER PRIMARY KEY
visiblecampaignId      INTEGER NOT NULL (FK → campaigns)
  userId          INTEGER NOT NULL (FK → users)
  hasSubmittedAction INTEGER NOT NULL DEFAULT 0 (boolean)
  joinedAt        INTEGER NOT NULL (timestamp)
  UNIQUE(campaignId, oderId)

-- Characters (one per user per campaign)
campaignCharacters
  id              INTEGER PRIMARY KEY
  campaignId      INTEGER NOT NULL (FK → campaigns)
  userId          INTEGER NOT NULL (FK → users)
  name            TEXT NOT NULL
  description     TEXT DEFAULT ''
  avatar          TEXT DEFAULT '' (base64 or URL)
  createdAt       INTEGER NOT NULL (timestamp)
  UNIQUE(campaignId, oderId)

-- Messages in campaigns
campaignMessages
  id              INTEGER PRIMARY KEY
  campaignId      INTEGER NOT NULL (FK → campaigns)
  oderId          INTEGER (FK → users, NULL for GM messages)
  role            TEXT NOT NULL ('gm' | 'player')
  messageType     TEXT NOT NULL ('narrative' | 'action')
  content         TEXT NOT NULL
  createdAt       INTEGER NOT NULL (timestamp)
```

### Schema Location
`src/lib/server/db/schema.ts` - Add new table definitions using Drizzle ORM syntax.

---

## API Endpoints

### Campaign Management

```
POST   /api/campaigns                    - Create campaign
GET    /api/campaigns                    - List user's campaigns
GET    /api/campaigns/[id]               - Get campaign details + messages + players
DELETE /api/campaigns/[id]               - Delete campaign (host only)

POST   /api/campaigns/join               - Join campaign via invite code
POST   /api/campaigns/[id]/leave         - Leave campaign
```

### Game Actions

```
POST   /api/campaigns/[id]/action        - Submit player action
POST   /api/campaigns/[id]/continue      - Trigger GM response (host only)
```

### Character Management

```
GET    /api/campaigns/[id]/character     - Get user's character for campaign
POST   /api/campaigns/[id]/character     - Create/update character for campaign
```

---

## API Details

### POST /api/campaigns
Create a new campaign.

**Request:**
```json
{
  "name": "Dragon's Lair Adventure"
}
```

**Response:**
```json
{
  "id": 1,
  "name": "Dragon's Lair Adventure",
  "inviteCode": "ABC123",
  "hostUserId": 1,
  "phase": "collecting_actions",
  "createdAt": 1699999999
}
```

**Logic:**
1. Generate unique 6-char invite code
2. Create campaign record
3. Add creator as first player in campaignPlayers
4. Return campaign

---

### POST /api/campaigns/join
Join an existing campaign.

**Request:**
```json
{
  "inviteCode": "ABC123"
}
```

**Response:**
```json
{
  "campaign": { ... },
  "needsCharacter": true
}
```

**Logic:**
1. Find campaign by invite code
2. Check if user already in campaign
3. Add to campaignPlayers
4. Check if user has character for this campaign
5. Emit Socket.IO event: `player-joined`
6. Return campaign + whether character creation needed

---

### POST /api/campaigns/[id]/character
Create character for campaign.

**Request:**
```json
{
  "name": "Thorin Ironforge",
  "description": "A gruff dwarf blacksmith seeking redemption",
  "avatar": "data:image/png;base64,..."
}
```

**Logic:**
1. Validate user is in campaign
2. Create/update campaignCharacters record
3. Emit Socket.IO event: `character-created`
4. Return character

---

### POST /api/campaigns/[id]/action
Submit player action for current turn.

**Request:**
```json
{
  "content": "I approach the mysterious stranger and ask about the missing artifact."
}
```

**Logic:**
1. Validate user is in campaign
2. Validate phase is `collecting_actions`
3. Validate user hasn't already submitted (hasSubmittedAction)
4. Create campaignMessages record (role: 'player', messageType: 'action')
5. Update campaignPlayers.hasSubmittedAction = true
6. Emit Socket.IO event: `new-message`
7. Emit Socket.IO event: `action-submitted` (for UI to update submitted count)
8. Return message

---

### POST /api/campaigns/[id]/continue
Trigger GM to resolve actions (host only).

**Logic:**
1. Validate user is host
2. Validate phase is `collecting_actions`
3. Set phase to `gm_responding`
4. Emit Socket.IO event: `phase-changed`
5. Gather context:
   - Recent message history
   - All player characters (names, descriptions)
   - All submitted actions this turn
6. Call LLM to generate GM narrative
7. Create campaignMessages record (role: 'gm', messageType: 'narrative')
8. Reset all campaignPlayers.hasSubmittedAction = false
9. Set phase to `collecting_actions`
10. Emit Socket.IO events: `new-message`, `phase-changed`
11. Return message

---

## Socket.IO Events

### Room Structure
- Room name: `campaign-{campaignId}`
- Players join room when viewing campaign page
- Players leave room when navigating away

### Server → Client Events

| Event | Payload | Description |
|-------|---------|-------------|
| `player-joined` | `{ user, character? }` | New player joined campaign |
| `player-left` | `{ oderId }` | Player left campaign |
| `character-created` | `{ oderId, character }` | Player created/updated character |
| `new-message` | `{ message }` | New GM narrative or player action |
| `action-submitted` | `{ oderId, submittedCount, totalPlayers }` | Player submitted action |
| `phase-changed` | `{ phase }` | Game phase changed |

### Client → Server Events

| Event | Payload | Description |
|-------|---------|-------------|
| `join-campaign` | `campaignId` | Join campaign room |
| `leave-campaign` | `campaignId` | Leave campaign room |

---

## Pages & Routes

### /campaigns
Campaign list and management.

**Features:**
- List user's campaigns (as host or player)
- "Create Campaign" button → modal with name input
- "Join Campaign" button → modal with invite code input
- Click campaign → navigate to `/campaign/[id]`

### /campaign/[id]
Main game view.

**Features:**
- Redirect to character creation if user has no character
- Message feed (GM narratives + player actions)
- Action input (disabled during `gm_responding` or if already submitted)
- Party sidebar showing all players + characters
- Host controls (Continue button)
- Invite code display for sharing

### /campaign/[id]/character (or modal)
Character creation for campaign.

**Features:**
- Name input
- Description textarea
- Avatar upload
- Submit → redirect to campaign

---

## UI Components

### New Components

```
src/lib/components/campaign/
  CampaignList.svelte        - List of campaigns with create/join
  CampaignCard.svelte        - Single campaign in list
  CreateCampaignModal.svelte - Modal for creating campaign
  JoinCampaignModal.svelte   - Modal for joining via code

  GameView.svelte            - Main campaign game layout
  MessageFeed.svelte         - GM + player messages display
  GMMessage.svelte           - GM narrative message bubble
  PlayerMessage.svelte       - Player action message bubble
  ActionInput.svelte         - Player action input field

  PartySidebar.svelte        - Right sidebar with party info
  PartyMember.svelte         - Single player in party list
  HostControls.svelte        - Continue button + status

  CharacterCreation.svelte   - Character creation form
```

### Reusable from Existing

- Avatar upload component (from profile/persona)
- Loading states
- Error handling
- Socket.IO integration patterns

---

## GM Prompt Engineering

### System Prompt Structure

```
You are the Game Master for a multiplayer roleplay session.

## Campaign
Name: {campaignName}

## Players
{for each player}
- {characterName}: {characterDescription}
{end}

## Your Role
- Narrate the story and describe the world
- React to player actions fairly and dramatically
- Keep all players engaged - address each player's action
- Create interesting challenges and NPCs
- Maintain consistency with previous events

## Rules
- Never control player characters - only describe outcomes of their actions
- Be descriptive but concise (2-4 paragraphs typically)
- End narratives with a situation that invites player response
- If a player's action would reasonably fail, describe why
```

### Turn Resolution Prompt

```
## Recent Story
{last N messages of context}

## Player Actions This Turn
{for each action}
{characterName}: {actionContent}
{end}

## Instructions
Resolve all player actions and continue the narrative. Address what each player attempted and the outcomes. Then present the new situation.
```

---

## Implementation Order

### Phase 1: Database & Basic API
1. Add new tables to schema.ts
2. Run db:push to create tables
3. Create campaign service (CRUD operations)
4. Create campaign API endpoints (create, list, get, join)
5. Test with REST client

### Phase 2: Campaign Pages
6. Create /campaigns page with list
7. Create/Join campaign modals
8. Create /campaign/[id] page (basic layout)
9. Character creation flow
10. Display campaign messages

### Phase 3: Real-time & Game Loop
11. Add Socket.IO events for campaigns
12. Implement action submission
13. Implement host "Continue" button
14. Implement GM response generation
15. Real-time message updates

### Phase 4: Polish
16. Party sidebar with live updates
17. Phase indicators (whose turn, who has submitted)
18. Join mid-session (show history, allow action)
19. Leave campaign
20. Error handling and edge cases

---

## Files to Modify

### Database
- `src/lib/server/db/schema.ts` - Add tables

### Services (New)
- `src/lib/server/services/campaignService.ts` - Campaign CRUD
- `src/lib/server/services/campaignMessageService.ts` - Message handling
- `src/lib/server/services/campaignGMService.ts` - GM response generation

### API Routes (New)
- `src/routes/api/campaigns/+server.ts` - List, create
- `src/routes/api/campaigns/[id]/+server.ts` - Get, delete
- `src/routes/api/campaigns/[id]/action/+server.ts` - Submit action
- `src/routes/api/campaigns/[id]/continue/+server.ts` - Trigger GM
- `src/routes/api/campaigns/[id]/character/+server.ts` - Character CRUD
- `src/routes/api/campaigns/join/+server.ts` - Join via code

### Pages (New)
- `src/routes/campaigns/+page.svelte` - Campaign list
- `src/routes/campaign/[id]/+page.svelte` - Game view

### Components (New)
- `src/lib/components/campaign/` - All campaign components

### Socket.IO
- `src/lib/server/socket.ts` - Add campaign events
- `src/lib/stores/socket.ts` - Add campaign event handlers

---

## What to Remove/Deprecate Later

After MVP is working, consider removing or hiding:
- Single-player character chat (`/chat/[id]`)
- Character card import (or repurpose for campaign NPCs)
- Decision/Content/Image LLM settings (simplify to just GM LLM)
- Swipes system (not applicable to multiplayer)
- Conversation branches (campaigns are linear)

For MVP, these can remain but be de-emphasized in navigation.

---

## Open Questions for Later

1. **Rulesets/Stats** - How will character sheets work? Skill checks? Dice?
2. **NPC Management** - Can GM create persistent NPCs?
3. **Campaign Settings** - Max players? Turn time limits?
4. **Player Permissions** - Co-GM? Player kick/ban?
5. **Campaign State** - Pause? Archive? Export?
6. **Media** - Images in campaign? Maps?

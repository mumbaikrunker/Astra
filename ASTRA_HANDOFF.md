# ASTRA Bot — Project Handoff

## Project Summary
ASTRA is a Discord.js v14-based matchmaking bot for Discord servers. It provides slash-command driven queue management, team balancing, ready checks, match creation, match reporting, rating updates, setup panels, and moderation-related utilities. The project uses an event-driven architecture with a service layer and a PostgreSQL database.

## Core Architecture

### Runtime flow
1. [index.js](index.js) boots the bot client and loads commands/events.
2. [utils/handler.js](utils/handler.js) loads slash commands and Discord event handlers.
3. [events/interactionCreate.js](events/interactionCreate.js) routes all interactions to the appropriate handler.
4. Handlers in [events/setupHandlers.js](events/setupHandlers.js), [events/queueHandlers.js](events/queueHandlers.js), [events/readyHandlers.js](events/readyHandlers.js), [events/resultHandlers.js](events/resultHandlers.js), and [events/reportHandlers.js](events/reportHandlers.js) delegate work to services and utilities.
5. Services in [systems](systems) interact with the PostgreSQL database via [database/postgres.js](database/postgres.js).

### Architectural decisions
- Event-driven interaction handling with per-feature handlers.
- Centralized command registry via [systems/commandRegistry.js](systems/commandRegistry.js).
- Service-layer separation for configuration, matchmaking, ratings, moderation, season, user, and queue concerns.
- Lightweight in-memory caching for frequently read guild config values.
- Transaction-based match result finalization to avoid partial rating/match updates.
- Minimal, non-invasive fixes were preferred over architectural rewrites.

## Main Functional Areas

### Commands
Implemented and wired slash commands include:
- [commands/add.js](commands/add.js)
- [commands/balance.js](commands/balance.js)
- [commands/guildconfig.js](commands/guildconfig.js)
- [commands/help.js](commands/help.js)
- [commands/history.js](commands/history.js)
- [commands/leaderboard.js](commands/leaderboard.js)
- [commands/map.js](commands/map.js)
- [commands/match.js](commands/match.js)
- [commands/matchinfo.js](commands/matchinfo.js)
- [commands/matchstatus.js](commands/matchstatus.js)
- [commands/notready.js](commands/notready.js)
- [commands/ping.js](commands/ping.js)
- [commands/profile.js](commands/profile.js)
- [commands/queueban.js](commands/queueban.js)
- [commands/rank.js](commands/rank.js)
- [commands/ready.js](commands/ready.js)
- [commands/remove.js](commands/remove.js)
- [commands/report.js](commands/report.js)
- [commands/season.js](commands/season.js)
- [commands/setup.js](commands/setup.js)
- [commands/timeout.js](commands/timeout.js)
- [commands/unqueueban.js](commands/unqueueban.js)
- [commands/uptime.js](commands/uptime.js)
- [commands/warn.js](commands/warn.js)
- [commands/who.js](commands/who.js)

### Setup system
The setup flow is implemented through [utils/setupManager.js](utils/setupManager.js) and [events/setupHandlers.js](events/setupHandlers.js). It supports:
- Main setup panel
- Channels configuration
- Timers configuration
- Ready system configuration
- Prefix configuration
- Custom queue management
- Back-navigation and modal-driven updates

### Matchmaking and ready flow
The core queue and match flow is handled by:
- [utils/listStore.js](utils/listStore.js)
- [utils/queueManager.js](utils/queueManager.js)
- [utils/readyManager.js](utils/readyManager.js)
- [utils/matchMaker.js](utils/matchMaker.js)
- [systems/matchmaking/matchFactory.js](systems/matchmaking/matchFactory.js)
- [systems/matchmaking/matchService.js](systems/matchmaking/matchService.js)
- [systems/matchmaking/customQueueService.js](systems/matchmaking/customQueueService.js)

### Reporting and ratings
Match reporting and rating updates are handled by:
- [utils/reportManager.js](utils/reportManager.js)
- [utils/matchInfoManager.js](utils/matchInfoManager.js)
- [systems/ratings/ratingService.js](systems/ratings/ratingService.js)
- [systems/ratings/userService.js](systems/ratings/userService.js)
- [systems/ratings/elo.js](systems/ratings/elo.js)

### Database
Database persistence is centered in:
- [database/postgres.js](database/postgres.js)
- [database/schema.sql](database/schema.sql)
- [database/init.js](database/init.js)

## Completed Work

### Startup and loading
- Verified startup path and command/event loading.
- Stabilized the event loader so helper modules under the events folder are not misinterpreted as Discord event definitions.
- Ensured the bot loads commands and events successfully.

### Interaction routing
- Verified the interaction routing chain from Discord gateway to handler to service to database.
- Stabilized interaction response handling for buttons, selects, modals, and slash commands.
- Prevented brittle acknowledgment behavior in component flows.

### Setup system
- Verified setup panel navigation and handler wiring.
- Stabilized panel refresh behavior for setup-related interactions.
- Ensured main setup, channel, timer, ready, prefix, and queue management flows remain reachable.

### Queue management
- Verified custom queue creation, rename, resize, channel change, deletion, and back navigation flow.
- Added cleanup for pending custom queue state after timeout or abandonment.

### Matchmaking and ready system
- Verified queue joining, match generation, ready check lifecycle, and queue restoration behavior.
- Added rollback handling for failed match channel creation and match row creation.
- Added cleanup for orphaned creation state.

### Results and ratings
- Verified match result flows and match resolution paths.
- Implemented transaction-based finalization so ratings and match-status updates do not diverge on failure.

### Database and persistence
- Added self-healing database initialization.
- Extended the schema to cover guild config fields, custom queues, and MVP-related tables.
- Added lightweight config caching to reduce repetitive reads.

## Bugs Fixed

### 1. Event loader misclassification
- File: [utils/handler.js](utils/handler.js)
- Issue: helper modules in the events folder were being treated as event definitions.
- Fix: Only files exporting a proper Discord event shape are registered as events.

### 2. Setup response handling
- File: [utils/setupManager.js](utils/setupManager.js)
- Issue: setup UI responses were brittle for modal-driven and component-based flows.
- Fix: Switched to safe response handling that avoids unsupported interaction patterns.

### 3. Database schema gaps
- File: [database/schema.sql](database/schema.sql), [database/init.js](database/init.js)
- Issue: required columns and tables for guild config, custom queues, and MVP voting were not consistently present.
- Fix: Added schema coverage and auto-healing initialization.

### 4. Match resolution atomicity
- File: [database/postgres.js](database/postgres.js), [systems/ratings/ratingService.js](systems/ratings/ratingService.js), [systems/matchmaking/matchService.js](systems/matchmaking/matchService.js)
- Issue: match completion and rating updates were previously vulnerable to partial failure.
- Fix: Added transaction-based finalization using BEGIN/COMMIT/ROLLBACK.

### 5. Match creation rollback
- File: [systems/matchmaking/matchFactory.js](systems/matchmaking/matchFactory.js)
- Issue: failed match creation could leave orphaned channels or DB rows.
- Fix: Added cleanup logic to remove the channel and database row on failure and restore queue state.

### 6. Pending custom queue cleanup
- File: [events/queueHandlers.js](events/queueHandlers.js)
- Issue: stale pending queue state could remain after abandonment.
- Fix: Added auto-expiring pending queue entries with cleanup timers.

### 7. Interaction response safety
- File: [events/interactionCreate.js](events/interactionCreate.js)
- Issue: generic response handling could break in deferred or already-acknowledged interaction flows.
- Fix: Introduced a safer response helper for replies, edits, follows-up, and updates.

### 8. Repeated guild config reads
- File: [systems/configs/guildConfigService.js](systems/configs/guildConfigService.js)
- Issue: guild configuration was read repeatedly across flows.
- Fix: Added short-lived in-memory caching with invalidation on updates.

## Current Project Status

### Status summary
- Startup: PASS
- Command registry: PASS
- Event registry: PASS
- Interaction routing: PASS
- Setup system: PASS
- Queue management: PASS
- Matchmaking flow: PASS
- Ready system: PASS
- Reporting and ratings: PASS
- Database initialization: PASS
- Validation suite: PASS

### Validation evidence
The current validator runs successfully with:
- 25 commands loaded
- 3 events loaded
- 0 load errors
- 0 serialization errors

## Current TODO List

### Immediate next steps
- Exercise the bot live in a Discord server with real interactions to verify behavior end-to-end.
- Confirm the bot works under real Discord permissions and channel constraints.
- Monitor match/report flows in production-like conditions for edge cases.

### Future feature work
- Tournament module
  - Tournament creation
  - Tournament dashboard
  - Signups and team validation
  - Check-ins and bracket generation
  - Match channels and temporary voice/text channels
  - Score reporting and admin overrides
  - MVP voting and tournament statistics

### UI improvement backlog
- Refine embed styling and consistency
- Improve button/select menu polish
- Add pagination and richer navigation where needed

## Notes for Continuation
The bot is now stable from an architecture and validation standpoint. The current codebase is in a good state for further feature development, especially the planned tournament system, but live Discord runtime testing remains the next quality gate.

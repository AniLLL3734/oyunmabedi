# Game Balance Changes - Removal of Unbalanced Shop Items

## Overview
This document summarizes the changes made to remove the unbalanced shop items "Hız Canavarı (24 Saat)" and "Zaman Lordu (29 Saat)" from the game to restore balance to the scoring system.

## Items Removed

1. **Hız Canavarı (24 Saat)**
   - ID: `speed_demon_24h`
   - Type: TEMPORARY_ACHIEVEMENT
   - Price: 4000 coins
   - Effect: 1.5x score multiplier for 24 hours
   - Rarity: rare

2. **Zaman Lordu (29 Saat)**
   - ID: `time_lord_29h`
   - Type: TEMPORARY_ACHIEVEMENT
   - Price: 25000 coins
   - Effect: 2x score multiplier for 29 hours
   - Rarity: legendary

## Changes Made

### 1. Shop Items Removal
- **File**: `data/shopItems.ts`
- **Change**: Commented out both items from the shop items array to prevent new purchases

### 2. Score Multiplier Logic Update
- **File**: `hooks/useScoreSystem.ts`
- **Change**: Removed the switch cases for both items in the `getScoreMultiplier` function to eliminate their effects

### 3. Database Cleanup Script
- **File**: `remove_unbalanced_items.js`
- **Purpose**: Script to remove these items from existing users' inventories
- **Functionality**: 
  - Scans all users in the database
  - Removes instances of these items from user inventories
  - Reports affected users

### 4. Documentation
- **File**: `REMOVE_UNBALANCED_ITEMS.md`
- **Purpose**: Instructions for running the cleanup script and explanation of why these items were removed

### 5. Task Tracking
- **File**: `TODO.md`
- **Change**: Added task to track the removal and cleanup process

## Reason for Removal

These items created significant imbalance in the game economy:
- The "Hız Canavarı (24 Saat)" provided a 1.5x score multiplier, making it too easy to accumulate scores
- The "Zaman Lordu (29 Saat)" provided a 2x score multiplier, which was even more excessive
- These multipliers undermined the core gameplay loop and made it difficult for regular players to compete

The removal ensures a fairer playing field for all users while maintaining other legitimate shop items and achievements.

## Post-Removal Verification Steps

1. Verify that the items no longer appear in the shop
2. Confirm that the score multiplier logic no longer applies these bonuses
3. Run the database cleanup script to remove items from existing user inventories
4. Monitor user feedback for any unintended consequences
# Removal of Unbalanced Shop Items

This document explains how to remove the unbalanced shop items "Hız Canavarı (24 Saat)" and "Zaman Lordu (29 Saat)" from the game.

## Changes Made

1. Removed the items from the shop (`data/shopItems.ts`)
2. Removed their effects from the score calculation system (`hooks/useScoreSystem.ts`)
3. Created a script to remove these items from existing users' inventories

## Running the Removal Script

To remove these items from all users' inventories:

1. You need to set up Firebase Admin SDK credentials in your environment variables:
   - `FIREBASE_PRIVATE_KEY_ID`
   - `FIREBASE_PRIVATE_KEY`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_CLIENT_ID`
   - `FIREBASE_CLIENT_CERT_URL`

2. Run the script:
   ```bash
   node remove_unbalanced_items.js
   ```

This script will:
- Scan all users in the database
- Remove any instances of "speed_demon_24h" and "time_lord_29h" from their inventories
- Report how many users were affected

## Why These Items Were Removed

These items were causing significant imbalance in the game economy:
- "Hız Canavarı (24 Saat)" provided a 1.5x score multiplier
- "Zaman Lordu (29 Saat)" provided a 2x score multiplier
- These multipliers made it too easy for users to accumulate scores rapidly, undermining the game's balance

The removal ensures a fairer playing field for all users.
# Investment Tracking System

## Overview
This document explains how the investment profit/loss tracking system works in the betting system.

## How It Works

### 1. Data Collection
- When a user resolves an investment in the Investment Game, the Cloud Function `manageInvestment` is called
- The function calculates the profit or loss from the investment
- Based on the result, it updates one of two collections:
  - `investment_profits` for users who made a profit
  - `investment_losses` for users who incurred a loss

### 2. Data Structure

#### investment_profits collection
```
{
  userId: string,
  displayName: string,
  avatarUrl: string,
  totalProfit: number,
  lastUpdated: timestamp
}
```

#### investment_losses collection
```
{
  userId: string,
  displayName: string,
  avatarUrl: string,
  totalLoss: number,
  lastUpdated: timestamp
}
```

### 3. Leaderboard Integration
The BettingPage.tsx fetches data from these collections to display:
- Top earners (highest totalProfit)
- Biggest losers (highest totalLoss)

### 4. Fallback Behavior
If the investment collections don't exist or are empty, the leaderboard will fall back to showing the richest users from the main users collection.

## Implementation Notes
- The tracking is done server-side in Cloud Functions to prevent cheating
- Client-side investment games (like InvestmentGame_ClientSide.tsx) don't directly update these collections
- All profit/loss calculations are verified server-side
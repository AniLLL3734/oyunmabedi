# AFK System Documentation

## Overview
This document explains the implementation of the new AFK (Away From Keyboard) system in the TTMTAL Games application. The system has been enhanced to provide better user experience with early warnings and more intuitive behavior.

## Components

### 1. useAfkSystem Hook
Located at: `src/hooks/useAfkSystem.ts`

This custom hook manages the AFK state and provides the following functionality:
- Tracks user activity through multiple event listeners
- Provides early warning 30 seconds before AFK timeout
- Manages countdown timers for AFK warning
- Handles user interaction to reset AFK state

#### Features:
- **Activity Tracking**: Listens for mouse movement, clicks, keyboard input, touch events, and scrolling
- **Early Warning**: Shows a warning 30 seconds before entering AFK mode
- **Countdown Timer**: Displays real-time countdown in the warning UI
- **Graceful Handling**: Allows users to cancel AFK state with any interaction

### 2. useScoreSystem Hook
Located at: `src/hooks/useScoreSystem.ts`

The main score system hook has been updated to integrate with the new AFK system:
- Uses the new `useAfkSystem` hook for AFK management
- Pauses score generation when user is AFK
- Maintains all existing anti-cheat functionality

### 3. UI Components
Located at: `App.tsx`

#### AfkWarning Component
A new enhanced warning component that:
- Shows 30 seconds before AFK timeout
- Displays real-time countdown
- Provides clear call-to-action button
- Differentiates between warning and active AFK states

## Configuration

### Timeout Settings
- **Default AFK Timeout**: 3 hours (10,800,000 ms)
- **AFK Warning Time**: 30 seconds (30,000 ms) before timeout
- **Score Generation Interval**: 5 minutes (300,000 ms)

### Special Items
The "AFK Ustası (24 Saat)" item extends AFK timeout to 3 hours (same as default).

## Implementation Details

### Activity Events Tracked
- `mousemove`
- `mousedown`
- `keydown`
- `touchstart`
- `scroll`
- `wheel`
- `click`

### State Management
The system maintains several states:
- `isAfk`: Whether the user is currently in AFK mode
- `showWarning`: Whether to display the AFK warning
- `timeUntilAfk`: Countdown timer for AFK transition

### CSS Integration
The system adds/removes the `user-is-afk` class to the body element when entering/leaving AFK mode, allowing for custom styling.

## Usage

### For Developers
To use the AFK system in components:

```typescript
import { useScoreSystem } from './hooks/useScoreSystem';

const MyComponent = () => {
  const { isAfk, isBlocked, showAfkWarning, timeUntilAfk } = useScoreSystem();
  
  // Use these states to modify component behavior
  return (
    <div className={isAfk ? 'afk-mode' : 'active-mode'}>
      {/* Component content */}
    </div>
  );
};
```

### For Users
- The system automatically tracks user activity
- A warning appears 30 seconds before AFK timeout
- Users can cancel AFK state by interacting with the page
- Score generation pauses during AFK mode

## Future Improvements

1. **Customizable Timeout**: Allow users to set their preferred AFK timeout
2. **Activity History**: Track and display user activity patterns
3. **Mobile Optimization**: Enhanced touch-based activity tracking
4. **Notification System**: Browser notifications for AFK transitions
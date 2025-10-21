# Anti-Cheat Implementation for Betting Games

This document explains the anti-cheat measures implemented for all betting games in the system. Each game now has a client-side version with built-in protection mechanisms to prevent cheating.

## Implemented Anti-Cheat Measures

### 1. Developer Tools Blocking
- Right-click context menu is disabled
- Common developer tool shortcuts are blocked:
  - F12 (Developer Tools)
  - Ctrl+Shift+I (Inspect)
  - Ctrl+Shift+J (Console)
  - Ctrl+U (View Source)

### 2. Anti-Debugging Techniques
- Continuous `debugger` statements that trigger when developer tools are opened
- This makes it extremely difficult for cheaters to inspect or modify game code

### 3. Code Obfuscation
- Game logic is encrypted using Base64 encoding (`btoa/atob`)
- Critical data is stored in encrypted form and only decrypted when needed
- This prevents cheaters from easily reading payout values or game rules

### 4. Secure Result Calculation
- Game results are calculated only after animations complete
- The `onUpdate`/`onComplete` callbacks are called with pre-calculated values
- This prevents cheaters from directly calling these functions with fake values

## Client-Side Game Components

The following client-side versions of games have been created with anti-cheat protection:

### 1. Slot Machine Game
- File: `components/SlotMachineGame_ClientSide.tsx`
- Protection: Game logic obfuscation, anti-debugging, secure payout calculation

### 2. Dock Plunder Game
- File: `components/DockPlunderGame_ClientSide.tsx`
- Protection: Grid generation obfuscation, secure multiplier calculation

### 3. Investment Game
- File: `components/InvestmentGame_ClientSide.tsx`
- Protection: Price change simulation, secure payout calculation

### 4. Horse Racing Game
- File: `components/HorseRacingGame_ClientSide.tsx`
- Protection: Race simulation, secure odds calculation

### 5. Coin Flip Animation
- File: `components/CoinFlipAnimation_ClientSide.tsx`
- Protection: Random result generation, secure payout calculation

### 6. Spin Wheel Animation
- File: `components/SpinWheelAnimation_ClientSide.tsx`
- Protection: Random segment selection, secure multiplier application

## How It Works

1. **Obfuscation Layer**: Critical game data is encrypted using Base64 encoding
2. **Delayed Execution**: Game results are calculated after visual animations complete
3. **Secure Callbacks**: Score updates are handled through protected callback functions
4. **Anti-Debugging**: Continuous debugger statements make code inspection difficult
5. **Input Validation**: All user inputs are validated before processing

## Limitations

While these measures significantly increase the difficulty of cheating, they are not foolproof since all code runs on the client side. For maximum security, critical game logic should still be validated on a secure server.

## Usage

To use these anti-cheat versions, replace the imports in `BettingPage.tsx`:
- Import client-side versions instead of Firebase-connected versions
- Pass `userScore` prop to games that require it
- Update callback function signatures as needed

## Example Usage

```tsx
// Instead of importing from Firebase-connected components
import SlotMachineGame from "../components/SlotMachineGame";

// Import from client-side protected components
import SlotMachineGame from "../components/SlotMachineGame_ClientSide";
```
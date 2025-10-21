# AFK System Testing Guide

## How to Test the AFK System

1. **Open the browser console** (F12 -> Console tab)
2. **Stay inactive** for 2 minutes (the new test timeout)
3. **Watch for these log messages**:
   - `[AFK System] Setting warning timer for 90000ms`
   - `[AFK System] Setting AFK timer for 120000ms`
   - `[AFK System] Showing AFK warning`
   - `[AFK System] Countdown: Xs remaining`
   - `[AFK System] User is now AFK`

4. **To reset the AFK state**, simply move your mouse or press any key

## Debugging Information Display

A small debug panel will appear in the top-right corner showing:
- AFK status (Yes/No)
- Warning status (Yes/No)
- Time until AFK (in seconds)
- Blocked status (Yes/No)

## Testing the Warning UI

1. Wait for 90 seconds (1.5 minutes) to see the warning
2. The warning should show:
   - "Zaman Akışında Bir Yaklaşma..." title
   - Countdown timer
   - "Etkinliği Göster" button
3. Click the button to reset the AFK state
4. After 120 seconds (2 minutes) total, you should see:
   - "Zaman Akışında Bir Duraksama..." title
   - AFK state activated

## Common Issues

1. **Warning doesn't appear**:
   - Check browser console for errors
   - Make sure no mouse movement or keyboard input is happening
   - Verify the timeout is set correctly (should be 2 minutes for testing)

2. **UI doesn't update**:
   - Check if the component is re-rendering
   - Verify the state values are changing in the debug panel

3. **Timer not counting down**:
   - Check if the countdown useEffect is running
   - Verify the timeUntilAfk value is updating
# Pagination Implementation for LeaderboardPage.tsx

## Steps to Complete
- [ ] Add startAfter import from firebase/firestore
- [ ] Add state variables for pagination (lastUserDoc, hasMoreUsers, loadingMoreUsers, lastClanDoc, hasMoreClans, loadingMoreClans)
- [ ] Modify fetchLeaderboard to set pagination states after initial fetch
- [ ] Add fetchMoreUsers function for loading more users
- [ ] Add fetchMoreClans function for loading more clans
- [ ] Add "Load More" button for users leaderboard
- [ ] Add "Load More" button for clans leaderboard
- [ ] Update loading states during fetches

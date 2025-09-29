# TODO List for Site Updates

## 1. Change Site Theme to Dark Different Theme
- [ ] Update Tailwind config in index.html with darker color scheme
- [ ] Ensure all components use the new dark theme

## 2. Add Persistent Textbox at Bottom for Chat Access
- [x] Add fixed bottom textbox component in Layout.tsx
- [x] Implement logic: when "SOHBET" is typed, navigate to /chat
- [x] Style the textbox to match site theme

## 3. Add Comments Toggle in Admin Panel
- [ ] Add toggle button in AdminPage for enabling/disabling game comments
- [ ] Create Firestore setting for comments enabled/disabled
- [ ] Modify CommentSection to check setting and hide form when disabled
- [ ] Update admin panel UI to show current status

## 4. Testing and Verification
- [ ] Test theme changes across pages
- [ ] Test textbox functionality
- [ ] Test admin comments toggle
- [ ] Ensure no breaking changes

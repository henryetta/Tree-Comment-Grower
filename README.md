# Tree-Comment-Grower
Privacy Policy for the Tree Comment Grower Game
# Permission Justification for Chrome Web Store Review

## Extension Overview
**Tree Growth - Social Media Game** is an educational gamification tool that helps users improve their online communication skills through AI-powered comment analysis and visual feedback via virtual tree growing.

---

## Host Permissions Justification

### Why Host Permissions Are Required

Our extension monitors text input **in real-time** on social media platforms to provide immediate feedback on communication quality. This requires content script injection to detect when users type comments.

### Specific Permissions Breakdown

**Social Media Platforms:**
- `https://twitter.com/*` & `https://x.com/*` - Monitor comment composition boxes
- `https://facebook.com/*` - Monitor Facebook comment fields
- `https://instagram.com/*` - Monitor Instagram comment inputs
- `https://linkedin.com/*` - Monitor LinkedIn post/comment fields
- `https://reddit.com/*` - Monitor Reddit comment threads
- `https://youtube.com/*` - Monitor YouTube comment sections
- `https://tiktok.com/*` - Monitor TikTok comment fields

**Backend Access:**
- `https://*.supabase.co/*` - Connect to our Supabase serverless backend for:
  - Storing user tree growth data
  - Leaderboard functionality
  - User authentication
  - Data synchronization across devices

---

## What Data We Access

### ✅ What We DO Access:
1. **Text typed in comment boxes** - Only analyzed locally via on-device AI
2. **Comment submission events** - To record when user posts a comment
3. **DOM structure** - To identify comment input fields on different platforms

### ❌ What We DON'T Access:
- Private messages or DMs
- User passwords or authentication tokens
- Feed content from other users
- Profile information beyond public username
- Location data
- Browser history outside social media sites
- Financial information
- Any data from other browser tabs

---

## Privacy & Security Measures

### 1. Minimal Data Collection
- Only stores: username, email, comment text (user's own), timestamps
- No tracking of browsing behavior
- No data sold to third parties
- No analytics or tracking pixels

### 2. On-Device AI Processing
- AI comment analysis runs **entirely in browser** using TensorFlow.js
- Comments analyzed locally via offscreen document
- No comment text sent to external AI APIs
- Model runs client-side for privacy

### 3. Data Storage
- User data stored in Supabase (industry-standard serverless platform)
- Encryption in transit (HTTPS)
- User can export/delete all data anytime
- No data retention beyond user's active session

### 4. Transparent Operation
- Extension icon shows when active
- User explicitly signs up and selects a tree to start
- Clear UI feedback when monitoring comments
- Easy opt-out via disabling extension

---

## Permission Usage Details

### `storage`
**Why:** Store user preferences, tree state, and game progress locally
**Scope:** Local browser storage only, no external sync

### `activeTab`
**Why:** Access current tab to inject monitoring for comment fields
**Scope:** Only when user clicks extension icon

### `scripting`
**Why:** Inject content scripts to monitor comment inputs
**Scope:** Limited to declared social media hosts

### `downloads`
**Why:** Allow users to export their data (privacy compliance)
**Scope:** User-initiated data export only

### `offscreen`
**Why:** Run AI model in isolated context for performance/security
**Scope:** Runs local AI model, no network access from offscreen page

---

## Alternative Permission Models Considered

### Why We Can't Use `activeTab` Only:
- Extension needs **continuous monitoring** of comment fields
- Real-time feedback requires persistent content scripts
- `activeTab` only provides one-time access, not ongoing monitoring
- User expects tree to grow automatically as they comment naturally

### Why We Need Multiple Host Permissions:
- Users comment across different platforms
- Each platform has different DOM structures requiring specific monitoring
- Cannot predict which platforms user will use
- Provides comprehensive gamification experience across user's entire social media presence

---

## Review Testing Instructions

### Quick Test (No Social Login Required):
1. Install extension
2. Click icon → Sign up with test credentials
3. Open bundled test page: `chrome-extension://[ID]/test-comments.html`
4. Type positive comment → See "Normal" category + water drop
5. Type toxic comment → See "Profanity/Derogatory" category + poison drop

### Live Social Media Test:
1. Go to twitter.com or reddit.com
2. Start typing in any comment box
3. Extension detects text input in real-time
4. Positive comments add water (tree grows)
5. Negative comments add poison (tree health decreases)

**Verify:** Inspect Network tab - AI processing happens locally, no external API calls for comment analysis

---

## Compliance & Transparency

✅ Privacy Policy: Published at [URL - link to your privacy policy]
✅ Data Usage Disclosure: All collected data types declared in store listing
✅ User Consent: Explicit signup required before any monitoring begins
✅ Data Access: Users can view/export/delete all data via extension UI
✅ Open Source: Code available for audit (if applicable)
✅ No Hidden Behavior: Extension does exactly what description states

---

## Contact Information

**Developer:** [Your Name/Organization]
**Support Email:** [Your Support Email]
**Privacy Inquiries:** [Privacy Contact Email]
**Extension Version:** 1.0

---

## Summary

This extension requires host permissions for its **core educational functionality** - monitoring user's own comments across social media to gamify positive communication. All AI processing occurs **locally on-device**, data collection is **minimal and transparent**, and users have **full control** over their data. The permissions requested are the **minimum necessary** to deliver the promised experience.

We are committed to user privacy and transparency in all aspects of this educational tool.

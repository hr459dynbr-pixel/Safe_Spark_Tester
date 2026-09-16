# Safe Spark Tester

A research prototype for testing a video-based first date experience. Testers choose a shared activity, participate in a simulated 3-minute date with video and conversation prompts, then answer a detailed questionnaire. All results are automatically saved to Google Sheets.

## Features

- 📹 **Video Date Simulation** — Prerecorded date person + your webcam preview in corner
- 🎯 **6 Shared Activities** — Choose from different first-date activity types
- ⏱️ **3-Minute Countdown** — Full immersive date simulation with timer
- 💬 **Conversation Prompts** — Activity-specific prompts appearing at 1m, 2m, and 3m marks
- 🔊 **Media Controls** — Mute, volume, fullscreen toggle
- ❤️ **Private Decision Point** — Continue or end the date (other person can't see choice)
- 📋 **Detailed Questionnaire** — 20+ research questions covering experience and adoption
- 📊 **Live Dashboard** — Real-time analytics, breakdowns, and feedback viewer
- 🔒 **Password-Protected** — Dashboard access requires authentication
- 💾 **Automatic Google Sheets** — Creates and populates spreadsheet on first deploy

## Quick Start

### Use the Deployed Version

Visit the live tester:
```
https://script.google.com/macros/s/AKfycby4YFjZ3lD9iR3xiPYYKloMc14K7MC003WfEEuuYArRE9Ts3toIs8xe_KzNE5WRAEulKA/exec
```

View the dashboard (default password: `CHANGE-ME-1234`):
```
https://script.google.com/macros/s/AKfycby4YFjZ3lD9iR3xiPYYKloMc14K7MC003WfEEuuYArRE9Ts3toIs8xe_KzNE5WRAEulKA/exec?page=dashboard
```

### Deploy Your Own

1. Create a new Google Apps Script project
2. Copy all code from `Code.gs` into your script
3. Create a new deployment:
   - Click **Deploy → New deployment**
   - Select **Web app**
   - Set "Execute as" to your account
   - Set "Who has access" to "Anyone"
4. Copy the deployment URL and test
5. Redeploy after making changes

## Customization

### Change Dashboard Password

Edit `Code.gs`, line 5:
```javascript
DASHBOARD_PASSWORD: 'your-new-secure-password'
```

Then redeploy as a new version.

### Replace the Date Video

The prototype uses a placeholder video. To use your own:

1. Host your video on Google Drive, YouTube, or another CDN
2. In `Code.gs`, find line 7:
   ```javascript
   DATE_VIDEO_URL: 'YOUR_VIDEO_URL_HERE'
   ```
3. Replace with your video's direct playable URL
4. Redeploy

**Video requirements:**
- Must be directly playable in `<video>` tag (CORS-enabled)
- Recommended: 3-minute duration
- Format: MP4 preferred for browser compatibility
- Should show a person talking/engaging naturally

### Customize Activities

Edit the `activities` object in `getTesterHTML()` (in `Code.gs`):

```javascript
const activities = {
  "Your Activity Name": [
    "Prompt at 0:00 (activity description)",
    "Prompt at 1:00 (mid-way)",
    "Prompt at 2:00 (final)"
  ]
};
```

### Adjust Date Duration

Change line 6 in `Code.gs`:
```javascript
DATE_DURATION_SECONDS: 180  // 3 minutes = 180 seconds
```

## Data Collection

All responses are automatically saved to a Google Sheet with:

**Core data:**
- Tester ID (unique identifier)
- Session ID (groups related data)
- Activity chosen
- Date duration and continuation decision
- Timestamp (created, completed, submitted)

**Demographic:**
- Age group
- Dating app usage frequency
- Comfort with in-person meetings

**Experience:**
- Naturalness rating (1-5)
- Activity effectiveness (Likert scale)
- Pressure compared to real dates
- Continuation confidence (1-5)

**Adoption metrics:**
- Would use Safe Spark (yes/no)
- Likelihood to use within 30 days
- Preference vs. conventional dates
- Likelihood to recommend
- Perceived reasonable price

**Feedback:**
- One thing to change (open-ended)
- Problem it solves (open-ended)
- Liked most (open-ended)
- Other comments (open-ended)
- Email (optional)

## Dashboard Metrics

The live dashboard provides:

**Key Stats:**
- Total started/completed
- Completion rate
- Average ratings across all respondents
- Continuation rates by decision

**Breakdowns:**
- Activities chosen
- Decisions (continue/end/unsure)
- Demographic distribution
- First-date difficulties selected
- Perceived price points

**Recent Feedback:**
- Last 100 written responses
- Liked most, what it solves, suggested changes

**Response Table:**
- Last 250 responses with key metrics in table format

## Architecture

```
Tester visits URL
    ↓
Reads intro, starts test
    ↓
Chooses one of 6 activities
    ↓
Grants camera permission
    ↓
Experiences 3-minute simulated date
    - Prerecorded video of date person
    - Your webcam in corner
    - Prompts change at 1:00, 2:00, 3:00
    - Can end early or mute video
    ↓
Makes private decision (continue/end/unsure)
    ↓
Completes 20-question questionnaire
    ↓
Submits to Google Apps Script
    ↓
Data appended to Google Sheet
    ↓
Dashboard updates automatically
```

## Privacy & Research Ethics

This is a **research prototype**. Before production use:

- ✅ Add clear consent notice
- ✅ Explain data collection and use
- ✅ Provide privacy policy
- ✅ Implement data deletion process
- ✅ Handle email addresses securely
- ✅ Anonymize identifiers (current ID format is pseudonymous)
- ✅ Consider GDPR, CCPA, local regulations
- ✅ Get IRB approval if academic research
- ✅ Ensure informed consent is explicit

## Deployment Notes

**Session Tracking:**
- Each test run creates a Session ID when activity is chosen
- Session is marked complete when questionnaire is submitted
- Enables tracking of completion rates and drop-off points

**Locks & Concurrency:**
- Google Apps Script locks prevent race conditions
- Safe for multiple simultaneous submissions

**Spreadsheet Auto-Creation:**
- First deploy automatically creates "Safe Spark — Tester Results" sheet
- If sheet is deleted, deletes the stored ID and creates a new one on next submission
- Manually backup important data

## Troubleshooting

**Camera won't work**
- Check browser permissions for camera/microphone
- Try a different browser
- Ensure HTTPS (required for getUserMedia)

**Video won't play**
- Verify video URL is publicly accessible and CORS-enabled
- Test video URL directly in browser
- Check video format compatibility

**Dashboard shows "Incorrect password"**
- Verify CONFIG.DASHBOARD_PASSWORD in Code.gs matches what you entered
- Redeploy after changing password
- Check for typos (password is case-sensitive)

**No data in sheet**
- Check that spreadsheet was created (should appear in Google Drive)
- Verify you granted Google Apps Script access to create files
- Check browser console for errors (F12)
- Try redeploying the Apps Script

## File Structure

```
Safe_Spark_Tester/
├── Code.gs          # Google Apps Script backend + HTML frontend
├── README.md        # This file
└── LICENSE          # MIT License
```

## Technology

- **Frontend:** Vanilla JavaScript + HTML5 + CSS3
- **Backend:** Google Apps Script
- **Database:** Google Sheets (auto-created)
- **Media:** HTML5 `<video>` for date simulation, WebRTC for user camera

## License

MIT — Use freely for research, commercial, or any other purpose. No warranty.

## Questions?

This is a research prototype. Feel free to fork, modify, and adapt for your needs. Consider contributing improvements back to the repository.

---

**Version:** 1.0  
**Last Updated:** 2026-09-16  
**Status:** Working prototype, ready for research testing

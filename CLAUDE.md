# Roberto’s Aid — Project Context

## App Name

Roberto’s Aid

## Core Goal

Roberto’s Aid is a minimal space-themed productivity app.

The app should be focused and simple. Each page should have one clear purpose.

This is not a full planner dashboard.

The current main modules are:

- Landing / Selector
- Pomodoro
- Timer / Stopwatch
- Tasks
- Accomplishments
- Calendar

Do not add extra major sections unless explicitly requested.

## Current Project Structure

Use the existing local static app structure:

- `index.html`
- `styles.css`
- `script.js`

The project should stay simple. Do not introduce a build system unless explicitly requested.

`index.html` loads React, ReactDOM, Babel, and then loads `script.js` as browser JSX. Keep this structure unless explicitly asked to migrate to a build system.

## Local Asset Folders

Assets are organized in folders.

Background assets:

- `backgrounds/background hall.mp4`
- `backgrounds/genricparticle.png`
- `backgrounds/looping space.mp4`
- `backgrounds/space.png`

Sound assets:

- `sounds/button.wav`
- `sounds/notification.wav`
- `sounds/select.wav`
- `sounds/swipe_01.wav`
- `sounds/toggle_on.wav`

Use these exact folder paths.

Do not reference the old root-level asset paths unless explicitly asked.

## Asset Usage Rules

### Landing / Selector Background

Use:

- `backgrounds/looping space.mp4`

This is the background for the landing / selector page only.

Requirements:

- full-screen background video
- autoplay
- muted
- loop
- playsinline
- object-fit: cover
- dark overlay for readability

Important:

Do not use `backgrounds/background hall.mp4` on the landing / selector page.

Do not heavily overlay `backgrounds/space.png` or `backgrounds/genricparticle.png` on top of the selector video in a messy way.

The selector page video should stand on its own.

### Internal Page Background

Use:

- `backgrounds/background hall.mp4`

This is the default background for all normal/internal app pages.

Internal pages include:

- Pomodoro
- Timer / Stopwatch
- Tasks
- Accomplishments
- Calendar

Requirements:

- full-screen background video
- autoplay
- muted
- loop
- playsinline
- object-fit: cover
- strong dark overlay for readability
- optional subtle blur or dim layer if needed

Important:

Do not use `backgrounds/background hall.mp4` on the landing / selector page.

Use it only after the user enters one of the modules.

Because `backgrounds/background hall.mp4` is brighter and softer than the old particle background, internal UI panels must be more readable:

- stronger dark translucent panels
- higher text contrast
- clearer borders
- frosted / matte glass styling
- subtle shadows
- clean spacing

The internal pages should feel like dark control panels floating over a bright futuristic hallway.

### Internal Page Fallback Background

Use:

- `backgrounds/genricparticle.png`

This should only be used as a fallback if `backgrounds/background hall.mp4` fails to load or if a static internal background is needed.

This background should be:

- darkened
- subtle
- atmospheric
- low distraction
- readable behind UI panels

### Supporting / Fallback Image

Use:

- `backgrounds/space.png`

Use this only as a subtle fallback or support image if needed.

Do not overuse it.

## Background Gallery

If a background gallery/settings system exists, use a hardcoded background list in `script.js`.

Do not try to dynamically read folders with filesystem APIs because this is a browser-only static site.

Use something like:

```js
const BACKGROUNDS = [
  {
    id: 'hall',
    name: 'Background Hall',
    type: 'video',
    src: 'backgrounds/background hall.mp4'
  },
  {
    id: 'particles',
    name: 'Particle Field',
    type: 'image',
    src: 'backgrounds/genricparticle.png'
  },
  {
    id: 'space',
    name: 'Space',
    type: 'image',
    src: 'backgrounds/space.png'
  }
];
```

The landing selector should still use `backgrounds/looping space.mp4`.

Internal pages should default to `backgrounds/background hall.mp4`.

Fallback should be `backgrounds/genricparticle.png`.

## Background Filters

If background filters exist, keep them subtle.

Allowed filters:

- Clean
- Retro
- Scanlines
- Dim
- Mono

Filter behavior:

- Clean = default look
- Retro = slightly warmer contrast, subtle grain/noise, slightly faded blacks
- Scanlines = thin horizontal scanlines overlay, very subtle
- Dim = darkens background more for readability
- Mono = mostly grayscale/desaturated with a tiny hint of crimson/red

Do not make text hard to read.

Do not add loud VHS effects.

## What The App Should Feel Like

The visual style should be:

- minimal
- cinematic
- space-inspired
- monochrome first
- black / charcoal / graphite / soft gray
- white and soft gray text
- very subtle crimson / red accent only
- clean
- calm
- premium
- not flashy
- not cluttered
- not overloaded with cards
- not a busy SaaS dashboard
- no purple gradients
- no excessive neon

The app should feel like a clean personal command center, not a complicated productivity suite.

## Pages To Include

### 1. Landing / Selector Page

This is the entry page of the app.

This page should be a selector page, not a normal dashboard.

Its job is to let the user pick a module.

Available modules:

- Pomodoro
- Timer
- Tasks
- Accomplishments
- Calendar

Do not add a Today page.

Do not add Block Planner.

Do not add Final Destination.

Keep the app simple.

### 2. Pomodoro Page

This page is only for Pomodoro.

It should include:

- large Pomodoro countdown
- Start
- Pause
- Reset
- customizable work duration
- customizable break duration
- optional long break duration
- optional rounds before long break
- optional completed session count
- optional session label
- optional attached task

Pomodoro behavior:

- user chooses how long they want to work
- user chooses break time
- timer cycles through work and break periods
- breaks are the times in between work sessions
- do not lock the user into only 25/5/15 presets
- presets are fine, but custom inputs must exist

Keep it simple and dedicated to Pomodoro only.

### 3. Timer / Stopwatch Page

This page is for tracking how long the user worked overall.

It should include:

- large stopwatch / timer display
- Start
- Pause
- Reset
- optional session label
- optional attached task
- session save/log behavior if already implemented

Important behavior:

- the user manually pauses when they stop working
- the app should not try to guess when the user stopped
- this page is specifically for general work-time tracking

### 4. Tasks Page

This page is a simple task system.

It should be a clean to-do board using a sprint concept.

Task sections / columns:

- Burner
- Active
- Completed

Meaning:

- Burner = urgent / must-do soon
- Active = currently being worked on
- Completed = finished

The task page should support:

- add task
- edit task
- move task between Burner, Active, and Completed
- drag task cards between columns
- mark complete
- delete task

Task creation should use a modal/window, not just a cramped single-line input.

Task editing should use the same modal/window.

Task modal fields:

- Task title
- Column/status: Burner, Active, Completed
- Label/category
- Estimated time
- Priority: Low, Medium, High

Keep it simple.

Do not make it a complicated project manager.

### 5. Accomplishments Page

This page is a clean session journal / accomplishment log.

It should let the user manually record what they completed.

Accomplishment fields:

- Title / what was completed
- Optional description / notes
- Time spent
- Number of breaks taken
- Optional linked task
- Optional label/category
- Optional date/time completed
- Optional proof-of-work attachments

Examples:

- Finished Physics Homework · 1h 30m · 2 breaks
- Reviewed Chapter 4 Notes · 45m · 1 break
- Cleaned email backlog · 20m · 0 breaks

The Accomplishments page should support:

- add accomplishment
- edit accomplishment
- delete accomplishment
- attach proof-of-work files
- link accomplishment to a task if possible
- convert session logs into accomplishments if that feature exists

This should not become a complex analytics dashboard.

Optional summary is okay if small:

- total accomplishments
- total time logged
- total breaks

### 6. Calendar Page

The Calendar page is now part of the app.

The Calendar page should be a clean week-view calendar.

It should not be rebuilt from scratch if already implemented. Audit/fix existing code first.

Calendar requirements:

- week view from Sunday through Saturday
- time axis down the left side
- timed event blocks positioned in the correct day/time slot
- previous week button
- next week button
- Today button
- current week range display
- create event modal
- edit event modal
- delete event
- event colors
- event tags/categories
- optional notes
- localStorage persistence

Event fields:

- id
- title
- date
- start time
- end time
- color
- tag/category
- notes
- recurrence
- createdAt
- updatedAt

Basic recurrence support:

- none
- daily
- weekly
- weekdays

Do not overbuild recurring events into a complex recurrence engine.

Calendar should stay minimal and readable.

Do not add Google-style sharing, permissions, appointment booking pages, or cloud features yet.

Those require backend/cloud auth and should not be faked in a static GitHub Pages app.

## Landing Page — Exact Direction

The landing page is the most important part of the app.

It should be a full-screen module selector.

### Landing Background

Use `backgrounds/looping space.mp4` as the full-screen background.

Requirements:

- video fills the entire viewport
- dark overlay for readability
- content floats over the video
- no heavy still-image overlays
- no clutter

The background should feel cinematic and atmospheric, but the UI should remain readable.

Again: the landing selector must use `backgrounds/looping space.mp4`, not `backgrounds/background hall.mp4`.

## Landing Page Visual Reference

The landing page should look like a minimal cinematic selector screen.

Composition:

- full-screen dark space background
- `backgrounds/looping space.mp4` playing behind everything
- Roberto’s Aid title centered near the top
- small uppercase label above it: `PERSONAL COMMAND CENTER`
- selector placed in the center of the screen
- selector is vertical, not radial
- each selector item has a circular icon/button on the left and a text label on the right
- the currently selected item sits exactly in the center
- selected item has a thin circular outline, soft white glow, and subtle crimson/red accent glow
- selected label is larger, brighter, and easier to read
- items above and below are visible but dimmer, smaller, and lower opacity
- faint ghost copies can appear farther above/below to sell the wheel effect
- bottom center should show a small hint: `SCROLL OR USE ARROW KEYS`
- optional small downward chevron under the hint

The selector should visually feel like a vertical scroll wheel:

- center item = active and sharp
- one item above = faded and slightly smaller
- one item below = faded and slightly smaller
- farther items = very faint / ghosted
- scrolling moves items through the center position smoothly

## Selector Interaction

The selector should feel like a vertical wheel / carousel selector, similar to an iPod-style picker or rotating menu list, not a radial menu.

It should work like this:

- one option is always centered
- the centered option is the selected item
- items above and below are visible
- surrounding items should be smaller and more faded
- farther items should look dimmer and reduced in size
- scrolling should create the illusion of a wheel
- mouse wheel should move selection up/down
- Arrow Up / Arrow Down should move selection
- Enter should open the selected module
- clicking an item should select/open it
- smooth transitions are important

## Selector Visual Style

The centered selected item should be:

- brightest
- clearest
- slightly larger
- subtly accented with crimson/red
- softly glowing
- visually locked into the center

Non-selected items should be:

- smaller
- dimmer
- more faded
- still readable
- visually pushed away from the center

Keep the landing page minimal.

It should include:

- Roberto’s Aid branding
- small sublabel: `PERSONAL COMMAND CENTER`
- the vertical selector as the main focus
- small hint: `SCROLL OR USE ARROW KEYS`

No clutter.

## Internal Page Design Rules

All internal pages should use `backgrounds/background hall.mp4` by default.

Internal pages include:

- Pomodoro
- Timer / Stopwatch
- Tasks
- Accomplishments
- Calendar

All internal pages should be simple and purpose-built.

General rules:

- one main content area where possible
- minimal supporting UI
- generous spacing
- clean typography
- no clutter
- no giant dashboard layout
- no unnecessary stats
- no complicated analytics

Because the internal background is brighter, internal UI should prioritize readability:

- stronger dark glass panels
- brighter text
- clearer input borders
- clearer panel outlines
- stronger button contrast
- more spacing between controls

## Pomodoro Visual / Behavior Notes

The Pomodoro timer should not look choppy.

Timer progress should feel smooth:

- circular progress should animate smoothly
- avoid jumpy/teleporting progress movement
- displayed numbers can update each second
- progress ring should ease smoothly using CSS transitions or requestAnimationFrame

The settings panel should not overlap or cram text.

Use clean stacked sections:

- Work duration
- Break duration
- Long break duration
- Rounds before long break
- Session label
- Attached task
- Today/session summary
- Session log if included

Each section should have enough spacing.

## Tasks Visual / Behavior Notes

The Tasks page should use the sprint-board concept:

- Burner
- Active
- Completed

Cards should be readable and draggable.

Drag behavior:

- cards can be dragged between columns
- dragged card should lift visually
- add slight wobble/tilt while dragging
- target column should highlight subtly
- dropping should animate smoothly if possible

Completed tasks can be dimmer or struck through, but they should still remain readable.

Task labels/categories should matter and be visible on cards.

## Accomplishment Attachment Notes

Accomplishments may include proof-of-work attachments.

Supported attachment types:

- `.pdf`
- `.png`
- `.jpg`
- `.jpeg`
- `.webp`

Because this is a static browser app with no backend:

- do not upload files to a server
- do not pretend cloud storage exists
- use browser file input only
- use object URLs or FileReader for previews
- store metadata in localStorage if safe
- avoid storing huge files in localStorage
- for PDFs, show a badge/card rather than building a full PDF viewer unless already simple

## Navigation After Landing

After a user opens a module, navigation should stay minimal.

Acceptable options:

- small back button to return to the landing selector
- small compact nav
- minimal sidebar only if necessary

Do not build a big dashboard sidebar.

The user should always be able to return to the landing selector.

## Local Profile / Setup

If a local profile system exists, keep it local only.

This is not real cloud authentication.

Because this app is hosted on GitHub Pages and has no backend:

- do not add password fields
- do not store passwords
- do not call it secure authentication
- do not fake cloud login
- use wording like “local profile” or “saved to this browser”

Expected behavior:

- if no local profile exists, show a first-run setup modal/screen
- ask for display name
- ask for optional initials/avatar
- save profile to localStorage
- after saving, allow app usage
- on future visits, do not show setup automatically
- profile/settings modal should allow editing profile

## Data Persistence

Use localStorage for app persistence unless a backend is explicitly added later.

Persist:

- local profile
- tasks
- accomplishments
- sessions
- selected background
- selected filter
- sound mute setting
- calendar events

Use safe helpers if possible:

- `loadState()`
- `saveState()`
- safe JSON parsing
- fallback defaults

Do not add a database.

Do not add backend auth yet.

## Button Style

Buttons should be:

- minimal
- dark graphite / charcoal
- thin border
- soft hover state
- slight crimson accent for active / primary buttons
- clean and precise
- not chunky
- not flashy

Avoid:

- bright gradients
- big colorful buttons
- purple glow
- heavy neon
- overly rounded cartoon-like buttons

## Typography

Typography should feel calm and clean.

Use:

- clear page titles
- smaller mono labels where useful
- simple readable body text
- large timer numbers for Pomodoro and Stopwatch
- readable calendar labels/event text
- generous letter spacing only where it improves the cinematic look

The landing page title should feel elegant and spacious.

## UI Sounds

Use these local sound files if present:

- `sounds/select.wav`
- `sounds/swipe_01.wav`
- `sounds/button.wav`
- `sounds/toggle_on.wav`
- `sounds/notification.wav`

Sound mapping:

- `sounds/select.wav` = opening/selecting a module from the landing selector
- `sounds/swipe_01.wav` = scrolling or arrow-keying through the landing wheel selector
- `sounds/button.wav` = normal button clicks like Start, Pause, Reset, Add Task, Delete, Edit, Save, Cancel
- `sounds/toggle_on.wav` = mode changes/settings changes, moving task status, changing filters, changing backgrounds, or dropping a task into a new column
- `sounds/notification.wav` = Pomodoro work session ends, break ends, timer completes, accomplishment saved, or event created if not annoying

Keep sounds subtle:

- volume around 0.12 to 0.20
- no aggressive repeated sounds
- avoid loops
- no typing sounds
- include global mute/unmute if already implemented
- respect muted setting everywhere

Do not use:

- `progress_loop.wav`
- `ringtone_loop.wav`

## What To Avoid

Do not add:

- Today page
- Block Planner
- Final Destination
- giant dashboard overviews
- complicated analytics
- too many small stat cards
- loud cyberpunk gradients
- bright purple glows
- cluttered UI
- radial/orbital menu where all items sit around a circle
- fake login/password system
- cloud sync without a backend
- Google Calendar sharing/permissions/booking pages yet

The landing selector should be vertical wheel / carousel style, not a circular radial menu.

## Implementation Notes

Keep the project simple.

Use:

- `index.html`
- `styles.css`
- `script.js`

Do not introduce unnecessary complexity.

Prioritize:

1. landing selector uses `backgrounds/looping space.mp4`
2. internal pages use `backgrounds/background hall.mp4`
3. `backgrounds/genricparticle.png` is only fallback for internal pages
4. each page remains focused on one purpose
5. Pomodoro has customizable work/break cycles
6. timer/stopwatch tracks overall work time
7. tasks use Burner / Active / Completed with modal create/edit
8. Accomplishments logs completed work and optional proof attachments
9. Calendar is a clean weekly calendar, not a full Google Calendar clone
10. UI remains readable over the internal video background

## Calendar Audit / Fix Guidance

If asked to work on the Calendar, do not rebuild it from scratch if calendar code already exists.

First audit what exists.

Checklist:

- Is Calendar in the landing selector?
- Is Calendar in the sidebar/nav?
- Does the Calendar page open correctly?
- Does it show a week view from Sunday to Saturday?
- Does it have previous week, next week, and Today controls?
- Does clicking a time slot open a New Event modal?
- Does clicking an event open an Edit Event modal?
- Can events be created?
- Can events be edited?
- Can events be deleted?
- Do events save to localStorage?
- Do events reload after page refresh?
- Are timed events displayed in the correct day/time position?
- Are event colors/tags visible?
- Does basic recurrence exist: none, daily, weekly, weekdays?
- Are there any console errors?

Only implement what is missing.

Do not duplicate Calendar components.

Do not create a second Calendar page.

## Final Feel

Roberto’s Aid should feel like a clean, minimal, cinematic productivity tool with a space theme.

The landing page should feel like a smooth vertical selector screen over `backgrounds/looping space.mp4`.

The internal pages should feel like focused dark glass control panels over `backgrounds/background hall.mp4`.

The internal pages should feel purpose-built:

- Pomodoro page = only Pomodoro
- Timer page = only work-time tracking
- Tasks page = sprint-style tasks
- Accomplishments page = completed work journal
- Calendar page = simple week calendar

Everything should feel calm, intentional, readable, and easy to use.

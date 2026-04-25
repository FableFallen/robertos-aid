# Roberto’s Aid — Project Context

## App Name

Roberto’s Aid

## Core Goal

Roberto’s Aid is a minimal space-themed productivity app.

The app should be focused and simple. Each page should have one clear purpose.

This is not a full planner dashboard.

The main modules are:

- Landing / Selector
- Pomodoro
- Timer / Stopwatch
- Tasks

Do not add extra major sections unless explicitly requested.

## Current Project Structure

Use the existing local static app structure:

- `index.html`
- `styles.css`
- `script.js`

The project should stay simple. Do not introduce a build system unless explicitly requested.

## Local Asset Files

Use these exact local filenames:

- `looping space.mp4`
- `background hall.mp4`
- `space.png`
- `genricparticle.png`

Do not rename these files unless explicitly asked.

## Asset Usage Rules

### Landing / Selector Background

Use:

- `looping space.mp4`

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

Do not use `background hall.mp4` on the landing / selector page.

Do not heavily overlay `space.png` or `genricparticle.png` on top of the selector video in a messy way.

The selector page video should stand on its own.

### Internal Page Background

Use:

- `background hall.mp4`

This is the background for all normal/internal app pages.

Internal pages include:

- Pomodoro
- Timer / Stopwatch
- Tasks

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

Do not use `background hall.mp4` on the landing / selector page.

Use it only after the user enters one of the modules.

Because `background hall.mp4` is brighter and softer than the old particle background, internal UI panels must be more readable:

- stronger dark translucent panels
- higher text contrast
- clearer borders
- frosted / matte glass styling
- subtle shadows
- clean spacing

The internal pages should feel like dark control panels floating over a bright futuristic hallway.

### Internal Page Fallback Background

Use:

- `genricparticle.png`

This should only be used as a fallback if `background hall.mp4` fails to load or if a static internal background is needed.

This background should be:

- darkened
- subtle
- atmospheric
- low distraction
- readable behind UI panels

### Supporting / Fallback Image

Use:

- `space.png`

Use this only as a subtle fallback or support image if needed.

Do not overuse it.

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

Do not add a Today page.

Do not add Calendar.

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

## Landing Page — Exact Direction

The landing page is the most important part of the app.

It should be a full-screen module selector.

### Landing Background

Use `looping space.mp4` as the full-screen background.

Requirements:

- video fills the entire viewport
- dark overlay for readability
- content floats over the video
- no heavy still-image overlays
- no clutter

The background should feel cinematic and atmospheric, but the UI should remain readable.

Again: the landing selector must use `looping space.mp4`, not `background hall.mp4`.

## Landing Page Visual Reference

The landing page should look like a minimal cinematic selector screen.

Composition:

- full-screen dark space background
- `looping space.mp4` playing behind everything
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

The overall landing page should feel like the generated concept image:
a dark cinematic space background, large clean Roberto’s Aid branding, and a minimal vertical selector where the center option glows subtly red.

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

All internal pages should use `background hall.mp4`.

Internal pages include:

- Pomodoro
- Timer / Stopwatch
- Tasks

All internal pages should be extremely simple.

General rules:

- one main content area
- minimal supporting UI
- generous spacing
- clean typography
- very few panels
- no clutter
- no too many cards
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

Each page should feel purpose-built.

Pomodoro page = only Pomodoro.

Timer page = only work-time tracking.

Tasks page = only sprint-style tasks.

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

## Navigation After Landing

After a user opens a module, navigation should stay minimal.

Acceptable options:

- small back button to return to the landing selector
- small compact nav
- minimal sidebar only if necessary

Do not build a big dashboard sidebar.

The user should always be able to return to the landing selector.

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
- generous letter spacing only where it improves the cinematic look

The landing page title should feel elegant and spacious.

## UI Sounds

Use these local sound files if present:

- `select.wav`
- `swipe_01.wav`
- `button.wav`
- `toggle_on.wav`
- `notification.wav`

Sound mapping:

- `select.wav` = opening/selecting a module from the landing selector
- `swipe_01.wav` = scrolling or arrow-keying through the landing wheel selector
- `button.wav` = normal button clicks like Start, Pause, Reset, Add Task, Delete, Edit, Save, Cancel
- `toggle_on.wav` = mode changes/settings changes, moving task status, or dropping a task into a new column
- `notification.wav` = Pomodoro work session ends, break ends, or timer completes

Keep sounds subtle:

- volume around 0.25 to 0.35
- no aggressive repeated sounds
- avoid loops
- no typing sounds

Do not use:

- `progress_loop.wav`
- `ringtone_loop.wav`

## What To Avoid

Do not add:

- Today page
- Calendar
- Block Planner
- Final Destination
- giant dashboard overviews
- complicated analytics
- too many small stat cards
- loud cyberpunk gradients
- bright purple glows
- cluttered UI
- radial/orbital menu where all items sit around a circle

The landing selector should be vertical wheel / carousel style, not a circular radial menu.

## Implementation Notes

Keep the project simple.

Use:

- `index.html`
- `styles.css`
- `script.js`

Do not introduce unnecessary complexity.

Prioritize:

1. landing selector uses `looping space.mp4`
2. internal pages use `background hall.mp4`
3. `genricparticle.png` is only fallback for internal pages
4. each page remains focused on one purpose
5. Pomodoro has customizable work/break cycles
6. timer/stopwatch tracks overall work time
7. tasks use Burner / Active / Completed with modal create/edit
8. UI remains readable over the internal video background

## Final Feel

Roberto’s Aid should feel like a clean, minimal, cinematic productivity tool with a space theme.

The landing page should feel like a smooth vertical selector screen over `looping space.mp4`.

The internal pages should feel like focused dark glass control panels over `background hall.mp4`.

The internal pages should feel purpose-built:

- Pomodoro page = only Pomodoro
- Timer page = only work-time tracking
- Tasks page = only sprint-style tasks

Everything should feel calm, intentional, readable, and easy to use.
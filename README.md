# Diego Suarez — Music

A dark, minimal music portfolio at `#/`. The home is scene zero of the carousel: a single scroll timeline shrinks it and moves it upward as the first cover enters. The “Let's talk about your next project” invitation is the final scene: it grows and centers on the same timeline, lets visitors return to the last cover, and opens the contact form when clicked. The `#/proyectos` link leads to the first cover. Built with React, TypeScript, and Motion (`motion/react`), using Vite.

```sh
npm install
npm run dev
```

## Integration

`src/components/VerticalCarousel.tsx` exports the component. Published releases and their descriptions are loaded from Sanity through `src/hooks/useReleases.ts`. The `Release` type and demo fixtures live in `src/data/releases.ts`; sample SVG covers in `public/covers/` are kept for browser tests. The optional `listenUrl` field enables a direct listening link. Each release also has `contribution.roles` and `contribution.description` for its slide-out record; the included credits are explicitly marked examples. Tap the centered cover or “Mi participación” to slide a circular record upward from its sleeve; tap again to put it away. The record uses the same artwork with a blurred, darkened background behind the credits. Enter/Space also work on the focused cover. The record shows Spotify and Apple Music links when `spotifyUrl` or `appleMusicUrl` is configured in Sanity; missing links remain disabled. Listening opens a separate tab and does not close the record or move the carousel. Changing scenes puts the record away; reduced motion switches layouts immediately.

```tsx
<VerticalCarousel
  images={releases}
  config={{ mainWidth: 360, thumbnailWidth: 72 }}
/>
```

Images use `object-fit: cover`: they retain their proportions and are cropped to the chosen format. Sample assets are served locally. Typography uses Google Fonts with system fallbacks.

## Tuning the motion

The default feel is a quick, firm snap: a stiffer spring with lower mass settles each scene promptly, while slightly higher drag sensitivity and lower input thresholds make short gestures responsive. A 150 ms idle interval identifies a fresh wheel gesture; sustained input can continue through adjacent scenes without waiting for that interval.

All default values are in `src/components/carouselMath.ts`. You can also override them through `config`:

| Parameter | Effect |
| --- | --- |
| `mainWidth`, `aspectRatio` | Maximum width and aspect ratio of the centered image. |
| `thumbnailWidth`, `gap` | Thumbnail size and spacing. |
| `falloff` | Higher values make images grow only when closer to the center. |
| `compression` | Higher values create space around the centered image more quickly. |
| `dragSensitivity` | Sensitivity of the transition preview during mouse or touch dragging. |
| `SCROLL_STORY_DEFAULTS.snapDelayMs` | Delay before snapping to the nearest scene after moving the scrollbar. |
| `SCROLL_STORY_DEFAULTS.swipeThreshold` | Minimum gesture distance needed to complete a move to the next or previous scene. |
| `SCROLL_STORY_DEFAULTS.touchClickGuardMs` | Interval for suppressing delayed compatibility clicks after a swipe; a new intentional touch clears it. |
| `SCROLL_STORY_DEFAULTS.wheelThreshold`, `wheelGestureIdleMs` | Initial wheel threshold and idle interval identifying a fresh gesture. Continued scrolling does not have to wait for this interval. |
| `SCROLL_STORY_DEFAULTS.wheelRepeatDistance`, `wheelRepeatIntervalMs` | Additional scroll distance and minimum time between adjacent steps during sustained wheel or trackpad input. |
| `SCROLL_STORY_DEFAULTS.stepRatio`, `minStep`, `maxStep` | Scroll distance per scene, proportional to the available height and constrained by pixel limits. |
| `stiffness`, `damping`, `mass` | Spring response for snapping and navigation. More damping reduces bounce. |

Document scrolling is the source of truth. `useScroll` provides a Motion Value, and `useTransform` converts pixels into a shared fractional position: `0` is the home, `1` is the first cover, and `N + 1` is the final contact invitation after the `N` covers. A stage with `position: sticky` stays on screen throughout the sequence. The container height supplies the actual scroll distance for each scene, so there are no separate scroll positions to synchronize.

The distance `scene index - position` determines vertical displacement, scale, and stacking order. The home typography follows the same timeline and becomes a thumbnail above the first cover. Supporting text fades progressively as covers enter from below. Motion Values update the DOM directly; React only updates the scene index when the scene changes and the dragging state when a mouse or touch drag starts or ends.

Wheel and trackpad input advance through adjacent scenes. Sustained scrolling can request the next scene before the previous snap finishes, retaining forward velocity instead of waiting for an idle pause. A repeat distance and cadence filter small fading momentum tails. Reversing direction changes the destination immediately without carrying velocity in the old direction. Mouse dragging or touch swiping previews the continuous transition; releasing completes the move to the next or previous scene, even if the gesture did not reach the halfway point. Accidental movements below the threshold return to the starting scene. The exact destination is applied when the animation ends, preventing intermediate resting positions.

Every control moves the same document position. The scrollbar also snaps to a valid scene when it stops, including with reduced motion enabled. Zoom and horizontal gestures remain available. Outward scrolling at the sequence boundaries is left to the browser. Rotating the phone preserves the timeline position while dimensions are recalculated.

The component supports the up/down arrow keys, Home/End, thumbnail clicks, and visible navigation controls. With `prefers-reduced-motion`, scenes are centered without interpolating their transforms, and navigation happens immediately. Listeners, timers, observers, and animations are cleaned up on unmount.

## Verification

```sh
npm run build
npm test
# With the development server running:
npx playwright install chromium
CAROUSEL_URL=http://127.0.0.1:5173 npm run test:browser
CAROUSEL_URL=http://127.0.0.1:5173 npm run test:mobile
```

The first scene contains the artist's name, a short label, and a link to projects. Scrolling turns the home itself into part of the carousel. Opening Contact unmounts the sequence and cleans up its listeners. Navigation supports direct links and browser Back/Forward. The menu follows the active scene.

Tests cover the transition from the home, intermediate positions before the selected index changes, final snapping, direction reversal, wheel/trackpad input, mouse dragging, touch gestures, thumbnails, keyboard input, boundaries, reduced motion, and the final contact invitation. Mobile tests also cover the attachment form. Emulation does not replace testing on a physical phone.

Mobile carousel regression tests check incidental touches during snapping, repeated arrow taps, cancelled swipes, delayed compatibility clicks, and viewport changes during navigation. Chromium performance counters check that a swipe does not cause layout on every animation frame. Covers and their touch targets scale through transforms; dimensions only change on resize, and measured stage heights are cached outside animation frames. Navigation arrows use inline SVG paths to avoid platform-specific emoji rendering.

After installing WebKit with `npx playwright install webkit`, set `MOBILE_BROWSER=webkit` to run the touch and resize regressions in that engine. Native swipe cancellation, delayed-click injection, and performance counters use Chromium's DevTools Protocol and are skipped in the WebKit run.

Reference: a local video supplied by the user. Frames were extracted to compare proportions, vertical alignment, and spacing.

## Contact

The contact page presents only two direct channels: email and WhatsApp. Configure `email` and the full `whatsappUrl` in `src/data/contact.ts`. Email uses `mailto:` and WhatsApp opens a new tab. Missing details are displayed as disabled placeholders, without invented destinations. Both rows have large touch targets and fit compact portrait and landscape screens.

The previous form, attachment validation and local API implementation are retained in the repository but are no longer part of the public contact page. No files or messages are submitted by the current contact UI. The existing `test:uploads` command now checks the contact page, responsive navigation and home interactions; server attachment tests remain available separately for the retained API.

## Mobile priority

Styles start with the phone layout and add the desktop layout from 960 px. Home, Projects, and Contact work from 320 px in portrait and landscape. Navigation, arrows, and direct contact controls have touch targets of at least 44 px. Thumbnails keep their progressive visual size while retaining an independent touch target of at least 44 px.

The carousel uses the available width and height to size covers; its controls also fit compact phones. In landscape, the release title and arrows move to the side. Phone safe areas and browser bars are accounted for through `env(safe-area-inset-*)` and `svh`, without disabling user zoom.

The direct contact rows wrap long email addresses without horizontal overflow and fit portrait and landscape screens. Browser tests cover five mobile viewport sizes and accessible navigation. Physical-device testing remains separate from this emulation.

## Home social links

`src/data/socials.ts` centralizes the Instagram, Spotify, and Apple Music profiles. Add the real URLs to enable the links; until then, their icons and labels are displayed in a disabled state. Links open in another tab, have touch targets of at least 44 px, and leave the keyboard tab order when navigating away from the home scene.

## Background biography

The text in `src/data/about.ts` is placeholder copy that can be replaced easily. `HomeAboutWater.tsx` distributes it behind the entire home scene. A soft mask follows the cursor along the sides and reveals fragments with a water-like distortion; the reveal fades when the pointer leaves. On phones, touching or moving a finger reveals the background without capturing or preventing vertical scrolling. The description is also available to screen readers. There is no visible button; Escape and leaving the home scene hide the reveal.

`ABOUT_WATER` centralizes the reveal radius, spacing, distortion, touch linger time, and tracking spring. React does not update on every frame; the effect uses Motion Values and a local SVG filter. Reduced motion removes the distortion and spring-based tracking. The original popover idea is preserved in `HomeAbout.tsx`; its import and render are commented out in `VerticalCarousel.tsx`.

## Content management with Sanity

The independent admin panel lives in `studio/` and points to project `rr2covtm`, dataset `production`. Install its dependencies with `npm --prefix studio ci`, then start it with `npm run dev:studio`. It has its own package lock and does not add Studio dependencies to the public website bundle.

The **Proyectos musicales** schema includes cover uploads, accessible image descriptions, release metadata, contribution credits, carousel order and a visibility switch. The website reads published, visible releases from Sanity on page load, sorted by carousel order and title. Drafts and hidden projects do not appear. Refresh the portfolio after publishing an edit; no rebuild is needed for content changes. Covers use optimized 720px square images with Sanity crop/hotspot settings. Local releases are retained as deterministic browser test fixtures, not as a production fallback. Loading, empty and retryable error states are provided on the projects route. No Sanity token is exposed in the browser. See [the Studio guide](studio/README.md) for editing, checks, authentication and deployment.

The Sanity browser client is loaded asynchronously to keep it outside the initial UI bundle. Its public configuration is `rr2covtm / production`, uses the published perspective, and does not require a token. Sanity CORS allows `https://diego-portfolio-red.vercel.app`, `http://localhost:5190` and `http://127.0.0.1:5190` without credentials; the Studio login uses its separate credential-enabled `http://localhost:3333` origin. Add any new portfolio domains explicitly in Sanity Manage. A private dataset would require a server-side read endpoint instead of putting a token in frontend code.

Run `npm run test:catalog` against the local Vite URL to check delayed loading, a single release, empty results and retry behavior. Browser gesture suites mock the catalog using local fixtures so editor changes cannot break their expected scene counts.

## Listen — one A/B comparison

`#/escucha` is a standalone listening page, separate from the scroll-driven projects. One visible player switches between the original (A) and processed (B) versions of the same fragment. Both versions preserve the playback position, only one plays at a time, and playback pauses when leaving the page. Nothing autoplays. A native, labelled range input supports touch and keyboard seeking; different file lengths use the shorter duration as the shared timeline. Media failures and content failures provide separate retry controls.

In Sanity Studio, open **Escucha · Antes y después**. This is a singleton with document ID `audio-comparison`: set the fragment title, upload **A · Antes** and **B · Después**, enable visibility and publish. Use aligned excerpts with a similar perceived loudness. MP3 is a practical delivery format; WAV, M4A and AAC uploads are also offered, with actual playback depending on the browser's codec support. The website only receives published content and waits for both files. No demo audio is shipped to visitors.

Run `npm run test:listen` against the local Vite URL for real WAV playback, rapid A/B switching, seek controls, responsive layouts, empty/error states and unmount cleanup. These tests generate their own short audio fixtures and do not upload them to Sanity.

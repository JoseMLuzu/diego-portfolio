# Diego Suarez — Music

A dark, minimal music portfolio at `#/`. The home is scene zero of the carousel: a single scroll timeline shrinks it and moves it upward as the first cover enters. The “Let's talk about your next project” invitation is the final scene: it grows and centers on the same timeline, lets visitors return to the last cover, and opens the contact form when clicked. The `#/proyectos` link leads to the first cover. Built with React, TypeScript, and Motion (`motion/react`), using Vite.

```sh
npm install
npm run dev
```

## Integration

`src/components/VerticalCarousel.tsx` exports the component. Releases and their descriptions live in `src/data/releases.ts`; sample SVG covers are in `public/covers/`. Replace these examples with real album artwork. The optional `listenUrl` field enables a direct listening link.

```tsx
<VerticalCarousel
  images={releases}
  config={{ mainWidth: 360, thumbnailWidth: 72 }}
/>
```

Images use `object-fit: cover`: they retain their proportions and are cropped to the chosen format. Sample assets are served locally. Typography uses Google Fonts with system fallbacks.

## Tuning the motion

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
| `SCROLL_STORY_DEFAULTS.wheelThreshold`, `wheelGestureIdleMs` | Wheel threshold and idle interval separating trackpad gestures; momentum from the same burst does not trigger extra steps. |
| `SCROLL_STORY_DEFAULTS.stepRatio`, `minStep`, `maxStep` | Scroll distance per scene, proportional to the available height and constrained by pixel limits. |
| `stiffness`, `damping`, `mass` | Spring response for snapping and navigation. More damping reduces bounce. |

Document scrolling is the source of truth. `useScroll` provides a Motion Value, and `useTransform` converts pixels into a shared fractional position: `0` is the home, `1` is the first cover, and `N + 1` is the final contact invitation after the `N` covers. A stage with `position: sticky` stays on screen throughout the sequence. The container height supplies the actual scroll distance for each scene, so there are no separate scroll positions to synchronize.

The distance `scene index - position` determines vertical displacement, scale, and stacking order. The home typography follows the same timeline and becomes a thumbnail above the first cover. Supporting text fades progressively as covers enter from below. Motion Values update the DOM directly; React only updates the scene index when the scene changes and the dragging state when a mouse or touch drag starts or ends.

Each wheel or trackpad gesture advances exactly one scene in its direction. Momentum events from the same burst are grouped, and reversing direction can smoothly change the destination. Mouse dragging or touch swiping previews the continuous transition; releasing completes the move to the next or previous scene, even if the gesture did not reach the halfway point. Accidental movements below the threshold return to the starting scene. The exact destination is applied when the animation ends, preventing intermediate resting positions.

Every control moves the same document position. The scrollbar also snaps to a valid scene when it stops, including with reduced motion enabled. Zoom and horizontal gestures remain available. Outward scrolling at the sequence boundaries is left to the browser. Rotating the phone preserves the timeline position while dimensions are recalculated.

The component supports the up/down arrow keys, Home/End, thumbnail clicks, and visible navigation controls. With `prefers-reduced-motion`, scenes are centered without interpolating their transforms, and navigation happens immediately. Listeners, timers, observers, and animations are cleaned up on unmount.

## Verification

```sh
npm run build
npm test
# With the development server running:
npx playwright install chromium
CAROUSEL_URL=http://127.0.0.1:5173 npm run test:browser
```

The first scene contains the artist's name, a short label, and a link to projects. Scrolling turns the home itself into part of the carousel. Opening Contact unmounts the sequence and cleans up its listeners. Navigation supports direct links and browser Back/Forward. The menu follows the active scene.

Tests cover the transition from the home, intermediate positions before the selected index changes, final snapping, direction reversal, wheel/trackpad input, mouse dragging, touch gestures, thumbnails, keyboard input, boundaries, reduced motion, and the final contact invitation. Mobile tests also cover the attachment form. Emulation does not replace testing on a physical phone.

Reference: a local video supplied by the user. Frames were extracted to compare proportions, vertical alignment, and spacing.

## Contact and attachments

`#/contacto` accepts a name, email address, message, and up to 5 attachments. Supported formats include audio (MP3, WAV, FLAC, M4A, AAC, OGG, Opus, AIFF), PDF, JPG, PNG, WebP, and ZIP. Limits are 25 MB per file and 50 MB in total. Visitors can select multiple files, drag and drop them, and remove them before submission. Failed submissions preserve the message and attachments for retry.

The form sends `multipart/form-data` to `POST /api/contact`. The Node service validates fields and limits again, saves the file bytes and a `message.json` record in `data/contact/<id>/`, and only then confirms receipt. This directory is ignored by Git and is not served as static content. The service does not send emails or automatic notifications; submissions are stored locally on the server.

```sh
# Node >= 22.18.0. Start the frontend and API together:
npm run dev
# Build and serve the application alongside the API:
npm run build
npm start
```

`npm start` defaults to `http://127.0.0.1:8787`. Set `CONTACT_PORT` to change the port and `CONTACT_STORAGE_DIR` to choose a persistent storage directory. When deploying, run the Node service and keep this directory on a persistent volume; serving only `dist/` cannot receive uploads. If Vite is already running, start the API separately with `npm run dev:api`.

The optional direct email address and contact-page social links are configured in `src/data/contact.ts`. The form does not need a recipient email address to store messages.

```sh
npm test
npm run test:contact
# Build before testing the actual browser submission flow:
npm run build
npm run test:uploads
```

Upload tests use temporary directories and remove their data afterward. They check saved bytes, rejection of invalid file types and sizes, submissions without attachments, file selection and drag-and-drop, removal, retry after failure, and the touch file picker at 320 px.

## Mobile priority

Styles start with the phone layout and add the desktop layout from 960 px. Home, Projects, and Contact work from 320 px in portrait and landscape. Navigation, arrows, and attachment controls have touch targets of at least 44 px. Thumbnails keep their progressive visual size while retaining an independent touch target of at least 44 px.

The carousel uses the available width and height to size covers; its controls also fit compact phones. In landscape, the release title and arrows move to the side. Phone safe areas and browser bars are accounted for through `env(safe-area-inset-*)` and `svh`, without disabling user zoom.

The form stacks fields on mobile, uses 16 px inputs and an email keyboard, and provides a touch-friendly file picker. The submit button spans the form width. The `npm run test:uploads` tests include five mobile viewport sizes, landscape orientation, touch targets, actual attachment submission, and a reduced viewport approximating the space above the keyboard. Physical-device testing remains separate from this emulation.

## Home social links

`src/data/socials.ts` centralizes the Instagram, Spotify, and Apple Music profiles. Add the real URLs to enable the links; until then, their icons and labels are displayed in a disabled state. Links open in another tab, have touch targets of at least 44 px, and leave the keyboard tab order when navigating away from the home scene.

## Background biography

The text in `src/data/about.ts` is placeholder copy that can be replaced easily. `HomeAboutWater.tsx` distributes it behind the entire home scene. A soft mask follows the cursor along the sides and reveals fragments with a water-like distortion; the reveal fades when the pointer leaves. On phones, touching or moving a finger reveals the background without capturing or preventing vertical scrolling. The description is also available to screen readers. There is no visible button; Escape and leaving the home scene hide the reveal.

`ABOUT_WATER` centralizes the reveal radius, spacing, distortion, touch linger time, and tracking spring. React does not update on every frame; the effect uses Motion Values and a local SVG filter. Reduced motion removes the distortion and spring-based tracking. The original popover idea is preserved in `HomeAbout.tsx`; its import and render are commented out in `VerticalCarousel.tsx`.

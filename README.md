# MenuCubo · 3D Cube Navigation & Shortcut Dashboard

**MenuCubo** is an interactive, hardware-accelerated 3D navigation menu and web shortcut dashboard built with pure HTML5, CSS 3D transforms, and Vanilla JavaScript — with zero external libraries or heavy dependencies.

Each of the cube's 6 faces functions as an independent, fully customizable application menu. The project includes dual viewing modes, embedded web app loading, animated background effects, and a comprehensive live configuration manager.

---

## Table of Contents

- [Key Features](#key-features)
- [Views & Layout Modes](#views--layout-modes)
- [Shortcut Open Actions (Including Embedded Mode)](#shortcut-open-actions-including-embedded-mode)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Configuration & Customization](#configuration--customization)
- [Data Storage & Portability](#data-storage--portability)
- [Browser Compatibility](#browser-compatibility)

---

## Key Features

- **True 3D Cube Navigation**:
  - Smooth 3D rotational physics using CSS `transform-style: preserve-3d` and perspective projection.
  - Interactive mouse and touch drag controls with inertia and configurable snap-to-nearest-face physics.
  - Directional control buttons (◀ ▲ ▼ ▶), face navigation pills, and keyboard shortcuts.
- **Intelligent Auto-Rotation**:
  - **Continuous Mode**: Smooth, continuous rotation with customizable tilt angle and harmonic vertical oscillation (wobble).
  - **Step Mode**: Cycles through faces sequentially, pausing for a user-defined duration on each face.
  - Auto-pause when hovering over the cube, and automatic rotation resume after inactivity.
- **Embedded Web View (In-App Browsing)**:
  - Open web shortcuts inside an integrated `<iframe>` within the main dashboard.
  - Automatic migration from the central 3D cube view to the sidebar layout when an embedded shortcut is clicked.
  - Embedded toolbar with reload (`↻`), external tab fallback (`↗`), and close (`✕`) buttons.
- **Dynamic Backgrounds & Particle FX**:
  - Choose between solid colors, gradients, multi-color animated shifting gradients, or custom wallpaper images with adjustable blur filters.
  - Built-in canvas particle engine featuring **Starfield** and **Floating Bubbles** animations.
- **Live Settings Dashboard (`config.html`)**:
  - Real-time side-by-side preview powered by bidirectional `postMessage` synchronization.
  - Full control over colors, gradients, borders, corner radiuses, columns, and shortcut metadata.
  - Drag-and-drop reordering, face swapping, and one-click style replication across faces.

---

## Views & Layout Modes

MenuCubo offers two synchronized presentation modes:

| View Mode | File | Description |
| :--- | :--- | :--- |
| **Central 3D Cube** | [`index.html`](index.html) | Immersive full-screen view centered on the large rotating 3D cube, ideal for home screens, kiosks, or minimal dashboards. |
| **Sidebar Menu** | [`lateral.html`](lateral.html) | Productive workspace featuring a compact 3D cube widget in the sidebar alongside an expansive shortcut dashboard with real-time search, face filtering, and embedded app viewing. |

> **Tip**: You can switch between views at any time by clicking the **🧊 Central** / **◧ Menu lateral** toggle in the top-right corner, or by simply pressing the **`V`** key.

---

## Shortcut Open Actions (Including Embedded Mode)

Every shortcut can be configured with its own click behavior:

1. **New Tab (`tab` / `_blank`)**: Launches the destination URL in a new browser tab.
2. **Same Window (`self` / `_self`)**: Navigates the current browser window to the target URL.
3. **Embedded on Screen (`embed`)**:
   - If you are in **Central Mode**, MenuCubo instantly transitions to the **Sidebar Mode**.
   - The 3D cube moves to the sidebar and rotates to highlight the shortcut's category face.
   - The destination URL loads in a responsive, sandboxed `<iframe>` in the main workspace.
   - Includes header controls to reload, open externally (useful if third-party sites set `X-Frame-Options: SAMEORIGIN`), or close back to the shortcut grid.

---

## Project Structure

```text
menucubo/
├── index.html         # Main dashboard (Central 3D Cube view + layout toggle)
├── lateral.html       # Sidebar-first dashboard entry point
├── config.html        # Comprehensive settings manager with live preview
├── css/
│   ├── menu.css       # 3D transforms, glassmorphism, responsive grid & iframe embed styles
│   └── config.css     # Settings panel layout, form controls, and responsive preview pane
├── js/
│   ├── store.js       # Data model, default presets, localStorage sync & normalization
│   ├── menu.js        # 3D math & Euler rotation engine, face detection, FX & event routing
│   └── config.js      # Configuration UI controller, live postMessage sync & drag-and-drop
└── README.md          # Project documentation
```

---

## Quick Start

### 1. Direct File Access
Simply open [`index.html`](index.html) or [`lateral.html`](lateral.html) directly in any modern desktop or mobile web browser.

### 2. Local HTTP Server (Recommended)
Running through a local web server ensures optimal performance and eliminates any browser restrictions on `localStorage` or iframe embedding:

**Using Python 3:**
```bash
python -m http.server 8000
```
Then navigate to: `http://localhost:8000`

**Using Node.js:**
```bash
npx serve .
```

---

## Keyboard Shortcuts

| Key | Action |
| :--- | :--- |
| **`←` / `→`** | Rotate cube to the left or right face |
| **`↑` / `↓`** | Rotate cube to the top or bottom face |
| **`1` – `6`** | Jump directly to face 1 through 6 |
| **`Space`** | Toggle auto-rotation (Pause / Resume) |
| **`V`** | Toggle view mode (**Central 3D Cube** ⇄ **Sidebar Menu**) |
| **`Home`** | Reset orientation to Front face |
| **`Esc`** | Clear search filter in sidebar mode |

---

## Configuration & Customization

Click the **⚙** icon in the top header or navigate to [`config.html`](config.html) to customize every aspect of the application:

### 1. Faces and Shortcuts (`🎲 Faces e atalhos`)
- **Face Styling**: Modify category title, emoji icon, background type (solid, gradient, custom image URL), gradient angle, text color, shortcut tile color/opacity, border styling, corner radius, and grid columns (1 to 6).
- **Shortcut Management**: Add, duplicate, edit, delete, or reorder shortcuts by dragging the `⋮⋮` handle.
- **Open Action**: Set each shortcut to **New tab**, **Same window**, or **Embedded view**.
- **Batch Operations**:
  - `⚡ Abertura p/ todos`: Bulk update all shortcuts on a face to a specific open mode.
  - `⇄ Trocar com…`: Swap entire content between two faces.
  - `🎨 Estilo p/ todas`: Apply the active face's visual styling to all other faces.

### 2. Background & Effects (`🖼️ Fundo`)
- Select background type: Solid, Static Gradient, Animated Moving Gradient, or Custom Wallpaper Image.
- Adjust overlay color, opacity, and image blur.
- Particle FX generator: Toggle between **Stars** and **Bubbles**, with custom particle color and density sliders.

### 3. Auto-Rotation (`🔄 Rotação automática`)
- Enable/disable auto-rotation.
- Switch between **Continuous** rotation and **Step-by-step** face cycles.
- Fine-tune rotation speed (°/s), spin direction, tilt angle, wobble amplitude, and per-face step intervals.
- Configure interaction behavior: pause on hover, inactivity resume delay, snap-to-face transition duration, and drag sensitivity.

### 4. Cube & Workspace (`🧊 Cubo e exibição`)
- Adjust cube dimensions (px), 3D perspective distance, face opacity, spacing/gap between faces, and ambient glow intensity.
- Customize sidebar preferences: position (Left or Right), sidebar width, miniature cube widget size, glassmorphism blur effect, and main content column layout.
- Toggle UI elements (Clock, Navigation Pills, Directional Controls, Hint labels).

---

## Data Storage & Portability

- **Zero Database Required**: All user configurations are stored persistently in browser `localStorage` (`menucubo.config.v1`).
- **Live Sync**: Changes saved in `config.html` instantly update open menu tabs via the browser `StorageEvent` and `postMessage` APIs.
- **Export / Import (`💾 Backup`)**:
  - Export your complete setup as a `.json` file for backups or sharing across devices.
  - Import existing `.json` configuration files with automatic schema validation.
  - Built-in JSON editor to inspect and edit the raw data object directly.
  - One-click factory reset button.

---

## Browser Compatibility

Compatible with all modern evergreen browsers supporting CSS 3D Transforms and ES6+:
- Google Chrome / Chromium-based browsers (Edge, Brave, Opera, Vivaldi)
- Mozilla Firefox
- Apple Safari (macOS & iOS)

---

## License

This project is open-source and free to use, modify, and distribute.

#   C u b e M e n u  
 
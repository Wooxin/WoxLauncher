# WoxLauncher Design Specification

## Overview

WoxLauncher is a cross-platform Minecraft launcher built with Tauri 2 + React 19 + TypeScript. It aims to be faster and more modern than HMCL, with first-class support for Mod browsing from community platforms.

## Platform & Environment

- **Target platforms**: Windows, macOS, Linux
- **Auth**: Microsoft (OAuth 2.0), Offline, AuthLib-Injector
- **Window mode**: Launcher stays open, game runs independently

## High-Level Architecture

**Rust (backend)**: File system operations, process management, game download/launch, Java download, authentication flows, system tray integration.

**React (frontend)**: UI rendering, Mod API calls (mcmod/CurseForge/Modrinth), user interaction, state management.

```
React Frontend (Zustand state)
        │  Tauri invoke()
────────┼────────────── Process boundary ──────────
Rust Backend (Tauri Commands → Services)
```

---

## Rust Backend

### Module Structure

```
src-tauri/src/
├── main.rs
├── lib.rs                   # Register all commands
├── commands/                # Thin command layer → services
│   ├── instance.rs
│   ├── launch.rs
│   ├── java.rs
│   └── auth.rs
├── services/                # Core business logic
│   ├── instance_manager.rs
│   ├── launcher.rs
│   ├── java_manager.rs
│   ├── downloader.rs
│   ├── auth.rs
│   └── mod.rs
└── models/                  # Shared data structures
    ├── instance.rs
    ├── java.rs
    └── mod.rs
```

### Key Crates

| Crate | Purpose |
|-------|---------|
| `mclauncher-rs` | Minecraft launch protocol |
| `reqwest` | Async HTTP with resume support |
| `tokio::fs` | Async file operations |
| `tauri-plugin-tray` | System tray |
| `serde` / `serde_json` | Serialization |

### Service Responsibilities

**instance_manager.rs**: Create, read, update, delete instances. Each instance has its own config file with isolated mod/config directories but shares core Minecraft assets (libraries, game JARs).

**launcher.rs**: Wraps `mclauncher-rs` to configure and spawn the game process with user/auth args, JVM args, and game directory. Reports progress via Tauri events.

**java_manager.rs**: Detects installed Java runtimes, downloads Java distributions (Zulu, Oracle, Adoptium, GraalVM), and manages versions per instance.

**downloader.rs**: Generic download engine supporting concurrent downloads, resume (Range header), SHA1/256 validation, and progress events.

**auth.rs**: Microsoft OAuth 2.0 device-code flow, offline mode (username-based), and AuthLib-Injector support.

### Data Models

```rust
// models/instance.rs
struct InstanceConfig {
    id: String,
    name: String,
    game_version: String,
    loader: Option<LoaderConfig>, // Vanilla, Fabric, Forge, Quilt
    java_version: String,
    jvm_args: Vec<String>,
    game_args: Vec<String>,
    resolution: (u32, u32),
    created_at: DateTime<Utc>,
}

// models/java.rs
struct JavaRuntime {
    vendor: JavaVendor, // Zulu, Oracle, Adoptium, GraalVM
    version: String,
    path: String,
    installed: bool,
}
```

---

## React Frontend

### Technology Stack

| Need | Choice | Reason |
|------|--------|--------|
| UI Framework | MUI (Material UI) | Native Material Design 3, matches Material You style |
| Routing | react-router v7 | Page-level routing |
| State | Zustand | Lightweight, no Provider, TypeScript-friendly |
| Data Fetching | TanStack Query | Caching, retry, pagination for Mod APIs |
| Build | Vite 7 | Already configured |

### Page Structure

| Route | Page | Purpose |
|-------|------|---------|
| `/` | Home | Welcome dashboard, recent instances, news |
| `/instances` | Instances | Instance list with create/delete |
| `/instances/:id` | InstanceDetail | Single instance config, mod list |
| `/mods` | ModBrowser | Search & browse across 3 sources |
| `/mods/:id` | ModDetail | Mod info, screenshots, download |
| `/java` | JavaManager | Java runtime management |
| `/settings` | Settings | Global preferences |

### Component Tree

```
App.tsx
├── SidebarLayout.tsx
│   ├── Sidebar.tsx (navigation)
│   └── <Outlet /> (page content)
├── Pages (routes above)
├── Common Components
│   ├── Card, Button, SearchBar (MUI-based)
│   ├── ProgressBar (download progress)
│   └── Dialog (confirmation/prompt)
├── Instance Components
│   ├── InstanceCard
│   ├── CreateDialog
│   └── ModList
└── Mod Components
    ├── ModCard (with source badge: mcmod/CurseForge/Modrinth)
    ├── SourceTabs
    └── PlatformFilter (version/loader filter)
```

### State Stores (Zustand)

- **instanceStore**: Instance list, active instance, CRUD operations
- **javaStore**: Java runtimes, download progress, active version per instance
- **modStore**: Search query, active source, results cache, download queue

### Mod API Integration

Each platform has its own service file under `src/services/`:
- `modrinth.ts` — Modrinth API v2 (no auth needed for search)
- `curseforge.ts` — CurseForge Core API (requires API key)
- `mcmod.ts` — MCMod API

A unified search hook (`useModSearch`) abstracts source selection and merges results into a common `ModResult` type.
```

export interface ModResult {
  id: string;
  source: 'modrinth' | 'curseforge' | 'mcmod';
  name: string;
  summary: string;
  icon_url: string;
  downloads: number;
  categories: string[];
  versions: string[];
}
```

### Visual Style

Material You (Material Design 3) via MUI:
- Dynamic color tokens (primary, secondary, surface)
- Rounded cards with elevation
- Smooth transitions and motion
- Dark theme default, with light mode option
- Side navigation bar, always visible

---

## Instance Management

Lightweight mode:
- **Shared**: Minecraft core assets (libraries, game JARs, assets index)
- **Isolated per instance**: config files, mods directory, resourcepacks, shaderpacks, saves (optional)

Storage layout:
```
~/.woxlauncher/
├── shared/                 # Shared across all instances
│   ├── libraries/
│   ├── versions/           # Downloaded game JARs
│   └── assets/             # Minecraft assets
├── instances/
│   └── <instance-id>/
│       ├── config.json     # Instance settings
│       ├── mods/
│       ├── config/         # Mod configs
│       ├── resourcepacks/
│       └── saves/          # Optional, pointer to shared
└── java/                   # Downloaded Java runtimes
    ├── zulu-17/
    ├── oracle-21/
    └── ...
```

---

## Authentication Flow

1. **Microsoft**: Device-code OAuth 2.0 → open browser → user authorizes → token exchange → Minecraft profile (username, UUID, access token)
2. **Offline**: Enter username → generate offline UUID → no server validation
3. **AuthLib-Injector**: Enter auth server URL → authenticate via server → token stored

All tokens stored encrypted on disk via OS keychain (Tauri plugin).

---

## Downloads & Progress

All downloads (game, Java, mods) share the same download engine:
- Concurrent chunked downloads via `reqwest`
- Resume on interruption (Range header)
- SHA1/SHA256 validation
- Progress emitted as Tauri events → frontend ProgressBar updates
- Rate limiting to prevent API bans on Mod downloads

---

## Scope Boundaries

### In scope (MVP)
- [x] Instance create/list/delete with lightweight isolation
- [x] Minecraft launch via mclauncher-rs
- [x] Microsoft + offline + AuthLib-Injector auth
- [x] Java runtime detection + download (Zulu, Oracle, Adoptium, GraalVM)
- [x] Mod browsing via Modrinth + CurseForge + MCMod APIs
- [x] Download engine with progress + resume
- [x] Material You UI with side navigation

### Out of scope (future)
- Modpack import (packwiz, CurseForge packs)
- Built-in shader/resource pack management
- Multi-account switching
- Game crash log analysis
- Server browser / multiplayer management
- Mod auto-update on launch
- Fabric/Forge/Quilt installer automation (manual mod install only for MVP)
```

---

## Development Order

1. Project scaffold & MUI integration
2. Instance management (Rust backend + React UI)
3. Authentication system
4. Minecraft launch engine
5. Download engine
6. Java runtime management
7. Mod browser (Modrinth first, then CurseForge + MCMod)
8. Settings page & polish

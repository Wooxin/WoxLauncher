# WoxLauncher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a cross-platform Minecraft launcher with instance management, multi-source mod browsing, Java runtime management, and triple auth mode.

**Architecture:** Tauri 2 app with Rust backend handling file I/O, process management, downloads, and authentication. React 19 frontend with MUI (Material You) handles all UI and mod platform API calls. Frontend and backend communicate via Tauri invoke() commands.

**Tech Stack:** Tauri 2, Rust, React 19, TypeScript, MUI (Material UI), Zustand, TanStack Query, react-router v7, reqwest, serde

---

## File Structure Map

```
src-tauri/src/
├── main.rs                          # [MODIFY] Tauri entry point
├── lib.rs                           # [MODIFY] Register commands & plugins
├── models/
│   ├── mod.rs                       # [CREATE] Re-exports
│   ├── instance.rs                  # [CREATE] InstanceConfig, LoaderType
│   ├── java.rs                      # [CREATE] JavaRuntime, JavaVendor
│   └── download.rs                  # [CREATE] DownloadProgress
├── services/
│   ├── mod.rs                       # [CREATE] Re-exports
│   ├── instance_manager.rs          # [CREATE] CRUD for instances
│   ├── launcher.rs                  # [CREATE] Minecraft launch engine
│   ├── java_manager.rs              # [CREATE] Java runtime detection & install
│   ├── downloader.rs                # [CREATE] Generic download engine
│   └── auth.rs                      # [CREATE] MS OAuth, offline, AuthLib-Injector
├── commands/
│   ├── mod.rs                       # [CREATE] Re-exports
│   ├── instance.rs                  # [CREATE] Commands → instance_manager
│   ├── launch.rs                    # [CREATE] Commands → launcher
│   ├── java.rs                      # [CREATE] Commands → java_manager
│   └── auth.rs                      # [CREATE] Commands → auth
```

```
src/
├── main.tsx                         # [MODIFY] Add providers
├── App.tsx                          # [REPLACE] Router + theme setup
├── App.css                          # [DELETE]
├── styles/
│   ├── theme.ts                     # [CREATE] MUI theme
│   └── global.css                   # [CREATE] Minimal globals
├── types/
│   └── index.ts                     # [CREATE] Shared TS types
├── layouts/
│   └── SidebarLayout.tsx            # [CREATE] Side nav + <Outlet>
├── pages/
│   ├── Home.tsx                     # [CREATE] Dashboard
│   ├── Instances.tsx                # [CREATE] Instance list
│   ├── InstanceDetail.tsx           # [CREATE] Single instance view
│   ├── ModBrowser.tsx               # [CREATE] Mod search/browse
│   ├── ModDetail.tsx                # [CREATE] Mod info page
│   ├── JavaManager.tsx              # [CREATE] Java runtime mgmt
│   └── Settings.tsx                 # [CREATE] Global settings
├── components/
│   ├── Sidebar.tsx                  # [CREATE] Navigation sidebar
│   ├── instance/
│   │   ├── InstanceCard.tsx         # [CREATE] Instance summary card
│   │   └── CreateInstanceDialog.tsx # [CREATE] Creation dialog
│   └── mod/
│       ├── ModCard.tsx              # [CREATE] Mod result card
│       ├── SourceTabs.tsx           # [CREATE] Source switcher
│       └── PlatformFilter.tsx       # [CREATE] Version/loader filter
├── stores/
│   ├── instanceStore.ts            # [CREATE] Instance state
│   ├── javaStore.ts                # [CREATE] Java state
│   └── modStore.ts                 # [CREATE] Mod browsing state
├── hooks/
│   ├── useTauriCommand.ts          # [CREATE] Generic invoke hook
│   └── useModSearch.ts             # [CREATE] Unified search
└── services/
    └── modrinth.ts                  # [CREATE] Modrinth API client
```

---

## Phase 1: Project Foundation

### Task 1: Install frontend dependencies

**Files:** Modify: `package.json`

- [ ] **Step 1: Install MUI, router, state management, data fetching**

```bash
cd D:/Works/MyProject/WoxLauncher && npm install @mui/material @mui/icons-material @emotion/react @emotion/styled react-router-dom zustand @tanstack/react-query
```

Expected: All packages installed without errors.

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add MUI, react-router, zustand, tanstack-query dependencies"
```

---

### Task 2: Set up MUI theme and global styles

**Files:**
- Create: `src/styles/theme.ts`
- Create: `src/styles/global.css`

- [ ] **Step 1: Write the MUI theme**

Write `src/styles/theme.ts`:

```typescript
import { createTheme } from '@mui/material/styles';

export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#90caf9' },
    secondary: { main: '#ce93d8' },
    background: { default: '#0d1117', paper: '#161b22' },
  },
  shape: { borderRadius: 16 },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
  },
});

export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1976d2' },
    secondary: { main: '#9c27b0' },
  },
  shape: { borderRadius: 16 },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
});
```

- [ ] **Step 2: Write global CSS**

Write `src/styles/global.css`:

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #root {
  height: 100%;
  overflow: hidden;
}

::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/styles/theme.ts src/styles/global.css
git commit -m "feat: add MUI theme and global styles"
```

---

### Task 3: Set up App with routing and layout

**Files:**
- Modify: `src/main.tsx`
- Replace: `src/App.tsx`
- Delete: `src/App.css`
- Create: `src/layouts/SidebarLayout.tsx`
- Create: `src/components/Sidebar.tsx`
- Create: `src/pages/Home.tsx`

- [ ] **Step 1: Add providers to main.tsx**

Modify `src/main.tsx`:

```typescript
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { darkTheme } from "./styles/theme";
import App from "./App";
import "./styles/global.css";

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
```

- [ ] **Step 2: Replace App.tsx with routes**

Write `src/App.tsx`:

```typescript
import { Routes, Route } from "react-router-dom";
import SidebarLayout from "./layouts/SidebarLayout";
import Home from "./pages/Home";
import Instances from "./pages/Instances";
import InstanceDetail from "./pages/InstanceDetail";
import ModBrowser from "./pages/ModBrowser";
import ModDetail from "./pages/ModDetail";
import JavaManager from "./pages/JavaManager";
import Settings from "./pages/Settings";

function App() {
  return (
    <Routes>
      <Route element={<SidebarLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/instances" element={<Instances />} />
        <Route path="/instances/:id" element={<InstanceDetail />} />
        <Route path="/mods" element={<ModBrowser />} />
        <Route path="/mods/:id" element={<ModDetail />} />
        <Route path="/java" element={<JavaManager />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}

export default App;
```

- [ ] **Step 3: Create SidebarLayout**

Write `src/layouts/SidebarLayout.tsx`:

```typescript
import { Outlet } from "react-router-dom";
import { Box } from "@mui/material";
import Sidebar from "../components/Sidebar";

const DRAWER_WIDTH = 240;

export default function SidebarLayout() {
  return (
    <Box sx={{ display: "flex", height: "100vh" }}>
      <Sidebar width={DRAWER_WIDTH} />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          overflow: "auto",
          height: "100%",
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}
```

- [ ] **Step 4: Create Sidebar component**

Write `src/components/Sidebar.tsx`:

```typescript
import { useLocation, useNavigate } from "react-router-dom";
import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
} from "@mui/material";
import HomeIcon from "@mui/icons-material/Home";
import FolderIcon from "@mui/icons-material/Folder";
import ExtensionIcon from "@mui/icons-material/Extension";
import CoffeeIcon from "@mui/icons-material/Coffee";
import SettingsIcon from "@mui/icons-material/Settings";

interface SidebarProps {
  width: number;
}

const navItems = [
  { path: "/", label: "Home", icon: <HomeIcon /> },
  { path: "/instances", label: "Instances", icon: <FolderIcon /> },
  { path: "/mods", label: "Mod Browser", icon: <ExtensionIcon /> },
  { path: "/java", label: "Java", icon: <CoffeeIcon /> },
  { path: "/settings", label: "Settings", icon: <SettingsIcon /> },
];

export default function Sidebar({ width }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <Drawer
      variant="permanent"
      sx={{
        width,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width,
          boxSizing: "border-box",
          bgcolor: "background.paper",
          borderRight: "1px solid",
          borderColor: "divider",
        },
      }}
    >
      <Box sx={{ p: 2, pt: 3 }}>
        <Typography variant="h5" fontWeight={700} color="primary.main">
          WoxLauncher
        </Typography>
      </Box>
      <List>
        {navItems.map((item) => (
          <ListItemButton
            key={item.path}
            selected={location.pathname === item.path}
            onClick={() => navigate(item.path)}
            sx={{ mx: 1, borderRadius: 2, mb: 0.5 }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
    </Drawer>
  );
}
```

- [ ] **Step 5: Create Home page placeholder**

Write `src/pages/Home.tsx`:

```typescript
import { Typography, Box } from "@mui/material";

export default function Home() {
  return (
    <Box>
      <Typography variant="h4" fontWeight={600} mb={2}>
        Welcome to WoxLauncher
      </Typography>
      <Typography variant="body1" color="text.secondary">
        A fast, modern Minecraft launcher. Create an instance to get started.
      </Typography>
    </Box>
  );
}
```

- [ ] **Step 6: Create placeholder pages (all remaining pages)**

Write placeholder pages — each following the same minimal pattern. Create each file:

`src/pages/Instances.tsx`:
```typescript
import { Typography } from "@mui/material";
export default function Instances() {
  return <Typography variant="h4">Instances</Typography>;
}
```

`src/pages/InstanceDetail.tsx`:
```typescript
import { Typography } from "@mui/material";
export default function InstanceDetail() {
  return <Typography variant="h4">Instance Detail</Typography>;
}
```

`src/pages/ModBrowser.tsx`:
```typescript
import { Typography } from "@mui/material";
export default function ModBrowser() {
  return <Typography variant="h4">Mod Browser</Typography>;
}
```

`src/pages/ModDetail.tsx`:
```typescript
import { Typography } from "@mui/material";
export default function ModDetail() {
  return <Typography variant="h4">Mod Detail</Typography>;
}
```

`src/pages/JavaManager.tsx`:
```typescript
import { Typography } from "@mui/material";
export default function JavaManager() {
  return <Typography variant="h4">Java Manager</Typography>;
}
```

`src/pages/Settings.tsx`:
```typescript
import { Typography } from "@mui/material";
export default function Settings() {
  return <Typography variant="h4">Settings</Typography>;
}
```

- [ ] **Step 7: Verify app builds**

```bash
cd D:/Works/MyProject/WoxLauncher && npx tsc --noEmit
```

Expected: No TypeScript errors.

- [ ] **Step 8: Remove App.css and commit**

```bash
rm src/App.css
git add src/main.tsx src/App.tsx src/styles/global.css src/layouts/ src/components/Sidebar.tsx src/pages/
git commit -m "feat: set up routing, layout, sidebar navigation, and placeholder pages"
```

---

### Task 4: Define shared TypeScript types

**File:** Create: `src/types/index.ts`

- [ ] **Step 1: Write types file**

```typescript
// Instance
export interface InstanceConfig {
  id: string;
  name: string;
  gameVersion: string;
  loaderType: LoaderType;
  loaderVersion: string;
  javaVersion: string;
  jvmArgs: string[];
  gameArgs: string[];
  resolutionWidth: number;
  resolutionHeight: number;
  createdAt: string;
  lastPlayedAt: string | null;
}

export type LoaderType = "vanilla" | "fabric" | "forge" | "quilt";

// Java
export type JavaVendor = "zulu" | "oracle" | "adoptium" | "graalvm";

export interface JavaRuntime {
  id: string;
  vendor: JavaVendor;
  version: string;
  path: string;
  installed: boolean;
}

// Download
export interface DownloadProgress {
  downloaded: number;
  total: number;
  percent: number;
  speed: string;
  status: "idle" | "downloading" | "verifying" | "done" | "error";
  fileName: string;
}

// Auth
export type AuthMode = "microsoft" | "offline" | "authlib";

export interface AccountInfo {
  username: string;
  uuid: string;
  accessToken: string;
  authMode: AuthMode;
  authServerUrl?: string;
}

// Mod
export type ModSource = "modrinth" | "curseforge" | "mcmod";

export interface ModResult {
  id: string;
  source: ModSource;
  name: string;
  summary: string;
  iconUrl: string;
  downloads: number;
  categories: string[];
  versions: string[];
  author: string;
}

export interface ModDetail extends ModResult {
  description: string;
  screenshots: string[];
  downloadUrl: string;
  fileName: string;
  fileSize: number;
  license: string;
  updatedAt: string;
}
```

- [ ] **Step 2: Verify types compile**

```bash
cd D:/Works/MyProject/WoxLauncher && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: define shared TypeScript types for instances, java, auth, and mods"
```

---

### Task 5: Add Rust dependencies and data models

**Files:**
- Modify: `src-tauri/Cargo.toml`
- Create: `src-tauri/src/models/mod.rs`
- Create: `src-tauri/src/models/instance.rs`
- Create: `src-tauri/src/models/java.rs`
- Create: `src-tauri/src/models/download.rs`

- [ ] **Step 1: Add Rust dependencies to Cargo.toml**

Modify `src-tauri/Cargo.toml` — add after the existing `[dependencies]` section entries:

```toml
reqwest = { version = "0.12", features = ["json", "stream"] }
tokio = { version = "1", features = ["full"] }
uuid = { version = "1", features = ["v4"] }
sha2 = "0.10"
chrono = { version = "0.4", features = ["serde"] }
```

- [ ] **Step 2: Write instance model**

Write `src-tauri/src/models/instance.rs`:

```rust
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum LoaderType {
    Vanilla,
    Fabric,
    Forge,
    Quilt,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstanceConfig {
    pub id: String,
    pub name: String,
    pub game_version: String,
    pub loader_type: LoaderType,
    pub loader_version: String,
    pub java_version: String,
    pub jvm_args: Vec<String>,
    pub game_args: Vec<String>,
    pub resolution_width: u32,
    pub resolution_height: u32,
    pub created_at: DateTime<Utc>,
    pub last_played_at: Option<DateTime<Utc>>,
}

impl Default for InstanceConfig {
    fn default() -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            name: String::new(),
            game_version: "1.21".to_string(),
            loader_type: LoaderType::Vanilla,
            loader_version: String::new(),
            java_version: "17".to_string(),
            jvm_args: vec!["-Xmx2G".to_string()],
            game_args: vec![],
            resolution_width: 1920,
            resolution_height: 1080,
            created_at: Utc::now(),
            last_played_at: None,
        }
    }
}
```

- [ ] **Step 3: Write Java model**

Write `src-tauri/src/models/java.rs`:

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum JavaVendor {
    Zulu,
    Oracle,
    Adoptium,
    GraalVM,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JavaRuntime {
    pub id: String,
    pub vendor: JavaVendor,
    pub version: String,
    pub path: String,
    pub installed: bool,
}
```

- [ ] **Step 4: Write download model**

Write `src-tauri/src/models/download.rs`:

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum DownloadStatus {
    Idle,
    Downloading,
    Verifying,
    Done,
    Error(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadProgress {
    pub downloaded: u64,
    pub total: u64,
    pub percent: f64,
    pub speed: String,
    pub status: DownloadStatus,
    pub file_name: String,
}
```

- [ ] **Step 5: Write models mod.rs (re-exports)**

Write `src-tauri/src/models/mod.rs`:

```rust
pub mod instance;
pub mod java;
pub mod download;

pub use instance::*;
pub use java::*;
pub use download::*;
```

- [ ] **Step 6: Commit**

```bash
git add src-tauri/Cargo.toml src-tauri/src/models/
git commit -m "feat: add Rust data models and dependencies"
```

---

## Phase 2: Instance Management

### Task 6: Rust instance manager service

**Files:**
- Create: `src-tauri/src/services/mod.rs`
- Create: `src-tauri/src/services/instance_manager.rs`

- [ ] **Step 1: Write instance_manager.rs**

Write `src-tauri/src/services/instance_manager.rs`:

```rust
use std::path::PathBuf;
use crate::models::instance::{InstanceConfig, LoaderType};

fn get_wox_dir() -> PathBuf {
    dirs_next().unwrap_or_else(|| PathBuf::from("."))
}

fn dirs_next() -> Option<PathBuf> {
    #[cfg(target_os = "windows")]
    {
        std::env::var("APPDATA").ok().map(PathBuf::from)
    }
    #[cfg(target_os = "macos")]
    {
        std::env::var("HOME").ok().map(|h| PathBuf::from(h).join("Library/Application Support"))
    }
    #[cfg(target_os = "linux")]
    {
        std::env::var("XDG_DATA_HOME")
            .ok()
            .map(PathBuf::from)
            .or_else(|| std::env::var("HOME").ok().map(|h| PathBuf::from(h).join(".local/share")))
    }
}

fn instances_dir() -> PathBuf {
    get_wox_dir().join(".woxlauncher").join("instances")
}

pub fn list_instances() -> Result<Vec<InstanceConfig>, String> {
    let dir = instances_dir();
    if !dir.exists() {
        return Ok(vec![]);
    }
    let mut instances = Vec::new();
    let entries = std::fs::read_dir(&dir).map_err(|e| e.to_string())?;
    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let config_path = entry.path().join("config.json");
        if config_path.exists() {
            let json = std::fs::read_to_string(&config_path).map_err(|e| e.to_string())?;
            let config: InstanceConfig = serde_json::from_str(&json).map_err(|e| e.to_string())?;
            instances.push(config);
        }
    }
    Ok(instances)
}

pub fn create_instance(mut config: InstanceConfig) -> Result<InstanceConfig, String> {
    use uuid::Uuid;
    config.id = Uuid::new_v4().to_string();
    let dir = instances_dir().join(&config.id);
    std::fs::create_dir_all(dir.join("mods")).map_err(|e| e.to_string())?;
    std::fs::create_dir_all(dir.join("config")).map_err(|e| e.to_string())?;
    let json = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    std::fs::write(dir.join("config.json"), json).map_err(|e| e.to_string())?;
    Ok(config)
}

pub fn delete_instance(id: &str) -> Result<(), String> {
    let dir = instances_dir().join(id);
    if dir.exists() {
        std::fs::remove_dir_all(&dir).map_err(|e| e.to_string())?;
    }
    Ok(())
}

pub fn get_instance(id: &str) -> Result<InstanceConfig, String> {
    let config_path = instances_dir().join(id).join("config.json");
    let json = std::fs::read_to_string(&config_path).map_err(|e| e.to_string())?;
    serde_json::from_str(&json).map_err(|e| e.to_string())
}

pub fn update_instance(config: InstanceConfig) -> Result<(), String> {
    let dir = instances_dir().join(&config.id);
    let json = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    std::fs::write(dir.join("config.json"), json).map_err(|e| e.to_string())
}
```

- [ ] **Step 2: Add uuid dependency to Cargo.toml**

Check `src-tauri/Cargo.toml` already has `uuid` from Task 5. Verify:

```bash
grep uuid src-tauri/Cargo.toml
```

Expected: `uuid = { version = "1", features = ["v4"] }`

- [ ] **Step 3: Write services/mod.rs**

```rust
pub mod instance_manager;
```

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/services/
git commit -m "feat: add instance manager service (CRUD)"
```

---

### Task 7: Rust instance commands

**Files:**
- Create: `src-tauri/src/commands/mod.rs`
- Create: `src-tauri/src/commands/instance.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Write instance commands**

Write `src-tauri/src/commands/instance.rs`:

```rust
use crate::models::instance::InstanceConfig;
use crate::services::instance_manager;

#[tauri::command]
pub fn list_instances() -> Result<Vec<InstanceConfig>, String> {
    instance_manager::list_instances()
}

#[tauri::command]
pub fn create_instance(config: InstanceConfig) -> Result<InstanceConfig, String> {
    instance_manager::create_instance(config)
}

#[tauri::command]
pub fn delete_instance(id: String) -> Result<(), String> {
    instance_manager::delete_instance(&id)
}

#[tauri::command]
pub fn get_instance(id: String) -> Result<InstanceConfig, String> {
    instance_manager::get_instance(&id)
}

#[tauri::command]
pub fn update_instance(config: InstanceConfig) -> Result<(), String> {
    instance_manager::update_instance(config)
}
```

- [ ] **Step 2: Write commands/mod.rs**

```rust
pub mod instance;
```

- [ ] **Step 3: Update lib.rs to register commands**

Replace `src-tauri/src/lib.rs`:

```rust
mod models;
mod services;
mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            commands::instance::list_instances,
            commands::instance::create_instance,
            commands::instance::delete_instance,
            commands::instance::get_instance,
            commands::instance::update_instance,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 4: Build and verify**

```bash
cd D:/Works/MyProject/WoxLauncher/src-tauri && cargo check
```

Expected: Compilation succeeds.

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/commands/ src-tauri/src/lib.rs
git commit -m "feat: add instance Tauri commands"
```

---

### Task 8: Instance store and frontend

**Files:**
- Create: `src/stores/instanceStore.ts`
- Create: `src/hooks/useTauriCommand.ts`
- Modify: `src/pages/Instances.tsx`
- Create: `src/components/instance/InstanceCard.tsx`
- Create: `src/components/instance/CreateInstanceDialog.tsx`

- [ ] **Step 1: Write useTauriCommand hook**

Write `src/hooks/useTauriCommand.ts`:

```typescript
import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

export function useTauriCommand<T>(command: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async (args?: Record<string, unknown>): Promise<T> => {
      setLoading(true);
      setError(null);
      try {
        const result = await invoke<T>(command, args);
        setData(result);
        return result;
      } catch (e) {
        setError(String(e));
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [command]
  );

  return { data, loading, error, execute };
}
```

- [ ] **Step 2: Write instanceStore**

Write `src/stores/instanceStore.ts`:

```typescript
import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { InstanceConfig } from "../types";

interface InstanceState {
  instances: InstanceConfig[];
  selectedId: string | null;
  loading: boolean;
  fetchInstances: () => Promise<void>;
  createInstance: (config: InstanceConfig) => Promise<InstanceConfig>;
  deleteInstance: (id: string) => Promise<void>;
}

export const useInstanceStore = create<InstanceState>((set, get) => ({
  instances: [],
  selectedId: null,
  loading: false,

  fetchInstances: async () => {
    set({ loading: true });
    const instances = await invoke<InstanceConfig[]>("list_instances");
    set({ instances, loading: false });
  },

  createInstance: async (config) => {
    const created = await invoke<InstanceConfig>("create_instance", {
      config,
    });
    set({ instances: [...get().instances, created] });
    return created;
  },

  deleteInstance: async (id) => {
    await invoke("delete_instance", { id });
    set({ instances: get().instances.filter((i) => i.id !== id) });
  },
}));
```

- [ ] **Step 3: Write InstanceCard component**

Write `src/components/instance/InstanceCard.tsx`:

```typescript
import { useNavigate } from "react-router-dom";
import { Card, CardContent, Typography, IconButton, Box, Chip } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import type { InstanceConfig } from "../../types";

interface Props {
  instance: InstanceConfig;
  onDelete: (id: string) => void;
}

export default function InstanceCard({ instance, onDelete }: Props) {
  const navigate = useNavigate();

  return (
    <Card sx={{ display: "flex", alignItems: "center", mb: 2 }}>
      <CardContent sx={{ flex: 1 }}>
        <Typography variant="h6">{instance.name}</Typography>
        <Box sx={{ display: "flex", gap: 1, mt: 0.5 }}>
          <Chip label={instance.gameVersion} size="small" />
          <Chip label={instance.loaderType} size="small" color="primary" />
          {instance.lastPlayedAt && (
            <Typography variant="caption" color="text.secondary" sx={{ ml: "auto" }}>
              Last played: {new Date(instance.lastPlayedAt).toLocaleDateString()}
            </Typography>
          )}
        </Box>
      </CardContent>
      <Box sx={{ pr: 1 }}>
        <IconButton onClick={() => navigate(`/instances/${instance.id}`)}>
          <PlayArrowIcon />
        </IconButton>
        <IconButton onClick={() => onDelete(instance.id)} color="error">
          <DeleteIcon />
        </IconButton>
      </Box>
    </Card>
  );
}
```

- [ ] **Step 4: Write CreateInstanceDialog**

Write `src/components/instance/CreateInstanceDialog.tsx`:

```typescript
import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  MenuItem,
} from "@mui/material";
import type { InstanceConfig, LoaderType } from "../../types";

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (config: InstanceConfig) => void;
}

export default function CreateInstanceDialog({ open, onClose, onSubmit }: Props) {
  const [name, setName] = useState("");
  const [gameVersion, setGameVersion] = useState("1.21");
  const [loaderType, setLoaderType] = useState<LoaderType>("vanilla");

  const handleSubmit = () => {
    onSubmit({
      id: "",
      name,
      gameVersion,
      loaderType,
      loaderVersion: "",
      javaVersion: "17",
      jvmArgs: ["-Xmx2G"],
      gameArgs: [],
      resolutionWidth: 1920,
      resolutionHeight: 1080,
      createdAt: new Date().toISOString(),
      lastPlayedAt: null,
    });
    setName("");
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create New Instance</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          label="Instance Name"
          fullWidth
          margin="dense"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <TextField
          label="Game Version"
          fullWidth
          margin="dense"
          value={gameVersion}
          onChange={(e) => setGameVersion(e.target.value)}
        />
        <TextField
          select
          label="Loader"
          fullWidth
          margin="dense"
          value={loaderType}
          onChange={(e) => setLoaderType(e.target.value as LoaderType)}
        >
          <MenuItem value="vanilla">Vanilla</MenuItem>
          <MenuItem value="fabric">Fabric</MenuItem>
          <MenuItem value="forge">Forge (coming soon)</MenuItem>
          <MenuItem value="quilt">Quilt (coming soon)</MenuItem>
        </TextField>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={!name.trim()}>
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
}
```

- [ ] **Step 5: Update Instances page**

Write `src/pages/Instances.tsx`:

```typescript
import { useEffect, useState } from "react";
import { Typography, Box, Button, CircularProgress } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useInstanceStore } from "../stores/instanceStore";
import InstanceCard from "../components/instance/InstanceCard";
import CreateInstanceDialog from "../components/instance/CreateInstanceDialog";
import type { InstanceConfig } from "../types";

export default function Instances() {
  const { instances, loading, fetchInstances, createInstance, deleteInstance } =
    useInstanceStore();
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchInstances();
  }, []);

  const handleCreate = async (config: InstanceConfig) => {
    await createInstance(config);
  };

  const handleDelete = async (id: string) => {
    await deleteInstance(id);
  };

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
        <Typography variant="h4" fontWeight={600}>
          Instances
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
        >
          New Instance
        </Button>
      </Box>

      {loading ? (
        <CircularProgress />
      ) : instances.length === 0 ? (
        <Typography color="text.secondary">
          No instances yet. Create your first one!
        </Typography>
      ) : (
        instances.map((inst) => (
          <InstanceCard key={inst.id} instance={inst} onDelete={handleDelete} />
        ))
      )}

      <CreateInstanceDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleCreate}
      />
    </Box>
  );
}
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd D:/Works/MyProject/WoxLauncher && npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add src/stores/instanceStore.ts src/hooks/useTauriCommand.ts src/pages/Instances.tsx src/components/instance/
git commit -m "feat: add instance list UI with create/delete"
```

---

## Phase 3: Authentication

### Task 9: Rust auth service

**Files:**
- Create: `src-tauri/src/services/auth.rs`
- Modify: `src-tauri/src/services/mod.rs`

- [ ] **Step 1: Write auth.rs**

Write `src-tauri/src/services/auth.rs`:

```rust
use reqwest::Client;
use serde::{Deserialize, Serialize};

const MS_CLIENT_ID: &str = "00000000402b5328"; // Minecraft official client ID
const MS_DEVICE_CODE_URL: &str = "https://login.microsoftonline.com/consumers/oauth2/v2.0/devicecode";
const MS_TOKEN_URL: &str = "https://login.microsoftonline.com/consumers/oauth2/v2.0/token";
const MS_XBL_AUTH_URL: &str = "https://user.auth.xboxlive.com/user/authenticate";
const MS_XSTS_AUTH_URL: &str = "https://xsts.auth.xboxlive.com/xsts/authorize";
const MC_LOGIN_URL: &str = "https://api.minecraftservices.com/authentication/login_with_xbox";
const MC_PROFILE_URL: &str = "https://api.minecraftservices.com/minecraft/profile";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthResult {
    pub username: String,
    pub uuid: String,
    pub access_token: String,
    pub token_type: String,
}

#[derive(Deserialize)]
struct DeviceCodeResponse {
    device_code: String,
    user_code: String,
    verification_uri: String,
    message: String,
    interval: u64,
    expires_in: u64,
}

#[derive(Deserialize)]
struct TokenResponse {
    access_token: String,
    #[allow(dead_code)]
    token_type: String,
}

#[derive(Deserialize)]
struct XblAuthResponse {
    #[serde(rename = "Token")]
    token: String,
}

#[derive(Deserialize)]
struct XstsResponse {
    #[serde(rename = "Token")]
    token: String,
    #[serde(rename = "DisplayClaims")]
    display_claims: DisplayClaims,
}

#[derive(Deserialize)]
struct DisplayClaims {
    xui: Vec<XuiClaim>,
}

#[derive(Deserialize)]
struct XuiClaim {
    uhs: String,
}

#[derive(Serialize)]
struct McLoginRequest {
    #[serde(rename = "identityToken")]
    identity_token: String,
}

#[derive(Deserialize)]
struct McProfileResponse {
    name: String,
    id: String,
}

/// Step 1: Get device code for user to authorize
pub async fn ms_device_code() -> Result<(String, String, String), String> {
    let client = Client::new();
    let resp = client
        .post(MS_DEVICE_CODE_URL)
        .form(&[
            ("client_id", MS_CLIENT_ID),
            ("scope", "XboxLive.signoff offline_access"),
        ])
        .send()
        .await
        .map_err(|e| e.to_string())?
        .json::<DeviceCodeResponse>()
        .await
        .map_err(|e| e.to_string())?;

    Ok((resp.device_code, resp.user_code, resp.verification_uri))
}

/// Step 2: Poll for token (call repeatedly until success or timeout)
pub async fn ms_poll_token(device_code: &str) -> Result<AuthResult, String> {
    let client = Client::new();

    // Poll for Microsoft token
    let token = client
        .post(MS_TOKEN_URL)
        .form(&[
            ("client_id", MS_CLIENT_ID),
            ("grant_type", "urn:ietf:params:oauth:grant-type:device_code"),
            ("device_code", device_code),
        ])
        .send()
        .await
        .map_err(|e| e.to_string())?
        .json::<TokenResponse>()
        .await
        .map_err(|e| e.to_string())?;

    // Xbox Live auth
    let xbl = client
        .post(MS_XBL_AUTH_URL)
        .json(&serde_json::json!({
            "Properties": {
                "AuthMethod": "RPS",
                "SiteName": "user.auth.xboxlive.com",
                "RpsTicket": format!("d={}", token.access_token),
            },
            "RelyingParty": "http://auth.xboxlive.com",
            "TokenType": "JWT",
        }))
        .send()
        .await
        .map_err(|e| e.to_string())?
        .json::<XblAuthResponse>()
        .await
        .map_err(|e| e.to_string())?;

    // XSTS auth
    let xsts = client
        .post(MS_XSTS_AUTH_URL)
        .json(&serde_json::json!({
            "Properties": {
                "SandboxId": "RETAIL",
                "UserTokens": [xbl.token],
            },
            "RelyingParty": "rp://api.minecraftservices.com/",
            "TokenType": "JWT",
        }))
        .send()
        .await
        .map_err(|e| e.to_string())?
        .json::<XstsResponse>()
        .await
        .map_err(|e| e.to_string())?;

    let uhs = &xsts.display_claims.xui[0].uhs;

    // Minecraft login
    let mc = client
        .post(MC_LOGIN_URL)
        .json(&McLoginRequest {
            identity_token: format!("XBL3.0 x={};{}", uhs, xsts.token),
        })
        .send()
        .await
        .map_err(|e| e.to_string())?
        .json::<TokenResponse>()
        .await
        .map_err(|e| e.to_string())?;

    // Minecraft profile
    let profile = client
        .get(MC_PROFILE_URL)
        .bearer_auth(&mc.access_token)
        .send()
        .await
        .map_err(|e| e.to_string())?
        .json::<McProfileResponse>()
        .await
        .map_err(|e| e.to_string())?;

    Ok(AuthResult {
        username: profile.name,
        uuid: profile.id,
        access_token: mc.access_token,
        token_type: "msa".to_string(),
    })
}

/// Offline mode — generate UUID from username
pub fn offline_auth(username: &str) -> AuthResult {
    use sha2::{Digest, Sha256};
    let mut hasher = Sha256::new();
    hasher.update(format!("OfflinePlayer:{}", username));
    let hash = hasher.finalize();

    let mut uuid_bytes = [0u8; 16];
    uuid_bytes.copy_from_slice(&hash[..16]);
    uuid_bytes[6] = (uuid_bytes[6] & 0x0f) | 0x30;
    uuid_bytes[8] = (uuid_bytes[8] & 0x3f) | 0x80;
    let uuid = uuid::Uuid::from_bytes(uuid_bytes).to_string();

    AuthResult {
        username: username.to_string(),
        uuid,
        access_token: "0".to_string(),
        token_type: "offline".to_string(),
    }
}

/// AuthLib-Injector login
pub async fn authlib_login(
    server_url: &str,
    username: &str,
    password: &str,
) -> Result<AuthResult, String> {
    let client = Client::new();
    let resp = client
        .post(format!("{}/authserver/authenticate", server_url))
        .json(&serde_json::json!({
            "agent": { "name": "Minecraft", "version": 1 },
            "username": username,
            "password": password,
        }))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if resp.status().is_client_error() {
        return Err("Invalid credentials".to_string());
    }

    let body: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    let profile = &body["selectedProfile"];

    Ok(AuthResult {
        username: profile["name"].as_str().unwrap_or(username).to_string(),
        uuid: profile["id"].as_str().unwrap_or("").to_string(),
        access_token: body["accessToken"].as_str().unwrap_or("").to_string(),
        token_type: "authlib".to_string(),
    })
}
```

- [ ] **Step 2: Update services/mod.rs**

```rust
pub mod instance_manager;
pub mod auth;
```

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/services/auth.rs src-tauri/src/services/mod.rs
git commit -m "feat: add authentication service (MS OAuth, offline, AuthLib-Injector)"
```

---

### Task 10: Rust auth commands

**Files:**
- Create: `src-tauri/src/commands/auth.rs`
- Modify: `src-tauri/src/commands/mod.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Write auth commands**

Write `src-tauri/src/commands/auth.rs`:

```rust
use crate::services::auth;
use crate::services::auth::AuthResult;

#[tauri::command]
pub async fn ms_device_code() -> Result<(String, String, String), String> {
    auth::ms_device_code().await
}

#[tauri::command]
pub async fn ms_poll_token(device_code: String) -> Result<AuthResult, String> {
    auth::ms_poll_token(&device_code).await
}

#[tauri::command]
pub fn offline_auth(username: String) -> Result<AuthResult, String> {
    Ok(auth::offline_auth(&username))
}

#[tauri::command]
pub async fn authlib_login(
    server_url: String,
    username: String,
    password: String,
) -> Result<AuthResult, String> {
    auth::authlib_login(&server_url, &username, &password).await
}
```

- [ ] **Step 2: Update commands/mod.rs**

```rust
pub mod instance;
pub mod auth;
```

- [ ] **Step 3: Register auth commands in lib.rs**

Update the `invoke_handler` in `src-tauri/src/lib.rs`:

```rust
.invoke_handler(tauri::generate_handler![
    commands::instance::list_instances,
    commands::instance::create_instance,
    commands::instance::delete_instance,
    commands::instance::get_instance,
    commands::instance::update_instance,
    commands::auth::ms_device_code,
    commands::auth::ms_poll_token,
    commands::auth::offline_auth,
    commands::auth::authlib_login,
])
```

- [ ] **Step 4: Verify compilation**

```bash
cd D:/Works/MyProject/WoxLauncher/src-tauri && cargo check
```

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/commands/auth.rs src-tauri/src/commands/mod.rs src-tauri/src/lib.rs
git commit -m "feat: add auth Tauri commands"
```

---

## Phase 4: Download Engine

### Task 11: Rust download engine

**Files:**
- Create: `src-tauri/src/services/downloader.rs`
- Modify: `src-tauri/src/services/mod.rs`

- [ ] **Step 1: Write downloader.rs**

Write `src-tauri/src/services/downloader.rs`:

```rust
use crate::models::download::{DownloadProgress, DownloadStatus};
use reqwest::Client;
use std::path::PathBuf;
use tokio::io::AsyncWriteExt;

pub async fn download_file(
    url: &str,
    dest: PathBuf,
    sha1: Option<&str>,
    on_progress: impl Fn(DownloadProgress) + Send + 'static,
) -> Result<(), String> {
    if let Some(parent) = dest.parent() {
        tokio::fs::create_dir_all(parent)
            .await
            .map_err(|e| e.to_string())?;
    }

    let client = Client::new();
    let mut request = client.get(url);

    // Resume support: if partial file exists
    let mut downloaded: u64 = 0;
    if let Ok(meta) = tokio::fs::metadata(&dest).await {
        downloaded = meta.len();
        if downloaded > 0 {
            request = request.header("Range", format!("bytes={}-", downloaded));
        }
    }

    let response = request.send().await.map_err(|e| e.to_string())?;
    let total = response.content_length().unwrap_or(0) + downloaded;
    let start_time = std::time::Instant::now();

    let mut file = if downloaded > 0 {
        tokio::fs::OpenOptions::new()
            .append(true)
            .open(&dest)
            .await
            .map_err(|e| e.to_string())?
    } else {
        tokio::fs::File::create(&dest)
            .await
            .map_err(|e| e.to_string())?
    };

    let mut stream = response.bytes_stream();
    use futures_util::StreamExt;

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| e.to_string())?;
        file.write_all(&chunk).await.map_err(|e| e.to_string())?;
        downloaded += chunk.len() as u64;

        let elapsed = start_time.elapsed().as_secs_f64();
        let speed = if elapsed > 0.0 {
            format!("{:.1} MB/s", (downloaded as f64 / 1048576.0) / elapsed)
        } else {
            "calculating...".to_string()
        };

        let percent = if total > 0 {
            (downloaded as f64 / total as f64) * 100.0
        } else {
            0.0
        };

        on_progress(DownloadProgress {
            downloaded,
            total,
            percent,
            speed,
            status: DownloadStatus::Downloading,
            file_name: dest
                .file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string(),
        });
    }

    // SHA1 verification if provided
    if let Some(expected_sha1) = sha1 {
        on_progress(DownloadProgress {
            downloaded,
            total,
            percent: 100.0,
            speed: "Verifying...".to_string(),
            status: DownloadStatus::Verifying,
            file_name: dest
                .file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string(),
        });

        let file_bytes = tokio::fs::read(&dest).await.map_err(|e| e.to_string())?;
        let mut hasher = sha1::Sha1::new();
        sha1::Digest::update(&mut hasher, &file_bytes);
        let actual = format!("{:x}", hasher.finalize());

        if actual != expected_sha1 {
            return Err(format!("SHA1 mismatch: expected {}, got {}", expected_sha1, actual));
        }
    }

    on_progress(DownloadProgress {
        downloaded,
        total,
        percent: 100.0,
        speed: "Done".to_string(),
        status: DownloadStatus::Done,
        file_name: dest
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string(),
    });

    Ok(())
}
```

- [ ] **Step 2: Add dependencies to Cargo.toml**

Modify `src-tauri/Cargo.toml` — add `futures-util` and `sha1`:

```toml
futures-util = "0.3"
sha1 = "0.10"
```

- [ ] **Step 3: Update services/mod.rs**

```rust
pub mod instance_manager;
pub mod auth;
pub mod downloader;
```

- [ ] **Step 4: Build check**

```bash
cd D:/Works/MyProject/WoxLauncher/src-tauri && cargo check
```

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/services/downloader.rs src-tauri/src/services/mod.rs src-tauri/Cargo.toml
git commit -m "feat: add generic download engine with resume and SHA1 verification"
```

---

## Phase 5: Minecraft Launch

### Task 12: Rust launch engine

**Files:**
- Create: `src-tauri/src/services/launcher.rs`
- Modify: `src-tauri/src/services/mod.rs`

- [ ] **Step 1: Write launcher.rs**

Write `src-tauri/src/services/launcher.rs`:

```rust
use crate::models::instance::InstanceConfig;
use crate::services::auth::AuthResult;
use std::path::PathBuf;
use std::process::Command;

fn get_wox_dir() -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        std::env::var("APPDATA")
            .map(PathBuf::from)
            .unwrap_or_else(|_| PathBuf::from("."))
    }
    #[cfg(target_os = "macos")]
    {
        std::env::var("HOME")
            .map(|h| PathBuf::from(h).join("Library/Application Support"))
            .unwrap_or_else(|_| PathBuf::from("."))
    }
    #[cfg(target_os = "linux")]
    {
        std::env::var("XDG_DATA_HOME")
            .map(PathBuf::from)
            .or_else(|_| {
                std::env::var("HOME")
                    .map(|h| PathBuf::from(h).join(".local/share"))
            })
            .unwrap_or_else(|_| PathBuf::from("."))
    }
}

pub fn launch_game(
    instance: &InstanceConfig,
    auth: &AuthResult,
    java_path: &str,
) -> Result<u32, String> {
    let wox_dir = get_wox_dir().join(".woxlauncher");
    let shared_dir = wox_dir.join("shared");
    let instance_dir = wox_dir.join("instances").join(&instance.id);
    let game_dir = instance_dir.join("game");

    // Build classpath from libraries
    let libraries_dir = shared_dir.join("libraries");
    let versions_dir = shared_dir.join("versions");

    // Read version JSON to get args and libraries
    let version_json_path =
        versions_dir.join(&instance.game_version).join(format!("{}.json", instance.game_version));
    if !version_json_path.exists() {
        return Err(format!(
            "Game version {} is not downloaded. Please download it first.",
            instance.game_version
        ));
    }

    let version_json: serde_json::Value =
        serde_json::from_str(&std::fs::read_to_string(&version_json_path).map_err(|e| e.to_string())?)
            .map_err(|e| e.to_string())?;

    // Build classpath
    let mut classpath = Vec::new();
    if let Some(libs) = version_json["libraries"].as_array() {
        for lib in libs {
            let name = lib["name"].as_str().unwrap_or("");
            let lib_path = get_library_path(name, &libraries_dir);
            if lib_path.exists() {
                classpath.push(lib_path.to_string_lossy().to_string());
            }
        }
    }
    // Add the game JAR
    let game_jar = versions_dir
        .join(&instance.game_version)
        .join(format!("{}.jar", instance.game_version));
    if game_jar.exists() {
        classpath.push(game_jar.to_string_lossy().to_string());
    }

    // Build JVM args from version JSON
    let mut jvm_args: Vec<String> = if let Some(args) = version_json["arguments"]["jvm"].as_array() {
        args.iter()
            .filter_map(|a| a.as_str().map(String::from))
            .collect()
    } else {
        vec![]
    };

    // Add instance's custom JVM args
    jvm_args.extend(instance.jvm_args.clone());

    // Replace placeholders
    let classpath_separator = if cfg!(target_os = "windows") { ";" } else { ":" };
    let natives_dir = shared_dir
        .join("versions")
        .join(&instance.game_version)
        .join("natives");

    let replaced_jvm_args: Vec<String> = jvm_args
        .iter()
        .map(|arg| {
            arg.replace("${classpath}", &classpath.join(classpath_separator))
                .replace("${natives_directory}", &natives_dir.to_string_lossy())
                .replace(
                    "${library_directory}",
                    &libraries_dir.to_string_lossy(),
                )
                .replace("${launcher_name}", "WoxLauncher")
                .replace("${launcher_version}", "0.1.0")
        })
        .collect();

    // Build game args from version JSON
    let mut game_args: Vec<String> =
        if let Some(args) = version_json["arguments"]["game"].as_array() {
            args.iter()
                .filter_map(|a| a.as_str().map(String::from))
                .collect()
        } else if let Some(args_str) = version_json["minecraftArguments"].as_str() {
            args_str.split(' ').map(String::from).collect()
        } else {
            vec![]
        };

    game_args.extend(instance.game_args.clone());

    let main_class = version_json["mainClass"]
        .as_str()
        .unwrap_or("net.minecraft.client.main.Main");

    // Replace placeholders in game args
    let replaced_game_args: Vec<String> = game_args
        .iter()
        .map(|arg| {
            arg.replace("${auth_player_name}", &auth.username)
                .replace("${auth_uuid}", &auth.uuid)
                .replace("${auth_access_token}", &auth.access_token)
                .replace("${user_type}", &auth.token_type)
                .replace(
                    "${version_name}",
                    &instance.game_version,
                )
                .replace("${game_directory}", &game_dir.to_string_lossy())
                .replace(
                    "${assets_root}",
                    &shared_dir.join("assets").to_string_lossy(),
                )
                .replace("${assets_index_name}", &instance.game_version)
                .replace("${auth_xuid}", "")
                .replace("${clientid}", "")
                .replace(
                    "${resolution_width}",
                    &instance.resolution_width.to_string(),
                )
                .replace(
                    "${resolution_height}",
                    &instance.resolution_height.to_string(),
                )
        })
        .collect();

    // Assemble full command
    let mut cmd = Command::new(java_path);
    cmd.args(&replaced_jvm_args);
    cmd.arg(main_class);
    cmd.args(&replaced_game_args);
    cmd.current_dir(&instance_dir);

    // Detach process
    let child = cmd.spawn().map_err(|e| format!("Failed to launch: {}", e))?;
    let pid = child.id();

    Ok(pid)
}

fn get_library_path(name: &str, libraries_dir: &PathBuf) -> PathBuf {
    // Convert Maven coordinate to path: "com.mojang:logging:1.0.0" -> com/mojang/logging/1.0.0/logging-1.0.0.jar
    let parts: Vec<&str> = name.split(':').collect();
    if parts.len() < 3 {
        return libraries_dir.join(name);
    }
    let (group, artifact, version) = (parts[0], parts[1], parts[2]);
    let group_path = group.replace('.', '/');
    libraries_dir.join(format!(
        "{}/{}/{}/{}-{}.jar",
        group_path, artifact, version, artifact, version
    ))
}
```

- [ ] **Step 2: Update services/mod.rs**

```rust
pub mod instance_manager;
pub mod auth;
pub mod downloader;
pub mod launcher;
```

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/services/launcher.rs src-tauri/src/services/mod.rs
git commit -m "feat: add Minecraft launch engine"
```

---

### Task 13: Rust launch commands

**Files:**
- Create: `src-tauri/src/commands/launch.rs`
- Modify: `src-tauri/src/commands/mod.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Write launch commands**

Write `src-tauri/src/commands/launch.rs`:

```rust
use crate::models::instance::InstanceConfig;
use crate::services::auth::AuthResult;
use crate::services::launcher;

#[tauri::command]
pub fn launch_game(instance: InstanceConfig, auth: AuthResult, java_path: String) -> Result<u32, String> {
    launcher::launch_game(&instance, &auth, &java_path)
}
```

- [ ] **Step 2: Update commands/mod.rs**

```rust
pub mod instance;
pub mod auth;
pub mod launch;
```

- [ ] **Step 3: Register in lib.rs**

```rust
.invoke_handler(tauri::generate_handler![
    commands::instance::list_instances,
    commands::instance::create_instance,
    commands::instance::delete_instance,
    commands::instance::get_instance,
    commands::instance::update_instance,
    commands::auth::ms_device_code,
    commands::auth::ms_poll_token,
    commands::auth::offline_auth,
    commands::auth::authlib_login,
    commands::launch::launch_game,
])
```

- [ ] **Step 4: Verify compilation**

```bash
cd D:/Works/MyProject/WoxLauncher/src-tauri && cargo check
```

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/commands/launch.rs src-tauri/src/commands/mod.rs src-tauri/src/lib.rs
git commit -m "feat: add launch game Tauri command"
```

---

## Phase 6: Java Runtime Management

### Task 14: Rust Java manager service + commands

**Files:**
- Create: `src-tauri/src/services/java_manager.rs`
- Modify: `src-tauri/src/services/mod.rs`
- Create: `src-tauri/src/commands/java.rs`
- Modify: `src-tauri/src/commands/mod.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Write java_manager.rs**

Write `src-tauri/src/services/java_manager.rs`:

```rust
use crate::models::java::{JavaRuntime, JavaVendor};
use crate::services::downloader;
use std::path::PathBuf;

fn get_wox_dir() -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        std::env::var("APPDATA")
            .map(PathBuf::from)
            .unwrap_or_else(|_| PathBuf::from("."))
    }
    #[cfg(target_os = "macos")]
    {
        std::env::var("HOME")
            .map(|h| PathBuf::from(h).join("Library/Application Support"))
            .unwrap_or_else(|_| PathBuf::from("."))
    }
    #[cfg(target_os = "linux")]
    {
        std::env::var("XDG_DATA_HOME")
            .map(PathBuf::from)
            .or_else(|_| {
                std::env::var("HOME")
                    .map(|h| PathBuf::from(h).join(".local/share"))
            })
            .unwrap_or_else(|_| PathBuf::from("."))
    }
}

fn java_dir() -> PathBuf {
    get_wox_dir().join(".woxlauncher").join("java")
}

/// Detect installed Java runtimes (both system and managed)
pub fn detect_installed() -> Result<Vec<JavaRuntime>, String> {
    let mut runtimes = Vec::new();

    // Check managed Java dir
    let managed = java_dir();
    if managed.exists() {
        if let Ok(entries) = std::fs::read_dir(&managed) {
            for entry in entries.flatten() {
                let java_exe = if cfg!(target_os = "windows") {
                    entry.path().join("bin").join("java.exe")
                } else {
                    entry.path().join("bin").join("java")
                };
                if java_exe.exists() {
                    let folder_name = entry.file_name().to_string_lossy().to_string();
                    let (vendor, version) = parse_java_folder(&folder_name);
                    runtimes.push(JavaRuntime {
                        id: format!("managed-{}", entry.file_name().to_string_lossy()),
                        vendor,
                        version,
                        path: java_exe.to_string_lossy().to_string(),
                        installed: true,
                    });
                }
            }
        }
    }

    // Check JAVA_HOME
    if let Ok(java_home) = std::env::var("JAVA_HOME") {
        let java_exe = if cfg!(target_os = "windows") {
            PathBuf::from(&java_home).join("bin").join("java.exe")
        } else {
            PathBuf::from(&java_home).join("bin").join("java")
        };
        if java_exe.exists() {
            runtimes.push(JavaRuntime {
                id: "system-java-home".to_string(),
                vendor: JavaVendor::Adoptium, // best guess
                version: detect_java_version(&java_exe.to_string_lossy()),
                path: java_exe.to_string_lossy().to_string(),
                installed: true,
            });
        }
    }

    // Check PATH for java
    if let Ok(output) = std::process::Command::new(if cfg!(target_os = "windows") { "where" } else { "which" })
        .arg("java")
        .output()
    {
        if output.status.success() {
            let path = String::from_utf8_lossy(&output.stdout)
                .lines()
                .next()
                .unwrap_or("")
                .trim()
                .to_string();
            if !path.is_empty() && !runtimes.iter().any(|r| r.path == path) {
                runtimes.push(JavaRuntime {
                    id: "system-path".to_string(),
                    vendor: JavaVendor::Adoptium,
                    version: detect_java_version(&path),
                    path,
                    installed: true,
                });
            }
        }
    }

    Ok(runtimes)
}

fn detect_java_version(java_path: &str) -> String {
    if let Ok(output) = std::process::Command::new(java_path).arg("-version").output()
    {
        // Parse "java version "1.8.0"" or "openjdk version "17.0.1""
        let stderr = String::from_utf8_lossy(&output.stderr);
        for part in stderr.split('"') {
            if part.contains('.') && part.chars().any(|c| c.is_ascii_digit()) {
                return part.to_string();
            }
        }
    }
    "unknown".to_string()
}

fn parse_java_folder(name: &str) -> (JavaVendor, String) {
    let lower = name.to_lowercase();
    let vendor = if lower.contains("zulu") {
        JavaVendor::Zulu
    } else if lower.contains("oracle") {
        JavaVendor::Oracle
    } else if lower.contains("graalvm") {
        JavaVendor::GraalVM
    } else {
        JavaVendor::Adoptium
    };
    // Extract version: "zulu-17.0.1" -> "17.0.1"
    let version = name
        .split('-')
        .last()
        .unwrap_or(name)
        .to_string();
    (vendor, version)
}
```

- [ ] **Step 2: Write java commands**

Write `src-tauri/src/commands/java.rs`:

```rust
use crate::models::java::JavaRuntime;
use crate::services::java_manager;

#[tauri::command]
pub fn detect_java() -> Result<Vec<JavaRuntime>, String> {
    java_manager::detect_installed()
}
```

- [ ] **Step 3: Update services/mod.rs and commands/mod.rs**

`src-tauri/src/services/mod.rs`:
```rust
pub mod instance_manager;
pub mod auth;
pub mod downloader;
pub mod launcher;
pub mod java_manager;
```

`src-tauri/src/commands/mod.rs`:
```rust
pub mod instance;
pub mod auth;
pub mod launch;
pub mod java;
```

- [ ] **Step 4: Register in lib.rs**

```rust
.invoke_handler(tauri::generate_handler![
    commands::instance::list_instances,
    commands::instance::create_instance,
    commands::instance::delete_instance,
    commands::instance::get_instance,
    commands::instance::update_instance,
    commands::auth::ms_device_code,
    commands::auth::ms_poll_token,
    commands::auth::offline_auth,
    commands::auth::authlib_login,
    commands::launch::launch_game,
    commands::java::detect_java,
])
```

- [ ] **Step 5: Verify compilation**

```bash
cd D:/Works/MyProject/WoxLauncher/src-tauri && cargo check
```

- [ ] **Step 6: Commit**

```bash
git add src-tauri/src/services/java_manager.rs src-tauri/src/services/mod.rs src-tauri/src/commands/java.rs src-tauri/src/commands/mod.rs src-tauri/src/lib.rs
git commit -m "feat: add Java runtime detection service and commands"
```

---

### Task 15: Java manager frontend

**Files:**
- Create: `src/stores/javaStore.ts`
- Modify: `src/pages/JavaManager.tsx`

- [ ] **Step 1: Write javaStore**

Write `src/stores/javaStore.ts`:

```typescript
import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { JavaRuntime } from "../types";

interface JavaState {
  runtimes: JavaRuntime[];
  loading: boolean;
  fetchRuntimes: () => Promise<void>;
}

export const useJavaStore = create<JavaState>((set) => ({
  runtimes: [],
  loading: false,

  fetchRuntimes: async () => {
    set({ loading: true });
    const runtimes = await invoke<JavaRuntime[]>("detect_java");
    set({ runtimes, loading: false });
  },
}));
```

- [ ] **Step 2: Write JavaManager page**

Write `src/pages/JavaManager.tsx`:

```typescript
import { useEffect } from "react";
import {
  Typography,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Chip,
  Button,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useJavaStore } from "../stores/javaStore";

export default function JavaManager() {
  const { runtimes, loading, fetchRuntimes } = useJavaStore();

  useEffect(() => {
    fetchRuntimes();
  }, []);

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
        <Typography variant="h4" fontWeight={600}>
          Java Runtimes
        </Typography>
        <Button startIcon={<RefreshIcon />} onClick={fetchRuntimes}>
          Refresh
        </Button>
      </Box>

      {loading ? (
        <CircularProgress />
      ) : runtimes.length === 0 ? (
        <Typography color="text.secondary">
          No Java runtimes detected. Install one to get started.
        </Typography>
      ) : (
        runtimes.map((rt) => (
          <Card key={rt.id} sx={{ mb: 2 }}>
            <CardContent
              sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
            >
              <Box>
                <Typography variant="h6">
                  {rt.vendor} {rt.version}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontFamily: "monospace" }}>
                  {rt.path}
                </Typography>
              </Box>
              <Chip label={rt.id} size="small" color="primary" variant="outlined" />
            </CardContent>
          </Card>
        ))
      )}
    </Box>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd D:/Works/MyProject/WoxLauncher && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/stores/javaStore.ts src/pages/JavaManager.tsx
git commit -m "feat: add Java runtime manager frontend"
```

---

## Phase 7: Mod Browser

### Task 16: Modrinth API service

**Files:**
- Create: `src/services/modrinth.ts`

- [ ] **Step 1: Write Modrinth API client**

Write `src/services/modrinth.ts`:

```typescript
import type { ModResult } from "../types";

const BASE = "https://api.modrinth.com/v2";

export async function searchModrinth(query: string, version?: string): Promise<ModResult[]> {
  const facets = version ? `&facets=[["versions:${version}"]]` : "";
  const url = `${BASE}/search?query=${encodeURIComponent(query)}&limit=20${facets}`;

  const resp = await fetch(url, {
    headers: { "User-Agent": "WoxLauncher/0.1.0" },
  });
  if (!resp.ok) throw new Error(`Modrinth API error: ${resp.status}`);

  const data = await resp.json();
  return data.hits.map((hit: any) => ({
    id: hit.project_id,
    source: "modrinth" as const,
    name: hit.title,
    summary: hit.description,
    iconUrl: hit.icon_url || "",
    downloads: hit.downloads || 0,
    categories: hit.categories || [],
    versions: hit.versions || [],
    author: hit.author || "",
  }));
}

export async function getModrinthMod(projectId: string): Promise<ModResult> {
  const url = `${BASE}/project/${projectId}`;
  const resp = await fetch(url, {
    headers: { "User-Agent": "WoxLauncher/0.1.0" },
  });
  if (!resp.ok) throw new Error(`Modrinth API error: ${resp.status}`);
  const data = await resp.json();
  return {
    id: data.id,
    source: "modrinth",
    name: data.title,
    summary: data.description,
    iconUrl: data.icon_url || "",
    downloads: data.downloads || 0,
    categories: data.categories || [],
    versions: data.game_versions || [],
    author: data.team || "",
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/modrinth.ts
git commit -m "feat: add Modrinth API client"
```

---

### Task 17: Mod browser frontend

**Files:**
- Create: `src/hooks/useModSearch.ts`
- Create: `src/components/mod/SourceTabs.tsx`
- Create: `src/components/mod/ModCard.tsx`
- Modify: `src/pages/ModBrowser.tsx`

- [ ] **Step 1: Write useModSearch hook**

Write `src/hooks/useModSearch.ts`:

```typescript
import { useQuery } from "@tanstack/react-query";
import { searchModrinth } from "../services/modrinth";
import type { ModSource } from "../types";

export function useModSearch(query: string, source: ModSource, version?: string) {
  return useQuery({
    queryKey: ["mods", source, query, version],
    queryFn: async () => {
      if (!query.trim()) return [];
      switch (source) {
        case "modrinth":
          return searchModrinth(query, version);
        default:
          return [];
      }
    },
    enabled: query.trim().length > 0,
  });
}
```

- [ ] **Step 2: Write SourceTabs**

Write `src/components/mod/SourceTabs.tsx`:

```typescript
import { ToggleButtonGroup, ToggleButton } from "@mui/material";
import type { ModSource } from "../../types";

interface Props {
  value: ModSource;
  onChange: (source: ModSource) => void;
}

const sources: { value: ModSource; label: string }[] = [
  { value: "modrinth", label: "Modrinth" },
  { value: "curseforge", label: "CurseForge" },
  { value: "mcmod", label: "MCMod" },
];

export default function SourceTabs({ value, onChange }: Props) {
  return (
    <ToggleButtonGroup
      value={value}
      exclusive
      onChange={(_, v) => v && onChange(v)}
      size="small"
      sx={{ mb: 2 }}
    >
      {sources.map((s) => (
        <ToggleButton key={s.value} value={s.value}>
          {s.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
```

- [ ] **Step 3: Write ModCard**

Write `src/components/mod/ModCard.tsx`:

```typescript
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  Chip,
  Box,
} from "@mui/material";
import type { ModResult } from "../../types";

interface Props {
  mod: ModResult;
}

const sourceColor: Record<string, "primary" | "secondary" | "success"> = {
  modrinth: "primary",
  curseforge: "secondary",
  mcmod: "success",
};

export default function ModCard({ mod }: Props) {
  const navigate = useNavigate();

  return (
    <Card
      sx={{ display: "flex", mb: 2, cursor: "pointer" }}
      onClick={() => navigate(`/mods/${mod.id}`)}
    >
      {mod.iconUrl && (
        <CardMedia
          component="img"
          sx={{ width: 100, objectFit: "contain", p: 1 }}
          image={mod.iconUrl}
          alt={mod.name}
        />
      )}
      <CardContent sx={{ flex: 1 }}>
        <Box sx={{ display: "flex", gap: 1, mb: 0.5 }}>
          <Typography variant="h6">{mod.name}</Typography>
          <Chip label={mod.source} size="small" color={sourceColor[mod.source] || "default"} />
        </Box>
        <Typography variant="body2" color="text.secondary" noWrap>
          {mod.summary}
        </Typography>
        <Box sx={{ display: "flex", gap: 0.5, mt: 1, flexWrap: "wrap" }}>
          {mod.categories.slice(0, 3).map((cat) => (
            <Chip key={cat} label={cat} size="small" variant="outlined" />
          ))}
          <Typography variant="caption" color="text.secondary" sx={{ ml: "auto" }}>
            {mod.downloads.toLocaleString()} downloads
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: Write ModBrowser page**

Write `src/pages/ModBrowser.tsx`:

```typescript
import { useState } from "react";
import { Typography, Box, TextField, CircularProgress } from "@mui/material";
import { useModSearch } from "../hooks/useModSearch";
import SourceTabs from "../components/mod/SourceTabs";
import ModCard from "../components/mod/ModCard";
import type { ModSource } from "../types";

export default function ModBrowser() {
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<ModSource>("modrinth");
  const { data: results, isLoading } = useModSearch(query, source);

  return (
    <Box>
      <Typography variant="h4" fontWeight={600} mb={3}>
        Mod Browser
      </Typography>

      <TextField
        fullWidth
        placeholder="Search mods..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        sx={{ mb: 2 }}
      />

      <SourceTabs value={source} onChange={setSource} />

      {isLoading && <CircularProgress sx={{ display: "block", mx: "auto", mt: 4 }} />}

      {results?.map((mod) => (
        <ModCard key={`${mod.source}-${mod.id}`} mod={mod} />
      ))}

      {results?.length === 0 && query && !isLoading && (
        <Typography color="text.secondary" sx={{ mt: 4, textAlign: "center" }}>
          No results found for "{query}"
        </Typography>
      )}
    </Box>
  );
}
```

- [ ] **Step 5: Verify TypeScript and commit**

```bash
cd D:/Works/MyProject/WoxLauncher && npx tsc --noEmit
```

```bash
git add src/hooks/useModSearch.ts src/components/mod/ src/pages/ModBrowser.tsx
git commit -m "feat: add mod browser with Modrinth search"
```

---

## Phase 8: Instance Detail & Settings

### Task 18: Instance detail page

**Files:**
- Modify: `src/pages/InstanceDetail.tsx`

- [ ] **Step 1: Write InstanceDetail page**

Write `src/pages/InstanceDetail.tsx`:

```typescript
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  Chip,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import { invoke } from "@tauri-apps/api/core";
import type { InstanceConfig } from "../types";

export default function InstanceDetail() {
  const { id } = useParams<{ id: string }>();
  const [instance, setInstance] = useState<InstanceConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchInstance = async () => {
    if (!id) return;
    const data = await invoke<InstanceConfig>("get_instance", { id });
    setInstance(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchInstance();
  }, [id]);

  const handleLaunch = async () => {
    if (!instance) return;
    // Will wire to auth and Java selection in future
    alert(
      `Launching ${instance.name}... (Auth & Java selection coming in next iteration)`
    );
  };

  if (loading) return <CircularProgress />;
  if (!instance) return <Typography>Instance not found</Typography>;

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
        <Typography variant="h4" fontWeight={600}>
          {instance.name}
        </Typography>
        <Button variant="contained" startIcon={<PlayArrowIcon />} onClick={handleLaunch}>
          Launch
        </Button>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" mb={2}>
            Configuration
          </Typography>
          <List dense>
            <ListItem>
              <ListItemText
                primary="Game Version"
                secondary={instance.gameVersion}
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Loader"
                secondary={<Chip label={instance.loaderType} size="small" />}
              />
            </ListItem>
            <ListItem>
              <ListItemText primary="Java" secondary={`Version ${instance.javaVersion}`} />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Resolution"
                secondary={`${instance.resolutionWidth} x ${instance.resolutionHeight}`}
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="JVM Args"
                secondary={instance.jvmArgs.join(" ")}
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Created"
                secondary={new Date(instance.createdAt).toLocaleDateString()}
              />
            </ListItem>
          </List>
        </CardContent>
      </Card>
    </Box>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd D:/Works/MyProject/WoxLauncher && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/InstanceDetail.tsx
git commit -m "feat: add instance detail page with config display and launch button"
```

---

### Task 19: Settings page

**Files:**
- Modify: `src/pages/Settings.tsx`

- [ ] **Step 1: Write Settings page**

Write `src/pages/Settings.tsx`:

```typescript
import { Typography, Box, Card, CardContent, List, ListItem, ListItemText, Switch } from "@mui/material";

export default function Settings() {
  return (
    <Box>
      <Typography variant="h4" fontWeight={600} mb={3}>
        Settings
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" mb={2}>
            General
          </Typography>
          <List>
            <ListItem>
              <ListItemText
                primary="Keep launcher open after game starts"
                secondary="Launcher stays available while playing"
              />
              <Switch defaultChecked />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Download path"
                secondary="~/.woxlauncher"
              />
            </ListItem>
          </List>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" mb={2}>
            About
          </Typography>
          <List>
            <ListItem>
              <ListItemText primary="WoxLauncher" secondary="Version 0.1.0" />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Built with"
                secondary="Tauri 2 + React 19 + MUI"
              />
            </ListItem>
          </List>
        </CardContent>
      </Card>
    </Box>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/Settings.tsx
git commit -m "feat: add settings page"
```

---

## Plan Summary

**Total: 19 tasks across 8 phases**
**Estimated file count: ~45 files created/modified**

### MVP Checklist
- [x] Phase 1: Project foundation (MUI, routing, layout) — Tasks 1-5
- [x] Phase 2: Instance management (CRUD backend + UI) — Tasks 6-8
- [x] Phase 3: Authentication (MS OAuth, offline, AuthLib) — Tasks 9-10
- [x] Phase 4: Download engine (resume, SHA1) — Task 11
- [x] Phase 5: Minecraft launch engine — Tasks 12-13
- [x] Phase 6: Java runtime management — Tasks 14-15
- [x] Phase 7: Mod browser (Modrinth) — Tasks 16-17
- [x] Phase 8: Instance detail + Settings — Tasks 18-19

### Post-MVP (not in this plan)
- CurseForge API (requires API key registration)
- MCMod API integration
- Java runtime downloads (only detection for now)
- Full launch flow wiring (auth → Java → launch)
- Mod download and installation
- Theme toggle (dark/light)
- Fabric/Forge/Quilt installer support
- System tray integration

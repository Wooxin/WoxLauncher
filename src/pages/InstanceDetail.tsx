import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Typography, Box, Card, CardContent, Button, Chip, IconButton,
  CircularProgress, TextField, MenuItem, Tabs, Tab, Snackbar, Alert, Switch, List, ListItem, ListItemText,
  Dialog, DialogTitle, DialogContent, Divider,
} from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import SaveIcon from "@mui/icons-material/Save";
import DownloadIcon from "@mui/icons-material/Download";
import DeleteIcon from "@mui/icons-material/Delete";
import InventoryIcon from "@mui/icons-material/Inventory";
import BackupIcon from "@mui/icons-material/Backup";
import UpdateIcon from "@mui/icons-material/Update";
import { invoke } from "@tauri-apps/api/core";
import { useTranslation } from "react-i18next";
import { ALL_LOADERS } from "../constants";
import { useJavaStore } from "../stores/javaStore";
import { useAccountStore } from "../stores/accountStore";
import { useSettingsStore } from "../stores/settingsStore";
import { useModSearch } from "../hooks/useModSearch";
import { getModrinthDownloadUrl, getModrinthVersions } from "../services/modrinth";
import { getCurseForgeDownloadUrl } from "../services/curseforge";
import LoginDialog from "../components/account/LoginDialog";
import { formatError } from "../utils/error";
import { getRequiredJavaMajor, selectRuntimeForGameVersion } from "../utils/java";
import type { InstanceConfig, JavaVendor, LoaderType, LocalModFile, ModResult, ModSource, ModVersionFile } from "../types";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null;
}

export default function InstanceDetail() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const [instance, setInstance] = useState<InstanceConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const [editName, setEditName] = useState("");
  const [editGameVersion, setEditGameVersion] = useState("");
  const [editLoader, setEditLoader] = useState<LoaderType>("vanilla");
  const [editJava, setEditJava] = useState("");
  const [editJvmArgs, setEditJvmArgs] = useState("");
  const [editResW, setEditResW] = useState(1920);
  const [editResH, setEditResH] = useState(1080);
  const [editFullscreen, setEditFullscreen] = useState(false);
  const [useInstanceSettings, setUseInstanceSettings] = useState(false);
  const [javaVendor, setJavaVendor] = useState<JavaVendor>("adoptium");
  const [javaDownloading, setJavaDownloading] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" | "info" }>({
    open: false, message: "", severity: "info"
  });
  const [loginOpen, setLoginOpen] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [modView, setModView] = useState<"local" | "download">("local");

  const { runtimes, fetchRuntimes } = useJavaStore();
  const globalSettings = useSettingsStore();
  const activeAccount = useAccountStore(s => s.activeAccount);
  const fetchAccounts = useAccountStore(s => s.fetchAccounts);
  const [modQuery, setModQuery] = useState("");
  const [modVersion, setModVersion] = useState("");
  const [modCategory, setModCategory] = useState("");
  const [modSource, setModSource] = useState<ModSource>("modrinth");
  const [localModQuery, setLocalModQuery] = useState("");
  const [localMods, setLocalMods] = useState<LocalModFile[]>([]);
  const [localModsLoading, setLocalModsLoading] = useState(false);
  const [selectedMod, setSelectedMod] = useState<ModResult | null>(null);
  const [selectedModVersions, setSelectedModVersions] = useState<ModVersionFile[]>([]);
  const [selectedModVersionsLoading, setSelectedModVersionsLoading] = useState(false);
  const selectedModVersion = modVersion || instance?.gameVersion || "";
  const { data: modResults, isLoading: modResultsLoading } = useModSearch(modQuery, modSource, selectedModVersion);
  const visibleModResults = modCategory
    ? modResults?.filter((mod) => mod.categories.some((cat) => cat.toLowerCase() === modCategory.toLowerCase()))
    : modResults;
  const visibleLocalMods = localMods.filter((mod) =>
    mod.fileName.toLowerCase().includes(localModQuery.trim().toLowerCase())
  );
  const recommendedModVersion = selectedModVersions[0] || null;
  const groupedModVersions = selectedModVersions.reduce<Record<string, ModVersionFile[]>>((acc, version) => {
    const key = version.gameVersions.join(", ") || "Unknown";
    acc[key] = acc[key] || [];
    acc[key].push(version);
    return acc;
  }, {});

  // Fetch versions for dropdown
  const [releaseVersions, setReleaseVersions] = useState<{ id: string; versionType: string }[]>([]);
  useEffect(() => {
    invoke<{ id: string; versionType: string }[]>("fetch_version_manifest")
      .then(v => setReleaseVersions(v.filter((v: any) => v.versionType === "release")))
      .catch(() => {});
  }, []);

  const MOD_CATEGORIES = ["Adventure", "Combat", "Decoration", "Food", "Magic", "Optimization", "Technology", "Utility", "World Gen"];

  const fetchInstance = async () => {
    if (!id) return;
    const data = await invoke<InstanceConfig>("get_instance", { id });
    setInstance(data);
    setEditName(data.name);
    setEditGameVersion(data.gameVersion);
    setEditLoader(data.loaderType);
    setEditJava(data.javaVersion);
    setEditJvmArgs(data.jvmArgs.join(" "));
    setEditResW(data.resolutionWidth);
    setEditResH(data.resolutionHeight);
    setEditFullscreen(data.fullscreen || false);
    setUseInstanceSettings(data.useInstanceSettings || false);
    setLoading(false);
  };

  const fetchLocalMods = async () => {
    if (!id) return;
    try {
      setLocalModsLoading(true);
      const mods = await invoke<LocalModFile[]>("list_local_mods", { instanceId: id });
      setLocalMods(mods);
    } catch (e) {
      setSnackbar({ open: true, message: formatError(e), severity: "error" });
    } finally {
      setLocalModsLoading(false);
    }
  };

  useEffect(() => {
    fetchInstance();
    fetchAccounts();
    fetchRuntimes();
    fetchLocalMods();
  }, [id]);

  // Auto-select Java runtime matching the instance
  useEffect(() => {
    if (instance && runtimes.length > 0 && editJava) {
      const match = runtimes.find(r => r.path.includes(editJava) || r.version === editJava);
      if (match) setEditJava(match.path);
    }
  }, [instance, runtimes]);

  const handleSave = async () => {
    if (!instance) return;
    const updated: InstanceConfig = {
      ...instance,
      name: editName,
      gameVersion: editGameVersion,
      loaderType: editLoader,
      javaVersion: editJava,
      jvmArgs: editJvmArgs.split(" ").filter(Boolean),
      resolutionWidth: editResW,
      resolutionHeight: editResH,
      fullscreen: editFullscreen,
      useInstanceSettings,
    };
    try {
      await invoke("update_instance", { config: updated });
      setInstance(updated);
      setSnackbar({ open: true, message: t("instance.saved"), severity: "success" });
    } catch (e) {
      setSnackbar({ open: true, message: formatError(e), severity: "error" });
    }
  };

  const handleLaunch = async () => {
    if (!instance) return;
    if (!activeAccount) {
      setLoginOpen(true);
      return;
    }

    const effectiveJvmArgs = useInstanceSettings
      ? editJvmArgs.split(" ").filter(Boolean)
      : globalSettings.defaultJvmArgs.split(" ").filter(Boolean);
    const effectiveInstance: InstanceConfig = {
      ...instance,
      javaVersion: useInstanceSettings ? editJava : "",
      jvmArgs: effectiveJvmArgs,
      resolutionWidth: useInstanceSettings ? editResW : globalSettings.resolutionWidth,
      resolutionHeight: useInstanceSettings ? editResH : globalSettings.resolutionHeight,
      fullscreen: useInstanceSettings ? editFullscreen : globalSettings.fullscreen,
    };
    const runtime = selectRuntimeForGameVersion(
      runtimes,
      instance.gameVersion,
      useInstanceSettings ? editJava : undefined,
    );
    const javaPath = runtime?.path || (useInstanceSettings ? editJava : "") || "java";
    try {
      setLaunching(true);
      await invoke("launch_game", { instance: effectiveInstance, accountUuid: activeAccount.uuid, javaPath });
      setInstance({ ...instance, downloaded: true, lastPlayedAt: new Date().toISOString() });
      setSnackbar({ open: true, message: t("launch.launched"), severity: "success" });
    } catch (e) {
      setSnackbar({ open: true, message: formatError(e), severity: "error" });
    } finally {
      setLaunching(false);
    }
  };

  const handleDownloadJava = async () => {
    if (!instance) return;
    const version = String(getRequiredJavaMajor(instance.gameVersion));
    try {
      setJavaDownloading(true);
      const path = await invoke<string>("download_java", {
        vendor: javaVendor,
        version,
        installPath: null,
      });
      await fetchRuntimes();
      setEditJava(path);
      setSnackbar({ open: true, message: `Java ${version} 已安装`, severity: "success" });
    } catch (e) {
      setSnackbar({ open: true, message: formatError(e), severity: "error" });
    } finally {
      setJavaDownloading(false);
    }
  };

  const handleBackupLocalMod = async (fileName: string) => {
    if (!instance) return;
    try {
      const dest = await invoke<string>("backup_local_mod", { instanceId: instance.id, fileName });
      setSnackbar({ open: true, message: `已备份到 ${dest}`, severity: "success" });
    } catch (e) {
      setSnackbar({ open: true, message: formatError(e), severity: "error" });
    }
  };

  const handleDeleteLocalMod = async (fileName: string) => {
    if (!instance) return;
    try {
      await invoke("delete_local_mod", { instanceId: instance.id, fileName });
      await fetchLocalMods();
      setSnackbar({ open: true, message: `已删除 ${fileName}`, severity: "success" });
    } catch (e) {
      setSnackbar({ open: true, message: formatError(e), severity: "error" });
    }
  };

  const handleFindLocalModUpdate = (fileName: string) => {
    const query = fileName
      .replace(/\.jar(\.disabled)?$/i, "")
      .replace(/[-_]?(\d+\.)+\d+.*$/i, "")
      .replace(/[-_]+/g, " ")
      .trim();
    setModSource("modrinth");
    setModVersion("");
    setModQuery(query || fileName.replace(/\.jar(\.disabled)?$/i, ""));
    setModView("download");
    setSnackbar({ open: true, message: "已按本地 MOD 文件名搜索可更新版本，请确认后下载。", severity: "info" });
  };


  const openModDownloadDetail = async (mod: ModResult) => {
    setSelectedMod(mod);
    setSelectedModVersions([]);
    if (mod.source !== "modrinth" || !instance) return;
    try {
      setSelectedModVersionsLoading(true);
      const recommended = await getModrinthVersions(mod.id, instance.gameVersion, instance.loaderType);
      const all = await getModrinthVersions(mod.id);
      const seen = new Set<string>();
      setSelectedModVersions([...recommended, ...all].filter((version) => {
        if (seen.has(version.versionId)) return false;
        seen.add(version.versionId);
        return true;
      }));
    } catch (e) {
      setSnackbar({ open: true, message: formatError(e), severity: "error" });
    } finally {
      setSelectedModVersionsLoading(false);
    }
  };

  const downloadOnlineMod = async (mod: ModResult, file?: ModVersionFile) => {
    if (!instance) return;
    try {
      let dl: { url: string; filename: string; sha1?: string } | null = file
        ? { url: file.url, filename: file.fileName, sha1: file.sha1 }
        : null;
      if (!dl && mod.source === "modrinth") {
        dl = await getModrinthDownloadUrl(mod.id, instance.gameVersion, instance.loaderType);
      } else if (!dl && mod.source === "curseforge") {
        dl = await getCurseForgeDownloadUrl(mod.id, instance.gameVersion);
      }
      if (!dl) {
        setSnackbar({ open: true, message: t("mod.noDownloadUrl", { name: mod.name }), severity: "error" });
        return;
      }
      await invoke("install_mod_to_instance", {
        instanceId: instance.id,
        url: dl.url,
        fileName: dl.filename,
        sha1: dl.sha1 || null,
        label: `${mod.name} (${dl.filename})`,
      });
      await fetchLocalMods();
      setSnackbar({ open: true, message: t("mod.downloaded", { name: mod.name }), severity: "success" });
    } catch (err) {
      setSnackbar({ open: true, message: formatError(err), severity: "error" });
    }
  };

  if (loading) return <CircularProgress />;
  if (!instance) return <Typography>{t("instance.notFound")}</Typography>;

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          {instance.name}
        </Typography>
        <Button variant="contained" startIcon={launching ? <CircularProgress size={18} color="inherit" /> : <PlayArrowIcon />} onClick={handleLaunch} disabled={launching}>
          {launching ? t("launch.starting") : t("instance.launch")}
        </Button>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tab label={t("instance.configuration")} />
        <Tab label={t("nav.modBrowser")} />
        <Tab label={t("instance.java")} />
      </Tabs>

      <TabPanel value={tab} index={0}>
        <Card>
          <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField label={t("instance.instanceName")} value={editName} onChange={(e) => setEditName(e.target.value)} fullWidth />
            <TextField
              label={t("instance.gameVersion")}
              value={editGameVersion}
              helperText="实例创建后游戏版本固定，避免误改导致文件和配置不一致"
              fullWidth
              disabled
            />
            <List disablePadding>
              <ListItem disablePadding>
                <ListItemText primary="使用独立实例配置" secondary="关闭时使用设置页里的全局启动配置" />
                <Switch checked={useInstanceSettings} onChange={(e) => setUseInstanceSettings(e.target.checked)} />
              </ListItem>
            </List>
            <TextField
              select
              label={t("instance.loader")}
              value={editLoader}
              onChange={(e) => setEditLoader(e.target.value as LoaderType)}
              fullWidth
            >
              {ALL_LOADERS.map((l) => (
                <MenuItem key={l} value={l}>{t(`common.${l}`)}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label={t("instance.java")}
              value={editJava}
              onChange={(e) => setEditJava(e.target.value)}
              fullWidth
              disabled={!useInstanceSettings}
            >
              {runtimes.map((rt) => (
                <MenuItem key={rt.id} value={rt.path}>
                  {rt.vendor} {rt.version} ({rt.path})
                </MenuItem>
              ))}
              {runtimes.length === 0 && (
                <MenuItem disabled value="">
                  {t("java.noRuntimes")}
                </MenuItem>
              )}
            </TextField>
            <TextField label={t("instance.jvmArgs")} value={useInstanceSettings ? editJvmArgs : globalSettings.defaultJvmArgs} onChange={(e) => setEditJvmArgs(e.target.value)} fullWidth multiline disabled={!useInstanceSettings} />
            <List disablePadding>
              <ListItem disablePadding>
                <ListItemText primary="全屏显示" secondary={useInstanceSettings ? "仅此实例生效" : "当前使用全局配置"} />
                <Switch checked={useInstanceSettings ? editFullscreen : globalSettings.fullscreen} onChange={(e) => setEditFullscreen(e.target.checked)} disabled={!useInstanceSettings} />
              </ListItem>
            </List>
            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField label={t("instance.resolution") + " W"} value={editResW} onChange={(e) => setEditResW(Number(e.target.value))} type="number" sx={{ flex: 1 }} disabled={!useInstanceSettings} />
              <TextField label={t("instance.resolution") + " H"} value={editResH} onChange={(e) => setEditResH(Number(e.target.value))} type="number" sx={{ flex: 1 }} disabled={!useInstanceSettings} />
            </Box>
            <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave}>
              {t("instance.save")}
            </Button>
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value={tab} index={1}>
        <Tabs value={modView} onChange={(_, v) => setModView(v)} sx={{ mb: 2 }}>
          <Tab value="local" label="已安装 MOD" />
          <Tab value="download" label="下载 MOD" />
        </Tabs>

        {modView === "local" && (
          <Box>
            <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
              <TextField
                size="small"
                placeholder="查找本机 MOD..."
                value={localModQuery}
                onChange={(e) => setLocalModQuery(e.target.value)}
                sx={{ flex: 1 }}
              />
              <Button variant="outlined" startIcon={<UpdateIcon />} onClick={fetchLocalMods}>
                刷新
              </Button>
            </Box>

            {localModsLoading ? (
              <CircularProgress sx={{ display: "block", mx: "auto", mt: 4 }} />
            ) : visibleLocalMods.length === 0 ? (
              <Typography color="text.secondary" sx={{ textAlign: "center", mt: 4 }}>
                {localModQuery ? "没有找到匹配的本地 MOD" : "当前实例还没有安装 MOD"}
              </Typography>
            ) : (
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 1.5 }}>
                {visibleLocalMods.map((mod) => (
                  <Card key={mod.path} variant="outlined">
                    <CardContent sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 1.5, "&:last-child": { pb: 1.5 } }}>
                      <InventoryIcon color={mod.enabled ? "primary" : "disabled"} />
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>{mod.fileName}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                          {(mod.size / 1024 / 1024).toFixed(2)} MB · {new Date(mod.modifiedAt).toLocaleString()}
                        </Typography>
                      </Box>
                      <Chip label={mod.enabled ? "启用" : "禁用"} size="small" color={mod.enabled ? "success" : "default"} />
                      <IconButton size="small" title="备份" onClick={() => handleBackupLocalMod(mod.fileName)}>
                        <BackupIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" title="检查更新" onClick={() => handleFindLocalModUpdate(mod.fileName)}>
                        <UpdateIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" title="删除" color="error" onClick={() => handleDeleteLocalMod(mod.fileName)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}
          </Box>
        )}

        {modView === "download" && (
          <Box>
            <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap", alignItems: "center" }}>
              <TextField
                select
                size="small"
                label={t("mod.source")}
                value={modSource}
                onChange={(e) => setModSource(e.target.value as ModSource)}
                sx={{ minWidth: 120 }}
              >
                <MenuItem value="modrinth">Modrinth</MenuItem>
                <MenuItem value="curseforge">CurseForge</MenuItem>
                <MenuItem value="mcmod">MCMod</MenuItem>
              </TextField>
              <TextField
                size="small"
                placeholder={t("mod.searchPlaceholder")}
                value={modQuery}
                onChange={(e) => setModQuery(e.target.value)}
                sx={{ flex: 1, minWidth: 180 }}
              />
              <TextField
                select
                size="small"
                label={t("instance.gameVersion")}
                value={modVersion}
                onChange={(e) => setModVersion(e.target.value)}
                sx={{ minWidth: 120 }}
              >
                <MenuItem value="">{instance?.gameVersion || t("instance.gameVersion")}</MenuItem>
                {releaseVersions.slice(0, 20).map((v) => (
                  <MenuItem key={v.id} value={v.id}>{v.id}</MenuItem>
                ))}
              </TextField>
              <TextField
                select
                size="small"
                label={t("mod.category")}
                value={modCategory}
                onChange={(e) => setModCategory(e.target.value)}
                sx={{ minWidth: 130 }}
              >
                <MenuItem value="">All</MenuItem>
                {MOD_CATEGORIES.map((c) => (
                  <MenuItem key={c} value={c}>{c}</MenuItem>
                ))}
              </TextField>
            </Box>

            {modResultsLoading && <CircularProgress sx={{ display: "block", mx: "auto", mt: 4 }} />}

            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 1.5 }}>
              {visibleModResults?.map((mod) => (
                <Card
                  key={`${mod.source}-${mod.id}`}
                  onClick={() => openModDownloadDetail(mod)}
                  sx={{ position: "relative", cursor: "pointer", "&:hover": { bgcolor: "action.hover" } }}
                >
                  <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
                    <Box sx={{ display: "flex", gap: 1 }}>
                      {mod.iconUrl && (
                        <Box component="img" src={mod.iconUrl} sx={{ width: 44, height: 44, borderRadius: 1, objectFit: "contain", flexShrink: 0 }} />
                      )}
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, pr: 5 }} noWrap>{mod.name}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", height: 34, overflow: "hidden" }}>
                          {mod.summary}
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", mt: 1 }}>
                      <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                        {mod.categories.slice(0, 2).map((cat) => (
                          <Chip key={cat} label={cat} size="small" variant="outlined" sx={{ height: 18, fontSize: 10 }} />
                        ))}
                      </Box>
                      <IconButton size="small" color="primary" onClick={(e) => { e.stopPropagation(); downloadOnlineMod(mod); }}>
                        <DownloadIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </CardContent>
                  <Chip label={mod.source} size="small" color="primary" sx={{ position: "absolute", top: 4, right: 4, height: 18, fontSize: 10 }} />
                </Card>
              ))}
            </Box>

            {visibleModResults?.length === 0 && modQuery && !modResultsLoading && (
              <Typography color="text.secondary" sx={{ textAlign: "center", mt: 4 }}>
                {t("mod.noResults", { query: modQuery })}
              </Typography>
            )}
          </Box>
        )}
      </TabPanel>

      <TabPanel value={tab} index={2}>
        <Card sx={{ mb: 2 }}>
          <CardContent sx={{ display: "flex", gap: 1.5, alignItems: "center", flexWrap: "wrap" }}>
            <TextField
              select
              size="small"
              label="Java 发行版"
              value={javaVendor}
              onChange={(e) => setJavaVendor(e.target.value as JavaVendor)}
              sx={{ minWidth: 160 }}
            >
              <MenuItem value="adoptium">Adoptium</MenuItem>
              <MenuItem value="zulu">Zulu</MenuItem>
              <MenuItem value="graalvm">GraalVM</MenuItem>
            </TextField>
            <Button
              variant="contained"
              startIcon={javaDownloading ? <CircularProgress size={18} color="inherit" /> : <DownloadIcon />}
              onClick={handleDownloadJava}
              disabled={javaDownloading}
            >
              下载 Java {getRequiredJavaMajor(instance.gameVersion)}
            </Button>
            <Typography variant="body2" color="text.secondary">
              安装到 woxlauncher/java，启动器会自动扫描，不配置系统变量。
            </Typography>
          </CardContent>
        </Card>
        {runtimes.length === 0 ? (
          <Typography color="text.secondary">{t("java.noRuntimes")}</Typography>
        ) : (
          runtimes.map((rt) => (
            <Card key={rt.id} sx={{ mb: 2 }}>
              <CardContent sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Box>
                  <Typography variant="h6">{rt.vendor} {rt.version}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontFamily: "monospace" }}>
                    {rt.path}
                  </Typography>
                </Box>
                <Chip label={rt.id} size="small" color="primary" variant="outlined" />
              </CardContent>
            </Card>
          ))
        )}
      </TabPanel>

      <Dialog open={!!selectedMod} onClose={() => setSelectedMod(null)} maxWidth="md" fullWidth>
        {selectedMod && (
          <>
            <DialogTitle sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
              {selectedMod.iconUrl && (
                <Box component="img" src={selectedMod.iconUrl} sx={{ width: 42, height: 42, borderRadius: 1, objectFit: "contain" }} />
              )}
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="h6" noWrap>{selectedMod.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {selectedMod.source} · {selectedMod.downloads.toLocaleString()} downloads
                </Typography>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {selectedMod.summary}
              </Typography>

              <Card variant="outlined" sx={{ mb: 2 }}>
                <CardContent sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
                  <Box>
                    <Typography variant="subtitle2">
                      当前环境最新版
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {instance.gameVersion} · {instance.loaderType}
                    </Typography>
                    {recommendedModVersion && (
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        {recommendedModVersion.versionName} · {recommendedModVersion.fileName}
                      </Typography>
                    )}
                    {!recommendedModVersion && selectedMod.source !== "modrinth" && (
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        该来源暂不支持版本详情，点击下载会尝试下载当前游戏版本可用文件。
                      </Typography>
                    )}
                    {!recommendedModVersion && selectedMod.source === "modrinth" && !selectedModVersionsLoading && (
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        没有找到当前加载器环境下的文件。
                      </Typography>
                    )}
                  </Box>
                  <Button
                    variant="contained"
                    startIcon={selectedModVersionsLoading ? <CircularProgress size={18} color="inherit" /> : <DownloadIcon />}
                    onClick={() => downloadOnlineMod(selectedMod, recommendedModVersion || undefined)}
                    disabled={selectedModVersionsLoading}
                  >
                    下载
                  </Button>
                </CardContent>
              </Card>

              {selectedModVersionsLoading && <CircularProgress sx={{ display: "block", mx: "auto", my: 3 }} />}

              {!selectedModVersionsLoading && Object.entries(groupedModVersions).map(([versionGroup, versions]) => (
                <Box key={versionGroup} sx={{ mb: 2 }}>
                  <Divider sx={{ mb: 1 }} />
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>{versionGroup}</Typography>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    {versions.map((version) => (
                      <Card key={version.versionId} variant="outlined">
                        <CardContent sx={{ p: 1.25, "&:last-child": { pb: 1.25 }, display: "flex", justifyContent: "space-between", gap: 2 }}>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                              {version.versionName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                              {version.loaders.join(", ")} · {(version.size / 1024 / 1024).toFixed(2)} MB · {version.fileName}
                            </Typography>
                          </Box>
                          <IconButton color="primary" size="small" onClick={() => downloadOnlineMod(selectedMod, version)}>
                            <DownloadIcon fontSize="small" />
                          </IconButton>
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                </Box>
              ))}
            </DialogContent>
          </>
        )}
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
      <LoginDialog open={loginOpen} onClose={() => setLoginOpen(false)} />
    </Box>
  );
}

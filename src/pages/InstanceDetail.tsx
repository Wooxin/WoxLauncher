import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Typography, Box, Card, CardContent, Button, Chip, IconButton,
  CircularProgress, TextField, MenuItem, Tabs, Tab, Snackbar, Alert,
} from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import SaveIcon from "@mui/icons-material/Save";
import DownloadIcon from "@mui/icons-material/Download";
import { invoke } from "@tauri-apps/api/core";
import { useTranslation } from "react-i18next";
import { ALL_LOADERS } from "../constants";
import { useJavaStore } from "../stores/javaStore";
import { useModSearch } from "../hooks/useModSearch";
import { getModrinthDownloadUrl } from "../services/modrinth";
import type { InstanceConfig, LoaderType, ModSource } from "../types";

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
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" | "info" }>({
    open: false, message: "", severity: "info"
  });

  const { runtimes, fetchRuntimes } = useJavaStore();
  const [modQuery, setModQuery] = useState("");
  const [modVersion, setModVersion] = useState("");
  const [modCategory, setModCategory] = useState("");
  const [modSource, setModSource] = useState<ModSource>("modrinth");
  const { data: modResults } = useModSearch(modQuery, modSource, modVersion);

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
    setLoading(false);
  };

  useEffect(() => {
    fetchInstance();
    fetchRuntimes();
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
    };
    await invoke("update_instance", { config: updated });
    setInstance(updated);
  };

  const handleLaunch = async () => {
    if (!instance) return;
    setSnackbar({ open: true, message: t("instance.launchPlaceholder", { name: instance.name }), severity: "info" });
  };

  if (loading) return <CircularProgress />;
  if (!instance) return <Typography>{t("instance.notFound")}</Typography>;

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          {instance.name}
        </Typography>
        <Button variant="contained" startIcon={<PlayArrowIcon />} onClick={handleLaunch}>
          {t("instance.launch")}
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
              select
              label={t("instance.gameVersion")}
              value={editGameVersion}
              onChange={(e) => setEditGameVersion(e.target.value)}
              fullWidth
            >
              <MenuItem value={editGameVersion}>{editGameVersion}</MenuItem>
            </TextField>
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
            <TextField label={t("instance.jvmArgs")} value={editJvmArgs} onChange={(e) => setEditJvmArgs(e.target.value)} fullWidth multiline />
            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField label={t("instance.resolution") + " W"} value={editResW} onChange={(e) => setEditResW(Number(e.target.value))} type="number" sx={{ flex: 1 }} />
              <TextField label={t("instance.resolution") + " H"} value={editResH} onChange={(e) => setEditResH(Number(e.target.value))} type="number" sx={{ flex: 1 }} />
            </Box>
            <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave}>
              {t("instance.create")}
            </Button>
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value={tab} index={1}>
        {/* Filters row */}
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
            sx={{ flex: 1, minWidth: 160 }}
          />
          <TextField
            select
            size="small"
            label={t("instance.gameVersion")}
            value={modVersion}
            onChange={(e) => setModVersion(e.target.value)}
            sx={{ minWidth: 120 }}
          >
            <MenuItem value="">{t("instance.gameVersion")} (all)</MenuItem>
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

        {/* Two-column mod grid */}
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
          {modResults?.map((mod) => (
            <Card key={`${mod.source}-${mod.id}`} sx={{
              position: "relative",
              cursor: "pointer",
              "&:hover": { bgcolor: "action.hover" },
            }}>
              <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
                <Box sx={{ display: "flex", gap: 1 }}>
                  {mod.iconUrl && (
                    <Box component="img" src={mod.iconUrl} sx={{ width: 40, height: 40, borderRadius: 1, objectFit: "contain", flexShrink: 0 }} />
                  )}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, pr: 5 }} noWrap>{mod.name}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", lineClamp: 2, WebkitLineClamp: 2, overflow: "hidden", textOverflow: "ellipsis" }}>
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
                  <IconButton size="small" color="primary"
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (!instance) return;
                      try {
                        const dl = await getModrinthDownloadUrl(mod.id, modVersion || undefined);
                        if (!dl) { setSnackbar({ open: true, message: `${mod.name}: no download URL`, severity: "error" }); return; }
                        const dest = `./wox_data/instances/${instance.id}/mods/${dl.filename}`;
                        await invoke("start_download", { url: dl.url, dest, sha1: null, label: mod.name });
                        setSnackbar({ open: true, message: `${mod.name} downloaded`, severity: "success" });
                      } catch (err) {
                        setSnackbar({ open: true, message: String(err), severity: "error" });
                      }
                    }}
                  >
                    <DownloadIcon fontSize="small" />
                  </IconButton>
                </Box>
              </CardContent>
              <Chip
                label={mod.source}
                size="small"
                color="primary"
                sx={{ position: "absolute", top: 4, right: 4, height: 18, fontSize: 10 }}
              />
            </Card>
          ))}
        </Box>

        {modResults?.length === 0 && modQuery && (
          <Typography color="text.secondary" sx={{ textAlign: "center", mt: 4 }}>
            {t("mod.noResults", { query: modQuery })}
          </Typography>
        )}
      </TabPanel>

      <TabPanel value={tab} index={2}>
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
    </Box>
  );
}

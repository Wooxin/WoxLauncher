import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Typography, Box, Card, CardContent, Button, Chip,
  CircularProgress, TextField, MenuItem, Tabs, Tab, Snackbar, Alert,
} from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import SaveIcon from "@mui/icons-material/Save";
import { invoke } from "@tauri-apps/api/core";
import { useTranslation } from "react-i18next";
import { ALL_LOADERS } from "../constants";
import { useJavaStore } from "../stores/javaStore";
import { useModSearch } from "../hooks/useModSearch";
import ModCard from "../components/mod/ModCard";
import type { InstanceConfig, LoaderType } from "../types";

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
  const { data: modResults } = useModSearch(modQuery, "modrinth");

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

  // Auto-filter mods by instance game version
  useEffect(() => {
    if (instance) {
      setModQuery(instance.gameVersion.split('.').slice(0, 2).join('.'));
    }
  }, [instance?.gameVersion]);

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
            <TextField label="Java" value={editJava} onChange={(e) => setEditJava(e.target.value)} fullWidth />
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
        <TextField
          fullWidth
          placeholder={t("mod.searchPlaceholder")}
          value={modQuery}
          onChange={(e) => setModQuery(e.target.value)}
          sx={{ mb: 2 }}
          helperText={instance ? `Filtered by Minecraft ${instance.gameVersion}` : ""}
        />
        {modResults?.map((mod) => (
          <ModCard key={`${mod.source}-${mod.id}`} mod={mod} />
        ))}
        {modResults?.length === 0 && modQuery && (
          <Typography color="text.secondary" sx={{ textAlign: "center", mt: 2 }}>
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
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Typography, Box, Button, MenuItem, Select,
  FormControl, Chip, CircularProgress, Snackbar, Alert,
} from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import AddIcon from "@mui/icons-material/Add";
import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";
import { useInstanceStore } from "../stores/instanceStore";
import { useAccountStore } from "../stores/accountStore";
import { useJavaStore } from "../stores/javaStore";
import { LOADER_KEYS } from "../constants";
import AccountPicker from "../components/account/AccountPicker";
import LoginDialog from "../components/account/LoginDialog";
import { formatError } from "../utils/error";
import { selectRuntimeForGameVersion } from "../utils/java";

export default function Home() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const instances = useInstanceStore(s => s.instances);
  const fetchInstances = useInstanceStore(s => s.fetchInstances);
  const activeAccount = useAccountStore(s => s.activeAccount);
  const fetchAccounts = useAccountStore(s => s.fetchAccounts);
  const runtimes = useJavaStore(s => s.runtimes);
  const fetchRuntimes = useJavaStore(s => s.fetchRuntimes);
  const [selectedId, setSelectedId] = useState(instances[0]?.id || "");
  const [loginOpen, setLoginOpen] = useState(false);
  const [launchStatus, setLaunchStatus] = useState<'idle' | 'installing' | 'launching'>('idle');
  const [pageLoading, setPageLoading] = useState(instances.length === 0);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" | "info" | "warning" }>({
    open: false, message: "", severity: "info"
  });

  useEffect(() => {
    if (instances.length === 0) {
      Promise.all([fetchInstances(), fetchAccounts(), fetchRuntimes()])
        .finally(() => setPageLoading(false));
    } else {
      setPageLoading(false);
      if (!selectedId && instances.length > 0) setSelectedId(instances[0].id);
    }
  }, []);

  useEffect(() => {
    if (!selectedId && instances.length > 0) {
      setSelectedId(instances[0].id);
    }
  }, [instances, selectedId]);

  const selected = instances.find(i => i.id === selectedId) || null;

  const handleLaunch = async () => {
    if (!selected) return;
    if (!activeAccount) { setLoginOpen(true); return; }
    const runtime = selectRuntimeForGameVersion(runtimes, selected.gameVersion, selected.javaVersion);
    const javaPath = runtime?.path || "java";
    try {
      setLaunchStatus('installing');
      const installed = await invoke<typeof selected>("install_instance", { instance: selected, javaPath });
      await fetchInstances();
      setLaunchStatus('launching');
      await invoke("launch_game", { instance: installed, accountUuid: activeAccount.uuid, javaPath });
      setLaunchStatus('idle');
      setSnackbar({ open: true, message: t("launch.launched"), severity: "success" });
    } catch (e) {
      setLaunchStatus('idle');
      setSnackbar({ open: true, message: formatError(e), severity: "error" });
    }
  };

  if (pageLoading) return <CircularProgress sx={{ display: "block", mx: "auto", mt: 10 }} />;

  const isReady = !!(selected && activeAccount && runtimes.length > 0);
  const selectedRuntime = selected ? selectRuntimeForGameVersion(runtimes, selected.gameVersion, selected.javaVersion) : null;

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
        <AccountPicker />
      </Box>

      <Box
        sx={{
          minHeight: "calc(100vh - 150px)",
          display: "flex",
          flexDirection: "column",
          border: "1px solid",
          borderColor: "divider",
          bgcolor: "#181818",
        }}
      >
        <Box
          sx={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1.2fr 0.8fr" },
            minHeight: 420,
          }}
        >
          <Box
            sx={{
              p: { xs: 3, md: 5 },
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              borderRight: { xs: 0, md: "1px solid" },
              borderBottom: { xs: "1px solid", md: 0 },
              borderColor: "divider",
              background: "linear-gradient(180deg, #202020 0%, #151515 100%)",
            }}
          >
            <Box>
              <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 800 }}>
                Minecraft
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 800, mt: 1 }}>
                Java Edition
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 520 }}>
                {selected ? selected.name : t("instance.noInstances")}
              </Typography>
            </Box>

            {selected && (
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 4 }}>
                <Chip label={selected.gameVersion} size="small" sx={{ bgcolor: "#24351F", color: "primary.light" }} />
                <Chip label={t(LOADER_KEYS[selected.loaderType] || "common.unknown")} size="small" variant="outlined" />
                {selectedRuntime && <Chip label={`Java ${selectedRuntime.version}`} size="small" variant="outlined" />}
                {selected.lastPlayedAt && (
                  <Chip
                    label={`${t("instance.lastPlayed")}: ${new Date(selected.lastPlayedAt).toLocaleDateString()}`}
                    size="small"
                    variant="outlined"
                  />
                )}
              </Box>
            )}
          </Box>

          <Box sx={{ p: { xs: 3, md: 4 }, display: "flex", flexDirection: "column", justifyContent: "center", gap: 2 }}>
        {instances.length === 0 ? (
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                {t("instance.title")}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {t("instance.noInstances")}
            </Typography>
              <Button variant="contained" size="large" startIcon={<AddIcon />} onClick={() => navigate("/instances")}>
              {t("instance.newInstance")}
            </Button>
          </Box>
        ) : (
          <>
                <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 800 }}>
                  {t("instance.title")}
                </Typography>
                <FormControl size="small" fullWidth>
                <Select
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                >
                  {instances.map((inst) => (
                    <MenuItem key={inst.id} value={inst.id}>{inst.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>

            <Button
              variant="contained"
              onClick={handleLaunch}
              disabled={!selectedId || launchStatus !== 'idle'}
                  startIcon={launchStatus === 'idle' ? <PlayArrowIcon /> : <CircularProgress size={18} color="inherit" />}
              sx={{
                    height: 56,
                    mt: 1,
                    fontSize: 16,
                fontWeight: 800,
                    bgcolor: isReady ? "primary.main" : "#3A3A3A",
                    "&.Mui-disabled": { bgcolor: "#333", color: "#888" },
              }}
            >
                  {launchStatus === 'installing'
                    ? t("download.installingVersion", { version: selected?.gameVersion ?? "" })
                    : launchStatus === 'launching'
                      ? t("launch.starting")
                      : t("instance.launch")}
            </Button>

                <Button variant="outlined" startIcon={<AddIcon />} onClick={() => navigate("/instances")} sx={{ height: 42 }}>
                  {t("instance.newInstance")}
                </Button>

            {!activeAccount && (
                  <Typography variant="body2" color="warning.main">
                {t("launch.errorAuth")}
              </Typography>
            )}
          </>
        )}
          </Box>
        </Box>
      </Box>
      <LoginDialog open={loginOpen} onClose={() => setLoginOpen(false)} />
      <Snackbar
        open={snackbar.open} autoHideDuration={6000}
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

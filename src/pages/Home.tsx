import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Typography, Box, Button, Card, CardContent, MenuItem, Select,
  FormControl, InputLabel, Chip, CircularProgress, Snackbar, Alert,
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

export default function Home() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const instances = useInstanceStore(s => s.instances);
  const fetchInstances = useInstanceStore(s => s.fetchInstances);
  const activeAccount = useAccountStore(s => s.activeAccount);
  const fetchAccounts = useAccountStore(s => s.fetchAccounts);
  const runtimes = useJavaStore(s => s.runtimes);
  const fetchRuntimes = useJavaStore(s => s.fetchRuntimes);
  const [selectedId, setSelectedId] = useState("");
  const [loginOpen, setLoginOpen] = useState(false);
  const [launchStatus, setLaunchStatus] = useState<'idle' | 'installing' | 'launching'>('idle');
  const [pageLoading, setPageLoading] = useState(instances.length === 0);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" | "info" }>({
    open: false, message: "", severity: "info"
  });

  useEffect(() => {
    if (instances.length === 0) {
      Promise.all([fetchInstances(), fetchAccounts(), fetchRuntimes()])
        .finally(() => setPageLoading(false));
    } else {
      setPageLoading(false);
    }
  }, []);

  const selected = instances.find(i => i.id === selectedId) || null;

  const handleLaunch = async () => {
    if (!selected) return;
    if (!activeAccount) {
      setLoginOpen(true);
      return;
    }
    const javaPath = runtimes.length > 0 ? runtimes[0].path : "java";
    try {
      setLaunchStatus('installing');
      await invoke("install_game_version", { version: selected.gameVersion });

      setLaunchStatus('launching');
      await invoke("launch_game", {
        instance: selected,
        accountUuid: activeAccount.uuid,
        javaPath,
      });
      setLaunchStatus('idle');
      setSnackbar({ open: true, message: t("launch.launched"), severity: "success" });
    } catch (e) {
      setLaunchStatus('idle');
      setSnackbar({ open: true, message: (typeof e === "object" && e !== null ? ((e as any).message || String(e)) : String(e)), severity: "error" });
    }
  };

  if (pageLoading) return <CircularProgress />;

  return (
    <Box>
      <AccountPicker />
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "70vh", gap: 3 }}>
        <Typography variant="h3" sx={{ fontWeight: 700 }}>
          {t("app.title")}
        </Typography>

      {instances.length === 0 ? (
        <Card sx={{ maxWidth: 500, width: "100%", textAlign: "center", p: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>{t("instance.noInstances")}</Typography>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate("/instances")}>
              {t("instance.newInstance")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card sx={{ maxWidth: 500, width: "100%", p: 3 }}>
            <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>{t("instance.title")}</InputLabel>
                <Select
                  value={selectedId}
                  label={t("instance.title")}
                  onChange={(e) => setSelectedId(e.target.value)}
                >
                  {instances.map((inst) => (
                    <MenuItem key={inst.id} value={inst.id}>{inst.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              {selected && (
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  <Chip label={selected.gameVersion} size="small" />
                  <Chip label={t(LOADER_KEYS[selected.loaderType] || "common.unknown")} size="small" color="primary" />
                  {selected.lastPlayedAt && (
                    <Typography variant="caption" color="text.secondary">
                      {t("instance.lastPlayed")}: {new Date(selected.lastPlayedAt).toLocaleDateString()}
                    </Typography>
                  )}
                </Box>
              )}

              <Button
                variant="contained"
                size="large"
                startIcon={launchStatus !== 'idle' ? <CircularProgress size={20} /> : <PlayArrowIcon />}
                onClick={handleLaunch}
                disabled={!selectedId || launchStatus !== 'idle'}
                sx={{ mt: 1 }}
              >
                {launchStatus === 'installing' ? t("download.installingVersion", { version: selected?.gameVersion ?? "" }) :
                 launchStatus === 'launching' ? t("launch.starting") :
                 t("instance.launch")}
              </Button>
            </CardContent>
          </Card>
        </>
      )}
      </Box>
      <LoginDialog open={loginOpen} onClose={() => setLoginOpen(false)} />
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

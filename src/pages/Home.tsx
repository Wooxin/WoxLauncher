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

  const selected = instances.find(i => i.id === selectedId) || null;

  const handleLaunch = async () => {
    if (!selected) return;
    if (!activeAccount) { setLoginOpen(true); return; }
    const javaPath = runtimes.length > 0 ? runtimes[0].path : "java";
    try {
      setLaunchStatus('installing');
      await invoke("install_game_version", { version: selected.gameVersion });
      setLaunchStatus('launching');
      await invoke("launch_game", { instance: selected, accountUuid: activeAccount.uuid, javaPath });
      setLaunchStatus('idle');
      setSnackbar({ open: true, message: t("launch.launched"), severity: "success" });
    } catch (e) {
      setLaunchStatus('idle');
      setSnackbar({ open: true, message: (typeof e === "object" && e !== null ? ((e as any).message || String(e)) : String(e)), severity: "error" });
    }
  };

  if (pageLoading) return <CircularProgress sx={{ display: "block", mx: "auto", mt: 10 }} />;

  const isReady = !!(selected && activeAccount && runtimes.length > 0);

  return (
    <Box>
      <AccountPicker />
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "65vh", gap: 4, mt: 6 }}>
        {/* MINECRAFT title */}
        <Typography
          variant="h3"
          sx={{
            fontWeight: 800,
            letterSpacing: 1,
            color: "primary.main",
            textShadow: "0 2px 8px rgba(82,165,53,0.3)",
          }}
        >
          {t("app.title")}
        </Typography>

        {instances.length === 0 ? (
          <Box sx={{ textAlign: "center", mt: 2 }}>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              {t("instance.noInstances")}
            </Typography>
            <Button variant="contained" size="large" startIcon={<AddIcon />} onClick={() => navigate("/instances")}>
              {t("instance.newInstance")}
            </Button>
          </Box>
        ) : (
          <>
            {/* Instance selector */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <Select
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  sx={{ bgcolor: "background.paper", borderRadius: 1 }}
                >
                  {instances.map((inst) => (
                    <MenuItem key={inst.id} value={inst.id}>{inst.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Chip
                label={t("instance.newInstance")}
                size="small" variant="outlined"
                onClick={() => navigate("/instances")}
                sx={{ cursor: "pointer" }}
              />
            </Box>

            {/* Version info */}
            {selected && (
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", justifyContent: "center", mt: -2 }}>
                <Chip label={selected.gameVersion} size="small" sx={{ bgcolor: "rgba(82,165,53,0.15)", color: "primary.main" }} />
                <Chip label={t(LOADER_KEYS[selected.loaderType] || "common.unknown")} size="small" variant="outlined" />
                {selected.lastPlayedAt && (
                  <Typography variant="caption" color="text.secondary" sx={{ alignSelf: "center" }}>
                    {t("instance.lastPlayed")}: {new Date(selected.lastPlayedAt).toLocaleDateString()}
                  </Typography>
                )}
              </Box>
            )}

            {/* BIG PLAY BUTTON */}
            <Button
              variant="contained"
              onClick={handleLaunch}
              disabled={!selectedId || launchStatus !== 'idle'}
              sx={{
                width: 180,
                height: 180,
                borderRadius: "50%",
                fontSize: 18,
                fontWeight: 800,
                letterSpacing: 1,
                background: isReady
                  ? "linear-gradient(135deg, #52A535 0%, #3B8526 100%)"
                  : "linear-gradient(135deg, #555 0%, #333 100%)",
                boxShadow: isReady
                  ? "0 8px 32px rgba(82,165,53,0.4), 0 2px 8px rgba(0,0,0,0.3)"
                  : "0 4px 16px rgba(0,0,0,0.3)",
                '&:hover': {
                  transform: 'scale(1.05)',
                  boxShadow: isReady
                    ? "0 12px 40px rgba(82,165,53,0.5), 0 4px 12px rgba(0,0,0,0.4)"
                    : "0 4px 16px rgba(0,0,0,0.3)",
                },
                '&:active': { transform: 'scale(0.98)' },
                transition: 'all 0.2s ease',
                display: "flex",
                flexDirection: "column",
                gap: 0.5,
              }}
            >
              {launchStatus !== 'idle' ? (
                <>
                  <CircularProgress size={32} sx={{ color: "white" }} />
                  <Typography variant="caption" sx={{ color: "white", mt: 1 }}>
                    {launchStatus === 'installing' ? t("download.installingVersion", { version: selected?.gameVersion ?? "" }) : t("launch.starting")}
                  </Typography>
                </>
              ) : (
                <>
                  <PlayArrowIcon sx={{ fontSize: 48 }} />
                  <span>{t("instance.launch")}</span>
                </>
              )}
            </Button>

            {/* Status hint */}
            {!activeAccount && (
              <Typography variant="body2" color="warning.main" sx={{ mt: -2 }}>
                {t("launch.errorAuth")}
              </Typography>
            )}
          </>
        )}
      </Box>
      <LoginDialog open={loginOpen} onClose={() => setLoginOpen(false)} />
      <Snackbar
        open={snackbar.open} autoHideDuration={6000}
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

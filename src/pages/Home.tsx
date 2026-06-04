import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Typography, Box, Button, Card, CardContent, MenuItem, Select,
  FormControl, InputLabel, Chip, CircularProgress,
} from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import AddIcon from "@mui/icons-material/Add";
import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";
import { useInstanceStore } from "../stores/instanceStore";
import { useAccountStore } from "../stores/accountStore";
import { useJavaStore } from "../stores/javaStore";
import AccountPicker from "../components/account/AccountPicker";
import LoginDialog from "../components/account/LoginDialog";

const LOADER_KEYS: Record<string, string> = {
  vanilla: "common.vanilla", fabric: "common.fabric",
  forge: "common.forge", quilt: "common.quilt",
  neoforge: "common.neoforge", liteloader: "common.liteloader",
  rift: "common.rift", optifine: "common.optifine",
};

export default function Home() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { instances, loading, fetchInstances } = useInstanceStore();
  const { activeAccount, fetchAccounts } = useAccountStore();
  const { runtimes, fetchRuntimes } = useJavaStore();
  const [selectedId, setSelectedId] = useState("");
  const [loginOpen, setLoginOpen] = useState(false);

  useEffect(() => {
    fetchInstances();
    fetchAccounts();
    fetchRuntimes();
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
      await invoke("launch_game", {
        instance: selected,
        accountUuid: activeAccount.uuid,
        javaPath,
      });
      alert(t("launch.launched"));
    } catch (e) {
      alert(String(e));
    }
  };

  if (loading) return <CircularProgress />;

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
                startIcon={<PlayArrowIcon />}
                onClick={handleLaunch}
                disabled={!selectedId}
                sx={{ mt: 1 }}
              >
                {t("instance.launch")}
              </Button>
            </CardContent>
          </Card>
        </>
      )}
      </Box>
      <LoginDialog open={loginOpen} onClose={() => setLoginOpen(false)} />
    </Box>
  );
}

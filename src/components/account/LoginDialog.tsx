import { useState, useEffect } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Tabs, Tab, Typography, Box, CircularProgress, Alert,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { useAccountStore } from "../../stores/accountStore";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function LoginDialog({ open, onClose }: Props) {
  const { t } = useTranslation();
  const { loginOffline, msLogin, loginAuthlib, error } = useAccountStore();
  const [tab, setTab] = useState(0);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [serverUrl, setServerUrl] = useState("");
  const [localError, setLocalError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setTab(0);
      setUsername("");
      setPassword("");
      setServerUrl("");
      setLocalError("");
      setLoginLoading(false);
    }
  }, [open]);

  const handleMicrosoftLogin = () => {
    setLocalError("");
    setLoginLoading(true);
    msLogin()
      .then(() => onClose())
      .catch((e) => setLocalError(typeof e === "object" && e !== null ? ((e as any).message || String(e)) : String(e)))
      .finally(() => setLoginLoading(false));
  };

  const handleOfflineLogin = () => {
    if (!username.trim()) return;
    setLocalError("");
    setLoginLoading(true);
    loginOffline(username)
      .then(() => onClose())
      .catch((e) => setLocalError(typeof e === "object" && e !== null ? ((e as any).message || String(e)) : String(e)))
      .finally(() => setLoginLoading(false));
  };

  const handleAuthlibLogin = () => {
    if (!username.trim()) return;
    setLocalError("");
    setLoginLoading(true);
    loginAuthlib(serverUrl, username, password)
      .then(() => onClose())
      .catch((e) => setLocalError(typeof e === "object" && e !== null ? ((e as any).message || String(e)) : String(e)))
      .finally(() => setLoginLoading(false));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t("account.login")}</DialogTitle>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: "divider", px: 2 }}>
        <Tab label={t("account.microsoft")} />
        <Tab label={t("account.offline")} />
        <Tab label={t("account.authlib")} />
      </Tabs>
      <DialogContent>
        {(error || localError) && <Alert severity="error" sx={{ mb: 2 }}>{localError || error}</Alert>}

        {tab === 0 && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1, alignItems: "center" }}>
            {loginLoading ? (
              <Box sx={{ textAlign: "center", py: 3 }}>
                <CircularProgress size={32} sx={{ mb: 2 }} />
                <Typography>{t("account.polling")}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {t("account.openBrowser")}
                </Typography>
              </Box>
            ) : (
              <Button variant="contained" size="large" onClick={handleMicrosoftLogin}>
                {t("account.microsoft")} {t("account.login")}
              </Button>
            )}
          </Box>
        )}

        {tab === 1 && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <TextField label={t("account.username")} fullWidth value={username} onChange={(e) => setUsername(e.target.value)} />
            <Button variant="contained" onClick={handleOfflineLogin} disabled={!username.trim()}>
              {t("account.login")}
            </Button>
          </Box>
        )}

        {tab === 2 && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <TextField label={t("account.serverUrl")} fullWidth value={serverUrl} onChange={(e) => setServerUrl(e.target.value)} placeholder="https://auth.example.com" />
            <TextField label={t("account.username")} fullWidth value={username} onChange={(e) => setUsername(e.target.value)} />
            <TextField label={t("account.password")} fullWidth type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <Button variant="contained" onClick={handleAuthlibLogin} disabled={!username.trim()}>
              {t("account.login")}
            </Button>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t("instance.cancel")}</Button>
      </DialogActions>
    </Dialog>
  );
}

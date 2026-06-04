import { useState, useEffect, useRef } from "react";
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
  const { loginOffline, startMicrosoftLogin, pollMicrosoftToken, loginAuthlib, error } = useAccountStore();
  const [tab, setTab] = useState(0);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [serverUrl, setServerUrl] = useState("");
  const [msCode, setMsCode] = useState("");
  const [msUri, setMsUri] = useState("");
  const [polling, setPolling] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!open) {
      setTab(0);
      setUsername("");
      setPassword("");
      setServerUrl("");
      setMsCode("");
      setMsUri("");
      setPolling(false);
    }
  }, [open]);

  useEffect(() => {
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, []);

  const handleMicrosoftLogin = async () => {
    const { deviceCode, userCode, verificationUri } = await startMicrosoftLogin();
    setMsCode(userCode);
    setMsUri(verificationUri);
    setPolling(true);

    const interval = setInterval(async () => {
      try {
        await pollMicrosoftToken(deviceCode);
        clearInterval(interval);
        setPolling(false);
        onClose();
      } catch {
        // keep polling
      }
    }, 3000);
    pollingRef.current = interval;
  };

  const handleOfflineLogin = async () => {
    if (!username.trim()) return;
    await loginOffline(username);
    onClose();
  };

  const handleAuthlibLogin = async () => {
    if (!username.trim()) return;
    await loginAuthlib(serverUrl, username, password);
    onClose();
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
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {tab === 0 && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            {!polling ? (
              <Button variant="contained" onClick={handleMicrosoftLogin}>
                {t("account.microsoft")} {t("account.login")}
              </Button>
            ) : (
              <Box sx={{ textAlign: "center" }}>
                <Typography variant="h6" sx={{ mb: 1 }}>{t("account.userCode", { code: msCode })}</Typography>
                <Typography color="text.secondary" sx={{ mb: 2 }}>
                  {t("account.openBrowser", { url: msUri })}
                </Typography>
                <CircularProgress />
                <Typography variant="body2" sx={{ mt: 1 }}>{t("account.polling")}</Typography>
              </Box>
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

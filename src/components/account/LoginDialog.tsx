import { useState, useEffect, useRef } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Tabs, Tab, Typography, Box, CircularProgress, Alert,
  IconButton, Tooltip, Paper,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import OpenInBrowserIcon from "@mui/icons-material/OpenInBrowser";
import { openUrl } from "@tauri-apps/plugin-opener";
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
  const [copied, setCopied] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [expired, setExpired] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!open) {
      setTab(0);
      setUsername("");
      setPassword("");
      setServerUrl("");
      setMsCode("");
      setMsUri("");
      setPolling(false);
      setCopied(false);
      setExpired(false);
      setRemaining(0);
    }
  }, [open]);

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(msCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available
    }
  };

  const handleCancelPolling = () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    setPolling(false);
    setMsCode("");
    setMsUri("");
    setExpired(false);
    setRemaining(0);
  };

  const handleMicrosoftLogin = async () => {
    const { deviceCode, userCode, verificationUri, interval, expiresIn } = await startMicrosoftLogin();
    setMsCode(userCode);
    setMsUri(verificationUri);
    setPolling(true);
    setExpired(false);

    // Auto-open browser
    try { await openUrl(verificationUri); } catch { /* ignore */ }

    // Set expiry countdown
    const expiry = Date.now() + expiresIn * 1000;

    // Start countdown timer
    const cd = setInterval(() => {
      const left = Math.max(0, Math.floor((expiry - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) {
        setExpired(true);
        clearInterval(cd);
        if (pollingRef.current) clearInterval(pollingRef.current);
        setPolling(false);
      }
    }, 1000);
    countdownRef.current = cd;

    // Start polling
    const pollInterval = setInterval(async () => {
      try {
        await pollMicrosoftToken(deviceCode);
        clearInterval(pollInterval);
        clearInterval(cd);
        setPolling(false);
        onClose();
      } catch {
        // keep polling until expired
      }
    }, interval * 1000);
    pollingRef.current = pollInterval;
  };

  const handleRetry = () => {
    handleCancelPolling();
    handleMicrosoftLogin();
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
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
            {!polling && !expired ? (
              <Button variant="contained" onClick={handleMicrosoftLogin}>
                {t("account.microsoft")} {t("account.login")}
              </Button>
            ) : expired ? (
              <Box sx={{ textAlign: "center" }}>
                <Alert severity="warning" sx={{ mb: 2 }}>{t("account.codeExpired")}</Alert>
                <Button variant="contained" onClick={handleRetry}>
                  {t("account.retry")}
                </Button>
              </Box>
            ) : (
              <Box sx={{ textAlign: "center" }}>
                <Paper variant="outlined" sx={{ p: 2, mb: 2, display: "inline-block" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, justifyContent: "center" }}>
                    <Typography variant="h5" sx={{ fontFamily: "monospace", letterSpacing: 4 }}>
                      {msCode}
                    </Typography>
                    <Tooltip title={copied ? t("account.codeCopied") : t("account.copyCode")}>
                      <IconButton onClick={handleCopyCode} size="small">
                        <ContentCopyIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Paper>

                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1, mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    {t("account.openBrowser", { url: msUri })}
                  </Typography>
                  <Tooltip title={t("account.openBrowserAgain") ?? ""}>
                    <IconButton size="small" onClick={() => openUrl(msUri).catch(() => {})}>
                      <OpenInBrowserIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>

                <CircularProgress size={24} sx={{ mb: 1 }} />
                <Typography variant="body2" sx={{ mb: 1 }}>{t("account.polling")}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {t("account.expiresIn", { time: formatTime(remaining) })}
                </Typography>

                <Box sx={{ mt: 2 }}>
                  <Button variant="outlined" color="warning" size="small" onClick={handleCancelPolling}>
                    {t("account.cancel")}
                  </Button>
                </Box>
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

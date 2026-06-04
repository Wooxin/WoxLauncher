import { useEffect, useState } from "react";
import {
  Typography, Box, Card, CardContent,
  Chip, Button, TextField, MenuItem, Alert,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import DownloadIcon from "@mui/icons-material/Download";
import { invoke } from "@tauri-apps/api/core";
import { useTranslation } from "react-i18next";
import { useJavaStore } from "../stores/javaStore";
import AsyncState from "../components/common/AsyncState";

const VENDORS = [
  { value: "adoptium", label: "Adoptium (Temurin)" },
  { value: "zulu", label: "Zulu (Azul)" },
  { value: "graalvm", label: "GraalVM CE" },
];

export default function JavaManager() {
  const { t } = useTranslation();
  const { runtimes, loading, error, fetchRuntimes } = useJavaStore();
  const [vendor, setVendor] = useState("adoptium");
  const [version, setVersion] = useState("21");
  const [dlStatus, setDlStatus] = useState<"idle" | "downloading" | "done" | "error">("idle");
  const [dlError, setDlError] = useState("");

  useEffect(() => { fetchRuntimes(); }, []);

  const handleDownload = async () => {
    setDlStatus("downloading");
    setDlError("");
    try {
      await invoke("download_java", { vendor, version });
      setDlStatus("done");
      await fetchRuntimes();
    } catch (e) {
      setDlStatus("error");
      setDlError(String(e));
    }
  };

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          {t("java.title")}
        </Typography>
        <Button startIcon={<RefreshIcon />} onClick={fetchRuntimes}>
          {t("java.refresh")}
        </Button>
      </Box>

      <AsyncState loading={loading} error={error} empty={false}>
        {runtimes.map((rt) => (
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
        ))}
      </AsyncState>

      {runtimes.length === 0 && !loading && !error && (
        <Typography color="text.secondary" sx={{ textAlign: "center", mt: 2 }}>
          {t("java.noRuntimes")}
        </Typography>
      )}

      <Card sx={{ mt: 4 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>{t("java.downloadTitle")}</Typography>
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "flex-start" }}>
            <TextField
              select
              label={t("java.vendorLabel")}
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              sx={{ minWidth: 220 }}
              size="small"
            >
              {VENDORS.map((v) => (
                <MenuItem key={v.value} value={v.value}>{v.label}</MenuItem>
              ))}
            </TextField>
            <TextField
              label={t("java.versionLabel")}
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              size="small"
              sx={{ width: 100 }}
            />
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={handleDownload}
              disabled={dlStatus === "downloading"}
            >
              {dlStatus === "downloading" ? t("java.installing", { vendor, version }) : t("java.downloadBtn")}
            </Button>
          </Box>
          {dlStatus === "done" && (
            <Alert severity="success" sx={{ mt: 2 }}>
              {t("java.installed", { vendor, version })}
            </Alert>
          )}
          {dlStatus === "error" && (
            <Alert severity="error" sx={{ mt: 2 }}>{dlError}</Alert>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

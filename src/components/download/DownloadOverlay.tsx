import { useEffect, useState, useRef } from "react";
import { Card, CardContent, Typography, Box, IconButton, Collapse, Chip, Snackbar, Alert, Fade } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import { useDownloadStore } from "../../stores/downloadStore";
import DownloadProgressBar from "./DownloadProgressBar";

export default function DownloadOverlay() {
  const { downloads, activeCount, startListening, stopListening, removeDownload } = useDownloadStore();
  const [expanded, setExpanded] = useState(true);
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);
  const [notice, setNotice] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
    open: false,
    message: "",
    severity: "success",
  });
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notified = useRef<Set<string>>(new Set());

  useEffect(() => {
    startListening();
    return () => { stopListening(); };
  }, []);

  const allDownloads = Object.values(downloads);

  useEffect(() => {
    Object.values(downloads).forEach((download) => {
      if (download.status !== "done" && download.status !== "error") return;
      if (notified.current.has(download.fileName)) return;
      notified.current.add(download.fileName);

      const success = download.status === "done";
      setNotice({
        open: true,
        severity: success ? "success" : "error",
        message: success
          ? `${download.fileName} 下载完成`
          : `${download.fileName} 下载失败：${download.speed || "未知错误"}`,
      });

      window.setTimeout(() => {
        removeDownload(download.fileName);
        notified.current.delete(download.fileName);
      }, 5000);
    });
  }, [downloads, removeDownload]);

  // Show overlay while there are log entries, fade out when the log is empty.
  useEffect(() => {
    if (allDownloads.length > 0) {
      setVisible(true);
      setFading(false);
      if (idleTimer.current) { clearTimeout(idleTimer.current); idleTimer.current = null; }
    } else if (allDownloads.length === 0 && visible) {
      setFading(true);
      const timer = window.setTimeout(() => setVisible(false), 220);
      return () => window.clearTimeout(timer);
    }
    return () => { if (idleTimer.current) { clearTimeout(idleTimer.current); idleTimer.current = null; } };
  }, [activeCount, allDownloads.length, visible]);

  const visibleDownloads = allDownloads;
  const doneCount = allDownloads.filter(d => d.status === "done").length;
  const errorCount = allDownloads.filter(d => d.status === "error").length;

  return (
    <>
      {visible && (
        <Fade in={!fading} timeout={220}>
          <Card sx={{ position: "fixed", bottom: 16, right: 16, width: 420, zIndex: 1300, opacity: 0.96 }}>
            <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
              <Box
                sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
                onClick={() => setExpanded(!expanded)}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography variant="subtitle2">
                    {activeCount > 0 ? `Downloads (${doneCount}/${allDownloads.length})` : `Complete (${doneCount} ok${errorCount > 0 ? `, ${errorCount} failed` : ""})`}
                  </Typography>
                  {activeCount > 0 && <Chip label={`${activeCount} active`} size="small" color="info" />}
                </Box>
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  {activeCount === 0 && (
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); setFading(true); window.setTimeout(() => setVisible(false), 220); }}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  )}
                  <IconButton size="small">
                    {expanded ? <KeyboardArrowDownIcon /> : <KeyboardArrowUpIcon />}
                  </IconButton>
                </Box>
              </Box>
              <Collapse in={expanded}>
                <Box sx={{ mt: 1, maxHeight: 300, overflow: "auto" }}>
                  {visibleDownloads.map((d) => (
                    <DownloadProgressBar key={d.fileName} progress={d} />
                  ))}
                </Box>
              </Collapse>
            </CardContent>
          </Card>
        </Fade>
      )}
      <Snackbar
        open={notice.open}
        autoHideDuration={3500}
        onClose={() => setNotice((current) => ({ ...current, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          severity={notice.severity}
          variant="filled"
          onClose={() => setNotice((current) => ({ ...current, open: false }))}
        >
          {notice.message}
        </Alert>
      </Snackbar>
    </>
  );
}

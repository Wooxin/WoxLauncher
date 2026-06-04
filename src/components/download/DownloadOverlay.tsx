import { useEffect, useState, useRef } from "react";
import { Card, CardContent, Typography, Box, IconButton, Collapse, Chip } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import { useDownloadStore } from "../../stores/downloadStore";
import DownloadProgressBar from "./DownloadProgressBar";

export default function DownloadOverlay() {
  const { downloads, activeCount, startListening, stopListening } = useDownloadStore();
  const [expanded, setExpanded] = useState(true);
  const [visible, setVisible] = useState(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    startListening();
    return () => { stopListening(); };
  }, []);

  const allDownloads = Object.values(downloads);

  // Show overlay when downloads are active, auto-hide after 3s of idle
  useEffect(() => {
    if (activeCount > 0) {
      setVisible(true);
      if (idleTimer.current) { clearTimeout(idleTimer.current); idleTimer.current = null; }
    } else if (allDownloads.length > 0 && visible) {
      // All downloads done/errored — hide after 3s
      if (!idleTimer.current) {
        idleTimer.current = setTimeout(() => {
          setVisible(false);
          idleTimer.current = null;
        }, 3000);
      }
    }
    return () => { if (idleTimer.current) { clearTimeout(idleTimer.current); idleTimer.current = null; } };
  }, [activeCount, allDownloads.length]);

  if (!visible) return null;

  const activeDownloads = allDownloads.filter(d => d.status === "downloading" || d.status === "verifying");
  const doneCount = allDownloads.filter(d => d.status === "done").length;
  const errorCount = allDownloads.filter(d => d.status === "error").length;

  return (
    <Card sx={{ position: "fixed", bottom: 16, right: 16, width: 420, zIndex: 1300, opacity: 0.95 }}>
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
              <IconButton size="small" onClick={(e) => { e.stopPropagation(); setVisible(false); }}>
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
            {activeDownloads.map((d) => (
              <DownloadProgressBar key={d.fileName} progress={d} />
            ))}
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
}

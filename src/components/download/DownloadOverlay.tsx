import { useEffect, useState } from "react";
import { Card, CardContent, Typography, Box, IconButton, Collapse, Chip } from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import { useDownloadStore } from "../../stores/downloadStore";
import DownloadProgressBar from "./DownloadProgressBar";

export default function DownloadOverlay() {
  const { downloads, activeCount, startListening, stopListening } = useDownloadStore();
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    startListening();
    return () => { stopListening(); };
  }, []);

  const allDownloads = Object.values(downloads);
  if (allDownloads.length === 0) return null;

  // Sort: active first (downloading/verifying), then done, then errors
  const sorted = [...allDownloads].sort((a, b) => {
    const order: Record<string, number> = { downloading: 0, verifying: 1, idle: 2, done: 3, error: 4 };
    return (order[a.status] ?? 5) - (order[b.status] ?? 5);
  });

  const doneCount = allDownloads.filter(d => d.status === "done").length;
  const totalCount = allDownloads.length;

  return (
    <Card sx={{ position: "fixed", bottom: 16, right: 16, width: 420, zIndex: 1300, opacity: 0.95 }}>
      <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
        <Box
          sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
          onClick={() => setExpanded(!expanded)}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="subtitle2">
              {activeCount > 0 ? `Downloads (${doneCount}/${totalCount})` : `Downloads complete (${totalCount} files)`}
            </Typography>
            {activeCount > 0 && <Chip label={`${activeCount} active`} size="small" color="info" />}
          </Box>
          <IconButton size="small">
            {expanded ? <KeyboardArrowDownIcon /> : <KeyboardArrowUpIcon />}
          </IconButton>
        </Box>
        <Collapse in={expanded}>
          <Box sx={{ mt: 1, maxHeight: 300, overflow: "auto" }}>
            {sorted.map((d) => (
              <DownloadProgressBar key={d.fileName} progress={d} />
            ))}
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
}

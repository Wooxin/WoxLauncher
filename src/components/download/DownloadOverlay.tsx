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
  if (allDownloads.length === 0 || activeCount === 0) return null;

  const activeDownloads = allDownloads.filter(d => d.status === "downloading" || d.status === "verifying");
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
              Downloads ({doneCount}/{totalCount})
            </Typography>
            <Chip label={`${activeCount} active`} size="small" color="info" />
          </Box>
          <IconButton size="small">
            {expanded ? <KeyboardArrowDownIcon /> : <KeyboardArrowUpIcon />}
          </IconButton>
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

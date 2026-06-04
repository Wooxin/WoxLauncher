import { LinearProgress, Box, Typography, Chip } from "@mui/material";
import type { DownloadProgress } from "../../types";

interface Props {
  progress: DownloadProgress;
}

const STATUS_COLORS: Record<string, "info" | "success" | "error" | "warning"> = {
  idle: "info",
  downloading: "info",
  verifying: "warning",
  done: "success",
  error: "error",
};

function cleanFileName(name: string): string {
  // Remove path prefixes, keep only the meaningful part
  return name
    .replace(/\\/g, "/")
    .replace(/.*\/wox_data\//, "")
    .replace(/.*\/libraries\//, "lib: ")
    .replace(/.*\/versions\//, "ver: ")
    .replace(/.*\/assets\//, "assets: ")
    .replace(/.*\//, "");
}

function formatSize(bytes: number): string {
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`;
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

export default function DownloadProgressBar({ progress }: Props) {
  const percent = Math.round(progress.percent);
  return (
    <Box sx={{ width: "100%", mb: 1 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
        <Typography variant="body2" noWrap sx={{ maxWidth: "65%", fontSize: 12 }}>
          {cleanFileName(progress.fileName)}
        </Typography>
        <Box sx={{ display: "flex", gap: 0.5, alignItems: "center", flexShrink: 0 }}>
          <Typography variant="caption" sx={{ fontSize: 10 }}>
            {formatSize(progress.downloaded)} / {formatSize(progress.total)}
          </Typography>
          <Typography variant="caption" sx={{ fontSize: 10, minWidth: 56 }}>
            {progress.speed}
          </Typography>
          <Chip label={progress.status} size="small" color={STATUS_COLORS[progress.status] || "default"} sx={{ height: 18, fontSize: 10 }} />
        </Box>
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <LinearProgress
          variant={progress.status === "error" ? "determinate" : progress.total > 0 ? "determinate" : "indeterminate"}
          value={progress.total > 0 ? percent : 0}
          color={progress.status === "done" ? "success" : progress.status === "error" ? "error" : "primary"}
          sx={{ flex: 1, height: 6, borderRadius: 3 }}
        />
        <Typography variant="caption" sx={{ fontSize: 10, minWidth: 36, textAlign: "right" }}>
          {progress.total > 0 ? `${percent}%` : ""}
        </Typography>
      </Box>
    </Box>
  );
}

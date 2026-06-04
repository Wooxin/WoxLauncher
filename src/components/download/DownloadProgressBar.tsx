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

export default function DownloadProgressBar({ progress }: Props) {
  const percent = Math.round(progress.percent);
  return (
    <Box sx={{ width: "100%", mb: 1 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
        <Typography variant="body2" noWrap sx={{ maxWidth: "60%" }}>
          {progress.fileName}
        </Typography>
        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          <Typography variant="caption">{progress.speed}</Typography>
          <Chip
            label={progress.status}
            size="small"
            color={STATUS_COLORS[progress.status] || "default"}
          />
        </Box>
      </Box>
      <LinearProgress
        variant={progress.status === "downloading" ? "determinate" : "indeterminate"}
        value={percent}
        color={
          progress.status === "done"
            ? "success"
            : progress.status === "error"
              ? "error"
              : "primary"
        }
      />
    </Box>
  );
}

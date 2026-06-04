import { useEffect, useState } from "react";
import { Card, CardContent, Typography, Box, IconButton, Collapse } from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import { useDownloadStore } from "../../stores/downloadStore";
import DownloadProgressBar from "./DownloadProgressBar";

export default function DownloadOverlay() {
  const { downloads, activeCount, startListening, stopListening } = useDownloadStore();
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    startListening();
    return () => {
      stopListening();
    };
  }, []);

  const activeDownloads = Object.values(downloads).filter(
    (d) => d.status !== "done" && d.status !== "error"
  );

  if (activeDownloads.length === 0) return null;

  return (
    <Card
      sx={{
        position: "fixed",
        bottom: 16,
        right: 16,
        width: 400,
        zIndex: 1300,
        opacity: 0.95,
      }}
    >
      <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 1,
            cursor: "pointer",
          }}
          onClick={() => setExpanded(!expanded)}
        >
          <Typography variant="subtitle2">
            Downloads ({activeCount} active)
          </Typography>
          <IconButton size="small">
            {expanded ? <KeyboardArrowDownIcon /> : <KeyboardArrowUpIcon />}
          </IconButton>
        </Box>
        <Collapse in={expanded}>
          {activeDownloads.map((d) => (
            <DownloadProgressBar key={d.fileName} progress={d} />
          ))}
        </Collapse>
      </CardContent>
    </Card>
  );
}

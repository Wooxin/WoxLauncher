import { useEffect } from "react";
import {
  Typography,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Chip,
  Button,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useJavaStore } from "../stores/javaStore";

export default function JavaManager() {
  const { runtimes, loading, fetchRuntimes } = useJavaStore();

  useEffect(() => {
    fetchRuntimes();
  }, []);

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Java Runtimes
        </Typography>
        <Button startIcon={<RefreshIcon />} onClick={fetchRuntimes}>
          Refresh
        </Button>
      </Box>

      {loading ? (
        <CircularProgress />
      ) : runtimes.length === 0 ? (
        <Typography color="text.secondary">
          No Java runtimes detected. Install one to get started.
        </Typography>
      ) : (
        runtimes.map((rt) => (
          <Card key={rt.id} sx={{ mb: 2 }}>
            <CardContent
              sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
            >
              <Box>
                <Typography variant="h6">
                  {rt.vendor} {rt.version}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontFamily: "monospace" }}>
                  {rt.path}
                </Typography>
              </Box>
              <Chip label={rt.id} size="small" color="primary" variant="outlined" />
            </CardContent>
          </Card>
        ))
      )}
    </Box>
  );
}

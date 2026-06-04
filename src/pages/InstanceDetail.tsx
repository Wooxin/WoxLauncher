import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  Chip,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import { invoke } from "@tauri-apps/api/core";
import type { InstanceConfig } from "../types";

export default function InstanceDetail() {
  const { id } = useParams<{ id: string }>();
  const [instance, setInstance] = useState<InstanceConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchInstance = async () => {
    if (!id) return;
    const data = await invoke<InstanceConfig>("get_instance", { id });
    setInstance(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchInstance();
  }, [id]);

  const handleLaunch = async () => {
    if (!instance) return;
    alert(
      `Launching ${instance.name}... (Auth & Java selection coming in next iteration)`
    );
  };

  if (loading) return <CircularProgress />;
  if (!instance) return <Typography>Instance not found</Typography>;

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          {instance.name}
        </Typography>
        <Button variant="contained" startIcon={<PlayArrowIcon />} onClick={handleLaunch}>
          Launch
        </Button>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Configuration
          </Typography>
          <List dense>
            <ListItem>
              <ListItemText
                primary="Game Version"
                secondary={instance.gameVersion}
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Loader"
                secondary={<Chip label={instance.loaderType} size="small" />}
              />
            </ListItem>
            <ListItem>
              <ListItemText primary="Java" secondary={`Version ${instance.javaVersion}`} />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Resolution"
                secondary={`${instance.resolutionWidth} x ${instance.resolutionHeight}`}
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="JVM Args"
                secondary={instance.jvmArgs.join(" ")}
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Created"
                secondary={new Date(instance.createdAt).toLocaleDateString()}
              />
            </ListItem>
          </List>
        </CardContent>
      </Card>
    </Box>
  );
}

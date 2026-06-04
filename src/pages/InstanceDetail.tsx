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
import { useTranslation } from "react-i18next";
import type { InstanceConfig } from "../types";

const LOADER_KEYS: Record<string, string> = {
  vanilla: "common.vanilla",
  fabric: "common.fabric",
  forge: "common.forge",
  quilt: "common.quilt",
};

export default function InstanceDetail() {
  const { id } = useParams<{ id: string }>();
  const [instance, setInstance] = useState<InstanceConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

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
      t("instance.launchPlaceholder", { name: instance.name })
    );
  };

  if (loading) return <CircularProgress />;
  if (!instance) return <Typography>{t("instance.notFound")}</Typography>;

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          {instance.name}
        </Typography>
        <Button variant="contained" startIcon={<PlayArrowIcon />} onClick={handleLaunch}>
          {t("instance.launch")}
        </Button>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            {t("instance.configuration")}
          </Typography>
          <List dense>
            <ListItem>
              <ListItemText
                primary={t("instance.gameVersion")}
                secondary={instance.gameVersion}
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary={t("instance.loader")}
                secondary={
                  <Chip
                    label={t(LOADER_KEYS[instance.loaderType] || "common.unknown")}
                    size="small"
                  />
                }
              />
            </ListItem>
            <ListItem>
              <ListItemText primary={t("instance.java")} secondary={t("instance.javaVersion", { version: instance.javaVersion })} />
            </ListItem>
            <ListItem>
              <ListItemText
                primary={t("instance.resolution")}
                secondary={`${instance.resolutionWidth} x ${instance.resolutionHeight}`}
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary={t("instance.jvmArgs")}
                secondary={instance.jvmArgs.join(" ")}
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary={t("instance.created")}
                secondary={new Date(instance.createdAt).toLocaleDateString()}
              />
            </ListItem>
          </List>
        </CardContent>
      </Card>
    </Box>
  );
}

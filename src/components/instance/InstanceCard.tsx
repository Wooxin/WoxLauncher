import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, Typography, IconButton, Box, Chip, CircularProgress } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import SettingsIcon from "@mui/icons-material/Settings";
import DownloadIcon from "@mui/icons-material/Download";
import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";
import { LOADER_KEYS } from "../../constants";
import { useJavaStore } from "../../stores/javaStore";
import type { InstanceConfig } from "../../types";
import { formatError } from "../../utils/error";
import { selectRuntimeForGameVersion } from "../../utils/java";

interface Props {
  instance: InstanceConfig;
  onDelete: (id: string) => void;
  onInstalled?: () => void;
}

export default function InstanceCard({ instance, onDelete, onInstalled }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const runtimes = useJavaStore((s) => s.runtimes);
  const [installing, setInstalling] = useState(false);

  return (
    <Card
      sx={{ display: "flex", alignItems: "center", mb: 2, cursor: "pointer", "&:hover": { bgcolor: "action.hover" } }}
      onClick={() => navigate(`/instances/${instance.id}`)}
    >
      <CardContent sx={{ flex: 1 }}>
        <Typography variant="h6">{instance.name}</Typography>
        <Box sx={{ display: "flex", gap: 1, mt: 0.5 }}>
          <Chip label={instance.gameVersion} size="small" />
          <Chip label={t(LOADER_KEYS[instance.loaderType] || "common.unknown")} size="small" color="primary" />
          {instance.lastPlayedAt && (
            <Typography variant="caption" color="text.secondary" sx={{ ml: "auto" }}>
              {t("instance.lastPlayed")}: {new Date(instance.lastPlayedAt).toLocaleDateString()}
            </Typography>
          )}
        </Box>
      </CardContent>
      <Box sx={{ pr: 1 }} onClick={(e) => e.stopPropagation()}>
        {!instance.downloaded && (
          <IconButton onClick={async (e) => {
            e.stopPropagation();
            setInstalling(true);
            try {
              const runtime = selectRuntimeForGameVersion(runtimes, instance.gameVersion, instance.javaVersion);
              await invoke("install_instance", { instance, javaPath: runtime?.path || instance.javaVersion || "java" });
              onInstalled?.();
            } catch (e) {
              alert(formatError(e));
            } finally {
              setInstalling(false);
            }
          }} disabled={installing}>
            {installing ? <CircularProgress size={20} /> : <DownloadIcon />}
          </IconButton>
        )}
        <IconButton onClick={() => navigate(`/instances/${instance.id}`)}>
          <SettingsIcon />
        </IconButton>
        <IconButton onClick={() => onDelete(instance.id)} color="error">
          <DeleteIcon />
        </IconButton>
      </Box>
    </Card>
  );
}

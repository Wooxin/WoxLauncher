import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, Typography, IconButton, Box, Chip, CircularProgress } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import SettingsIcon from "@mui/icons-material/Settings";
import DownloadIcon from "@mui/icons-material/Download";
import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";
import { LOADER_KEYS } from "../../constants";
import type { InstanceConfig } from "../../types";

interface Props {
  instance: InstanceConfig;
  onDelete: (id: string) => void;
}

export default function InstanceCard({ instance, onDelete }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
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
              await invoke("install_game_version", { version: instance.gameVersion });
            } catch (e) {
              alert(typeof e === "object" && e !== null ? ((e as any).message || String(e)) : String(e));
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

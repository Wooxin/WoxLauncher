import { useNavigate } from "react-router-dom";
import { Card, CardContent, Typography, IconButton, Box, Chip } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import type { InstanceConfig } from "../../types";

interface Props {
  instance: InstanceConfig;
  onDelete: (id: string) => void;
}

export default function InstanceCard({ instance, onDelete }: Props) {
  const navigate = useNavigate();

  return (
    <Card sx={{ display: "flex", alignItems: "center", mb: 2 }}>
      <CardContent sx={{ flex: 1 }}>
        <Typography variant="h6">{instance.name}</Typography>
        <Box sx={{ display: "flex", gap: 1, mt: 0.5 }}>
          <Chip label={instance.gameVersion} size="small" />
          <Chip label={instance.loaderType} size="small" color="primary" />
          {instance.lastPlayedAt && (
            <Typography variant="caption" color="text.secondary" sx={{ ml: "auto" }}>
              Last played: {new Date(instance.lastPlayedAt).toLocaleDateString()}
            </Typography>
          )}
        </Box>
      </CardContent>
      <Box sx={{ pr: 1 }}>
        <IconButton onClick={() => navigate(`/instances/${instance.id}`)}>
          <PlayArrowIcon />
        </IconButton>
        <IconButton onClick={() => onDelete(instance.id)} color="error">
          <DeleteIcon />
        </IconButton>
      </Box>
    </Card>
  );
}

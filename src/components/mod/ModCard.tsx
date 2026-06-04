import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  Chip,
  Box,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import type { ModResult } from "../../types";

interface Props {
  mod: ModResult;
}

const sourceColor: Record<string, "primary" | "secondary" | "success"> = {
  modrinth: "primary",
  curseforge: "secondary",
  mcmod: "success",
};

export default function ModCard({ mod }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Card
      sx={{ display: "flex", mb: 2, cursor: "pointer" }}
      onClick={() => navigate(`/mods/${mod.id}`)}
    >
      {mod.iconUrl && (
        <CardMedia
          component="img"
          sx={{ width: 100, objectFit: "contain", p: 1 }}
          image={mod.iconUrl}
          alt={mod.name}
        />
      )}
      <CardContent sx={{ flex: 1 }}>
        <Box sx={{ display: "flex", gap: 1, mb: 0.5 }}>
          <Typography variant="h6">{mod.name}</Typography>
          <Chip label={mod.source} size="small" color={sourceColor[mod.source] || "default"} />
        </Box>
        <Typography variant="body2" color="text.secondary" noWrap>
          {mod.summary}
        </Typography>
        <Box sx={{ display: "flex", gap: 0.5, mt: 1, flexWrap: "wrap" }}>
          {mod.categories.slice(0, 3).map((cat) => (
            <Chip key={cat} label={cat} size="small" variant="outlined" />
          ))}
          <Typography variant="caption" color="text.secondary" sx={{ ml: "auto" }}>
            {t("mod.downloads", { count: mod.downloads.toLocaleString() })}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

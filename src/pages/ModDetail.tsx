import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Typography, Box, Card, CardContent, CardMedia, Chip, CircularProgress } from "@mui/material";
import { useTranslation } from "react-i18next";
import { getModrinthMod } from "../services/modrinth";

export default function ModDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();

  const { data: mod, isLoading, error } = useQuery({
    queryKey: ["mod", id],
    queryFn: () => getModrinthMod(id!),
    enabled: !!id,
  });

  if (isLoading) return <CircularProgress sx={{ display: "block", mx: "auto", mt: 4 }} />;
  if (error) return <Typography color="error">{String(error)}</Typography>;
  if (!mod) return <Typography>{t("instance.notFound")}</Typography>;

  return (
    <Box>
      <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
        {mod.iconUrl && (
          <CardMedia component="img" sx={{ width: 128, height: 128, objectFit: "contain", borderRadius: 2 }} image={mod.iconUrl} alt={mod.name} />
        )}
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 600 }}>{mod.name}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>by {mod.author}</Typography>
          <Chip label={mod.source} size="small" color="primary" />
        </Box>
      </Box>
      <Card>
        <CardContent>
          <Typography variant="body1">{mod.summary}</Typography>
          <Box sx={{ display: "flex", gap: 1, mt: 2, flexWrap: "wrap" }}>
            {mod.categories.map((cat) => (
              <Chip key={cat} label={cat} size="small" variant="outlined" />
            ))}
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: "block" }}>
            {t("mod.downloads", { count: mod.downloads.toLocaleString() })}
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}

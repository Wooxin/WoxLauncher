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

  // Modrinth project endpoint includes license data, but our ModResult type doesn't map it.
  // Use a safe accessor so the UI still works.
  const license = (mod as any).license?.name || (mod as any).license || "Unknown";

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: "flex", gap: 3, mb: 3 }}>
        {mod.iconUrl && (
          <CardMedia
            component="img"
            sx={{ width: 128, height: 128, borderRadius: 2, flexShrink: 0 }}
            image={mod.iconUrl}
            alt={mod.name}
          />
        )}
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4" sx={{ fontWeight: 600, mb: 0.5 }}>
            {mod.name}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {mod.author ? `by ${mod.author}` : ""}
          </Typography>
          <Chip label={mod.source} size="small" color="primary" sx={{ mb: 1 }} />
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 1 }}>
            {mod.categories.map((cat) => (
              <Chip key={cat} label={cat} size="small" variant="outlined" />
            ))}
          </Box>
        </Box>
      </Box>

      {/* Description */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Description
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-wrap" }}>
            {mod.summary}
          </Typography>
        </CardContent>
      </Card>

      {/* Info grid */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Downloads
              </Typography>
              <Typography variant="body1">{mod.downloads.toLocaleString()}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                License
              </Typography>
              <Typography variant="body1">{license}</Typography>
            </Box>
            {mod.versions && mod.versions.length > 0 && (
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Latest Version
                </Typography>
                <Typography variant="body1">{mod.versions[0]}</Typography>
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Supported Versions */}
      {mod.versions && mod.versions.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Supported Versions
            </Typography>
            <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
              {mod.versions.map((v) => (
                <Chip key={v} label={v} size="small" variant="outlined" />
              ))}
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}

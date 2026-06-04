import { useState, useEffect, useMemo } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, Chip, Typography, Box, CircularProgress,
  ToggleButtonGroup, ToggleButton, Paper, Grid,
} from "@mui/material";
import { invoke } from "@tauri-apps/api/core";
import { useTranslation } from "react-i18next";
import { useSettingsStore } from "../../stores/settingsStore";
import type { InstanceConfig, LoaderType, MinecraftVersion } from "../../types";

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (config: InstanceConfig) => void;
}

function getCompatibleLoaders(versionId: string): LoaderType[] {
  const parts = versionId.split(".").map(Number);
  const major = parts[0] || 0;
  const minor = parts[1] || 0;
  const patch = parts[2] || 0;

  const loaders: LoaderType[] = ["vanilla"];
  if (major > 1 || (major === 1 && minor >= 14)) loaders.push("fabric");
  if (major > 1 || (major === 1 && minor >= 18)) loaders.push("quilt");
  if (major > 1 || (major === 1 && (minor > 20 || (minor === 20 && patch >= 1)))) loaders.push("neoforge");
  if (major > 1 || (major === 1 && minor >= 1)) loaders.push("forge");
  loaders.push("optifine");
  if (major === 1 && minor >= 7 && minor <= 12) loaders.push("liteloader");
  if (major === 1 && minor === 13) loaders.push("rift");
  return loaders;
}

export default function CreateInstanceDialog({ open, onClose, onSubmit }: Props) {
  const { t } = useTranslation();
  const { defaultJvmArgs } = useSettingsStore();
  const [name, setName] = useState("");
  const [gameVersion, setGameVersion] = useState<MinecraftVersion | null>(null);
  const [loaderType, setLoaderType] = useState<LoaderType>("vanilla");
  const [versions, setVersions] = useState<MinecraftVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [versionFilter, setVersionFilter] = useState<"release" | "snapshot">("release");

  useEffect(() => {
    if (open) {
      setVersionsLoading(true);
      invoke<MinecraftVersion[]>("fetch_version_manifest")
        .then(setVersions)
        .catch(() => setVersions([]))
        .finally(() => setVersionsLoading(false));
    }
  }, [open]);

  const releaseVersions = useMemo(() => versions.filter((v) => v.versionType === "release"), [versions]);
  const snapshotVersions = useMemo(() => versions.filter((v) => v.versionType !== "release"), [versions]);
  const shownVersions = versionFilter === "release" ? releaseVersions : snapshotVersions;

  const compatibleLoaders = useMemo(
    () => gameVersion ? getCompatibleLoaders(gameVersion.id) : [],
    [gameVersion]
  );

  const handleVersionSelect = (version: MinecraftVersion) => {
    const loaders = getCompatibleLoaders(version.id);
    setGameVersion(version);
    if (!loaders.includes(loaderType)) {
      setLoaderType(loaders[0]);
    }
  };

  const handleSubmit = () => {
    onSubmit({
      id: "",
      name,
      gameVersion: gameVersion?.id || "1.21",
      loaderType,
      loaderVersion: "",
      javaVersion: "17",
      jvmArgs: defaultJvmArgs ? defaultJvmArgs.split(" ").filter(Boolean) : ["-Xmx2G"],
      gameArgs: [],
      resolutionWidth: 1920,
      resolutionHeight: 1080,
      createdAt: new Date().toISOString(),
      lastPlayedAt: null,
      downloaded: false,
    });
    setName("");
    setGameVersion(null);
    setLoaderType("vanilla");
    setVersionFilter("release");
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{t("instance.createTitle")}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid size={{ xs: 12, md: 7 }}>
            <TextField
              autoFocus
              label={t("instance.instanceName")}
              fullWidth
              margin="dense"
              value={name}
              onChange={(e) => setName(e.target.value)}
              sx={{ mb: 2 }}
            />

            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
              <Typography variant="subtitle2">{t("instance.gameVersion")}</Typography>
              <ToggleButtonGroup
                value={versionFilter}
                exclusive
                onChange={(_, v) => v && setVersionFilter(v)}
                size="small"
              >
                <ToggleButton value="release">{t("instance.release")}</ToggleButton>
                <ToggleButton value="snapshot">{t("instance.snapshot")}</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {versionsLoading ? (
              <CircularProgress size={24} sx={{ display: "block", mx: "auto", my: 2 }} />
            ) : (
              <Paper variant="outlined" sx={{ maxHeight: 300, overflow: "auto", p: 1 }}>
                {shownVersions.map((v) => (
                  <Chip
                    key={v.id}
                    label={v.id}
                    size="small"
                    variant={gameVersion?.id === v.id ? "filled" : "outlined"}
                    color={gameVersion?.id === v.id ? "primary" : "default"}
                    onClick={() => handleVersionSelect(v)}
                    sx={{ m: 0.5, cursor: "pointer" }}
                  />
                ))}
              </Paper>
            )}

            {gameVersion && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                {t("instance.selected")}: {gameVersion.id} ({gameVersion.versionType})
              </Typography>
            )}
          </Grid>

          <Grid size={{ xs: 12, md: 5 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              {t("instance.loader")}
              {!gameVersion && (
                <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                  — {t("instance.selectVersionFirst")}
                </Typography>
              )}
            </Typography>

            <Paper variant="outlined" sx={{ p: 1.5, opacity: gameVersion ? 1 : 0.5 }}>
              {gameVersion ? (
                compatibleLoaders.map((loader) => (
                  <Chip
                    key={loader}
                    label={t(`common.${loader}`)}
                    variant={loaderType === loader ? "filled" : "outlined"}
                    color={loaderType === loader ? "primary" : "default"}
                    onClick={() => setLoaderType(loader)}
                    sx={{ m: 0.5 }}
                  />
                ))
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 2 }}>
                  {t("instance.selectVersionFirst")}
                </Typography>
              )}
            </Paper>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t("instance.cancel")}</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={!name.trim() || !gameVersion}>
          {t("instance.create")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

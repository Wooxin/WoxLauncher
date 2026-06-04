import { useState, useEffect } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, MenuItem, Autocomplete, Chip,
} from "@mui/material";
import { invoke } from "@tauri-apps/api/core";
import { useTranslation } from "react-i18next";
import { ALL_LOADERS } from "../../constants";
import type { InstanceConfig, LoaderType, MinecraftVersion } from "../../types";

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (config: InstanceConfig) => void;
}

export default function CreateInstanceDialog({ open, onClose, onSubmit }: Props) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [gameVersion, setGameVersion] = useState<MinecraftVersion | null>(null);
  const [loaderType, setLoaderType] = useState<LoaderType>("vanilla");
  const [versions, setVersions] = useState<MinecraftVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setVersionsLoading(true);
      invoke<MinecraftVersion[]>("fetch_version_manifest")
        .then(setVersions)
        .catch(() => setVersions([]))
        .finally(() => setVersionsLoading(false));
    }
  }, [open]);

  const handleSubmit = () => {
    onSubmit({
      id: "",
      name,
      gameVersion: gameVersion?.id || "1.21",
      loaderType,
      loaderVersion: "",
      javaVersion: "17",
      jvmArgs: ["-Xmx2G"],
      gameArgs: [],
      resolutionWidth: 1920,
      resolutionHeight: 1080,
      createdAt: new Date().toISOString(),
      lastPlayedAt: null,
    });
    setName("");
    setGameVersion(null);
    setLoaderType("vanilla");
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t("instance.createTitle")}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          label={t("instance.instanceName")}
          fullWidth
          margin="dense"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Autocomplete
          value={gameVersion}
          onChange={(_, v) => setGameVersion(v)}
          options={versions}
          getOptionLabel={(opt) => opt.id}
          loading={versionsLoading}
          renderOption={(props, opt) => (
            <li {...props} key={opt.id}>
              <span>{opt.id}</span>
              <Chip
                label={opt.versionType}
                size="small"
                sx={{ ml: 1 }}
                color={opt.versionType === "release" ? "success" : "warning"}
              />
            </li>
          )}
          renderInput={(params) => (
            <TextField
              {...params}
              label={t("instance.gameVersion")}
              margin="dense"
            />
          )}
          slotProps={{ paper: { sx: { mt: 1 } } }}
          sx={{ mt: 1 }}
        />
        <TextField
          select
          label={t("instance.loader")}
          fullWidth
          margin="dense"
          value={loaderType}
          onChange={(e) => setLoaderType(e.target.value as LoaderType)}
        >
          {ALL_LOADERS.map((loader) => (
            <MenuItem key={loader} value={loader}>
              {t(`common.${loader}`)}
            </MenuItem>
          ))}
        </TextField>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t("instance.cancel")}</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={!name.trim()}>
          {t("instance.create")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

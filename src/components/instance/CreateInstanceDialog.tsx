import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  MenuItem,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import type { InstanceConfig, LoaderType } from "../../types";

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (config: InstanceConfig) => void;
}

export default function CreateInstanceDialog({ open, onClose, onSubmit }: Props) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [gameVersion, setGameVersion] = useState("1.21");
  const [loaderType, setLoaderType] = useState<LoaderType>("vanilla");

  const handleSubmit = () => {
    onSubmit({
      id: "",
      name,
      gameVersion,
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
        <TextField
          label={t("instance.gameVersion")}
          fullWidth
          margin="dense"
          value={gameVersion}
          onChange={(e) => setGameVersion(e.target.value)}
        />
        <TextField
          select
          label={t("instance.loader")}
          fullWidth
          margin="dense"
          value={loaderType}
          onChange={(e) => setLoaderType(e.target.value as LoaderType)}
        >
          <MenuItem value="vanilla">{t("common.vanilla")}</MenuItem>
          <MenuItem value="fabric">{t("common.fabric")}</MenuItem>
          <MenuItem value="forge">{t("common.forge")} ({t("mod.comingSoon")})</MenuItem>
          <MenuItem value="quilt">{t("common.quilt")} ({t("mod.comingSoon")})</MenuItem>
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

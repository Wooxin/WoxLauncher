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
import type { InstanceConfig, LoaderType } from "../../types";

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (config: InstanceConfig) => void;
}

export default function CreateInstanceDialog({ open, onClose, onSubmit }: Props) {
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
      <DialogTitle>Create New Instance</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          label="Instance Name"
          fullWidth
          margin="dense"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <TextField
          label="Game Version"
          fullWidth
          margin="dense"
          value={gameVersion}
          onChange={(e) => setGameVersion(e.target.value)}
        />
        <TextField
          select
          label="Loader"
          fullWidth
          margin="dense"
          value={loaderType}
          onChange={(e) => setLoaderType(e.target.value as LoaderType)}
        >
          <MenuItem value="vanilla">Vanilla</MenuItem>
          <MenuItem value="fabric">Fabric</MenuItem>
          <MenuItem value="forge">Forge (coming soon)</MenuItem>
          <MenuItem value="quilt">Quilt (coming soon)</MenuItem>
        </TextField>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={!name.trim()}>
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
}

import { useEffect, useState } from "react";
import { Typography, Box, Button, Paper, Snackbar, Alert, CircularProgress, TextField, MenuItem, Chip, IconButton, Dialog, DialogTitle, DialogContent } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DownloadIcon from "@mui/icons-material/Download";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { open } from "@tauri-apps/plugin-dialog";
import { useTranslation } from "react-i18next";
import { useInstanceStore } from "../stores/instanceStore";
import { useModSearch } from "../hooks/useModSearch";
import { getModrinthDownloadUrl } from "../services/modrinth";
import { getCurseForgeDownloadUrl } from "../services/curseforge";
import InstanceCard from "../components/instance/InstanceCard";
import CreateInstanceDialog from "../components/instance/CreateInstanceDialog";
import AsyncState from "../components/common/AsyncState";
import { formatError } from "../utils/error";
import type { ImportedModpack, InstanceConfig, ModSource } from "../types";

export default function Instances() {
  const { t } = useTranslation();
  const { instances, loading, error, fetchInstances, createInstance, deleteInstance } =
    useInstanceStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [packDialogOpen, setPackDialogOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [packQuery, setPackQuery] = useState("");
  const [packVersion, setPackVersion] = useState("");
  const [packSource, setPackSource] = useState<ModSource>("modrinth");
  const [releaseVersions, setReleaseVersions] = useState<{ id: string; versionType: string }[]>([]);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" | "info" }>({
    open: false,
    message: "",
    severity: "info",
  });

  useEffect(() => {
    if (instances.length === 0) fetchInstances();
  }, []);

  useEffect(() => {
    invoke<{ id: string; versionType: string }[]>("fetch_version_manifest")
      .then((versions) => setReleaseVersions(versions.filter((v) => v.versionType === "release")))
      .catch(() => {});
  }, []);

  const { data: packs, isLoading: packsLoading } = useModSearch(
    packQuery,
    packSource,
    packVersion || undefined,
    "modpack",
    packDialogOpen,
  );

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    getCurrentWindow()
      .onDragDropEvent((event) => {
        if (event.payload.type === "over") {
          setDragging(true);
          return;
        }
        if (event.payload.type === "leave") {
          setDragging(false);
          return;
        }
        if (event.payload.type === "drop") {
          setDragging(false);
          const filePath = event.payload.paths?.[0];
          if (filePath) void handleImport(filePath);
        }
      })
      .then((fn) => { unlisten = fn; })
      .catch(() => {});
    return () => { unlisten?.(); };
  }, []);

  const handleCreate = async (config: InstanceConfig) => {
    await createInstance(config);
  };

  const handleDelete = async (id: string) => {
    await deleteInstance(id);
  };

  const handleImport = async (filePath: string) => {
    try {
      setImporting(true);
      const result = await invoke<ImportedModpack>("import_modpack", { filePath });
      await fetchInstances();
      setSnackbar({
        open: true,
        severity: "success",
        message: `已导入 ${result.instance.name} (${result.format})`,
      });
    } catch (e) {
      setSnackbar({ open: true, severity: "error", message: formatError(e) });
    } finally {
      setImporting(false);
    }
  };

  const handlePickModpack = async () => {
    const selected = await open({
      multiple: false,
      filters: [{ name: "Minecraft Modpacks", extensions: ["zip", "mrpack"] }],
    });
    if (typeof selected === "string") {
      await handleImport(selected);
    }
  };

  const handleDownloadPack = async (pack: { id: string; name: string; source: ModSource }) => {
    try {
      setImporting(true);
      let dl: { url: string; filename: string } | null = null;
      if (pack.source === "modrinth") {
        dl = await getModrinthDownloadUrl(pack.id, packVersion || undefined);
      } else if (pack.source === "curseforge") {
        dl = await getCurseForgeDownloadUrl(pack.id, packVersion || undefined);
      } else {
        setSnackbar({ open: true, severity: "info", message: "MCMod 暂无可解析的整合包直链，请用文件导入。" });
        return;
      }

      if (!dl) {
        setSnackbar({ open: true, severity: "error", message: `${pack.name} 没有可用下载文件` });
        return;
      }

      const result = await invoke<ImportedModpack>("import_modpack_from_url", {
        url: dl.url,
        fileName: dl.filename,
      });
      await fetchInstances();
      setSnackbar({ open: true, severity: "success", message: `已安装整合包 ${result.instance.name}` });
    } catch (e) {
      setSnackbar({ open: true, severity: "error", message: formatError(e) });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          {t("instance.title")}
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={() => setPackDialogOpen(true)}
          >
            下载整合包
          </Button>
          <Button
            variant="outlined"
            startIcon={importing ? <CircularProgress size={18} /> : <UploadFileIcon />}
            onClick={handlePickModpack}
            disabled={importing}
          >
            导入整合包
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setDialogOpen(true)}
          >
            {t("instance.newInstance")}
          </Button>
        </Box>
      </Box>

      <Paper
        variant="outlined"
        sx={{
          mb: 2,
          px: 2,
          py: 1.5,
          borderStyle: dragging ? "solid" : "dashed",
          borderColor: dragging ? "primary.main" : "divider",
          bgcolor: dragging ? "action.hover" : "transparent",
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <UploadFileIcon color={dragging ? "primary" : "disabled"} />
        <Typography variant="body2" color="text.secondary">
          将 CurseForge / Modrinth .mrpack / MultiMC / Prism 整合包拖到这里导入
        </Typography>
      </Paper>

      <AsyncState
        loading={loading}
        error={error}
        empty={instances.length === 0}
        emptyMessage={t("instance.noInstances")}
      >
        {instances.map((inst) => (
          <InstanceCard key={inst.id} instance={inst} onDelete={handleDelete} onInstalled={fetchInstances} />
        ))}
      </AsyncState>

      <Dialog open={packDialogOpen} onClose={() => setPackDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          下载整合包
          {packsLoading && <CircularProgress size={20} />}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 1.5 }}>
            <TextField
              select
              size="small"
              label="来源"
              value={packSource}
              onChange={(e) => setPackSource(e.target.value as ModSource)}
              sx={{ minWidth: 130 }}
            >
              <MenuItem value="modrinth">Modrinth</MenuItem>
              <MenuItem value="curseforge">CurseForge</MenuItem>
              <MenuItem value="mcmod">MCMod</MenuItem>
            </TextField>
            <TextField
              size="small"
              placeholder="搜索整合包..."
              value={packQuery}
              onChange={(e) => setPackQuery(e.target.value)}
              sx={{ flex: 1, minWidth: 180 }}
            />
            <TextField
              select
              size="small"
              label="游戏版本"
              value={packVersion}
              onChange={(e) => setPackVersion(e.target.value)}
              sx={{ minWidth: 130 }}
            >
              <MenuItem value="">全部</MenuItem>
              {releaseVersions.slice(0, 30).map((v) => (
                <MenuItem key={v.id} value={v.id}>{v.id}</MenuItem>
              ))}
            </TextField>
          </Box>
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 1, pb: 1 }}>
            {packs?.map((pack) => (
              <Paper key={`${pack.source}-${pack.id}`} variant="outlined" sx={{ p: 1.25 }}>
                <Box sx={{ display: "flex", gap: 1 }}>
                  {pack.iconUrl && (
                    <Box component="img" src={pack.iconUrl} sx={{ width: 42, height: 42, objectFit: "contain", borderRadius: 1 }} />
                  )}
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>{pack.name}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", height: 34, overflow: "hidden" }}>
                      {pack.summary}
                    </Typography>
                    <Box sx={{ display: "flex", gap: 0.5, mt: 0.5 }}>
                      <Chip label={pack.source} size="small" sx={{ height: 18, fontSize: 10 }} />
                      {pack.categories.slice(0, 1).map((cat) => (
                        <Chip key={cat} label={cat} size="small" variant="outlined" sx={{ height: 18, fontSize: 10 }} />
                      ))}
                    </Box>
                  </Box>
                  <IconButton size="small" color="primary" onClick={() => handleDownloadPack(pack)} disabled={importing}>
                    {importing ? <CircularProgress size={18} /> : <DownloadIcon fontSize="small" />}
                  </IconButton>
                </Box>
              </Paper>
            ))}
            {packs?.length === 0 && packQuery && !packsLoading && (
              <Typography color="text.secondary" sx={{ gridColumn: "1 / -1", textAlign: "center", py: 4 }}>
                没有找到整合包
              </Typography>
            )}
          </Box>
        </DialogContent>
      </Dialog>

      <CreateInstanceDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleCreate}
      />
      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar((current) => ({ ...current, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((current) => ({ ...current, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

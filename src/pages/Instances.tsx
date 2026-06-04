import { useEffect, useState } from "react";
import { Typography, Box, Button, CircularProgress } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useTranslation } from "react-i18next";
import { useInstanceStore } from "../stores/instanceStore";
import InstanceCard from "../components/instance/InstanceCard";
import CreateInstanceDialog from "../components/instance/CreateInstanceDialog";
import type { InstanceConfig } from "../types";

export default function Instances() {
  const { t } = useTranslation();
  const { instances, loading, fetchInstances, createInstance, deleteInstance } =
    useInstanceStore();
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchInstances();
  }, []);

  const handleCreate = async (config: InstanceConfig) => {
    await createInstance(config);
  };

  const handleDelete = async (id: string) => {
    await deleteInstance(id);
  };

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          {t("instance.title")}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
        >
          {t("instance.newInstance")}
        </Button>
      </Box>

      {loading ? (
        <CircularProgress />
      ) : instances.length === 0 ? (
        <Typography color="text.secondary">
          {t("instance.noInstances")}
        </Typography>
      ) : (
        instances.map((inst) => (
          <InstanceCard key={inst.id} instance={inst} onDelete={handleDelete} />
        ))
      )}

      <CreateInstanceDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleCreate}
      />
    </Box>
  );
}

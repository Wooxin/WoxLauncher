import { useEffect, useState } from "react";
import { Typography, Box, Button } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useTranslation } from "react-i18next";
import { useInstanceStore } from "../stores/instanceStore";
import InstanceCard from "../components/instance/InstanceCard";
import CreateInstanceDialog from "../components/instance/CreateInstanceDialog";
import AsyncState from "../components/common/AsyncState";
import type { InstanceConfig } from "../types";

export default function Instances() {
  const { t } = useTranslation();
  const { instances, loading, error, fetchInstances, createInstance, deleteInstance } =
    useInstanceStore();
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (instances.length === 0) fetchInstances();
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

      <AsyncState
        loading={loading}
        error={error}
        empty={instances.length === 0}
        emptyMessage={t("instance.noInstances")}
      >
        {instances.map((inst) => (
          <InstanceCard key={inst.id} instance={inst} onDelete={handleDelete} />
        ))}
      </AsyncState>

      <CreateInstanceDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleCreate}
      />
    </Box>
  );
}

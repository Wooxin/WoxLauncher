import { useState } from "react";
import { Typography, Box, TextField, CircularProgress } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useModSearch } from "../hooks/useModSearch";
import SourceTabs from "../components/mod/SourceTabs";
import ModCard from "../components/mod/ModCard";
import type { ModSource } from "../types";

export default function ModBrowser() {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<ModSource>("modrinth");
  const { data: results, isLoading } = useModSearch(query, source, undefined, "mod");

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 600, mb: 3 }}>
        {t("mod.title")}
      </Typography>

      <TextField
        fullWidth
        placeholder={t("mod.searchPlaceholder")}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        sx={{ mb: 2 }}
      />

      <SourceTabs value={source} onChange={setSource} />

      {isLoading && <CircularProgress sx={{ display: "block", mx: "auto", mt: 4 }} />}

      {results?.map((mod) => (
        <ModCard key={`${mod.source}-${mod.id}`} mod={mod} />
      ))}

      {results?.length === 0 && query && !isLoading && (
        <Typography color="text.secondary" sx={{ mt: 4, textAlign: "center" }}>
          {t("mod.noResults", { query })}
        </Typography>
      )}
    </Box>
  );
}

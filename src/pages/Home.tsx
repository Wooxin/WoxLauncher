import { Typography, Box } from "@mui/material";
import { useTranslation } from "react-i18next";

export default function Home() {
  const { t } = useTranslation();
  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 600, mb: 2 }}>
        {t("app.welcome")}
      </Typography>
      <Typography variant="body1" color="text.secondary">
        {t("app.subtitle")}
      </Typography>
    </Box>
  );
}

import {
  Typography,
  Box,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Switch,
  Select,
  MenuItem,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";
import { useSettingsStore } from "../stores/settingsStore";

export default function Settings() {
  const { t } = useTranslation();
  const { keepOpen, setKeepOpen } = useSettingsStore();

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 600, mb: 3 }}>
        {t("settings.title")}
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            {t("settings.general")}
          </Typography>
          <List>
            <ListItem>
              <ListItemText
                primary={t("settings.keepOpen")}
                secondary={t("settings.keepOpenDesc")}
              />
              <Switch checked={keepOpen} onChange={(e) => setKeepOpen(e.target.checked)} />
            </ListItem>
            <ListItem>
              <ListItemText
                primary={t("settings.downloadPath")}
                secondary="~/.woxlauncher"
              />
            </ListItem>
          </List>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            {t("settings.language")}
          </Typography>
          <Select
            value={i18n.language}
            onChange={(e) => i18n.changeLanguage(e.target.value)}
            size="small"
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="en">English</MenuItem>
            <MenuItem value="zh-CN">简体中文</MenuItem>
            <MenuItem value="zh-TW">繁體中文</MenuItem>
            <MenuItem value="ja">日本語</MenuItem>
            <MenuItem value="ko">한국어</MenuItem>
            <MenuItem value="ru">Русский</MenuItem>
            <MenuItem value="fr">Français</MenuItem>
            <MenuItem value="de">Deutsch</MenuItem>
            <MenuItem value="es">Español</MenuItem>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            {t("settings.about")}
          </Typography>
          <List>
            <ListItem>
              <ListItemText primary={t("settings.version")} secondary={t("settings.versionValue")} />
            </ListItem>
            <ListItem>
              <ListItemText
                primary={t("settings.builtWith")}
                secondary={t("settings.builtWithValue")}
              />
            </ListItem>
          </List>
        </CardContent>
      </Card>
    </Box>
  );
}

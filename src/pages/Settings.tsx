import { Select, MenuItem } from "@mui/material";
import { Typography, Box, Card, CardContent, List, ListItem, ListItemText, Switch, TextField, ToggleButtonGroup, ToggleButton, InputAdornment } from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import PaletteIcon from "@mui/icons-material/Palette";
import DownloadIcon from "@mui/icons-material/Download";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import InfoIcon from "@mui/icons-material/Info";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";
import { useSettingsStore } from "../stores/settingsStore";

export default function Settings() {
  const { t } = useTranslation();
  const {
    theme, setTheme, keepOpen, setKeepOpen,
    downloadMirror, setDownloadMirror, maxDownloadThreads, setMaxDownloadThreads,
    defaultJvmArgs, setDefaultJvmArgs, maxMemoryGb, setMaxMemoryGb,
    autoMemory, setAutoMemory,
  } = useSettingsStore();

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 600, mb: 3 }}>
        {t("settings.title")}
      </Typography>

      {/* General */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <SettingsIcon color="primary" />
            <Typography variant="h6">{t("settings.general")}</Typography>
          </Box>
          <List>
            <ListItem>
              <ListItemText primary={t("settings.keepOpen")} secondary={t("settings.keepOpenDesc")} />
              <Switch checked={keepOpen} onChange={(e) => setKeepOpen(e.target.checked)} />
            </ListItem>
            <ListItem>
              <ListItemText primary={t("settings.downloadPath")} secondary="~/.woxlauncher" />
            </ListItem>
          </List>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <PaletteIcon color="primary" />
            <Typography variant="h6">{t("settings.appearance")}</Typography>
          </Box>
          <List>
            <ListItem>
              <ListItemText primary={t("settings.theme")} />
              <ToggleButtonGroup value={theme} exclusive onChange={(_, v) => v && setTheme(v)} size="small">
                <ToggleButton value="dark">{t("settings.dark")}</ToggleButton>
                <ToggleButton value="light">{t("settings.light")}</ToggleButton>
              </ToggleButtonGroup>
            </ListItem>
            <ListItem>
              <ListItemText primary={t("settings.language")} />
              <Select value={i18n.language} onChange={(e) => i18n.changeLanguage(e.target.value)} size="small" sx={{ minWidth: 200 }}>
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
            </ListItem>
          </List>
        </CardContent>
      </Card>

      {/* Download */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <DownloadIcon color="primary" />
            <Typography variant="h6">{t("settings.download")}</Typography>
          </Box>
          <TextField
            select
            label={t("settings.mirror")}
            value={downloadMirror}
            onChange={(e) => setDownloadMirror(e.target.value as any)}
            fullWidth size="small"
            sx={{ mb: 2 }}
          >
            <MenuItem value="official">{t("settings.mirrorOfficial")}</MenuItem>
            <MenuItem value="bmclapi">{t("settings.mirrorBmclapi")}</MenuItem>
            <MenuItem value="mcbbs">{t("settings.mirrorMcbbs")}</MenuItem>
          </TextField>
          <TextField
            label={t("settings.maxThreads")}
            type="number"
            value={maxDownloadThreads}
            onChange={(e) => setMaxDownloadThreads(Number(e.target.value))}
            fullWidth size="small"
            slotProps={{ htmlInput: { min: 1, max: 16 } }}
          />
        </CardContent>
      </Card>

      {/* Launch */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <RocketLaunchIcon color="primary" />
            <Typography variant="h6">{t("settings.launch")}</Typography>
          </Box>
          <List>
            <ListItem disablePadding sx={{ mb: 2 }}>
              <ListItemText primary={t("settings.autoMemory")} secondary={t("settings.autoMemoryDesc")} />
              <Switch checked={autoMemory} onChange={(e) => setAutoMemory(e.target.checked)} />
            </ListItem>
          </List>
          <TextField
            label={t("settings.defaultJvmArgs")}
            value={defaultJvmArgs}
            onChange={(e) => setDefaultJvmArgs(e.target.value)}
            fullWidth multiline rows={2} size="small"
            sx={{ mb: 2 }}
            disabled={autoMemory}
          />
          <TextField
            label={t("settings.maxMemory")}
            type="number"
            value={maxMemoryGb}
            onChange={(e) => setMaxMemoryGb(Number(e.target.value))}
            fullWidth size="small"
            disabled={autoMemory}
            slotProps={{ input: { endAdornment: <InputAdornment position="end">GB</InputAdornment> } }}
          />
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <InfoIcon color="primary" />
            <Typography variant="h6">{t("settings.about")}</Typography>
          </Box>
          <List>
            <ListItem>
              <ListItemText primary={t("settings.version")} secondary={t("settings.versionValue")} />
            </ListItem>
            <ListItem>
              <ListItemText primary={t("settings.builtWith")} secondary={t("settings.builtWithValue")} />
            </ListItem>
          </List>
        </CardContent>
      </Card>
    </Box>
  );
}

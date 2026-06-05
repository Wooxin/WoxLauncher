import { memo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Drawer, List, ListItemButton, ListItemIcon, ListItemText,
  Typography, Box, Tooltip, Divider,
} from "@mui/material";
import HomeIcon from "@mui/icons-material/Home";
import FolderIcon from "@mui/icons-material/Folder";
import SettingsIcon from "@mui/icons-material/Settings";
import PersonIcon from "@mui/icons-material/Person";
import GrassIcon from "@mui/icons-material/Grid3x3";
import { useTranslation } from "react-i18next";

interface SidebarProps {
  width: number;
  collapsed: boolean;
}

export default memo(function Sidebar({ width, collapsed }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const navItems = [
    { path: "/", label: t("nav.home"), icon: <HomeIcon /> },
    { path: "/instances", label: t("nav.instances"), icon: <FolderIcon /> },
    { path: "/accounts", label: t("nav.accounts"), icon: <PersonIcon /> },
  ];

  const bottomItems = [
    { path: "/settings", label: t("nav.settings"), icon: <SettingsIcon /> },
  ];

  const isActive = (path: string) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  return (
    <Drawer
      variant="permanent"
      sx={{
        width,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width,
          boxSizing: "border-box",
          bgcolor: "#171717",
          borderRight: "1px solid #2B2B2B",
          overflowX: "hidden",
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      {/* Logo */}
      <Box sx={{ px: 2, pt: 3, pb: 2.5, display: "flex", alignItems: "center", gap: 1.5 }}>
        <GrassIcon sx={{ color: "primary.light", fontSize: 26 }} />
        {!collapsed && (
          <Typography variant="h6" sx={{ fontWeight: 800, color: "text.primary" }}>
            {t("app.title")}
          </Typography>
        )}
      </Box>

      <Divider sx={{ borderColor: "#333", mx: 1 }} />

      {/* Main nav */}
      <List sx={{ flex: 1, pt: 1 }}>
        {navItems.map((item) => {
          const btn = (
            <ListItemButton
              key={item.path}
              selected={isActive(item.path)}
              onClick={() => navigate(item.path)}
              sx={{
                mx: 0.5, borderRadius: 1, mb: 0.5,
                justifyContent: collapsed ? "center" : "flex-start",
                minHeight: 44,
              }}
            >
              <ListItemIcon sx={{
                minWidth: collapsed ? 0 : 38,
                justifyContent: "center",
                color: isActive(item.path) ? "primary.light" : "text.secondary",
              }}>
                {item.icon}
              </ListItemIcon>
              {!collapsed && <ListItemText primary={item.label} />}
            </ListItemButton>
          );
          if (collapsed) return <Tooltip key={item.path} title={item.label || ""} placement="right">{btn}</Tooltip>;
          return <Box key={item.path}>{btn}</Box>;
        })}
      </List>

      {/* Bottom nav */}
      <Divider sx={{ borderColor: "#333", mx: 1 }} />
      <List sx={{ pb: 1 }}>
        {bottomItems.map((item) => {
          const btn = (
            <ListItemButton
              key={item.path}
              selected={isActive(item.path)}
              onClick={() => navigate(item.path)}
              sx={{
                mx: 0.5, borderRadius: 1, mb: 0.5,
                justifyContent: collapsed ? "center" : "flex-start",
                minHeight: 44,
              }}
            >
              <ListItemIcon sx={{
                minWidth: collapsed ? 0 : 38,
                justifyContent: "center",
                color: isActive(item.path) ? "primary.light" : "text.secondary",
              }}>
                {item.icon}
              </ListItemIcon>
              {!collapsed && <ListItemText primary={item.label} />}
            </ListItemButton>
          );
          if (collapsed) return <Tooltip key={item.path} title={item.label || ""} placement="right">{btn}</Tooltip>;
          return <Box key={item.path}>{btn}</Box>;
        })}
      </List>
    </Drawer>
  );
});

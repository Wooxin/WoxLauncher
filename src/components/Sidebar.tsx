import { memo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Drawer, List, ListItemButton, ListItemIcon, ListItemText,
  Typography, Box, Tooltip,
} from "@mui/material";
import HomeIcon from "@mui/icons-material/Home";
import FolderIcon from "@mui/icons-material/Folder";
import SettingsIcon from "@mui/icons-material/Settings";
import PersonIcon from "@mui/icons-material/Person";
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
    { path: "/settings", label: t("nav.settings"), icon: <SettingsIcon /> },
  ];

  return (
    <Drawer
      variant="permanent"
      sx={{
        width,
        flexShrink: 0,
        transition: "width 0.15s ease",
        "& .MuiDrawer-paper": {
          width,
          boxSizing: "border-box",
          bgcolor: "background.paper",
          borderRight: "1px solid",
          borderColor: "divider",
          transition: "width 0.15s ease",
          overflowX: "hidden",
        },
      }}
    >
      <Box sx={{ p: 2, pt: 3, display: "flex", alignItems: "center", gap: 1 }}>
        {!collapsed && (
          <Typography variant="h5" sx={{ fontWeight: 700, flex: 1 }} color="primary.main">
            {t("app.title")}
          </Typography>
        )}
      </Box>
      <List>
        {navItems.map((item) => {
          const btn = (
            <ListItemButton
              key={item.path}
              selected={location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(item.path))}
              onClick={() => navigate(item.path)}
              sx={{ mx: 1, borderRadius: 2, mb: 0.5, justifyContent: collapsed ? "center" : "flex-start" }}
            >
              <ListItemIcon sx={{ minWidth: collapsed ? 0 : 40, justifyContent: "center" }}>
                {item.icon}
              </ListItemIcon>
              {!collapsed && <ListItemText primary={item.label} />}
            </ListItemButton>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.path} title={item.label || ""} placement="right">
                {btn}
              </Tooltip>
            );
          }
          return <Box key={item.path}>{btn}</Box>;
        })}
      </List>
    </Drawer>
  );
});

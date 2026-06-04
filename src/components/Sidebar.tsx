import { useLocation, useNavigate } from "react-router-dom";
import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
} from "@mui/material";
import HomeIcon from "@mui/icons-material/Home";
import FolderIcon from "@mui/icons-material/Folder";
import ExtensionIcon from "@mui/icons-material/Extension";
import CoffeeIcon from "@mui/icons-material/Coffee";
import SettingsIcon from "@mui/icons-material/Settings";

interface SidebarProps {
  width: number;
}

const navItems = [
  { path: "/", label: "Home", icon: <HomeIcon /> },
  { path: "/instances", label: "Instances", icon: <FolderIcon /> },
  { path: "/mods", label: "Mod Browser", icon: <ExtensionIcon /> },
  { path: "/java", label: "Java", icon: <CoffeeIcon /> },
  { path: "/settings", label: "Settings", icon: <SettingsIcon /> },
];

export default function Sidebar({ width }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <Drawer
      variant="permanent"
      sx={{
        width,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width,
          boxSizing: "border-box",
          bgcolor: "background.paper",
          borderRight: "1px solid",
          borderColor: "divider",
        },
      }}
    >
      <Box sx={{ p: 2, pt: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }} color="primary.main">
          WoxLauncher
        </Typography>
      </Box>
      <List>
        {navItems.map((item) => (
          <ListItemButton
            key={item.path}
            selected={location.pathname === item.path}
            onClick={() => navigate(item.path)}
            sx={{ mx: 1, borderRadius: 2, mb: 0.5 }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
    </Drawer>
  );
}

import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Box, IconButton } from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import Sidebar from "../components/Sidebar";
import DownloadOverlay from "../components/download/DownloadOverlay";

const EXPANDED_WIDTH = 240;
const COLLAPSED_WIDTH = 68;

export default function SidebarLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const drawerWidth = collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH;

  return (
    <Box sx={{ display: "flex", height: "100vh" }}>
      <Sidebar width={drawerWidth} collapsed={collapsed} />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          overflow: "auto",
          height: "100%",
          position: "relative",
        }}
      >
        <IconButton
          onClick={() => setCollapsed(!collapsed)}
          sx={{
            position: "absolute",
            top: 12,
            left: 12,
            zIndex: 10,
            bgcolor: "background.paper",
            boxShadow: 1,
            "&:hover": { bgcolor: "action.hover" },
          }}
        >
          {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
        </IconButton>
        <Box sx={{ mt: 5 }}>
          <Outlet />
        </Box>
      </Box>
      <DownloadOverlay />
    </Box>
  );
}

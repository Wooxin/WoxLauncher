import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Box, IconButton } from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import Sidebar from "../components/Sidebar";
import DownloadOverlay from "../components/download/DownloadOverlay";
import { useDownloadStore } from "../stores/downloadStore";
import { useInstanceStore } from "../stores/instanceStore";
import { useAccountStore } from "../stores/accountStore";
import { useJavaStore } from "../stores/javaStore";

const EXPANDED_WIDTH = 240;
const COLLAPSED_WIDTH = 68;

export default function SidebarLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const drawerWidth = collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH;

  // Start download listener globally
  const startListening = useDownloadStore(s => s.startListening);
  useEffect(() => { startListening(); }, []);

  // Pre-fetch data on mount so pages load instantly
  const fetchInstances = useInstanceStore(s => s.fetchInstances);
  const fetchAccounts = useAccountStore(s => s.fetchAccounts);
  const fetchRuntimes = useJavaStore(s => s.fetchRuntimes);
  useEffect(() => {
    fetchInstances();
    fetchAccounts();
    fetchRuntimes();
  }, []);

  return (
    <Box sx={{ display: "flex", height: "100vh" }}>
      <Sidebar width={drawerWidth} collapsed={collapsed} />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          px: { xs: 2, md: 4 },
          py: 3,
          overflow: "auto",
          height: "100%",
          position: "relative",
          bgcolor: "background.default",
        }}
      >
        <IconButton
          onClick={() => setCollapsed(!collapsed)}
          sx={{
            position: "absolute",
            top: 12,
            left: 12,
            zIndex: 10,
            bgcolor: "#202020",
            border: "1px solid",
            borderColor: "divider",
            boxShadow: "none",
            "&:hover": { bgcolor: "action.hover" },
          }}
        >
          {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
        </IconButton>
        <Box sx={{ mt: 4, maxWidth: 1180, mx: "auto" }}>
          <Outlet />
        </Box>
      </Box>
      <DownloadOverlay />
    </Box>
  );
}

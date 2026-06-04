import { Outlet } from "react-router-dom";
import { Box } from "@mui/material";
import Sidebar from "../components/Sidebar";
import DownloadOverlay from "../components/download/DownloadOverlay";

const DRAWER_WIDTH = 240;

export default function SidebarLayout() {
  return (
    <Box sx={{ display: "flex", height: "100vh" }}>
      <Sidebar width={DRAWER_WIDTH} />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          overflow: "auto",
          height: "100%",
        }}
      >
        <Outlet />
      </Box>
      <DownloadOverlay />
    </Box>
  );
}

import { Typography, Box } from "@mui/material";

export default function Home() {
  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 600, mb: 2 }}>
        Welcome to WoxLauncher
      </Typography>
      <Typography variant="body1" color="text.secondary">
        A fast, modern Minecraft launcher. Create an instance to get started.
      </Typography>
    </Box>
  );
}

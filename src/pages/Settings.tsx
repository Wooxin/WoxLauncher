import { Typography, Box, Card, CardContent, List, ListItem, ListItemText, Switch } from "@mui/material";

export default function Settings() {
  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 600, mb: 3 }}>
        Settings
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            General
          </Typography>
          <List>
            <ListItem>
              <ListItemText
                primary="Keep launcher open after game starts"
                secondary="Launcher stays available while playing"
              />
              <Switch defaultChecked />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Download path"
                secondary="~/.woxlauncher"
              />
            </ListItem>
          </List>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            About
          </Typography>
          <List>
            <ListItem>
              <ListItemText primary="WoxLauncher" secondary="Version 0.1.0" />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Built with"
                secondary="Tauri 2 + React 19 + MUI"
              />
            </ListItem>
          </List>
        </CardContent>
      </Card>
    </Box>
  );
}

import { useEffect, useState } from "react";
import {
  Typography, Box, Card, CardContent, Button, Chip,
  IconButton, CircularProgress, Alert,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import PersonIcon from "@mui/icons-material/Person";
import { useTranslation } from "react-i18next";
import { useAccountStore } from "../stores/accountStore";
import LoginDialog from "../components/account/LoginDialog";

export default function Accounts() {
  const { t } = useTranslation();
  const { accounts, activeAccount, loading, error, fetchAccounts, setActive, deleteAccount } = useAccountStore();
  const [loginOpen, setLoginOpen] = useState(false);

  useEffect(() => { fetchAccounts(); }, []);

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          {t("nav.accounts")}
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setLoginOpen(true)}>
          {t("account.addAccount")}
        </Button>
      </Box>

      {loading ? (
        <CircularProgress />
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : accounts.length === 0 ? (
        <Card sx={{ textAlign: "center", p: 4 }}>
          <CardContent>
            <PersonIcon sx={{ fontSize: 48, color: "text.secondary", mb: 2 }} />
            <Typography variant="h6" sx={{ mb: 1 }}>{t("account.notLoggedIn")}</Typography>
            <Button variant="contained" onClick={() => setLoginOpen(true)}>
              {t("account.login")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        accounts.map((acc) => (
          <Card key={acc.uuid} sx={{ mb: 2 }}>
            <CardContent sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                  <Typography variant="h6">{acc.username}</Typography>
                  {acc.uuid === activeAccount?.uuid && (
                    <Chip label={t("account.active")} size="small" color="success" />
                  )}
                </Box>
                <Box sx={{ display: "flex", gap: 1 }}>
                  <Chip label={acc.authMode} size="small" color="primary" variant="outlined" />
                  <Typography variant="caption" color="text.secondary">
                    UUID: {acc.uuid.substring(0, 8)}...
                  </Typography>
                </Box>
              </Box>
              <Box>
                {acc.uuid !== activeAccount?.uuid && (
                  <Button size="small" onClick={() => setActive(acc.uuid)}>
                    {t("account.switchAccount")}
                  </Button>
                )}
                <IconButton onClick={() => deleteAccount(acc.uuid)} color="error" size="small">
                  <DeleteIcon />
                </IconButton>
              </Box>
            </CardContent>
          </Card>
        ))
      )}

      <LoginDialog open={loginOpen} onClose={() => setLoginOpen(false)} />
    </Box>
  );
}

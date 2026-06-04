import { useState, useEffect } from "react";
import { Box, Button, Typography, Menu, MenuItem, Chip } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import PersonIcon from "@mui/icons-material/Person";
import { useTranslation } from "react-i18next";
import { useAccountStore } from "../../stores/accountStore";
import LoginDialog from "./LoginDialog";

export default function AccountPicker() {
  const { t } = useTranslation();
  const { accounts, activeAccount, fetchAccounts, setActive, deleteAccount } = useAccountStore();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [loginOpen, setLoginOpen] = useState(false);

  useEffect(() => { fetchAccounts(); }, []);

  const handleOpenMenu = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleSwitch = async (uuid: string) => {
    await setActive(uuid);
    handleClose();
  };

  const handleDelete = async (uuid: string) => {
    await deleteAccount(uuid);
    handleClose();
  };

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <Button
        variant="outlined"
        startIcon={activeAccount ? <PersonIcon /> : <AddIcon />}
        onClick={activeAccount ? handleOpenMenu : () => setLoginOpen(true)}
        size="small"
      >
        {activeAccount ? activeAccount.username : t("account.notLoggedIn")}
      </Button>

      {activeAccount && (
        <Chip label={activeAccount.authMode} size="small" color="primary" variant="outlined" />
      )}

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
        {accounts.map((acc) => (
          <MenuItem key={acc.uuid} selected={acc.uuid === activeAccount?.uuid} onClick={() => handleSwitch(acc.uuid)}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%", justifyContent: "space-between" }}>
              <Box>
                <Typography variant="body2">{acc.username}</Typography>
                <Typography variant="caption" color="text.secondary">{acc.authMode}</Typography>
              </Box>
              <Button size="small" color="error" onClick={(e) => { e.stopPropagation(); handleDelete(acc.uuid); }}>
                {t("account.logout")}
              </Button>
            </Box>
          </MenuItem>
        ))}
        <MenuItem onClick={() => { handleClose(); setLoginOpen(true); }}>
          <AddIcon sx={{ mr: 1 }} fontSize="small" />
          {t("account.addAccount")}
        </MenuItem>
      </Menu>

      <LoginDialog open={loginOpen} onClose={() => setLoginOpen(false)} />
    </Box>
  );
}

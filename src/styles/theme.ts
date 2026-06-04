import { createTheme } from '@mui/material/styles';

const mcGreen = '#52A535';
const bgDark = '#1B1B1B';
const bgPanel = '#252525';
const bgHover = '#333333';

export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: mcGreen, contrastText: '#fff' },
    secondary: { main: '#AAAAFF' },
    background: { default: bgDark, paper: bgPanel },
    text: { primary: '#FFFFFF', secondary: '#AAAAAA' },
    divider: '#3A3A3A',
  },
  shape: { borderRadius: 4 },
  typography: {
    fontFamily: '"Inter", "Noto Sans SC", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiCard: {
      styleOverrides: { root: { backgroundImage: 'none', boxShadow: 'none', border: '1px solid #3A3A3A' } },
    },
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 600, borderRadius: 4 },
      },
    },
    MuiDrawer: {
      styleOverrides: { paper: { backgroundColor: bgPanel, borderRight: '1px solid #3A3A3A' } },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          '&.Mui-selected': { backgroundColor: 'rgba(82,165,53,0.15)', '&:hover': { backgroundColor: 'rgba(82,165,53,0.2)' } },
          '&:hover': { backgroundColor: bgHover },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {},
      },
    },
    MuiLinearProgress: {
      styleOverrides: { root: { backgroundColor: '#3A3A3A', height: 6, borderRadius: 3 } },
    },
  },
});

export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#52A535' },
    secondary: { main: '#9c27b0' },
    background: { default: '#F5F5F5', paper: '#FFFFFF' },
  },
  shape: { borderRadius: 4 },
  typography: {
    fontFamily: '"Inter", "Noto Sans SC", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiButton: { styleOverrides: { root: { textTransform: 'none', fontWeight: 600 } } },
    MuiCard: { styleOverrides: { root: { backgroundImage: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' } } },
  },
});

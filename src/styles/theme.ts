import { createTheme } from '@mui/material/styles';

const mcGreen = '#3C8527';
const bgDark = '#111111';
const bgPanel = '#1E1E1E';
const bgElevated = '#252525';
const bgHover = '#2D2D2D';

export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: mcGreen, light: '#52A535', dark: '#2A641C', contrastText: '#fff' },
    secondary: { main: '#D0D0D0' },
    background: { default: bgDark, paper: bgPanel },
    text: { primary: '#F4F4F4', secondary: '#A7A7A7' },
    divider: '#353535',
  },
  shape: { borderRadius: 4 },
  typography: {
    fontFamily: '"Inter", "Noto Sans SC", "Roboto", "Helvetica", "Arial", sans-serif',
    h3: { letterSpacing: 0 },
    h4: { letterSpacing: 0 },
    h6: { letterSpacing: 0 },
  },
  components: {
    MuiCard: {
      styleOverrides: { root: { backgroundImage: 'none', boxShadow: 'none', border: '1px solid #353535', backgroundColor: bgElevated } },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 700,
          borderRadius: 2,
          '&.MuiButton-containedPrimary': {
            boxShadow: 'none',
            '&:hover': { boxShadow: 'none', backgroundColor: '#2A641C' },
          },
        },
      },
    },
    MuiDrawer: {
      styleOverrides: { paper: { backgroundColor: '#171717', borderRight: '1px solid #2B2B2B' } },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          '&.Mui-selected': { backgroundColor: '#242F20', borderLeft: '3px solid #52A535', '&:hover': { backgroundColor: '#293725' } },
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
      styleOverrides: { root: { backgroundColor: '#3A3A3A', height: 6, borderRadius: 2 } },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: { backgroundColor: '#202020' },
      },
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

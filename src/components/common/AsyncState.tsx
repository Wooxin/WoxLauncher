import { CircularProgress, Typography, Alert } from "@mui/material";

interface AsyncStateProps {
  loading: boolean;
  error: string | null;
  empty: boolean;
  emptyMessage?: string;
  children: React.ReactNode;
}

export default function AsyncState({ loading, error, empty, emptyMessage, children }: AsyncStateProps) {
  if (loading) return <CircularProgress sx={{ display: "block", mx: "auto", mt: 4 }} />;
  if (error) return <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>;
  if (empty) return (
    <Typography color="text.secondary" sx={{ textAlign: "center", mt: 4 }}>
      {emptyMessage || "No data"}
    </Typography>
  );
  return <>{children}</>;
}

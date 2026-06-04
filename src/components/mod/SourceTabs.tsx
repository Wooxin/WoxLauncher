import { ToggleButtonGroup, ToggleButton } from "@mui/material";
import type { ModSource } from "../../types";

interface Props {
  value: ModSource;
  onChange: (source: ModSource) => void;
}

const sources: { value: ModSource; label: string }[] = [
  { value: "modrinth", label: "Modrinth" },
  { value: "curseforge", label: "CurseForge" },
  { value: "mcmod", label: "MCMod" },
];

export default function SourceTabs({ value, onChange }: Props) {
  return (
    <ToggleButtonGroup
      value={value}
      exclusive
      onChange={(_, v) => v && onChange(v)}
      size="small"
      sx={{ mb: 2 }}
    >
      {sources.map((s) => (
        <ToggleButton key={s.value} value={s.value}>
          {s.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}

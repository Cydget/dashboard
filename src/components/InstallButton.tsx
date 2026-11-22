import Button from '@mui/material/Button';
import GetAppIcon from '@mui/icons-material/GetApp';
import { useDashboardContext } from '../context/DashboardContext';

export default function InstallButton({ light = false }: { light?: boolean }) {
  const { canInstall, installPwa } = useDashboardContext();
  if (!canInstall) return null;

  return (
    <Button
      size="small"
      variant={light ? 'outlined' : 'contained'}
      color={light ? 'inherit' : 'primary'}
      startIcon={<GetAppIcon />}
      onClick={() => void installPwa()}
      sx={light ? { borderColor: 'rgba(255,255,255,0.5)', color: '#fff' } : undefined}
    >
      Install
    </Button>
  );
}

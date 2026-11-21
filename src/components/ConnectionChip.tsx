import Chip from '@mui/material/Chip';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import { useDashboardContext } from '../context/DashboardContext';

export default function ConnectionChip() {
  const { isOnline, backendConnected, lastChecked } = useDashboardContext();
  const title = lastChecked ? `Checked ${lastChecked.toLocaleTimeString()}` : undefined;

  if (!isOnline) {
    return <Chip size="small" icon={<WifiOffIcon />} label="Device offline" color="error" title={title} />;
  }
  if (backendConnected) {
    return <Chip size="small" icon={<CloudDoneIcon />} label="Backend connected" color="success" title={title} />;
  }
  return (
    <Chip
      size="small"
      icon={<CloudOffIcon />}
      label="Offline PWA"
      color="warning"
      title={title}
    />
  );
}

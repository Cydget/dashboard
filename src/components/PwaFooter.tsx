import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { useDashboardContext } from '../context/DashboardContext';

export default function PwaFooter({ light = false }: { light?: boolean }) {
  const { appVersion, latestVersion, versionStatus, applyUpdate } = useDashboardContext();
  const color = light ? 'rgba(255,255,255,0.72)' : 'text.secondary';
  const latestLabel = latestVersion && latestVersion !== appVersion ? ` · server ${latestVersion}` : '';

  return (
    <Box
      component="footer"
      sx={{
        px: 1.5,
        py: 0.75,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1,
        flexWrap: 'wrap',
      }}
    >
      <Typography variant="caption" sx={{ color, textAlign: 'center' }}>
        v{appVersion}
        {latestLabel} · {versionStatus}
      </Typography>
      {versionStatus === 'Update available' && (
        <Button size="small" color={light ? 'inherit' : 'primary'} onClick={() => void applyUpdate()}>
          Reload
        </Button>
      )}
    </Box>
  );
}

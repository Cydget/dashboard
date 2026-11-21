import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import ConnectionChip from '../components/ConnectionChip';
import { useDashboardContext } from '../context/DashboardContext';
import type { HealthLevel } from '../types';
import { appUrls } from '../utils/urls';

const COLOR: Record<HealthLevel, 'success' | 'error' | 'warning' | 'default'> = {
  healthy: 'success',
  unhealthy: 'error',
  timeout: 'warning',
  unknown: 'default',
};

export default function HealthCheck() {
  const navigate = useNavigate();
  const { settings, resolutions, lastPingTime } = useDashboardContext();

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', px: 1, py: 1, gap: 1 }}>
        <IconButton onClick={() => navigate('/')} aria-label="back">
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h6" sx={{ flex: 1 }}>
          Health
        </Typography>
        <ConnectionChip />
      </Box>
      <Container maxWidth="sm">
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          This device probes each URL locally (icon first, then HTTP 200). Last check{' '}
          {lastPingTime ? lastPingTime.toLocaleTimeString() : 'pending'} · interval {settings.checkInterval}ms
        </Typography>
        <List>
          {settings.apps.map((app) => {
            const resolution = resolutions.get(app.id);
            const status = resolution?.status ?? 'unknown';
            return (
              <ListItem key={app.id} divider alignItems="flex-start" sx={{ flexDirection: 'column', gap: 0.5 }}>
                <Box sx={{ display: 'flex', width: '100%', alignItems: 'center' }}>
                  <ListItemText
                    primary={app.name}
                    secondary={
                      resolution?.resolvedUrl
                        ? `Opens ${resolution.resolvedUrl} (${resolution.method})`
                        : 'No reachable URL on this device yet'
                    }
                  />
                  <Chip size="small" label={status} color={COLOR[status]} />
                </Box>
                <Stack spacing={0.5} sx={{ width: '100%', pl: 0, pb: 1 }}>
                  {appUrls(app).map((url) => {
                    const probe = resolution?.probes.find((item) => item.url === url);
                    const label = probe?.ok
                      ? probe.method === 'icon'
                        ? 'icon'
                        : '200'
                      : probe?.error || 'fail';
                    return (
                      <Typography key={url} variant="caption" color="text.secondary">
                        {url} · {label}
                        {probe?.ms != null ? ` · ${probe.ms}ms` : ''}
                      </Typography>
                    );
                  })}
                </Stack>
              </ListItem>
            );
          })}
          {settings.apps.length === 0 && (
            <Typography color="text.secondary">Add apps in settings to monitor them.</Typography>
          )}
        </List>
      </Container>
    </Box>
  );
}

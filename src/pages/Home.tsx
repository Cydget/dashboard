import { useMemo, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import SettingsIcon from '@mui/icons-material/Settings';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import { useNavigate } from 'react-router-dom';
import AppTile from '../components/AppTile';
import ConnectionChip from '../components/ConnectionChip';
import { useDashboardContext } from '../context/DashboardContext';
import type { IconSize } from '../types';

const SIZE_CELL: Record<IconSize, number> = {
  small: 88,
  medium: 108,
  large: 128,
};

export default function Home() {
  const navigate = useNavigate();
  const { settings, resolutions } = useDashboardContext();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);

  const cell = SIZE_CELL[settings.iconSize];
  const perPage = useMemo(() => {
    const cols = Math.max(3, Math.floor((window.innerWidth - 24) / cell));
    const rows = Math.max(3, Math.floor((window.innerHeight - 140) / cell));
    return cols * rows;
  }, [cell]);

  const pages = useMemo(() => {
    if (settings.apps.length === 0) return [[]];
    const chunks = [];
    for (let i = 0; i < settings.apps.length; i += perPage) {
      chunks.push(settings.apps.slice(i, i + perPage));
    }
    return chunks;
  }, [settings.apps, perPage]);

  const onScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const next = Math.round(el.scrollLeft / el.clientWidth);
    setPage(next);
  };

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        background: `radial-gradient(1200px 600px at 20% -10%, #3a3f7a 0%, ${settings.backgroundColor} 55%)`,
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', px: 1.5, py: 1, gap: 1 }}>
        <Typography variant="h6" sx={{ flex: 1, fontWeight: 700 }}>
          Dashboard
        </Typography>
        <ConnectionChip />
        <IconButton color="inherit" onClick={() => navigate('/health')} aria-label="health">
          <MonitorHeartIcon />
        </IconButton>
        <IconButton color="inherit" onClick={() => navigate('/settings')} aria-label="settings">
          <SettingsIcon />
        </IconButton>
      </Box>

      <Box
        ref={scrollerRef}
        onScroll={onScroll}
        sx={{
          flex: 1,
          display: 'flex',
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          scrollBehavior: 'smooth',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {pages.map((apps, index) => (
          <Box
            key={index}
            sx={{
              minWidth: '100%',
              scrollSnapAlign: 'start',
              px: 2,
              py: 1,
              display: 'grid',
              gridTemplateColumns: `repeat(auto-fill, minmax(${cell}px, 1fr))`,
              justifyItems: 'center',
              alignContent: 'start',
              gap: 1.5,
            }}
          >
            {apps.length === 0 ? (
              <Box sx={{ gridColumn: '1 / -1', textAlign: 'center', mt: 12, opacity: 0.85 }}>
                <Typography variant="h6">No apps yet</Typography>
                <Typography variant="body2">Open settings to add IP:port links.</Typography>
              </Box>
            ) : (
              apps.map((app) => (
                <AppTile
                  key={app.id}
                  app={app}
                  defaultSize={settings.iconSize}
                  resolution={resolutions.get(app.id)}
                />
              ))
            )}
          </Box>
        ))}
      </Box>

      {pages.length > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, py: 1.5 }}>
          {pages.map((_, index) => (
            <Box
              key={index}
              sx={{
                width: index === page ? 18 : 8,
                height: 8,
                borderRadius: 4,
                bgcolor: index === page ? '#fff' : 'rgba(255,255,255,0.4)',
                transition: 'width 0.2s ease',
              }}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { AppConfig, HealthLevel, IconSize } from '../types';
import { appUrls } from '../utils/urls';
import type { AppResolution } from '../utils/resolveUrl';

const SIZE_PX: Record<IconSize, number> = {
  small: 48,
  medium: 64,
  large: 80,
};

function letterFor(name: string): string {
  return (name.trim()[0] || '?').toUpperCase();
}

export default function AppTile({
  app,
  defaultSize,
  resolution,
}: {
  app: AppConfig;
  defaultSize: IconSize;
  resolution?: AppResolution;
}) {
  const size = SIZE_PX[app.iconSize || defaultSize];
  const candidates = appUrls(app);
  const resolvedUrl = resolution?.resolvedUrl || candidates[0] || app.url;
  const src = app.icon || resolution?.iconSrc || null;
  const health: HealthLevel = resolution?.status ?? 'unknown';
  const grayed = health === 'timeout' || health === 'unhealthy';

  const open = () => {
    if (!resolvedUrl) return;
    window.open(resolvedUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <Box
      component="button"
      onClick={open}
      title={resolvedUrl}
      sx={{
        appearance: 'none',
        border: 0,
        background: 'transparent',
        color: 'inherit',
        width: size + 28,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0.75,
        cursor: 'pointer',
        opacity: grayed ? 0.38 : 1,
        filter: grayed ? 'grayscale(1)' : 'none',
        transition: 'opacity 0.2s ease, transform 0.15s ease',
        '&:active': { transform: 'scale(0.94)' },
      }}
    >
      <Box
        sx={{
          width: size,
          height: size,
          borderRadius: 3,
          overflow: 'hidden',
          bgcolor: 'rgba(255,255,255,0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 18px rgba(0,0,0,0.28)',
        }}
      >
        {src ? (
          <Box
            component="img"
            src={src}
            alt=""
            sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <Typography sx={{ fontWeight: 700, fontSize: size * 0.42 }}>{letterFor(app.name)}</Typography>
        )}
      </Box>
      <Typography
        variant="caption"
        sx={{
          width: '100%',
          textAlign: 'center',
          lineHeight: 1.2,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          textShadow: '0 1px 2px rgba(0,0,0,0.6)',
        }}
      >
        {app.name || resolvedUrl}
      </Typography>
    </Box>
  );
}

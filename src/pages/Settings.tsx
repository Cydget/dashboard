import { useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { useNavigate } from 'react-router-dom';
import ConnectionChip from '../components/ConnectionChip';
import InstallButton from '../components/InstallButton';
import PwaFooter from '../components/PwaFooter';
import { useDashboardContext } from '../context/DashboardContext';
import type { IconSize } from '../types';
import { appUrls, parseUrlLines } from '../utils/urls';

export default function Settings() {
  const navigate = useNavigate();
  const {
    settings,
    updateSettings,
    addApp,
    updateApp,
    removeApp,
    exportJson,
    importJson,
    publish,
    pullRemote,
    message,
    setMessage,
  } = useDashboardContext();

  const [name, setName] = useState('');
  const [urlText, setUrlText] = useState('');
  const [iconUrl, setIconUrl] = useState('');
  const [extraUrl, setExtraUrl] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const add = () => {
    const urls = parseUrlLines(urlText);
    if (urls.length === 0) return;
    addApp({
      name: name.trim() || urls[0],
      url: urls[0],
      urls,
      icon: iconUrl.trim() || undefined,
      iconSize: settings.iconSize,
    });
    setName('');
    setUrlText('');
    setIconUrl('');
  };

  const addUrlToApp = (id: string) => {
    const next = extraUrl[id]?.trim();
    if (!next) return;
    const app = settings.apps.find((item) => item.id === id);
    if (!app) return;
    updateApp(id, { urls: [...appUrls(app), next] });
    setExtraUrl((current) => ({ ...current, [id]: '' }));
  };

  const downloadExport = () => {
    const blob = new Blob([exportJson()], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = href;
    a.download = 'dashboard-settings.json';
    a.click();
    URL.revokeObjectURL(href);
  };

  const onImportFile = async (file: File) => {
    const text = await file.text();
    importJson(text);
    setMessage('Imported settings');
  };

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default', pb: 6 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', px: 1, py: 1, gap: 1 }}>
        <IconButton onClick={() => navigate('/')} aria-label="back">
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h6" sx={{ flex: 1 }}>
          Settings
        </Typography>
        <InstallButton />
        <ConnectionChip />
      </Box>

      <Container maxWidth="sm">
        <Stack spacing={3}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Add app
            </Typography>
            <Stack spacing={1.5}>
              <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} fullWidth />
              <TextField
                label="URLs (one per line)"
                placeholder={'127.0.0.1:8989\n192.168.137.1:8989'}
                helperText="This device tries each URL in order: favicon load first, then HTTP 200."
                value={urlText}
                onChange={(e) => setUrlText(e.target.value)}
                multiline
                minRows={2}
                fullWidth
              />
              <TextField
                label="Icon URL (optional)"
                placeholder="https://example.com/icon-512.png"
                helperText="Leave blank to auto-pick the largest apple-touch / PWA icon from the site."
                value={iconUrl}
                onChange={(e) => setIconUrl(e.target.value)}
                fullWidth
              />
              <Button variant="contained" onClick={add}>
                Add
              </Button>
            </Stack>
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Apps
            </Typography>
            <Stack spacing={2}>
              {settings.apps.length === 0 && (
                <Typography color="text.secondary">No apps configured.</Typography>
              )}
              {settings.apps.map((app) => (
                <Box key={app.id} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <TextField
                      variant="standard"
                      label="Name"
                      value={app.name}
                      onChange={(e) => updateApp(app.id, { name: e.target.value })}
                      fullWidth
                    />
                    <IconButton onClick={() => removeApp(app.id)} aria-label="delete">
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                  {appUrls(app).map((url, index) => (
                    <Box key={`${app.id}-${index}`} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <TextField
                        variant="standard"
                        value={url}
                        onChange={(e) => {
                          const next = [...appUrls(app)];
                          next[index] = e.target.value;
                          updateApp(app.id, { urls: next });
                        }}
                        fullWidth
                      />
                      <IconButton
                        size="small"
                        aria-label="remove url"
                        onClick={() => {
                          const next = appUrls(app).filter((_, i) => i !== index);
                          updateApp(app.id, { urls: next });
                        }}
                        disabled={appUrls(app).length <= 1}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                    <TextField
                      variant="standard"
                      placeholder="Add another URL or IP:port"
                      value={extraUrl[app.id] ?? ''}
                      onChange={(e) => setExtraUrl((current) => ({ ...current, [app.id]: e.target.value }))}
                      onKeyDown={(e) => e.key === 'Enter' && addUrlToApp(app.id)}
                      fullWidth
                    />
                    <IconButton aria-label="add url" onClick={() => addUrlToApp(app.id)}>
                      <AddIcon />
                    </IconButton>
                  </Box>
                  <TextField
                    variant="standard"
                    label="Icon URL"
                    placeholder="Auto (highest-resolution site icon)"
                    value={app.icon ?? ''}
                    onChange={(e) => updateApp(app.id, { icon: e.target.value.trim() || undefined })}
                    fullWidth
                    sx={{ mt: 1 }}
                  />
                </Box>
              ))}
            </Stack>
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Display
            </Typography>
            <Stack spacing={1.5}>
              <TextField
                select
                label="Default icon size"
                value={settings.iconSize}
                onChange={(e) => updateSettings({ iconSize: e.target.value as IconSize })}
              >
                <MenuItem value="small">Small</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="large">Large</MenuItem>
              </TextField>
              <TextField
                type="number"
                label="Health check interval (ms)"
                value={settings.checkInterval}
                onChange={(e) => updateSettings({ checkInterval: Number(e.target.value) || 30000 })}
              />
              <TextField
                label="Backend URL (blank = same origin /api)"
                value={settings.backendUrl}
                onChange={(e) => updateSettings({ backendUrl: e.target.value })}
                placeholder="http://192.168.1.5:3001"
              />
            </Stack>
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Sync
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={1}>
              <Button variant="outlined" onClick={downloadExport}>
                Export JSON
              </Button>
              <Button variant="outlined" onClick={() => fileRef.current?.click()}>
                Import JSON
              </Button>
              <Button variant="contained" onClick={() => publish()}>
                Publish as default
              </Button>
              <Button onClick={() => pullRemote()}>Pull from backend</Button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onImportFile(file);
                  e.target.value = '';
                }}
              />
            </Stack>
          </Paper>
        </Stack>
      </Container>

      <PwaFooter />

      <Snackbar open={Boolean(message)} autoHideDuration={4000} onClose={() => setMessage(null)}>
        <Alert severity="info" onClose={() => setMessage(null)}>
          {message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

const { app, BrowserWindow, ipcMain, session, shell } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const fs = require('node:fs/promises');
const { spawn } = require('node:child_process');
const { isTrustedIpc } = require('./security.cjs');
const { databaseUrl, initializeFiles, migrate, freePort, waitForServer } = require('./bootstrap.cjs');

let window;
let server;
let starting;
let appOrigin;

function resources() {
  return app.isPackaged ? process.resourcesPath : path.join(__dirname, '..', '.desktop-resources');
}

function createWindow() {
  window = new BrowserWindow({
    width: 1030, height: 760, minWidth: 620, minHeight: 560,
    title: 'FWMS', backgroundColor: '#f7f4ef',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false, contextIsolation: true, sandbox: true,
    },
  });
  window.loadFile(path.join(__dirname, 'launcher.html'));
  window.webContents.on('will-attach-webview', event => event.preventDefault());
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event, url) => {
    if (!appOrigin && url === pathToFileURL(path.join(__dirname, 'launcher.html')).href) return;
    try { if (appOrigin && new URL(url).origin === appOrigin) return; }
    catch { /* Deny malformed navigation URLs. */ }
    event.preventDefault();
  });
  window.on('closed', () => { window = null; });
}

async function start() {
  if (starting) return starting;
  starting = (async () => {
    if (server && server.exitCode === null && appOrigin) {
      await window.loadURL(`${appOrigin}/login`);
      return true;
    }
    const dataDir = app.getPath('userData');
    const { database, secret } = await initializeFiles(dataDir);
    const documents = path.join(app.getPath('documents'), 'FWMS-Recent-Docs');
    await fs.mkdir(documents, { recursive: true, mode: 0o700 });
    const env = {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      NODE_ENV: 'production',
      FWMS_DESKTOP: '1',
      DATABASE_URL: databaseUrl(database),
      AUTH_SECRET: secret,
      FWMS_DOCUMENTS_DIR: documents,
    };
    await migrate({ resources: resources(), executable: process.execPath, environment: env });
    if (!server || server.exitCode !== null) {
      const port = await freePort();
      const serverDir = path.join(resources(), 'server');
      server = spawn(process.execPath, [path.join(serverDir, 'server.js')], {
        cwd: serverDir,
        env: { ...env, HOSTNAME: '127.0.0.1', PORT: String(port) },
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      let error = '';
      for (const stream of [server.stdout, server.stderr]) stream.on('data', chunk => {
        error = (error + chunk.toString()).slice(-2500);
      });
      server.on('error', failure => { error = String(failure); });
      try { appOrigin = await waitForServer(server, port); }
      catch (failure) {
        server.kill(); server = null;
        throw new Error(`${failure.message} ${error}`.trim());
      }
    }
    await window.loadURL(`${appOrigin}/login`);
    return true;
  })();
  try { return await starting; }
  finally { starting = null; }
}

app.whenReady().then(() => {
  app.setName('FWMS');
  // Bind to loopback. Other local processes can reach the authenticated server;
  // the ledger itself lives under the current OS user's data path.
  session.defaultSession.setPermissionCheckHandler(() => false);
  session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  ipcMain.handle('fwms:start', async event => {
    if (!isTrustedIpc(event, window, appOrigin, pathToFileURL(path.join(__dirname, 'launcher.html')).href)) return { ok: false, error: 'Unauthorized sender.' };
    try { return { ok: await start() }; }
    catch (error) { return { ok: false, error: error instanceof Error ? error.message : 'Could not start FWMS.' }; }
  });
  ipcMain.handle('fwms:documents', async event => {
    if (!isTrustedIpc(event, window, appOrigin, pathToFileURL(path.join(__dirname, 'launcher.html')).href)) return 'Unauthorized sender.';
    return shell.openPath(path.join(app.getPath('documents'), 'FWMS-Recent-Docs'));
  });
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
      if (server && server.exitCode === null && appOrigin) window.loadURL(`${appOrigin}/login`);
    }
  });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('before-quit', () => { if (server) server.kill(); });

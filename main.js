const { app, BrowserWindow, shell, session, Menu } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');

// локальный сервер: Firebase не работает с file://, нужен http://localhost
let PORT = 0;
function startServer() {
  return new Promise(resolve => {
    const srv = http.createServer((req, res) => {
      const f = path.join(__dirname, 'pc.html');
      fs.readFile(f, (err, data) => {
        if (err) { res.writeHead(500); return res.end('error'); }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
        res.end(data);
      });
    });
    const tryPort = p => { srv.once('error', () => { if (p) tryPort(0); }); srv.listen(p, () => { PORT = srv.address().port; resolve(); }); };
    tryPort(47821);
  });
}

const AUTH_OK = /^https:\/\/([\w-]+\.)?(accounts\.google\.com|firebaseapp\.com|googleapis\.com|gstatic\.com)\//;

function createWindow() {
  const win = new BrowserWindow({
    width: 1200, height: 800, minWidth: 800, minHeight: 560,
    backgroundColor: '#000000', autoHideMenuBar: true, title: 'Nexagram',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  Menu.setApplicationMenu(null);
  win.loadURL('http://localhost:' + PORT + '/');
  // вход через Google открываем во внутреннем окне, остальные ссылки — в браузере
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (AUTH_OK.test(url)) return { action: 'allow', overrideBrowserWindowOptions: { width: 520, height: 700, autoHideMenuBar: true, icon: path.join(__dirname, 'icon.png') } };
    shell.openExternal(url); return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('http://localhost:' + PORT)) { e.preventDefault(); shell.openExternal(url); } });
}

app.whenReady().then(async () => {
  session.defaultSession.setPermissionRequestHandler((wc, perm, cb) => cb(['media', 'notifications', 'clipboard-read', 'clipboard-sanitized-write', 'fullscreen'].includes(perm)));
  await startServer();
  createWindow();
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow () {
  const win = new BrowserWindow({
    backgroundColor: '#2E3440',
    width: 700,
    height: 625,
    'minHeight': 700,
    'minWidth': 625,
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true
    },
    icon: path.join(__dirname, "../img/zap.png")
  })

  win.webContents.on('new-window', (e, url) => {
      e.preventDefault();
      require('electron').shell.openExternal(url);
  })

  win.removeMenu();
  win.loadFile('src/index.html');

  win.webContents.openDevTools()
}

app.allowRendererProcessReuse=false

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
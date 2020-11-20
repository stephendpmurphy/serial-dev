const { app, BrowserWindow } = require('electron');
const path = require('path');

// Check if we are in development mode
let development = process.argv[2] === "development";

// Handle windows squirrel events
if (require('electron-squirrel-startup')) return;

function createWindow () {
  const win = new BrowserWindow({
    backgroundColor: '#2E3440',
    height: 700,
    width: 625,
    frame: false,
    'minHeight': 700,
    'minWidth': 625,
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true
    },
    icon: path.join(__dirname, "../assets/icons/thunder_32x32.png")
  })

  win.webContents.on('new-window', (e, url) => {
      e.preventDefault();
      require('electron').shell.openExternal(url);
  })

  win.removeMenu();
  win.loadFile('src/index.html');

  // if we are in development mode.. Then open the dev tools
  if( development )
    win.webContents.openDevTools({mode: 'undocked'});

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

try {
    require('electron-reloader')(module)
} catch (_) {}
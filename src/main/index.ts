import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join, resolve } from 'path'
import fs from 'fs'
import { database, Product, CartItem } from './database'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

// --- Theme Management ---
type ThemeColors = Record<string, string>
const registeredThemes = new Map<string, ThemeColors>()

registeredThemes.set('Light', {
  '--color-background': '#f0f2f5',
  '--color-background-nav': '#2c3e50',
  '--color-background-card': '#ffffff',
  '--color-text-primary': '#212529',
  '--color-text-secondary': '#6c757d',
  '--color-text-nav': '#ecf0f1',
  '--color-primary': '#3498db',
  '--color-border': '#dee2e6',
  '--color-button-text': '#ffffff'
})
registeredThemes.set('Dark', {
  '--color-background': '#1a1a1a',
  '--color-background-nav': '#232323',
  '--color-background-card': '#2a2a2a',
  '--color-text-primary': '#e0e0e0',
  '--color-text-secondary': '#a0a0a0',
  '--color-text-nav': '#e0e0e0',
  '--color-primary': '#5fa8e3',
  '--color-border': '#444444',
  '--color-button-text': '#1a1a1a'
})
// --- End Theme Management ---

// --- Plugin System ---
interface Plugin {
  name: string
  initialize: (api: PluginApi) => void
}

interface PluginApi {
  events: {
    on: (eventName: string | symbol, listener: (...args: any[]) => void) => void
  }
  registerTheme: (name: string, colors: ThemeColors) => void
}

function loadPlugins(win: BrowserWindow) {
  const pluginsDir = resolve(app.getAppPath(), '..', 'plugins')

  if (!fs.existsSync(pluginsDir)) {
    console.log('Plugins directory not found, creating one.')
    fs.mkdirSync(pluginsDir)
    return
  }

  const pluginFiles = fs.readdirSync(pluginsDir).filter((f) => f.endsWith('.js'))
  console.log(`Found ${pluginFiles.length} plugin(s).`)

  for (const file of pluginFiles) {
    try {
      const pluginPath = join(pluginsDir, file)
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const plugin = require(pluginPath) as Plugin

      if (plugin.name && typeof plugin.initialize === 'function') {
        console.log(`Loading plugin: ${plugin.name}`)

        const pluginApi: PluginApi = {
          events: {
            on: (eventName, listener) => {
              appEvents.on(eventName, listener)
            }
          },
          registerTheme: (name, colors) => {
            console.log(`Plugin "${plugin.name}" registered theme: "${name}"`)
            registeredThemes.set(name, colors)
            win.webContents.send('theme:added', { name, colors })
          }
        }
        plugin.initialize(pluginApi)
      }
    } catch (error) {
      console.error(`Failed to load plugin: ${file}`, error)
    }
  }
}
// --- End Plugin System ---

function createWindow(): BrowserWindow {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  // Product CRUD IPC handlers
  ipcMain.handle('products:get', async () => {
    return await database.getProducts()
  })

  ipcMain.handle('products:add', async (_, product: Omit<Product, 'id'>) => {
    return await database.addProduct(product)
  })

  ipcMain.handle('products:update', async (_, product: Product) => {
    return await database.updateProduct(product)
  })

  ipcMain.handle('products:delete', async (_, id: number) => {
    await database.deleteProduct(id)
  })

  ipcMain.handle('sales:finalize', async (_, { cartItems, totalAmount }: { cartItems: CartItem[], totalAmount: number }) => {
    return await database.finalizeSale(cartItems, totalAmount)
  })

  ipcMain.handle('themes:get', () => {
    return Array.from(registeredThemes.entries()).map(([name, colors]) => ({ name, colors }))
  })

  const mainWindow = createWindow()
  loadPlugins(mainWindow)

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.

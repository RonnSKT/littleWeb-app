import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { IApi } from './index.d'

// Custom APIs for renderer
const api: IApi = {
  getProducts: () => ipcRenderer.invoke('products:get'),
  addProduct: (product) => ipcRenderer.invoke('products:add', product),
  updateProduct: (product) => ipcRenderer.invoke('products:update', product),
  deleteProduct: (id) => ipcRenderer.invoke('products:delete', id),
  finalizeSale: (payload) => ipcRenderer.invoke('sales:finalize', payload),
  themes: {
    get: () => ipcRenderer.invoke('themes:get'),
    onThemeAdded: (callback) => ipcRenderer.on('theme:added', (_event, theme) => callback(theme))
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}

import { app, BrowserWindow, Menu, nativeImage, Tray } from 'electron';
import { getIconPath, getPreloadPath, getUIPath } from '../pathResolver.js';
import { windowConfig } from './util.jsondata.js';
import { isDev } from '../shared/util.js';

const windows = new Map();
let windowConfigs: dataJson = { items: [] };
async function loadWindowConfigs() {
  windowConfigs = await windowConfig.readAll();
}
const defaultWindowConfig = {
  resizable: false,
  width: 1100,
  height: 750,
  titleBarStyle: 'hidden' as const,
  frame: false,
  webPreferences: {
    preload: getPreloadPath(),
    autoplayPolicy: 'no-user-gesture-required' as const,
    spellcheck: false,
    nodeIntegration: false,
    contextIsolation: true,
    enableRemoteModule: false,
    webSecurity: true,
  }
};
loadWindowConfigs();
const smoothResizeAndMove = (
  win: BrowserWindow,
  targetWidth: number,
  targetHeight: number,
  duration: number = 300,
  targetX: number,
  targetY: number,
) => {
  if (!win || win.isDestroyed()) return;

  const startBounds = win.getBounds();
  const steps = Math.max(1, Math.floor(duration / 4)); 
  let currentStep = 0;

  const interval = setInterval(() => {
    if (win.isDestroyed()) {
      clearInterval(interval);
      return;
    }

    currentStep++;
    const progress = currentStep / steps;

    const newX = Math.round(startBounds.x + (targetX - startBounds.x) * progress);
    const newY = Math.round(startBounds.y + (targetY - startBounds.y) * progress);
    const newWidth = Math.round(startBounds.width + (targetWidth - startBounds.width) * progress);
    const newHeight = Math.round(startBounds.height + (targetHeight - startBounds.height) * progress);

    win.setBounds({ x: newX, y: newY, width: newWidth, height: newHeight });

    if (currentStep >= steps) clearInterval(interval);
  }, 4); 
};
const GetCurrentPosition = (win: BrowserWindow) => {
  if (!win || win.isDestroyed()) return { x: 0, y: 0 };
  const { x, y } = win.getBounds();
  return { x, y };
};
const createTray = (mainWindow: BrowserWindow) => {
  if (!mainWindow) return;
  let tray = null;
  const icon = nativeImage.createFromPath(getIconPath("desktopIcon.png"));
  tray = new Tray(icon.resize({ width: 16, height: 16 }));
  
  tray.setToolTip('Daily Flow');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Mở ứng dụng',
      click: function () {
        mainWindow.show();
      }
    },
    {
      label: 'Ẩn ứng dụng',
      click: function () {
        mainWindow.hide();
      }
    },
    { type: 'separator' },
    {
      label: 'Thoát',
      click: function () {
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
    }
  });
}

const createWindow = (windowType = 'main') => {
  let config;
  const windowConfig = windowConfigs.items?.find((item: any) => item.type === windowType);

  if (windowConfig) {
    config = {
      ...windowConfig,
      icon: getIconPath("trayIcon.png"),
      webPreferences: {
        ...windowConfig.webPreferences,
        preload: getPreloadPath(),
        autoplayPolicy: 'no-user-gesture-required',
        spellcheck: false,
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        webSecurity: true,
      }
    };
  } else {
    config = { ...defaultWindowConfig };
  }

  const win = new BrowserWindow(config);

  if (isDev()) {
    win.loadURL('http://localhost:5123');
  } else {
    const uiPath = getUIPath();
    win.loadFile(uiPath);
  }

  windows.set(windowType, { window: win, type: windowType });
  
  win.on('closed', () => {
    windows.delete(windowType);
  });

  if (isDev()) {
    win.webContents.openDevTools();
  }

  createTray(win);

  return { id: windowType, type: windowType };
};

const createScheduleEditorWindow = (payload: any = {}) => {
  const parentData = windows.get('main');
  const parentWindow = parentData?.window;
  const parentBounds = parentWindow?.getBounds() || {
    width: defaultWindowConfig.width,
    height: defaultWindowConfig.height,
  };
  const windowType = 'schedule-editor';
  const existing = windows.get(windowType);

  if (existing && !existing.window.isDestroyed()) {
    existing.window.focus();
    return Promise.resolve({ id: windowType, type: windowType, reused: true });
  }

  const params = new URLSearchParams();
  if (Array.isArray(payload.dateKeys)) {
    params.set('dates', payload.dateKeys.join(','));
  }
  if (payload.todoId) params.set('todoId', payload.todoId);
  if (payload.taskId) params.set('taskId', payload.taskId);

  const win = new BrowserWindow({
    ...defaultWindowConfig,
    parent: parentWindow,
    modal: Boolean(parentWindow),
    width: parentBounds.width,
    height: parentBounds.height,
    minWidth: 900,
    minHeight: 620,
    show: false,
    icon: getIconPath("trayIcon.png"),
    webPreferences: {
      ...defaultWindowConfig.webPreferences,
      preload: getPreloadPath(),
    },
  });

  const route = `/schedule-editor?${params.toString()}`;
  if (isDev()) {
    win.loadURL(`http://localhost:5123/#${route}`);
  } else {
    win.loadFile(getUIPath(), { hash: route });
  }

  windows.set(windowType, { window: win, type: windowType });
  let hasShown = false;
  const showEditor = () => {
    if (hasShown || win.isDestroyed()) return;
    hasShown = true;
    win.show();
    win.focus();
  };

  win.once('ready-to-show', showEditor);
  win.webContents.once('did-finish-load', showEditor);
  setTimeout(showEditor, 1500);

  if (isDev()) {
    win.webContents.openDevTools();
  }

  return new Promise((resolve) => {
    win.on('closed', () => {
      windows.delete(windowType);
      resolve({ id: windowType, type: windowType, closed: true });
    });
  });
};

const closeWindow = (windowId : string) => {
  const windowData = windows.get(windowId);
  if (windowData) {
    windowData.window.close();
    return true;
  }
  return false;
};

const closeWindowsByType = (windowType: string) => {
  let closedCount = 0;
  for (const [id, data] of windows.entries()) {
    if (data.type === windowType) {
      data.window.close();
      closedCount++;
    }
  }
  return closedCount;
};

const closeAllExceptMain = () => {
  let closedCount = 0;
  for (const [id, data] of windows.entries()) {
    if (data.type !== 'main') {
      data.window.close();
      closedCount++;
    }
  }
  return closedCount;
};

const getAllWindows = () => {
  return Array.from(windows.entries()).map(([id, data]) => ({
    id,
    type: data.type,
    isVisible: data.window.isVisible(),
    isFocused: data.window.isFocused()
  }));
};

const focusWindow = (windowId: string) => {
  const windowData = windows.get(windowId);
  if (windowData) {
    windowData.window.focus();
    return true;
  }
  return false;
};

export{
  windows,
  windowConfigs,
  createWindow,
  createScheduleEditorWindow,
  closeWindow,
  closeWindowsByType,
  closeAllExceptMain,
  getAllWindows,
  focusWindow,
  smoothResizeAndMove,
  GetCurrentPosition,
  loadWindowConfigs,
  defaultWindowConfig,
}

import { app, ipcMain, screen, dialog, Notification, nativeImage } from 'electron';
import { taskStore, todoStore } from './util.jsondata.js';
import Store from 'electron-store';
import { 
  closeAllExceptMain, 
  closeWindow, 
  closeWindowsByType, 
  createWindow, 
  createScheduleEditorWindow,
  focusWindow, 
  getAllWindows, 
  GetCurrentPosition, 
  loadWindowConfigs, 
  smoothResizeAndMove, 
  windowConfigs, 
  windows 
} from './util.window.js';
import { IpcMainName } from '../enums/IpcMain.Name.enum.js';
import { getIconPath } from '../pathResolver.js';
let store: any = new Store({ name: 'settings' });
export const setupIpcMainHandlers = () => {
  ipcMain.handle(IpcMainName.SET_WINDOW_ALWAYS_ON_TOP, async (event, windowId: string, isAlwaysOnTop: boolean) => {
    const windowData = windows.get(windowId);
    if (windowData) {
      windowData.window.setAlwaysOnTop(isAlwaysOnTop);
      return true;
    }
    return false;
  });

  ipcMain.handle(IpcMainName.CREATE_WINDOW, async (event, windowType) => {
    return createWindow(windowType);
  });

  ipcMain.handle(IpcMainName.OPEN_SCHEDULE_EDITOR_WINDOW, async (event, payload) => {
    return await createScheduleEditorWindow(payload);
  });

  ipcMain.handle(IpcMainName.COMPLETE_SCHEDULE_EDITOR, async (event, payload) => {
    const mainWindow = windows.get('main')?.window;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IpcMainName.COMPLETE_SCHEDULE_EDITOR, payload);
      mainWindow.show();
      mainWindow.focus();
    }
    closeWindow('schedule-editor');
    return true;
  });

  ipcMain.handle(IpcMainName.LOAD_WINDOW_CONFIGS, async () => {
    return await loadWindowConfigs();
  });

  ipcMain.handle(IpcMainName.CLOSE_WINDOW, async (event, windowId) => {
    return closeWindow(windowId);
  });

  ipcMain.handle(IpcMainName.CLOSE_WINDOWS_BY_TYPE, async (event, windowType) => {
    return closeWindowsByType(windowType);
  });

  ipcMain.handle(IpcMainName.CLOSE_ALL_EXCEPT_MAIN, async (event) => {
    return closeAllExceptMain();
  });

  ipcMain.handle(IpcMainName.GET_ALL_WINDOWS, async (event) => {
    return getAllWindows();
  });

  ipcMain.handle(IpcMainName.FOCUS_WINDOW, async (event, windowId) => {
    return focusWindow(windowId);
  });

  // Task Store CRUD Operations
  ipcMain.handle(IpcMainName.TASK_UPSERT, async (event, task) => {
    try {
      const result = await taskStore.upsert(task);
      return result;
    } catch (error) {
      console.error('IPC: task-upsert error:', error);
      throw error;
    }
  });

  ipcMain.handle(IpcMainName.TASK_GET_ALL, async () => {
    try {
      const result = await taskStore.getAll();
      return result;
    } catch (error) {
      console.error('IPC: task-get-all error:', error);
      throw error;
    }
  });

  ipcMain.handle(IpcMainName.TASK_GET_BY_ID, async (event, id) => {
    return await taskStore.getById(id);
  });

  ipcMain.handle(IpcMainName.TASK_CREATE, async (event, task) => {
    return await taskStore.create(task);
  });

  ipcMain.handle(IpcMainName.TASK_UPDATE, async (event, id, partial) => {
    return await taskStore.update(id, partial);
  });

  ipcMain.handle(IpcMainName.TASK_REMOVE, async (event, id) => {
    return await taskStore.remove(id);
  });

  ipcMain.handle(IpcMainName.TASK_CLEAR, async () => {
    return await taskStore.clear();
  });

  // Todo Store CRUD Operations
  ipcMain.handle(IpcMainName.TODO_UPSERT, async (event, todo) => {
    return await todoStore.upsert(todo);
  });

  ipcMain.handle(IpcMainName.TODO_GET_ALL, async () => {
    return await todoStore.getAll();
  });

  ipcMain.handle(IpcMainName.TODO_GET_BY_ID, async (event, id) => {
    return await todoStore.getById(id);
  });

  ipcMain.handle(IpcMainName.TODO_CREATE, async (event, todo) => {
    return await todoStore.create(todo);
  });

  ipcMain.handle(IpcMainName.TODO_UPDATE, async (event, id, partial) => {
    return await todoStore.update(id, partial);
  });

  ipcMain.handle(IpcMainName.TODO_REMOVE, async (event, id) => {
    return await todoStore.remove(id);
  });

  ipcMain.handle(IpcMainName.TODO_CLEAR, async () => {
    return await todoStore.clear();
  });

  ipcMain.handle(IpcMainName.TODO_RESET, async () => {
    const allTodos = await todoStore.getAll();
    for (const todo of allTodos) {
      todo.status = 'Stop';
      
      if (todo.tasks) {
        for (const taskId of todo.taskIds) {
          if (todo.tasks[taskId]) {
            todo.tasks[taskId].status = 'Not Started';
          }
        }
      }
      
      await todoStore.update(todo.id, todo);
    }
  });

  // Screen and Window Information
  ipcMain.handle(IpcMainName.GET_USER_SCREEN_SIZE, async () => {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    return { width, height };
  });

  ipcMain.handle(IpcMainName.GET_WINDOW_SIZES, async () => {
    return windowConfigs;
  });

  ipcMain.handle(IpcMainName.GET_WINDOW_SIZE, async (event, windowType: string) => {
    const config = windowConfigs.items?.find((item: any) => item.type === windowType);
    return config || null;
  });

  ipcMain.handle(IpcMainName.GET_WINDOW_TYPES, async () => {
    return windowConfigs.items?.map((item: any) => item.type) || [];
  });

  ipcMain.handle(IpcMainName.HAS_WINDOW_TYPE, async (event, windowType: string) => {
    const config = windowConfigs.items?.find((item: any) => item.type === windowType);
    return config !== null && config !== undefined;
  });

  // Settings Management
  ipcMain.handle(IpcMainName.GET_SETTINGS, async () => {
    try {
      const settings = store.get('settings');
      return settings || { 
        startWithWindows: false, 
        breakTime: 300, 
        soundEnabled: true, 
        startupSoundEnabled: true 
      };
    } catch (err) {
      console.error('get-settings error:', err);
      return { 
        startWithWindows: false, 
        breakTime: 300, 
        soundEnabled: true, 
        startupSoundEnabled: true 
      };
    }
  });

  ipcMain.handle(IpcMainName.SAVE_SETTINGS, async (event, settings) => {
    try {      
      store.set('settings', settings);

      if (settings.startWithWindows) {
        if (process.platform === 'win32') {
          app.setLoginItemSettings({
            openAtLogin: true,
            path: app.getPath('exe'),
            args: []
          });
        } else if (process.platform === 'darwin') {
          app.setLoginItemSettings({
            openAtLogin: true,
            openAsHidden: true,
            path: process.execPath,
            args: []
          });
        }
      } else {
        if (process.platform === 'win32') {
          app.setLoginItemSettings({
            openAtLogin: false
          });
        } else if (process.platform === 'darwin') {
          app.setLoginItemSettings({
            openAtLogin: false,
            openAsHidden: false
          });
        }
      }

      return true;
    } catch (err) {
      console.error('save-settings error:', err);
      return false;
    }
  });

  ipcMain.handle(IpcMainName.DELETE_ALL_DATA, async () => {
    try {
      store.set('settings', {
        startWithWindows: false,
        breakTime: 300,
        soundEnabled: true,
        startupSoundEnabled: true
      });
      
      await taskStore.clear();
      await todoStore.clear();
      return true;
    } catch (err) {
      console.error('delete-all-data error:', err);
      return false;
    }
  });

  // Window Animation
  ipcMain.handle(IpcMainName.SMOOTH_RESIZE_AND_MOVE, async (
    event,
    windowType: string,
    targetWidth: number,
    targetHeight: number,
    duration = 100,
    targetPosition = GetCurrentPosition(windows.get(windowType)?.window)
  ) => {
    const windowData = windows.get(windowType);
    if (windowData) {
      smoothResizeAndMove(
        windowData.window, 
        targetWidth, 
        targetHeight, 
        duration, 
        targetPosition.x, 
        targetPosition.y
      );
      return true;
    }
    return false;
  });

  // System Interactions
  ipcMain.handle(IpcMainName.SYSTEM_ALERT, async (event, options) => {
    const { type = 'info', title = 'Alert', message, buttons = ['OK'] } = options;
    
    const windowData = windows.get('main');
    const parentWindow = windowData?.window;
    
    try {
      let result;
      
      switch (type) {
        case 'error':
          result = await dialog.showErrorBox(title, message);
          return { response: 0, checkboxChecked: false };
          
        case 'warning':
          result = await dialog.showMessageBox(parentWindow, {
            type: 'warning',
            title,
            message,
            buttons,
            defaultId: 0,
            cancelId: buttons.length - 1
          });
          return result;
          
        case 'question':
          result = await dialog.showMessageBox(parentWindow, {
            type: 'question',
            title,
            message,
            buttons,
            defaultId: 0,
            cancelId: buttons.length - 1
          });
          return result;
          
        case 'info':
        default:
          result = await dialog.showMessageBox(parentWindow, {
            type: 'info',
            title,
            message,
            buttons,
            defaultId: 0,
            cancelId: buttons.length - 1
          });
          return result;
      }
    } catch (error) {
      console.error('System alert error:', error);
      return { response: 0, checkboxChecked: false };
    }
  });

  ipcMain.handle(IpcMainName.SYSTEM_NOTIFICATION, async (event, options) => {
    const { title, body, icon } = options;
    const iconPath = icon ? getIconPath(icon) : getIconPath("desktopIcon.png");

    try {
      if (!Notification.isSupported()) {
        console.error('Notifications are not supported on this system');
        return false;
      }

      const notificationOptions: any = {
        title,
        body,
        icon: nativeImage.createFromPath(iconPath),
        silent: false,
        timeoutType: 'default',
      };

      const notification = new Notification(notificationOptions);
      
      notification.show();

      notification.on('click', () => {
        const mainWin = windows.get('main')?.window;
        if (mainWin) {
          try {
            if (mainWin.isMinimized && mainWin.isMinimized()) {
              mainWin.restore();
            }
          } catch (e) {
            console.error('Notification click error:', e);
          }
          mainWin.show();
          mainWin.focus();
        }
      });

      return true;
    } catch (error) {
      console.error('Notification error:', error);
      return false;
    }
  });

  // App Control
  ipcMain.handle(IpcMainName.APP_CLOSE, async () => {
    app.quit();
  });

  ipcMain.handle(IpcMainName.APP_MINIMIZE, async () => {
    const mainWin = windows.get('main')?.window;
    if (mainWin) {
      mainWin.hide();
      return true;
    }
    return false;
  });
};

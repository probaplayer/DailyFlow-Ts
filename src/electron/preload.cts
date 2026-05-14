const { contextBridge, ipcRenderer } = require('electron');

enum IpcMainName {
    SET_WINDOW_ALWAYS_ON_TOP = 'set-window-always-on-top',
    CREATE_WINDOW = 'create-window',
    OPEN_SCHEDULE_EDITOR_WINDOW = 'open-schedule-editor-window',
    COMPLETE_SCHEDULE_EDITOR = 'complete-schedule-editor',
    LOAD_WINDOW_CONFIGS = 'load-window-configs',
    CLOSE_WINDOW = 'close-window',
    CLOSE_WINDOWS_BY_TYPE = 'close-windows-by-type',
    CLOSE_ALL_EXCEPT_MAIN = 'close-all-except-main',
    GET_ALL_WINDOWS = 'get-all-windows',
    FOCUS_WINDOW = 'focus-window',
    TASK_UPSERT = 'task-upsert',
    TASK_GET_ALL = 'task-get-all',
    TASK_GET_BY_ID = 'task-get-by-id',
    TASK_CREATE = 'task-create',
    TASK_UPDATE = 'task-update',
    TASK_REMOVE = 'task-remove',
    TASK_CLEAR = 'task-clear',
    TODO_UPSERT = 'todo-upsert',
    TODO_GET_ALL = 'todo-get-all',
    TODO_GET_BY_ID = 'todo-get-by-id',
    TODO_CREATE = 'todo-create',
    TODO_UPDATE = 'todo-update',
    TODO_REMOVE = 'todo-remove',
    TODO_CLEAR = 'todo-clear',
    TODO_RESET = 'todo-reset',
    GET_USER_SCREEN_SIZE = 'get-user-screen-size',
    GET_WINDOW_SIZES = 'get-window-sizes',
    GET_WINDOW_SIZE = 'get-window-size',
    GET_WINDOW_TYPES = 'get-window-types',
    HAS_WINDOW_TYPE = 'has-window-type',
    GET_SETTINGS = 'get-settings',
    SAVE_SETTINGS = 'save-settings',
    DELETE_ALL_DATA = 'delete-all-data',
    SMOOTH_RESIZE_AND_MOVE = 'smooth-resize-and-move',
    SYSTEM_ALERT = 'system-alert',
    SYSTEM_NOTIFICATION = 'system-notification',
    APP_CLOSE = 'app-close',
    APP_MINIMIZE = 'app-minimize'
}

contextBridge.exposeInMainWorld('electronAPI', {
    // Window operations
    createWindow: (windowType : string) => 
        ipcRenderer.invoke(IpcMainName.CREATE_WINDOW, windowType),
    openScheduleEditorWindow: (payload: any) =>
        ipcRenderer.invoke(IpcMainName.OPEN_SCHEDULE_EDITOR_WINDOW, payload),
    completeScheduleEditor: (payload: any) =>
        ipcRenderer.invoke(IpcMainName.COMPLETE_SCHEDULE_EDITOR, payload),
    onScheduleEditorCompleted: (callback: (payload: any) => void) => {
        const listener = (_event: any, payload: any) => callback(payload);
        ipcRenderer.on(IpcMainName.COMPLETE_SCHEDULE_EDITOR, listener);
        return () => ipcRenderer.removeListener(IpcMainName.COMPLETE_SCHEDULE_EDITOR, listener);
    },
    closeWindow: (windowId : string) => 
        ipcRenderer.invoke(IpcMainName.CLOSE_WINDOW, windowId),
    closeWindowsByType: (windowType : string) => 
        ipcRenderer.invoke(IpcMainName.CLOSE_WINDOWS_BY_TYPE, windowType),
    closeAllExceptMain: () => 
        ipcRenderer.invoke(IpcMainName.CLOSE_ALL_EXCEPT_MAIN),
    getAllWindows: () => 
        ipcRenderer.invoke(IpcMainName.GET_ALL_WINDOWS),
    focusWindow: (windowId : string) => 
        ipcRenderer.invoke(IpcMainName.FOCUS_WINDOW, windowId),
    setWindowAlwaysOnTop: (windowId: string, isAlwaysOnTop: boolean) => 
        ipcRenderer.invoke(IpcMainName.SET_WINDOW_ALWAYS_ON_TOP, windowId, isAlwaysOnTop),
    // Task operations
    taskUpsert: (task: any) => 
        ipcRenderer.invoke(IpcMainName.TASK_UPSERT, task),
    taskGetAll: () => 
        ipcRenderer.invoke(IpcMainName.TASK_GET_ALL),
    taskGetById: (id : string) => 
        ipcRenderer.invoke(IpcMainName.TASK_GET_BY_ID, id),
    taskCreate: (task : any) => 
        ipcRenderer.invoke(IpcMainName.TASK_CREATE, task),
    taskUpdate: (id : string, partial : any) => 
        ipcRenderer.invoke(IpcMainName.TASK_UPDATE, id, partial),
    taskRemove: (id : string) => 
        ipcRenderer.invoke(IpcMainName.TASK_REMOVE, id),
    taskClear: () => 
        ipcRenderer.invoke(IpcMainName.TASK_CLEAR),
    // Todo operations
    todoUpsert: (todo: any) => 
        ipcRenderer.invoke(IpcMainName.TODO_UPSERT, todo),
    todoGetAll: () => 
        ipcRenderer.invoke(IpcMainName.TODO_GET_ALL),
    todoGetById: (id : string) => 
        ipcRenderer.invoke(IpcMainName.TODO_GET_BY_ID, id),
    todoCreate: (todo : any) => 
        ipcRenderer.invoke(IpcMainName.TODO_CREATE, todo),
    todoUpdate: (id : string, partial : any) => 
        ipcRenderer.invoke(IpcMainName.TODO_UPDATE, id, partial),
    todoRemove: (id : string) => 
        ipcRenderer.invoke(IpcMainName.TODO_REMOVE, id),
    todoClear: () => 
        ipcRenderer.invoke(IpcMainName.TODO_CLEAR),
    todoReset: () => 
        ipcRenderer.invoke(IpcMainName.TODO_RESET),
    // Get user screen size
    getUserScreenSize: () => 
        ipcRenderer.invoke(IpcMainName.GET_USER_SCREEN_SIZE),
    // Window configuration access
    getWindowSizes: () => 
        ipcRenderer.invoke(IpcMainName.GET_WINDOW_SIZES),
    getWindowSize: (windowType: string) => 
        ipcRenderer.invoke(IpcMainName.GET_WINDOW_SIZE, windowType),
    getWindowTypes: () => 
        ipcRenderer.invoke(IpcMainName.GET_WINDOW_TYPES),
    hasWindowType: (windowType: string) => 
        ipcRenderer.invoke(IpcMainName.HAS_WINDOW_TYPE, windowType),
    // Smooth Resize and Move
    smoothResizeAndMove: (
        windowType: string, 
        targetWidth: number,
        targetHeight: number,
        duration?: number,
        targetPosition?: { x: number; y: number }
    ) =>
        ipcRenderer.invoke(IpcMainName.SMOOTH_RESIZE_AND_MOVE,
            windowType, targetWidth, targetHeight, duration, targetPosition),
    // System alerts
    systemAlert: (options: {
        type?: 'info' | 'warning' | 'error' | 'question';
        title?: string;
        message: string;
        buttons?: string[];
    }) => ipcRenderer.invoke(IpcMainName.SYSTEM_ALERT, options),
    systemNotification: (options: {
        title: string;
        body: string;
        icon?: string;
    }) => ipcRenderer.invoke(IpcMainName.SYSTEM_NOTIFICATION, options),
    // App settings
    getSettings: () => ipcRenderer.invoke(IpcMainName.GET_SETTINGS),
    saveSettings: (settings: any) => ipcRenderer.invoke(IpcMainName.SAVE_SETTINGS, settings),
    deleteAllData: () => ipcRenderer.invoke(IpcMainName.DELETE_ALL_DATA),
    // App close
    appClose: () => ipcRenderer.invoke(IpcMainName.APP_CLOSE),
    appMinimize: () => ipcRenderer.invoke(IpcMainName.APP_MINIMIZE),
} satisfies Window['electronAPI']);

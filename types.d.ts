interface Window {
  electronAPI: {
    // Window operations
    createWindow: (windowType: string) => Promise<void>;
    openScheduleEditorWindow: (payload: { dateKeys: string[]; todoId?: string }) => Promise<void>;
    completeScheduleEditor: (payload: { todo: TodoFlow; mode: 'create' | 'edit' }) => Promise<void>;
    onScheduleEditorCompleted: (callback: (payload: { todo: TodoFlow; mode: 'create' | 'edit' }) => void) => () => void;
    closeWindow: (windowId: string) => Promise<void>;
    closeWindowsByType: (windowType: string) => Promise<void>;
    closeAllExceptMain: () => Promise<void>;
    getAllWindows: () => Promise<any[]>;
    focusWindow: (windowId: string) => Promise<void>;
    setWindowAlwaysOnTop: (windowId: string, isAlwaysOnTop: boolean) => Promise<void>;
    // Task operations
    taskUpsert: (task: Task) => Promise<void>;
    taskGetAll: () => Promise<Task[]>;
    taskGetById: (id: string) => Promise<Task>;
    taskCreate: (task: Task) => Promise<void>;
    taskUpdate: (id: string, partial: Task) => Promise<void>;
    taskRemove: (id: string) => Promise<void>;
    taskClear: () => Promise<void>;
    // Todo operations
    todoUpsert: (todo: TodoFlow) => Promise<void>;
    todoGetAll: () => Promise<TodoFlow[]>;
    todoGetById: (id: string) => Promise<TodoFlow>;
    todoCreate: (todo: TodoFlow) => Promise<void>;
    todoUpdate: (id: string, partial: TodoFlow) => Promise<void>;
    todoRemove: (id: string) => Promise<void>;
    todoClear: () => Promise<void>;
    todoReset: () => Promise<void>;
    // Get user screen size
    getUserScreenSize: () => Promise<{ width: number; height: number }>;
    // Window configuration access
    getWindowSizes: () => Promise<Record<string, WinSize>>;
    getWindowSize: (windowType: string) => Promise<WinSize>;
    getWindowTypes: () => Promise<string[]>;
    hasWindowType: (windowType: string) => Promise<boolean>;
    // Smooth Resize and Move
    smoothResizeAndMove: (windowType: string, targetWidth: number, targetHeight: number, duration?: number, targetPosition?: { x: number; y: number }) => Promise<void>;
    // System alerts
    systemAlert: (options: {
        type?: 'info' | 'warning' | 'error' | 'question';
        title?: string;
        message: string;
        buttons?: string[];
    }) => Promise<{ response: number; checkboxChecked: boolean }>;
    systemNotification: (options: {
        title: string;
        body: string;
        icon?: string;
    }) => Promise<boolean>;
    // App settings
    getSettings: () => Promise<AppSettings>;
    saveSettings: (settings: AppSettings) => Promise<void>;
    deleteAllData: () => Promise<void>;
    // App close
    appClose: () => Promise<void>;
    appMinimize: () => Promise<boolean>;
  };
}

interface dataJson {
  items?: Array<any>;
}

interface JsonStoreOptions {
  filePath: string;
}

interface DragState {
  isDragging: boolean;
  offset: { x: number; y: number };
  window: BrowserWindow;
  intervalId: NodeJS.Timeout | null;
  initialSize: { width: number; height: number };
  lastPosition: { x: number; y: number };
}

interface WinSize {
  width: number;
  height: number;
}

interface HTMLDivElementWithPageType  {
  element: HTMLElement | HTMLDivElement;
  pageType: PageType;
}

interface HTMLDivElementWithPageTypeArray {
  elements: HTMLDivElementWithPageType[];
}

interface AppSettings {
  startWithWindows: boolean;
  breakTime: number;
  soundEnabled: boolean;
  startupSoundEnabled: boolean;
  volume: number;
}

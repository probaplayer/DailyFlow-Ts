import { useCallback, useEffect, useState } from 'react';
import { alertService, AlertOptions, AlertResult, NotificationOptions } from '../services/alertService';

export interface UIAlert {
  id: string;
  options: AlertOptions;
  onClose: (result?: AlertResult) => void;
}

export const useAlert = () => {
  const [uiAlerts, setUIAlerts] = useState<UIAlert[]>([]);

  useEffect(() => {
    const handleShowAlert = (event: CustomEvent) => {
      const { id, options, onClose } = event.detail;
      setUIAlerts(prev => [...prev, { id, options, onClose }]);
    };

    const handleCloseAlert = (event: CustomEvent) => {
      const { id } = event.detail;
      setUIAlerts(prev => prev.filter(alert => alert.id !== id));
    };

    window.addEventListener('ui-alert-show', handleShowAlert as EventListener);
    window.addEventListener('ui-alert-close', handleCloseAlert as EventListener);

    return () => {
      window.removeEventListener('ui-alert-show', handleShowAlert as EventListener);
      window.removeEventListener('ui-alert-close', handleCloseAlert as EventListener);
    };
  }, []);

  const showSystemAlert = useCallback(async (options: AlertOptions): Promise<AlertResult> => {
    return await alertService.showSystemAlert(options);
  }, []);

  const showSystemNotification = useCallback(async (options: NotificationOptions): Promise<boolean> => {
    return await alertService.showSystemNotification(options);
  }, []);

  const showUIAlert = useCallback((options: AlertOptions): string => {
    return alertService.showUIAlert(options, () => {
    });
  }, []);

  const closeUIAlert = useCallback((id: string): void => {
    alertService.closeUIAlert(id);
  }, []);

  const showAlert = useCallback(async (options: AlertOptions): Promise<AlertResult | string> => {
    return await alertService.showAlert(options);
  }, []);

  const info = useCallback(async (message: string, title = 'Information'): Promise<AlertResult | string> => {
    return await alertService.info(message, title);
  }, []);

  const success = useCallback(async (message: string, title = 'Success'): Promise<AlertResult | string> => {
    return await alertService.success(message, title);
  }, []);

  const warning = useCallback(async (message: string, title = 'Warning'): Promise<AlertResult | string> => {
    return await alertService.warning(message, title);
  }, []);

  const error = useCallback(async (message: string, title = 'Error'): Promise<AlertResult | string> => {
    return await alertService.error(message, title);
  }, []);

  const confirm = useCallback(async (message: string, title = 'Confirm'): Promise<AlertResult> => {
    return await alertService.confirm(message, title);
  }, []);

  const ask = useCallback(async (message: string, title = 'Question', buttons = ['OK', 'Cancel']): Promise<AlertResult> => {
    return await alertService.ask(message, title, buttons);
  }, []);

  const askInApp = useCallback(async (message: string, title = 'Question', buttons = ['OK', 'Cancel']): Promise<AlertResult> => {
    return await alertService.askInApp(message, title, buttons);
  }, []);

  const notify = useCallback(async (title: string, body: string, icon?: string): Promise<boolean> => {
    return await alertService.notify(title, body, icon);
  }, []);

  return {
    // State
    uiAlerts,
    
    // Methods
    showSystemAlert,
    showSystemNotification,
    showUIAlert,
    closeUIAlert,
    showAlert,
    
    // Quick methods
    info,
    success,
    warning,
    error,
    confirm,
    ask,
    askInApp,
    notify
  };
};

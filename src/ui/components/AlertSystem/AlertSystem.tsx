import React from 'react';
import Alert from '../Alert/Alert';
import { useAlert } from '../../helpers/hooks/useAlert';
import { AlertType } from '../../../enums/Alert.Type.enum';
import './AlertSystem.css';

const AlertSystem: React.FC = () => {
  const { uiAlerts, closeUIAlert } = useAlert();

  return (
    <>
      <div className="alert-system">
        {uiAlerts
          .filter((alert) => alert.options.type !== AlertType.QUESTION)
          .map((alert) => (
            <Alert
              key={alert.id}
              message={alert.options.message}
              duration={alert.options.duration || 1500}
              type={alert.options.type?.toString() as AlertType || AlertType.INFO}
              onClose={() => closeUIAlert(alert.id)}
            />
          ))}
      </div>
      {uiAlerts
        .filter((alert) => alert.options.type === AlertType.QUESTION)
        .map((alert) => (
          <div key={alert.id} className="alert-modal-backdrop no-drag">
            <div className="alert-modal card">
              <h2>{alert.options.title || 'Question'}</h2>
              <p>{alert.options.message}</p>
              <div className="alert-modal-actions">
                {(alert.options.buttons || ['OK', 'Cancel']).map((button, index) => (
                  <button
                    key={button}
                    className={`btn ${index === 0 ? 'btn-primary' : 'btn-secondary'} alert-modal-button`}
                    onClick={() => {
                      window.dispatchEvent(
                        new CustomEvent('ui-alert-response', {
                          detail: { id: alert.id, response: index },
                        })
                      );
                    }}
                  >
                    {button}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
    </>
  );
};

export default AlertSystem;

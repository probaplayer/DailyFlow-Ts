import { useState, useEffect, useContext } from 'react';
import { useAlert } from '~/ui/helpers/hooks/useAlert';
import SoundPlayer from '~/ui/helpers/utils/SoundPlayer';
import { getPageSize } from '~/shared/util.page';
import { PageType } from '~/enums/PageType.enum';
import { getOnMiddleInScreen } from '~/ui/helpers/utils/utils';
import { IoIosArrowBack } from "react-icons/io";
import { ThemeContext } from '~/ui/App';


const Settings = () => {
  const { toggleTheme } = useContext(ThemeContext);
  const { success } = useAlert(); 
  const [settings, setSettings] = useState<AppSettings>({
    startWithWindows: false,
    breakTime: 300,
    soundEnabled: true,
    startupSoundEnabled: true,
    volume: 1.0
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const soundPlayer = SoundPlayer.getInstance();

  const breakTimeOptions = [
    { label: '5 Seconds', value: 5 },
    { label: '5 Minutes', value: 300 },
    { label: '10 Minutes', value: 600 },
    { label: '15 Minutes', value: 900 },
    { label: '30 Minutes', value: 1800 },
    { label: '60 Minutes', value: 3600 }
  ];

  useEffect(() => {
    const loadSettings = async () => {
      try {
        if (window.electronAPI && window.electronAPI.getSettings) {
          const loadedSettings = await window.electronAPI.getSettings();
          setSettings({
            startWithWindows: loadedSettings.startWithWindows ?? false,
            breakTime: loadedSettings.breakTime ?? 300,
            soundEnabled: loadedSettings.soundEnabled ?? true,
            startupSoundEnabled: loadedSettings.startupSoundEnabled ?? true,
            volume: loadedSettings.volume ?? 1.0
          });
        } else {
          const savedSettings = localStorage.getItem('settings');
          if (savedSettings) {
            try {
              const parsedSettings = JSON.parse(savedSettings);
              setSettings({
                startWithWindows: parsedSettings.startWithWindows ?? false,
                breakTime: parsedSettings.breakTime ?? 300,
                soundEnabled: parsedSettings.soundEnabled ?? true,
                startupSoundEnabled: parsedSettings.startupSoundEnabled ?? true,
                volume: parsedSettings.volume ?? 1.0
              });
            } catch (error) {
              console.warn('Failed to parse saved settings, using defaults');
            }
          }
        }

        // soundPlayer.setSoundEnabled(settings.soundEnabled);
        // soundPlayer.setStartupSoundEnabled(settings.startupSoundEnabled);
        // soundPlayer.setVolume(settings.volume);
        // soundPlayer.saveSoundSettings();
      
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };

    const handleToResize = async () => {
      const {width, height} = getPageSize(PageType.SETTING);
      const { width: currentWidth, height: currentHeight} = await window.electronAPI.getUserScreenSize();
      await window.electronAPI.smoothResizeAndMove('main', width, height, 60, 
        getOnMiddleInScreen(currentWidth, currentHeight, width, height));
    }
    handleToResize();
    loadSettings();
  }, []);

  const handleSaveSettings = async () => {
    try {
      const soundPlayer = SoundPlayer.getInstance();
      soundPlayer.setSoundEnabled(settings.soundEnabled);
      soundPlayer.setStartupSoundEnabled(settings.startupSoundEnabled);
      soundPlayer.setVolume(settings.volume);
      soundPlayer.saveSoundSettings();

      if (window.electronAPI && window.electronAPI.saveSettings) {
        await window.electronAPI.saveSettings(settings);
      }

      localStorage.setItem('settings', JSON.stringify(settings));
      await success('Settings saved successfully!');

    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const handleDeleteData = async () => {
    try {
      if (window.electronAPI && window.electronAPI.deleteAllData) {
        await window.electronAPI.deleteAllData();
      } else {
        localStorage.removeItem('settings');
      }

      setSettings({
        startWithWindows: false,
        breakTime: 300,
        soundEnabled: true,
        startupSoundEnabled: true,
        volume: 1.0
      });

      setShowDeleteModal(false);
      
      const soundPlayer = SoundPlayer.getInstance();
      soundPlayer.setSoundEnabled(true);
      soundPlayer.setStartupSoundEnabled(true);
      soundPlayer.setVolume(1.0);
    } catch (error) {
      console.error('Error deleting data:', error);
    }
  };

  return (
    <div className="p-0 current-background" style={{ minHeight: 'calc(100vh - 64px)' }}>
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-2">
            <button className='btn btn-icon' onClick={() => window.history.back()}>
              <IoIosArrowBack size={24} />
            </button>
            <h1 className="text-3xl font-bold mb-2 text-highlight">Settings</h1>
          </div>
          <p style={{ color: 'var(--text-secondary)' }}>
            Configure your application preferences
          </p>
        </div>

        <div className="card space-y-6">
          <div className="setting-item">
            <div className="flex items-center justify-between py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-1">Start with Windows</h3>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Launch the application automatically when Windows starts
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-4">
                <input
                  type="checkbox"
                  checked={settings.startWithWindows}
                  onChange={(e) => setSettings(prev => ({ ...prev, startWithWindows: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="click w-14 h-7 bg-gray-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-purple-600 peer-checked:to-indigo-600"></div>
              </label>
            </div>
          </div>

          <div className="setting-item">
            <div className="py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <h3 className="text-lg font-semibold mb-1">Break Time Duration</h3>
              <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                Set how long your break periods should last
              </p>
              <select
                value={settings.breakTime}
                onChange={(e) => setSettings(prev => ({ ...prev, breakTime: parseInt(e.target.value) }))}
                className="click w-full p-3 rounded-lg border-2 transition-all focus:outline-none"
                style={{
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  borderColor: 'var(--border-color)'
                }}
              >
                {breakTimeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="setting-item">
            <div className="flex items-center justify-between py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-1">Enable All Sounds</h3>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Turn on/off all sound effects in the application
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-4">
                <input
                  type="checkbox"
                  checked={settings.soundEnabled}
                  onChange={(e) => setSettings(prev => ({ ...prev, soundEnabled: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="click w-14 h-7 bg-gray-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-purple-600 peer-checked:to-indigo-600"></div>
              </label>
            </div>
          </div>

          <div className="setting-item">
            <div className="flex items-center justify-between py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-1">Startup Sound</h3>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Play sound when the application starts
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-4">
                <input
                  type="checkbox"
                  checked={settings.startupSoundEnabled && settings.soundEnabled}
                  onChange={(e) => setSettings(prev => ({ ...prev, startupSoundEnabled: e.target.checked }))}
                  disabled={!settings.soundEnabled}
                  className="sr-only peer"
                />
                <div className={`click w-14 h-7 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all ${
                  settings.soundEnabled 
                    ? 'bg-gray-600 peer-checked:bg-gradient-to-r peer-checked:from-purple-600 peer-checked:to-indigo-600' 
                    : 'bg-gray-400 cursor-not-allowed'
                }`}></div>
              </label>
            </div>
          </div>

          <div className="setting-item">
            <div className="py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <h3 className="text-lg font-semibold mb-1">Volume</h3>
              <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                Adjust the volume of sound effects ({Math.round(settings.volume * 100)}%)
              </p>
              <div className="flex items-center gap-4">
                <span className="text-sm">🔇</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={settings.volume}
                  onChange={(e) => {
                    const newVolume = parseFloat(e.target.value);
                    setSettings(prev => ({ ...prev, volume: newVolume }));
                    soundPlayer.setVolume(newVolume);
                  }}
                  disabled={!settings.soundEnabled}
                  className={`click range flex-1 ${!settings.soundEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                />
                <span className="text-sm">🔊</span>
              </div>
            </div>
          </div>

          <div className="setting-item">
            <div className="flex items-center justify-between py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-1">Dark Theme</h3>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Switch between dark and light theme
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-4">
                <input
                  type="checkbox"
                  checked={JSON.parse(localStorage.getItem('isDarkTheme') || 'true')}
                  onChange={toggleTheme}
                  className="sr-only peer"
                />
                <div className="click w-14 h-7 bg-gray-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-purple-600 peer-checked:to-indigo-600"></div>
              </label>
            </div>
          </div>

          <div className="pt-4">
            <button
              onClick={async () => {
                setIsSaving(true);
                await handleSaveSettings();
                setIsSaving(false);
              }}
              disabled={isSaving}
              className="btn btn-primary w-full py-3 text-lg save-btn"
            >
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>

        <div className="card mt-6" style={{ borderColor: '#e53e3e', borderWidth: '2px' }}>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-1" style={{ color: '#e53e3e' }}>
                Danger Zone
              </h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Delete all application data. This action cannot be undone.
              </p>
            </div>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="btn btn-secondary rounded-lg ml-4 px-6 py-2"
              style={{
                borderColor: '#e53e3e',
                color: '#e53e3e'
              }}
            >
              Delete Data
            </button>
          </div>
        </div>
      </div>

      {showDeleteModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: 'var(--modal-bg)' }}
          onClick={() => setShowDeleteModal(false)}
        >
          <div
            className="card max-w-md w-full mx-4 animate-pop"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4 mx-auto">
                <span className="text-2xl">⚠️</span>
              </div>
              <h3 className="text-xl font-bold text-center mb-2">Delete All Data?</h3>
              <p className="text-center" style={{ color: 'var(--text-secondary)' }}>
                This will permanently delete all your settings and data. This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="btn btn-secondary rounded-lg flex-1 py-3"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteData}
                className="btn flex-1 py-3 !rounded-lg font-semibold text-white"
                style={{
                  background: '#e53e3e',
                  border: 'none'
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;

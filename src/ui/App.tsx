import { useState, createContext, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import Dashboard from './Pages/Dashboard/Dashboard';
import Manage from './Pages/Manage/Manage';
import Settings from './Pages/Setting/Settings';
import DefaultLayout from './layouts/DefaultLayout';
import Todoflow from './Pages/Todoflow/Todoflow';
import ScheduleEditor from './Pages/ScheduleEditor/ScheduleEditor';
import AlertSystem from './components/AlertSystem/AlertSystem';
import ScheduleEditorCompletionListener from './components/ScheduleEditorCompletionListener';
import OnTask from './Pages/Focus/Focus';
import { PageType } from '~/enums/PageType.enum';
import SoundPlayer from './helpers/utils/SoundPlayer';
import { SoundType } from '~/enums/Sound.Type.enum';
import sound_gambusta from '~/ui/assets/sound-gambusta.mp3';
import sound_waoo_congratulations from '~/ui/assets/sound-waoo-congratulations.mp3';
import sound_bocchi from '~/ui/assets/sound-bocchi.mp3';
import sound_sugoi_sugoi from '~/ui/assets/sound-sugoi-sugoi.mp3';
import sound_ahhh from '~/ui/assets/sound-ahhh.mp3';
import sound_cau_met_lam_ha from '~/ui/assets/sound-cau-met-lam-ha.mp3';
import sound_shinderu from '~/ui/assets/sound-shinderu.mp3';
import sound_sound_oh_my_god from '~/ui/assets/sound-oh-my-god.mp3';
import sound_hayay from '~/ui/assets/sound-hayay.mp3';

type ThemeContextType = {
  isDarkTheme: boolean;
  toggleTheme: () => void;
};

export const ThemeContext = createContext<ThemeContextType>({
  isDarkTheme: true,
  toggleTheme: () => {},
});

function App() {
  const [isDarkTheme, setIsDarkTheme] = useState<boolean>(
    localStorage.getItem('isDarkTheme') === 'false' ? false : true
  );
  const soundPlayer = SoundPlayer.getInstance();


  const toggleTheme = () => {
    setIsDarkTheme((prev) => {
      const next = !prev;
      localStorage.setItem('isDarkTheme', next.toString());
      if (next) {
        document.body.classList.remove('light-theme');
      } else {
        document.body.classList.add('light-theme');
      }
      return next;
    });
  };

  useEffect(() => {
    const handleLoadSettings = async () =>{
      try{
        const settings = await window.electronAPI.getSettings();
        if(settings){
          localStorage.setItem('settings', JSON.stringify(settings));
          if(settings.soundEnabled !== undefined){
            soundPlayer.setSoundEnabled(settings.soundEnabled);
          }
          if(settings.startupSoundEnabled !== undefined){
            soundPlayer.setStartupSoundEnabled(settings.startupSoundEnabled);
          }
          if(settings.volume !== undefined){
            soundPlayer.setVolume(settings.volume); 
          }
          const audioElements = {
            [SoundType.SOUND_GAMBUSTA]: new Audio(sound_gambusta),
            [SoundType.SOUND_WAOO_CONGRATULATIONS]: new Audio(sound_waoo_congratulations),
            [SoundType.SOUND_BOCCHI]: new Audio(sound_bocchi),
            [SoundType.SOUND_SUGOI_SUGOI]: new Audio(sound_sugoi_sugoi),
            [SoundType.SOUND_AHHH]: new Audio(sound_ahhh),
            [SoundType.SOUND_CAU_MET_LAM_HA]: new Audio(sound_cau_met_lam_ha),
            [SoundType.SOUND_SHINDERU]: new Audio(sound_shinderu),
            [SoundType.SOUND_OH_MY_GOD]: new Audio(sound_sound_oh_my_god),
            [SoundType.SOUND_HAYAY]: new Audio(sound_hayay),
          };
          soundPlayer.init(audioElements);
          soundPlayer.play(SoundType.SOUND_AHHH);
        }
      }catch(err){
        console.error('Failed to load settings on app start:', err);
      }
    }

    const handleSetThemeOnStart = () => {
      if (isDarkTheme) {
        document.body.classList.remove('light-theme');
      } else {
        document.body.classList.add('light-theme');
      }
    }

    handleLoadSettings();
    handleSetThemeOnStart();
  }, []);

  return (
    <Provider store={store}>
      <ThemeContext.Provider value={{ isDarkTheme, toggleTheme }}>
          <Routes>
            <Route path="/schedule-editor" element={<ScheduleEditor />} />
            <Route path="/" element={<DefaultLayout><Dashboard /></DefaultLayout>} />
            <Route path="/dashboard" element={<DefaultLayout><Dashboard /></DefaultLayout>} />
            <Route path="/manage" element={<DefaultLayout><Manage /></DefaultLayout>} />
            <Route path="/setting" element={<DefaultLayout><Settings /></DefaultLayout>} />
            <Route path="/todoflow" element={<DefaultLayout><Todoflow /></DefaultLayout>} />
            <Route path="/ontask" element={<DefaultLayout><OnTask /></DefaultLayout>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <ScheduleEditorCompletionListener />
          <AlertSystem />
      </ThemeContext.Provider>
    </Provider>
  );
}

export default App;

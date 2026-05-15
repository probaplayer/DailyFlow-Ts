import { ReactNode, useContext} from 'react';
import { useNavigate } from 'react-router-dom';
import { ThemeContext } from '../App';
import { 
  IoSettingsOutline, 
  IoMoonOutline, 
  IoSunnyOutline, 
  IoHomeOutline,
  IoListOutline,
  IoBarChartOutline,
  IoSparklesOutline
} from "react-icons/io5";
import { RiShutDownLine } from "react-icons/ri";
import './DefaultLayout.css';
import { useAlert } from '../helpers/hooks/useAlert';

interface DefaultLayoutProps {
  children: ReactNode;
}

const DefaultLayout = ({ children }: DefaultLayoutProps) => {
  const navigate = useNavigate();
  const { isDarkTheme, toggleTheme } = useContext(ThemeContext);
  const { 
      ask, 
  } = useAlert();

  return (
    <div className="layout-container">
      <nav className="drag-area sidebar">
        <div className="nav-top">
          <button className="btn btn-icon" title="Dashboard" onClick={() => navigate('/dashboard')}>
            <IoHomeOutline />
          </button>
          <button className="btn btn-primary h-[32px]" title="Manage TodoFlow" onClick={() => navigate('/manage')}>
            <IoListOutline />
          </button>
          <button className="btn btn-icon" title="Analytics" onClick={() => navigate('/analytics')}>
            <IoBarChartOutline />
          </button>
          <button className="btn btn-icon" title="AI" onClick={() => navigate('/ai')}>
            <IoSparklesOutline />
          </button>
        </div>
        <div className="nav-bottom">
          <button className="btn btn-icon" onClick={() => navigate('/setting')}>
            <IoSettingsOutline />
          </button>
          <button className="btn btn-icon" onClick={toggleTheme}>
            {isDarkTheme ? <IoMoonOutline /> : <IoSunnyOutline />}
          </button>
          <button 
            className="btn btn-icon" 
            style={{ color: '#ef4444' }}
            onClick={async () => {
              const result = await ask('Are you sure you want to exit the application?', 'Confirm Exit', ['Yes', 'No']);
              if (result.response === 0) { 
                  await window.electronAPI.appClose();
              } else if (result.response === 1) {
                await window.electronAPI.appMinimize();
              }
            }}>
            <RiShutDownLine />
          </button>
        </div>
      </nav>
      <main className="main-content-area">
        {children}
      </main>
    </div>
  );
};

export default DefaultLayout;

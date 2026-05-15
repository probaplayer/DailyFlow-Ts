import { ReactNode, useContext} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
  const location = useLocation();
  const { isDarkTheme, toggleTheme } = useContext(ThemeContext);
  const { 
      ask, 
  } = useAlert();

  const navClass = (path: string, primary = false) => {
    const isActive =
      path === '/dashboard'
        ? location.pathname === '/' || location.pathname === '/dashboard'
        : location.pathname === path;
    return `btn ${primary ? 'btn-primary h-[32px]' : 'btn-icon'} ${isActive ? 'active' : ''}`;
  };

  return (
    <div className="layout-container">
      <nav className="drag-area sidebar">
        <div className="nav-top">
          <button className={navClass('/dashboard')} title="Dashboard" onClick={() => navigate('/dashboard')}>
            <IoHomeOutline />
          </button>
          <button className={navClass('/manage')} title="Manage TodoFlow" onClick={() => navigate('/manage')}>
            <IoListOutline />
          </button>
          <button className={navClass('/analytics')} title="Analytics" onClick={() => navigate('/analytics')}>
            <IoBarChartOutline />
          </button>
          <button className={navClass('/ai')} title="AI" onClick={() => navigate('/ai')}>
            <IoSparklesOutline />
          </button>
        </div>
        <div className="nav-bottom">
          <button className={navClass('/setting')} onClick={() => navigate('/setting')}>
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

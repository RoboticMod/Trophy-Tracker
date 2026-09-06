import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {HashRouter} from 'react-router-dom';
import {defaultTheme, Provider} from '@adobe/react-spectrum';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider theme={defaultTheme} colorScheme="dark">
      <HashRouter>
        <App />
      </HashRouter>
    </Provider>
  </StrictMode>,
);

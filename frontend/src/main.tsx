import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { environmentDocumentTitleSuffix } from '@/lib/app-env';
import App from './App';
import './index.css';
import '@/i18n';

const baseTitle = document.title;
const envSuffix = environmentDocumentTitleSuffix();
if (envSuffix && !baseTitle.includes(envSuffix.trim())) {
  document.title = `${baseTitle}${envSuffix}`;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
);

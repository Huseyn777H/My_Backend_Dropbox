import React from 'react';
import ReactDOM from 'react-dom/client';
import '@aws-amplify/ui-react/styles.css';
import AmplifyBootstrap from './components/AmplifyBootstrap.jsx';
import './main.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AmplifyBootstrap />
  </React.StrictMode>,
);

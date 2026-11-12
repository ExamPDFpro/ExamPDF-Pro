import './boot';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './v2.css';
import { startMobileCardMotion } from './mobileMotion';
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
startMobileCardMotion();

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';
import './porcelain-theme.css';
import './tabletop-scene.css';
import './party-table.css';

createRoot(document.getElementById('root')).render(<App />);

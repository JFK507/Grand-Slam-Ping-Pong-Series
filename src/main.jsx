import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import ProveedorSesionFirebase from './ui/sesionFirebase.jsx';
import ProveedorSyncFirebase from './ui/sincronizacionFirebase.jsx';
import './estilos.css';

createRoot(document.getElementById('root')).render(
  <App Sesion={ProveedorSesionFirebase} Sync={ProveedorSyncFirebase} />,
);

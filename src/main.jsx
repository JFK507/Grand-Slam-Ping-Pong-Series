import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { ProveedorSesion } from './ui/sesion.jsx';
import './estilos.css';

/* Provisional: mientras no entra Firebase, quien abra la app es el admin.
   Cuando esté la sesión de Google, el rol y el miId saldrán de ahí. */
createRoot(document.getElementById('root')).render(
  <ProveedorSesion rol="admin" miId={null}>
    <App />
  </ProveedorSesion>,
);

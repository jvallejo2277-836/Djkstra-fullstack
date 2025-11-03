import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const { state } = useApp();
  
  const isActive = (path: string) => location.pathname === path;
  
  return (
    <div className="layout">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <h1>🌐 Dijkstra Visualizer</h1>
            <span className="version">Fullstack Edition</span>
          </div>
          
          <nav className="nav">
            <Link 
              to="/" 
              className={`nav-link ${isActive('/') ? 'active' : ''}`}
            >
              📊 Dashboard
            </Link>
            <Link 
              to="/graphs" 
              className={`nav-link ${isActive('/graphs') ? 'active' : ''}`}
            >
              🗂️ Grafos
            </Link>
            <Link 
              to="/algorithm" 
              className={`nav-link ${isActive('/algorithm') ? 'active' : ''}`}
            >
              🚀 Algoritmo
            </Link>
            <Link 
              to="/algorithm?mode=view" 
              className={`nav-link ${isActive('/algorithm?mode=view') ? 'active' : ''}`}
            >
              👁️ Visualizar
            </Link>
          </nav>
          
          <div className="status">
            <div className={`connection-status ${state.isConnected ? 'connected' : 'disconnected'}`}>
              <span className="status-dot"></span>
              {state.isConnected ? 'Conectado' : 'Desconectado'}
            </div>
          </div>
        </div>
      </header>
      
      {/* Status Bar */}
      {state.activeGraph && (
        <div className="status-bar">
          <div className="status-bar-content">
            <span className="active-graph">
              📊 <strong>{state.activeGraph.name}</strong> 
              ({state.activeGraph.nodes_count} nodos, {state.activeGraph.edges_count} aristas)
            </span>
            {state.activeGraph.source_node && (
              <span className="source-node">
                🎯 Origen: <strong>{state.activeGraph.source_node.name}</strong>
              </span>
            )}
          </div>
        </div>
      )}
      
      {/* Error Banner */}
      {state.error && (
        <div className="error-banner">
          <div className="error-content">
            <span className="error-icon">⚠️</span>
            <span className="error-message">{state.error}</span>
            <button 
              className="error-close"
              onClick={() => {/* actions.clearError() */}}
            >
              ✕
            </button>
          </div>
        </div>
      )}
      
      {/* Main Content */}
      <main className="main-content">
        <div className="container">
          {children}
        </div>
      </main>
      
      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <p>
            &copy; 2025 Dijkstra Visualizer - 
            <span className="tech-stack">
              React + TypeScript + Django REST API
            </span>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
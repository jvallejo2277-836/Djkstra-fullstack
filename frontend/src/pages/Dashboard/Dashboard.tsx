import React from 'react';
import { useApp } from '../../context/AppContext';
import './Dashboard.css';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  const { state, actions } = useApp();
  
  React.useEffect(() => {
    console.log('Dashboard mounting, loading data...');
    actions.checkConnection();
    actions.loadGraphs();
    actions.loadActiveGraph();
  }, []);

  React.useEffect(() => {
    console.log('Dashboard - state updated:', { 
      graphsCount: state.graphs?.length, 
      activeGraph: state.activeGraph?.name,
      isConnected: state.isConnected 
    });
  }, [state.graphs, state.activeGraph, state.isConnected]);
  
  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>📊 Dashboard</h1>
        <p>Bienvenido al visualizador de algoritmo de Dijkstra</p>
      </div>
      
      {/* Connection Status Card */}
      <div className="cards-grid">
        <div className={`card connection-card ${state.isConnected ? 'connected' : 'disconnected'}`}>
          <div className="card-header">
            <h3>🔗 Estado de Conexión</h3>
            <div className={`status-indicator ${state.isConnected ? 'connected' : 'disconnected'}`}>
              <div className="status-dot"></div>
            </div>
          </div>
          <div className="card-content">
            {state.isConnected ? (
              <div className="status-success">
                <p>✅ Conectado al backend Django</p>
                <small>API funcionando correctamente</small>
              </div>
            ) : (
              <div className="status-error">
                <p>❌ No se puede conectar al backend</p>
                <small>Verifica que el servidor Django esté corriendo</small>
                <button 
                  className="retry-button"
                  onClick={actions.checkConnection}
                >
                  🔄 Reintentar
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Graphs Summary Card */}
        <div className="card">
          <div className="card-header">
            <h3>📈 Resumen de Grafos</h3>
          </div>
          <div className="card-content">
            <div className="stat">
              <span className="stat-number">{state.graphs?.length || 0}</span>
              <span className="stat-label">Grafos totales</span>
            </div>
            <div className="stat">
              <span className="stat-number">
                {state.activeGraph ? 1 : 0}
              </span>
              <span className="stat-label">Grafo activo</span>
            </div>
          </div>
        </div>
        
        {/* Active Graph Card */}
        {state.activeGraph ? (
          <div className="card active-graph-card">
            <div className="card-header">
              <h3>🎯 Grafo Activo</h3>
            </div>
            <div className="card-content">
              <h4>{state.activeGraph.name}</h4>
              {state.activeGraph.description && (
                <p className="graph-description">{state.activeGraph.description}</p>
              )}
              <div className="graph-stats">
                <div className="stat-item">
                  <span className="stat-icon">📍</span>
                  <span>{state.activeGraph.nodes_count} nodos</span>
                </div>
                <div className="stat-item">
                  <span className="stat-icon">↔️</span>
                  <span>{state.activeGraph.edges_count} aristas</span>
                </div>
                {state.activeGraph.source_node && (
                  <div className="stat-item">
                    <span className="stat-icon">🎯</span>
                    <span>Origen: {state.activeGraph.source_node.name}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="card no-graph-card">
            <div className="card-header">
              <h3>🚫 Sin Grafo Activo</h3>
            </div>
            <div className="card-content">
              <p>No hay ningún grafo activo seleccionado.</p>
              <a href="/graphs" className="action-link">
                🗂️ Ir a Gestión de Grafos
              </a>
            </div>
          </div>
        )}
        
        {/* Algorithm Results Card */}
        {state.dijkstraResult && (
          <div className="card result-card">
            <div className="card-header">
              <h3>🚀 Último Resultado</h3>
            </div>
            <div className="card-content">
              <div className="result-summary">
                <p>
                  <strong>Desde:</strong> {state.dijkstraResult.start_node} → 
                  <strong> Hasta:</strong> {state.dijkstraResult.end_node}
                </p>
                <p>
                  <strong>Distancia:</strong> {state.dijkstraResult.total_distance}
                </p>
                <p>
                  <strong>Camino:</strong> {state.dijkstraResult.shortest_path.join(' → ')}
                </p>
                {state.dijkstraResult.execution_time && (
                  <p>
                    <strong>Tiempo:</strong> {state.dijkstraResult.execution_time.toFixed(4)}s
                  </p>
                )}
              </div>
              <a href="/algorithm" className="action-link">
                🔍 Ver Visualización
              </a>
            </div>
          </div>
        )}
      </div>
      
      {/* Quick Actions */}
      <div className="quick-actions">
        <h2>🚀 Acciones Rápidas</h2>
        <div className="actions-grid">
          <a href="/graphs" className="action-card">
            <div className="action-icon">🗂️</div>
            <h3>Gestionar Grafos</h3>
            <p>Crear, editar y eliminar grafos</p>
          </a>
          
          <a href="/algorithm" className="action-card">
            <div className="action-icon">🎮</div>
            <h3>Ejecutar Algoritmo</h3>
            <p>Visualizar el algoritmo de Dijkstra</p>
          </a>
          
          <a href="/algorithm?mode=view" className="action-card">
            <div className="action-icon">👁️</div>
            <h3>Solo visualizar</h3>
            <p>Entrar al visualizador en modo sólo lectura</p>
          </a>
          
          <button 
            className="action-card action-button"
            onClick={actions.loadActiveGraph}
            disabled={state.loading.general}
          >
            <div className="action-icon">🔄</div>
            <h3>Actualizar Datos</h3>
            <p>Recargar información del servidor</p>
          </button>
        </div>
      </div>
      
      {/* Loading State */}
      {state.loading.general && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>Cargando datos...</p>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
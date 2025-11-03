import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Layout from './components/Layout/Layout';
import Dashboard from './pages/Dashboard/Dashboard';
import GraphManager from './pages/GraphManager/GraphManager';
import AlgorithmVisualizer from './pages/AlgorithmVisualizer/AlgorithmVisualizer';
import './App.css';

function App() {
  return (
    <AppProvider>
      <Router>
        <div className="App">
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/graphs" element={<GraphManager />} />
              <Route path="/algorithm" element={<AlgorithmVisualizer />} />
            </Routes>
          </Layout>
        </div>
      </Router>
    </AppProvider>
  );
}

export default App;

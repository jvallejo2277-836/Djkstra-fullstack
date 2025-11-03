import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Graph, Node, Edge } from '../../types';
import './GraphManager.css';

const GraphManager: React.FC = () => {
  const { state, dispatch, actions } = useApp();
  const [selectedTab, setSelectedTab] = useState<'graphs' | 'nodes' | 'edges'>('graphs');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'create' | 'edit'>('create');
  const [editingItem, setEditingItem] = useState<Graph | Node | Edge | null>(null);

  // Form states
  const [graphForm, setGraphForm] = useState({ name: '', description: '' });
  const [nodeForm, setNodeForm] = useState({ name: '', is_source: false });
  const [edgeForm, setEdgeForm] = useState({ from_node: '', to_node: '', weight: 1, directed: true });

  useEffect(() => {
    actions.loadGraphs();
  }, []);

  useEffect(() => {
    if (state.activeGraph) {
      actions.loadNodes(state.activeGraph.id);
      actions.loadEdges(state.activeGraph.id);
    }
  }, [state.activeGraph]);

  const handleTabChange = (tab: 'graphs' | 'nodes' | 'edges') => {
    setSelectedTab(tab);
    closeModal();
  };

  const openModal = (type: 'create' | 'edit', item?: Graph | Node | Edge) => {
    setModalType(type);
    setEditingItem(item || null);
    
      if (type === 'edit' && item) {
      if ('nodes' in item) {
        // It's a Graph
        setGraphForm({ name: item.name, description: item.description || '' });
      } else if ('is_source' in item) {
        // It's a Node
        setNodeForm({ 
          name: item.name, 
          is_source: item.is_source 
        });
      } else {
        // It's an Edge
        setEdgeForm({ 
          from_node: item.from_node.toString(), 
          to_node: item.to_node.toString(), 
          weight: item.weight,
          directed: item.directed !== undefined ? item.directed : true,
        });
      }
    } else {
      // Reset forms for create
      setGraphForm({ name: '', description: '' });
      setNodeForm({ name: '', is_source: false });
      setEdgeForm({ from_node: '', to_node: '', weight: 1, directed: true });
    }
    
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingItem(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (selectedTab === 'graphs') {
        if (modalType === 'create') {
          await actions.createGraph(graphForm);
        } else if (editingItem) {
          await actions.updateGraph(editingItem.id, graphForm);
        }
      } else if (selectedTab === 'nodes' && state.activeGraph) {
        // Auto-assign position using a simple circular layout
        const count = (state.nodes || []).length;
        const centerX = 300;
        const centerY = 300;
        const radius = Math.max(100, 50 * count);
        const angle = (count === 0) ? 0 : (2 * Math.PI * count) / Math.max(1, count + 1);
        const x = Math.round(centerX + radius * Math.cos(angle));
        const y = Math.round(centerY + radius * Math.sin(angle));

        const nodeData = {
          name: nodeForm.name,
          graph: state.activeGraph.id,
          x,
          y,
          is_source: nodeForm.is_source,
        };
        if (modalType === 'create') {
          await actions.createNode(nodeData);
        } else if (editingItem) {
          await actions.updateNode(editingItem.id, nodeData);
        }
      } else if (selectedTab === 'edges' && state.activeGraph) {
        const edgeData = { 
          ...edgeForm, 
          graph: state.activeGraph.id,
          from_node: parseInt(edgeForm.from_node),
          to_node: parseInt(edgeForm.to_node)
        };
        if (modalType === 'create') {
          await actions.createEdge(edgeData);
        } else if (editingItem) {
          await actions.updateEdge(editingItem.id, edgeData);
        }
      }
      closeModal();
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this item?')) {
      return;
    }

    try {
      if (selectedTab === 'graphs') {
        await actions.deleteGraph(id);
      } else if (selectedTab === 'nodes') {
        await actions.deleteNode(id);
      } else if (selectedTab === 'edges') {
        await actions.deleteEdge(id);
      }
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const handleSetActiveGraph = async (graphId: number) => {
    try {
      await actions.activateGraph(graphId);
    } catch (error) {
      console.error('Error setting active graph:', error);
    }
  };

  const renderGraphsTab = () => (
    <div className="tab-content">
      <div className="tab-header">
        <h3>Graphs</h3>
        <button className="btn btn-primary" onClick={() => openModal('create')}>
          Create Graph
        </button>
      </div>
      
      {!state.graphs || state.graphs.length === 0 ? (
        <div className="empty-state">
          <p>No graphs found. Create your first graph to get started!</p>
        </div>
      ) : (
        <div className="items-grid">
          {(state.graphs || []).map((graph) => (
            <div key={graph.id} className={`item-card ${graph.is_active ? 'active' : ''}`}>
              <div className="item-header">
                <h4>{graph.name}</h4>
                {graph.is_active && <span className="active-badge">Active</span>}
              </div>
              
              {graph.description && <p className="item-description">{graph.description}</p>}
              
              <div className="item-stats">
                <span>{graph.nodes_count || 0} nodes</span>
                <span>{graph.edges_count || 0} edges</span>
              </div>
              
              <div className="item-actions">
                {!graph.is_active && (
                  <button 
                    className="btn btn-secondary"
                    onClick={() => handleSetActiveGraph(graph.id)}
                  >
                    Set Active
                  </button>
                )}
                <button 
                  className="btn btn-outline"
                  onClick={() => openModal('edit', { 
                    ...graph, 
                    nodes: [], 
                    edges: [] 
                  } as Graph)}
                >
                  Edit
                </button>
                <button 
                  className="btn btn-danger"
                  onClick={() => handleDelete(graph.id)}
                  disabled={graph.is_active}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderNodesTab = () => {
    if (!state.activeGraph) {
      return (
        <div className="tab-content">
          <div className="empty-state">
            <p>Please select an active graph first to manage nodes.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="tab-content">
        <div className="tab-header">
          <h3>Nodes - {state.activeGraph.name}</h3>
          <button className="btn btn-primary" onClick={() => openModal('create')}>
            Create Node
          </button>
        </div>
        
        {!state.nodes || state.nodes.length === 0 ? (
          <div className="empty-state">
            <p>No nodes found. Create your first node!</p>
          </div>
        ) : (
          <div className="items-grid">
            {(state.nodes || []).map((node) => (
              <div key={node.id} className={`item-card ${node.is_source ? 'source' : ''}`}>
                <div className="item-header">
                  <h4>{node.name}</h4>
                  {node.is_source && <span className="source-badge">Source</span>}
                </div>
                
                <div className="item-stats">
                  <span>Position: ({node.x_position || 0}, {node.y_position || 0})</span>
                </div>
                
                <div className="item-actions">
                  <button 
                    className="btn btn-outline"
                    onClick={() => openModal('edit', node)}
                  >
                    Edit
                  </button>
                  <button 
                    className="btn btn-danger"
                    onClick={() => handleDelete(node.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderEdgesTab = () => {
    if (!state.activeGraph) {
      return (
        <div className="tab-content">
          <div className="empty-state">
            <p>Please select an active graph first to manage edges.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="tab-content">
        <div className="tab-header">
          <h3>Edges - {state.activeGraph.name}</h3>
          <button 
            className="btn btn-primary" 
            onClick={() => openModal('create')}
            disabled={!state.nodes || state.nodes.length < 2}
          >
            Create Edge
          </button>
        </div>
        
        {!state.nodes || state.nodes.length < 2 ? (
          <div className="empty-state">
            <p>You need at least 2 nodes to create edges.</p>
          </div>
        ) : !state.edges || state.edges.length === 0 ? (
          <div className="empty-state">
            <p>No edges found. Create your first edge!</p>
          </div>
        ) : (
          <div className="items-grid">
            {(state.edges || []).map((edge) => {
              const fromNode = state.nodes?.find(n => n.id === edge.from_node);
              const toNode = state.nodes?.find(n => n.id === edge.to_node);
              
              return (
                <div key={edge.id} className="item-card">
                  <div className="item-header">
                    <h4>
                      {fromNode?.name || `Node ${edge.from_node}`} → {toNode?.name || `Node ${edge.to_node}`}
                    </h4>
                  </div>
                  
                  <div className="item-stats">
                    <span>Weight: {edge.weight}</span>
                  </div>
                  
                  <div className="item-actions">
                    <button 
                      className="btn btn-outline"
                      onClick={() => openModal('edit', edge)}
                    >
                      Edit
                    </button>
                    <button 
                      className="btn btn-danger"
                      onClick={() => handleDelete(edge.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderModal = () => {
    if (!showModal) return null;

    return (
      <div className="modal-overlay" onClick={closeModal}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>{modalType === 'create' ? 'Create' : 'Edit'} {selectedTab.slice(0, -1)}</h3>
            <button className="close-btn" onClick={closeModal}>×</button>
          </div>
          
          <form onSubmit={handleSubmit}>
            {selectedTab === 'graphs' && (
              <>
                <div className="form-group">
                  <label htmlFor="name">Name *</label>
                  <input
                    id="name"
                    type="text"
                    value={graphForm.name}
                    onChange={(e) => setGraphForm({ ...graphForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="description">Description</label>
                  <textarea
                    id="description"
                    value={graphForm.description}
                    onChange={(e) => setGraphForm({ ...graphForm, description: e.target.value })}
                    rows={3}
                  />
                </div>
              </>
            )}

            {selectedTab === 'nodes' && (
              <>
                <div className="form-group">
                  <label htmlFor="name">Name *</label>
                  <input
                    id="name"
                    type="text"
                    value={nodeForm.name}
                    onChange={(e) => setNodeForm({ ...nodeForm, name: e.target.value })}
                    required
                  />
                </div>
                {/* Coordinates are assigned automatically to simplify the UX */}
                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={nodeForm.is_source}
                      onChange={(e) => setNodeForm({ ...nodeForm, is_source: e.target.checked })}
                    />
                    Set as source node
                  </label>
                </div>
              </>
            )}

            {selectedTab === 'edges' && (
              <>
                <div className="form-group">
                  <label htmlFor="from_node">From Node *</label>
                  <select
                    id="from_node"
                    value={edgeForm.from_node}
                    onChange={(e) => setEdgeForm({ ...edgeForm, from_node: e.target.value })}
                    required
                  >
                    <option value="">Select a node</option>
                    {state.nodes?.map((node) => (
                      <option key={node.id} value={node.id}>
                        {node.name}
                      </option>
                    )) || []}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="to_node">To Node *</label>
                  <select
                    id="to_node"
                    value={edgeForm.to_node}
                    onChange={(e) => setEdgeForm({ ...edgeForm, to_node: e.target.value })}
                    required
                  >
                    <option value="">Select a node</option>
                    {state.nodes?.map((node) => (
                      <option key={node.id} value={node.id}>
                        {node.name}
                      </option>
                    )) || []}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="weight">Weight *</label>
                  <input
                    id="weight"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={edgeForm.weight}
                    onChange={(e) => setEdgeForm({ ...edgeForm, weight: parseFloat(e.target.value) || 1 })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={edgeForm.directed}
                      onChange={(e) => setEdgeForm({ ...edgeForm, directed: e.target.checked })}
                    />
                    Directed edge
                  </label>
                </div>
              </>
            )}

            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={closeModal}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                {modalType === 'create' ? 'Create' : 'Update'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="graph-manager">
      <div className="manager-header">
        <h1>Graph Manager</h1>
        <p>Create and manage your graphs, nodes, and edges</p>
      </div>

      <div className="tabs">
        <button 
          className={`tab ${selectedTab === 'graphs' ? 'active' : ''}`}
          onClick={() => handleTabChange('graphs')}
        >
          Graphs ({state.graphs?.length || 0})
        </button>
        <button 
          className={`tab ${selectedTab === 'nodes' ? 'active' : ''}`}
          onClick={() => handleTabChange('nodes')}
          disabled={!state.activeGraph}
        >
          Nodes ({state.nodes?.length || 0})
        </button>
        <button 
          className={`tab ${selectedTab === 'edges' ? 'active' : ''}`}
          onClick={() => handleTabChange('edges')}
          disabled={!state.activeGraph}
        >
          Edges ({state.edges?.length || 0})
        </button>
      </div>

      {state.loading && <div className="loading-indicator">Loading...</div>}
      
      {selectedTab === 'graphs' && renderGraphsTab()}
      {selectedTab === 'nodes' && renderNodesTab()}
      {selectedTab === 'edges' && renderEdgesTab()}

      {renderModal()}
    </div>
  );
};

export default GraphManager;
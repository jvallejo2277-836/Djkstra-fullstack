import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Node, Edge, DijkstraStep, AllPathsResult, PathInfo } from '../../types';
import './AlgorithmVisualizer.css';

interface Position {
  x: number;
  y: number;
}

const AlgorithmVisualizer: React.FC = () => {
  const { state, actions } = useApp();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  
  
  // Estados del visualizador
  const [selectedStartNode, setSelectedStartNode] = useState<number | null>(null);
  const [selectedEndNode, setSelectedEndNode] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [showSteps, setShowSteps] = useState(true);
  const [playSpeed, setPlaySpeed] = useState(1000); // milisegundos entre pasos
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Estados para todos los caminos
  const [allPathsResult, setAllPathsResult] = useState<AllPathsResult | null>(null);
  const [selectedPathIndex, setSelectedPathIndex] = useState<number | null>(null);
  const [showAllPaths, setShowAllPaths] = useState(false);
  const [isSearchingPaths, setIsSearchingPaths] = useState(false);
  // Flag para suprimir resaltados temporales sin borrar resultados
  const [suppressHighlights, setSuppressHighlights] = useState(false);
  
  // Estados del canvas
  const [nodePositions, setNodePositions] = useState<Map<number, Position>>(new Map());
  const [draggedNode, setDraggedNode] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });
  const [positionsDirty, setPositionsDirty] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string, ms = 3000) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), ms);
  };

  // Constantes de dibujo
  const NODE_RADIUS = 25;
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 600;
  const MARGIN = 50;

  // Inicializar posiciones de nodos
  useEffect(() => {
    if (state.nodes.length > 0) {
      const positions = new Map<number, Position>();
      
      state.nodes.forEach((node, index) => {
        // Si el nodo tiene posiciones guardadas, usarlas
        if (node.x_position !== undefined && node.y_position !== undefined) {
          positions.set(node.id, {
            x: Math.max(MARGIN, Math.min(CANVAS_WIDTH - MARGIN, node.x_position * 2 + 100)),
            y: Math.max(MARGIN, Math.min(CANVAS_HEIGHT - MARGIN, node.y_position * 2 + 100))
          });
        } else {
          // Distribución automática en círculo
          const angle = (2 * Math.PI * index) / state.nodes.length;
          const centerX = CANVAS_WIDTH / 2;
          const centerY = CANVAS_HEIGHT / 2;
          const radius = Math.min(centerX, centerY) - MARGIN - NODE_RADIUS;
          
          positions.set(node.id, {
            x: centerX + radius * Math.cos(angle),
            y: centerY + radius * Math.sin(angle)
          });
        }
      });
      
      setNodePositions(positions);
    }
  }, [state.nodes]);

  // Funciones de dibujo estabilizadas para poder incluirlas en los deps de useEffect
  const drawArrowHead = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, color: string) => {
    const headlen = 10;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - headlen * Math.cos(angle - Math.PI / 6), y - headlen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x - headlen * Math.cos(angle + Math.PI / 6), y - headlen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }, []);

  const drawNode = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      node: Node,
      position: Position,
      visitedNodes: Set<number>,
      distances: { [nodeId: string]: number }
    ) => {
      const isSource = node.is_source;
      const isStart = selectedStartNode === node.id;
      const isEnd = selectedEndNode === node.id;
      const isVisited = visitedNodes.has(node.id);
      const distance = distances[node.id.toString()];

      // Color del nodo
      let fillColor = '#ffffff';
      let borderColor = '#d1d5db';
      
      if (isSource) {
        fillColor = '#48bb78';
        borderColor = '#38a169';
      } else if (isStart) {
        fillColor = '#4299e1';
        borderColor = '#3182ce';
      } else if (isEnd) {
        fillColor = '#ed8936';
        borderColor = '#dd6b20';
      } else if (isVisited) {
        fillColor = '#9f7aea';
        borderColor = '#805ad5';
      }

      // Dibujar círculo del nodo
      ctx.beginPath();
      ctx.arc(position.x, position.y, NODE_RADIUS, 0, 2 * Math.PI);
      ctx.fillStyle = fillColor;
      ctx.fill();
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 3;
      ctx.stroke();

      // Texto del nodo
      ctx.fillStyle = isSource || isStart || isEnd || isVisited ? '#ffffff' : '#2d3748';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.name, position.x, position.y - 2);

      // Mostrar distancia si está disponible
      if (distance !== undefined && distance !== Infinity) {
        ctx.fillStyle = '#2d3748';
        ctx.font = '10px Arial';
        ctx.fillText(`d: ${distance}`, position.x, position.y + NODE_RADIUS + 15);
      }
    },
    [selectedStartNode, selectedEndNode]
  );

  const drawEdge = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      fromPos: Position,
      toPos: Position,
      edge: Edge,
      stepData?: DijkstraStep,
      highlight: boolean = false
    ) => {
      const angle = Math.atan2(toPos.y - fromPos.y, toPos.x - fromPos.x);
      const startX = fromPos.x + NODE_RADIUS * Math.cos(angle);
      const startY = fromPos.y + NODE_RADIUS * Math.sin(angle);
      const endX = toPos.x - NODE_RADIUS * Math.cos(angle);
      const endY = toPos.y - NODE_RADIUS * Math.sin(angle);

      let strokeColor = '#6b7280';
      let lineWidth = 2;
      if (highlight) {
        strokeColor = '#f59e0b';
        lineWidth = 6;
        try {
          // eslint-disable-next-line no-console
          console.log('[drawEdge] highlight', { id: edge.id, from: edge.from_node_name, to: edge.to_node_name });
        } catch (e) {}
      }

      const currentNodeId = stepData?.current_node ? parseInt(stepData.current_node) : null;
      if (currentNodeId && (edge.from_node === currentNodeId || edge.to_node === currentNodeId)) {
        strokeColor = '#f59e0b';
        lineWidth = 4;
      }

      if (highlight) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.shadowColor = strokeColor;
        ctx.shadowBlur = 10;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = Math.max(4, lineWidth + 2);
        ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = Math.max(2, lineWidth - 2);
        ctx.stroke();
        ctx.restore();
      } else {
        ctx.save();
        ctx.lineCap = 'butt';
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
        ctx.restore();
      }

      const arrowColor = strokeColor;
      if (edge.directed) {
        drawArrowHead(ctx, endX, endY, angle, arrowColor);
      } else {
        drawArrowHead(ctx, endX, endY, angle, arrowColor);
        drawArrowHead(ctx, startX, startY, angle + Math.PI, arrowColor);
      }

      const midX = (startX + endX) / 2;
      const midY = (startY + endY) / 2;
      
      if (highlight) {
        ctx.fillStyle = strokeColor;
        ctx.fillRect(midX - 14, midY - 10, 28, 20);
        ctx.strokeStyle = 'rgba(0,0,0,0.08)';
        ctx.lineWidth = 1;
        ctx.strokeRect(midX - 14, midY - 10, 28, 20);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(edge.weight.toString(), midX, midY);
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(midX - 12, midY - 8, 24, 16);
        ctx.strokeStyle = '#d1d5db';
        ctx.lineWidth = 1;
        ctx.strokeRect(midX - 12, midY - 8, 24, 16);
        ctx.fillStyle = '#2d3748';
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(edge.weight.toString(), midX, midY);
      }
    },
    [drawArrowHead]
  );

  const drawHighlightedPath = useCallback(
    (ctx: CanvasRenderingContext2D, path: number[]) => {
      if (path.length < 2) return;

      ctx.save();
      ctx.strokeStyle = 'rgba(16,185,129,0.9)';
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.shadowColor = 'rgba(16,185,129,0.7)';
      ctx.shadowBlur = 20;

      for (let i = 0; i < path.length - 1; i++) {
        const fromPos = nodePositions.get(path[i]);
        const toPos = nodePositions.get(path[i + 1]);
        if (fromPos && toPos) {
          ctx.beginPath();
          ctx.moveTo(fromPos.x, fromPos.y);
          ctx.lineTo(toPos.x, toPos.y);
          ctx.stroke();
        }
      }

      ctx.restore();
    },
    [nodePositions]
  );

  const drawCustomPath = useCallback(
    (ctx: CanvasRenderingContext2D, path: number[], color: string = '#FF6B6B', lineWidth: number = 8) => {
      if (path.length < 2) return;

      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.shadowColor = color;
      ctx.shadowBlur = 15;

      for (let i = 0; i < path.length - 1; i++) {
        const fromPos = nodePositions.get(path[i]);
        const toPos = nodePositions.get(path[i + 1]);
        if (fromPos && toPos) {
          ctx.beginPath();
          ctx.moveTo(fromPos.x, fromPos.y);
          ctx.lineTo(toPos.x, toPos.y);
          ctx.stroke();
        }
      }

      ctx.restore();

      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      for (let i = 0; i < path.length - 1; i++) {
        const fromPos = nodePositions.get(path[i]);
        const toPos = nodePositions.get(path[i + 1]);
        if (fromPos && toPos) {
          ctx.beginPath();
          ctx.moveTo(fromPos.x, fromPos.y);
          ctx.lineTo(toPos.x, toPos.y);
          ctx.stroke();
          const connecting = state.edges.find(e => (e.from_node === path[i] && e.to_node === path[i+1]) || (e.from_node === path[i+1] && e.to_node === path[i]));
          if (connecting) {
            const ang = Math.atan2(toPos.y - fromPos.y, toPos.x - fromPos.x);
            if (connecting.directed && connecting.from_node === path[i] && connecting.to_node === path[i+1]) {
              drawArrowHead(ctx, toPos.x - NODE_RADIUS * Math.cos(ang), toPos.y - NODE_RADIUS * Math.sin(ang), ang, '#ef4444');
            } else if (connecting.directed && connecting.from_node === path[i+1] && connecting.to_node === path[i]) {
              drawArrowHead(ctx, fromPos.x + NODE_RADIUS * Math.cos(ang), fromPos.y + NODE_RADIUS * Math.sin(ang), ang + Math.PI, '#ef4444');
            } else {
              drawArrowHead(ctx, toPos.x - NODE_RADIUS * Math.cos(ang), toPos.y - NODE_RADIUS * Math.sin(ang), ang, '#ef4444');
              drawArrowHead(ctx, fromPos.x + NODE_RADIUS * Math.cos(ang), fromPos.y + NODE_RADIUS * Math.sin(ang), ang + Math.PI, '#ef4444');
            }
          }
        }
      }

      path.forEach(nodeId => {
        const pos = nodePositions.get(nodeId);
        const node = state.nodes.find(n => n.id === nodeId);
        if (pos && node) {
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, NODE_RADIUS + 8, 0, 2 * Math.PI);
          ctx.fillStyle = 'rgba(16,185,129,0.15)';
          ctx.fill();

          ctx.beginPath();
          ctx.arc(pos.x, pos.y, NODE_RADIUS + 4, 0, 2 * Math.PI);
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 3;
          ctx.stroke();
        }
      });
    },
    [nodePositions, state.edges, state.nodes, drawArrowHead]
  );
  // Dibujar todo en el canvas: aristas (fondo), nodos, aristas resaltadas y camino final
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear and background
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, '#f8fafc');
    gradient.addColorStop(1, '#e6eef8');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Obtener paso actual si hay resultado
    const currentStepData = state.dijkstraResult?.steps?.[state.currentStep];
    const currentDistancesByName = currentStepData?.distances || {};

    // name -> id map
    const nameToNodeId = new Map<string, number>();
    state.nodes.forEach(n => nameToNodeId.set(n.name, n.id));

    // visited ids
    const visitedNodeIds = new Set<number>();
    if (currentStepData?.visited) {
      (currentStepData.visited as string[]).forEach(name => {
        const id = nameToNodeId.get(name);
        if (id !== undefined) visitedNodeIds.add(id);
      });
    }

    // distances by id
    const currentDistancesById: { [id: number]: number | null } = {};
    Object.entries(currentDistancesByName).forEach(([name, val]) => {
      const id = nameToNodeId.get(name);
      if (id !== undefined) {
        currentDistancesById[id] = (val === null ? null : Number(val));
      }
    });

    // calcular aristas a resaltar (omitir si el resultado indica que NO hay camino)
    const noPath = state.dijkstraResult && state.dijkstraResult.success === false;
    const edgesToHighlight = new Set<number>();
    if (!noPath && currentStepData && currentStepData.previous) {
      // Si hay un nodo destino seleccionado, reconstruir la cadena de predecesores desde ese nodo
      // y resaltar solo las aristas de la cadena (prev -> node)
      if (selectedEndNode) {
        const endNode = state.nodes.find(n => n.id === selectedEndNode);
        const endName = endNode?.name;
        if (endName) {
          // seguir previous: nodeName -> prevName
          let nodeName: string | undefined = endName;
          const prevMap = currentStepData.previous as { [name: string]: string | null };
          const visitedNames = new Set<string>();
          while (nodeName && !visitedNames.has(nodeName)) {
            visitedNames.add(nodeName);
            const prevName = prevMap[nodeName];
            if (!prevName) break;
            const fromId = nameToNodeId.get(prevName as string);
            const toId = nameToNodeId.get(nodeName);
            if (fromId !== undefined && toId !== undefined) {
              const found = state.edges.find(e => (e.from_node === fromId && e.to_node === toId) || (!e.directed && e.from_node === toId && e.to_node === fromId));
              if (found) edgesToHighlight.add(found.id);
            }
            nodeName = prevName as string;
          }
        }
      } else {
        // mostrar el árbol de predecesores actual: para cada nodo con previous, resaltar la arista prev->node
        Object.entries(currentStepData.previous).forEach(([nodeName, prevName]) => {
          if (!prevName) return;
          const toId = nameToNodeId.get(nodeName);
          const fromId = nameToNodeId.get(prevName as string);
          if (fromId !== undefined && toId !== undefined) {
            const found = state.edges.find(e => (e.from_node === fromId && e.to_node === toId) || (!e.directed && e.from_node === toId && e.to_node === fromId));
            if (found) edgesToHighlight.add(found.id);
          }
        });
      }
    }

    // intentar detectar relajación por descripción (si hay camino)
    if (!noPath && currentStepData && currentStepData.description) {
      const desc: string = currentStepData.description as string;
      const m = desc.match(/Actualizando distancia a (.*?):/i);
      if (m && m[1]) {
        const targetName = m[1].trim();
        const targetId = nameToNodeId.get(targetName);
        const currentName = currentStepData.current_node as string;
        const currentId = nameToNodeId.get(currentName);
        if (currentId !== undefined && targetId !== undefined) {
          const found2 = state.edges.find(e => (e.from_node === currentId && e.to_node === targetId) || (!e.directed && e.from_node === targetId && e.to_node === currentId));
          if (found2) edgesToHighlight.add(found2.id);
        }
      }
    }

    // (debug logs removed for cleaner console)

    // Dibujar aristas no resaltadas
    const highlightedEdgeEntries: { edge: Edge; fromPos: Position; toPos: Position }[] = [];
    state.edges.forEach(edge => {
      const fromPos = nodePositions.get(edge.from_node);
      const toPos = nodePositions.get(edge.to_node);
      if (fromPos && toPos) {
        const highlightEdge = edgesToHighlight.has(edge.id);
  // compact: no logs por arista en producción
        if (highlightEdge) highlightedEdgeEntries.push({ edge, fromPos, toPos });
        else drawEdge(ctx, fromPos, toPos, edge, currentStepData, false);
      }
    });

    // Dibujar nodos
    state.nodes.forEach(node => {
      const position = nodePositions.get(node.id);
      if (position) drawNode(ctx, node, position, visitedNodeIds, currentDistancesById as any);
    });

    // Dibujar aristas resaltadas encima; si los resaltados están suprimidos
    // dibujarlas en estilo normal para que no desaparezcan del canvas.
    highlightedEdgeEntries.forEach(({ edge, fromPos, toPos }) => {
      if (!suppressHighlights) {
        drawEdge(ctx, fromPos, toPos, edge, currentStepData, true);
      } else {
        // Dibujar como arista normal (no resaltada) cuando se suprimen los resaltados
        drawEdge(ctx, fromPos, toPos, edge, currentStepData, false);
      }
    });

    // Dibujar camino final si está disponible (si no están suprimidos los resaltados)
    if (!suppressHighlights && state.dijkstraResult) {
      if (state.dijkstraResult.success && state.dijkstraResult?.shortest_path && state.currentStep === (state.dijkstraResult.steps?.length || 1) - 1) {
        const pathIds = state.dijkstraResult.shortest_path.map((id: any) => parseInt(id));
        drawHighlightedPath(ctx, pathIds);
      }
    }

    // Dibujar camino seleccionado de todos los caminos si está disponible
    if (!suppressHighlights && showAllPaths && allPathsResult && selectedPathIndex !== null && allPathsResult.all_paths[selectedPathIndex]) {
      const selectedPath = allPathsResult.all_paths[selectedPathIndex];
      
      // Convertir nombres de nodos a IDs
      const pathNodeIds: number[] = [];
      selectedPath.path.forEach(nodeName => {
        const nodeId = nameToNodeId.get(nodeName);
        if (nodeId !== undefined) {
          pathNodeIds.push(nodeId);
        }
      });
      
      // Dibujar el camino seleccionado con un color diferente
      drawCustomPath(ctx, pathNodeIds, '#FF6B6B'); // Color rojo para diferenciarlo
    }
  }, [nodePositions, state.edges, state.nodes, state.dijkstraResult, state.currentStep, selectedEndNode, drawEdge, drawNode, drawHighlightedPath, showAllPaths, allPathsResult, selectedPathIndex, drawCustomPath, suppressHighlights]);

  // ...existing draw helpers are defined as stable useCallback hooks above...

  // Manejo de eventos del mouse para drag & drop
  const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Buscar nodo clickeado
    nodePositions.forEach((position, nodeId) => {
      const distance = Math.sqrt((x - position.x) ** 2 + (y - position.y) ** 2);
      if (distance <= NODE_RADIUS) {
        setDraggedNode(nodeId);
        setDragOffset({ x: x - position.x, y: y - position.y });
        return;
      }
    });
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (draggedNode === null) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const newX = Math.max(MARGIN, Math.min(CANVAS_WIDTH - MARGIN, x - dragOffset.x));
    const newY = Math.max(MARGIN, Math.min(CANVAS_HEIGHT - MARGIN, y - dragOffset.y));

    setNodePositions(prev => new Map(prev.set(draggedNode, { x: newX, y: newY })));
  };

  const handleMouseUp = () => {
    setDraggedNode(null);
    setDragOffset({ x: 0, y: 0 });
    setPositionsDirty(true);
  };

  // Ejecutar algoritmo
  const runDijkstra = async () => {
    if (!selectedStartNode || !selectedEndNode) {
      alert('Por favor selecciona nodos de inicio y fin');
      return;
    }

  setIsRunning(true);
  // asegúrate de que los resaltados estén permitidos cuando ejecutas Dijkstra
  setSuppressHighlights(false);
    try {
      const res = await actions.runDijkstra(selectedStartNode, selectedEndNode, showSteps);
      if (showSteps && state.dijkstraResult?.steps) {
        setIsPlaying(true);
        playSteps();
      }
      if (res && res.success === false) {
        showToast('No existe un camino entre los nodos seleccionados.');
      }
    } catch (error) {
      console.error('Error ejecutando Dijkstra:', error);
    } finally {
      setIsRunning(false);
    }
  };

  // Mostrar toast si el resultado indica no-path (efecto separado para que aparezca inmediatamente)
  useEffect(() => {
    if (state.dijkstraResult && state.dijkstraResult.success === false) {
      showToast('No existe un camino entre los nodos seleccionados.', 4000);
    }
  }, [state.dijkstraResult]);

  // Buscar todos los caminos entre nodos
  const findAllPaths = async () => {
    if (!selectedStartNode || !selectedEndNode) {
      alert('Por favor selecciona nodos de inicio y fin');
      return;
    }

  setIsSearchingPaths(true);
    setAllPathsResult(null);
    setSelectedPathIndex(null);
  // Al buscar caminos, permitimos ver resaltados de los resultados
  setSuppressHighlights(false);
    
    try {
      const result = await actions.findAllPaths(
        selectedStartNode, 
        selectedEndNode, 
        100, // max_paths
        20   // max_depth
      );
      
      setAllPathsResult(result);
      setShowAllPaths(true);
      
      if (result.success) {
        showToast(`Se encontraron ${result.paths_count} caminos entre los nodos`);
      } else {
        showToast(result.message || 'No se encontraron caminos');
      }
    } catch (error) {
      console.error('Error buscando todos los caminos:', error);
      showToast('Error al buscar caminos');
    } finally {
      setIsSearchingPaths(false);
    }
  };

  // Seleccionar un camino específico para resaltar
  const selectPath = (pathIndex: number) => {
    setSelectedPathIndex(pathIndex);
    // El canvas se re-renderizará automáticamente por el useEffect cuando cambie selectedPathIndex
  };

  // Reproducir pasos automáticamente
  const playSteps = () => {
    if (!state.dijkstraResult?.steps) return;
    
    let currentStep = 0;
    const interval = setInterval(() => {
      if (!state.dijkstraResult?.steps || currentStep >= state.dijkstraResult.steps.length - 1) {
        clearInterval(interval);
        setIsPlaying(false);
        return;
      }
      
      currentStep++;
      actions.setCurrentStep(currentStep);
    }, playSpeed);
  };

  // Navegación manual de pasos
  const goToStep = (step: number) => {
    if (state.dijkstraResult?.steps) {
      const maxStep = state.dijkstraResult.steps.length - 1;
      const newStep = Math.max(0, Math.min(maxStep, step));
      actions.setCurrentStep(newStep);
    }
  };

  const resetVisualization = () => {
    // Solo suprimir visualmente los resaltados sin borrar resultados ni cambiar selecciones
    setSuppressHighlights(true);
    setIsPlaying(false);

    // Forzar redibujo del canvas (sin alterar los datos)
    setNodePositions(prev => new Map(prev));
  };

  // Reactivar resaltados y auto-seleccionar camino óptimo si existe
  const handleShowHighlights = () => {
    setSuppressHighlights(false);

    // Si hay resultados de "todos los caminos", seleccionar el primero (óptimo)
    if (allPathsResult && allPathsResult.success && allPathsResult.all_paths && allPathsResult.all_paths.length > 0) {
      setShowAllPaths(true);
      setSelectedPathIndex(0);
      return;
    }

    // Si no hay paths pero existe resultado de Dijkstra válido, avanzar al último paso
    if (state.dijkstraResult && state.dijkstraResult.success) {
      const last = (state.dijkstraResult.steps && state.dijkstraResult.steps.length > 0) ? state.dijkstraResult.steps.length - 1 : 0;
      actions.setCurrentStep(last);
    }
  };

  const saveLayout = async () => {
    if (!state.activeGraph) return;
    const positionsArray: { id: number; x_position?: number; y_position?: number }[] = [];

    nodePositions.forEach((pos, id) => {
      // Reverse the transformation applied when reading saved positions
      // Note: this is approximate and depends on how positions were scaled
      const modelX = Math.round((pos.x - 100) / 2);
      const modelY = Math.round((pos.y - 100) / 2);
      positionsArray.push({ id, x_position: modelX, y_position: modelY });
    });

    try {
      await actions.saveNodePositions(positionsArray);
      setPositionsDirty(false);
      // reload visual positions from state.nodes after backend confirms
      showToast('Layout guardado correctamente.');
    } catch (error) {
      console.error('Error saving layout:', error);
      alert('Error guardando posiciones. Revisa la consola.');
    }
  };

  if (!state.activeGraph) {
    return (
      <div className="algorithm-visualizer">
        <div className="empty-state">
          <h2>No hay grafo activo</h2>
          <p>Selecciona un grafo activo desde el Dashboard para usar el visualizador.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="algorithm-visualizer">
      <div className="visualizer-header">
        <h1>Visualizador de Algoritmo de Dijkstra</h1>
        <p>Grafo activo: <strong>{state.activeGraph.name}</strong></p>
      </div>

      <div className="visualizer-content">
        <div className="canvas-container">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            className="graph-canvas"
          />
          {state.dijkstraResult && state.dijkstraResult.success === false && (
            <div className="no-path-banner">No existe un camino entre los nodos seleccionados.</div>
          )}
          
          <div className="canvas-legend">
            <div className="legend-item">
              <div className="legend-color source"></div>
              <span>Nodo fuente</span>
            </div>
            <div className="legend-item">
              <div className="legend-color start"></div>
              <span>Inicio</span>
            </div>
            <div className="legend-item">
              <div className="legend-color end"></div>
              <span>Destino</span>
            </div>
            <div className="legend-item">
              <div className="legend-color visited"></div>
              <span>Visitado</span>
            </div>
            <div className="legend-item">
              <div className="legend-color path"></div>
              <span>Camino óptimo</span>
            </div>
          </div>
        </div>

        <div className="controls-panel">
          <div className="control-section">
            <h3>Configuración</h3>
            
            <div className="node-selectors">
              <div className="selector-group">
                <label>Nodo de inicio:</label>
                <select 
                  value={selectedStartNode || ''} 
                  onChange={(e) => setSelectedStartNode(Number(e.target.value) || null)}
                  disabled={isRunning || isPlaying}
                >
                  <option value="">Seleccionar...</option>
                  {state.nodes.map(node => (
                    <option key={node.id} value={node.id}>{node.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="selector-group">
                <label>Nodo destino:</label>
                <select 
                  value={selectedEndNode || ''} 
                  onChange={(e) => setSelectedEndNode(Number(e.target.value) || null)}
                  disabled={isRunning || isPlaying}
                >
                  <option value="">Seleccionar...</option>
                  {state.nodes.map(node => (
                    <option key={node.id} value={node.id}>{node.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="algorithm-options">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={showSteps}
                  onChange={(e) => setShowSteps(e.target.checked)}
                  disabled={isRunning || isPlaying}
                />
                Mostrar pasos del algoritmo
              </label>
              
              <div className="speed-control">
                <label>Velocidad de reproducción:</label>
                <input
                  type="range"
                  min="100"
                  max="2000"
                  step="100"
                  value={playSpeed}
                  onChange={(e) => setPlaySpeed(Number(e.target.value))}
                  disabled={isRunning || isPlaying}
                />
                <span>{(2100 - playSpeed) / 200}x</span>
              </div>
            </div>

            <div className="action-buttons">
              <button 
                className="btn btn-primary"
                onClick={runDijkstra}
                disabled={isRunning || isPlaying || !selectedStartNode || !selectedEndNode}
              >
                {isRunning ? 'Ejecutando...' : 'Ejecutar Dijkstra'}
              </button>

              <button 
                className="btn btn-accent"
                onClick={findAllPaths}
                disabled={isRunning || isPlaying || isSearchingPaths || !selectedStartNode || !selectedEndNode}
              >
                {isSearchingPaths ? 'Buscando...' : 'Encontrar Todos los Caminos'}
              </button>
              
              <button 
                className="btn btn-secondary"
                onClick={resetVisualization}
                disabled={isRunning || isPlaying}
              >
                Ocultar resaltados
              </button>
              
              <button
                className="btn btn-outline"
                onClick={handleShowHighlights}
                disabled={isRunning || isPlaying || (!state.dijkstraResult && !allPathsResult)}
                title={(!state.dijkstraResult && !allPathsResult) ? 'No hay resultados para mostrar' : 'Reactivar resaltados'}
              >
                Mostrar resaltados
              </button>
                <button
                  className="btn btn-accent"
                  onClick={saveLayout}
                  disabled={!positionsDirty}
                  title={positionsDirty ? 'Guardar posiciones en la base de datos' : 'No hay cambios pendientes'}
                >
                  {positionsDirty ? 'Guardar layout' : 'Sin cambios'}
                </button>
            </div>
          </div>

          {state.dijkstraResult && (
            <div className="control-section">
              <h3>Resultado</h3>
              
              <div className="result-info">
                <p><strong>Distancia total:</strong> {state.dijkstraResult.total_distance}</p>
                <p><strong>Camino encontrado:</strong> {
                  state.dijkstraResult.shortest_path?.map(nodeId => {
                    const node = state.nodes.find(n => n.id.toString() === nodeId);
                    return node?.name || nodeId;
                  }).join(' → ')
                }</p>
                {!state.dijkstraResult.success && (
                  <p className="no-path-message">No existe un camino entre los nodos seleccionados.</p>
                )}
                {state.dijkstraResult.steps && (
                  <p><strong>Pasos del algoritmo:</strong> {state.dijkstraResult.steps.length}</p>
                )}
              </div>

              {state.dijkstraResult.steps && (
                <div className="step-controls">
                  <div className="step-navigation">
                    <button 
                      className="btn btn-small"
                      onClick={() => goToStep(0)}
                      disabled={isPlaying || state.currentStep === 0}
                    >
                      ⏮️ Inicio
                    </button>
                    <button 
                      className="btn btn-small"
                      onClick={() => goToStep(state.currentStep - 1)}
                      disabled={isPlaying || state.currentStep === 0}
                    >
                      ⏪ Anterior
                    </button>
                    <button 
                      className="btn btn-small"
                      onClick={() => goToStep(state.currentStep + 1)}
                      disabled={isPlaying || state.currentStep === state.dijkstraResult.steps!.length - 1}
                    >
                      ⏩ Siguiente
                    </button>
                    <button 
                      className="btn btn-small"
                      onClick={() => goToStep((state.dijkstraResult?.steps?.length || 1) - 1)}
                      disabled={isPlaying || state.currentStep === (state.dijkstraResult?.steps?.length || 1) - 1}
                    >
                      ⏭️ Final
                    </button>
                  </div>
                  
                  <div className="step-info">
                    <span>Paso {state.currentStep + 1} de {state.dijkstraResult.steps.length}</span>
                    <input
                      type="range"
                      min="0"
                      max={state.dijkstraResult.steps.length - 1}
                      value={state.currentStep}
                      onChange={(e) => goToStep(Number(e.target.value))}
                      disabled={isPlaying}
                      className="step-slider"
                    />
                  </div>

                  {state.dijkstraResult.steps[state.currentStep] && (
                    <div className="current-step-details">
                      <h4>Detalles del paso actual:</h4>
                      <p>{state.dijkstraResult.steps[state.currentStep].description}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Panel de todos los caminos */}
          {showAllPaths && allPathsResult && (
            <div className="all-paths-panel">
              <div className="panel-header">
                <h3>Todos los Caminos Encontrados</h3>
                <button 
                  className="btn btn-small btn-close"
                  onClick={() => {
                    setShowAllPaths(false);
                    setSelectedPathIndex(null);
                  }}
                >
                  ✕
                </button>
              </div>
              
              {allPathsResult.success ? (
                <div className="paths-content">
                  <div className="paths-summary">
                    <p>
                      <strong>Caminos encontrados:</strong> {allPathsResult.paths_count} 
                      {allPathsResult.search_limits.paths_limited && ` (limitado a ${allPathsResult.search_limits.max_paths})`}
                    </p>
                    <p><strong>Tiempo de ejecución:</strong> {(allPathsResult.execution_time * 1000).toFixed(2)}ms</p>
                    {allPathsResult.comparison && (
                      <div className="comparison-info">
                        <p><strong>Camino más corto (Dijkstra):</strong> {allPathsResult.comparison.dijkstra_distance?.toFixed(2) || 'N/A'}</p>
                        <p><strong>Caminos óptimos encontrados:</strong> {allPathsResult.comparison.paths_with_optimal_distance}</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="paths-list">
                    <h4>Selecciona un camino para visualizar:</h4>
                    {allPathsResult.all_paths.map((pathInfo, index) => (
                      <div 
                        key={index}
                        className={`path-item ${selectedPathIndex === index ? 'selected' : ''}`}
                        onClick={() => selectPath(index)}
                      >
                        <div className="path-header">
                          <span className="path-number">#{index + 1}</span>
                          <span className="path-distance">Distancia: {pathInfo.total_distance.toFixed(2)}</span>
                          <span className="path-length">{pathInfo.nodes_count} nodos</span>
                        </div>
                        <div className="path-route">
                          {pathInfo.path.join(' → ')}
                        </div>
                        {allPathsResult.comparison && 
                         Math.abs(pathInfo.total_distance - (allPathsResult.comparison.dijkstra_distance || 0)) < 1e-10 && (
                          <div className="optimal-badge">
                            ⭐ Óptimo
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="no-paths-message">
                  <p>{allPathsResult.message}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {toastMessage && (
        <div className="toast-message">{toastMessage}</div>
      )}
    </div>
  );
};

export default AlgorithmVisualizer;
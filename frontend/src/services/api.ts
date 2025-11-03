// Servicio API para comunicarse con el backend Django
import axios from 'axios';
import {
  Graph,
  GraphSummary,
  Node,
  Edge,
  DijkstraRequest,
  DijkstraResult,
  CreateGraphForm,
  CreateNodeForm,
  CreateEdgeForm,
  AllPathsRequest,
  AllPathsResult,
  PathsComparisonResult
} from '../types';

// Configuración base de Axios
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';

const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Interceptor para manejo de errores
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

// API de Grafos
export const graphsApi = {
  // Obtener todos los grafos
  getAll: async (): Promise<GraphSummary[]> => {
    const response = await apiClient.get('/graphs/');
    return response.data.results || response.data;
  },

  // Obtener grafo por ID con detalles completos
  getById: async (id: number): Promise<Graph> => {
    const response = await apiClient.get(`/graphs/${id}/`);
    return response.data;
  },

  // Obtener grafo activo
  getActive: async (): Promise<Graph> => {
    const response = await apiClient.get('/graphs/active/');
    return response.data;
  },

  // Crear nuevo grafo
  create: async (data: CreateGraphForm): Promise<GraphSummary> => {
    const response = await apiClient.post('/graphs/', data);
    return response.data;
  },

  // Actualizar grafo
  update: async (id: number, data: Partial<CreateGraphForm>): Promise<GraphSummary> => {
    const response = await apiClient.patch(`/graphs/${id}/`, data);
    return response.data;
  },

  // Eliminar grafo
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/graphs/${id}/`);
  },

  // Activar grafo
  activate: async (id: number): Promise<{ message: string; graph: GraphSummary }> => {
    const response = await apiClient.post(`/graphs/${id}/activate/`);
    return response.data;
  },
};

// API de Nodos
export const nodesApi = {
  // Obtener nodos de un grafo
  getByGraph: async (graphId: number): Promise<Node[]> => {
    const response = await apiClient.get('/nodes/', {
      params: { graph_id: graphId }
    });
    return response.data.results || response.data;
  },

  // Crear nodo
  create: async (data: CreateNodeForm & { graph_id: number }): Promise<Node> => {
    const response = await apiClient.post('/nodes/', data);
    return response.data;
  },

  // Actualizar nodo
  update: async (id: number, data: Partial<CreateNodeForm>): Promise<Node> => {
    const response = await apiClient.patch(`/nodes/${id}/`, data);
    return response.data;
  },

  // Eliminar nodo
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/nodes/${id}/`);
  },

  // Establecer como nodo fuente
  setSource: async (id: number): Promise<{ message: string; node: Node }> => {
    const response = await apiClient.post(`/nodes/${id}/set_source/`);
    return response.data;
  },
  
  // Actualizar posiciones en bloque
  bulkUpdatePositions: async (positions: { id: number; x_position?: number; y_position?: number }[]) => {
    const response = await apiClient.post('/nodes/bulk_update_positions/', { positions });
    return response.data;
  },
};

// API de Aristas
export const edgesApi = {
  // Obtener aristas de un grafo
  getByGraph: async (graphId: number): Promise<Edge[]> => {
    const response = await apiClient.get('/edges/', {
      params: { graph_id: graphId }
    });
    return response.data.results || response.data;
  },

  // Crear arista
  create: async (data: CreateEdgeForm): Promise<Edge> => {
    const response = await apiClient.post('/edges/', data);
    return response.data;
  },

  // Actualizar arista
  update: async (id: number, data: Partial<CreateEdgeForm>): Promise<Edge> => {
    const response = await apiClient.patch(`/edges/${id}/`, data);
    return response.data;
  },

  // Eliminar arista
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/edges/${id}/`);
  },
};

// API de Dijkstra
export const dijkstraApi = {
  // Ejecutar algoritmo de Dijkstra
  calculate: async (data: DijkstraRequest): Promise<DijkstraResult> => {
    const response = await apiClient.post('/dijkstra/calculate/', data);
    return response.data;
  },

  // Validar grafo para Dijkstra
  validateGraph: async (graphId: number): Promise<{
    graph_id: number;
    graph_name: string;
    is_valid: boolean;
    errors: string[];
    nodes_count: number;
    edges_count: number;
  }> => {
    const response = await apiClient.post('/dijkstra/validate_graph/', {
      graph_id: graphId
    });
    return response.data;
  },
};

// Función helper para manejo de errores
export const handleApiError = (error: any): string => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.response?.data?.error) {
    return error.response.data.error;
  }
  if (error.message) {
    return error.message;
  }
  return 'Ha ocurrido un error inesperado';
};

// Función helper para verificar conectividad
export const checkApiConnection = async (): Promise<boolean> => {
  try {
    await apiClient.get('/graphs/');
    return true;
  } catch (error) {
    console.error('API connection failed:', error);
    return false;
  }
};

// API de todos los caminos
export const allPathsApi = {
  // Encontrar todos los caminos entre dos nodos
  findAllPaths: async (data: AllPathsRequest): Promise<AllPathsResult> => {
    const response = await apiClient.post('/all-paths/find_paths/', data);
    return response.data;
  },

  // Comparar todos los caminos con Dijkstra
  compareWithDijkstra: async (data: AllPathsRequest): Promise<PathsComparisonResult> => {
    const response = await apiClient.post('/all-paths/compare_with_dijkstra/', data);
    return response.data;
  },
};

export default {
  graphs: graphsApi,
  nodes: nodesApi,
  edges: edgesApi,
  dijkstra: dijkstraApi,
  allPaths: allPathsApi,
  handleError: handleApiError,
  checkConnection: checkApiConnection,
};
// Tipos TypeScript para la aplicación de Dijkstra
// Coinciden con los modelos del backend Django

export interface Node {
  id: number;
  name: string;
  is_source: boolean;
  x_position?: number;
  y_position?: number;
  created_at: string;
  connections_count: number;
}

export interface Edge {
  id: number;
  from_node: number;
  to_node: number;
  from_node_name: string;
  to_node_name: string;
  weight: number;
  directed: boolean;
  created_at: string;
}

export interface Graph {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  nodes: Node[];
  edges: Edge[];
  nodes_count: number;
  edges_count: number;
  source_node?: Node;
}

export interface GraphSummary {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  nodes_count: number;
  edges_count: number;
  source_node_name?: string;
}

export interface DijkstraStep {
  current_node: string;
  distances: { [nodeId: string]: number };
  previous: { [nodeId: string]: string | null };
  visited: string[];
  unvisited: string[];
  description: string;
}

export interface DijkstraResult {
  start_node: string;
  end_node: string;
  shortest_path: string[];
  total_distance: number;
  steps: DijkstraStep[];
  success: boolean;
  message: string;
  execution_time?: number;
}

export interface DijkstraRequest {
  graph_id: number;
  start_node_id: number;
  end_node_id: number;
  include_steps?: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message: string;
  error?: string;
}

// Tipos para formularios
export interface CreateGraphForm {
  name: string;
  description?: string;
}

export interface CreateNodeForm {
  name: string;
  x_position?: number;
  y_position?: number;
  is_source?: boolean;
}

export interface CreateEdgeForm {
  from_node: number;
  to_node: number;
  weight: number;
  directed?: boolean;
}

// Tipos para visualización
export interface GraphVisualizationData {
  nodes: Array<{
    id: string;
    name: string;
    x: number;
    y: number;
    isSource: boolean;
    isInPath?: boolean;
    isVisited?: boolean;
    distance?: number;
  }>;
  edges: Array<{
    id: string;
    from: string;
    to: string;
    weight: number;
    isInPath?: boolean;
    isVisited?: boolean;
  }>;
}

export interface AlgorithmStep {
  stepNumber: number;
  description: string;
  currentNode: string;
  visited: string[];
  distances: { [nodeId: string]: number };
  graphData: GraphVisualizationData;
}

// Tipos para búsqueda de todos los caminos
export interface AllPathsRequest {
  graph_id: number;
  start_node_id: number;
  end_node_id: number;
  max_paths?: number;
  max_depth?: number;
}

export interface PathInfo {
  path: string[];
  path_ids: string[];
  total_distance: number;
  nodes_count: number;
}

export interface AllPathsComparison {
  dijkstra_distance: number | null;
  dijkstra_path: string[];
  all_paths_shortest_distance: number | null;
  paths_with_optimal_distance: number;
}

export interface SearchLimits {
  max_paths: number;
  max_depth: number;
  paths_limited: boolean;
}

export interface AllPathsResult {
  start_node: string;
  end_node: string;
  all_paths: PathInfo[];
  shortest_path: string[];
  paths_count: number;
  success: boolean;
  message: string;
  comparison: AllPathsComparison | null;
  execution_time: number;
  search_limits: SearchLimits;
}

export interface PathsComparisonResult {
  all_paths_result: AllPathsResult;
  dijkstra_result: DijkstraResult;
  comparison_summary: {
    total_paths_found: number;
    dijkstra_optimal: boolean;
    paths_analysis: {
      shortest_distance: number | null;
      longest_distance: number | null;
      average_distance: number | null;
      optimal_paths_count: number;
      dijkstra_confirmed_optimal: boolean;
      distance_variance: number;
    };
  };
}
"""
Implementación del algoritmo de Dijkstra
Adaptado del proyecto Django original para la API REST
"""

import math
import time
from typing import Dict, List, Tuple, Optional
from .models import Graph, Node, Edge


def build_graph_dict(graph: Graph) -> Dict[str, List[Tuple[str, float]]]:
    """
    Construye un diccionario de adyacencia desde el modelo Graph
    Retorna: {nodo_id: [(nodo_destino_id, peso), ...]}
    """
    graph_dict = {}
    
    # Inicializar todos los nodos
    for node in graph.nodes.all():
        graph_dict[str(node.id)] = []
    
    # Agregar las aristas
    for edge in graph.edges.all():
        from_id = str(edge.from_node.id)
        to_id = str(edge.to_node.id)
        weight = float(edge.weight)
        
        # Agregar arista dirigida
        if from_id in graph_dict:
            graph_dict[from_id].append((to_id, weight))
        
        # Si la arista no es dirigida, agregar la arista inversa
        if not edge.directed:
            if to_id in graph_dict:
                graph_dict[to_id].append((from_id, weight))
    
    return graph_dict


def dijkstra_algorithm(
    graph: Graph, 
    start_node: Node, 
    end_node: Node, 
    include_steps: bool = False
) -> Dict:
    """
    Implementa el algoritmo de Dijkstra
    Retorna un diccionario con el resultado completo
    """
    start_time = time.time()
    
    # Construir el grafo como diccionario de adyacencia
    graph_dict = build_graph_dict(graph)
    
    start_id = str(start_node.id)
    end_id = str(end_node.id)
    
    # Verificar que los nodos existen en el grafo
    if start_id not in graph_dict or end_id not in graph_dict:
        return {
            'start_node': start_node.name,
            'end_node': end_node.name,
            'shortest_path': [],
            'total_distance': math.inf,
            'steps': [],
            'success': False,
            'message': 'Nodos no encontrados en el grafo',
            'execution_time': time.time() - start_time
        }
    
    # Inicialización del algoritmo
    distances = {node_id: math.inf for node_id in graph_dict}
    previous = {node_id: None for node_id in graph_dict}
    distances[start_id] = 0.0
    visited = set()
    steps = []
    
    # Crear mapeo de IDs a nombres para mejor visualización
    id_to_name = {str(node.id): node.name for node in graph.nodes.all()}
    
    def add_step(current_node_id: str, description: str):
        """Agregar un paso al registro si se requiere"""
        if include_steps:
            steps.append({
                'current_node': id_to_name.get(current_node_id, current_node_id),
                'distances': {
                    id_to_name.get(nid, nid): dist 
                    for nid, dist in distances.items()
                },
                'previous': {
                    id_to_name.get(nid, nid): id_to_name.get(prev, prev) if prev else None
                    for nid, prev in previous.items()
                },
                'visited': [id_to_name.get(nid, nid) for nid in visited],
                'unvisited': [
                    id_to_name.get(nid, nid) 
                    for nid in graph_dict.keys() if nid not in visited
                ],
                'description': description
            })
    
    add_step(start_id, f"Iniciando algoritmo desde el nodo {start_node.name}")
    
    # Algoritmo principal de Dijkstra
    while len(visited) < len(graph_dict):
        # Encontrar el nodo no visitado con la menor distancia
        current_node = None
        min_distance = math.inf
        
        for node_id in graph_dict:
            if node_id not in visited and distances[node_id] < min_distance:
                current_node = node_id
                min_distance = distances[node_id]
        
        # Si no hay nodo alcanzable, terminar
        if current_node is None or distances[current_node] == math.inf:
            break
        
        # Marcar como visitado
        visited.add(current_node)
        current_name = id_to_name.get(current_node, current_node)
        
        add_step(
            current_node, 
            f"Visitando nodo {current_name} con distancia {distances[current_node]}"
        )
        
        # Si llegamos al nodo destino, podemos terminar
        if current_node == end_id:
            add_step(current_node, f"¡Llegamos al nodo destino {end_node.name}!")
            break
        
        # Actualizar distancias de nodos vecinos
        for neighbor_id, weight in graph_dict[current_node]:
            if neighbor_id in visited:
                continue
            
            new_distance = distances[current_node] + weight
            
            if new_distance < distances[neighbor_id]:
                old_distance = distances[neighbor_id]
                distances[neighbor_id] = new_distance
                previous[neighbor_id] = current_node
                
                neighbor_name = id_to_name.get(neighbor_id, neighbor_id)
                old_dist_str = "infinito" if old_distance == math.inf else str(old_distance)
                
                add_step(
                    current_node,
                    f"Actualizando distancia a {neighbor_name}: {new_distance} "
                    f"(anterior: {old_dist_str})"
                )
    
    # Reconstruir el camino más corto
    path_ids = []
    current = end_id
    
    # Si no hay camino al nodo final
    if previous[end_id] is None and start_id != end_id:
        path_ids = []
    else:
        # Reconstruir el camino hacia atrás
        while current is not None:
            path_ids.append(current)
            current = previous[current]
        path_ids.reverse()
    
    # Convertir IDs a nombres para el resultado final
    shortest_path = [id_to_name.get(nid, nid) for nid in path_ids]
    total_distance = distances[end_id]
    
    # Verificar si se encontró un camino
    success = total_distance != math.inf
    if success:
        message = f"Camino más corto encontrado con distancia total: {total_distance}"
        add_step(
            end_id, 
            f"Camino reconstruido: {' → '.join(shortest_path)}"
        )
    else:
        message = f"No existe un camino desde {start_node.name} hasta {end_node.name}"
    
    execution_time = time.time() - start_time

    # Sanitizar steps y valores infinitos para que sean JSON-serializables
    def sanitize_value(v):
        if isinstance(v, float) and math.isinf(v):
            return None
        return v

    sanitized_steps = []
    for s in steps:
        sanitized_distances = {
            k: (None if (isinstance(v, float) and math.isinf(v)) else v)
            for k, v in s.get('distances', {}).items()
        }
        sanitized_previous = {
            k: (v if v is not None else None)
            for k, v in s.get('previous', {}).items()
        }
        sanitized_step = {
            'current_node': s.get('current_node'),
            'distances': sanitized_distances,
            'previous': sanitized_previous,
            'visited': s.get('visited', []),
            'unvisited': s.get('unvisited', []),
            'description': s.get('description')
        }
        sanitized_steps.append(sanitized_step)

    sanitized_total_distance = (
        None
        if (isinstance(total_distance, float) and math.isinf(total_distance))
        else total_distance
    )

    return {
        'start_node': start_node.name,
        'end_node': end_node.name,
        'shortest_path': shortest_path,
        'total_distance': sanitized_total_distance,
        'steps': sanitized_steps,
        'success': success,
        'message': message,
        'execution_time': execution_time
    }


def find_all_paths(
    graph: Graph, 
    start_node: Node, 
    end_node: Node,
    max_paths: int = 100,
    max_depth: int = 20
) -> Dict:
    """
    Encuentra todos los caminos posibles entre dos nodos usando DFS
    Incluye información sobre distancias y comparación con Dijkstra
    
    Args:
        graph: Grafo donde buscar
        start_node: Nodo inicial
        end_node: Nodo destino  
        max_paths: Máximo número de caminos a encontrar (prevenir explosión)
        max_depth: Máxima profundidad de búsqueda (prevenir ciclos infinitos)
    """
    start_time = time.time()
    
    # Construir el grafo como diccionario de adyacencia
    graph_dict = build_graph_dict(graph)
    
    start_id = str(start_node.id)
    end_id = str(end_node.id)
    
    # Verificar que los nodos existen
    if start_id not in graph_dict or end_id not in graph_dict:
        return {
            'start_node': start_node.name,
            'end_node': end_node.name,
            'all_paths': [],
            'shortest_path': [],
            'paths_count': 0,
            'success': False,
            'message': 'Nodos no encontrados en el grafo',
            'execution_time': time.time() - start_time
        }
    
    # Crear mapeo de IDs a nombres
    id_to_name = {str(node.id): node.name for node in graph.nodes.all()}
    
    all_paths = []
    
    def dfs_all_paths(current_path: List[str], current_distance: float, visited_in_path: set):
        """Búsqueda DFS para encontrar todos los caminos"""
        
        # Límites de seguridad
        if len(all_paths) >= max_paths:
            return
        if len(current_path) > max_depth:
            return
            
        current_node = current_path[-1]
        
        # Si llegamos al destino, guardar el camino
        if current_node == end_id:
            path_names = [id_to_name.get(nid, nid) for nid in current_path]
            all_paths.append({
                'path': path_names,
                'path_ids': current_path.copy(),
                'total_distance': current_distance,
                'nodes_count': len(current_path)
            })
            return
        
        # Explorar vecinos
        for neighbor_id, weight in graph_dict[current_node]:
            # Evitar ciclos en el camino actual
            if neighbor_id not in visited_in_path:
                new_path = current_path + [neighbor_id]
                new_distance = current_distance + weight
                new_visited = visited_in_path | {neighbor_id}
                
                dfs_all_paths(new_path, new_distance, new_visited)
    
    # Iniciar búsqueda DFS
    dfs_all_paths([start_id], 0.0, {start_id})
    
    # Ordenar caminos por distancia total (más corto primero)
    all_paths.sort(key=lambda p: p['total_distance'])
    
    # Obtener el camino más corto usando Dijkstra para comparación
    dijkstra_result = dijkstra_algorithm(graph, start_node, end_node, include_steps=False)
    shortest_path = dijkstra_result.get('shortest_path', [])
    shortest_distance = dijkstra_result.get('total_distance')
    
    # Estadísticas adicionales
    paths_count = len(all_paths)
    success = paths_count > 0
    
    if success:
        if paths_count == 1:
            message = f"Se encontró 1 camino entre {start_node.name} y {end_node.name}"
        else:
            message = f"Se encontraron {paths_count} caminos entre {start_node.name} y {end_node.name}"
            
        if paths_count >= max_paths:
            message += f" (limitado a {max_paths} caminos)"
    else:
        message = f"No se encontraron caminos entre {start_node.name} y {end_node.name}"
    
    # Agregar información de comparación si encontramos caminos
    comparison_info = None
    if success and shortest_distance is not None:
        comparison_info = {
            'dijkstra_distance': shortest_distance,
            'dijkstra_path': shortest_path,
            'all_paths_shortest_distance': all_paths[0]['total_distance'] if all_paths else None,
            'paths_with_optimal_distance': len([p for p in all_paths if abs(p['total_distance'] - shortest_distance) < 1e-10])
        }
    
    execution_time = time.time() - start_time
    
    return {
        'start_node': start_node.name,
        'end_node': end_node.name,
        'all_paths': all_paths,
        'shortest_path': shortest_path,
        'paths_count': paths_count,
        'success': success,
        'message': message,
        'comparison': comparison_info,
        'execution_time': execution_time,
        'search_limits': {
            'max_paths': max_paths,
            'max_depth': max_depth,
            'paths_limited': len(all_paths) >= max_paths
        }
    }


def validate_graph_for_dijkstra(graph: Graph) -> Tuple[bool, List[str]]:
    """
    Valida que un grafo sea válido para ejecutar Dijkstra
    Retorna: (es_válido, lista_de_errores)
    """
    errors = []
    
    # Verificar que hay nodos
    if graph.nodes.count() == 0:
        errors.append('El grafo debe tener al menos un nodo')
    
    # Verificar que no hay pesos negativos
    negative_edges = graph.edges.filter(weight__lt=0)
    if negative_edges.exists():
        edge_names = [str(edge) for edge in negative_edges[:5]]
        errors.append(
            "El algoritmo de Dijkstra no funciona con pesos negativos. "
            f"Aristas con peso negativo: {', '.join(edge_names)}"
        )
    
    # Verificar que todas las aristas referencian nodos válidos del mismo grafo
    invalid_edges = []
    for edge in graph.edges.all():
        if edge.from_node.graph != graph or edge.to_node.graph != graph:
            invalid_edges.append(str(edge))
    
    if invalid_edges:
        errors.append(
            f"Algunas aristas referencian nodos de otros grafos: "
            f"{', '.join(invalid_edges[:5])}"
        )
    
    return len(errors) == 0, errors

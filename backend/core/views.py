"""
Vistas de la API REST para grafos con algoritmo de Dijkstra
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from .models import Graph, Node, Edge
from .serializers import (
    GraphSerializer, GraphDetailSerializer, NodeSerializer, EdgeSerializer,
    DijkstraRequestSerializer, DijkstraResultSerializer,
    AllPathsRequestSerializer, AllPathsResultSerializer
)
from .algorithms import (
    dijkstra_algorithm, validate_graph_for_dijkstra, find_all_paths
)


class GraphViewSet(viewsets.ModelViewSet):
    """ViewSet para operaciones CRUD de grafos"""
    queryset = Graph.objects.all()
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return GraphDetailSerializer
        return GraphSerializer
    
    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Activar un grafo específico"""
        graph = self.get_object()
        
        # Desactivar todos los otros grafos
        Graph.objects.exclude(pk=pk).update(is_active=False)
        graph.is_active = True
        graph.save()
        
        serializer = self.get_serializer(graph)
        return Response({
            'message': f'Grafo "{graph.name}" activado correctamente',
            'graph': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """Obtener el grafo activo actual"""
        active_graph = Graph.get_active_graph()
        if not active_graph:
            return Response(
                {'message': 'No hay ningún grafo activo'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = GraphDetailSerializer(active_graph)
        return Response(serializer.data)


class NodeViewSet(viewsets.ModelViewSet):
    """ViewSet para operaciones CRUD de nodos"""
    serializer_class = NodeSerializer
    
    def get_queryset(self):
        graph_id = self.request.query_params.get('graph_id')
        if graph_id:
            return Node.objects.filter(graph_id=graph_id)
        return Node.objects.all()
    
    def perform_create(self, serializer):
        graph_id = self.request.data.get('graph_id')
        if graph_id:
            graph = get_object_or_404(Graph, id=graph_id)
            serializer.save(graph=graph)
        else:
            # Si no se especifica grafo, usar el activo
            active_graph = Graph.get_active_graph()
            if not active_graph:
                raise ValueError("No hay grafo activo y no se especificó graph_id")
            serializer.save(graph=active_graph)
    
    @action(detail=True, methods=['post'])
    def set_source(self, request, pk=None):
        """Establecer un nodo como fuente"""
        node = self.get_object()
        
        # Desmarcar todos los otros nodos del mismo grafo como fuente
        Node.objects.filter(graph=node.graph).update(is_source=False)
        node.is_source = True
        node.save()
        
        serializer = self.get_serializer(node)
        return Response({
            'message': f'Nodo "{node.name}" establecido como fuente',
            'node': serializer.data
        })

    @action(detail=False, methods=['post'])
    def bulk_update_positions(self, request):
        """Actualizar en bloque las posiciones x/y de varios nodos.

        Payload esperado: {
            "positions": [
                {"id": 1, "x_position": 123, "y_position": 456},
                ...
            ]
        }
        """
        positions = request.data.get('positions', [])
        if not isinstance(positions, list) or len(positions) == 0:
            return Response(
                {'error': 'Se requiere una lista de posiciones'},
                status=status.HTTP_400_BAD_REQUEST
            )

        nodes_to_update = []
        id_map = {}
        for p in positions:
            node_id = p.get('id')
            if not node_id:
                continue
            try:
                node = Node.objects.get(id=node_id)
            except Node.DoesNotExist:
                continue

            x = p.get('x_position')
            y = p.get('y_position')
            if x is not None:
                node.x_position = x
            if y is not None:
                node.y_position = y
            nodes_to_update.append(node)
            id_map[node.id] = {
                'x_position': node.x_position,
                'y_position': node.y_position,
            }

        if nodes_to_update:
            Node.objects.bulk_update(
                nodes_to_update,
                ['x_position', 'y_position']
            )

        return Response({'updated': id_map})


class EdgeViewSet(viewsets.ModelViewSet):
    """ViewSet para operaciones CRUD de aristas"""
    serializer_class = EdgeSerializer
    
    def get_queryset(self):
        graph_id = self.request.query_params.get('graph_id')
        if graph_id:
            return Edge.objects.filter(graph_id=graph_id)
        return Edge.objects.all()
    
    def perform_create(self, serializer):
        # La arista heredará el grafo de los nodos automáticamente
        # gracias a la lógica en el modelo
        serializer.save()


class DijkstraViewSet(viewsets.ViewSet):
    """ViewSet para ejecutar el algoritmo de Dijkstra"""
    
    @action(detail=False, methods=['post'])
    def calculate(self, request):
        """Ejecutar el algoritmo de Dijkstra"""
        serializer = DijkstraRequestSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        data = serializer.validated_data
        
        try:
            # Obtener objetos del modelo
            graph = Graph.objects.get(id=data['graph_id'])
            start_node = Node.objects.get(id=data['start_node_id'])
            end_node = Node.objects.get(id=data['end_node_id'])
            
            # Validar grafo para Dijkstra
            is_valid, errors = validate_graph_for_dijkstra(graph)
            if not is_valid:
                return Response(
                    {
                        'success': False,
                        'message': 'El grafo no es válido para Dijkstra',
                        'errors': errors
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Ejecutar algoritmo
            result = dijkstra_algorithm(
                graph=graph,
                start_node=start_node,
                end_node=end_node,
                include_steps=data.get('include_steps', False)
            )
            
            # Serializar resultado
            result_serializer = DijkstraResultSerializer(result)
            return Response(result_serializer.data)
            
        except Exception as e:
            return Response(
                {
                    'success': False,
                    'message': f'Error ejecutando Dijkstra: {str(e)}'
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'])
    def validate_graph(self, request):
        """Validar si un grafo es apto para Dijkstra"""
        graph_id = request.data.get('graph_id')
        
        if not graph_id:
            return Response(
                {'error': 'graph_id es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            graph = Graph.objects.get(id=graph_id)
            is_valid, errors = validate_graph_for_dijkstra(graph)
            
            return Response({
                'graph_id': graph_id,
                'graph_name': graph.name,
                'is_valid': is_valid,
                'errors': errors,
                'nodes_count': graph.nodes_count,
                'edges_count': graph.edges_count
            })
            
        except Graph.DoesNotExist:
            return Response(
                {'error': 'Grafo no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )


class AllPathsViewSet(viewsets.ViewSet):
    """ViewSet para encontrar todos los caminos entre dos nodos"""
    
    @action(detail=False, methods=['post'])
    def find_paths(self, request):
        """Encontrar todos los caminos posibles entre dos nodos"""
        serializer = AllPathsRequestSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(
                {'errors': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Obtener los datos validados
            data = serializer.validated_data
            graph = Graph.objects.get(id=data['graph_id'])
            start_node = Node.objects.get(id=data['start_node_id'])
            end_node = Node.objects.get(id=data['end_node_id'])
            max_paths = data.get('max_paths', 100)
            max_depth = data.get('max_depth', 20)
            
            # Ejecutar algoritmo de búsqueda de todos los caminos
            result = find_all_paths(
                graph=graph,
                start_node=start_node,
                end_node=end_node,
                max_paths=max_paths,
                max_depth=max_depth
            )
            
            # Serializar resultado
            result_serializer = AllPathsResultSerializer(result)
            
            return Response(result_serializer.data)
            
        except Exception as e:
            return Response(
                {
                    'success': False,
                    'message': f'Error buscando caminos: {str(e)}'
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'])
    def compare_with_dijkstra(self, request):
        """Comparar todos los caminos con el resultado de Dijkstra"""
        # Primero encontrar todos los caminos
        all_paths_response = self.find_paths(request)
        
        if all_paths_response.status_code != 200:
            return all_paths_response
        
        # Obtener también el resultado detallado de Dijkstra
        dijkstra_serializer = DijkstraRequestSerializer(data=request.data)
        dijkstra_serializer.is_valid(raise_exception=True)
        
        try:
            data = dijkstra_serializer.validated_data
            graph = Graph.objects.get(id=data['graph_id'])
            start_node = Node.objects.get(id=data['start_node_id'])
            end_node = Node.objects.get(id=data['end_node_id'])
            
            # Ejecutar Dijkstra con pasos detallados
            dijkstra_result = dijkstra_algorithm(
                graph=graph,
                start_node=start_node,
                end_node=end_node,
                include_steps=True
            )
            
            # Combinar ambos resultados
            combined_result = {
                'all_paths_result': all_paths_response.data,
                'dijkstra_result': dijkstra_result,
                'comparison_summary': {
                    'total_paths_found': all_paths_response.data.get('paths_count', 0),
                    'dijkstra_optimal': dijkstra_result.get('success', False),
                    'paths_analysis': self._analyze_paths_comparison(
                        all_paths_response.data, dijkstra_result
                    )
                }
            }
            
            return Response(combined_result)
            
        except Exception as e:
            return Response(
                {
                    'success': False,
                    'message': f'Error en comparación: {str(e)}'
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _analyze_paths_comparison(self, all_paths_data, dijkstra_data):
        """Analizar la comparación entre todos los caminos y Dijkstra"""
        if not all_paths_data.get('success') or not dijkstra_data.get('success'):
            return {'analysis': 'No se pudo completar el análisis'}
        
        all_paths = all_paths_data.get('all_paths', [])
        dijkstra_distance = dijkstra_data.get('total_distance')
        
        if not all_paths or dijkstra_distance is None:
            return {'analysis': 'Datos insuficientes para análisis'}
        
        # Análisis estadístico básico
        distances = [p['total_distance'] for p in all_paths]
        optimal_paths = [p for p in all_paths if abs(p['total_distance'] - dijkstra_distance) < 1e-10]
        
        analysis = {
            'shortest_distance': min(distances) if distances else None,
            'longest_distance': max(distances) if distances else None,
            'average_distance': sum(distances) / len(distances) if distances else None,
            'optimal_paths_count': len(optimal_paths),
            'dijkstra_confirmed_optimal': len(optimal_paths) > 0 and min(distances) == dijkstra_distance,
            'distance_variance': self._calculate_variance(distances, dijkstra_distance)
        }
        
        return analysis
    
    def _calculate_variance(self, distances, optimal_distance):
        """Calcular varianza de distancias respecto al óptimo"""
        if not distances or optimal_distance is None:
            return 0
        
        variance = sum((d - optimal_distance) ** 2 for d in distances) / len(distances)
        return variance

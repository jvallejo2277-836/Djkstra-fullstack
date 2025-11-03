"""
Serializers para la API REST de grafos con algoritmo de Dijkstra
"""

from rest_framework import serializers
from .models import Graph, Node, Edge


class NodeSerializer(serializers.ModelSerializer):
    """Serializer para nodos"""
    connections_count = serializers.ReadOnlyField()
    
    class Meta:
        model = Node
        fields = [
            'id', 'name', 'is_source', 'x_position', 'y_position', 
            'created_at', 'connections_count'
        ]
        read_only_fields = ['id', 'created_at', 'connections_count']


class EdgeSerializer(serializers.ModelSerializer):
    """Serializer para aristas"""
    from_node_name = serializers.CharField(source='from_node.name', read_only=True)
    to_node_name = serializers.CharField(source='to_node.name', read_only=True)
    
    class Meta:
        model = Edge
        fields = [
            'id', 'from_node', 'to_node', 'from_node_name', 'to_node_name',
            'weight', 'directed', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'from_node_name', 'to_node_name']


class GraphDetailSerializer(serializers.ModelSerializer):
    """Serializer detallado para grafos con nodos y aristas"""
    nodes = NodeSerializer(many=True, read_only=True)
    edges = EdgeSerializer(many=True, read_only=True)
    nodes_count = serializers.ReadOnlyField()
    edges_count = serializers.ReadOnlyField()
    source_node = NodeSerializer(read_only=True)
    
    class Meta:
        model = Graph
        fields = [
            'id', 'name', 'description', 'created_at', 'updated_at', 
            'is_active', 'nodes', 'edges', 'nodes_count', 'edges_count', 
            'source_node'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'nodes', 'edges', 
            'nodes_count', 'edges_count', 'source_node'
        ]


class GraphSerializer(serializers.ModelSerializer):
    """Serializer básico para grafos"""
    nodes_count = serializers.ReadOnlyField()
    edges_count = serializers.ReadOnlyField()
    source_node_name = serializers.CharField(source='source_node.name', read_only=True)
    
    class Meta:
        model = Graph
        fields = [
            'id', 'name', 'description', 'created_at', 'updated_at', 
            'is_active', 'nodes_count', 'edges_count', 'source_node_name'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'nodes_count', 
            'edges_count', 'source_node_name'
        ]


class DijkstraRequestSerializer(serializers.Serializer):
    """Serializer para solicitudes del algoritmo de Dijkstra"""
    graph_id = serializers.IntegerField()
    start_node_id = serializers.IntegerField()
    end_node_id = serializers.IntegerField()
    include_steps = serializers.BooleanField(default=False)
    
    def validate_graph_id(self, value):
        """Validar que el grafo existe"""
        try:
            Graph.objects.get(id=value)
        except Graph.DoesNotExist:
            raise serializers.ValidationError("El grafo especificado no existe")
        return value
    
    def validate_start_node_id(self, value):
        """Validar que el nodo de inicio existe"""
        try:
            Node.objects.get(id=value)
        except Node.DoesNotExist:
            raise serializers.ValidationError("El nodo de inicio especificado no existe")
        return value
    
    def validate_end_node_id(self, value):
        """Validar que el nodo de destino existe"""
        try:
            Node.objects.get(id=value)
        except Node.DoesNotExist:
            raise serializers.ValidationError("El nodo de destino especificado no existe")
        return value
    
    def validate(self, data):
        """Validaciones adicionales"""
        try:
            graph = Graph.objects.get(id=data['graph_id'])
            start_node = Node.objects.get(id=data['start_node_id'])
            end_node = Node.objects.get(id=data['end_node_id'])
            
            # Verificar que los nodos pertenecen al grafo
            if start_node.graph != graph:
                raise serializers.ValidationError(
                    "El nodo de inicio no pertenece al grafo especificado"
                )
            
            if end_node.graph != graph:
                raise serializers.ValidationError(
                    "El nodo de destino no pertenece al grafo especificado"
                )
            
            # Verificar que los nodos son diferentes
            if start_node == end_node:
                raise serializers.ValidationError(
                    "El nodo de inicio y destino deben ser diferentes"
                )
                
        except (Graph.DoesNotExist, Node.DoesNotExist):
            # Los errores específicos ya se manejan en las validaciones individuales
            pass
            
        return data


class DijkstraStepSerializer(serializers.Serializer):
    """Serializer para los pasos del algoritmo de Dijkstra"""
    current_node = serializers.CharField()
    distances = serializers.DictField()
    previous = serializers.DictField()
    visited = serializers.ListField(child=serializers.CharField())
    unvisited = serializers.ListField(child=serializers.CharField())
    description = serializers.CharField()


class DijkstraResultSerializer(serializers.Serializer):
    """Serializer para los resultados del algoritmo de Dijkstra"""
    start_node = serializers.CharField()
    end_node = serializers.CharField()
    shortest_path = serializers.ListField(child=serializers.CharField())
    total_distance = serializers.FloatField()
    steps = DijkstraStepSerializer(many=True)
    success = serializers.BooleanField()
    message = serializers.CharField()
    execution_time = serializers.FloatField(required=False)


class AllPathsRequestSerializer(serializers.Serializer):
    """Serializer para solicitudes de búsqueda de todos los caminos"""
    graph_id = serializers.IntegerField()
    start_node_id = serializers.IntegerField()
    end_node_id = serializers.IntegerField()
    max_paths = serializers.IntegerField(default=100, min_value=1, max_value=500)
    max_depth = serializers.IntegerField(default=20, min_value=1, max_value=50)
    
    def validate_graph_id(self, value):
        """Validar que el grafo existe"""
        try:
            Graph.objects.get(id=value)
        except Graph.DoesNotExist:
            raise serializers.ValidationError("El grafo especificado no existe")
        return value
    
    def validate_start_node_id(self, value):
        """Validar que el nodo de inicio existe"""
        try:
            Node.objects.get(id=value)
        except Node.DoesNotExist:
            raise serializers.ValidationError("El nodo de inicio especificado no existe")
        return value
    
    def validate_end_node_id(self, value):
        """Validar que el nodo de destino existe"""
        try:
            Node.objects.get(id=value)
        except Node.DoesNotExist:
            raise serializers.ValidationError("El nodo de destino especificado no existe")
        return value
    
    def validate(self, data):
        """Validaciones adicionales"""
        try:
            graph = Graph.objects.get(id=data['graph_id'])
            start_node = Node.objects.get(id=data['start_node_id'])
            end_node = Node.objects.get(id=data['end_node_id'])
            
            # Verificar que los nodos pertenecen al grafo
            if start_node.graph != graph:
                raise serializers.ValidationError(
                    "El nodo de inicio no pertenece al grafo especificado"
                )
            
            if end_node.graph != graph:
                raise serializers.ValidationError(
                    "El nodo de destino no pertenece al grafo especificado"
                )
            
            # Verificar que los nodos son diferentes
            if start_node == end_node:
                raise serializers.ValidationError(
                    "El nodo de inicio y destino deben ser diferentes"
                )
                
        except (Graph.DoesNotExist, Node.DoesNotExist):
            pass
            
        return data


class PathInfoSerializer(serializers.Serializer):
    """Serializer para información de un camino individual"""
    path = serializers.ListField(child=serializers.CharField())
    path_ids = serializers.ListField(child=serializers.CharField())
    total_distance = serializers.FloatField()
    nodes_count = serializers.IntegerField()


class AllPathsComparisonSerializer(serializers.Serializer):
    """Serializer para información de comparación con Dijkstra"""
    dijkstra_distance = serializers.FloatField(allow_null=True)
    dijkstra_path = serializers.ListField(child=serializers.CharField())
    all_paths_shortest_distance = serializers.FloatField(allow_null=True)
    paths_with_optimal_distance = serializers.IntegerField()


class SearchLimitsSerializer(serializers.Serializer):
    """Serializer para información de límites de búsqueda"""
    max_paths = serializers.IntegerField()
    max_depth = serializers.IntegerField()
    paths_limited = serializers.BooleanField()


class AllPathsResultSerializer(serializers.Serializer):
    """Serializer para los resultados de búsqueda de todos los caminos"""
    start_node = serializers.CharField()
    end_node = serializers.CharField()
    all_paths = PathInfoSerializer(many=True)
    shortest_path = serializers.ListField(child=serializers.CharField())
    paths_count = serializers.IntegerField()
    success = serializers.BooleanField()
    message = serializers.CharField()
    comparison = AllPathsComparisonSerializer(allow_null=True)
    execution_time = serializers.FloatField()
    search_limits = SearchLimitsSerializer()
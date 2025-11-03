"""
Script para crear datos de prueba para la API de Dijkstra
"""
import os
import sys
import django

# Configurar Django
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dijkstra_api.settings')
django.setup()

from core.models import Graph, Node, Edge

def create_sample_data():
    """Crear datos de prueba para la aplicación"""
    
    # Crear grafo de ejemplo
    graph = Graph.objects.create(
        name="Grafo de Prueba",
        description="Grafo de ejemplo para probar el algoritmo de Dijkstra",
        is_active=True
    )
    
    print(f"✅ Grafo creado: {graph.name}")
    
    # Crear nodos
    nodes_data = [
        {"name": "A", "is_source": True, "x_position": 100, "y_position": 100},
        {"name": "B", "is_source": False, "x_position": 200, "y_position": 50},
        {"name": "C", "is_source": False, "x_position": 300, "y_position": 150},
        {"name": "D", "is_source": False, "x_position": 400, "y_position": 100},
        {"name": "E", "is_source": False, "x_position": 250, "y_position": 250},
    ]
    
    nodes = {}
    for node_data in nodes_data:
        node = Node.objects.create(graph=graph, **node_data)
        nodes[node.name] = node
        print(f"✅ Nodo creado: {node.name}")
    
    # Crear aristas (edges)
    edges_data = [
        {"from": "A", "to": "B", "weight": 4},
        {"from": "A", "to": "C", "weight": 2},
        {"from": "B", "to": "C", "weight": 1},
        {"from": "B", "to": "D", "weight": 5},
        {"from": "C", "to": "D", "weight": 8},
        {"from": "C", "to": "E", "weight": 10},
        {"from": "D", "to": "E", "weight": 2},
    ]
    
    for edge_data in edges_data:
        edge = Edge.objects.create(
            graph=graph,
            from_node=nodes[edge_data["from"]],
            to_node=nodes[edge_data["to"]],
            weight=edge_data["weight"],
            directed=True
        )
        print(f"✅ Arista creada: {edge}")
    
    print(f"\n🎉 Datos de prueba creados exitosamente!")
    print(f"📊 Grafo: {graph.name}")
    print(f"📍 Nodos: {graph.nodes_count}")
    print(f"↔️ Aristas: {graph.edges_count}")
    print(f"🎯 Nodo fuente: {graph.source_node.name}")
    
    return graph

if __name__ == "__main__":
    # Limpiar datos existentes
    Graph.objects.all().delete()
    print("🧹 Datos anteriores eliminados")
    
    # Crear nuevos datos
    create_sample_data()
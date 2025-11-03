"""
Script para probar la API REST de Dijkstra
"""
import requests
import json

BASE_URL = "http://127.0.0.1:8000/api"

def test_api():
    """Probar los endpoints de la API"""
    
    print("🚀 Probando API de Dijkstra...")
    print("=" * 50)
    
    try:
        # 1. Obtener todos los grafos
        print("\n1️⃣ Obteniendo todos los grafos...")
        response = requests.get(f"{BASE_URL}/graphs/")
        if response.status_code == 200:
            graphs = response.json()
            print(f"✅ {len(graphs)} grafo(s) encontrado(s)")
            if graphs:
                graph_id = graphs[0]['id']
                print(f"📊 Primer grafo: {graphs[0]['name']} (ID: {graph_id})")
        else:
            print(f"❌ Error: {response.status_code}")
            return
        
        # 2. Obtener grafo activo
        print("\n2️⃣ Obteniendo grafo activo...")
        response = requests.get(f"{BASE_URL}/graphs/active/")
        if response.status_code == 200:
            active_graph = response.json()
            print(f"✅ Grafo activo: {active_graph['name']}")
            print(f"📍 Nodos: {active_graph['nodes_count']}")
            print(f"↔️ Aristas: {active_graph['edges_count']}")
            
            # Mostrar nodos
            print("\n🔹 Nodos:")
            for node in active_graph['nodes']:
                status = "🎯 (origen)" if node['is_source'] else ""
                print(f"   - {node['name']} {status}")
            
            # Mostrar aristas
            print("\n🔹 Aristas:")
            for edge in active_graph['edges']:
                print(f"   - {edge['from_node_name']} → {edge['to_node_name']} (peso: {edge['weight']})")
                
        else:
            print(f"❌ Error: {response.status_code}")
            return
        
        # 3. Ejecutar algoritmo de Dijkstra
        print("\n3️⃣ Ejecutando algoritmo de Dijkstra...")
        
        # Obtener IDs de nodos
        nodes = active_graph['nodes']
        start_node = next(node for node in nodes if node['is_source'])
        end_node = next(node for node in nodes if node['name'] == 'E')
        
        dijkstra_data = {
            "graph_id": active_graph['id'],
            "start_node_id": start_node['id'],
            "end_node_id": end_node['id'],
            "include_steps": True
        }
        
        response = requests.post(f"{BASE_URL}/dijkstra/calculate/", json=dijkstra_data)
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Algoritmo ejecutado exitosamente!")
            print(f"🎯 Desde: {result['start_node']} → Hasta: {result['end_node']}")
            print(f"📏 Distancia total: {result['total_distance']}")
            print(f"🛤️ Camino más corto: {' → '.join(result['shortest_path'])}")
            print(f"⏱️ Tiempo de ejecución: {result['execution_time']:.4f} segundos")
            
            if result.get('steps'):
                print(f"\n📝 Pasos del algoritmo ({len(result['steps'])} pasos):")
                for i, step in enumerate(result['steps'][:3], 1):  # Mostrar solo los primeros 3 pasos
                    print(f"   {i}. {step['description']}")
                if len(result['steps']) > 3:
                    print(f"   ... y {len(result['steps']) - 3} pasos más")
                    
        else:
            print(f"❌ Error ejecutando Dijkstra: {response.status_code}")
            print(response.text)
            return
        
        # 4. Validar grafo para Dijkstra
        print("\n4️⃣ Validando grafo para Dijkstra...")
        validate_data = {"graph_id": active_graph['id']}
        response = requests.post(f"{BASE_URL}/dijkstra/validate_graph/", json=validate_data)
        if response.status_code == 200:
            validation = response.json()
            if validation['is_valid']:
                print("✅ Grafo válido para Dijkstra")
            else:
                print("❌ Grafo no válido:")
                for error in validation['errors']:
                    print(f"   - {error}")
        else:
            print(f"❌ Error validando grafo: {response.status_code}")
        
        print("\n🎉 ¡Todas las pruebas completadas exitosamente!")
        print("🌐 API funcionando correctamente en http://127.0.0.1:8000/")
        print("🔧 Admin disponible en http://127.0.0.1:8000/admin/")
        
    except requests.exceptions.ConnectionError:
        print("❌ Error: No se puede conectar al servidor Django.")
        print("🔧 Asegúrate de que el servidor esté corriendo con: python manage.py runserver")
    except Exception as e:
        print(f"❌ Error inesperado: {e}")

if __name__ == "__main__":
    test_api()
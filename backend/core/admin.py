"""
Configuración del admin de Django para los modelos de grafos
"""

from django.contrib import admin
from .models import Graph, Node, Edge


@admin.register(Graph)
class GraphAdmin(admin.ModelAdmin):
    list_display = ['name', 'is_active', 'nodes_count', 'edges_count', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'description']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['-created_at']
    
    def get_readonly_fields(self, request, obj=None):
        if obj:  # Editando
            return self.readonly_fields + ['created_at', 'updated_at']
        return self.readonly_fields


@admin.register(Node)
class NodeAdmin(admin.ModelAdmin):
    list_display = ['name', 'graph', 'is_source', 'connections_count', 'created_at']
    list_filter = ['is_source', 'graph', 'created_at']
    search_fields = ['name', 'graph__name']
    readonly_fields = ['connections_count', 'created_at']
    ordering = ['graph', 'name']


@admin.register(Edge)
class EdgeAdmin(admin.ModelAdmin):
    list_display = ['__str__', 'graph', 'weight', 'directed', 'created_at']
    list_filter = ['directed', 'graph', 'created_at']
    search_fields = ['from_node__name', 'to_node__name', 'graph__name']
    readonly_fields = ['created_at']
    ordering = ['graph', 'from_node__name', 'to_node__name']

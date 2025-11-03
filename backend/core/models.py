"""
Modelos para la aplicación de grafos con algoritmo de Dijkstra
Adaptados del proyecto Django original para servir como API REST
"""

from django.db import models
from django.core.exceptions import ValidationError


class Graph(models.Model):
    """Modelo para manejar múltiples grafos en la base de datos"""
    name = models.CharField(max_length=100, unique=True, verbose_name="Nombre")
    description = models.TextField(blank=True, null=True, verbose_name="Descripción")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de creación")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Última actualización")
    is_active = models.BooleanField(default=False, verbose_name="Grafo activo")
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = "Grafo"
        verbose_name_plural = "Grafos"
    
    def __str__(self):
        return f"{self.name} {'(Activo)' if self.is_active else ''}"
    
    def save(self, *args, **kwargs):
        # Si este grafo se marca como activo, desactivar los demás
        if self.is_active:
            Graph.objects.exclude(pk=self.pk).update(is_active=False)
        super().save(*args, **kwargs)
    
    @classmethod
    def get_active_graph(cls):
        """Obtiene el grafo activo actual"""
        return cls.objects.filter(is_active=True).first()
    
    @property
    def nodes_count(self):
        """Cuenta los nodos del grafo"""
        return self.nodes.count()
    
    @property
    def edges_count(self):
        """Cuenta las aristas del grafo"""
        return self.edges.count()
    
    @property
    def source_node(self):
        """Obtiene el nodo fuente del grafo"""
        return self.nodes.filter(is_source=True).first()


class Node(models.Model):
    """Nodos del grafo"""
    graph = models.ForeignKey(
        Graph, 
        on_delete=models.CASCADE, 
        related_name='nodes',
        verbose_name="Grafo"
    )
    name = models.CharField(max_length=100, verbose_name="Nombre")
    is_source = models.BooleanField(default=False, verbose_name="Es nodo origen")
    x_position = models.FloatField(null=True, blank=True, verbose_name="Posición X")
    y_position = models.FloatField(null=True, blank=True, verbose_name="Posición Y")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de creación")
    
    class Meta:
        unique_together = [['graph', 'name']]
        ordering = ['name']
        verbose_name = "Nodo"
        verbose_name_plural = "Nodos"
    
    def __str__(self):
        return f"{self.name} ({'origen' if self.is_source else 'destino'})"
    
    @property
    def connections_count(self):
        """Contar total de conexiones del nodo"""
        outgoing = self.edges_from.count()
        incoming = self.edges_to.count()
        return outgoing + incoming
    
    def save(self, *args, **kwargs):
        # Si este nodo se marca como origen, desmarcar los demás del mismo grafo
        if self.is_source:
            Node.objects.filter(graph=self.graph).exclude(pk=self.pk).update(is_source=False)
        super().save(*args, **kwargs)


class Edge(models.Model):
    """Aristas/Arcos del grafo"""
    graph = models.ForeignKey(
        Graph, 
        on_delete=models.CASCADE, 
        related_name='edges',
        verbose_name="Grafo"
    )
    from_node = models.ForeignKey(
        Node, 
        on_delete=models.CASCADE, 
        related_name='edges_from',
        verbose_name="Nodo origen"
    )
    to_node = models.ForeignKey(
        Node, 
        on_delete=models.CASCADE, 
        related_name='edges_to',
        verbose_name="Nodo destino"
    )
    weight = models.FloatField(default=1.0, verbose_name="Peso")
    directed = models.BooleanField(default=True, verbose_name="Dirigida")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de creación")
    
    class Meta:
        unique_together = [['graph', 'from_node', 'to_node']]
        ordering = ['from_node__name', 'to_node__name']
        verbose_name = "Arista"
        verbose_name_plural = "Aristas"
    
    def clean(self):
        """Validaciones personalizadas"""
        if self.from_node == self.to_node:
            raise ValidationError("Un nodo no puede conectarse consigo mismo")
        if self.from_node and self.to_node and self.from_node.graph != self.to_node.graph:
            raise ValidationError("Los nodos deben pertenecer al mismo grafo")
        if self.weight <= 0:
            raise ValidationError("El peso debe ser mayor a 0")
    
    def save(self, *args, **kwargs):
        # Asegurar que la arista pertenece al mismo grafo que los nodos
        if self.from_node and self.to_node:
            self.graph = self.from_node.graph
        self.clean()
        super().save(*args, **kwargs)
    
    def __str__(self):
        arrow = "→" if self.directed else "—"
        return f"{self.from_node} {arrow} {self.to_node} ({self.weight})"

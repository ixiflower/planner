from django.db import models
from django.conf import settings
import uuid

class Board(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, default="New Board")
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='structure_owned_boards')
    members = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='structure_joined_boards', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class Node(models.Model):
    id = models.CharField(max_length=100, primary_key=True) # ReactFlow uses string IDs
    board = models.ForeignKey(Board, on_delete=models.CASCADE, related_name='nodes')
    type = models.CharField(max_length=50)
    position_x = models.FloatField()
    position_y = models.FloatField()
    data = models.JSONField(default=dict)
    style = models.JSONField(default=dict, blank=True)
    measured_width = models.FloatField(null=True, blank=True)
    measured_height = models.FloatField(null=True, blank=True)
    selected = models.BooleanField(default=False)
    dragging = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.type} node ({self.id}) on {self.board.name}"

class Edge(models.Model):
    id = models.CharField(max_length=100, primary_key=True)
    board = models.ForeignKey(Board, on_delete=models.CASCADE, related_name='edges')
    source = models.CharField(max_length=100)
    target = models.CharField(max_length=100)
    source_handle = models.CharField(max_length=100, null=True, blank=True)
    target_handle = models.CharField(max_length=100, null=True, blank=True)
    animated = models.BooleanField(default=False)
    style = models.JSONField(default=dict, blank=True)
    type = models.CharField(max_length=50, default='default')
    
    def __str__(self):
        return f"Edge {self.id} on {self.board.name}"

class Service(models.Model):
    name = models.CharField(max_length=255)
    url = models.CharField(max_length=500)
    status = models.CharField(max_length=20, default="unknown")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

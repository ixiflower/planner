from django.contrib import admin
from .models import Board, Node, Edge

@admin.register(Board)
class BoardAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "owner", "created_at", "updated_at")
    search_fields = ("name", "id", "owner__username", "owner__email")
    list_filter = ("created_at", "updated_at")

@admin.register(Node)
class NodeAdmin(admin.ModelAdmin):
    list_display = ("id", "board", "type", "position_x", "position_y")
    search_fields = ("id", "board__name", "type")
    list_filter = ("type",)

@admin.register(Edge)
class EdgeAdmin(admin.ModelAdmin):
    list_display = ("id", "board", "source", "target", "type", "animated")
    search_fields = ("id", "board__name", "source", "target")
    list_filter = ("type", "animated")

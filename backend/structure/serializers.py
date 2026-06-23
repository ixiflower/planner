from rest_framework import serializers
from .models import Board, Node, Edge, Service
from tickets.models import Group
from authentication.serializers import UserMiniSerializer

class GroupSerializer(serializers.ModelSerializer):
    owner_username = serializers.CharField(source='owner.username', read_only=True)
    members_count = serializers.IntegerField(source='members.count', read_only=True)
    join_code = serializers.CharField(source='invite_code', read_only=True)
    members_detail = UserMiniSerializer(source='members', many=True, read_only=True)

    class Meta:
        model = Group
        fields = ['id', 'name', 'description', 'owner', 'owner_username', 'members', 'members_count', 'members_detail', 'status', 'join_code', 'is_public', 'created_at', 'updated_at']
        read_only_fields = ['owner', 'status', 'join_code']

class ServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Service
        fields = ['id', 'name', 'url', 'status', 'created_at', 'updated_at']

class NodeSerializer(serializers.ModelSerializer):
    position = serializers.SerializerMethodField()
    measured = serializers.SerializerMethodField()

    class Meta:
        model = Node
        fields = ['id', 'type', 'position', 'data', 'style', 'measured', 'selected', 'dragging']

    def get_position(self, obj):
        return {'x': obj.position_x, 'y': obj.position_y}

    def get_measured(self, obj):
        if obj.measured_width is not None and obj.measured_height is not None:
            return {'width': obj.measured_width, 'height': obj.measured_height}
        return None

    def to_internal_value(self, data):
        internal = super().to_internal_value(data)
        if 'position' in data:
            internal['position_x'] = data['position'].get('x', 0)
            internal['position_y'] = data['position'].get('y', 0)
        return internal

class EdgeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Edge
        fields = ['id', 'source', 'target', 'source_handle', 'target_handle', 'animated', 'style', 'type']

class BoardSerializer(serializers.ModelSerializer):
    is_owner = serializers.SerializerMethodField()

    class Meta:
        model = Board
        fields = ['id', 'name', 'created_at', 'updated_at', 'is_owner']

    def get_is_owner(self, obj):
        request = self.context.get('request')
        if request and request.user:
            return obj.owner == request.user
        return False

class BoardDetailSerializer(serializers.ModelSerializer):
    nodes = NodeSerializer(many=True, read_only=True)
    edges = EdgeSerializer(many=True, read_only=True)
    is_owner = serializers.SerializerMethodField()

    class Meta:
        model = Board
        fields = ['id', 'name', 'nodes', 'edges', 'is_owner']

    def get_is_owner(self, obj):
        request = self.context.get('request')
        if request and request.user:
            return obj.owner == request.user
        return False

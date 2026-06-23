from rest_framework import generics, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.decorators import action
from django.shortcuts import get_object_or_404
from django.db.models import Q
from django.db import transaction
import secrets
import string
from .models import Board, Node, Edge, Service
from tickets.models import Group
from .serializers import BoardSerializer, BoardDetailSerializer, ServiceSerializer, GroupSerializer

class ServiceViewSet(viewsets.ModelViewSet):
    queryset = Service.objects.all()
    serializer_class = ServiceSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        return [IsAuthenticated()]

class GroupViewSet(viewsets.ModelViewSet):
    queryset = Group.objects.all()
    serializer_class = GroupSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if getattr(user, 'developer', False):
            return Group.objects.all()
        return Group.objects.filter(Q(owner=user) | Q(members=user)).distinct()

    def perform_create(self, serializer):
        is_dev = getattr(self.request.user, 'developer', False)
        status = 'approved' if is_dev else 'pending'
        join_code = None
        if status == 'approved':
            join_code = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))
        
        serializer.save(owner=self.request.user, status=status, join_code=join_code)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def approve(self, request, pk=None):
        if not getattr(request.user, 'developer', False):
            return Response({"error": "Only developers can approve groups"}, status=status.HTTP_403_FORBIDDEN)
        
        group = self.get_object()
        if group.status != 'pending':
            return Response({"error": "Group is already " + group.status}, status=status.HTTP_400_BAD_REQUEST)
        
        group.status = 'approved'
        if not group.join_code:
            group.join_code = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))
        group.save()
        return Response(GroupSerializer(group).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def reject(self, request, pk=None):
        if not getattr(request.user, 'developer', False):
            return Response({"error": "Only developers can reject groups"}, status=status.HTTP_403_FORBIDDEN)
        
        group = self.get_object()
        group.status = 'rejected'
        group.save()
        return Response(GroupSerializer(group).data)

class BoardListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = BoardSerializer

    def get_queryset(self):
        user = self.request.user
        return Board.objects.filter(Q(owner=user) | Q(members=user)).distinct()

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return Response({"boards": serializer.data})

    def perform_create(self, serializer):
        user_owned_boards_count = Board.objects.filter(owner=self.request.user).count()
        if user_owned_boards_count >= 5:
            from rest_framework.exceptions import ValidationError
            raise ValidationError("You can create a maximum of 5 boards per account.")
        serializer.save(owner=self.request.user)

class BoardDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = BoardDetailSerializer

    def get_queryset(self):
        user = self.request.user
        return Board.objects.filter(Q(owner=user) | Q(members=user)).distinct()
    
    def update(self, request, *args, **kwargs):
        board = self.get_object()
        if 'nodes' not in request.data and 'edges' not in request.data:
             return super().update(request, *args, **kwargs)

        nodes_data = request.data.get('nodes', [])
        edges_data = request.data.get('edges', [])
        
        with transaction.atomic():
            if 'name' in request.data:
                board.name = request.data['name']
                board.save()
            board.nodes.all().delete()
            board.edges.all().delete()
            for n in nodes_data:
                pos = n.get('position', {'x': 0, 'y': 0})
                measured = n.get('measured', {})
                Node.objects.create(
                    id=n.get('id'),
                    board=board,
                    type=n.get('type'),
                    position_x=pos.get('x', 0),
                    position_y=pos.get('y', 0),
                    data=n.get('data', {}),
                    style=n.get('style', {}),
                    measured_width=measured.get('width') if measured else None,
                    measured_height=measured.get('height') if measured else None,
                    selected=n.get('selected', False),
                    dragging=n.get('dragging', False)
                )
            for e in edges_data:
                Edge.objects.create(
                    id=e.get('id'),
                    board=board,
                    source=e.get('source'),
                    target=e.get('target'),
                    source_handle=e.get('sourceHandle'),
                    target_handle=e.get('targetHandle'),
                    animated=e.get('animated', False),
                    style=e.get('style', {}),
                    type=e.get('type', 'default')
                )
        return Response(BoardDetailSerializer(board, context={'request': request}).data)

class BoardExistsView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        code = request.query_params.get('code')
        if not code:
            return Response({'error': 'Code required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            board = Board.objects.get(id=code)
        except (Board.DoesNotExist, ValueError):
            return Response({'exists': False}, status=status.HTTP_200_OK)
        return Response({'exists': True, 'id': str(board.id), 'name': board.name}, status=status.HTTP_200_OK)

class JoinBoardView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request):
        code = request.data.get('code')
        if not code:
            return Response({'error': 'Code required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            board = Board.objects.get(id=code)
        except (Board.DoesNotExist, ValueError):
            return Response({'error': 'Board not found'}, status=status.HTTP_404_NOT_FOUND)
        if board.owner == request.user:
            return Response({'message': 'You are already the owner', 'id': str(board.id), 'success': True})
        if request.user in board.members.all():
            return Response({'message': 'Already joined', 'id': str(board.id), 'success': True})
        board.members.add(request.user)
        return Response({'success': True, 'id': str(board.id), 'message': 'Joined successfully'})

from rest_framework import serializers
from .models import User
from tickets.models import WorkingHours

class UserMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'name', 'profile_picture', 'team_role', 'bio']

class WorkingHoursSerializer(serializers.ModelSerializer):
    user_detail = UserMiniSerializer(source='user', read_only=True)
    
    class Meta:
        model = WorkingHours
        fields = [
            'id', 'user', 'user_detail', 'date', 
            'morning_status', 'morning_partial_time', 
            'afternoon_status', 'afternoon_partial_time',
            'morning_check_in', 'morning_check_out',
            'afternoon_check_in', 'afternoon_check_out',
            'is_currently_working', 'current_shift',
            'updated_at'
        ]

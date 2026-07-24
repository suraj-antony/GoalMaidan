from rest_framework import serializers
from .models import Team, Player, ViewerAccessRequest

class PlayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Player
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'is_verified', 'rejection_reason')

class TeamSerializer(serializers.ModelSerializer):
    players = PlayerSerializer(source='player_set', many=True, read_only=True)
    player_count = serializers.SerializerMethodField()

    class Meta:
        model = Team
        fields = '__all__'
        read_only_fields = ('id', 'created_at')

    def get_player_count(self, obj):
        return obj.player_set.count()

class ViewerAccessRequestSerializer(serializers.ModelSerializer):
    tournament_name = serializers.CharField(source='tournament.name', read_only=True)
    viewer_name = serializers.CharField(source='viewer.name', read_only=True)
    
    class Meta:
        model = ViewerAccessRequest
        fields = '__all__'
        read_only_fields = ('id', 'status', 'requested_at', 'responded_at', 'viewer')

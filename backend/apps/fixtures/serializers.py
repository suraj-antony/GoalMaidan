from rest_framework import serializers
from .models import Fixture, MatchEvent

class MatchEventSerializer(serializers.ModelSerializer):
    player_name = serializers.CharField(source='player.name', read_only=True)
    team_name = serializers.CharField(source='team.name', read_only=True)
    
    class Meta:
        model = MatchEvent
        fields = '__all__'
        read_only_fields = ('id', 'created_at')

class FixtureSerializer(serializers.ModelSerializer):
    team_a_name = serializers.CharField(source='team_a.name', read_only=True)
    team_b_name = serializers.CharField(source='team_b.name', read_only=True)
    winner_name = serializers.CharField(source='winner.name', read_only=True)
    events = MatchEventSerializer(many=True, read_only=True)
    
    class Meta:
        model = Fixture
        fields = '__all__'
        read_only_fields = ('id', 'created_at')


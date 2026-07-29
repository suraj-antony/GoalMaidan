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
    events = serializers.SerializerMethodField()
    awards = serializers.SerializerMethodField()
    
    class Meta:
        model = Fixture
        fields = '__all__'
        read_only_fields = ('id', 'created_at')

    def get_events(self, obj):
        return [
            {
                'event_type': e.event_type,
                'player_name': e.player_name,
                'team_id': str(e.team_id) if e.team_id else None,
            }
            for e in obj.events.all()
        ]

    def get_awards(self, obj):
        return [
            {
                'id': str(a.id),
                'award_type': a.award_type,
                'player_name': a.player_name or (a.player.name if a.player else ''),
                'player': str(a.player_id) if a.player_id else None,
            }
            for a in obj.awards.all()
        ]



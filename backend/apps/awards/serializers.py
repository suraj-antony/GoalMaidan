from rest_framework import serializers
from .models import MatchAward, TournamentAward, LeagueTable

class MatchAwardSerializer(serializers.ModelSerializer):
    player_name = serializers.CharField(source='player.name', read_only=True)
    
    class Meta:
        model = MatchAward
        fields = '__all__'

class TournamentAwardSerializer(serializers.ModelSerializer):
    player_display_name = serializers.SerializerMethodField()

    class Meta:
        model = TournamentAward
        fields = '__all__'

    def get_player_display_name(self, obj):
        if obj.player_name:
            return obj.player_name
        if obj.player:
            return obj.player.name
        return None


class LeagueTableSerializer(serializers.ModelSerializer):
    team_name = serializers.CharField(source='team.name', read_only=True)
    goal_difference = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = LeagueTable
        fields = '__all__'

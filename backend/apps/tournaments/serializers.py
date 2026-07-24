from rest_framework import serializers
from .models import Tournament

class TournamentSerializer(serializers.ModelSerializer):
    organiser_name = serializers.CharField(source='organiser.name', read_only=True)
    organiser_area = serializers.CharField(source='organiser.area_name', read_only=True)
    team_count = serializers.SerializerMethodField()

    class Meta:
        model = Tournament
        fields = '__all__'
        read_only_fields = ['id', 'organiser', 'verification_link_token', 'created_at', 'updated_at']

    def get_team_count(self, obj):
        return obj.teams.count()

    def validate(self, data):
        # If Open or Veterans, clear all age verification fields
        if data.get('age_category') in ['Open', 'Veterans']:
            data['age_verification_required'] = False
            data['accept_aadhaar'] = False
            data['accept_school_certificate'] = False
            data['accept_birth_certificate'] = False

        # If age_verification_required is True, at least one document type must be selected
        if data.get('age_verification_required'):
            if not any([
                data.get('accept_aadhaar'),
                data.get('accept_school_certificate'),
                data.get('accept_birth_certificate'),
            ]):
                raise serializers.ValidationError(
                    "At least one document type must be selected for age verification."
                )

        # Goals must always be tracked — enforce in stats_config
        stats_config = data.get('stats_config', {})
        stats_config['goals'] = {'track': True, 'show': True}
        data['stats_config'] = stats_config

        # max_teams must be between 1 and 62
        if not (1 <= data.get('max_teams', 1) <= 62):
            raise serializers.ValidationError("Max teams must be between 1 and 62.")

        return data

    def create(self, validated_data):
        if 'organiser' not in validated_data:
            request = self.context.get('request')
            if request:
                validated_data['organiser'] = request.user
        return super().create(validated_data)

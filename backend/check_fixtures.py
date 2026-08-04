import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'football_app.settings')
django.setup()

from apps.fixtures.models import Fixture

print("Fixtures in DB:")
for f in Fixture.objects.all().order_by('round_number', 'id'):
    print(f"ID: {f.id} | Stage: {f.stage} | Round: {f.round_number} | Team A: {f.team_a.name if f.team_a else 'None'} | Team B: {f.team_b.name if f.team_b else 'None'} | Score A: {f.score_a} | Score B: {f.score_b} | Status: {f.status}")

from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.users.urls')),
    path('api/tournaments/', include('apps.tournaments.urls')),
    path('api/teams/', include('apps.teams.urls')),
    path('api/fixtures/', include('apps.fixtures.urls')),
    path('api/awards/', include('apps.awards.urls')),
    path('api/stats/', include('apps.awards.urls')),
    path('api/verify/', include('apps.teams.urls')),
]

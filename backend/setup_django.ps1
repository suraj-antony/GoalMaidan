$ErrorActionPreference = "Stop"

& .\venv\Scripts\django-admin.exe startproject football_app .
& .\venv\Scripts\python.exe manage.py startapp users
& .\venv\Scripts\python.exe manage.py startapp tournaments
& .\venv\Scripts\python.exe manage.py startapp teams
& .\venv\Scripts\python.exe manage.py startapp fixtures
& .\venv\Scripts\python.exe manage.py startapp awards

New-Item -ItemType Directory -Force -Path apps
Move-Item -Path users -Destination apps/
Move-Item -Path tournaments -Destination apps/
Move-Item -Path teams -Destination apps/
Move-Item -Path fixtures -Destination apps/
Move-Item -Path awards -Destination apps/
New-Item -ItemType File -Force -Path apps/__init__.py

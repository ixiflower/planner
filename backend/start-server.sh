#!/bin/bash
cd /home/ixi_flower/planner/backend
source .venv/bin/activate
python manage.py runserver 0.0.0.0:8001 2>&1

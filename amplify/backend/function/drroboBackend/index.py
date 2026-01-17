import os
import sys

# 🔑 MUST COME FIRST — add /var/task/python
current_dir = os.path.dirname(os.path.abspath(__file__))
python_dir = os.path.join(current_dir, "python")
sys.path.insert(0, python_dir)
sys.path.insert(0, current_dir)

from main import app
from mangum import Mangum

handler = Mangum(app, lifespan="off")

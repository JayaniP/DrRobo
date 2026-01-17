import os
import sys

# Standard pathing for local and Lambda
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

from main import app
from mangum import Mangum

# This 'handler' is what the Lambda looks for
handler = Mangum(app, lifespan="off")
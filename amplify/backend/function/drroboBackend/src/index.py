import sys
import os
from mangum import Mangum
from main import app

handler = Mangum(app, lifespan="off")


# Adds the current directory to the path so Lambda can find 'main.py' and your 'src' folder
current_dir = os.path.dirname(os.path.realpath(__file__))
sys.path.append(current_dir)

from main import handler as fastapi_handler

def handler(event, context):
    return fastapi_handler(event, context)

# 4. Lambda Handler
handler = Mangum(app, lifespan="off")
import os
from catalog import app

app.run(host=os.environ.get('CATALOG_HOST'),
        port=os.environ.get('CATALOG_PORT'))

# INPE's Station Manager

INPE's Station Manager is a web application made in Flask for search, discovery and manage some earth observation products produced by INPE.

# Setup Enviroment

## Cloning and installing dependencies on Ubuntu

The system dependencies are:
* python3-pip;
* python3-dev;
* virtualenv;
* libmysqlclient-dev;
* gdal-dev.

The pip requirements are:
* flask;
* flask-bootstrap;
* requests;
* mysqlclient;
* sqlalchemy;
* gunicorn (optional, used only for deployment);
* numpy;
* pygdal;
* Pillow.

The following commands will clone and install **all** the dependencies:
```bash
git clone http://github.com/carolgsantos/inpe_catalog
cd inpe_catalog
./venv.sh
source venv/bin/activate
```

## Running the app

To run the app, make sure you have the following enviroment variables configured:
```
PYTHONUNBUFFERED=1
CATALOG_HOST=<service_host>
CATALOG_PORT=<service_port>
```
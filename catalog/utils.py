import sqlalchemy
import requests
import errno
import os


def make_geojson(features, totalResults, provider):
    geojson = dict()
    geojson['totalResults'] = totalResults
    geojson['provider'] = provider
    geojson['type'] = 'FeatureCollection'
    geojson['features'] = []
    for i in features:
        geojson['features'].append(i)
    return geojson


def remote_file_exists(url):
    status = requests.head(url).status_code
    if status == 200:
        return True
    else:
        return False


def path_hierarchy(path):
    hierarchy = {
        'type': 'folder',
        'text': os.path.basename(path),
        'path': path,
    }

    try:
        hierarchy['children'] = [
            path_hierarchy(os.path.join(path, contents))
            for contents in os.listdir(path)
        ]
    except OSError as e:
        if e.errno != errno.ENOTDIR:
            raise
        hierarchy['type'] = 'file'

    return hierarchy


def do_query(sql, db):
    connection = 'mysql://{}:{}@{}:{}/{}'.format(os.environ.get('MAESTRO_DB_USER'),
                                                 os.environ.get(
                                                     'MAESTRO_DB_PASS'),
                                                 os.environ.get(
                                                     'MAESTRO_DB_HOST'),
                                                 os.environ.get(
                                                     'MAESTRO_DB_PORT'),
                                                 db)
    engine = sqlalchemy.create_engine(connection)
    result = engine.execute(sql)
    result = result.fetchall()
    engine.dispose()
    return result

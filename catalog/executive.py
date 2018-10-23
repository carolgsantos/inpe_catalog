from flask import request
from PIL import Image
from osgeo import ogr
from catalog import utils
import os
import io
import numpy as np
import json

os.environ["MAESTRO_DB_USER"] = "root"
os.environ["MAESTRO_DB_PASS"] = "password"
os.environ["MAESTRO_DB_HOST"] = "cbers2.dpi.inpe.br"
os.environ["MAESTRO_DB_PORT"] = "3311"


def getgcps(params):
    min_x = params['west']
    min_y = params['south']
    max_x = params['east']
    max_y = params['north']

    if min_x == '':
        min_x = '-180'
    if min_y == '':
        min_y = '-90'
    if max_x == '':
        max_x = '+180'
    if max_y == '':
        max_y = '+90'

    bbox = ""
    bbox += "{} <= p.BOUNDING_BOX_UR_LON_SAD69 AND {} <= p.BOUNDING_BOX_UR_LAT_SAD69".format(
        min_x, min_y)
    bbox += " AND "
    bbox += "{} <= p.BOUNDING_BOX_LR_LON_SAD69 AND {} <= p.BOUNDING_BOX_LR_LAT_SAD69".format(
        min_x, min_y)
    bbox += " AND "
    bbox += "{} >= p.BOUNDING_BOX_LL_LON_SAD69 AND {} >= p.BOUNDING_BOX_LL_LAT_SAD69".format(
        max_x, max_y)
    bbox += " AND "
    bbox += "{} >= p.BOUNDING_BOX_UL_LON_SAD69 AND {} >= p.BOUNDING_BOX_UL_LAT_SAD69".format(
        max_x, max_y)

    sql = "SELECT * FROM `kernel_primary` as p WHERE " + bbox

    if params['satellite'] != '':
        sql += " AND p.SATELLITE='{}'".format(params['satellite'])

    if params['count'] != '':
        sql += " LIMIT {}".format(params['count'])

    query = utils.do_query(sql, "grdb")
    result = [dict(row) for row in query]

    features = {
        "features": [],
        "count": 0
    }

    for data in result:
        geojson = {
            "type": "Feature",
            "properties": {},
            "geometry": {
                "type": "Point",
                "coordinates": []
            }
        }
        geojson['properties']['title'] = data['KERNEL_ID']
        geojson['properties']['icon'] = request.host_url + \
            'getqlook?kernel_id={}'.format(data['KERNEL_ID'])
        geojson['properties']['satellite'] = data['SATELLITE']
        geojson['properties']['sensor'] = data['INSTRUMENT']
        geojson['properties']['tl_longitude'] = data['BOUNDING_BOX_UL_LON_SAD69']
        geojson['properties']['tl_latitude'] = data['BOUNDING_BOX_UL_LAT_SAD69']
        geojson['properties']['tr_longitude'] = data['BOUNDING_BOX_UR_LON_SAD69']
        geojson['properties']['tr_latitude'] = data['BOUNDING_BOX_UR_LAT_SAD69']
        geojson['properties']['bl_longitude'] = data['BOUNDING_BOX_LL_LON_SAD69']
        geojson['properties']['bl_latitude'] = data['BOUNDING_BOX_LL_LAT_SAD69']
        geojson['properties']['br_longitude'] = data['BOUNDING_BOX_LR_LON_SAD69']
        geojson['properties']['br_latitude'] = data['BOUNDING_BOX_LR_LAT_SAD69']
        geojson['properties']['type'] = 'GCPS'
        x = (data['BOUNDING_BOX_UL_LON_SAD69'] +
             data['BOUNDING_BOX_LR_LON_SAD69']) / 2
        y = (data['BOUNDING_BOX_UL_LAT_SAD69'] +
             data['BOUNDING_BOX_LR_LAT_SAD69']) / 2
        geojson['geometry']['coordinates'] = [x, y]

        features['features'].append(geojson)
        features['count'] += 1

    return features


def get_qlook(kernel_id):
    sql = "SELECT b.KERNEL_ID, k.NUM_LINES, k.NUM_COLUMNS, b.IMAGE FROM kernel_primary as k INNER JOIN kernel_blob as b ON k.KERNEL_ID={} AND b.KERNEL_ID=k.KERNEL_ID".format(
        kernel_id)
    query = utils.do_query(sql, "grdb")
    qlarray = np.frombuffer(query[0][3], dtype=np.uint8)
    qlarray = qlarray.reshape(query[0][1], query[0][2])
    img = Image.fromarray(qlarray)
    strIO = io.BytesIO()
    img.save(strIO, format='png')
    strIO.seek(0)
    return strIO


def getwrss(params):
    min_x = params['west']
    min_y = params['south']
    max_x = params['east']
    max_y = params['north']
    if min_x == '':
        min_x = '-180'
    if min_y == '':
        min_y = '-90'
    if max_x == '':
        max_x = '+180'
    if max_y == '':
        max_y = '+90'

    bbox = ""
    bbox += "{} <= w.lonmin AND {} <= w.latmin".format(min_x, min_y)
    bbox += " AND "
    bbox += "{} >= w.lonmax AND {} >= w.latmax".format(max_x, max_y)

    satellite = params['satellite']
    limit = params['count']

    sql = "SELECT * FROM wrs as w WHERE " + bbox

    if satellite is not None and satellite != '':
        sql += " AND w.name='{}'".format(satellite)

    if limit is not None and limit != '':
        sql += " LIMIT {}".format(limit)

    query = utils.do_query(sql, "wrsdb")
    result = [dict(row) for row in query]

    features = {
        "features": []
    }

    for data in result:
        geojson = {
            "type": "Feature",
            "properties": {}
        }
        geojson['properties']['title'] = data['pathrow']
        geojson['properties']['icon'] = ''
        geojson['properties']['satellite'] = data['name']
        geojson['properties']['path'] = data['path']
        geojson['properties']['row'] = data['row']
        geojson['properties']['srs'] = data['srs']
        geojson['properties']['tl_longitude'] = data['lonmin']
        geojson['properties']['tl_latitude'] = data['lonmax']
        geojson['properties']['tr_longitude'] = data['latmin']
        geojson['properties']['tr_latitude'] = data['latmax']
        geojson['properties']['bl_longitude'] = data['lonmin']
        geojson['properties']['bl_latitude'] = data['lonmax']
        geojson['properties']['br_longitude'] = data['latmin']
        geojson['properties']['br_latitude'] = data['latmax']
        geojson['properties']['enclosure'] = ''
        geojson['properties']['type'] = 'WRSS'
        polygon = ogr.CreateGeometryFromWkt(data['geom'])
        geojson['geometry'] = json.loads(polygon.ExportToJson())
        features['features'].append(geojson)

    return features

from urllib.parse import urlencode
from flask import jsonify
from catalog import app, utils
import requests
import json
import os


def developmentSeed(provider, url, params):
    app.logger.debug(
        'Info: provider {} from Development Seed query params: {}'.format(provider, params))

    startdate = params['start']
    enddate = params['end']
    cloud = params['cloud']
    limit = params['count']
    path = params['path']
    row = params['row']

    query = url + '?search='
    qparams = 'satellite_name:landsat-8'

    if params['south'] != '' and params['north'] != '' and params['east'] != '' and params['west'] != '':
        qbbox = '+AND+upperLeftCornerLatitude:[{}+TO+1000]+AND+lowerRightCornerLatitude:[-1000+TO+{}]' \
            '+AND+lowerLeftCornerLongitude:[-1000+TO+{}]+AND+upperRightCornerLongitude:[{}+TO+1000]'.format(
                params['south'], params['north'], params['east'], params['west'])
        qparams += qbbox

    if startdate != '' and enddate != '':
        acquisitionDate = 'acquisitionDate:[%s+TO+%s]' % (startdate, enddate)
        if qparams != '':
            qparams += '+AND+'
        qparams += acquisitionDate

    if cloud != '':
        cloud_coverage = 'cloud_coverage:[-1+TO+%s]' % cloud
        if qparams != '':
            qparams += '+AND+'
        qparams += cloud_coverage

    if path != '':
        path = 'path:[%s+TO+%s]' % (path, path)
        if qparams != '':
            qparams += '+AND+'
        qparams += path

    if row != '':
        row = 'row:[%s+TO+%s]' % (row, row)
        if qparams != '':
            qparams += '+AND+'
        qparams += row

    qparams += '&limit={0}'.format(limit)
    query += qparams
    app.logger.debug(
        'Info: provider {} from Development Seed query: {}'.format(provider, query))

    response = requests.get(query)
    response_dict = json.loads(response.text)

    features = []
    if 'results' in response_dict:
        for val in response_dict['results']:
            quicklook = val['aws_thumbnail']
            if quicklook is not None and not utils.remote_file_exists(quicklook):
                app.logger.debug(
                    'Error: invalid quicklook from {} : {}'.format(provider, quicklook))
                continue
            if cloud is not None and float(val['cloud_coverage']) > float(cloud):
                continue

            enclosure = []
            for url in val['download_links']['aws_s3']:
                info = {}
                info['provider'] = 'aws_s3'
                info['url'] = url
                info['band'] = os.path.basename(
                    url).split('_')[-1].split('.')[0]
                info['radiometric_processing'] = ''
                info['type'] = 'SCENE'
                enclosure.append(info)

            prop = {}
            prop['title'] = val['scene_id']
            prop['icon'] = quicklook
            prop['satellite'] = 'LC8'
            prop['sensor'] = 'OLI'
            prop['cloud'] = val['cloud_coverage']
            prop['date'] = val['acquisitionDate']
            prop['path'] = int(val['path'])
            prop['row'] = int(val['row'])
            prop['tl_longitude'] = float(
                val['upperLeftCornerLongitude'])
            prop['tl_latitude'] = float(
                val['upperLeftCornerLatitude'])
            prop['tr_longitude'] = float(
                val['upperRightCornerLongitude'])
            prop['tr_latitude'] = float(
                val['upperRightCornerLatitude'])
            prop['bl_longitude'] = float(
                val['lowerLeftCornerLongitude'])
            prop['bl_latitude'] = float(
                val['lowerLeftCornerLatitude'])
            prop['br_longitude'] = float(
                val['lowerRightCornerLongitude'])
            prop['br_latitude'] = float(
                val['lowerRightCornerLatitude'])
            prop['enclosure'] = enclosure
            prop['provider'] = provider
            prop['type'] = 'IMAGES'

            feature = dict()
            feature['geometry'] = val['data_geometry']
            feature['properties'] = prop
            feature['type'] = 'Feature'
            feature['provider'] = provider

            features.append(feature)

    sorted_features = sorted(features, key=lambda k: (
        k['properties']['path'], k['properties']['row']), reverse=True)
    return utils.make_geojson(sorted_features, response_dict['meta']['found'], provider)


def opensearch(provider, url, params):
    query = url + 'granule.json?&' + urlencode(params) + '&bbox='

    if params['west'] != '' and params['south'] != '' and params['east'] != '' and params['north'] != '':
        query += params['west'] + ',' + params['south'] + \
            ',' + params['east'] + ',' + params['north']

    app.logger.debug(
        'Info: provider {} from Opensearch query params: {}'.format(provider, params))
    app.logger.debug(
        'Info: provider {} from Opensearch query: {}'.format(provider, query))

    response = requests.get(query)
    geojson = json.loads(response.text)

    features = []
    for feature in geojson['features']:
        prop = feature['properties']
        quicklook = prop['icon']
        if quicklook is None:
            continue
        if not utils.remote_file_exists(quicklook):
            app.logger.debug(
                'Error: invalid quicklook from {} : {}'.format(provider, quicklook))
            continue

        prop['cloud'] = prop['cloudcoverq1']
        prop['path'] = int(prop['path'])
        prop['row'] = int(prop['row'])
        prop['provider'] = provider
        prop['type'] = 'IMAGES'

        features.append(feature)

    geojson['provider'] = provider
    geojson['features'] = sorted(features, key=lambda k: (
        k['properties']['path'], k['properties']['row']), reverse=True)
    return geojson


def search(params):
    features = []
    providersInfo = []

    for key, value in json.loads(params['providers']).items():
        if value['type'] == 'opensearch':
            results = opensearch(key, value['url'], params)
        elif value['type'] == 'dev_seed':
            results = developmentSeed(key, value['url'], params)
        features += results['features']
        results.pop('features')
        providersInfo.append(results)

    return jsonify({'features': features, 'providers': providersInfo})

from flask import request, render_template, abort, jsonify, send_file
from catalog import app
from catalog import search
from catalog import executive
import json

from catalog import utils

# Station Manager #


@app.before_request
def before_request():
    if 'localhost' in request.host_url or '0.0.0.0' in request.host_url:
        app.jinja_env.cache = {}


@app.route("/")
def index():
    providers = json.load(open('catalog/config/providers.json'))
    if providers == '':
        app.logger.error(
            'Error: Cannot find providers list (check "config/providers.json" file)')
    return render_template("index.jinja2", host_url=request.host_url, providers=providers, maestro_url="http://cbers2.dpi.inpe.br:5010/")
    # Criar variável ambiental: "http://cbers2.dpi.inpe.br:5010/"


@app.route("/query", methods=['GET'])
def query():
    app.logger.info('Start: request for ms3_search.')
    return search.search(request.args.to_dict())


# Executive #

@app.route('/getqlook', methods = ['GET'])
def qlook():
    try:
        data=executive.get_qlook(request.args.get('kernel_id'))
    except Exception as e:
        abort(503, e)
    return send_file(data, mimetype = 'image/png')


@app.route('/getgcps', methods = ['GET'])
def gcps():
    try:
        data=executive.getgcps(request.args.to_dict())
    except IOError as e:
        abort(503, e)

    resp=jsonify(data)
    return resp


@app.route('/getwrss', methods = ['GET'])
def wrss():
    try:
        data=executive.getwrss(request.args.to_dict())
    except IOError as e:
        abort(503, e)

    resp=jsonify(data)
    return resp

# Error Handler #


@app.errorhandler(500)
def exception_handler(exception):
    app.logger.exception('Exception: ' + exception)
    return """<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 3.2 Final//EN">
            <title>500 Internal Server Error</title>
            <h1>Internal Server Error</h1>
            <p>The server encountered an internal error and was
            unable to complete your request..</p>"""

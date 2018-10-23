# pylint: disable=invalid-name
"""
TODO
"""
import os
import logging
from logging.handlers import RotatingFileHandler
from flask import Flask
from flask_bootstrap import Bootstrap, WebCDN


def create_app():
    app = Flask(__name__)

    Bootstrap(app)

    app.extensions["bootstrap"]["cdns"]["jquery"] = WebCDN(
        "//cdnjs.cloudflare.com/ajax/libs/jquery/3.2.1/")
    app.extensions["bootstrap"]["cdns"]["bootstrap"] = WebCDN(
        "//maxcdn.bootstrapcdn.com/bootstrap/4.0.0-beta.3/")

    app.config["TEMPLATES_AUTO_RELOAD"] = True

    app.jinja_env.auto_reload = True
    app.jinja_env.trim_blocks = True
    app.jinja_env.lstrip_blocks = True
    app.jinja_env.keep_trailing_newline = True

    app.debug = True

    return app


def create_logger(app):
    formatter = logging.Formatter(
        "[%(asctime)s] {%(pathname)s:%(lineno)d} %(levelname)s - %(message)s")

    level = logging.INFO
    envlevel = os.environ.get('CATALOG_LOG_LEVEL')
    if app.debug == True:
        level = logging.DEBUG
    elif envlevel:
        level = envlevel

    logging.basicConfig(level=level)
    handler = RotatingFileHandler("{}.log".format(
        __name__), maxBytes=1024 * 1024 * 100, backupCount=20)
    handler.setFormatter(formatter)
    handler.setLevel(level)
    app.logger.addHandler(handler)


app = create_app()
create_logger(app)

from catalog import views

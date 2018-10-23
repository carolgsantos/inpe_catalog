FROM python:3-alpine
MAINTAINER Carolina Galvão <carolina.santos@inpe.br> 

RUN apk update
RUN apk add --no-cache alpine-sdk gcc musl-dev mariadb-dev jpeg-dev zlib-dev
RUN apk upgrade -U && \
    apk add --repository http://dl-cdn.alpinelinux.org/alpine/edge/main libressl2.7-libcrypto && \
    apk add gdal-dev --update-cache --repository http://dl-cdn.alpinelinux.org/alpine/edge/testing && \
    rm -fr /var/cache/apk

# Prepare work directory
RUN mkdir -p /app
WORKDIR /app

# Get source and install python requirements
COPY requirements.txt /app
RUN pip install -r requirements.txt

# Expose the Flask port
EXPOSE 5001

# Run the opensearch application
CMD [ "python3", "wsgi.py" ]

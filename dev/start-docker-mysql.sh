#!/bin/bash

CONTAINER_NAME=mysql-dev
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=doc_dash
DB_USERNAME=doc_dash
DB_PASSWORD=doc_dash_2025

if [ "$(docker ps -a -q -f name=$CONTAINER_NAME)" ]; then
  echo "Container '$CONTAINER_NAME' already exists. Starting it ..."
  docker start $CONTAINER_NAME
else
  echo "Creating and starting the container '$CONTAINER_NAME'..."
  docker run --name $CONTAINER_NAME \
    -e MYSQL_ROOT_PASSWORD=$DB_PASSWORD \
    -e MYSQL_DATABASE=$DB_DATABASE \
    -e MYSQL_USER=$DB_USERNAME \
    -e MYSQL_PASSWORD=$DB_PASSWORD \
    -p $DB_PORT:3306 \
    -d mysql:8
fi

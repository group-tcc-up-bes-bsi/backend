#!/bin/bash

DB_USERNAME=doc_dash
DB_PASSWORD=doc_dash_2025
CONTAINER_NAME=mysql-dev

docker exec -it $CONTAINER_NAME mysql -u $DB_USERNAME -p$DB_PASSWORD

docker run --name mysql-container \
  -e MYSQL_ROOT_PASSWORD=root \
  -e MYSQL_DATABASE=tcc_bsi_bes \
  -e MYSQL_USER=user \
  -e MYSQL_PASSWORD=tccbsibes@25 \
  -p 3307:3306 \
  -v "$PWD/../mySQL/init.sql":/docker-entrypoint-initdb.d/init.sql \
  -d mysql:8.0
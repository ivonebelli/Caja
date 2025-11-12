# Comandos para hacer andar en development

Tener docker instalado
En cmd en la carpeta donde esta el proyecto, sino no anda:

docker run --name mariadb_dev -e MARIADB_ROOT_PASSWORD=my_root_secret -e MARIADB_DATABASE=dev_db -e MARIADB_USER=app_user -e MARIADB_PASSWORD=app_secret -p 3306:3306 -v ./migrations:/docker-entrypoint-initdb.d -d mariadb:latest

DB_HOST=localhost
DB_PORT=3306
DB_USER=app_user
DB_PASSWORD=app_secret
DB_DATABASE=dev_db

docker exec -it mariadb_dev bash
sh -c 'mariadb -u app_user -p'

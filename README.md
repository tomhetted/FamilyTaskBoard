# Family Task Board

Запуск dev окружения:
1. docker-compose up -d    # поднимет MySQL
2. mvn -Dspring.profiles.active=dev spring-boot:run
3. Открыть http://localhost:8080/

Примечание:
- Миграции Flyway будут лежать в src/main/resources/db/migration (этап B).
- Для разработки можно временно использовать spring.jpa.hibernate.ddl-auto=update.

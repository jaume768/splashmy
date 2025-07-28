-- Initialize the database
CREATE DATABASE IF NOT EXISTS style_transfer_db;
USE style_transfer_db;

-- Grant privileges to the Django user
GRANT ALL PRIVILEGES ON style_transfer_db.* TO 'django_user'@'%';
FLUSH PRIVILEGES;

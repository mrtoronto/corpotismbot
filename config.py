import os

# Generate a random secret key if not set in environment
SECRET_KEY = os.environ.get('SECRET_KEY', os.urandom(24))

# Admin password - should be set through environment variable in production
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'SUPPORTIV_BRINGS_US_TOGETHER') 
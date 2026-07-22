# Production-ready Dockerfile for Laravel + React (Vite) + Python ML Application
FROM php:8.4-apache

# Set working directory
WORKDIR /var/www/html

# Set environment variables
ENV APACHE_DOCUMENT_ROOT=/var/www/html/public \
    DEBIAN_FRONTEND=noninteractive \
    PIP_BREAK_SYSTEM_PACKAGES=1

# Install system dependencies, PHP extensions, Python 3, Python 3 pip, Node.js, and npm
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    unzip \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    libzip-dev \
    zip \
    python3 \
    python3-pip \
    python3-dev \
    nodejs \
    npm \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install PHP extensions required by Laravel
RUN docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd zip

# Get latest Composer from official image
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Configure Apache DocumentRoot to point to /var/www/html/public
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf \
    && sed -ri -e 's!/var/www/!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/conf-available/*.conf /etc/apache2/apache2.conf

# Enable Apache mod_rewrite
RUN a2enmod rewrite

# Copy application files into the container
COPY . /var/www/html

# Install PHP dependencies via Composer
RUN composer install --no-interaction --prefer-dist --optimize-autoloader --ignore-platform-req=php

# Install Node dependencies and build frontend assets using Vite
RUN npm ci || npm install \
    && npm run build

# Install Python machine learning requirements
RUN pip install --no-cache-dir --root-user-action=ignore -r requirements.txt

# Set permissions for Laravel storage and cache directories
RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache \
    && chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

# Expose port 80
EXPOSE 80

# Start Apache web server in the foreground
CMD ["apache2-foreground"]

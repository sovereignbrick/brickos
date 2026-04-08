# BrickOS Custom Gatus Status Page
#
# Based on official Gatus image with BrickOS branding overlay.
# Since Gatus frontend is a React SPA built into the Go binary,
# we can't easily modify the assets. Instead we use an nginx
# reverse proxy with sub_filter to inject custom CSS/favicon.

FROM nginx:alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy BrickOS assets
COPY assets/ /usr/share/nginx/html/brickos/

EXPOSE 80

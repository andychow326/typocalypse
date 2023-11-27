FROM nginx:alpine
WORKDIR /usr/share/nginx/html
RUN rm -rf ./*
RUN rm /etc/nginx/conf.d/default.conf
COPY ./nginx.conf /etc/nginx/conf.d
COPY build/* .
EXPOSE 80/tcp
ENTRYPOINT ["nginx", "-g", "daemon off;"]

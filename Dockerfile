FROM alpine:3.15.0

RUN apk --no-cache --update add git curl wget openjdk11 nodejs && rm -vrf /var/cache/apk/*

COPY index.js package.json entrypoint.sh /

ENTRYPOINT ["/entrypoint.sh"]

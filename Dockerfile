FROM node:9-alpine

USER node:node

COPY --chown=node:node *.j* /neeo-driver-mystrom/
COPY --chown=node:node config /neeo-driver-mystrom/config
COPY --chown=node:node lib /neeo-driver-mystrom/lib

RUN cd /neeo-driver-mystrom && \
    npm install

VOLUME ["/neeo-driver-mystrom/config"]

WORKDIR /neeo-driver-mystrom
CMD [ "node", "index.js" ]

EXPOSE 6336 7979/UDP
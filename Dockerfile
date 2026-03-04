FROM artifactory.app.iaf/maav-devops-docker-dev-local/base-images:nodejs-14.21.3

WORKDIR /usr/src/app

COPY package*.json yarn.lock ./
RUN npm install -g yarn@1.*.* \
    && yarn install --update-checksums

COPY . .

EXPOSE 3002

CMD [ "npm", "start" ]

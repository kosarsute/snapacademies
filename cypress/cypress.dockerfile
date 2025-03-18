FROM cypress/included:12.8.1

ARG UID=1001
ARG GID=1001

RUN groupadd -g $GID appgroup && \
    useradd -m -u $UID -g appgroup appuser

RUN mkdir -p cypress/videos \
             cypress/screenshots \
             cypress/downloads && \
    chown -R $UID:$GID /home/appuser

WORKDIR /home/appuser

COPY package.json .
RUN npm install --legacy-peer-deps

COPY cypress.config.js .
COPY cypress/ ./cypress/

ENV CYPRESS_VIDEOS_FOLDER=/home/appuser/cypress/videos \
    CYPRESS_SCREENSHOTS_FOLDER=/home/appuser/cypress/screenshots

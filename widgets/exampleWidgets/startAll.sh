#!/bin/bash
./grailsw clean
screen -dmS grailsHttp ./grailsw -Dserver.port=8090 run-app
screen -dmS grailsHttps ./grailsw -Dserver.port=8091 run-app -Dgrails.server.port.https=8444 --https

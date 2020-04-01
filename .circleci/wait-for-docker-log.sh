#!/usr/bin/env bash

# ************************************************
# Wait untill given string appears in docker logs*
# ************************************************

set -e
cd "$(dirname "$0")"

name=$1
phrase=$2

while ! docker logs $name | grep -c "${phrase}";do 
  echo "Looking for phrase \"${phrase}\"..."
  sleep 2
done


echo "\"${phrase}\" FOUND in docker container ${name}!"
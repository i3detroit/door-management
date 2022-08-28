#!/bin/bash
set -euo pipefail

# shellcheck disable=SC2120
help () {
    # if arguments, print them
    [ $# == 0 ] || echo "$*"

  cat <<EOF
Usage: $(basename "${BASH_SOURCE[0]}") -h
       $(basename "${BASH_SOURCE[0]}") <mqtt_host> <mqtt_port> <door_name> <door_topic>
    listen for door for 60s and print "<door_name> alive" or "<door_name> dead"
Returns 0 on alive, 1 on dead
Available options:
  -h, --help       display this help and exit
EOF

    # if args, exit 1 else exit 0
    [ $# == 0 ] || exit 1
    exit 0
}

msg() {
    echo >&2 -e "${1-}"
}

die() {
    local msg=$1
    local code=${2-1} # default exit status 1
    msg "$msg"
    exit "$code"
}

# getopt short options go together, long options have commas
TEMP=$(getopt -o h --long help -n "$0" -- "$@")
#shellcheck disable=SC2181
if [ $? != 0 ] ; then
    die "something wrong with getopt"
fi
eval set -- "$TEMP"

while true ; do
    case "$1" in
        -h|--help) help; exit 0; shift ;;
        --) shift ; break ;;
        *) die "issue parsing args, unexpected argument '$0'!" ;;
    esac
done

mqttHost=$1
mqttPort=$2
door=$3
doorTopic=$4

function getDoor {
    mqttHost=$1
    mqttPort=$2
    door=$3
    doorTopic=$4
    mosquitto_sub -h "$mqttHost" -p "$mqttPort" -t "$doorTopic" -C 1 | while read -r payload; do
        if [[ "$door" == "$(echo "$payload" | jq -r ".door")" ]]; then
            echo "$door alive"
        fi
    done
    exit 0
}
export -f getDoor

exitStatus=0
timeout 62 bash -c "getDoor '$mqttHost' '$mqttPort' '$door' '$doorTopic'"  || exitStatus=$?
if [[ "$exitStatus" -eq 124 ]]; then
    echo "$door dead"
    exit 1
fi

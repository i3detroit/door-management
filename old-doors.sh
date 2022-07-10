#!/bin/bash
set -euo pipefail
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"


doors=$(jq -c '.doors[]' "$DIR/config.json")
mqttHost=$(jq -r '.mqtt.server' "$DIR/config.json")
mqttPort=$(jq -r '.mqtt.port' "$DIR/config.json")

# shellcheck disable=SC2120
help () {
    # if arguments, print them
    [ $# == 0 ] || echo "$*"

  cat <<EOF
Usage: $(basename "${BASH_SOURCE[0]}") -h
       $(basename "${BASH_SOURCE[0]}") add <key> <name> <pin>
       $(basename "${BASH_SOURCE[0]}") remove> <key>
    add/remove users to fork door controllers over mqtt
    users cofig.json in dir of script
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

addUser() {
    key=$1
    name=$2
    pin=$3
    # 0=disabled 1=enabled 99=admin
    acctype=1
    validUntil=4200000000 #year 2103, probably fine
    for door in $doors; do
        doorip=$(echo "$door" | jq -r '.ip');
        doortopic=$(echo "$door" | jq -r '.topic');
        cmd=$(jq -cn \
            --arg key "$key" \
            --arg name "$name" \
            --arg pin "$pin" \
            --arg doorip "$doorip" \
            --arg acctype "$acctype" \
            --arg validUntil "$validUntil" \
            '{cmd:"adduser", doorip:$doorip, user:$name, uid:$key, acctype:$acctype, validuntil: $validUntil, pin: $pin}')
        echo "$cmd"
        echo "$doortopic"
        mosquitto_pub -h "$mqttHost" -p "$mqttPort" -t "$doortopic" -m "$cmd"
    done
}
removeUser() {
    key=$1
    echo "not implemented sorry"
    exit 5
    for doorip in $doors; do
        jq -cn \
            --arg key "$key" \
            --arg name "$name" \
            --arg pin "$pin" \
            --arg doorip "$doorip" \
            --arg acctype "$acctype" \
            --arg validUntil "$validUntil" \
            '{cmd:"adduser", doorip:$doorip, user:$name, uid:$key, acctype:$acctype, validuntil: $validUntil, pin: $pin}'
    done
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

operation=${1:-}
if [ -z "$operation" ]; then
    help "need to pass in operation(add/remove)"
fi

key=${2:-}
if [ -z "$key" ]; then
    help "need to pass in key"
fi

if [ "$operation" == "add" ]; then
    name=${3:-}
    if [ -z "$name" ]; then
        help "need to pass in name for add"
    fi
    pin=${4:-}
    if [ -z "$pin" ]; then
        help "need to pass in pin for add"
    fi

    addUser "$key" "$name" "$pin"
elif [ "$operation" == "remove" ]; then
    removeUser "$key"
else
    help "invalid operation, should be add or remove"
fi

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
    <key> should be decimal without leading zeroes, what is printed on the blue key fobs
Available options:
  -h, --help        display this help and exit
  -H, --hex         input <key> as hex not decimal
      --ignore-dead ignore if doors are offline
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
TEMP=$(getopt -o hH --long help,hex,ignore-dead -n "$0" -- "$@")
#shellcheck disable=SC2181
if [ $? != 0 ] ; then
    die "something wrong with getopt"
fi
eval set -- "$TEMP"

hex=false
ignoreDead=false
while true ; do
    case "$1" in
        -h|--help) help; exit 0; shift ;;
        -H|--hex) hex=true ; shift ;;
        --ignore-dead) ignoreDead=true ; shift ;;
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


# if hex input, parse to decimal
if [ "$hex" = true ]; then
    key="$(perl -le "print hex('$key');")"
fi

# run doorHeartbeat.sh for each door, it will say if door is alive or dead
# collect PID in pids array
pids=()
doorNames=()
for door in $doors; do
    doorName=$(echo "$door" | jq -r '.hostname');
    doorTopic=$(echo "$door" | jq -r '.topic');
    doorNames+=("$doorName")
    msg "listening for $doorName..."
    ./doorHeartbeat.sh "$mqttHost" "$mqttPort" "$doorName" "$doorTopic/sync" >/dev/null & pids+=($!)
done

# wait for each pid, save return code in rets array
rets=()
for pid in ${pids[*]}; do
    ret=0
    wait "$pid"  || ret=$?
    rets+=("$ret")
done

# check if any doors are dead
dead=false
for i in "${!rets[@]}"; do
    if [[ "${rets[$i]}" -ne 0 ]]; then
        msg "door ${doorNames[$i]} is dead"
        dead=true
    fi
done

if [ "$dead" = true ] && [ "$ignoreDead" = false ]; then
    die "some doors were offline, please fix or --ignore-dead"
fi

msg "all good, sending"

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

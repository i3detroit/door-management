#!/usr/bin/env python3
import paho.mqtt.client as mqtt
from csv import DictWriter
from datetime import datetime
import json
from os.path import isfile

fieldnames = ("time","isKnown","access","username","uid","hostname")

def on_connect(client, userdata, flags, rc):
    print(f'Connected with result code {rc}')

    global config
    for door in config['doors']:
        topic = f"{door['topic']}/send"
        print(f'subscribed to topic {topic}')
        client.subscribe(topic)

def on_message(client, userdata, msg):
    data = json.loads(msg.payload)
    if data['type'] == 'access':
        print(data)
        data['time'] = datetime.fromtimestamp(data['time'])
        print(data)
        print(f"{data['time']}: {data['username']} ({data['uid']}, {data['access']}) at {data['hostname']}")
        with open('access.csv','a',newline='') as csvfile:
            log = DictWriter(csvfile,fieldnames=fieldnames,extrasaction='ignore')
            log.writerow(data)

def int_to_uid(uid_int):
    upper = (uid_int & 0xFFFF0000) >> 16
    lower = uid_int & 0xFFFF
    return f'{upper:05d}:{lower:05d}'

def main():
    if not isfile('access.csv'):
        with open('access.csv','a',newline='') as csvfile:
            log = DictWriter(csvfile,fieldnames=fieldnames,extrasaction='ignore')
            log.writeheader()

    global config
    with open('config.json') as json_file:
        config = json.load(json_file)

    client = mqtt.Client()
    client.on_connect = on_connect
    client.on_message = on_message

    print(f"connecting to {config['mqtt']['server']}:{config['mqtt']['port']}")
    client.connect(config['mqtt']['server'], config['mqtt']['port'])

    client.loop_forever()
if __name__ == "__main__":
    main()

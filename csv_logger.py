import configparser
import paho.mqtt.client as mqtt
from csv import DictWriter
from datetime import datetime
import json
from os.path import isfile
import logging

fieldnames = ("time","isKnown","access","username","uid","door")

def on_connect(client, userdata, flags, rc):
    logger = logging.getLogger('on_connect')
    logger.info(f'Connected with result code {rc}')

    global config
    for section in config.sections():
        if section.endswith('door'):
            topic = f"{config[section]['topic']}/send"
            logger.info(f'subscribed to topic {topic}')
            client.subscribe(topic)

def on_message(client, userdata, msg):
    logger = logging.getLogger('on_message')
    data = json.loads(msg.payload)
    logger.debug(f'message: {data}')
    if data['cmd'] == 'log' and data['type'] == 'access':
        data['time'] = datetime.fromtimestamp(data['time'])
        data['uid'] = int_to_uid(int(data['uid']))
        logger.info(f"{data['time']}: {data['username']} ({data['uid']}, {data['access']}) at {data['door']}")
        with open('access.csv','a',newline='') as csvfile:
            log = DictWriter(csvfile,fieldnames=fieldnames,extrasaction='ignore')
            log.writerow(data)

def int_to_uid(uid_int):
    upper = (uid_int & 0xFFFF0000) >> 16
    lower = uid_int & 0xFFFF
    return f'{upper:05d}:{lower:05d}'

def main():
    logging.basicConfig(level=logging.DEBUG,format='%(asctime)s\t%(name)s\t%(levelname)s\t%(message)s\t{%(filename)s:%(funcName)s:%(lineno)d}')
    logger = logging.getLogger('main')
    if not isfile('access.csv'):
        with open('access.csv','a',newline='') as csvfile:
            log = DictWriter(csvfile,fieldnames=fieldnames,extrasaction='ignore')
            log.writeheader()

    global config
    config = configparser.ConfigParser()
    config.read('config.ini')

    client = mqtt.Client()
    client.on_connect = on_connect
    client.on_message = on_message

    logger.info(f"connecting to {config['mqtt']['server']}:{config.getint('mqtt','port')}")
    client.connect(config['mqtt']['server'],config.getint('mqtt','port'))

    client.loop_forever()

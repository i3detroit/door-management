import paho.mqtt.client as mqtt
import configparser
import json
import datetime
import logging
import sqlite3

lastTimestamp = datetime.datetime.min

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
ch = logging.StreamHandler()
ch.setLevel(logging.DEBUG)
ch.setFormatter(formatter)
fh = logging.FileHandler('door.log')
fh.setLevel(logging.DEBUG)
fh.setFormatter(formatter)
logger.addHandler(ch)
logger.addHandler(fh)

conn = sqlite3.connect('door.db')
cur = conn.cursor()

def on_connect(client, userdata, flags, rc):
    logger.info('Connected with result code %d',rc)
    client.subscribe("#")

def on_message(client, userdata, msg):
    data = json.loads(msg.payload)
    timestamp = datetime.datetime.fromtimestamp(data['time'])
    if data['type']=='heartbeat':
        logger.debug('%s: heartbeat at %s, %s since last',msg.topic,timestamp,timestamp - lastTimestamp)
        lastTimestamp = timestamp
        cur.execute('INSERT INTO heartbeat VALUES (?, ?)',(msg.topic,timestamp))
        conn.commit()
    elif data['type']=='access':
        isKnown = data['isKnown']=='true'
        accessType = data['access']
        username = data['username']
        uid = int(data['uid'])
        if isKnown:
            if accessType == 'Always' or accessType == 'Admin':
                logger.info('%s: %s (%d:%s) opened the door',msg.topic,username,uid,accessType)
            else:
                logger.warning('%s: %s (%d:%s) tried the door!',msg.topic,username,uid,accessType)
        else:
            logger.warning('%s: Unknown %s (%d:%s) tried the door!',msg.topic,username,uid,accessType)
        cur.execute('INSERT INTO accesses VALUES (?, ?, ?, ?, ?, ?)',(msg.topic,timestamp,uid,username,accessType,isKnown))
        conn.commit()
    elif data['type']=='boot':
        logger.info('%s: Unit booted, connected to %s at %s',msg.topic,data['Wifi SSID'],data['Local IP'])
        cur.execute('INSERT INTO boot VALUES (?, ?, ?, ?)',(msg.topic,timestamp,data['Wifi SSID'],data['Local IP']))
        conn.commit()
    else:
        logger.warning('%s: Unknown message: "%s"',msg.topic,msg.payload)

def main():
    global config
    config = configparser.ConfigParser()
    config.read('config.ini')

    client = mqtt.Client()
    client.on_connect = on_connect
    client.on_message = on_message
    client.username_pw_set(username=config.get('mqtt','username'),password=config.get('mqtt','password'))
    client.connect(config.get('mqtt','server'),config.getint('mqtt','port'))
    client.loop_forever()


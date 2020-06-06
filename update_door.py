from datetime import datetime
import math
import click
import shelve
from csv import DictReader
from enum import IntEnum
import configparser
import paho.mqtt.client as mqtt
from time import sleep
import json

MAX_DATE = datetime(2038, 1, 18, 22, 14, 7)
MIN_DATE = datetime(1970, 1, 1, 0, 0, 0)

class AccType(IntEnum):
    DISABLED = 0
    ALWAYS = 1
    EXPIRED = 2
    ADMIN = 99
    DENIED = 127

class User:
    def __init__(self,
                    name,
                    uid,
                    pin,
                    acctype=AccType.ALWAYS,
                    validuntil=MAX_DATE):
        self.username = name
        self.uid = uid
        self.pin = pin
        if isinstance(acctype,AccType):
            self.acctype = acctype
        else:
            self.acctype = AccType[acctype]
        self.validuntil = validuntil

    def uid_to_int(self):
        # convert 1023:65535 format to integer format
        left,right = map(int,self.uid.split(':'))
        return int(left * math.pow(2,16) + right)

    def __str__(self):
        return f'{self.username} ({self.uid} = {self.pin:04d}) {self.acctype.name} ({self.acctype}) expires {self.validuntil}'

    def mqtt_add(self):
        return f"{{cmd:'adduser', doorip:'%s', user:'{self.username}', uid:'{self.uid_to_int()}', 'acctype':{self.acctype}, 'validuntil':{self.validuntil.timestamp():.0f}, 'pin':'{self.pin:04d}'}}"

    def json_dict(self):
        return  {
                    'uid': f'{self.uid_to_int()}',
                    'username': self.username,
                    'acctype': self.acctype.value,
                    'validuntil': int(self.validuntil.timestamp()),
                    'pin': f'{self.pin:04d}'
                }

class Door:
    def __init__(self,name,ip,topic):
        self.name = name
        self.ip = ip
        self.topic = topic

@click.group()
def cli():
    '''cli entry point'''
    click.echo('i3Detroit Door Access System')
    
    global config
    config = configparser.ConfigParser()
    config.read('config.ini')

    global doors
    doors = []
    for section in config.sections():
        if section.endswith('door'):
            doors.append(Door(section,config[section]['ip'],config[section]['topic']))

    global client
    client = mqtt.Client()
    client.connect(config['mqtt']['server'],config.getint('mqtt','port'))
    #click.echo(f'connecting to {config["mqtt"]["server"]}:{config.getint("mqtt","port")}')
    client.loop_start()

@cli.command()
@click.argument('name',required=True)
@click.argument('uid',required=True)
@click.option('--pin',type=int,required=True,prompt='PIN (four digits)', hide_input=True,
              confirmation_prompt=True)
@click.option('--type','acctype',required=False,default="ALWAYS",type=
    click.Choice(tuple(AccType.__members__.keys())))
@click.option('--planend',required=False,default=MAX_DATE.isoformat(sep=' '),type=click.DateTime())
def add(name,uid,pin,acctype,planend):
    '''add user to doors'''
    u = _add_user(name,uid,pin,acctype,planend)
    click.echo(f'adding user {u}')

@cli.command()
@click.argument('uid',required=True)
def remove(uid):
    '''remove user from doors'''
    with shelve.open('users') as users:
        # `esp-rfid` actually does not support single user remove...
        u = _add_user(users[uid].username,uid,users[uid].pin,AccType.DISABLED,MIN_DATE)
        click.echo(f'removing user {u}')

@cli.command()
@click.argument('uid',required=True)
def enable(uid):
    '''remove user from doors'''
    with shelve.open('users') as users:
        u = _add_user(users[uid].username,uid,users[uid].pin,AccType.ALWAYS,MAX_DATE)
        click.echo(f'enabling user {u}')

@cli.command()
@click.argument('filename',required=True,type=click.Path(exists=True))
def intake(filename):
    '''import users from CSV file'''
    click.echo(f'importing users from {click.format_filename(filename)}')
    json_users = {}
    json_users['type'] = 'esp-rfid-userbackup'
    json_users['version'] = 'v0.6'
    json_users['list'] = []
    with open(filename,'r') as csvfile:
        csv = DictReader(csvfile)
        for row in csv:
            u = _add_user(row['Name'],
                row['Serial'],
                int(row['PIN']),
                AccType(int(row['acctype'])).name,
                MAX_DATE)
            json_users['list'].append(u.json_dict())
            click.echo(f'\tintake {u}')
    with open('users.json','w',encoding='utf8') as json_file:           
        json.dump(json_users,json_file,indent=2)

def _add_user(name,uid,pin,acctype,planend):
    '''internal function to add a user'''
    u = User(name,uid,pin,acctype,planend)
    with shelve.open('users') as users:
        users[u.uid] = u
    for door in doors:
        #click.echo(f'writing user to {door.name}')
        client.publish(door.topic,u.mqtt_add()%door.ip)
        sleep(0.1)
    return u
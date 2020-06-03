from datetime import datetime
import math
import click
import shelve
from csv import DictReader
from enum import IntEnum

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
                    validuntil=datetime(2038, 1, 18, 22, 14, 7)):
        self.username = name
        self.uid = uid
        self.pin = pin
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

    def mqtt_delete(self):
        return f"{{cmd:'adduser', doorip:'%s', user:'{self.username}', uid:'{self.uid_to_int()}', 'acctype':{AccType.DISABLED}, 'validuntil':0, 'pin':'{self.pin:04d}'}}"

@click.group()
def cli():
    '''cli entry point'''
    click.echo('i3Detroit Door Access System')

@cli.command()
@click.argument('name',required=True)
@click.argument('uid',required=True)
@click.option('--pin',type=int,required=True,prompt='PIN (four digits)', hide_input=True,
              confirmation_prompt=True)
@click.option('--type','acctype',required=False,default="ALWAYS",type=
    click.Choice(tuple(AccType.__members__.keys())))
@click.option('--planend',required=False,default='2038-01-18 22:14:07',type=click.DateTime())
def add(name,uid,pin,acctype,planend):
    '''add user to doors'''
    u = User(name,uid,pin,acctype,planend)
    with shelve.open('users') as users:
        users[u.uid] = u
    click.echo(f'adding user {u}')
    click.echo(u.mqtt_add()%'10.11.12.126') #TODO send to all doors

@cli.command()
@click.argument('uid',required=True)
def remove(uid):
    '''remove user from doors'''
    with shelve.open('users') as users:
        u = users[uid] 
        click.echo(f'removing user {u}')
        # `esp-rfid` actually does not support single user remove...
        click.echo(u.mqtt_delete()%'10.11.12.126') #TODO send to all doors

@cli.command()
@click.argument('filename',required=True,type=click.Path(exists=True))
def intake(filename):
    '''import users from CSV file'''
    click.echo(f'importing users from {click.format_filename(filename)}')
    with open(filename,'r') as csvfile:
        csv = DictReader(csvfile)
        with shelve.open('users') as users:
            for row in csv:
                u = User(
                    row['Name'],
                    row['Serial'],
                    int(row['PIN']),
                    AccType(int(row['acctype'])).name)
                users[u.uid] = u
                click.echo(f'import user {u}') 
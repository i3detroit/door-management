import configparser
import pickle
import os.path
import sys
from googleapiclient.discovery import build
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
import arrow

# If modifying these scopes, delete the file token.pickle.
SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly']

# Time settings
DAYS_FOR_VALID_ENTRIES = 7  # only look at entries in the last 7 days
DURATION_OF_KEY_EXPIRY = 24 # expire keys after 24 hours of waiver

class Entry(object):
    def __init__(self,row):
        self.timestamp = arrow.get(row[0],'M/D/YYYY H:mm:ss').replace(tzinfo='America/Detroit')

        self.name = row[2].strip()
        self.email = row[1].strip()

        # check all responses are negative
        self.check = True
        for question in range(4,10):
            self.check = self.check and (row[question] == 'No')

        # check agreement to best practices
        self.check = self.check and (row[11] == 'I agree.')
        
        # if we passed the checks, activate key for duration; otherwise, drop.
        if self.check:
            self.expiry = self.timestamp.shift(hours=+DURATION_OF_KEY_EXPIRY)
        else:
            self.expiry = arrow.get(0)
    
    def __str__(self):
        if self.check:
            return f'{self.timestamp} - OK {self.name}, expires {self.expiry.humanize()} ({self.expiry})'
        else:
            return f'{self.timestamp} - NG {self.name}'

def get_credentials():
    creds = None
    # The file token.pickle is created automatically on first auth
    if os.path.exists('token.pickle'):
        with open('token.pickle', 'rb') as token:
            creds = pickle.load(token)
    # If there are no (valid) credentials available, let the user log in.
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(
                'credentials.json', SCOPES)
            creds = flow.run_local_server(port=0)
        # Save the credentials for the next run
        with open('token.pickle', 'wb') as token:
            pickle.dump(creds, token)
    return creds

def get_data(sheet_id,sheet_range):
    service = build('sheets', 'v4', credentials=get_credentials())

    # Call the Sheets API
    sheet = service.spreadsheets()
    result = sheet.values().get(spreadsheetId=sheet_id,
                                range=sheet_range).execute()
    return result.get('values', [])

def main():
    global config
    config = configparser.ConfigParser()
    config.read('config.ini')
    
    waivers = get_data(config['form_response']['id'], config['form_response']['range'])

    waiver_entries = []

    if not waivers:
        print('No data found.')
    else:
        print('Entry\tExpiry\tName:')
        now = arrow.now('America/Detroit')
        for row in waivers:
            # skip waivers older than interest period
            entry_time = arrow.get(row[0],'M/D/YYYY H:mm:ss').replace(tzinfo='America/Detroit')
            if entry_time < now.shift(days=-DAYS_FOR_VALID_ENTRIES):
                continue

            # add entries to list if they are not expired
            entry = Entry(row)
            if entry.expiry > now:
                if entry.check:
                    print(entry)
                else:
                    print(entry,file=sys.stderr)
                waiver_entries.append(entry)

if __name__ == '__main__':
    main()

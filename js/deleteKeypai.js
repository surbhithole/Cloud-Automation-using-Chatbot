
import boto3
import os
#from datetime import timezone
import datetime
import time

client = boto3.client('s3')
def lambda_handler(event, context):
    response = client.list_objects_v2(Bucket='ayan-test-bucket')
    for files in response['Contents']:
        DATE = str(files['LastModified'])
        print files['Key']+ " : "+ DATE
        year= int(DATE[0:4])
        month = int(DATE[5:7])
        date = int(DATE[8:10])
        hour = int(DATE[11:13])
        minute=int(DATE[14:16])
        second=int(DATE[17:19])
        ans = datetime.datetime(year,month,date,hour,minute)
        date_str = int(time.mktime(ans.timetuple()))
        print date_str
        time_interval = date_str + 1800 #1800 = 30 minutes
        print time_interval
        print int(time.time())
        if int(time.time()) > date_str:
            print "deleting " + files['Key']
            response = client.delete_object(Bucket='ayan-test-bucket',Key=files['Key'])



#import boto3

#ec2 = boto3.resource('ec2')
#snapshot = ec2.create_snapshot(VolumeId='vol-0a67ffa1b82283860', Description='snapshotID')
#def lambda_handler(event, context):
#    print snapshot.id
#    snapshot.load()
#    print ""

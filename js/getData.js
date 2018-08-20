import sys
import logging
import pymysql
import os
import httplib
import urllib
import base64
import json
import boto3
logger = logging.getLogger()


rds_host  = os.environ.get("RDS_HOST")
name = os.environ.get("USERNAME")
password = os.environ.get("PASSWORD")
db_name = os.environ.get("DB_NAME")

try:
    conn_sql = pymysql.connect(rds_host, user=name, passwd=password, db=db_name, connect_timeout=5)
except:
    logger.error("ERROR: Unexpected error: Could not connect to MySql instance.")
    sys.exit()

logger.info("SUCCESS: Connection to RDS mysql instance succeeded")

#TODO: modify the below function to just display the keys according to the instance type
def listTableDashboard(event):
    SELECT_QUERY = "select * FROM userInstancedetails WHERE username = '{}'; ".format(event["userId"])
    TableDashboard = []
    dictlist = {}
    with conn_sql.cursor() as cur:
        cur.execute(SELECT_QUERY)
        for row in cur:
            if row[6] == "EC2":
                name = "-"
            else:
                name = row[7]
            if  row[5] == "Openstack":
                securitygroup = "default"
            else:
                securitygroup = row[5]
            dictlist = {
                "INSTANCES": row[6],
                "Name": name,
                "ImageType": row[3],
                "ImageId": row[2],
                "KeyPair": row[4],
                "SecurityGroup": securitygroup,
                "InstanceID": row[1]
            }

            TableDashboard.append(dictlist)
    return {"MachineList": TableDashboard}


def lambda_handler(event, context):
    print event
    return listTableDashboard(event)

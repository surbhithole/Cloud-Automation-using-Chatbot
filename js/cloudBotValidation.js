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
EC2_URL = os.environ.get("EC2_URL")
PORT = os.environ.get("PORT")

logger = logging.getLogger()
logger.setLevel(logging.INFO)

try:
    conn_sql = pymysql.connect(rds_host, user=name, passwd=password, db=db_name, connect_timeout=5, autocommit=True)
    EC2_URL = "{}:{}".format(EC2_URL, '5001')
    conn_EC2 = httplib.HTTPConnection(EC2_URL)    #might change to https
except:
    logger.error("ERROR: Unexpected error: Could not connect to MySql instance.")
    sys.exit()

logger.info("SUCCESS: Connection to RDS mysql instance succeeded")

#TODO: modify the below function to just display the keys according to the instance type
def listKeyPairValidation(event):
    SELECT_QUERY = "select keypair FROM userKeyPair WHERE username = '" + event["userId"] + "' and instancetype='EC2';"
    INSTANCES = []
    with conn_sql.cursor() as cur:
        cur.execute(SELECT_QUERY)
        for row in cur:
            logger.info(row)
            INSTANCES.append(row[0])
    return INSTANCES

def listSecurityGroupValidation(event):
    SELECT_QUERY = "select securitygroupid FROM securityGroup WHERE username = '" + event["userId"] + "';"
    INSTANCES = []
    with conn_sql.cursor() as cur:
        cur.execute(SELECT_QUERY)
        for row in cur:
            logger.info(row)
            INSTANCES.append(row[0])
    return INSTANCES

#TODO: modify the below function to just display the keys according to the instance type
def listKeyPair(event):
    SELECT_QUERY = "select keypair FROM userKeyPair WHERE username = '" + event["userId"] + "' and instancetype='EC2';" #note we need to make modifications here to put custom name and instance type
    print SELECT_QUERY
    INSTANCES = []
    with conn_sql.cursor() as cur:
        cur.execute(SELECT_QUERY)

        if cur.rowcount < 1:
            Message = 'Sorry, You currently dont have any existing key pair.\nKindly Enter an New Key Pair Name'
            instanceKey ='New'
            keyValidatedVal = None
        else:
            for row in cur:
                logger.info(row)
                INSTANCES.append(row[0])

            keyValidatedVal = 'FALSE'
            instanceKey = 'Existing'
            Message = str(INSTANCES)

    response = {
        "sessionAttributes": event['sessionAttributes'],
        "dialogAction": {
            "type": "ElicitSlot",
            "message": {
                "contentType": "PlainText",
                "content": Message
            },
            "slotToElicit": "KeyPair",
            "intentName": event['currentIntent']['name'],
            "slots": {
                'AMIID':event['currentIntent']['slots']['AMIID'],
                'SecurityID':event['currentIntent']['slots']['SecurityID'],
                'typeOfInstance':event['currentIntent']['slots']['typeOfInstance'],
                'instanceKey':instanceKey,
                'instanceCreate':event['currentIntent']['slots']['instanceCreate'],
                'SecurityGroupName':event['currentIntent']['slots']['SecurityGroupName'],
                'KeyPair':event['currentIntent']['slots']['KeyPair'],
                'keyValidated': keyValidatedVal,
                'securityGroupValidated':event['currentIntent']['slots']['securityGroupValidated'],
                'changeConfiguration':event['currentIntent']['slots']['changeConfiguration'],
                'AWSInstanceVariable':event['currentIntent']['slots']['AWSInstanceVariable']
            },
        }
    }
    return response


#TODO: change the code here to add a check for the number of elements in the table for the given user
def listSecurityGroup(event):
    SELECT_QUERY = "select securitygroupid FROM securityGroup WHERE username = '" + event["userId"] + "'";
    INSTANCES = []
    with conn_sql.cursor() as cur:
        cur.execute(SELECT_QUERY)

        if cur.rowcount < 1 :
            Message = "Sorry, You dont have any existing key pair currently, Kindly enter the name for a new key pair"
            securityGroupValidatedVal = None
            SecurityIDVal = 'New'

        else:
            for row in cur:
                logger.info(row)
                INSTANCES.append(row[0])

            securityGroupValidatedVal = 'FALSE'
            Message = str(INSTANCES)
            SecurityIDVal = 'Existing'

    response = {
        "sessionAttributes": event['sessionAttributes'],
        "dialogAction": {
            "type": "ElicitSlot",
            "message": {
                "contentType": "PlainText",
                "content": Message
            },
            "slotToElicit": "SecurityGroupName",
            "intentName": event['currentIntent']['name'],
            "slots": {
                'AMIID':event['currentIntent']['slots']['AMIID'],
                'SecurityID': SecurityIDVal,
                'typeOfInstance':event['currentIntent']['slots']['typeOfInstance'],
                'instanceKey':event['currentIntent']['slots']['instanceKey'],
                'instanceCreate':event['currentIntent']['slots']['instanceCreate'],
                'SecurityGroupName':event['currentIntent']['slots']['SecurityGroupName'],
                'KeyPair':event['currentIntent']['slots']['KeyPair'],
                'keyValidated':'TRUE',
                'securityGroupValidated': securityGroupValidatedVal,
                'changeConfiguration':event['currentIntent']['slots']['changeConfiguration'],
                'AWSInstanceVariable':event['currentIntent']['slots']['AWSInstanceVariable']
            },
        }
    }
    return response

def keyValidatedFalse(event):
    response = {
        "sessionAttributes": event['sessionAttributes'],
        "dialogAction": {
            "type": "ElicitSlot",
            "message": {
                "contentType": "PlainText",
                "content": "Its not an existing Key pair."
            },
            "slotToElicit": "KeyPair",
            "intentName": event['currentIntent']['name'],
            "slots": {
                'AMIID':event['currentIntent']['slots']['AMIID'],
                'SecurityID':event['currentIntent']['slots']['SecurityID'],
                'typeOfInstance':event['currentIntent']['slots']['typeOfInstance'],
                'instanceKey':event['currentIntent']['slots']['instanceKey'],
                'instanceCreate':event['currentIntent']['slots']['instanceCreate'],
                'SecurityGroupName':event['currentIntent']['slots']['SecurityGroupName'],
                'KeyPair':event['currentIntent']['slots']['KeyPair'],
                'keyValidated':'FALSE',
                'securityGroupValidated':event['currentIntent']['slots']['securityGroupValidated'],
                'changeConfiguration':event['currentIntent']['slots']['changeConfiguration'],
                'AWSInstanceVariable':event['currentIntent']['slots']['AWSInstanceVariable']
            },
        }
    }
    return response

def keyValidatedTrue(event):
    response = {
        "sessionAttributes": event['sessionAttributes'],
        "dialogAction": {
            "type": "Delegate",
            "slots": {
                'AMIID':event['currentIntent']['slots']['AMIID'],
                'SecurityID':event['currentIntent']['slots']['SecurityID'],
                'typeOfInstance':event['currentIntent']['slots']['typeOfInstance'],
                'instanceKey':event['currentIntent']['slots']['instanceKey'],
                'instanceCreate':event['currentIntent']['slots']['instanceCreate'],
                'SecurityGroupName':event['currentIntent']['slots']['SecurityGroupName'],
                'KeyPair':event['currentIntent']['slots']['KeyPair'],
                'keyValidated':'TRUE',
                'securityGroupValidated':event['currentIntent']['slots']['securityGroupValidated'],
                'changeConfiguration':event['currentIntent']['slots']['changeConfiguration'],
                'AWSInstanceVariable':event['currentIntent']['slots']['AWSInstanceVariable']
            },
        }
    }
    return response

def securityValidatedFalse(event):
    response = {
        "sessionAttributes": event['sessionAttributes'],
        "dialogAction": {
            "type": "ElicitSlot",
            "message": {
                "contentType": "PlainText",
                "content": "Its not an existing security group."
            },
            "slotToElicit": "SecurityGroupName",
            "intentName": event['currentIntent']['name'],
            "slots": {
                'AMIID':event['currentIntent']['slots']['AMIID'],
                'SecurityID':event['currentIntent']['slots']['SecurityID'],
                'typeOfInstance':event['currentIntent']['slots']['typeOfInstance'],
                'instanceKey':event['currentIntent']['slots']['instanceKey'],
                'instanceCreate':event['currentIntent']['slots']['instanceCreate'],
                'SecurityGroupName':event['currentIntent']['slots']['SecurityGroupName'],
                'KeyPair':event['currentIntent']['slots']['KeyPair'],
                'keyValidated':'TRUE',
                'securityGroupValidated':'FALSE',
                'changeConfiguration':event['currentIntent']['slots']['changeConfiguration'],
                'AWSInstanceVariable':event['currentIntent']['slots']['AWSInstanceVariable']
            },
        }
    }
    return response

def securityValidatedTrue(event):
    response = {
        "sessionAttributes": event['sessionAttributes'],
        "dialogAction": {
            "type": "Delegate",
            "slots": {
                'AMIID':event['currentIntent']['slots']['AMIID'],
                'SecurityID':event['currentIntent']['slots']['SecurityID'],
                'typeOfInstance':event['currentIntent']['slots']['typeOfInstance'],
                'instanceKey':event['currentIntent']['slots']['instanceKey'],
                'instanceCreate':event['currentIntent']['slots']['instanceCreate'],
                'SecurityGroupName':event['currentIntent']['slots']['SecurityGroupName'],
                'KeyPair':event['currentIntent']['slots']['KeyPair'],
                'keyValidated':'TRUE',
                'securityGroupValidated':'TRUE',
                'changeConfiguration':event['currentIntent']['slots']['changeConfiguration'],
                'AWSInstanceVariable':event['currentIntent']['slots']['AWSInstanceVariable']
            },
        }
    }
    return response

def nextQuestion(event):
    print "Check for key validated :", event['currentIntent']['slots']['keyValidated']
    response = {
        "sessionAttributes": event['sessionAttributes'],
        "dialogAction": {
            "type": "Delegate",
            "slots": {
                'AMIID':event['currentIntent']['slots']['AMIID'],
                'SecurityID':event['currentIntent']['slots']['SecurityID'],
                'typeOfInstance':event['currentIntent']['slots']['typeOfInstance'],
                'instanceKey':event['currentIntent']['slots']['instanceKey'],
                'instanceCreate':event['currentIntent']['slots']['instanceCreate'],
                'SecurityGroupName':event['currentIntent']['slots']['SecurityGroupName'],
                'KeyPair':event['currentIntent']['slots']['KeyPair'],
                'keyValidated':event['currentIntent']['slots']['keyValidated'],
                'securityGroupValidated':event['currentIntent']['slots']['securityGroupValidated'],
                'changeConfiguration':event['currentIntent']['slots']['changeConfiguration'],
                'AWSInstanceVariable':event['currentIntent']['slots']['AWSInstanceVariable']
            },
        }
    }
    return response


def changeKeyConfiguration(event):
    response = {
        "sessionAttributes": {
            'changeConfiguration':None,
            'instanceCreate':None
        },
        "dialogAction": {
            "type": "ConfirmIntent",
            "message": {
                "contentType": "PlainText",
                "content": "Okay, so you want to change the Key Pair"
            },
            "intentName": event['currentIntent']['name'],
            "slots": {
                'AMIID':event['currentIntent']['slots']['AMIID'],
                'SecurityID':event['currentIntent']['slots']['SecurityID'],
                'typeOfInstance':event['currentIntent']['slots']['typeOfInstance'],
                'instanceKey':None,
                'instanceCreate':None,
                'SecurityGroupName':event['currentIntent']['slots']['SecurityGroupName'],
                'KeyPair':None,
                'keyValidated':'FALSE',
                'securityGroupValidated':'TRUE',
                'changeConfiguration':None,
                'AWSInstanceVariable':event['currentIntent']['slots']['AWSInstanceVariable']
            },
        }
    }
    return response

def changeSecurityConfiguration(event):
    response = {
        "sessionAttributes": {
            'changeConfiguration':None,
            'instanceCreate':None
        },
        "dialogAction": {
            "type": "ConfirmIntent",
            "message": {
                "contentType": "PlainText",
                "content": "Okay, so you want to change the Security Group ID"
            },
            "intentName": event['currentIntent']['name'],
            "slots": {
                'AMIID':event['currentIntent']['slots']['AMIID'],
                'SecurityID':None,
                'typeOfInstance':event['currentIntent']['slots']['typeOfInstance'],
                'instanceKey':event['currentIntent']['slots']['instanceKey'],
                'instanceCreate':None,
                'SecurityGroupName':None,
                'KeyPair':event['currentIntent']['slots']['KeyPair'],
                'keyValidated':'TRUE',
                'securityGroupValidated':'FALSE',
                'changeConfiguration':None,
                'AWSInstanceVariable':event['currentIntent']['slots']['AWSInstanceVariable']
            },
        }
    }
    return response

def changeAMIIDConfiguration(event):
    response = {
        "sessionAttributes": {
            'changeConfiguration':None,
            'instanceCreate':None
        },
        "dialogAction": {
            "type": "ConfirmIntent",
            "message": {
                "contentType": "PlainText",
                "content": "Okay, so you want to change the AMI ID"
            },
            "intentName": event['currentIntent']['name'],
            "slots": {
                'AMIID':None,
                'SecurityID':event['currentIntent']['slots']['SecurityID'],
                'typeOfInstance':event['currentIntent']['slots']['typeOfInstance'],
                'instanceKey':event['currentIntent']['slots']['instanceKey'],
                'instanceCreate':None,
                'SecurityGroupName':event['currentIntent']['slots']['SecurityGroupName'],
                'KeyPair':event['currentIntent']['slots']['KeyPair'],
                'keyValidated':'TRUE',
                'securityGroupValidated':'TRUE',
                'changeConfiguration':None,
                'AWSInstanceVariable':event['currentIntent']['slots']['AWSInstanceVariable']
            },
        }
    }
    return response

def changeTypeConfiguration(event):
    response = {
        "sessionAttributes": {
            'changeConfiguration':None,
            'instanceCreate':None
        },
        "dialogAction": {
            "type": "ConfirmIntent",
            "message": {
                "contentType": "PlainText",
                "content": "Okay, so you want to change the Machine Type"
            },
            "intentName": event['currentIntent']['name'],
            "slots": {
                'AMIID':event['currentIntent']['slots']['AMIID'],
                'SecurityID':event['currentIntent']['slots']['SecurityID'],
                'typeOfInstance':None,
                'instanceKey':event['currentIntent']['slots']['instanceKey'],
                'instanceCreate':None,
                'SecurityGroupName':event['currentIntent']['slots']['SecurityGroupName'],
                'KeyPair':event['currentIntent']['slots']['KeyPair'],
                'keyValidated':'TRUE',
                'securityGroupValidated':'TRUE',
                'changeConfiguration':None,
                'AWSInstanceVariable':event['currentIntent']['slots']['AWSInstanceVariable']
            },
        }
    }
    return response

def wrongInput(event):
    response = {
        "sessionAttributes": event['sessionAttributes'],
        "dialogAction": {
            "type": "ConfirmIntent",
            "message": {
                "contentType": "PlainText",
                "content": "Okay, you really want to change the configuration"
            },
            "intentName": event['currentIntent']['name'],
            "slots": {
                'AMIID':event['currentIntent']['slots']['AMIID'],
                'SecurityID':event['currentIntent']['slots']['SecurityID'],
                'typeOfInstance':event['currentIntent']['slots']['typeOfInstance'],
                'instanceKey':event['currentIntent']['slots']['instanceKey'],
                'instanceCreate':None,
                'SecurityGroupName':event['currentIntent']['slots']['SecurityGroupName'],
                'KeyPair':event['currentIntent']['slots']['KeyPair'],
                'keyValidated':'TRUE',
                'securityGroupValidated':'TRUE',
                'changeConfiguration':None,
                'AWSInstanceVariable':event['currentIntent']['slots']['AWSInstanceVariable']
            },
        }
    }
    return response

def changeConfiguration(event):
    slot_type = event['currentIntent']['slots']['changeConfiguration']
    if slot_type == 'instanceKey':
        return changeKeyConfiguration(event)
    elif slot_type == 'SecurityID':
        return changeSecurityConfiguration(event)
    elif slot_type == 'AMIID':
        return changeAMIIDConfiguration(event)
    elif slot_type == 'typeOfInstance':
        return changeTypeConfiguration(event)
    else:
        return wrongInput(event)


def createInstance(event):
    instance_id = createUserInstance(event)
    response = {
        "sessionAttributes": event['sessionAttributes'],
        "dialogAction": {
            "type": "Close",
            "fulfillmentState": "Fulfilled",
            "message": {
                "contentType": "PlainText",
                "content": instance_id
            },
        }
    }
    return response




#Below function has been modified by surbhi and Ashish on May6th 2019 to add functionality to list instances for a user according to the instance type
def listInstance(event):
    myusername = event["userId"]
    customInstanceType = event["currentIntent"]["slots"]["listInstance"]

    print customInstanceType

    INSTANCES = []
    SELECT_QUERY = "SELECT name, instanceid,imagetype, imageid,securitygroup, keypair,instancetype FROM userInstancedetails WHERE username='" + myusername +  "' AND instancetype='" + customInstanceType + "';"
    print SELECT_QUERY
    with conn_sql.cursor() as cur:
        cur.execute(SELECT_QUERY)

        if cur.rowcount < 1:
            respdata = "Sorry, you don't have any instances of the given Instance type currently"
        else:
            for row in cur:
                logger.info(row)

                #we need to manipulate the code here to pass on the data to the front in a format
                obj =   {
                            "name" : row[0],
                            "instance id" : row[1]
                            #"image type" : row[2]
                            #"instance type" : row[6]
                        }

                INSTANCES.append(obj)


            respdata = "Here is the list of your " + customInstanceType + "instances       " + str(INSTANCES)

    response = {
        "sessionAttributes": event['sessionAttributes'],
        "dialogAction": {
            "type": "Close",
            "fulfillmentState": "Fulfilled",
            "message": {
                "contentType": "PlainText",
                "content": respdata
            },
        }
    }

    return response

def terminateListInstance(event):
    INSTANCES = []
    SELECT_QUERY = "SELECT instanceid,imagetype, imageid FROM userInstancedetails WHERE username = '" + event['userId'] + "' AND instancetype='" + event['currentIntent']['slots']['InstanceTypeTerminate'] + "';"
    with conn_sql.cursor() as cur:
        cur.execute(SELECT_QUERY)

        if cur.rowcount < 1:
            response =  {
                            "sessionAttributes": event['sessionAttributes'],
                            "dialogAction": {
                                "type": "Close",
                                "fulfillmentState": "Fulfilled",
                                "message": {
                                    "contentType": "PlainText",
                                    "content": "Sorry, You currently don't have any instances of the given type to be terminated"
                                },
                            }
                        }
        else:
            for row in cur:
                logger.info(row)
                INSTANCES.append(row)

            response = {
                "sessionAttributes": event['sessionAttributes'],
                "dialogAction": {
                    "type": "ElicitSlot",
                    "slotToElicit": "IdToTerminate",
                    "intentName": event['currentIntent']['name'],
                    "slots": {
                        'IdToTerminate':event['currentIntent']['slots']['IdToTerminate'],
                        'InstanceTypeTerminate':event['currentIntent']['slots']['InstanceTypeTerminate']
                    },
                    "message": {
                        "contentType": "PlainText",
                        "content": "You can choose any one of the below instances to be terminated " + str(INSTANCES)
                    },
                }
            }

    return response

def terminateIntent(event):
    response = {
        "sessionAttributes": event['sessionAttributes'],
        "dialogAction": {
            "type": "Delegate",
            "slots": {
                'IdToTerminate': event['currentIntent']['slots']['IdToTerminate'],
                'InstanceTypeTerminate': event['currentIntent']['slots']['InstanceTypeTerminate']
            }
        }
    }
    return response

def helloworld():
    url = "/Helloworld"
    EC1 = EC2_URL
    print EC1
    conn1 = httplib.HTTPConnection(EC1)
    conn1.request("GET", url)
    response = conn1.getresponse()
    data = response.read()
    data = json.loads(data.decode("utf-8"))
    return data


def createUserInstance(event):
    key = ""

    if event['currentIntent']['slots']['instanceKey'] == "New":
        key = createKeyPair(event)

    if event['currentIntent']['slots']['SecurityID'] == "New":
        createSecurityGroup(event)
    url = "/create_instance/{}/{}/{}/{}".format(event['currentIntent']['slots']['AMIID'], event['currentIntent']['slots']['typeOfInstance'],
        event['currentIntent']['slots']['SecurityGroupName'],event['currentIntent']['slots']['KeyPair'])
    EC1 = EC2_URL
    print EC1
    conn1 = httplib.HTTPConnection(EC1)
    conn1.request("GET", url)
    response = conn1.getresponse()
    data = response.read()
    data = json.loads(data.decode("utf-8"))
    print data['Instance Created']

    INSERT_QUERY = "INSERT INTO userInstancedetails VALUES('{}','{}','{}','{}','{}','{}','{}', '{}');".format(event['userId'],
        data['Instance Created'],event['currentIntent']['slots']['AMIID'], event['currentIntent']['slots']['typeOfInstance'],
        event['currentIntent']['slots']['SecurityGroupName'],event['currentIntent']['slots']['KeyPair'], "EC2", "-")
    with conn_sql.cursor() as cur:
        cur.execute(INSERT_QUERY)
        conn_sql.commit()

    #fulfillment not added ?
    Message = "Your new AWS instance has been created with instance id " + str(data['Instance Created'])

    if key != "":
        Message = Message + " with key pair " + key

    return Message




def createKeyPair(event):
    url = "/createKeyPair/{}".format(event['currentIntent']['slots']['KeyPair'])
    EC1 = EC2_URL
    print EC1
    conn1 = httplib.HTTPConnection(EC1)
    conn1.request("GET", url)
    response = conn1.getresponse()
    data = response.read()
    data = json.loads(data.decode("utf-8"))
    INSERT_QUERY = "INSERT INTO userKeyPair VALUES('{}','{}', '{}');".format(event['userId'], event['currentIntent']['slots']['KeyPair'], "EC2")
    with conn_sql.cursor() as cur:
        cur.execute(INSERT_QUERY)
        conn_sql.commit()

    return data["keyPair"]


def createSecurityGroup(event):
    url = "/createSecurityGroup/{}/{}".format(event['currentIntent']['slots']['SecurityGroupName'],"A_new_security_group_is_created")
    EC1 = EC2_URL
    print EC1
    conn1 = httplib.HTTPConnection(EC1)
    conn1.request("GET", url)
    response = conn1.getresponse()
    data = response.read()
    data = json.loads(data.decode("utf-8"))
    INSERT_QUERY = "INSERT INTO securityGroup VALUES('{}','{}');".format(event['userId'], event['currentIntent']['slots']['SecurityGroupName'])
    with conn_sql.cursor() as cur:
        cur.execute(INSERT_QUERY)
        conn_sql.commit()




def terminateInstance(event):

    deleteRecord = False

    cusInstanceType = event['currentIntent']['slots']['InstanceTypeTerminate']

    if cusInstanceType == "Openstack":
        #Put here the code to delete the given instance in Openstack
        #we need to create an URL to terminate the given openstack instance with the required IDs
        url = "/terminateOSInstance"
        headers = {'Content-type' : 'application/json'}
        params = json.dumps({ "instanceId" : event['currentIntent']['slots']['IdToTerminate']})
        EC1 = EC2_URL
        print EC1
        conn1 = httplib.HTTPConnection(EC1)

        conn1.request("POST", url, params, headers)
        response = conn1.getresponse()
        data = response.read()
        data = json.loads(data)

        if data["status"] == "success":
            deleteRecord = True
        else:
            deleteRecord = False

        Message = data["message"]
    else:
        url = "/terminate_instance/{}".format(event['currentIntent']['slots']['IdToTerminate'])
        EC1 = EC2_URL
        print EC1
        conn1 = httplib.HTTPConnection(EC1)
        conn1.request("GET", url)
        response = conn1.getresponse()
        data = response.read()
        data = str(json.loads(data.decode("utf-8")))
        deleteRecord = True
        Message = "Given EC2 instance was terminated successfully"

    if deleteRecord == True:
        DELETE_QUERY = "DELETE from userInstancedetails WHERE instanceid = '{}';".format(event['currentIntent']['slots']['IdToTerminate'])

        with conn_sql.cursor() as cur:
            cur.execute(DELETE_QUERY)
            conn_sql.commit()


    response =    {
        "sessionAttributes": event['sessionAttributes'],
        "dialogAction": {
            "type": "Close",
            "fulfillmentState": "Fulfilled",
            "message": {
                "contentType": "PlainText",
                "content": Message
            },
        }
    }

    return response


def lambda_handler(event, context):
    print event
    #return terminateListInstance(event)
    if event['currentIntent']['name'] == 'terminateInstance':

        if len(event['inputTranscript']) == 36 or len(event['inputTranscript']) == 19:
            if event['currentIntent']['slots']['InstanceTypeTerminate'] != None and event['currentIntent']['slots']['IdToTerminate'] == None:
                return {
                "sessionAttributes": event['sessionAttributes'],
                "dialogAction": {
                    "type": "Delegate",
                    "slots": {
                        'IdToTerminate': event['inputTranscript'],
                        'InstanceTypeTerminate': event['currentIntent']['slots']['InstanceTypeTerminate']
                    }
                }
            }

        print event['currentIntent']['slots']['InstanceTypeTerminate'], "  ",  event['currentIntent']['slots']['IdToTerminate']
        if event['currentIntent']['slots']['InstanceTypeTerminate'] == None:
            return terminateIntent(event)
        if event['currentIntent']['slots']['InstanceTypeTerminate'] != None and event['currentIntent']['slots']['IdToTerminate'] == None:
            return terminateListInstance(event)
        if event['currentIntent']['slots']['IdToTerminate'] != None:
            return terminateInstance(event)
    elif event['currentIntent']['name'] == 'ListAWSInstance':
        return listInstance(event)
    elif event['currentIntent']['slots']['instanceKey'] == "Existing" and event['currentIntent']['slots']['KeyPair'] == None:
        print "came for event"
        return listKeyPair(event)
    elif event['currentIntent']['slots']['KeyPair'] != None and event['currentIntent']['slots']['keyValidated'] == 'FALSE':
            key_pairs = listKeyPairValidation(event)
            print "came here for final validation"
            if event['currentIntent']['slots']['KeyPair'] in key_pairs:
                print "We found a match for the given key pair"
                return keyValidatedTrue(event)
            else:
                print "No match was found for the given key in the list"
                return keyValidatedFalse(event)
    elif event['currentIntent']['slots']['SecurityID'] == "Existing" and event['currentIntent']['slots']['SecurityGroupName'] == None:
        return listSecurityGroup(event)
    elif event['currentIntent']['slots']['SecurityGroupName'] != None and event['currentIntent']['slots']['securityGroupValidated'] == 'FALSE':
            security_pairs = listSecurityGroupValidation(event)
            if event['currentIntent']['slots']['SecurityGroupName'] in security_pairs:
                return securityValidatedTrue(event)
            else:
                return securityValidatedFalse(event)
    elif event['currentIntent']['slots']['instanceCreate'] == 'No' and event['currentIntent']['slots']['changeConfiguration'] == None:
        return nextQuestion(event)
    elif event['currentIntent']['slots']['instanceCreate'] == 'No' and event['currentIntent']['slots']['changeConfiguration'] != None:
        return changeConfiguration(event)
    elif event['currentIntent']['slots']['instanceCreate'] == 'Yes':
        return createInstance(event)
    elif event['currentIntent']['confirmationStatus'] == 'Denied' and event['sessionAttributes']:
        return wrongInput(event)
    else:
        return nextQuestion(event)

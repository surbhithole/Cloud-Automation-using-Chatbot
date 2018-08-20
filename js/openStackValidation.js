import sys
import logging
import pymysql
import os
import httplib
import json
import boto3
import urllib
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
    EC2_URL = "{}:{}".format(EC2_URL, PORT)
    conn_EC2 = httplib.HTTPConnection(EC2_URL)    #might change to https
except:
    logger.error("ERROR: Unexpected error: Could not connect to MySql instance.")
    sys.exit()

logger.info("SUCCESS: Connection to RDS mysql instance succeeded")


#function to send list of remote instances to be used to acquire a remote connection
def listOpenstackInstances(event):
    query = "SELECT instanceid from userInstancedetails WHERE username='" + event['userId'] + "' AND instancetype='Openstack';"
    INSTANCES = []

    print 'came here to get the list'
    with conn_sql.cursor() as cur:
        cur.execute(query)

        if cur.rowcount < 1:
            Message = "You currently don't have any Openstack instances to acquire remote connection"
            sendClosure = True
        else:
            for row in cur:
                INSTANCES.append(row[0])

            sendClosure = False
            Message = str(INSTANCES)

    if sendClosure == True:
        response = {
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
    else:

        response = {

            "sessionAttributes": event['sessionAttributes'],
            "dialogAction": {
                    "type": "ElicitSlot",
                    "slotToElicit": "idForRemoteConsole",
                    "intentName": event['currentIntent']['name'],
                    "slots": {
                        'idForRemoteConsole':event['currentIntent']['slots']['idForRemoteConsole'],
                        'startQuestionForRemoteConnection':event['currentIntent']['slots']['startQuestionForRemoteConnection']
                    },
                    "message": {
                        "contentType": "PlainText",
                        "content": Message
                },
            }
        }

    return response

#function will be used to make the lex flow accordingly when working with remote connection acquiring intent
def remoteIntent(event):

    response = {
        "sessionAttributes": event['sessionAttributes'],
        "dialogAction": {
            "type": "Delegate",
            "slots": {
                'idForRemoteConsole': event['currentIntent']['slots']['idForRemoteConsole'],
                'startQuestionForRemoteConnection': event['currentIntent']['slots']['startQuestionForRemoteConnection']
            }
        }
    }

    return response

# below is the code used for remote fullfillment
def remoteFullfillment(event):
    response = {
            "sessionAttributes": event['sessionAttributes'],
            "dialogAction": {
                "type": "Close",
                "fulfillmentState": "Fulfilled",
                "message": {
                    "contentType": "PlainText",
                    "content": "Okay!"
                },
            }
        }
    return response

#Below function will be used to acquire a remote connection of a given instance
#Note, we will return from the function to get the remote connection of the required instance
def remoteConsoleForOS(event):
    url = "/getRemoteConsole"
    headers = {'Content-type' : 'application/json'}
    params = json.dumps({ "instanceId" : event['currentIntent']['slots']['idForRemoteConsole']})
    EC1 = EC2_URL
    print EC1
    conn1 = httplib.HTTPConnection(EC1)
    conn1.request("POST", url, params, headers)
    response = conn1.getresponse()
    data = response.read()
    data = json.loads(data)

    if data["status"] == "success":
        remoteUrl = data["message"]

        message = "You can use the following link to acquire remote connection " + remoteUrl
    else:
        message = data["message"]

    return {
                "sessionAttributes": event['sessionAttributes'],
                "dialogAction": {
                    "type": "Close",
                    "fulfillmentState": "Fulfilled",
                    "message": {
                        "contentType": "PlainText",
                        "content": message
                    },
                }
            }

def createOpenstackInstanceFullfillment(event, message):
    response = {
            "sessionAttributes": event['sessionAttributes'],
            "dialogAction": {
                "type": "Close",
                "fulfillmentState": "Fulfilled",
                "message": {
                    "contentType": "PlainText",
                    "content": message
                },
            }
        }

    return response

#Below function will be used to create a new openstack instance
def createOpenStackInstanceOption(event):
    print event
    keyLink = ""
    keyName = ""

    if event['currentIntent']['slots']['keyForOpenstack'] == 'No':
        keyName = ""
    else:
        keyName = event['currentIntent']['slots']['keyNameOpenstack']

    if event['currentIntent']['slots']['keyOptionForOpenstack'] == 'New':
        url = "/createOSKeyPair"
        headers = {'Content-type' : 'application/json'}
        params = json.dumps({ "KeyPairName" : keyName})
        EC1 = EC2_URL
        print EC1
        conn1 = httplib.HTTPConnection(EC1)
        conn1.request("POST", url, params, headers)
        response = conn1.getresponse()
        data = response.read()
        data = json.loads(data)
        keyLink = data["keyLink"]


        if data["status"] == "error":
            return createOpenstackInstanceFullfillment(event, data["message"])

        INSERT_QUERY = "INSERT INTO userKeyPair VALUES('{}','{}', '{}');".format(event['userId'], keyName, "Openstack")
        with conn_sql.cursor() as cur:
            cur.execute(INSERT_QUERY)
            conn_sql.commit()

    url = "/createOSInstance"
    headers = {'Content-type' : 'application/json'}
    params = json.dumps({ "keyPairName" : keyName,
                           "name" : event['currentIntent']['slots']['nameForOpenstackInstance'],
                            "flavor" : event['currentIntent']['slots']['typeOpenstackInstance'],
                            "imgref" : event['currentIntent']['slots']['openstackMachineId']
                        })

    EC1 = EC2_URL
    print EC1
    conn1 = httplib.HTTPConnection(EC1)
    conn1.request("POST", url, params, headers)
    response = conn1.getresponse()
    respdata = response.read()
    respdata = json.loads(respdata)

    if respdata["status"] == "success":
        #insert data into database
        INSERT_QUERY = "INSERT INTO userInstancedetails VALUES('{}','{}','{}','{}','{}','{}','{}', '{}');".format(event['userId'],
            respdata["instanceId"],event['currentIntent']['slots']['openstackMachineId'], event['currentIntent']['slots']['typeOpenstackInstance'],
            "default", keyName, "Openstack", event['currentIntent']['slots']['nameForOpenstackInstance'])

        with conn_sql.cursor() as cur:
            cur.execute(INSERT_QUERY)
            conn_sql.commit()

        message = "Your new instance with instance id " + respdata["instanceId"] + " has been created."

        if keyLink != "":
            message = message + "Here is the link to you're newly created key " + keyLink

        return createOpenstackInstanceFullfillment(event, message)
    else:
        return createOpenstackInstanceFullfillment(event, respdata["message"])


def keyPairSkipFunc(event):
    response = {
        "sessionAttributes": event['sessionAttributes'],
        "dialogAction": {
            "type": "ElicitSlot",
            "slotToElicit": "nameForOpenstackInstance",
            "intentName": event['currentIntent']['name'],
            "slots": {
                'keyNameOpenstack': "Not reqd",
                'typeOpenstackInstance':event['currentIntent']['slots']['typeOpenstackInstance'],
                'openstackMachineId':event['currentIntent']['slots']['openstackMachineId'],
                'keyForOpenstack':event['currentIntent']['slots']['keyForOpenstack'],
                'keyOptionForOpenstack':"No",
                'nameForOpenstackInstance':event['currentIntent']['slots']['nameForOpenstackInstance'],
                'createInstanceOption':event['currentIntent']['slots']['createInstanceOption'],
                'keyToValidate': event['currentIntent']['slots']['keyToValidate']
            },
        }
    }

    return response


def nextQuestion(event):
    response = {
        "sessionAttributes": event['sessionAttributes'],
        "dialogAction": {
            "type": "Delegate",
            "slots": {
                'keyNameOpenstack':event['currentIntent']['slots']['keyNameOpenstack'],
                'typeOpenstackInstance':event['currentIntent']['slots']['typeOpenstackInstance'],
                'openstackMachineId':event['currentIntent']['slots']['openstackMachineId'],
                'keyForOpenstack':event['currentIntent']['slots']['keyForOpenstack'],
                'keyOptionForOpenstack':event['currentIntent']['slots']['keyOptionForOpenstack'],
                'nameForOpenstackInstance':event['currentIntent']['slots']['nameForOpenstackInstance'],
                'createInstanceOption':event['currentIntent']['slots']['createInstanceOption'],
                'keyToValidate' : event['currentIntent']['slots']['keyToValidate']
            },
        }
    }
    return response

#below function will be used to get a list of openstack keypairs to validate the entered value
def listOpenstackKeyPairValidation(event):
    query = "select keypair FROM userKeyPair WHERE username = '" + event["userId"] + "' AND instancetype='Openstack';";

    KEYPAIRSLIST = []

    with conn_sql.cursor() as cur:
        cur.execute(query)

        for row in cur:
            KEYPAIRSLIST.append(row[0])

    return KEYPAIRSLIST


#Below function will be used to get a list of all the openstak keypairs for a user
def listOpenstackKeyPair(event):
    query = "select keypair FROM userKeyPair WHERE username = '" + event["userId"] + "' AND instancetype='Openstack';";

    KEYPAIRSLIST = []

    with conn_sql.cursor() as cur:

        cur.execute(query)

        if cur.rowcount < 1 :
            #we will ask him to directly enter a new key name as we don't have any key list
            Message = "Sorry you currently don't have any existing keypair for Openstack instances, Kindly enter a new key name to be used"
            keyOptionForOpenstackVal = 'New'
            keyToValidateVal = None
        else:
            for row in cur:
                KEYPAIRSLIST.append(row[0])
            keyOptionForOpenstackVal = 'Existing'
            Message = str(KEYPAIRSLIST)
            keyToValidateVal = 'FALSE'

    response = {
        "sessionAttributes": event['sessionAttributes'],
        "dialogAction": {
            "type": "ElicitSlot",
            "message": {
                "contentType": "PlainText",
                "content": Message
            },
            "slotToElicit": "keyNameOpenstack",
            "intentName": event['currentIntent']['name'],
            "slots": {
                'keyNameOpenstack': event['currentIntent']['slots']['keyNameOpenstack'],
                'typeOpenstackInstance':event['currentIntent']['slots']['typeOpenstackInstance'],
                'openstackMachineId':event['currentIntent']['slots']['openstackMachineId'],
                'keyForOpenstack':event['currentIntent']['slots']['keyForOpenstack'],
                'keyOptionForOpenstack': keyOptionForOpenstackVal,
                'nameForOpenstackInstance':event['currentIntent']['slots']['nameForOpenstackInstance'],
                'createInstanceOption':event['currentIntent']['slots']['createInstanceOption'],
                'keyToValidate': keyToValidateVal
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
            "slotToElicit": "keyNameOpenstack",
            "intentName": event['currentIntent']['name'],
            "slots": {
                'keyNameOpenstack': event['currentIntent']['slots']['keyNameOpenstack'],
                'typeOpenstackInstance':event['currentIntent']['slots']['typeOpenstackInstance'],
                'openstackMachineId':event['currentIntent']['slots']['openstackMachineId'],
                'keyForOpenstack':event['currentIntent']['slots']['keyForOpenstack'],
                'keyOptionForOpenstack':event['currentIntent']['slots']['keyOptionForOpenstack'],
                'nameForOpenstackInstance':event['currentIntent']['slots']['nameForOpenstackInstance'],
                'createInstanceOption':event['currentIntent']['slots']['createInstanceOption'],
                'keyToValidate': 'FALSE'
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
                'keyNameOpenstack': event['currentIntent']['slots']['keyNameOpenstack'],
                'typeOpenstackInstance':event['currentIntent']['slots']['typeOpenstackInstance'],
                'openstackMachineId':event['currentIntent']['slots']['openstackMachineId'],
                'keyForOpenstack':event['currentIntent']['slots']['keyForOpenstack'],
                'keyOptionForOpenstack':event['currentIntent']['slots']['keyOptionForOpenstack'],
                'nameForOpenstackInstance':event['currentIntent']['slots']['nameForOpenstackInstance'],
                'createInstanceOption':event['currentIntent']['slots']['createInstanceOption'],
                'keyToValidate': 'TRUE'
            },
        }
    }
    return response


def listOfOpenStackMachines(event):
    query = "SELECT instanceid FROM userInstancedetails WHERE username='" + event['userId'] +"' AND instancetype='Openstack';"

    OSINSTANCES = []

    with conn_sql.cursor() as cur:
        cur.execute(query)

        if cur.rowcount < 1:
            Message = "You don't have any Openstack instances currently"
            sendList = False
        else:
            sendList = True

            for row in cur:
                OSINSTANCES.append(row[0])

            Message = str(OSINSTANCES)

            Message = "Please enter a machine id from the below list \n" + Message

    if sendList == False:
        response = {
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
    else:
        response = {
        "sessionAttributes": event['sessionAttributes'],
        "dialogAction": {
            "type": "ElicitSlot",
                "message": {
                    "contentType": "PlainText",
                    "content": Message
                },
                "slotToElicit": "instanceIdforOpenstackAction",
                "intentName": event['currentIntent']['name'],
                "slots": {
                    'instanceIdforOpenstackAction': event['currentIntent']['slots']['instanceIdforOpenstackAction'],
                    'listOfActions':event['currentIntent']['slots']['listOfActions'],
                    'dummyVariable':event['currentIntent']['slots']['dummyVariable']
                },
            }
        }


    return response

#Below function will be used to get action on the remote instance
def performActionOnOpenstack(event):
    url = "/performOSAction"
    headers = {'Content-type' : 'application/json'}
    params = json.dumps({ "action" : event['currentIntent']['slots']['listOfActions'],"instanceId" : event['currentIntent']['slots']['instanceIdforOpenstackAction']})
    EC1 = EC2_URL
    print EC1
    conn1 = httplib.HTTPConnection(EC1)
    conn1.request("POST", url, params, headers)
    response = conn1.getresponse()
    data = response.read()
    data = json.loads(data)

    message = data["message"]  + " with instance id " + event['currentIntent']['slots']['instanceIdforOpenstackAction']

    #return the response based on the data
    response = {
            "sessionAttributes": event['sessionAttributes'],
            "dialogAction": {
                "type": "Close",
                "fulfillmentState": "Fulfilled",
                "message": {
                    "contentType": "PlainText",
                    "content": message
            },
        }
    }

    return response

def listOfInstancesForMetrics(event):

    instanceTypeVal = event['currentIntent']['slots']['instanceType']

    print instanceTypeVal

    if instanceTypeVal == 'AWS':
        instanceTypeVal = 'EC2'

    query = "SELECT instanceid FROM userInstancedetails WHERE username='" + event['userId'] +"' AND instancetype='" + instanceTypeVal + "';"
    print query
    OSINSTANCES = []

    with conn_sql.cursor() as cur:
        cur.execute(query)

        if cur.rowcount < 1:
            Message = "You don't have any " + instanceTypeVal  + " instances currently"
            sendList = False
        else:
            sendList = True

            for row in cur:
                OSINSTANCES.append(row[0])

            Message = str(OSINSTANCES)

            Message = "Please enter a machine id from the below list \n" + Message

    if sendList == False:
        response = {
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
    else:
        response = {
        "sessionAttributes": event['sessionAttributes'],
        "dialogAction": {
            "type": "ElicitSlot",
                "message": {
                    "contentType": "PlainText",
                    "content": Message
                },
                "slotToElicit": "idForInstance",
                "intentName": event['currentIntent']['name'],
                "slots": {
                    'instanceType': event['currentIntent']['slots']['instanceType'],
                    'idForInstance':event['currentIntent']['slots']['idForInstance']
                },
            }
        }


    return response

def getMetricsForInstance(event):


    url = "/getMetrics"
    headers = {'Content-type' : 'application/json'}
    params = json.dumps({ "instanceId" : event['currentIntent']['slots']['idForInstance'],"instanceType" : event['currentIntent']['slots']['instanceType']})
    EC1 = EC2_URL
    print EC1
    conn1 = httplib.HTTPConnection(EC1)
    conn1.request("POST", url, params, headers)
    response = conn1.getresponse()
    data = response.read()
    data = json.loads(data)

    Message = data["message"]

    response = {
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

def getHealthStatusForInstances(event):

    instanceTypeVal = event['currentIntent']['slots']['type']

    if instanceTypeVal == 'AWS':
        instanceTypeVal = 'EC2'

    INSTANCES = []

    #Message = "Health status for your " + event['currentIntent']['slots']['type'] + " instances is Healthy"

    query = "SELECT instanceid FROM userInstancedetails WHERE username='" + event['userId'] + "' AND instancetype='" +  instanceTypeVal + "';"

    print query

    with conn_sql.cursor() as cur:
        cur.execute(query)

        if cur.rowcount < 1:
            Message = "Sorry you don't have any instances of the given  type"
        else:
            for row in cur:
                INSTANCES.append(row[0])

            obj =   {
                        "instanceType" : instanceTypeVal,
                        "INSTANCES" : INSTANCES
                    }

            url = "/checkStatusOfMachine"
            headers = {'Content-type' : 'application/json'}
            params = json.dumps(obj)
            EC1 = EC2_URL
            print EC1
            conn1 = httplib.HTTPConnection(EC1)
            conn1.request("POST", url, params, headers)
            response = conn1.getresponse()
            Message = response.read()


    response = {
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
    #print event
    if event['currentIntent']['name'] == 'instanceHealthStatusCheck':
        if event['currentIntent']['slots']['type'] != None:
            #return the status for the given instance type i.e of all the faulty machines
            return getHealthStatusForInstances(event)
        else:
            return {
                "sessionAttributes": event['sessionAttributes'],
                "dialogAction": {
                    "type": "Delegate",
                    "slots": {
                        'type': event['currentIntent']['slots']['type']
                    },
                }
            }

    elif event['currentIntent']['name'] == 'cloudMetrics':

        print event['currentIntent']['slots']['instanceType'], "   ", event['currentIntent']['slots']['idForInstance']

        if len(event['inputTranscript']) == 36 or len(event['inputTranscript']) == 19:
            if event['currentIntent']['slots']['instanceType'] != None and event['currentIntent']['slots']['idForInstance'] == None:
                return {
                "sessionAttributes": event['sessionAttributes'],
                "dialogAction": {
                    "type": "Delegate",
                    "slots": {
                        'idForInstance': event['inputTranscript'],
                        'instanceType': event['currentIntent']['slots']['instanceType']
                    }
                }
            }

        print event['currentIntent']['slots']['instanceType'], " ", event['currentIntent']['slots']['idForInstance']
        if event['currentIntent']['slots']['instanceType'] != None and event['currentIntent']['slots']['idForInstance'] == None:
            return listOfInstancesForMetrics(event)
        elif event['currentIntent']['slots']['instanceType'] != None and event['currentIntent']['slots']['idForInstance'] != None:
            return getMetricsForInstance(event)
        else:
            return {
                "sessionAttributes": event['sessionAttributes'],
                "dialogAction": {
                    "type": "Delegate",
                    "slots": {
                        'instanceType': event['currentIntent']['slots']['instanceType'],
                        'idForInstance':event['currentIntent']['slots']['idForInstance']
                    },
                }
            }
    elif event['currentIntent']['name'] == 'openstackActionsIntent':
        print event['currentIntent']['slots']['listOfActions'], "  ", event['currentIntent']['slots']['instanceIdforOpenstackAction']

        if event['currentIntent']['slots']['listOfActions'] != None and event['currentIntent']['slots']['instanceIdforOpenstackAction'] == None and len(event['inputTranscript']) == 36:
            return {
            "sessionAttributes": event['sessionAttributes'],
            "dialogAction": {
                "type": "Delegate",
                "slots": {
                    'instanceIdforOpenstackAction': event['inputTranscript'],
                    'listOfActions': event['currentIntent']['slots']['listOfActions']
                }
            }
        }


        if event['currentIntent']['slots']['listOfActions'] != None and event['currentIntent']['slots']['instanceIdforOpenstackAction'] == None:
            #send list of machines
            return listOfOpenStackMachines(event)
        elif event['currentIntent']['slots']['listOfActions'] != None and event['currentIntent']['slots']['instanceIdforOpenstackAction'] != None:
            #perform action and send response
            return performActionOnOpenstack(event)
        else:
            return {
                "sessionAttributes": event['sessionAttributes'],
                "dialogAction": {
                    "type": "Delegate",
                    "slots": {
                        'instanceIdforOpenstackAction': event['currentIntent']['slots']['instanceIdforOpenstackAction'],
                        'listOfActions':event['currentIntent']['slots']['listOfActions'],
                        'dummyVariable':event['currentIntent']['slots']['dummyVariable']
                    },
                }
            }

    elif event['currentIntent']['name'] == 'getRemoteConsole':
        print "Refer this " + str(event)

        print event['currentIntent']['slots']['startQuestionForRemoteConnection'], "   ", event['currentIntent']['slots']['idForRemoteConsole']
        if event['currentIntent']['slots']['startQuestionForRemoteConnection'] == 'Yes' and event['currentIntent']['slots']['idForRemoteConsole'] == None and len(event['inputTranscript']) == 36:
            return {
            "sessionAttributes": event['sessionAttributes'],
            "dialogAction": {
                "type": "Delegate",
                "slots": {
                    'idForRemoteConsole': event['inputTranscript'],
                    'startQuestionForRemoteConnection': event['currentIntent']['slots']['startQuestionForRemoteConnection']
                }
            }
        }

        if event['currentIntent']['slots']['startQuestionForRemoteConnection'] == None:
            return remoteIntent(event)
        elif event['currentIntent']['slots']['startQuestionForRemoteConnection'] == 'No':
            #send fullfillment
            return remoteFullfillment(event)
        elif event['currentIntent']['slots']['startQuestionForRemoteConnection'] == 'Yes' and event['currentIntent']['slots']['idForRemoteConsole'] == None:
            return listOpenstackInstances(event)
        elif event['currentIntent']['slots']['idForRemoteConsole'] != None:
            return remoteConsoleForOS(event)
        else:
            return remoteIntent(event)
    elif event['currentIntent']['name'] == 'createOpenstackInstance':
        print str(event)

        if event['currentIntent']['slots']['keyForOpenstack'] == 'No' and event['currentIntent']['slots']['keyNameOpenstack'] == None:
            return keyPairSkipFunc(event)
        elif event['currentIntent']['slots']['keyForOpenstack'] == 'Yes':
            print event['userId']
            if event['currentIntent']['slots']['keyOptionForOpenstack'] == 'Existing'  and event['currentIntent']['slots']['keyNameOpenstack'] == None:
                 return listOpenstackKeyPair(event)
            elif event['currentIntent']['slots']['keyNameOpenstack'] != None and event['currentIntent']['slots']['keyToValidate'] == 'FALSE':
                print 'came here for verifying key pair'
                kpList = listOpenstackKeyPairValidation(event)

                if event['currentIntent']['slots']['keyNameOpenstack'] in kpList:
                    return keyValidatedTrue(event)
                else:
                    return keyValidatedFalse(event)
            elif event['currentIntent']['slots']['keyNameOpenstack'] == None or event['currentIntent']['slots']['nameForOpenstackInstance'] == None or event['currentIntent']['slots']['createInstanceOption'] == None:
                print "came for next question 123"
                return nextQuestion(event)
            elif event['currentIntent']['slots']['createInstanceOption'] == 'Yes':
                return createOpenStackInstanceOption(event)
            elif event['currentIntent']['slots']['createInstanceOption'] == 'No':
                print "returning fullfillment event 123"
                return remoteFullfillment(event)
        elif event['currentIntent']['slots']['createInstanceOption'] == 'Yes':
            return createOpenStackInstanceOption(event)
        elif event['currentIntent']['slots']['createInstanceOption'] == 'No':
            print "returning fullfillment event"
            return remoteFullfillment(event)
        #elif event['currentIntent']['confirmationStatus'] == 'Denied' and event['sessionAttributes']:
        #    return wrongInput(event)
        else:
            return nextQuestion(event)
                    

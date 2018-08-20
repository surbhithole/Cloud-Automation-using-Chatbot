



  More
1 of 4,356

Print all In new window
Project files
Inbox
x

Ashish Motilal Jain
Attachments9:16 PM (0 minutes ago)

to me, Surbhi, Ayan
PFA

2 Attachments


Click here to Reply, Reply to all, or Forward
Using 1.01 GB
Manage
Program Policies
Powered by Google
Last account activity: 3 minutes ago
Details

import json
from flask import Flask, request, jsonify
import sys
import boto3
import datetime
import boto3
from boto3 import client
import requests
import OSConfig as OSC


#below variables have been added up for openstack
localIP = ""
baseIP = ""
ProjectID = ""
NetworkUUID = ""
tokenUrl = ""


#below 2 json ojbects have been added to receive the authoirzation token
unScopedTokenReqData = { "auth": {
    "identity": {
      "methods": ["password"],
      "password": {
        "user": {
          "name": "admin",
          "domain": { "id": "default" },
          "password": "secret"
        }
      }
    }
  }
}


scopedTokenReqData={ "auth": {
    "identity": {
      "methods": ["password"],
      "password": {
        "user": {
          "name": "admin",
          "domain": { "id": "default" },
          "password": "secret"
        }
      }
    },
    "scope": {
      "project": {
        "name": "demo",
        "domain": { "id": "default" }
      }
    }
  }
}



app = Flask(__name__)


def PushFileToS3Bucket(FileName, remoteFileName):
	conn = client('s3')
	s3 = boto3.client('s3')
	bucket_name = 'ayan-test-bucket'
	s3.upload_file(FileName, bucket_name, remoteFileName)

#We use the below function to query and get the token based on the url and the JSON object passed to it
def getToken(url, data):
        tokenResp = requests.post(url, data=json.dumps(data), headers={'Content-type' : 'application/json'})

        #print tokenResp.json()

        if tokenResp.status_code == 201:
                return tokenResp.headers['X-Subject-Token']
        else:
                return "" #this indicates that we didn't recieve an token

#We use the below function to get the Token with respect to our Given project where will be adding annd manipulating the instances
def getProjectToken():
        return getToken(tokenUrl, scopedTokenReqData)


@app.route("/Helloworld")
def hello():
	return json.dumps("{'hello': 'hello'}")


@app.route("/getMetrics", methods=['POST'])
def getMetricsOfMachine():

	if not request.json or not 'instanceId' in request.json or not 'instanceType':
		return jsonify({"status" : "error", "message" : "Missing parameters"})

	reqObj = request.json

	instanceID = reqObj["instanceId"]
	instanceType = reqObj["instanceType"]

	if instanceType == "Openstack":
		#get metrics for Openstack instance
		token = getProjectToken()

      		keyPairHeader = {
                	                "X-Auth-Token" : token
                       		}

 	      	detailsURL = "http://" + baseIP + "/compute/v2/" + ProjectID + "/servers/" + instanceID + "/diagnostics"

       		resp = requests.get(detailsURL, headers=keyPairHeader)

		if resp.status_code == 200:
	        	#print resp.json()

			message = "We will get the openstack instance metrics here"
			return jsonify({"status" : "success", "message" : str(resp.json())})
		else:
			return jsonify({"status" : "success", "message" : "Failed to get Metrics for the given instance"})
	else:
		#get metrics for ec2 instances

		cw = boto3.client('cloudwatch')

		a = cw.get_metric_statistics(
        		Period=300,
        		StartTime=datetime.datetime.utcnow() - datetime.timedelta(seconds=600),
        		EndTime=datetime.datetime.utcnow(),
        		MetricName='CPUUtilization',
        		Namespace='AWS/EC2',
        		Statistics=['Average'],
        		Dimensions=[{'Name':'InstanceId', 'Value': instanceID}]
        	)

		#message = "we will get some metric here and figure out a way from it"
		if a['ResponseMetadata']['HTTPStatusCode'] == 200:
			if len(a['Datapoints']) > 0:
				message = "Average CPU Utilization : " + str(a['Datapoints'][0]['Average']) + " percentage"
			else:
				message = "Failed to retrieve metrics for the given instance."
		else:
			message = "Failed to retrieve metrics for the given instance"

		return jsonify({"status" : "success", "message" : message})

#Below function will be  used to delete an openstack instance
@app.route("/terminateOSInstance", methods=['POST'])
def deleteOpenStackInstance():

	if not request.json or not 'instanceId' in request.json:
		return jsonify({'status' : 'error', 'message' : 'Missing parameter instance id'})

        token = getProjectToken()

	if token == "":
		return jsonify({'status' : 'error', 'message' : 'Failed to acquire authentication token'})

	reqObj = request.json

	openstackID = reqObj["instanceId"]

        deleteURL = "http://" + baseIP + "/compute/v2/" + ProjectID + "/servers/" + openstackID

        deleteHeader  = {
                                "X-Auth-Token" : token
                        }

        resp = requests.delete(deleteURL,  headers=deleteHeader)

        if resp.status_code == 204:
		return jsonify({'status' : 'success', 'message' : 'Given instance has been deleted succesfully'})
	else:
		return jsonify({'status' : 'error', 'message' : 'Failed to terminate the given instance id'})

@app.route("/getRemoteConsole", methods=['POST'])
def getVNCConsole():

	if not request.json or not 'instanceId' in request.json:
		return jsonify({'status' : 'error', 'message' : 'Missing parameter instance id'})

        token = getProjectToken()

	if token == "":
		return jsonify({'status' : 'error', 'message' : 'Failed to acquire authentication token'})

	reqObj = request.json

	openstackID = reqObj["instanceId"]

	remoteData = {
                        "os-getVNCConsole" : { "type" : "novnc" }
                     }

        remoteHeaders = {
                                'Content-type' : 'application/json',
                                'X-Auth-Token' : token
                        }

        remoteUrl = "http://" + baseIP + "/compute/v2/" + ProjectID + "/servers/" + openstackID + '/action'
        resp = requests.post(remoteUrl, data=json.dumps(remoteData), headers=remoteHeaders)

	if resp.status_code == 200:
        	jsonResp = resp.json()
        	remoteURL = jsonResp['console']['url']
	        remoteURL = remoteURL.replace(localIP, baseIP)
		remoteURL = remoteURL.replace("127.0.0.1", baseIP)
		return jsonify({'status' : 'success', 'message' : remoteURL})
	else:
		return jsonify({'status' : 'error', 'message' : 'Failed to acquire remote console of the given machine', 'code' : resp.status_code})


@app.route("/createOSInstance", methods=['POST'])
def createOpenStackInstance():

	if not request.json or not 'name' in request.json or not 'flavor' in request.json or not 'imgref' in request.json:
		return jsonify({'status' : 'error', 'message' : 'Missing parameters in request'})

	token = getProjectToken()

	if token == "":
		return jsonify({'status' : 'error', 'message' : 'Failed to acquire authorization token'})

	reqObj = request.json

	name = reqObj["name"]
	flavor = reqObj["flavor"]
	imgref = reqObj["imgref"]
	keyPairName = reqObj["keyPairName"]

        #JSON Object to be used to pass data to create an Openstack instance
        if keyPairName == "":
                serverObject=   {
                                        "server" :      {
                                                                "name" : name,
                                                                "flavorRef" : flavor,
                                                                "imageRef" : imgref,
                                                                "networks" : [{"uuid" : NetworkUUID}]
                                                        }
                                }
        else:

                serverObject=   {
                                        "server" :      {
                                                                "name" : name,
                                                                "flavorRef" : flavor,
                                                                "imageRef" : imgref,
                                                                "networks" : [{"uuid" : NetworkUUID}],
                                                                "key_name" : keyPairName
                                                        }
                                }

        serverHeaders = {
                                'Content-type' : 'application/json',
                                'X-Auth-Token' : token
                        }

        #API URL to be used to create the instance using the POST request
        serverURL = "http://" + baseIP + "/compute/v2/" + ProjectID + "/servers"

        resp = requests.post(serverURL, data = json.dumps(serverObject), headers=serverHeaders)

        jsonResp = resp.json()

	print jsonResp

        if resp.status_code == 202:
		return jsonify({"status" : "success", "message" : "Instance created successfully", "instanceId" : jsonResp["server"]["id"]})
	else:
		return jsonify({"status" : "error", "message" : "Failed to create openstack instance"})


@app.route("/performOSAction", methods=['POST'])
def performActionOnOS():

	if not request.json or not 'action' in request.json or not 'instanceId' in request.json:
		return jsonify({"status" : "error", "message" : "Missing parameter information"})

	token = getProjectToken()

        if token == "":
		return jsonify({"status" : "error", "message" : "Failed to get authorization token"})

	reqObj = request.json

	action = reqObj["action"]
	openstackID = reqObj["instanceId"]

        actionURL = "http://" + baseIP + "/compute/v2/" + ProjectID + "/servers/" + openstackID + "/action"

        actionHeaders = {
                                "X-Auth-Token" : token,
                                "Content-type" : "application/json"
                        }

	print action

        if action == "Start":
                actionData =    '''{
                                        "os-start" : null
                                }'''

        elif action == "Stop":
                actionData =    '''{
                                        "os-stop" : null
                                }'''

        elif action == "Reboot":
                actionData =    '''{
                                        "reboot" :      {
                                                                "type" : "HARD"
                                                        }
                                }'''

        elif action == "Pause":
                actionData =    '''{
                                        "pause" : null
                                }'''

        elif action == "Unpause":
                actionData =    '''{
                                        "unpause" : null
                                }'''

        elif action == "Suspend":
                actionData =    '''{
                                        "suspend" : null
                                }'''

	elif action == "Resume":
                actionData =    '''{
                                        "resume" : null
                                }'''
        else:
                return jsonify({"status" : "error", "message" : "Unknwon action provided" })


        resp = requests.post(actionURL, data=actionData, headers = actionHeaders)

        if resp.status_code == 202:
		return jsonify({"status" : "success", "message" : "Required Action on given instance performed successfully"})
	else:
		return jsonify({"status" : "error", "message" : "Failed to perform required action on the given instance"})


@app.route("/createOSKeyPair", methods=['POST'])
def createOpenStackKeyPair():

	print "came here"
	print request.data

	if not request.json or not 'KeyPairName' in request.json:
		return jsonify({"status" : "error", "message" : "Missing parameters"})

        token = getProjectToken()

	if token == "":
		return jsonify({"status" : "error", "message" : "Failed to acquire authorization token"})

	reqObj = request.json

	KeyPairName = reqObj["KeyPairName"]


        keyPairData =   {
                                "keypair" :     {
                                                        "name" : KeyPairName,
                                                        "type" : "ssh"
                                                }
                        }

        keyPairHeader = {
                                "Content-type" : "application/json",
                                "X-Auth-Token" : token

                        }

        keyPairURL = "http://" + baseIP + "/compute/v2/" + ProjectID + "/os-keypairs"

        resp = requests.post(keyPairURL, data=json.dumps(keyPairData), headers=keyPairHeader)

	if resp.status_code == 200:
		#create a new file here, save the key contents to file,
		#upload the fiel to s3
		#create the link of s3 bucket
		#return response with link of the .pem file

		respObj = resp.json()

		keyData = respObj["keypair"]["private_key"]

		keyFilePath = "oskey/" + KeyPairName + ".pem"
		fd = open(keyFilePath, "wb")
		fd.write(keyData)
		fd.close()

		PushFileToS3Bucket(keyFilePath, KeyPairName + ".pem")

		keyFileURL = "https://s3.amazonaws.com/ayan-test-bucket/" + KeyPairName + ".pem"

		return jsonify({"status" : "success", "message" : "Key created successfully", "keyLink" : keyFileURL})
	else:
		return jsonify({"status" : "error", "message" : "Failed to create key with the given key name"})


#########################################################################################################################
# 															#
#	Below mentioned list of functions are related to EC2 functionality						#
#															#
#########################################################################################################################
@app.route("/list_instances")
def list_instances():
	instances = {}
	print("List of the Instances is as follows: ")
	ec2 = boto3.session.Session(region_name="us-east-1").resource('ec2')
	for instance in ec2.instances.all():
		print("\nInstance ID : ",instance.id, "\nState : ", instance.state,"\nLocation : ", instance.placement['AvailabilityZone'], "\nIP : ", instance.public_ip_address)
		instances[instance.id]=instance.state
	return json.dumps(instances)

@app.route("/create_instance/<string:ImageId>/<string:InstanceType>/<string:secId>/<string:key>")
def create_instance(ImageId, InstanceType, secId, key):

	print(key,secId)
	ec2 = boto3.resource('ec2')
	instance = ec2.create_instances(ImageId= ImageId, MinCount=1, MaxCount=1, InstanceType=InstanceType, KeyName = key,SecurityGroupIds = [secId])
	print("Instance ID for newly created insatnce : ", instance[0].id)


	return json.dumps({"Instance Created":instance[0].id})


@app.route("/terminate_instance/<string:instanceId>")
def terminate_instance(instanceId):
	ec2 = boto3.resource('ec2')
	instance = ec2.Instance(instanceId)
	response = instance.terminate()
	print("\nInstance Terminated:\n",response)
	return json.dumps({"intance terminated":instanceId})

@app.route("/createKeyPair/<string:key>")
def createKeyPair(key):
	ec2 = boto3.resource('ec2')
	keyName = key + '.pem'
	outfile = open(keyName,'w')
	key_pair = ec2.create_key_pair(KeyName = key)
	KeyPairOut = str(key_pair.key_material)
	outfile.write(KeyPairOut)
	outfile.close()
	PushFileToS3Bucket(keyName, keyName)
	keyFileURL = "https://s3.amazonaws.com/ayan-test-bucket/" + keyName
	print keyFileURL
	return json.dumps({"keyPair": keyFileURL})

@app.route("/createSecurityGroup/<string:name>/<string:desc>")
def createSecurityGroup(name, desc):
	ec2 = boto3.resource('ec2')
	id1 = ec2.create_security_group(GroupName=name, Description=desc)
	id1.authorize_ingress(IpProtocol="tcp",CidrIp="0.0.0.0/0",FromPort=22,ToPort=22)
	print("Security Group Id: ", id1.id)
	return json.dumps({"Security Group":id1.id})

@app.route("/checkStatusOfMachine", methods=['POST'])
def checkStatusOfMachine():
        ec2 = boto3.resource('ec2')

	reqObj = request.json

	checkHealthStatus = reqObj["INSTANCES"]

	if reqObj["instanceType"] == "Openstack":
		token = getProjectToken()

		if token == "":
			return "Failed to get health status of required Openstack instances(Authorization Failure)"


		detailHeader = 	{
					"X-Auth-Token" : token
				}


		detailed = "http://" + baseIP + "/compute/v2/servers/detail"

	        resp = requests.get(detailed, headers=detailHeader)

		jsonData = resp.json()

		listofServers = jsonData["servers"]

		ResponseList = []

		for entry in listofServers:
			if entry["id"] in checkHealthStatus:
				instanceId = entry["id"]

				if 'fault' in entry:
					message = entry["fault"]["message"]
				else:
					message = entry["status"]

				ResponseList.append({"Instance Id" : instanceId, "Status" : message})


		response = ResponseList
	else:
		dict1 = []
	        for status in ec2.meta.client.describe_instance_status()['InstanceStatuses']:
        	        dict1.append(status)
      	  	list1 = []

		for i in range(len(dict1)):
                	if dict1[i]["InstanceId"] in checkHealthStatus:
                        	list1.append({"Instance Id": dict1[i]["InstanceId"], "Status": dict1[i]["SystemStatus"]["Status"]})

		response = list1

	return json.dumps(response)


@app.route("/checkInstanceMetrics")
def checkInstanceMetrics():
	cw = boto3.client('cloudwatch')

	a = cw.get_metric_statistics(
        	Period=300,
        	StartTime=datetime.datetime.utcnow() - datetime.timedelta(seconds=600),
        	EndTime=datetime.datetime.utcnow(),
        	MetricName='CPUUtilization',
        	Namespace='AWS/EC2',
        	Statistics=['Average'],
        	Dimensions=[{'Name':'InstanceId', 'Value':'i-05d1b813cd71cc422'}]
        )

	return json.dumps(a["ResponseMetadata"]["HTTPStatusCode"])

@app.route("/transferFileToS3")
def transferFileToS3():
	conn = client('s3')
	s3 = boto3.client('s3')
	filename = 'sample.py'
	bucket_name = 'ayan-test-bucket'
	s3.upload_file(filename, bucket_name, filename)
	return json.dumps({"Hello":"Hello"})

@app.route("/getInstanceListsForUser", methods=['POST'])
def getInstanceListsForUser():

	data = request.json

	print data['userRef']


	return json.dumps({
				"MachineList" :	[{
							"InstanceType" : "EC2",
							"Name" : "-",
							"ImageType" : "t1.micro",
							"ImageId" : "1213213",
							"KeyPair" : "test",
							"SecurityGroup" : "123",
							"InstanceID" : "123123rdfgd"
						},

						{
							"InstanceType" : "Openstack",
							"Name" : "testOSInstance",
							"ImageType" : "m1.tiny",
							"ImageId" : "1213313424f",
							"KeyPair" : "test123",
							"SecurityGroup" : "default",
							"InstanceID" : "acacasdasew2rer2"
						}]

			 })

if __name__ == "__main__":

	#we will create the Token url here to be used to get openstack authorization token
 	#We will use the below code to get an authorization token for unscoped group
        localIP, baseIP, ProjectID, NetworkUUID = OSC.getConfigSettings('openstack.conf')

        tokenUrl = "http://" + baseIP + "/identity/v3/auth/tokens"


	app.run(host = '0.0.0.0',port=5001)

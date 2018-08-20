import ConfigParser


def getConfigSettings(filename):
	cfParserHandle = ConfigParser.ConfigParser()
	cfParserHandle.read(filename)

	LocalIP = cfParserHandle.get("IP", "LocalIP")
	PublicIP = cfParserHandle.get("IP", "PublicIP")
	ProjectID = cfParserHandle.get("Openstack", "ProjectID")
	NetworkUUID = cfParserHandle.get("Openstack", "NetworkUUID")


	print LocalIP, PublicIP, ProjectID, NetworkUUID
	return LocalIP, PublicIP, ProjectID, NetworkUUID

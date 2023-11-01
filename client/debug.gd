extends Node

# https://gist.github.com/CrankyBunny/71316e7af809d7d4cf5ec6e2369a30b9
@export var instance_num := -1
var _instance_socket: TCPServer
func _init() -> void:
	if OS.is_debug_build():
		_instance_socket = TCPServer.new()
		for n in range(0,4):
			if _instance_socket.listen(5000 + n) == OK:
				instance_num = n
				break
		assert(instance_num >= 0, "Unable to determine instance number. Seems like all TCP ports are in use")	

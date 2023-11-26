extends Node

@export var storage_session_path: String:
	get:
		var path = "user://session"
		if OS.is_debug_build():
			var debug_vars = get_node("/root/Debug")
			return path + str(debug_vars.instance_num)
		return path


@export var web_socket_client: WebSocketClient = WebSocketClient.new()

@export var player_id: String
@export var player_name: String = ""
@export var session_id: String:
	get:
		if FileAccess.file_exists(storage_session_path):
			var file = FileAccess.open(storage_session_path, FileAccess.READ)
			return file.get_var()
		return ""
	set(value):
		var file = FileAccess.open(storage_session_path, FileAccess.WRITE)
		file.store_var(value)

@export var room_id: String = ""

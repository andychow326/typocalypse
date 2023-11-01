extends Node

var storage_session_path = "user://session"

@export var web_socket_client: WebSocketClient = WebSocketClient.new()

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


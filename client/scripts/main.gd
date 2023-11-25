extends Node


var web_socket_connection_closed_count := 0


func _ready():
	DataStore.web_socket_client.connected_to_server.connect(_on_web_socket_client_connected_to_server)
	DataStore.web_socket_client.connection_closed.connect(_on_web_socket_client_connection_closed)
	DataStore.web_socket_client.message_received.connect(_on_web_socket_client_message_received)
	add_child(DataStore.web_socket_client)
	start_client()


func start_client():
	DataStore.web_socket_client.connect_to_url(Config.SERVER_URL + "/ws?sessionId=" + DataStore.session_id)


func restart_client():
	DataStore.web_socket_client.close()
	DataStore.web_socket_client.clear()
	start_client()


func _on_web_socket_client_connected_to_server():
	web_socket_connection_closed_count = 0
	print("[Client] Connected to server!")


func _on_web_socket_client_connection_closed():
	web_socket_connection_closed_count += 1
	print("[Client] Connection closed.")
	# Reconnect with exponential backoff
	var timeout = int(pow(2, web_socket_connection_closed_count))
	print("[Client] Reconnecting to server in %d seconds..." % timeout)
	await get_tree().create_timer(timeout).timeout
	start_client()


func _on_web_socket_client_message_received(message):
	if typeof(message) != TYPE_DICTIONARY:
		return
	match message.event:
		"renewSession":
			DataStore.session_id = message.data.sessionId
			restart_client()
		"validSession":
			DataStore.player_name = message.user.name
			$LobbyMenu/OnBoardingMenu/PanelContainer/MarginContainer/VBoxContainer/PlayerNameLineEdit.text = message.user.name

extends Node


func _ready():
	DataStore.web_socket_client.connected_to_server.connect(_on_web_socket_client_connected_to_server)
	DataStore.web_socket_client.connection_closed.connect(_on_web_socket_client_connection_closed)
	DataStore.web_socket_client.message_received.connect(_on_web_socket_client_message_received)
	add_child(DataStore.web_socket_client)
	start_client()


func start_client():
	DataStore.web_socket_client.connect_to_url(Config.SERVER_URL + "/ws?sessionId=" + DataStore.sessionId)


func restart_client():
	DataStore.web_socket_client.close()
	DataStore.web_socket_client.clear()
	start_client()


func _on_web_socket_client_connected_to_server():
	print("[Client] Connected to server!")


func _on_web_socket_client_connection_closed():
	print("[Client] Connection closed.")


func _on_web_socket_client_message_received(message):
	if typeof(message) != TYPE_DICTIONARY:
		return
	match message.event:
		"renewSession":
			DataStore.sessionId = message.data.sessionId
			restart_client()
		"validSession":
			DataStore.player_name = message.user.name
			$LobbyMenu/OnBoardingMenu/PanelContainer/MarginContainer/VBoxContainer/PlayerNameLineEdit.text = message.user.name


func _on_player_name_changed(player_name):
	var message = {
		"event": "rename",
		"data": { "name": player_name },
	}
	DataStore.web_socket_client.send(message)

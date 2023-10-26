extends Node


func _ready():
	start_client()


func start_client():
	$WebSocketClient.connect_to_url(Config.SERVER_URL + "/ws?sessionId=" + DataStore.sessionId)


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
		"validSession":
			DataStore.player_name = message.user.name
			$LobbyMenu/OnBoardingMenu/PanelContainer/MarginContainer/VBoxContainer/PlayerNameLineEdit.text = message.user.name


func _on_player_name_changed(player_name):
	var message = {
		"event": "rename",
		"data": { "name": player_name },
	}
	$WebSocketClient.send(message)

extends Control


@export var player_scene: PackedScene

@onready
var player_list_container = $VBoxContainer/PlayerListContainer/MarginContainer/VBoxContainer/ScrollContainer/VBoxContainer
var timer = Timer.new()


signal back_button_pressed()


func _ready():
	DataStore.web_socket_client.message_received.connect(_on_web_socket_client_message_received)


func _on_web_socket_client_message_received(message):
	if typeof(message) != TYPE_DICTIONARY:
		return
	match message.event:
		"leaveRoom":
			fetch_room_status()
		"getRoomStatus":
			reset_room_status()
			var room = message.data.room
			var host_user = room.users[room.hostId]
			room.users.erase(host_user.id)
			var player_node = player_scene.instantiate()
			player_node.from_dict(host_user)
			player_list_container.add_child(player_node)
			for user in room.users.values():
				player_node = player_scene.instantiate()
				player_node.from_dict(user)
				player_list_container.add_child(player_node)


func reset_room_status():
	var children = player_list_container.get_children()
	for child in children:
		player_list_container.remove_child(child)


func fetch_room_status():
	if not visible:
		return
	DataStore.web_socket_client.send({
		"event": "getRoomStatus",
		"data": {
			"roomId": DataStore.room_id
		}
	})


func _on_visibility_changed():
	if not is_node_ready():
		return
	if visible:
		fetch_room_status()
		timer.timeout.connect(fetch_room_status)
		timer.wait_time = 5
		timer.one_shot = false
		add_child(timer)
		timer.start()
	if not visible:
		timer.stop()
		remove_child(timer)
		timer.timeout.disconnect(fetch_room_status)
		reset_room_status()


func _on_back_button_pressed():
	DataStore.web_socket_client.send({
		"event": "leaveRoom",
		"data": {
			"roomId": DataStore.room_id
		}
	})
	back_button_pressed.emit()

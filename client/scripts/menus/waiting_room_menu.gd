extends Control


@export var player_scene: PackedScene

@onready
var player_list_container = $VBoxContainer/PlayerListContainer/MarginContainer/VBoxContainer/ScrollContainer/VBoxContainer
@onready
var start_button = $VBoxContainer/StartButton


signal back_button_pressed()


func _ready():
	DataStore.web_socket_client.message_received.connect(_on_web_socket_client_message_received)
	start_button.visible = false
	start_button.disabled = true


func _on_web_socket_client_message_received(message):
	if typeof(message) != TYPE_DICTIONARY:
		return
	match message.event:
		"joinRoom":
			await get_tree().create_timer(0.5).timeout
			fetch_room_status()
		"leaveRoom":
			await get_tree().create_timer(0.5).timeout
			fetch_room_status()
		"getRoomStatus":
			reset_room_status()
			var room = message.data.room
			var host_user = room.users[room.hostId]
			var current_user = message.user
			if host_user.id == current_user.id:
				start_button.visible = true
				start_button.disabled = false
			else:
				start_button.visible = false
				start_button.disabled = true
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
	if not visible:
		reset_room_status()
		start_button.visible = false
		start_button.disabled = true


func _on_back_button_pressed():
	DataStore.web_socket_client.send({
		"event": "leaveRoom",
		"data": {
			"roomId": DataStore.room_id
		}
	})
	back_button_pressed.emit()


func _on_start_button_pressed():
	start_button.disabled = true
	DataStore.web_socket_client.send({
		"event": "startGame",
		"data": {
			"roomId": DataStore.room_id
		}
	})

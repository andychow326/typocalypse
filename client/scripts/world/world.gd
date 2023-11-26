extends Node3D


@export var player_scene: PackedScene

var player_positions = [
	Vector3(-1.5, 0, 16),
	Vector3(1.5, 0, 16),
	Vector3(-3, 0, 14),
	Vector3(3, 0, 14),
]


func _ready():
	DataStore.web_socket_client.message_received.connect(_on_web_socket_client_message_received)


func _on_web_socket_client_message_received(message):
	if typeof(message) != TYPE_DICTIONARY:
		return
	match message.event:
		"getRoomStatus":
			reset_player_container()
			var position_index = 0
			for user in message.data.room.users.values():
				var player_node = player_scene.instantiate()
				player_node.position = player_positions[position_index]
				player_node.look_at(Vector3(-10, 0, 0))
				player_node.from_dict(user)
				$PlayerContainer.add_child(player_node)
				position_index += 1


func reset_player_container():
	var children = $PlayerContainer.get_children()
	for child in children:
		child.queue_free()
		$PlayerContainer.remove_child(child)


func fetch_room_status():
	if not visible:
		return
	DataStore.web_socket_client.send({
		"event": "getRoomStatus",
		"data": {
			"roomId": DataStore.room_id
		}
	})

extends Node3D


@export var player_scene: PackedScene

var player_positions = [
	Vector3(-1.5, 0, 16),
	Vector3(1.5, 0, 16),
	Vector3(-3, 0, 14),
	Vector3(3, 0, 14),
]


func _ready():
	$RoundStartLabel.visible = false
	$RemainingTimeLabel.visible = false
	DataStore.web_socket_client.message_received.connect(_on_web_socket_client_message_received)


func _process(_delta):
	$RemainingTimeLabel.text = "%.1f" % $RemainingTimeTimer.time_left
	if not int($RoundStartTimer.time_left) == 0:
		$RoundStartLabel.text = "%.f" % $RoundStartTimer.time_left


func _on_web_socket_client_message_received(message):
	if typeof(message) != TYPE_DICTIONARY:
		return
	match message.event:
		"getRoomStatus":
			if not visible:
				return
			reset_player_container()
			var position_index = 0
			$RoundStartTimer.wait_time = message.data.room.roundWaitDurationSeconds + 0.5
			$RemainingTimeTimer.wait_time = message.data.room.roundDurationSeconds
			for user in message.data.room.users.values():
				var player_node = player_scene.instantiate()
				player_node.position = player_positions[position_index]
				player_node.from_dict(user)
				$PlayerContainer.add_child(player_node)
				position_index += 1
			$RoundStartLabel.text = "READY"
			await get_tree().create_timer(1).timeout
			$RoundStartTimer.start()


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


func _on_visibility_changed():
	if visible:
		$RoundStartLabel.visible = true
		$RemainingTimeLabel.visible = false
	if not visible:
		$RoundStartTimer.stop()
		$RemainingTimeTimer.stop()


func _on_round_start_timer_timeout():
	$RoundStartLabel.visible = false
	$RemainingTimeLabel.visible = true
	$RemainingTimeTimer.start()

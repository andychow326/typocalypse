extends PanelContainer


@export var room_id: String
@export var capacity: int
@export var player_counts: int


func from_dict(dict: Dictionary):
	room_id = dict.id
	capacity = 4
	player_counts = dict.users.keys().size()

	$MarginContainer/HBoxContainer/RoomIDLabel.text += room_id
	$MarginContainer/HBoxContainer/HBoxContainer/RoomCapacityLabel.text = str(player_counts) + "/" + str(capacity)


func _on_join_room_button_pressed():
	DataStore.web_socket_client.send({
		"event": "joinRoom",
		"data": {
			"roomId": room_id,
		}
	})
	

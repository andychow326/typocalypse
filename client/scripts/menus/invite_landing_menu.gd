extends Control

signal back_button_pressed
signal player_name_changed

var _room_id: String


func set_info(room_id: String):
	_room_id = room_id
	$VBoxContainer/PanelContainer/MarginContainer/VBoxContainer/RoomIdDisplay.text = (
		"ROOM %s" % [room_id]
	)


func join_room():
	(
		DataStore
		. web_socket_client
		. send(
			{
				"event": "joinRoom",
				"data":
				{
					"name": DataStore.player_name,
					"roomId": _room_id,
				}
			}
		)
	)


func _on_quick_play_button_pressed():
	join_room()


func _on_player_name_line_edit_text_changed(new_text):
	player_name_changed.emit(new_text)


func _on_back_button_pressed():
	back_button_pressed.emit()

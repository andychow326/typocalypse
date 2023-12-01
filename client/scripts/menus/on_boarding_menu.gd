extends Control


signal quick_play_button_pressed()
signal create_room_button_pressed()
signal join_room_button_pressed()


func _on_quick_play_button_pressed():
	quick_play_button_pressed.emit()


func _on_create_room_button_pressed():
	create_room_button_pressed.emit()


func _on_join_room_button_pressed():
	join_room_button_pressed.emit()


func _on_player_name_line_edit_text_changed(new_text):
	DataStore.player_name = new_text

extends PanelContainer

signal play_again_button_pressed
signal back_to_menu_button_pressed

var detail_item_scene = preload("res://scenes/modal/game_over_modal_detail_item.tscn")


func add_detail_item(key: String, value: String):
	var node = detail_item_scene.instantiate()
	node.key = key
	node.value = value
	$MarginContainer/VBoxContainer/DetailContainer.add_child(node)


func _on_play_again_button_pressed():
	play_again_button_pressed.emit()


func _on_back_to_menu_button_pressed():
	back_to_menu_button_pressed.emit()

extends Control


enum STATE {
	ON_BOARDING,
	ROOM_LIST,
	WAITING_ROOM,
}

var state := STATE.ON_BOARDING


func _on_on_boarding_menu_quick_play_button_pressed():
	pass # TODO: quick play logic


func _on_on_boarding_menu_create_room_button_pressed():
	state = STATE.WAITING_ROOM


func _on_on_boarding_menu_join_room_button_pressed():
	state = STATE.ROOM_LIST


func _on_room_list_menu_back_button_pressed():
	state = STATE.ON_BOARDING


func _process(_delta):
	match state:
		STATE.ON_BOARDING:
			$OnBoardingMenu.visible = true
			$RoomListMenu.visible = false
			$WaitingRoomMenu.visible = false
		STATE.ROOM_LIST:
			$OnBoardingMenu.visible = false
			$RoomListMenu.visible = true
			$WaitingRoomMenu.visible = false
		STATE.WAITING_ROOM:
			$OnBoardingMenu.visible = false
			$RoomListMenu.visible = false
			$WaitingRoomMenu.visible = true

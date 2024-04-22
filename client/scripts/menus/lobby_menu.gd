extends Control

signal invite_button_pressed

enum STATE {
	ON_BOARDING,
	ROOM_LIST,
	WAITING_ROOM,
	INVITE_LANDING,
}

var state := STATE.ON_BOARDING


func _ready():
	DataStore.web_socket_client.message_received.connect(_on_web_socket_client_message_received)
	if OS.has_feature("web"):
		var room_id = (
			JavaScriptBridge
			. eval(
				'''
				const params = new URL(document.location).searchParams;
				const roomId = params.get("room") ?? "";
				roomId;
				'''
			)
		)
		if room_id != "":
			$InviteLandingMenu.set_info(room_id)
			state = STATE.INVITE_LANDING


func _on_web_socket_client_message_received(message):
	if typeof(message) != TYPE_DICTIONARY:
		return
	match message.event:
		"createRoom":
			DataStore.room_id = message.data.roomId
			state = STATE.WAITING_ROOM
		"joinRoom":
			DataStore.room_id = message.data.roomId
			state = STATE.WAITING_ROOM
		"startGame":
			state = STATE.ON_BOARDING


func quick_play():
	(
		DataStore
		. web_socket_client
		. send(
			{
				"event": "quickPlay",
				"data":
				{
					"name": DataStore.player_name,
				}
			}
		)
	)


func _on_on_boarding_menu_quick_play_button_pressed():
	quick_play()


func _on_on_boarding_menu_create_room_button_pressed():
	(
		DataStore
		. web_socket_client
		. send(
			{
				"event": "createRoom",
				"data":
				{
					"name": DataStore.player_name,
				}
			}
		)
	)


func _on_on_boarding_menu_join_room_button_pressed():
	state = STATE.ROOM_LIST


func _on_room_list_menu_back_button_pressed():
	state = STATE.ON_BOARDING


func _on_waiting_room_menu_back_button_pressed():
	state = STATE.ON_BOARDING


func _on_invite_landing_menu_back_button_pressed():
	state = STATE.ON_BOARDING


func _on_waiting_room_menu_invite_button_pressed():
	invite_button_pressed.emit()


func _process(_delta):
	match state:
		STATE.ON_BOARDING:
			$OnBoardingMenu.visible = true
			$RoomListMenu.visible = false
			$WaitingRoomMenu.visible = false
			$InviteLandingMenu.visible = false
		STATE.ROOM_LIST:
			$OnBoardingMenu.visible = false
			$RoomListMenu.visible = true
			$WaitingRoomMenu.visible = false
			$InviteLandingMenu.visible = false
		STATE.WAITING_ROOM:
			$OnBoardingMenu.visible = false
			$RoomListMenu.visible = false
			$WaitingRoomMenu.visible = true
			$InviteLandingMenu.visible = false
		STATE.INVITE_LANDING:
			$OnBoardingMenu.visible = false
			$RoomListMenu.visible = false
			$WaitingRoomMenu.visible = false
			$InviteLandingMenu.visible = true


func _on_player_name_changed(name):
	DataStore.player_name = name
	$OnBoardingMenu.set_info(name)

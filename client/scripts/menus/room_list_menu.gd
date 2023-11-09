extends Control


@export var room_list_item_scene: PackedScene

@onready
var waiting_room_list_container = $VBoxContainer/RoomListContainer/MarginContainer/VBoxContainer/ScrollContainer/VBoxContainer
var timer = Timer.new()


signal back_button_pressed()


func _ready():
	DataStore.web_socket_client.message_received.connect(_on_web_socket_client_message_received)


func _on_web_socket_client_message_received(message):
	if typeof(message) != TYPE_DICTIONARY:
		return
	match message.event:
		"getWaitingRooms":
			clear_waiting_rooms()
			for room in message.data.rooms:
				var room_node = room_list_item_scene.instantiate()
				room_node.from_dict(room)
				waiting_room_list_container.add_child(room_node)


func clear_waiting_rooms():
	var children = waiting_room_list_container.get_children()
	for child in children:
		waiting_room_list_container.remove_child(child)


func fetch_waiting_rooms():
	if not visible:
		return
	DataStore.web_socket_client.send({"event": "getWaitingRooms"})


func _on_visibility_changed():
	if not is_node_ready():
		return
	if visible:
		fetch_waiting_rooms()
		timer.timeout.connect(fetch_waiting_rooms)
		timer.wait_time = 5
		timer.one_shot = false
		add_child(timer)
		timer.start()
	if not visible:
		timer.stop()
		remove_child(timer)
		timer.timeout.disconnect(fetch_waiting_rooms)
		clear_waiting_rooms()


func _on_back_button_pressed():
	back_button_pressed.emit()

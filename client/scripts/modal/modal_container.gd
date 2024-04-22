extends Control

signal play_again
signal back_to_menu

var modal_scene = preload("res://scenes/modal/modal.tscn")
var invite_modal_scene = preload("res://scenes/modal/invite_modal.tscn")
var game_over_scene = preload("res://scenes/modal/game_over_modal.tscn")
var modals: Array[Dictionary]


func _ready():
	DataStore.web_socket_client.message_received.connect(_on_web_socket_client_message_received)


func _on_web_socket_client_message_received(message):
	if typeof(message) != TYPE_DICTIONARY:
		return
	match message.event:
		"waitingClientGameWorldReady":
			var nodes = get_modal_nodes("waitingClientGameWorldReadyModal")

			var node
			if len(nodes) > 0:
				node = nodes[0]
			else:
				node = modal_scene.instantiate()
			node.title = "Synchronizing..."
			node.content = "Waiting for all clients to be ready:\n"
			for user in message.data.ready:
				node.content += "[center][color=green]%s[/color][/center]\n" % [user.name]
			for user in message.data.notReady:
				node.content += "[center][color=red]%s[/color][/center]\n" % [user.name]

			if len(nodes) == 0:
				add_modal("waitingClientGameWorldReadyModal", node)
		"startRound":
			remove_modal("waitingClientGameWorldReadyModal")
		"gameOver":
			var node = game_over_scene.instantiate()
			node.add_detail_item("Room ID", message.data.roomId)
			node.add_detail_item("Round", str(message.data.round))
			var time = message.data.elapsedTime / 1000
			var minutes = str(int(time / 60))
			minutes = minutes if len(minutes) == 2 else "0%s" % [minutes]
			var seconds = str(int(fmod(time, 60)))
			seconds = seconds if len(seconds) == 2 else "0%s" % [seconds]
			node.add_detail_item("Survived Time", "%s:%s" % [minutes, seconds])
			node.add_detail_item("Kills", str(message.data.kills[DataStore.player_id]))
			node.play_again_button_pressed.connect(_on_play_again_button_pressed)
			node.back_to_menu_button_pressed.connect(_on_back_to_menu_button_pressed)
			add_modal("gameOverModal", node)


func _on_play_again_button_pressed():
	remove_modal("gameOverModal")
	play_again.emit()


func _on_back_to_menu_button_pressed():
	remove_modal("gameOverModal")
	back_to_menu.emit()


func _on_invite_button_pressed():
	var node = invite_modal_scene.instantiate()
	node.room_id = DataStore.room_id
	node.close_button_pressed.connect(func(): remove_modal("inviteModal"))
	add_modal("inviteModal", node)


func get_modal_nodes(type: String):
	var target_modals = modals.filter(func(modal): return modal.type == type)
	return target_modals.map(func(modal): return modal.node)


func add_modal(type: String, node: Node):
	modals.append({"type": type, "node": node})
	add_child(node)


func remove_modal(type: String):
	var target_modals = modals.filter(func(modal): return modal.type == type)
	for modal in target_modals:
		var node = modal.node
		node.queue_free()
		remove_child(node)
	modals = modals.filter(func(modal): return modal.type != type)


func _process(_delta):
	if len(modals) > 0:
		set_anchors_preset(Control.PRESET_FULL_RECT)
	else:
		set_anchors_preset(Control.PRESET_CENTER)

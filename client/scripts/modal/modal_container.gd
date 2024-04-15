extends Control

var modal_scene = preload("res://scenes/modal/modal.tscn")
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


func _process(_delta):
	if len(modals) > 0:
		set_anchors_preset(Control.PRESET_FULL_RECT)
	else:
		set_anchors_preset(Control.PRESET_CENTER)

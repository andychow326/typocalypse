extends Control

var error_dialog_scene = preload("res://scenes/error/error_dialog.tscn")
var errors: Array[Dictionary]


func _ready():
	DataStore.web_socket_client.message_received.connect(_on_web_socket_client_message_received)


func _on_error_dialog_timeout():
	var delete_node = $MarginContainer/VBoxContainer.get_children()[0]
	delete_node.queue_free()
	$MarginContainer/VBoxContainer.remove_child(delete_node)


func _on_web_socket_client_message_received(message):
	if typeof(message) != TYPE_DICTIONARY:
		return
	match message.event:
		"error":
			var node = error_dialog_scene.instantiate()
			node.content = message.reason
			$MarginContainer/VBoxContainer.add_child(node)
			get_tree().create_timer(5).timeout.connect(_on_error_dialog_timeout)

extends CharacterBody3D


@export var player_id: String
@export var player_name: String


signal player_inputted_key(player_id, key)


func from_dict(dict: Dictionary):
	player_id = dict.id
	player_name = dict.name


func _ready():
	look_at(Vector3(0, 0, 0))
	if DataStore.player_id == player_id:
		$Head/Camera3D.current = true


func _input(event):
	if not get_parent().visible or not event is InputEventKey or not event.is_pressed():
		return

	if (event.keycode >= 65 and event.keycode <= 90) or event.keycode == 32:
		var key_label
		if event.keycode == KEY_SPACE:
			key_label = " "
		else:
			key_label = OS.get_keycode_string(event.keycode).to_lower()
		DataStore.web_socket_client.send({
			"event": "input",
			"data": {
				"key": key_label
			}
		})
		player_inputted_key.emit(player_id, key_label)

extends CharacterBody3D


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

extends PanelContainer

signal close_button_pressed

@export var room_id: String


func _ready():
	if OS.has_feature("web"):
		var invite_url = (
			JavaScriptBridge
			. eval(
				(
					'''
					const base_url = new URL(document.location).origin;
					const url = new URL(base_url);
					url.searchParams.set("room", %s);
					url.href;
					'''
					% [room_id]
				)
			)
		)
		$MarginContainer/VBoxContainer/HBoxContainer/InviteURLTextEdit.text = invite_url
	else:
		$MarginContainer/VBoxContainer/HBoxContainer/InviteURLTextEdit.text = room_id


func _on_copy_button_pressed():
	var copy_text = $MarginContainer/VBoxContainer/HBoxContainer/InviteURLTextEdit.text
	DisplayServer.clipboard_set(copy_text)
	$MarginContainer/VBoxContainer/HBoxContainer/CopyButton.text = "COPIED"
	await get_tree().create_timer(3).timeout
	$MarginContainer/VBoxContainer/HBoxContainer/CopyButton.text = "COPY"


func _on_close_button_pressed():
	close_button_pressed.emit()
